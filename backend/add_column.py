import sqlite3

def upgrade_db():
    conn = sqlite3.connect('clinic.db')
    cursor = conn.cursor()
    cursor.execute('PRAGMA table_info(patients)')
    columns = [info[1] for info in cursor.fetchall()]
    if 'blood_type' not in columns:
        cursor.execute("ALTER TABLE patients ADD COLUMN blood_type VARCHAR DEFAULT 'Unknown'")
        print("blood_type column added.")
    else:
        print("blood_type column already exists.")
    
    # Let's also update some mock data to have real blood types if they are "Unknown"
    # Actually wait, let's just make sure the column exists.
    conn.commit()
    conn.close()

if __name__ == '__main__':
    upgrade_db()
