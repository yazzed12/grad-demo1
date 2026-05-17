import sqlite3
import os

def run_migration():
    db_path = 'clinic.db'
    if not os.path.exists(db_path):
        print(f"Database {db_path} not found.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Add condition column to appointments table if missing
    cursor.execute("PRAGMA table_info(appointments)")
    columns = [info[1] for info in cursor.fetchall()]
    if 'condition' not in columns:
        cursor.execute("ALTER TABLE appointments ADD COLUMN condition VARCHAR DEFAULT 'Routine Checkup'")
        print("Successfully added 'condition' column to appointments table.")
    else:
        print("'condition' column already exists in appointments table.")

    # 2. Create appointment_conditions table if missing
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS appointment_conditions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR UNIQUE NOT NULL,
            created_by INTEGER,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(created_by) REFERENCES users(id)
        )
    """)
    print("Checked/Created 'appointment_conditions' table.")

    # 3. Seed default conditions
    defaults = [
        'Routine Checkup', 'Dental Pain', 'Tooth Sensitivity', 'Swelling',
        'Bleeding Gums', 'Tooth Mobility', 'Fractured Tooth', 'Tooth Decay',
        'Root Canal Treatment', 'Crown Placement', 'Extraction Consultation',
        'Orthodontic Consultation', 'Gum Infection', 'Wisdom Tooth Pain',
        'Follow-up Visit', 'Cosmetic Dentistry', 'Teeth Cleaning',
        'Implant Consultation', 'Emergency Visit', 'Other'
    ]

    for cond in defaults:
        try:
            cursor.execute(
                "INSERT INTO appointment_conditions (name, is_active) VALUES (?, 1)",
                (cond,)
            )
            print(f"Seeded condition: {cond}")
        except sqlite3.IntegrityError:
            # Duplicate, safe to ignore
            pass

    conn.commit()
    conn.close()
    print("Database migration completed successfully!")

if __name__ == '__main__':
    run_migration()
