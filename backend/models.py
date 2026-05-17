from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    email = Column(String, unique=True, index=True)
    role = Column(String, default="doctor") # admin / doctor / receptionist
    is_active = Column(Integer, default=1)
    phone = Column(String, nullable=True)
    specialization = Column(String, nullable=True)

class ClinicSettings(Base):
    __tablename__ = "clinic_settings"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, default="Smart Dental Clinic")
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    working_hours = Column(String, nullable=True)
    appointment_duration = Column(Integer, default=30)
    services = Column(Text, nullable=True) # JSON array of services
    notification_settings = Column(Text, nullable=True) # JSON object
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    age = Column(Integer)
    phone = Column(String)
    gender = Column(String, default="Unknown")
    status = Column(String, default="Active")
    condition = Column(String, default="Routine Checkup")
    last_visit = Column(String, nullable=True)
    blood_type = Column(String, default="Unknown")

    appointments = relationship("Appointment", back_populates="patient")
    records = relationship("Record", back_populates="patient")

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    date = Column(Date, nullable=False)
    time = Column(String, nullable=False)
    status = Column(String, default="Pending")  # Pending / Completed
    type = Column(String, default="Normal")    # Urgent / Normal
    condition = Column(String, default="Routine Checkup")

    patient = relationship("Patient", back_populates="appointments")

class Record(Base):
    __tablename__ = "records"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    tooth = Column(String)
    diagnosis = Column(String)

    patient = relationship("Patient", back_populates="records")

class Log(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, index=True)
    message = Column(String, nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    before_state = Column(Text, nullable=True) # JSON
    after_state = Column(Text, nullable=True)  # JSON
    created_at = Column(DateTime, default=datetime.utcnow)

class Consultation(Base):
    __tablename__ = "consultations"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), unique=True)
    data = Column(Text, nullable=False) # JSON
    version = Column(Integer, default=1) # Optimistic Locking
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    patient = relationship("Patient")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    body = Column(String)
    type = Column(String, default="info") # urgent / info / success / warning
    read = Column(Integer, default=0) # 0 for false, 1 for true
    created_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

class ClinicalReport(Base):
    __tablename__ = "clinical_reports"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    tooth_id = Column(String, nullable=True)
    tooth_status = Column(String, nullable=True)
    symptoms = Column(Text, nullable=True)  # JSON array
    doctor_notes = Column(Text, nullable=True)
    ai_draft_report = Column(Text, nullable=True)
    final_medical_report = Column(Text, nullable=True)
    humanized_report = Column(Text, nullable=True)
    status = Column(String, default="draft")  # draft / approved / finalized
    pdf_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    patient = relationship("Patient")
    doctor = relationship("User")

class Symptom(Base):
    __tablename__ = "symptoms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    creator = relationship("User")

class AppointmentCondition(Base):
    __tablename__ = "appointment_conditions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    creator = relationship("User")
