import sqlite3

conn = sqlite3.connect('clinic.db')
cursor = conn.cursor()
cursor.execute("SELECT * FROM appointments;")
rows = cursor.fetchall()
print("Appointments table rows:")
for r in rows:
    print(r)

cursor.execute("SELECT id, name, status, last_visit FROM patients;")
print("\nPatients table rows:")
for r in cursor.fetchall():
    print(r)

conn.close()
