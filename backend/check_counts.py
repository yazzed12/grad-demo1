import sqlite3
import os

db_path = 'clinic.db'
if not os.path.exists(db_path):
    print("clinic.db not found in working directory!")
else:
    print(f"clinic.db size: {os.path.getsize(db_path)} bytes")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # List tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [t[0] for t in cursor.fetchall()]
    print("Tables in database:", tables)
    
    for table in tables:
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"- {table}: {count} rows")
        except Exception as e:
            print(f"- {table}: Error checking: {e}")
            
    conn.close()
