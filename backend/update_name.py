import sqlite3
conn = sqlite3.connect('clinic.db')
conn.execute('UPDATE users SET full_name="DR Yehia El-ameir" WHERE full_name="Dr. Sarah Mitchell"')
conn.commit()
conn.close()
