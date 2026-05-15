import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'clinic.db')

def upgrade_db():
    if not os.path.exists(db_path):
        print(f"Database file not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check users table
    cursor.execute('PRAGMA table_info(users)')
    columns = [info[1] for info in cursor.fetchall()]
    
    changes_made = False
    
    if 'phone' not in columns:
        cursor.execute("ALTER TABLE users ADD COLUMN phone VARCHAR")
        print("Added 'phone' column to 'users' table.")
        changes_made = True
    else:
        print("'phone' column already exists in 'users' table.")
        
    if 'specialization' not in columns:
        cursor.execute("ALTER TABLE users ADD COLUMN specialization VARCHAR")
        print("Added 'specialization' column to 'users' table.")
        changes_made = True
    else:
        print("'specialization' column already exists in 'users' table.")
        
    if changes_made:
        conn.commit()
        print("Database migration completed successfully.")
    else:
        print("No changes needed for users table.")
        
    conn.close()

if __name__ == '__main__':
    upgrade_db()
