import sqlite3
conn = sqlite3.connect('clinic.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='symptoms';")
print(cursor.fetchone())
conn.close()
