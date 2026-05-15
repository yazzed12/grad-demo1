import sqlite3
conn = sqlite3.connect('clinic.db')
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(users);")
print(cursor.fetchall())
conn.close()
