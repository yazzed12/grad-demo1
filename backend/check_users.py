import sqlite3
conn = sqlite3.connect('clinic.db')
cursor = conn.cursor()
cursor.execute("SELECT id, username, password, role FROM users;")
rows = cursor.fetchall()
for row in rows:
    print(row)
conn.close()
