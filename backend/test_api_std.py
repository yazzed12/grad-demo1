import http.client
import json
import urllib.parse

def test():
    # Get token
    conn = http.client.HTTPConnection("localhost", 8000)
    params = urllib.parse.urlencode({'username': 'yazzed12', 'password': '123456'})
    headers = {"Content-type": "application/x-www-form-urlencoded"}
    conn.request("POST", "/token", params, headers)
    response = conn.getresponse()
    data = json.loads(response.read().decode())
    token = data["access_token"]

    # Get patient 8
    headers = {"Authorization": f"Bearer {token}"}
    conn.request("GET", "/api/patients/8", headers=headers)
    response = conn.getresponse()
    patient = json.loads(response.read().decode())
    print(json.dumps(patient, indent=2))
    conn.close()

if __name__ == "__main__":
    test()
