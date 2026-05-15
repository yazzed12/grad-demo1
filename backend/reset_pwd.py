from passlib.context import CryptContext
import sqlite3

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
hashed = pwd_context.hash("123456")

conn = sqlite3.connect('clinic.db')
c = conn.cursor()
c.execute("UPDATE users SET hashed_password=? WHERE username='doctor1'", (hashed,))
conn.commit()
conn.close()
print("Updated doctor1 password to 123456")
