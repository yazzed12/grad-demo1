import http.client
import json
import urllib.parse

def test():
    # Get token
    conn = http.client.HTTPConnection("localhost", 8000)
    params = urllib.parse.urlencode({'username': 'doctor1', 'password': 'password123'})
    headers = {"Content-type": "application/x-www-form-urlencoded"}
    conn.request("POST", "/api/auth/login", params, headers)
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
    p8 = next((p for p in patients if p["id"] == 8), None)
    print(json.dumps(p8, indent=2))
    conn.close()

if __name__ == "__main__":
    test()
