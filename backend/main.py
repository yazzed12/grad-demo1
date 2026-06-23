from fastapi import FastAPI, Depends, HTTPException, Request, Response, status, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel, Field
import json
import time
from datetime import date, datetime, timedelta
from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, Text, func
import logging
from jose import JWTError, jwt
from passlib.context import CryptContext
from typing import List, Optional

import sys
import os
from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from ai_service import generate_clinical_report, humanize_report as humanize_report_ai

# Ensure the backend directory is in the python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import models
import ai_prompt
import pending_store
import email_service
import hashlib
from database import engine, get_db, Base, SessionLocal

def get_clinic_email(username: str, role: str) -> str:
    clean = "".join(c for c in username.replace(" ", "_") if c.isalnum() or c == "_").lower()
    if not clean:
        clean = "user"
    return f"{clean}@{role.lower()}.com"


# ── Initialization ───────────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)
app = FastAPI(title="Smart Dental Clinic Enterprise API")

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Middleware & CORS ────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000", # Common alternative
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Security Configuration ──────────────────────────────────────────────────
SECRET_KEY = "enterprise_secret_key_change_in_production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# ── Rate Limiting State ──────────────────────────────────────────────────────
user_request_counts = {} # {ip: [timestamps]}

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host
    now = time.time()
    
    if client_ip not in user_request_counts:
        user_request_counts[client_ip] = []
    
    # Keep only last 1 second of requests
    user_request_counts[client_ip] = [t for t in user_request_counts[client_ip] if now - t < 1]
    
    if len(user_request_counts[client_ip]) >= 100: # 100 req/sec limit for production-grade dashboard
        return Response(content="Rate limit exceeded", status_code=429)
    
    user_request_counts[client_ip].append(now)
    return await call_next(request)

# ── Pydantic Models ─────────────────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str

class UserProfile(BaseModel):
    id: int
    username: str
    role: str
    full_name: Optional[str]
    email: Optional[str]
    phone: Optional[str] = None
    specialization: Optional[str] = None

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    specialization: Optional[str] = None
    password: Optional[str] = None

class ClinicSettingsBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    working_hours: Optional[str] = None
    appointment_duration: int = 30
    services: Optional[str] = None
    notification_settings: Optional[str] = None

class ClinicSettingsResponse(ClinicSettingsBase):
    id: int


class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    email: str
    role: str # doctor or receptionist
    phone: Optional[str] = None
    specialization: Optional[str] = None
    personal_email: Optional[str] = None


class UserStaffUpdate(BaseModel):
    full_name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    specialization: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[int] = None
    password: Optional[str] = None
    personal_email: Optional[str] = None


class PatientCreate(BaseModel):
    name: str
    age: Optional[int] = None
    phone: Optional[str] = None
    gender: Optional[str] = "Unknown"
    status: Optional[str] = "Active"
    condition: Optional[str] = "Routine Checkup"
    last_visit: Optional[str] = None
    blood_type: Optional[str] = "Unknown"

class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    status: Optional[str] = None
    condition: Optional[str] = None
    blood_type: Optional[str] = None

class AppointmentCreate(BaseModel):
    patient_id: int
    date: str
    time: str
    type: Optional[str] = "Normal"
    condition: Optional[str] = "Routine Checkup"

class AppointmentConditionCreate(BaseModel):
    name: str

class AppointmentConditionResponse(BaseModel):
    id: int
    name: str
    created_by: Optional[int] = None
    is_active: int
    created_at: datetime

    class Config:
        orm_mode = True

class ConsultationPayload(BaseModel):
    toothData: dict
    version: int

class ToothUpdatePayload(BaseModel):
    updates: dict
    version: int

class ChatMessage(BaseModel):
    role: str
    text: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

# New AI Models
class InsightStats(BaseModel):
    patients: int
    today_appointments: int
    completed: int
    pending: int

class InsightResponse(BaseModel):
    summary: str
    stats: InsightStats
    recommendations: List[str]

class DiagnosisRequest(BaseModel):
    symptoms: str
    history: str
    tooth_data: dict

class DiagnosisResponse(BaseModel):
    diagnosis: str
    conditions: List[str]
    treatment_plan: List[str]

class NotificationResponse(BaseModel):
    id: int
    title: str
    body: str
    type: str
    read: bool
    created_at: str

class SymptomCreate(BaseModel):
    name: str

class SymptomResponse(BaseModel):
    id: int
    name: str
    created_by: Optional[int]
    is_active: int
    created_at: datetime

# ── Helper Functions ────────────────────────────────────────────────────────
def log_event(db: Session, message: str, doctor_id=None, patient_id=None, before=None, after=None):
    try:
        new_log = models.Log(
            message=message,
            doctor_id=doctor_id,
            patient_id=patient_id,
            before_state=json.dumps(before) if before else None,
            after_state=json.dumps(after) if after else None
        )
        db.add(new_log)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to log event: {e}")

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if pending_store.is_token_blacklisted(token):
        raise credentials_exception
        
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user


# ── Background Tasks ────────────────────────────────────────────────────────
def generate_clinical_report_task(patient_id: int):
    """Simulates background clinical report generation and AI auditing."""
    logger.info(f"[TASK] Starting report generation for patient {patient_id}")
    time.sleep(2) # Simulate heavy processing
    logger.info(f"[TASK] Report finalized and stored for patient {patient_id}")

def send_appointment_reminder_task(appointment_id: int):
    """Simulates sending a reminder via email/SMS."""
    logger.info(f"[TASK] Sending automated reminder for appointment {appointment_id}")
    time.sleep(1) # Simulate network call
    logger.info(f"[TASK] Reminder sent successfully for appointment {appointment_id}")

def require_role(role: str):
    def role_checker(user: models.User = Depends(get_current_user)):
        if user.role != role and user.role != 'admin':
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_checker

def require_staff_role():
    def role_checker(user: models.User = Depends(get_current_user)):
        if user.role not in ['doctor', 'receptionist', 'admin']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_checker

def bootstrap_default_users():
    """
    Ensure demo users exist for local/dev login flows.
    This runs only when the users table is empty.
    """
    db = SessionLocal()
    try:
        if db.query(models.User).count() > 0:
            return

        demo_users = [
            models.User(
                username="doctor1",
                hashed_password=pwd_context.hash("password123"),
                full_name="DR Yehia El-ameir",
                email="doctor1@doctor.com",
                role="doctor"
            ),
            models.User(
                username="admin",
                hashed_password=pwd_context.hash("password123"),
                full_name="Clinic Admin",
                email="admin@admin.com",
                role="admin"
            ),
            models.User(
                username="receptionist1",
                hashed_password=pwd_context.hash("password123"),
                full_name="Front Desk",
                email="receptionist1@receptionist.com",
                role="receptionist"
            ),
        ]
        db.add_all(demo_users)
        db.commit()

        # Seed default mappings
        pending_store.save_email_mapping("doctor1@doctor.com", "doctor1@clinic.com")
        pending_store.save_email_mapping("admin@admin.com", "admin@clinic.com")
        pending_store.save_email_mapping("receptionist1@receptionist.com", "receptionist1@clinic.com")

        # Add initial notifications
        if db.query(models.Notification).count() == 0:
            initial_notifications = [
                models.Notification(title="System Ready", body="Backend-driven clinical system is now active.", type="success"),
                models.Notification(title="Daily Schedule", body="Your appointments for today have been synced.", type="info"),
                models.Notification(title="AI Module", body="Practice insights and clinical diagnosis engine online.", type="info"),
            ]
            db.add_all(initial_notifications)
            db.commit()
            
        # Seed default clinic settings
        if db.query(models.ClinicSettings).count() == 0:
            default_settings = models.ClinicSettings(
                name="Smart Dental Clinic",
                email="info@smartclinic.com",
                phone="+1 555-9000",
                address="1200 Health Blvd, Suite 400, New York, NY 10001",
                working_hours="09:00 - 17:00",
                appointment_duration=30,
                services='["Consultation", "Cleaning", "Root Canal", "Extraction"]',
                notification_settings='{"appointmentReminders": true, "criticalAlerts": true, "emailReports": false}'
            )
            db.add(default_settings)
            db.commit()

        logger.info("Bootstrapped default demo users and settings.")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to bootstrap default users: {e}")
    finally:
        db.close()

def migrate_existing_users_to_clinic_emails(db: Session):
    """
    Ensures all existing users in the main DB have their email set to their auto-generated clinic email.
    Saves their old email as their personal email in the mapping table.
    """
    try:
        users = db.query(models.User).all()
        for u in users:
            role = u.role or "doctor"
            clinic_email = get_clinic_email(u.username, role)
            
            # Check if there is an existing mapping
            personal_email = pending_store.get_personal_email_by_clinic_email(clinic_email)
            if not personal_email:
                old_email = u.email
                if old_email and "@" in old_email:
                    personal_email = old_email
                else:
                    personal_email = f"{u.username.replace(' ', '_').lower()}@personal.com"
                
                # Save mapping
                pending_store.save_email_mapping(clinic_email, personal_email)
            
            # Update user email in DB to the clinic email
            if u.email != clinic_email:
                u.email = clinic_email
                logger.info(f"Migrated user '{u.username}' email to clinic email '{clinic_email}'")
        
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to migrate existing users to clinic emails: {e}")

@app.on_event("startup")
def startup_bootstrap():
    bootstrap_default_users()
    db = SessionLocal()
    try:
        migrate_existing_users_to_clinic_emails(db)
        pending_store.cleanup_expired_records()
    finally:
        db.close()


# ── Authentication Endpoints ─────────────────────────────────────────────────
def send_verification_email(personal_email: str, clinic_email: str, code: str):
    pending_store.log_email_sent(personal_email)
    email_service.send_verification_email(personal_email, code)

class VerifyPayload(BaseModel):
    code: str
    personal_email: Optional[str] = None
    username: Optional[str] = None

@app.post("/api/auth/login", response_model=Token)
async def login(request: Request, db: Session = Depends(get_db)):
    content_type = request.headers.get("content-type", "")
    email_val = None
    password_val = None
    
    if "application/json" in content_type:
        try:
            body = await request.json()
            email_val = body.get("email") or body.get("username")
            password_val = body.get("password")
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON payload")
    else:
        try:
            form_data = await request.form()
            email_val = form_data.get("username") or form_data.get("email")
            password_val = form_data.get("password")
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid form data")
            
    if not email_val or not password_val:
        raise HTTPException(status_code=400, detail="Invalid credentials")
        
    clinic_email = email_val.strip().lower()
    
    # Reject login if user tries Personal Email
    if "@" not in clinic_email or any(clinic_email.endswith(domain) for domain in ["@gmail.com", "@yahoo.com", "@outlook.com", "@hotmail.com"]):
        raise HTTPException(status_code=400, detail="Invalid credentials")
        
    user = db.query(models.User).filter(
        func.lower(models.User.email) == clinic_email
    ).first()
    
    if not user or not pwd_context.verify(password_val, user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    
    access_token = jwt.encode(
        {"sub": user.username, "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)},
        SECRET_KEY, algorithm=ALGORITHM
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/api/auth/register")
def register(payload: UserCreate, db: Session = Depends(get_db)):
    import re
    import secrets
    
    # 1. Role must be doctor or receptionist ONLY for standard registration
    role_clean = payload.role.strip().lower()
    if role_clean not in ["doctor", "receptionist"]:
        raise HTTPException(
            status_code=400,
            detail="Registration is only allowed for doctor or receptionist accounts."
        )
        
    # 2. Username Normalization and Regex Validation
    username_clean = payload.username.strip().lower()
    if not re.match(r"^[a-zA-Z0-9_]+$", username_clean):
        raise HTTPException(
            status_code=400,
            detail="Username must contain only letters, numbers, or underscores"
        )
        
    # 3. Password Validation
    if len(payload.password) < 8 or not any(c.isupper() for c in payload.password) or not any(c.isdigit() for c in payload.password):
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long and contain at least one uppercase letter and one number"
        )
        
    # 4. Personal Email Format Validation
    personal_email_clean = payload.personal_email.strip().lower() if payload.personal_email else None
    if not personal_email_clean:
        if payload.email and not any(payload.email.strip().lower().endswith(f"@{r}.com") for r in ["doctor", "receptionist", "admin"]):
            personal_email_clean = payload.email.strip().lower()
        else:
            personal_email_clean = f"{username_clean}@personal.com"
            
    if not re.match(r"[^@]+@[^@]+\.[^@]+", personal_email_clean):
        raise HTTPException(status_code=400, detail="Invalid email format")
            
    # 5. Clinic Email Generation
    clinic_email = get_clinic_email(username_clean, role_clean)
    
    # 6. Generic Response
    reply = {
        "status": "success",
        "message": "If an account exists, a code has been sent",
        "personal_email": personal_email_clean
    }

    # 7. Rate Limiting Check (3 emails / minute) - Check FIRST to prevent side-channel leaks
    if pending_store.get_email_sent_count_last_minute(personal_email_clean) >= 3:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please wait a minute before requesting another email."
        )

    # 8. Check if account already exists (either active in DB, personal email mapped, or pending registration)
    existing_user = db.query(models.User).filter(
        (func.lower(models.User.username) == username_clean) |
        (func.lower(models.User.email) == clinic_email)
    ).first()
    
    is_pending = pending_store.is_username_or_email_pending(username_clean, personal_email_clean)
    
    if existing_user or pending_store.is_personal_email_exists(personal_email_clean) or is_pending:
        return reply

    # 9. Generate secure 6-digit verification code
    verification_code = "".join(secrets.choice("0123456789") for _ in range(6))
    hashed_code = hashlib.sha256(verification_code.encode()).hexdigest()
    
    # Hash password securely
    hashed_pwd = pwd_context.hash(payload.password)
    
    # Save pending registration details
    pending_store.save_pending_registration(
        personal_email=personal_email_clean,
        username=username_clean,
        password=hashed_pwd,
        full_name=payload.full_name,
        role=role_clean,
        phone=payload.phone,
        specialization=payload.specialization,
        verification_code=hashed_code
    )
    
    # Send verification code
    send_verification_email(personal_email_clean, clinic_email, verification_code)
    
    return reply

@app.post("/api/auth/verify", response_model=Token)
def verify(payload: VerifyPayload, db: Session = Depends(get_db)):
    code = payload.code.strip()
    
    if payload.username:
        pending = pending_store.get_pending_registration_by_username(payload.username)
    elif payload.personal_email:
        pending = pending_store.get_pending_registration(payload.personal_email)
    else:
        raise HTTPException(status_code=400, detail="Must provide username or personal_email")
        
    if not pending:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")
        
    personal_email = pending.get("personal_email")
    
    # Check attempts count (Max 5)
    hashed_code = hashlib.sha256(code.encode()).hexdigest()
    if pending["verification_code"] != hashed_code:
        attempts = pending_store.increment_registration_attempts(personal_email)
        if attempts >= 5:
            pending_store.delete_pending_registration(personal_email)
            raise HTTPException(status_code=400, detail="Too many incorrect attempts. Signup restarted.")
        raise HTTPException(status_code=400, detail="Invalid verification code")
        
    # Check expiration
    if pending["expires_at"] < datetime.utcnow():
        pending_store.delete_pending_registration(personal_email)
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")
        
    # Generate clinic email
    clinic_email = get_clinic_email(pending["username"], pending["role"])
    
    # Double check username/email uniqueness in database
    existing_user = db.query(models.User).filter(
        (func.lower(models.User.username) == pending["username"]) |
        (func.lower(models.User.email) == clinic_email)
    ).first()
    
    if existing_user:
        pending_store.delete_pending_registration(personal_email)
        raise HTTPException(status_code=400, detail="Account already exists")
        
    # Create the user account
    new_user = models.User(
        username=pending["username"],
        hashed_password=pending["password"], # Already hashed
        full_name=pending["full_name"],
        email=clinic_email,
        role=pending["role"],
        phone=pending["phone"],
        specialization=pending["specialization"],
        is_active=1
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Save mapping permanently
    pending_store.save_email_mapping(clinic_email, personal_email)
    
    # Delete pending registration entry
    pending_store.delete_pending_registration(personal_email)
    
    # Generate access token
    access_token = jwt.encode(
        {"sub": new_user.username, "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)},
        SECRET_KEY, algorithm=ALGORITHM
    )
    return {"access_token": access_token, "token_type": "bearer"}



class ForgotPasswordPayload(BaseModel):
    clinic_email: str

class ResetPasswordPayload(BaseModel):
    token: str
    new_password: str
    clinic_email: Optional[str] = None

def send_reset_password_email(personal_email: str, clinic_email: str, token: str):
    pending_store.log_email_sent(personal_email)
    email_service.send_reset_email(personal_email, token)

@app.post("/api/auth/logout")
def logout(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        exp = payload.get("exp")
        if exp:
            expires_at = datetime.utcfromtimestamp(exp)
        else:
            expires_at = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        pending_store.blacklist_token(token, expires_at)
    except JWTError:
        pass
    return {"status": "success", "message": "Successfully logged out"}

@app.post("/api/auth/forgot-password")
def forgot_password(payload: ForgotPasswordPayload, db: Session = Depends(get_db)):
    clinic_email = payload.clinic_email.strip().lower()
    
    # ALWAYS return standard reply for privacy
    reply = {
        "status": "success",
        "message": "If an account exists, a code has been sent"
    }
    
    # Rate Limiting Check (3 emails / minute) on clinic email to prevent side-channel leaks
    if pending_store.get_email_sent_count_last_minute(clinic_email) >= 3:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please wait a minute before requesting another email."
        )
    pending_store.log_email_sent(clinic_email)
    
    # Case-insensitive lookup on clinic email
    user = db.query(models.User).filter(
        func.lower(models.User.email) == clinic_email
    ).first()
    
    if not user:
        return reply
        
    personal_email = pending_store.get_personal_email_by_clinic_email(user.email)
    if not personal_email:
        personal_email = f"{user.username.replace(' ', '_').lower()}@personal.com"
        pending_store.save_email_mapping(user.email, personal_email)
        
    # Rate Limiting Check (3 emails / minute) on personal email
    if pending_store.get_email_sent_count_last_minute(personal_email) >= 3:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please wait a minute before requesting another email."
        )

    import secrets
    # 6-digit reset code
    code = "".join(secrets.choice("0123456789") for _ in range(6))
    hashed_code = hashlib.sha256(code.encode()).hexdigest()
    
    # Invalidate old resets for this user first
    try:
        import sqlite3
        conn = sqlite3.connect(pending_store.DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM password_resets WHERE clinic_email = ?", (user.email.strip().lower(),))
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Failed to invalidate old reset tokens: {e}")

    pending_store.save_password_reset(user.email, personal_email, hashed_code)
    
    send_reset_password_email(personal_email, user.email, code)
    
    # Keep personal_email in response strictly for testing verification if needed
    reply["personal_email"] = personal_email
    return reply

@app.post("/api/auth/reset-password")
def reset_password(payload: ResetPasswordPayload, db: Session = Depends(get_db)):
    if len(payload.new_password) < 8 or not any(c.isupper() for c in payload.new_password) or not any(c.isdigit() for c in payload.new_password):
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long and contain at least one uppercase letter and one number"
        )
        
    hashed_token = hashlib.sha256(payload.token.strip().encode()).hexdigest()
        
    # Attempt Protection: Lookup reset request by token
    reset_record = None
    if payload.clinic_email:
        # Search resets to see if the clinic email has a reset request
        import sqlite3
        conn = sqlite3.connect(pending_store.DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT reset_token, personal_email, expires_at, attempts FROM password_resets WHERE clinic_email = ?", (payload.clinic_email.strip().lower(),))
        row = cursor.fetchone()
        conn.close()
        if row:
            reset_record = {
                "reset_token": row[0],
                "clinic_email": payload.clinic_email.strip().lower(),
                "personal_email": row[1],
                "expires_at": datetime.fromisoformat(row[2]) if isinstance(row[2], str) else row[2],
                "attempts": row[3]
            }
            
    if not reset_record:
        # Fallback to direct lookup by token (code) if no clinic_email was provided
        reset_record = pending_store.get_password_reset(hashed_token)
        
    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")
        
    # Check attempts count (Max 5)
    if reset_record.get("reset_token") != hashed_token:
        # Increment attempts
        attempts = pending_store.increment_reset_attempts(reset_record["reset_token"])
        if attempts >= 5:
            pending_store.delete_password_reset(reset_record["reset_token"])
            raise HTTPException(status_code=400, detail="Too many incorrect attempts. Password reset request expired.")
        raise HTTPException(status_code=400, detail="Invalid verification code")
        
    # Check expiry
    if reset_record["expires_at"] < datetime.utcnow():
        pending_store.delete_password_reset(reset_record["reset_token"])
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")
        
    user = db.query(models.User).filter(
        func.lower(models.User.email) == reset_record["clinic_email"]
    ).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
        
    user.hashed_password = pwd_context.hash(payload.new_password)
    db.commit()
    
    pending_store.delete_password_reset(reset_record["reset_token"])
    
    return {"status": "success", "message": "Password successfully updated"}



@app.get("/api/auth/me", response_model=UserProfile)
def get_me(user: models.User = Depends(get_current_user)):
    return { 
        "id": user.id, 
        "username": user.username, 
        "role": user.role, 
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "specialization": user.specialization
    }

# ── Dashboard & Stats ───────────────────────────────────────────────────────
@app.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    # Note: Dashboard is currently public for quick initial load, 
    # but in a real enterprise app, this should be protected.
    today_str = date.today().isoformat()
    total_patients = db.query(models.Patient).filter(models.Patient.status != "Archived").count()
    today_appointments = db.query(models.Appointment).filter(
        models.Appointment.date == today_str,
        models.Appointment.status != "Completed"
    ).count()
    active_records = db.query(models.Record).count()
    
    return {
        "totalPatients": total_patients,
        "todayAppointments": today_appointments,
        "activeRecords": active_records,
        "rating": 4.9
    }

@app.get("/api/dashboard")
def get_api_dashboard(db: Session = Depends(get_db)):
    return get_dashboard(db)

@app.get("/appointments/today")
def get_today_appointments(db: Session = Depends(get_db)):
    try:
        today_date = date.today()
        appointments = db.query(models.Appointment).options(
            joinedload(models.Appointment.patient)
        ).filter(
            models.Appointment.date == today_date
        ).order_by(models.Appointment.time.asc()).all()

        return [{
            "id": a.id,
            "patient_id": a.patient_id,
            "patient_name": a.patient.name if a.patient else "Unknown",
            "time": a.time,
            "type": a.type,
            "status": a.status
        } for a in appointments]
    except Exception as e:
        logger.error(f"Error fetching today's appointments: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch appointments")

@app.get("/logs")
def get_logs(db: Session = Depends(get_db)):
    logs = db.query(models.Log).order_by(models.Log.created_at.desc()).limit(10).all()
    return [{
        "id": l.id,
        "message": l.message,
        "created_at": l.created_at.isoformat() + "Z" if l.created_at else None
    } for l in logs]

# ── Notifications Endpoints ────────────────────────────────────────────────
@app.get("/api/notifications", response_model=List[NotificationResponse])
def get_notifications(db: Session = Depends(get_db)):
    # In production, filter by user: .filter(models.Notification.user_id == user.id)
    notifications = db.query(models.Notification).order_by(models.Notification.created_at.desc()).all()
    return [{
        "id": n.id,
        "title": n.title,
        "body": n.body,
        "type": n.type,
        "read": bool(n.read),
        "created_at": n.created_at.isoformat() + "Z" if n.created_at else None
    } for n in notifications]

@app.patch("/api/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, db: Session = Depends(get_db)):
    notification = db.query(models.Notification).filter(models.Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.read = 1
    db.commit()
    return {"status": "success"}

# ── Core Data Endpoints ───────────────────────────────────────────────────────
@app.get("/api/patients")
def get_patients(db: Session = Depends(get_db)):
    patients = db.query(models.Patient).filter(models.Patient.status != "Archived").all()
    return [{"id": p.id, "name": p.name, "age": p.age, "phone": p.phone, "gender": p.gender, "status": p.status, "condition": p.condition, "lastVisit": p.last_visit, "bloodType": p.blood_type} for p in patients]

@app.post("/api/patients")
def create_patient(payload: PatientCreate, db: Session = Depends(get_db), user: models.User = Depends(require_staff_role())):
    new_patient = models.Patient(**payload.dict())
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)
    return {"id": new_patient.id, "name": new_patient.name, "age": new_patient.age, "phone": new_patient.phone, "gender": new_patient.gender, "status": new_patient.status, "condition": new_patient.condition, "lastVisit": new_patient.last_visit, "bloodType": new_patient.blood_type}

@app.put("/api/patients/{patient_id}")
def update_patient(patient_id: int, payload: PatientUpdate, db: Session = Depends(get_db), user: models.User = Depends(require_staff_role())):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(patient, key, value)
        
    db.commit()
    db.refresh(patient)
    return {"status": "success", "patient": {"id": patient.id, "name": patient.name, "age": patient.age, "phone": patient.phone, "gender": patient.gender, "status": patient.status, "condition": patient.condition, "bloodType": patient.blood_type}}

@app.get("/api/patients/{patient_id}")
def get_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {
        "id": patient.id,
        "name": patient.name,
        "age": patient.age,
        "phone": patient.phone,
        "gender": patient.gender,
        "status": patient.status,
        "condition": patient.condition,
        "bloodType": patient.blood_type,
        "lastVisit": patient.last_visit
    }

@app.delete("/api/patients/{patient_id}")
def delete_patient(patient_id: int, db: Session = Depends(get_db), user: models.User = Depends(require_role('doctor'))):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    has_appointments = db.query(models.Appointment).filter(models.Appointment.patient_id == patient_id).first() is not None
    has_records = db.query(models.Record).filter(models.Record.patient_id == patient_id).first() is not None
    has_consultations = db.query(models.Consultation).filter(models.Consultation.patient_id == patient_id).first() is not None
    has_reports = db.query(models.ClinicalReport).filter(models.ClinicalReport.patient_id == patient_id).first() is not None
    
    if has_appointments or has_records or has_consultations or has_reports:
        # Soft delete / safely archive
        patient.status = "Archived"
        log_event(db, f"Patient {patient.name} archived safely due to existing clinical/appointment history.", doctor_id=user.id, patient_id=patient_id)
        db.commit()
        return {"status": "success", "action": "archived", "message": "Patient archived safely to preserve clinical history."}
    else:
        # Hard delete (safe because there is no clinical history or appointments)
        db.delete(patient)
        log_event(db, f"Patient {patient.name} deleted completely.", doctor_id=user.id)
        db.commit()
        return {"status": "success", "action": "deleted", "message": "Patient deleted successfully from system."}

@app.get("/api/appointments")
def get_appointments(db: Session = Depends(get_db)):
    appointments = db.query(models.Appointment).options(joinedload(models.Appointment.patient)).all()
    return [{
        "id": a.id,
        "patient_id": a.patient_id,
        "patient": a.patient.name if a.patient else "Unknown",
        "date": str(a.date),
        "time": a.time,
        "type": a.type,
        "status": a.status,
        "condition": a.condition if a.condition else "Routine Checkup"
    } for a in appointments]

@app.post("/api/appointments")
def create_appointment(payload: AppointmentCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), user: models.User = Depends(require_staff_role())):
    try:
        appt_date = date.fromisoformat(payload.date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, use YYYY-MM-DD")
    
    new_appt = models.Appointment(
        patient_id=payload.patient_id,
        date=appt_date,
        time=payload.time,
        type=payload.type,
        status="Pending",
        condition=payload.condition if payload.condition else "Routine Checkup"
    )
    db.add(new_appt)
    db.commit()
    db.refresh(new_appt)
    patient_name = db.query(models.Patient).filter(models.Patient.id == payload.patient_id).first().name
    
    # Trigger background reminder
    background_tasks.add_task(send_appointment_reminder_task, new_appt.id)
    
    return {
        "id": new_appt.id,
        "patient_id": new_appt.patient_id,
        "patient": patient_name,
        "date": str(new_appt.date),
        "time": new_appt.time,
        "type": new_appt.type,
        "status": new_appt.status,
        "condition": new_appt.condition
    }

@app.put("/api/appointments/{appointment_id}/status")
def update_appointment_status(appointment_id: int, status_update: dict, db: Session = Depends(get_db), user: models.User = Depends(require_staff_role())):
    appt = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    new_status = status_update.get("status")
    if new_status:
        old_status = appt.status
        appt.status = new_status
        
        # Notify Doctor if patient arrived
        if new_status.lower() == "arrived" and old_status.lower() != "arrived":
            patient_name = appt.patient.name if appt.patient else "A patient"
            notification = models.Notification(
                title="Patient Arrived",
                body=f"{patient_name} has arrived for their {appt.time} appointment.",
                type="success",
                read=0
            )
            db.add(notification)
            
        db.commit()
        db.refresh(appt)
    return {"status": "success", "new_status": appt.status}

@app.put("/api/appointments/{appointment_id}")
def update_appointment(appointment_id: int, payload: dict, db: Session = Depends(get_db), user: models.User = Depends(require_staff_role())):
    appt = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    if "date" in payload:
        try:
            appt.date = date.fromisoformat(payload["date"])
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")
    if "time" in payload:
        appt.time = payload["time"]
    if "type" in payload:
        appt.type = payload["type"]
    if "status" in payload:
        appt.status = payload["status"]
    if "notes" in payload:
        appt.notes = payload.get("notes", "")
    if "condition" in payload:
        appt.condition = payload["condition"]
    
    log_event(db, f"Appointment {appointment_id} updated by {user.username}", doctor_id=user.id, patient_id=appt.patient_id)
    db.commit()
    db.refresh(appt)
    
    patient = db.query(models.Patient).filter(models.Patient.id == appt.patient_id).first()
    return {
        "id": appt.id,
        "patient_id": appt.patient_id,
        "patient": patient.name if patient else "Unknown",
        "date": str(appt.date),
        "time": appt.time,
        "type": appt.type,
        "status": appt.status,
        "condition": appt.condition if appt.condition else "Routine Checkup",
        "notes": getattr(appt, 'notes', '')
    }

@app.delete("/api/appointments/{appointment_id}")
def delete_appointment(appointment_id: int, db: Session = Depends(get_db), user: models.User = Depends(require_staff_role())):
    appt = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    db.delete(appt)
    db.commit()
    return {"status": "success"}

@app.get("/api/appointment-conditions")
def get_appointment_conditions(db: Session = Depends(get_db)):
    conditions = db.query(models.AppointmentCondition).filter(models.AppointmentCondition.is_active == 1).all()
    return [{"id": c.id, "name": c.name} for c in conditions]

@app.post("/api/appointment-conditions")
def create_appointment_condition(payload: AppointmentConditionCreate, db: Session = Depends(get_db), user: models.User = Depends(require_staff_role())):
    normalized_name = payload.name.strip().title()
    if not normalized_name:
        raise HTTPException(status_code=400, detail="Condition name cannot be empty")
    
    existing = db.query(models.AppointmentCondition).filter(models.AppointmentCondition.name == normalized_name).first()
    if existing:
        return {"id": existing.id, "name": existing.name, "message": "Condition already exists"}
        
    new_cond = models.AppointmentCondition(
        name=normalized_name,
        created_by=user.id,
        is_active=1
    )
    db.add(new_cond)
    db.commit()
    db.refresh(new_cond)
    return {"id": new_cond.id, "name": new_cond.name}

@app.delete("/api/appointments/{appointment_id}")
def delete_appointment(appointment_id: int, db: Session = Depends(get_db), user: models.User = Depends(require_staff_role())):
    appt = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    db.delete(appt)
    db.commit()
    return {"status": "success"}

@app.get("/api/records")
def get_records(db: Session = Depends(get_db)):
    records = db.query(models.Record).options(joinedload(models.Record.patient)).all()
    return [{
        "id": r.id,
        "patient_id": r.patient_id,
        "patient": r.patient.name if r.patient else "Unknown",
        "tooth": r.tooth,
        "type": r.diagnosis,
        "date": "2026-05-10",
        "doctor": "Dr. API",
        "status": "Final",
        "size": "N/A"
    } for r in records]

@app.get("/api/doctors")
def get_doctors(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    doctors = db.query(models.User).filter(models.User.role == "doctor", models.User.is_active == 1).all()
    
    # Calculate patient counts from ClinicalReport records
    counts = db.query(
        models.ClinicalReport.doctor_id, 
        func.count(func.distinct(models.ClinicalReport.patient_id)).label('count')
    ).group_by(models.ClinicalReport.doctor_id).all()
    
    counts_map = {c.doctor_id: c.count for c in counts}
    
    return [{
        "id": d.id,
        "name": d.full_name or d.username,
        "username": d.username,
        "role": d.role,
        "email": d.email,
        "personal_email": pending_store.get_personal_email_by_clinic_email(d.email),
        "phone": d.phone,
        "specialization": d.specialization,
        "status": "online",
        "patients": counts_map.get(d.id, 0)
    } for d in doctors]

@app.get("/api/receptionists")
def get_receptionists(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    receptionists = db.query(models.User).filter(models.User.role == "receptionist", models.User.is_active == 1).all()
    return [{
        "id": r.id,
        "name": r.full_name or r.username,
        "username": r.username,
        "role": r.role,
        "email": r.email,
        "personal_email": pending_store.get_personal_email_by_clinic_email(r.email),
        "phone": r.phone,
        "status": "online"
    } for r in receptionists]

@app.post("/api/staff")
def create_staff(payload: UserCreate, db: Session = Depends(get_db), user: models.User = Depends(require_role('admin'))):
    role_clean = payload.role.strip().lower()
    if role_clean not in ["doctor", "receptionist", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be doctor, receptionist, or admin.")
    
    username_clean = payload.username.strip().lower()
    if payload.email and "@" in payload.email:
        email_cand = payload.email.strip().lower()
        if any(email_cand.endswith(f"@{r}.com") for r in ["doctor", "receptionist", "admin"]) or payload.personal_email:
            clinic_email = email_cand
        else:
            clinic_email = get_clinic_email(username_clean, role_clean)
    else:
        clinic_email = get_clinic_email(username_clean, role_clean)
    
    # Check if username OR clinic_email already exists in users DB
    existing = db.query(models.User).filter(
        (func.lower(models.User.username) == username_clean) | 
        (func.lower(models.User.email) == clinic_email)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or Clinic Email already exists")
        
    # Get personal email from payload
    personal_email_clean = payload.personal_email.strip().lower() if payload.personal_email else None
    if not personal_email_clean:
        if payload.email and not any(payload.email.strip().lower().endswith(f"@{r}.com") for r in ["doctor", "receptionist", "admin"]):
            personal_email_clean = payload.email.strip().lower()
        else:
            personal_email_clean = f"{username_clean}@personal.com"
            
    # Check if personal email is already mapped to another user
    if pending_store.is_personal_email_exists(personal_email_clean):
        raise HTTPException(status_code=400, detail="Personal email already exists")
        
    # Save mapping permanently
    pending_store.save_email_mapping(clinic_email, personal_email_clean)
    
    new_user = models.User(
        username=username_clean,
        hashed_password=pwd_context.hash(payload.password),
        full_name=payload.full_name,
        email=clinic_email,
        role=role_clean,
        phone=payload.phone,
        specialization=payload.specialization if role_clean == "doctor" else None,
        is_active=1
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"status": "success", "id": new_user.id}

@app.put("/api/staff/{user_id}")
def update_staff(user_id: int, payload: UserStaffUpdate, db: Session = Depends(get_db), user: models.User = Depends(require_role('admin'))):
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    new_username = payload.username.strip().lower() if payload.username is not None else target.username
    new_role = payload.role.strip().lower() if payload.role is not None else target.role
    
    # Process potential inputs
    email_payload = payload.email.strip().lower() if payload.email is not None else None
    personal_payload = payload.personal_email.strip().lower() if payload.personal_email is not None else None
    
    # Disambiguate if email_payload was passed as personal email (backward compatibility)
    if email_payload and not personal_payload:
        if not any(email_payload.endswith(f"@{r}.com") for r in ["doctor", "receptionist", "admin"]):
            personal_payload = email_payload
            email_payload = None

    # Determine the final clinic email
    if email_payload:
        new_clinic_email = email_payload
    elif payload.username is not None or payload.role is not None:
        new_clinic_email = get_clinic_email(new_username, new_role)
    else:
        new_clinic_email = target.email

    # Validate Username uniqueness
    if new_username != target.username:
        existing_user = db.query(models.User).filter(
            func.lower(models.User.username) == new_username,
            models.User.id != target.id
        ).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already exists")

    # Validate Clinic Email uniqueness
    if new_clinic_email.lower() != target.email.lower():
        existing_email = db.query(models.User).filter(
            func.lower(models.User.email) == new_clinic_email,
            models.User.id != target.id
        ).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="Clinic email already exists")

        # Migrate email mapping in pending_users.db if it exists
        existing_personal = pending_store.get_personal_email_by_clinic_email(target.email)
        if existing_personal:
            final_personal = personal_payload if personal_payload else existing_personal
            
            # Enforce uniqueness of personal email mapped to new clinic email
            import sqlite3
            conn = sqlite3.connect(pending_store.DB_PATH)
            cursor = conn.cursor()
            cursor.execute("SELECT clinic_email FROM email_mappings WHERE personal_email = ?", (final_personal,))
            row = cursor.fetchone()
            conn.close()
            if row and row[0].strip().lower() != target.email.strip().lower() and row[0].strip().lower() != new_clinic_email.lower():
                raise HTTPException(status_code=400, detail="Personal email already in use by another account")

            pending_store.save_email_mapping(new_clinic_email, final_personal)
            
            conn = sqlite3.connect(pending_store.DB_PATH)
            cursor = conn.cursor()
            cursor.execute("DELETE FROM email_mappings WHERE clinic_email = ?", (target.email.strip().lower(),))
            conn.commit()
            conn.close()
            
            personal_payload = None  # Handled

    # Save target username, role, clinic email
    target.username = new_username
    target.role = new_role
    target.email = new_clinic_email

    if payload.full_name is not None: target.full_name = payload.full_name
    if payload.phone is not None: target.phone = payload.phone
    if payload.is_active is not None: target.is_active = payload.is_active
    
    if payload.password is not None and payload.password.strip() != "":
        target.hashed_password = pwd_context.hash(payload.password)
    
    if payload.specialization is not None:
        target.specialization = payload.specialization if target.role == "doctor" else None
    if target.role != "doctor":
        target.specialization = None
        
    if personal_payload:
        # Enforce uniqueness of personal email
        import sqlite3
        conn = sqlite3.connect(pending_store.DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT clinic_email FROM email_mappings WHERE personal_email = ?", (personal_payload,))
        row = cursor.fetchone()
        conn.close()
        if row and row[0].strip().lower() != target.email.strip().lower():
            raise HTTPException(status_code=400, detail="Personal email already in use by another account")
        
        pending_store.save_email_mapping(target.email, personal_payload)
    
    db.commit()
    return {"status": "success"}


@app.delete("/api/staff/{user_id}")
def delete_staff(user_id: int, db: Session = Depends(get_db), user: models.User = Depends(require_role('admin'))):
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    target.is_active = 0
    db.commit()
    return {"status": "success"}

# ── Clinical Endpoints ──────────────────────────────────────────────────────
@app.get("/api/consultations/{patient_id}")
def get_consultation(patient_id: int, db: Session = Depends(get_db), user: models.User = Depends(require_role('doctor'))):
    consultation = db.query(models.Consultation).filter(models.Consultation.patient_id == patient_id).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    
    return {
        "patientId": consultation.patient_id,
        "toothData": json.loads(consultation.data),
        "version": consultation.version,
        "lastUpdated": consultation.last_updated.isoformat() + "Z" if consultation.last_updated else None
    }

@app.post("/api/consultations/{patient_id}")
def save_consultation(patient_id: int, payload: ConsultationPayload, background_tasks: BackgroundTasks, db: Session = Depends(get_db), user: models.User = Depends(require_role('doctor'))):
    try:
        consultation = db.query(models.Consultation).filter(models.Consultation.patient_id == patient_id).first()
        before_state = None
        
        if consultation:
            if consultation.version != payload.version:
                raise HTTPException(status_code=409, detail="Version conflict. Please refresh.")
            before_state = json.loads(consultation.data)
            consultation.data = json.dumps(payload.toothData)
            consultation.version += 1
        else:
            consultation = models.Consultation(
                patient_id=patient_id,
                data=json.dumps(payload.toothData),
                version=1
            )
            db.add(consultation)
        
        log_event(db, f"Consultation updated for patient {patient_id}", doctor_id=user.id, patient_id=patient_id, before=before_state, after=payload.toothData)
        db.commit()
        db.refresh(consultation)
        
        # Trigger background report generation
        background_tasks.add_task(generate_clinical_report_task, patient_id)
        
        return {"status": "success", "version": consultation.version}
    except HTTPException: raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving consultation: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/appointments/finish-by-patient/{patient_id}")
def finish_appointment_by_patient(patient_id: int, db: Session = Depends(get_db), user: models.User = Depends(require_role('doctor'))):
    # Find the current active appointment for this patient today
    today_str = date.today().isoformat()
    appt = db.query(models.Appointment).filter(
        models.Appointment.patient_id == patient_id,
        models.Appointment.date == today_str,
        models.Appointment.status != "Completed"
    ).first()
    
    if not appt:
        raise HTTPException(status_code=404, detail="No active appointment found for this patient today")
    
    appt.status = "Completed"
    log_event(db, f"Clinical session finished for patient {patient_id}", doctor_id=user.id, patient_id=patient_id)
    db.commit()
    return {"status": "success"}

@app.put("/appointments/{appointment_id}/finish")
def finish_appointment(appointment_id: int, db: Session = Depends(get_db), user: models.User = Depends(require_role('doctor'))):
    appt = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    appt.status = "Completed"
    log_event(db, f"Appointment finished by {user.username}", doctor_id=user.id, patient_id=appt.patient_id)
    db.commit()
    return {"status": "success"}

def generate_pdf_report_file(report: models.ClinicalReport, db: Session):
    """Generate a clean, beautiful medical-themed PDF clinical report."""
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        
        base_dir = os.path.dirname(os.path.abspath(__file__))
        reports_dir = os.path.join(base_dir, "static_reports")
        os.makedirs(reports_dir, exist_ok=True)
        
        pdf_filename = f"report_{report.id}_{int(time.time())}.pdf"
        pdf_filepath = os.path.join(reports_dir, pdf_filename)
        
        doc = SimpleDocTemplate(
            pdf_filepath,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )
        
        styles = getSampleStyleSheet()
        
        # Premium medical styles
        title_style = ParagraphStyle(
            'ClinicTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=20,
            textColor=colors.HexColor('#FFFFFF'),
            spaceAfter=4
        )
        
        subtitle_style = ParagraphStyle(
            'ClinicSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9.5,
            textColor=colors.HexColor('#E0F2FE'),
            spaceAfter=2,
            leading=13
        )
        
        h1_style = ParagraphStyle(
            'SectionHeader',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=13,
            textColor=colors.HexColor('#0f766e'), # Medical Dark Teal
            spaceBefore=12,
            spaceAfter=6
        )
        
        label_style = ParagraphStyle(
            'InfoLabel',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9,
            textColor=colors.HexColor('#475569')
        )
        
        val_style = ParagraphStyle(
            'InfoVal',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            textColor=colors.HexColor('#1E293B')
        )
        
        body_style = ParagraphStyle(
            'ReportBody',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9.5,
            textColor=colors.HexColor('#1E293B'),
            leading=14,
            spaceAfter=6
        )
        
        footer_style = ParagraphStyle(
            'FooterText',
            parent=styles['Normal'],
            fontName='Helvetica-Oblique',
            fontSize=8,
            textColor=colors.HexColor('#94A3B8'),
            alignment=1
        )

        # Fetch dynamic clinic settings from database if available
        clinic_settings = db.query(models.ClinicSettings).first()
        clinic_name = clinic_settings.name if (clinic_settings and clinic_settings.name) else "SMART DENTAL CLINIC"
        clinic_email = clinic_settings.email if (clinic_settings and clinic_settings.email) else "info@smartclinic.com"
        clinic_phone = clinic_settings.phone if (clinic_settings and clinic_settings.phone) else "+1 555-9000"
        clinic_address = clinic_settings.address if (clinic_settings and clinic_settings.address) else "1200 Health Blvd, NY"

        elements = []
        
        # 1. Header Banner
        header_data = [
            [
                Paragraph(clinic_name.upper(), title_style),
                Paragraph(f"<b>Email:</b> {clinic_email}<br/><b>Phone:</b> {clinic_phone}<br/><b>Address:</b> {clinic_address}", subtitle_style)
            ]
        ]
        header_table = Table(header_data, colWidths=[300, 240])
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#0f766e')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('PADDING', (0, 0), (-1, -1), 14),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 14))
        
        # Helper to append solid lines
        def add_separator():
            line_table = Table([[""]], colWidths=[540], rowHeights=[1])
            line_table.setStyle(TableStyle([
                ('LINEABOVE', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
                ('BOTTOMPADDING', (0,0), (-1,-1), 0),
                ('TOPPADDING', (0,0), (-1,-1), 0),
            ]))
            elements.append(line_table)
            elements.append(Spacer(1, 6))
            
        # 2. Document Info
        patient = report.patient
        doctor = report.doctor
        created_time = report.created_at.strftime("%Y-%m-%d %I:%M %p") if report.created_at else datetime.utcnow().strftime("%Y-%m-%d %I:%M %p")
        
        info_data = [
            [
                Paragraph("<b>Patient Name:</b>", label_style), Paragraph(patient.name if patient else "N/A", val_style),
                Paragraph("<b>Doctor Name:</b>", label_style), Paragraph(doctor.full_name if doctor else "N/A", val_style)
            ],
            [
                Paragraph("<b>Age / Gender:</b>", label_style), Paragraph(f"{patient.age if patient else 'N/A'}y / {patient.gender if patient else 'N/A'}", val_style),
                Paragraph("<b>Specialization:</b>", label_style), Paragraph(doctor.specialization if doctor and doctor.specialization else "General Dentistry", val_style)
            ],
            [
                Paragraph("<b>Phone / Blood Type:</b>", label_style), Paragraph(f"{patient.phone if patient else 'N/A'} (Blood: {patient.blood_type if patient else 'Unknown'})", val_style),
                Paragraph("<b>Consultation Time:</b>", label_style), Paragraph(created_time, val_style)
            ]
        ]
        
        info_table = Table(info_data, colWidths=[100, 170, 100, 170])
        info_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('PADDING', (0, 0), (-1, -1), 4),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 10))
        
        # 3. Tooth & Diagnosis section
        elements.append(Paragraph("Consultation Parameters", h1_style))
        add_separator()
        
        symptoms_list = []
        if report.symptoms:
            try:
                symptoms_list = json.loads(report.symptoms)
            except:
                symptoms_list = [report.symptoms]
        symptoms_str = ", ".join(symptoms_list) if symptoms_list else "None Reported"
        
        param_data = [
            [Paragraph("<b>Target Tooth ID:</b>", label_style), Paragraph(report.tooth_id or "General / Non-Specific", val_style)],
            [Paragraph("<b>Tooth Condition:</b>", label_style), Paragraph(report.tooth_status or "N/A", val_style)],
            [Paragraph("<b>Reported Symptoms:</b>", label_style), Paragraph(symptoms_str, val_style)]
        ]
        param_table = Table(param_data, colWidths=[120, 420])
        param_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('PADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(param_table)
        elements.append(Spacer(1, 10))
        
        # 4. Clinical Findings / Approved Report
        elements.append(Paragraph("Final Clinical Findings & Diagnosis", h1_style))
        add_separator()
        
        findings_text = report.final_medical_report or report.ai_draft_report or "No clinical report notes documented."
        elements.append(Paragraph(findings_text.replace("\n", "<br/>"), body_style))
        elements.append(Spacer(1, 10))
        
        # 5. Doctor's Private Notes
        if report.doctor_notes:
            elements.append(Paragraph("Doctor's Additional Notes", h1_style))
            add_separator()
            elements.append(Paragraph(report.doctor_notes.replace("\n", "<br/>"), body_style))
            elements.append(Spacer(1, 10))
            
        # 6. Patient Friendly Explanations (Humanized)
        if report.humanized_report:
            elements.append(Paragraph("Patient-Friendly Advice & Explanation", h1_style))
            add_separator()
            elements.append(Paragraph(report.humanized_report.replace("\n", "<br/>"), body_style))
            elements.append(Spacer(1, 10))
            
        # 7. Signature area
        elements.append(Spacer(1, 20))
        sig_data = [
            [
                Paragraph("", val_style),
                Paragraph("___________________________<br/><b>DR. Signature</b>", val_style)
            ]
        ]
        sig_table = Table(sig_data, colWidths=[340, 200])
        sig_table.setStyle(TableStyle([
            ('ALIGN', (1, 0), (1, 0), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
        ]))
        elements.append(sig_table)
        
        # 8. Footer text
        elements.append(Spacer(1, 24))
        elements.append(Paragraph(f"This is an official clinical record generated automatically by Smart Dental Clinic on {created_time}.", footer_style))
        
        doc.build(elements)
        
        # Update model
        report.pdf_path = pdf_filepath
        db.commit()
        logger.info(f"Successfully generated PDF report at {pdf_filepath}")
        return pdf_filepath
    except Exception as e:
        logger.error(f"Failed to generate PDF: {e}")
        return None

# ── Clinical Reports (AI + CRUD) ────────────────────────────────────────────
@app.post("/api/ai/generate-report")
async def ai_generate_report(payload: dict, db: Session = Depends(get_db), user: models.User = Depends(require_role('doctor'))):
    """Generate AI clinical report from consultation data via LangChain + Ollama."""
    try:
        report_text = await generate_clinical_report(payload)
        return {"status": "success", "report": report_text}
    except Exception as e:
        logger.error(f"AI Report Generation Error: {e}")
        raise HTTPException(status_code=500, detail=f"AI report generation failed: {str(e)}")

@app.post("/api/ai/humanize-report")
async def ai_humanize_report(payload: dict, db: Session = Depends(get_db), user: models.User = Depends(require_role('doctor'))):
    """Convert medical report to patient-friendly language via LangChain + Ollama."""
    medical_report = payload.get("report", "")
    patient_name = payload.get("patient_name", "Patient")
    if not medical_report:
        raise HTTPException(status_code=400, detail="Report text is required")
    try:
        humanized = await humanize_report_ai(medical_report, patient_name)
        return {"status": "success", "humanized_report": humanized}
    except Exception as e:
        logger.error(f"Report Humanization Error: {e}")
        raise HTTPException(status_code=500, detail=f"Humanization failed: {str(e)}")

@app.post("/api/reports")
def save_report(payload: dict, db: Session = Depends(get_db), user: models.User = Depends(require_role('doctor'))):
    """Save a finalized clinical report."""
    report = models.ClinicalReport(
        patient_id=payload.get("patient_id"),
        doctor_id=user.id,
        appointment_id=payload.get("appointment_id"),
        tooth_id=payload.get("tooth_id"),
        tooth_status=payload.get("tooth_status"),
        symptoms=json.dumps(payload.get("symptoms", [])),
        doctor_notes=payload.get("doctor_notes", ""),
        ai_draft_report=payload.get("ai_draft_report", ""),
        final_medical_report=payload.get("final_medical_report", ""),
        humanized_report=payload.get("humanized_report", ""),
        status=payload.get("status", "approved")
    )
    db.add(report)
    log_event(db, f"Clinical report saved for patient {payload.get('patient_id')}", doctor_id=user.id, patient_id=payload.get("patient_id"))
    db.commit()
    db.refresh(report)
    
    # Generate PDF automatically on save
    generate_pdf_report_file(report, db)
    
    return {
        "id": report.id, "patient_id": report.patient_id, "status": report.status,
        "tooth_id": report.tooth_id, "created_at": report.created_at.isoformat() + "Z" if report.created_at else None
    }

@app.get("/api/reports/patient/{patient_id}")
def get_patient_reports(patient_id: int, db: Session = Depends(get_db)):
    """Get all clinical reports for a patient."""
    reports = db.query(models.ClinicalReport).filter(
        models.ClinicalReport.patient_id == patient_id
    ).order_by(models.ClinicalReport.created_at.desc()).all()
    return [{
        "id": r.id, "patient_id": r.patient_id, "doctor_id": r.doctor_id,
        "tooth_id": r.tooth_id, "tooth_status": r.tooth_status,
        "symptoms": json.loads(r.symptoms) if r.symptoms else [],
        "doctor_notes": r.doctor_notes, "ai_draft_report": r.ai_draft_report,
        "final_medical_report": r.final_medical_report,
        "humanized_report": r.humanized_report, "status": r.status,
        "created_at": r.created_at.isoformat() + "Z" if r.created_at else None,
        "updated_at": r.updated_at.isoformat() + "Z" if r.updated_at else None,
        "doctor": r.doctor.full_name or r.doctor.username if r.doctor else "Unknown",
        "pdf_url": f"/api/reports/{r.id}/download" if r.pdf_path else None
    } for r in reports]

@app.get("/api/reports/{report_id}/download")
def download_report(report_id: int, db: Session = Depends(get_db)):
    """Download the clinical report as a PDF."""
    report = db.query(models.ClinicalReport).filter(models.ClinicalReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Clinical report not found")
    
    # Trigger fallback generation if the file doesn't exist yet
    if not report.pdf_path or not os.path.exists(report.pdf_path):
        generate_pdf_report_file(report, db)
        
    if not report.pdf_path or not os.path.exists(report.pdf_path):
        raise HTTPException(status_code=404, detail="PDF file could not be generated on this server")
        
    patient_name = report.patient.name if report.patient else "Patient"
    clean_name = "".join(c for c in patient_name if c.isalnum() or c in (' ', '_', '-')).strip()
    filename = f"Clinical_Report_{clean_name}_{report.tooth_id or 'General'}.pdf"
    
    return FileResponse(
        path=report.pdf_path,
        media_type="application/pdf",
        filename=filename
    )

@app.get("/api/doctor/consultations/history")
def get_doctor_consultations_history(db: Session = Depends(get_db), user: models.User = Depends(require_role('doctor'))):
    """Get consultation history for the logged-in doctor."""
    reports = db.query(models.ClinicalReport).options(joinedload(models.ClinicalReport.patient)).filter(
        models.ClinicalReport.doctor_id == user.id
    ).order_by(models.ClinicalReport.created_at.desc()).all()
    
    return [{
        "id": r.id,
        "patient_id": r.patient_id,
        "patient_name": r.patient.name if r.patient else "Unknown",
        "doctor_id": r.doctor_id,
        "tooth_id": r.tooth_id,
        "tooth_status": r.tooth_status,
        "symptoms": json.loads(r.symptoms) if r.symptoms else [],
        "doctor_notes": r.doctor_notes,
        "ai_draft_report": r.ai_draft_report,
        "final_medical_report": r.final_medical_report,
        "humanized_report": r.humanized_report,
        "status": r.status,
        "created_at": r.created_at.isoformat() + "Z" if r.created_at else None,
        "updated_at": r.updated_at.isoformat() + "Z" if r.updated_at else None
    } for r in reports]

@app.put("/api/reports/{report_id}")
def update_report(report_id: int, payload: dict, db: Session = Depends(get_db), user: models.User = Depends(require_role('doctor'))):
    """Update an existing clinical report."""
    report = db.query(models.ClinicalReport).filter(models.ClinicalReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if report.doctor_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this report")

    for field in ["final_medical_report", "humanized_report", "status", "doctor_notes", "tooth_id", "tooth_status", "symptoms"]:
        if field in payload:
            val = json.dumps(payload[field]) if field == "symptoms" and isinstance(payload[field], list) else payload[field]
            setattr(report, field, val)
    db.commit()
    db.refresh(report)
    
    # Regenerate PDF automatically on update
    generate_pdf_report_file(report, db)
    
    return {"id": report.id, "status": report.status, "updated_at": report.updated_at.isoformat() + "Z" if report.updated_at else None}

# ── AI Configuration ─────────────────────────────────────────────────────────
OLLAMA_MODEL = "mistral:latest"
OLLAMA_BASE_URL = "http://localhost:11434"

def _get_ollama(temperature=0.2, format=None):
    return ChatOllama(model=OLLAMA_MODEL, base_url=OLLAMA_BASE_URL, temperature=temperature, num_predict=1024, format=format)

# ── AI Endpoints ────────────────────────────────────────────────────────────
@app.get("/api/ai/insights", response_model=InsightResponse)
async def get_ai_insights(db: Session = Depends(get_db)):
    total_patients = 0
    today_appts = []
    completed = 0
    pending = 0

    try:
        # 1. Aggregate stats
        total_patients = db.query(models.Patient).count()
        today_date = date.today()
        today_appts = db.query(models.Appointment).filter(models.Appointment.date == today_date).all()
        
        completed = len([a for a in today_appts if a.status == "Completed"])
        pending = len([a for a in today_appts if a.status != "Completed"])
        
        # Get common treatments (from Records)
        recent_records = db.query(models.Record).limit(20).all()
        treatments = [r.diagnosis for r in recent_records]
        
        stats_context = {
            "total_patients": total_patients,
            "today_total": len(today_appts),
            "completed": completed,
            "pending": pending,
            "recent_treatments": treatments[:5]
        }

        # 2. Call Ollama via LangChain
        llm = _get_ollama(temperature=0.2, format="json")
        
        system_prompt = """You are a dental clinic analytics assistant. Analyze the provided clinic statistics and return a valid JSON object with exactly these keys:
- "summary": a short professional summary string
- "stats": an object with keys "patients" (int), "today_appointments" (int), "completed" (int), "pending" (int)
- "recommendations": an array of exactly 3 short recommendation strings

Return ONLY valid JSON, no markdown, no explanation."""
        
        human_prompt = f"Analyze these clinic stats: {json.dumps(stats_context)}. Tone: Professional, operational, helpful."
        
        messages = [SystemMessage(content=system_prompt), HumanMessage(content=human_prompt)]
        response = await llm.ainvoke(messages)
        
        # Parse the JSON response
        raw = response.content.strip()
        if raw.startswith("```"):
            lines = raw.strip("`").strip().split('\n')
            if lines[0].lower() == "json":
                lines = lines[1:]
            raw = '\n'.join(lines).strip()
        result = json.loads(raw)
        return result

    except Exception as e:
        logger.error(f"AI Insights Error: {e}")
        # Fallback
        return {
            "summary": "Clinic is operating normally. Continue monitoring pending appointments.",
            "stats": {"patients": total_patients, "today_appointments": len(today_appts), "completed": completed, "pending": pending},
            "recommendations": ["Optimize scheduling for pending slots", "Review recent treatment logs", "Ensure all patient records are up to date"]
        }

@app.post("/api/ai/diagnosis", response_model=DiagnosisResponse)
async def ai_diagnosis(payload: DiagnosisRequest):
    try:
        llm = _get_ollama(temperature=0.1, format="json")
        
        system_prompt = """You are an experienced dental clinician assistant. Analyze the provided patient symptoms, history, and tooth data to produce a clinical assessment.
Return a valid JSON object with exactly these keys:
- "diagnosis": a detailed diagnosis string
- "conditions": an array of identified condition strings
- "treatment_plan": an array of recommended treatment steps

Return ONLY valid JSON, no markdown, no explanation."""
        
        human_prompt = f"Perform a dental clinical diagnosis based on: Symptoms: {payload.symptoms}. History: {payload.history}. Tooth Data: {json.dumps(payload.tooth_data)}."
        
        messages = [SystemMessage(content=system_prompt), HumanMessage(content=human_prompt)]
        response = await llm.ainvoke(messages)
        
        raw = response.content.strip()
        if raw.startswith("```"):
            lines = raw.strip("`").strip().split('\n')
            if lines[0].lower() == "json":
                lines = lines[1:]
            raw = '\n'.join(lines).strip()
        result = json.loads(raw)
        return result
    except Exception as e:
        logger.error(f"AI Diagnosis Error: {e}")
        return {
            "diagnosis": "Preliminary finding indicates potential irritation. Clinical exam required.",
            "conditions": ["Non-specific irritation"],
            "treatment_plan": ["Visual examination", "Sensitivity test"]
        }

@app.post("/api/ai/chat")
async def ai_chat(request: ChatRequest, db: Session = Depends(get_db)):
    try:
        # Fetch rich clinic context
        total_patients = db.query(models.Patient).count()
        today_date = date.today()
        today_appts = db.query(models.Appointment).filter(models.Appointment.date == today_date).all()
        recent_logs = db.query(models.Log).order_by(models.Log.created_at.desc()).limit(5).all()
        
        appt_summary = ", ".join([f"{a.time}: {a.patient.name if a.patient else 'Unknown'}" for a in today_appts])
        log_summary = ", ".join([l.message for l in recent_logs])
        
        system_instruction = (
            f"You are a smart clinic receptionist and assistant. "
            f"Today is {today_date.strftime('%B %d, %Y')}. "
            f"Context: Total Patients: {total_patients}. "
            f"Today's Schedule: {appt_summary if appt_summary else 'No appointments'}. "
            f"Recent Activity: {log_summary if log_summary else 'No recent logs'}. "
            f"Keep responses operational, helpful, and short."
        )
        
        llm = _get_ollama(temperature=0.7)
        
        # Build message chain with system context
        messages = [SystemMessage(content=system_instruction)]
        for m in request.messages:
            if m.role == 'ai':
                messages.append(AIMessage(content=m.text))
            else:
                messages.append(HumanMessage(content=m.text))
        
        response = await llm.ainvoke(messages)
        logger.info(f"AI Chat Action: Processed message with context. Status: OK")
        return {"response": response.content}
    except Exception as e:
        logger.error(f"AI Chat Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate AI response")

@app.get("/")
def health_check():
    return {"status": "operational", "version": "2.0.0-enterprise"}

# ── Settings Endpoints ───────────────────────────────────────────────────────
@app.get("/api/settings/clinic", response_model=ClinicSettingsResponse)
def get_clinic_settings(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    if user.role not in ["admin", "doctor"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    settings = db.query(models.ClinicSettings).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found")
    return settings

@app.put("/api/settings/clinic", response_model=ClinicSettingsResponse)
def update_clinic_settings(payload: ClinicSettingsUpdate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    if user.role not in ["admin", "doctor"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    settings = db.query(models.ClinicSettings).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found")
    
    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(settings, key, value)
    db.commit()
    db.refresh(settings)
    return settings

@app.get("/api/settings/profile", response_model=UserProfile)
def get_profile_settings(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "specialization": user.specialization
    }

@app.put("/api/settings/profile", response_model=UserProfile)
def update_profile_settings(payload: UserProfileUpdate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    update_data = payload.dict(exclude_unset=True)
    if "password" in update_data and update_data["password"]:
        user.hashed_password = pwd_context.hash(update_data["password"])
        del update_data["password"]
    
    if "email" in update_data and update_data["email"]:
        email_clean = update_data["email"].strip().lower()
        clinic_email = user.email
        
        # Check if the personal email is already mapped to another user
        existing_mapping_owner = None
        # Retrieve all mappings to find if email_clean is used by another clinic email
        import sqlite3
        import pending_store
        conn = sqlite3.connect(pending_store.DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT clinic_email FROM email_mappings WHERE personal_email = ? AND clinic_email != ?", (email_clean, clinic_email))
        row = cursor.fetchone()
        conn.close()
        if row:
            raise HTTPException(status_code=400, detail="Email address is already in use by another account")
            
        # Save mapping
        pending_store.save_email_mapping(clinic_email, email_clean)
        # Prevent updating target.email to personal email
        del update_data["email"]
        
    for key, value in update_data.items():
        setattr(user, key, value)
    
    db.commit()
    db.refresh(user)
    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "full_name": user.full_name,
        "email": user.email, # Clinic email is returned
        "phone": user.phone,
        "specialization": user.specialization
    }


# ── Clinical Symptoms Endpoints ──────────────────────────────────────────────
@app.get("/api/clinical/symptoms", response_model=List[SymptomResponse])
def get_symptoms(db: Session = Depends(get_db)):
    symptoms = db.query(models.Symptom).filter(models.Symptom.is_active == 1).order_by(models.Symptom.name.asc()).all()
    if not symptoms:
        # Auto-seed default symptoms if table is empty
        defaults = [
            "Cold Sensitivity", "Hot Sensitivity", "Sweet Sensitivity", "Sharp Pain", 
            "Dull Ache", "Spontaneous Pain", "Pain on Biting", "Swelling", 
            "Bleeding Gums", "Tooth Mobility", "Visible Decay", "Fractured/Chipped", 
            "Defective Restoration", "Halitosis (Bad Breath)"
        ]
        for name in defaults:
            s = models.Symptom(name=name)
            db.add(s)
        db.commit()
        symptoms = db.query(models.Symptom).filter(models.Symptom.is_active == 1).order_by(models.Symptom.name.asc()).all()
    return symptoms

@app.post("/api/clinical/symptoms", response_model=SymptomResponse)
def create_symptom(payload: SymptomCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    name_norm = payload.name.strip()
    if not name_norm:
        raise HTTPException(status_code=400, detail="Symptom name cannot be empty")
    
    existing = db.query(models.Symptom).filter(func.lower(models.Symptom.name) == name_norm.lower()).first()
    if existing:
        if existing.is_active == 0:
            existing.is_active = 1
            db.commit()
            db.refresh(existing)
            return existing
        return existing
        
    new_symptom = models.Symptom(
        name=name_norm,
        created_by=user.id
    )
    db.add(new_symptom)
    db.commit()
    db.refresh(new_symptom)
    return new_symptom
