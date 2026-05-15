import http.client
import json
import urllib.parse

def test():
    # Get token
    conn = http.client.HTTPConnection("localhost", 8000)
    # I'll use 'admin' / 'admin' or something known
    params = urllib.parse.urlencode({'username': 'admin', 'password': 'admin123'}) # Assuming this
    # Wait, I checked users: (2, 'admin', 'admin') -> role is admin
    # Let's try doctor1 / password
    # I don't know the passwords because they are hashed.
    # I'll just check if I can get a token with 'doctor1' / '123456'
    params = urllib.parse.urlencode({'username': 'doctor1', 'password': '123456'})
    headers = {"Content-type": "application/x-www-form-urlencoded"}
    conn.request("POST", "/token", params, headers)
    response = conn.getresponse()
    data = json.loads(response.read().decode())
    if "access_token" not in data:
        print(f"Login failed: {data}")
        return
    token = data["access_token"]

    # Get patients
    headers = {"Authorization": f"Bearer {token}"}
    conn.request("GET", "/api/patients", headers=headers)
    response = conn.getresponse()
    patients = json.loads(response.read().decode())
    print(json.dumps(patients, indent=2))
    conn.close()

if __name__ == "__main__":
    test()
