import sqlite3

def run_migration():
    conn = sqlite3.connect('clinic.db')
    cursor = conn.cursor()
    
    # Check if blood_type column already exists
    cursor.execute("PRAGMA table_info(patients);")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'blood_type' not in columns:
        print("Adding 'blood_type' column to patients table...")
        try:
            cursor.execute("ALTER TABLE patients ADD COLUMN blood_type TEXT DEFAULT 'Unknown';")
            conn.commit()
            print("Successfully added 'blood_type' column!")
        except Exception as e:
            print("Error adding column:", e)
    else:
        print("'blood_type' column already exists in patients table.")
        
    conn.close()

if __name__ == '__main__':
    run_migration()
