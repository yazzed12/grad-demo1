import sqlite3
import os
from datetime import date

db_path = 'clinic.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    today = date.today().isoformat()
    print(f"Updating appointments to {today}")
    cursor.execute("UPDATE appointments SET date=?", (today,))
    conn.commit()
    conn.close()
    print("Database updated successfully.")
else:
    print("Database file not found.")
