from fastapi import FastAPI, Depends, HTTPException, Request, Response, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel, Field
import json
import time
from datetime import date, datetime, timedelta
import logging
from jose import JWTError, jwt
from passlib.context import CryptContext
from typing import List, Optional

import sys
import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

# Ensure the backend directory is in the python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import models
import ai_prompt
from database import engine, get_db, Base, SessionLocal

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

class PatientCreate(BaseModel):
    name: str
    age: Optional[int] = None
    phone: Optional[str] = None
    gender: Optional[str] = "Unknown"
    status: Optional[str] = "Active"
    condition: Optional[str] = "Routine Checkup"
    last_visit: Optional[str] = None

class AppointmentCreate(BaseModel):
    patient_id: int
    date: str
    time: str
    type: Optional[str] = "Normal"

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

def bootstrap_default_users():
    """
    Ensure demo users exist for local/dev login flows.
    This runs only when the users table is empty.
    """
    db = SessionLocal()
    try:
        if db.query(models.User).count() > 0:
            return

            models.User(
                username="doctor1",
                hashed_password=pwd_context.hash("password123"),
                full_name="Dr. Sarah Mitchell",
                email="sarah.m@smartclinic.com",
                role="doctor"
            ),
            models.User(
                username="admin",
                hashed_password=pwd_context.hash("password123"),
                full_name="Clinic Admin",
                email="admin@smartclinic.com",
                role="admin"
            ),
            models.User(
                username="receptionist1",
                hashed_password=pwd_context.hash("password123"),
                full_name="Front Desk",
                email="frontdesk@smartclinic.com",
                role="receptionist"
            ),
        ]
        db.add_all(demo_users)
        db.commit()

        # Add initial notifications
        if db.query(models.Notification).count() == 0:
            initial_notifications = [
                models.Notification(title="System Ready", body="Backend-driven clinical system is now active.", type="success"),
                models.Notification(title="Daily Schedule", body="Your appointments for today have been synced.", type="info"),
                models.Notification(title="AI Module", body="Practice insights and clinical diagnosis engine online.", type="info"),
            ]
            db.add_all(initial_notifications)
            db.commit()
        logger.info("Bootstrapped default demo users.")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to bootstrap default users: {e}")
    finally:
        db.close()

@app.on_event("startup")
def startup_bootstrap():
    bootstrap_default_users()

# ── Authentication Endpoints ─────────────────────────────────────────────────
@app.post("/api/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not pwd_context.verify(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    access_token = jwt.encode(
        {"sub": user.username, "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)},
        SECRET_KEY, algorithm=ALGORITHM
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=UserProfile)
def get_me(user: models.User = Depends(get_current_user)):
    return { 
        "id": user.id, 
        "username": user.username, 
        "role": user.role, 
        "full_name": user.full_name,
        "email": user.email
    }

# ── Dashboard & Stats ───────────────────────────────────────────────────────
@app.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    # Note: Dashboard is currently public for quick initial load, 
    # but in a real enterprise app, this should be protected.
    today_str = date.today().isoformat()
    total_patients = db.query(models.Patient).count()
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
        "created_at": l.created_at.strftime("%b %d, %H:%M")
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
        "created_at": n.created_at
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
    patients = db.query(models.Patient).all()
    return [{"id": p.id, "name": p.name, "age": p.age, "phone": p.phone, "gender": p.gender, "status": p.status, "condition": p.condition, "lastVisit": p.last_visit} for p in patients]

@app.post("/api/patients")
def create_patient(payload: PatientCreate, db: Session = Depends(get_db), user: models.User = Depends(require_role('doctor'))):
    new_patient = models.Patient(**payload.dict())
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)
    return {"id": new_patient.id, "name": new_patient.name, "age": new_patient.age, "phone": new_patient.phone, "gender": new_patient.gender, "status": new_patient.status, "condition": new_patient.condition, "lastVisit": new_patient.last_visit}

@app.delete("/api/patients/{patient_id}")
def delete_patient(patient_id: int, db: Session = Depends(get_db), user: models.User = Depends(require_role('doctor'))):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    db.delete(patient)
    db.commit()
    return {"status": "success"}

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
        "status": a.status
    } for a in appointments]

@app.post("/api/appointments")
def create_appointment(payload: AppointmentCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), user: models.User = Depends(require_role('doctor'))):
    try:
        appt_date = date.fromisoformat(payload.date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, use YYYY-MM-DD")
    
    new_appt = models.Appointment(
        patient_id=payload.patient_id,
        date=appt_date,
        time=payload.time,
        type=payload.type,
        status="Pending"
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
        "status": new_appt.status
    }

@app.put("/api/appointments/{appointment_id}/status")
def update_appointment_status(appointment_id: int, status_update: dict, db: Session = Depends(get_db), user: models.User = Depends(require_role('doctor'))):
    appt = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    new_status = status_update.get("status")
    if new_status:
        appt.status = new_status
        db.commit()
        db.refresh(appt)
    return {"status": "success", "new_status": appt.status}

@app.delete("/api/appointments/{appointment_id}")
def delete_appointment(appointment_id: int, db: Session = Depends(get_db), user: models.User = Depends(require_role('doctor'))):
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
def get_doctors(db: Session = Depends(get_db)):
    doctors = db.query(models.User).filter(models.User.role == "doctor").all()
    return [{
        "id": d.id,
        "name": d.full_name or d.username,
        "username": d.username,
        "role": d.role,
        "status": "online",
        "rating": 5.0,
        "patients": 0
    } for d in doctors]

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
        "lastUpdated": consultation.last_updated
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

# ── AI Endpoints ────────────────────────────────────────────────────────────
@app.get("/api/ai/insights", response_model=InsightResponse)
def get_ai_insights(db: Session = Depends(get_db)):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="AI Not Configured")

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

        # 2. Call Gemini
        client = genai.Client(api_key=api_key)
        prompt = f"Analyze these clinic stats and provide a structured JSON response with 'summary' and 'recommendations' (list of 3). Stats: {json.dumps(stats_context)}. Tone: Professional, operational, helpful."
        
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=InsightResponse,
                temperature=0.2
            )
        )
        
        # Handle potential parsing issues by returning the parsed JSON directly if it matches the schema
        return response.parsed

    except Exception as e:
        logger.error(f"AI Insights Error: {e}")
        # Fallback
        return {
            "summary": "Clinic is operating normally. Continue monitoring pending appointments.",
            "stats": {"patients": total_patients, "today_appointments": len(today_appts), "completed": completed, "pending": pending},
            "recommendations": ["Optimize scheduling for pending slots", "Review recent treatment logs"]
        }

@app.post("/api/ai/diagnosis", response_model=DiagnosisResponse)
def ai_diagnosis(payload: DiagnosisRequest):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="AI Not Configured")

    try:
        client = genai.Client(api_key=api_key)
        prompt = f"Perform a dental clinical diagnosis based on: Symptoms: {payload.symptoms}. History: {payload.history}. Tooth Data: {json.dumps(payload.tooth_data)}. Return JSON with 'diagnosis', 'conditions' (list), and 'treatment_plan' (list)."
        
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=DiagnosisResponse,
                temperature=0.1
            )
        )
        return response.parsed
    except Exception as e:
        logger.error(f"AI Diagnosis Error: {e}")
        return {
            "diagnosis": "Preliminary finding indicates potential irritation. Clinical exam required.",
            "conditions": ["Non-specific irritation"],
            "treatment_plan": ["Visual examination", "Sensitivity test"]
        }

@app.post("/api/ai/chat")
def ai_chat(request: ChatRequest, db: Session = Depends(get_db)):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="AI Assistant is not configured. Missing GEMINI_API_KEY.")
    
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
        
        client = genai.Client(api_key=api_key)
        
        contents = []
        for m in request.messages:
            role = 'model' if m.role == 'ai' else 'user'
            contents.append(genai.types.Content(role=role, parts=[genai.types.Part.from_text(m.text)]))
            
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=contents,
            config=genai.types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.7
            )
        )
        logger.info(f"AI Chat Action: Processed message with context. Status: OK")
        return {"response": response.text}
    except Exception as e:
        logger.error(f"AI Chat Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate AI response")

@app.get("/")
def health_check():
    return {"status": "operational", "version": "2.0.0-enterprise"}
