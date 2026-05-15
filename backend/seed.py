import sys
import os

# Ensure the backend directory is in the python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import models
from database import SessionLocal, engine, Base
from datetime import datetime, date, timedelta
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def seed_db():
    # Create tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Clear existing data
        print("Cleaning old data...")
        db.query(models.Log).delete()
        db.query(models.Record).delete()
        db.query(models.Appointment).delete()
        db.query(models.Patient).delete()
        db.query(models.Consultation).delete()
        db.query(models.Notification).delete()
        db.query(models.User).delete()
        db.commit()

        # ── Users ─────────────────────────────────────────────────────────────
        print("Seeding users...")
        users = [
            models.User(
                username="doctor1",
                hashed_password=pwd_context.hash("password123"),
                full_name="DR Yehia El-ameir",
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
            models.User(
                username="patient1",
                hashed_password=pwd_context.hash("password123"),
                full_name="Demo Patient",
                email="patient1@demo.com",
                role="patient"
            )
        ]
        db.add_all(users)
        db.commit()

        # ── Patients ──────────────────────────────────────────────────────────
        print("Seeding patients...")
        patients = [
            models.Patient(name="Ahmed Hassan", age=34, phone="010-1234-5678"),
            models.Patient(name="Mariam El-Sayed", age=28, phone="011-2345-6789"),
            models.Patient(name="Khaled Mostafa", age=45, phone="012-3456-7890"),
            models.Patient(name="Sara Ibrahim", age=22, phone="010-4567-8901"),
            models.Patient(name="Omar Farouk", age=55, phone="011-5678-9012"),
        ]
        db.add_all(patients)
        db.commit()

        # ── Appointments ──────────────────────────────────────────────────────
        print("Seeding appointments...")
        today_obj = date.today()
        appts = [
            models.Appointment(patient_id=patients[0].id, date=today_obj, time="09:00 AM", status="Pending", type="Normal"),
            models.Appointment(patient_id=patients[1].id, date=today_obj, time="10:30 AM", status="Pending", type="Urgent"),
            models.Appointment(patient_id=patients[2].id, date=today_obj, time="12:00 PM", status="Pending", type="Normal"),
            models.Appointment(patient_id=patients[3].id, date=today_obj, time="02:00 PM", status="Pending", type="Normal"),
        ]
        db.add_all(appts)
        db.commit()

        # ── Records ───────────────────────────────────────────────────────────
        print("Seeding records...")
        records = [
            models.Record(patient_id=patients[0].id, tooth="16", diagnosis="Moderate Caries"),
            models.Record(patient_id=patients[1].id, tooth="11", diagnosis="Enamel Erosion"),
        ]
        db.add_all(records)
        db.commit()

        # ── Notifications ─────────────────────────────────────────────────────
        print("Seeding notifications...")
        notifications = [
            models.Notification(title="Welcome", body="Welcome to the backend-driven Smart Dental Clinic.", type="success"),
            models.Notification(title="System Update", body="The system is now fully integrated with FastAPI.", type="info"),
            models.Notification(title="Daily Audit", body="Clinical logs have been successfully backed up.", type="info"),
        ]
        db.add_all(notifications)
        db.commit()

        print("Database seeded successfully!")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
