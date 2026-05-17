from fastapi.testclient import TestClient
from main import app
import traceback

client = TestClient(app)
try:
    print("Testing GET /dashboard...")
    response = client.get("/dashboard")
    print("Status code:", response.status_code)
    print("Response text:", response.text)
except Exception as e:
    print("Exception caught:")
    traceback.print_exc()
