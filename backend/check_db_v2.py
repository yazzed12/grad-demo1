import sqlite3
conn = sqlite3.connect('clinic.db')
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(patients);")
cols = cursor.fetchall()
cursor.execute("SELECT * FROM patients WHERE id = 8;")
row = cursor.fetchone()
print({cols[i][1]: row[i] for i in range(len(cols))})
conn.close()
