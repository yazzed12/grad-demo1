import sqlite3
conn = sqlite3.connect('clinic.db')
cursor = conn.cursor()
cursor.execute("SELECT * FROM patients WHERE id = 8;")
row = cursor.fetchone()
print(row)
conn.close()
