import requests

# Get token
token_res = requests.post("http://localhost:8000/token", data={"username": "yazzed12", "password": "123456"})
token = token_res.json()["access_token"]

# Get patient 8
headers = {"Authorization": f"Bearer {token}"}
patient_res = requests.get("http://localhost:8000/api/patients/8", headers=headers)
print(patient_res.json())
