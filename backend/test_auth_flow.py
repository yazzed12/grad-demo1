import urllib.request
import urllib.parse
import json
import time
import sqlite3
import os

BASE_URL = "http://127.0.0.1:8000"

def make_request(path, method="GET", data=None, headers=None):
    url = f"{BASE_URL}{path}"
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
        
    req_data = None
    if data:
        if req_headers.get("Content-Type") == "application/x-www-form-urlencoded":
            req_data = urllib.parse.urlencode(data).encode("utf-8")
        else:
            req_data = json.dumps(data).encode("utf-8")
            
    req = urllib.request.Request(url, data=req_data, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            res_data = response.read().decode("utf-8")
            return response.status, json.loads(res_data) if res_data else {}
    except urllib.error.HTTPError as e:
        res_data = e.read().decode("utf-8")
        try:
            err_json = json.loads(res_data)
        except Exception:
            err_json = res_data
        return e.code, err_json

def get_db_verification_code(personal_email):
    # Read from test_emails.json
    try:
        test_emails_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_emails.json")
        if os.path.exists(test_emails_path):
            with open(test_emails_path, "r") as f:
                data = json.load(f)
                entry = data.get(personal_email.strip().lower())
                if entry:
                    return entry["code"]
    except Exception as e:
        print(f"Error reading test_emails.json: {e}")
    return None

def get_db_reset_token(clinic_email):
    # Lookup the personal email from mappings, then read the code from test_emails.json
    try:
        db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pending_users.db")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT personal_email FROM email_mappings WHERE clinic_email = ?", (clinic_email.lower(),))
        row = cursor.fetchone()
        conn.close()
        if row:
            personal_email = row[0]
            test_emails_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_emails.json")
            if os.path.exists(test_emails_path):
                with open(test_emails_path, "r") as f:
                    data = json.load(f)
                    entry = data.get(personal_email.strip().lower())
                    if entry:
                        return entry["code"]
    except Exception as e:
        print(f"Error getting reset token: {e}")
    return None

def run_tests():
    print("Starting Integration Tests for Authentication System...")
    
    timestamp = int(time.time())
    username = f"tester_{timestamp}"
    personal_email = f"tester_{timestamp}@gmail.com"
    clinic_email = f"{username}@doctor.com"
    password = "Secretpassword123"
    new_password = "Newsecretpassword123"
    
    # 1. Register a new doctor
    print("\n--- Test Case 1: Register New Doctor ---")
    reg_payload = {
        "username": username,
        "password": password,
        "full_name": "Dr. Integration Tester",
        "email": clinic_email,
        "role": "doctor",
        "personal_email": personal_email,
        "phone": "+1 555-9876",
        "specialization": "Pediatric Dentistry"
    }
    
    status, body = make_request("/api/auth/register", "POST", reg_payload)
    print(f"Status: {status}")
    print(f"Response: {body}")
    assert status == 200, "Registration failed"
    assert body.get("status") == "success"
    
    # 1.1. Register a new receptionist via public signup
    print("\n--- Test Case 1.1: Register New Receptionist via Public Signup ---")
    ts_rec_signup = int(time.time()) + 300
    username_rec_signup = f"rec_signup_{ts_rec_signup}"
    rec_signup_payload = {
        "username": username_rec_signup,
        "password": "Password123",
        "full_name": "Receptionist Signup Tester",
        "email": f"{username_rec_signup}@receptionist.com",
        "role": "receptionist",
        "personal_email": f"{username_rec_signup}@gmail.com"
      }
    status_r_signup, body_r_signup = make_request("/api/auth/register", "POST", rec_signup_payload)
    print(f"Status: {status_r_signup}, Body: {body_r_signup}")
    assert status_r_signup == 200
    
    # 2. Try to register duplicate username
    print("\n--- Test Case 2: Register Duplicate Username ---")
    status_dup, body_dup = make_request("/api/auth/register", "POST", reg_payload)
    print(f"Status: {status_dup}")
    print(f"Response: {body_dup}")
    assert status_dup == 200, "Should return 200 for generic privacy response"
    assert "If an account exists, a code has been sent" in body_dup.get("message", "")
    
    # 3. Retrieve verification code from DB and verify signup
    print("\n--- Test Case 3: Verify Verification Code ---")
    code = get_db_verification_code(personal_email)
    print(f"Retrieved code from pending store: {code}")
    assert code is not None, "Verification code not found in pending store"
    
    verify_payload = {
        "personal_email": personal_email,
        "code": code
    }
    status_ver, body_ver = make_request("/api/auth/verify", "POST", verify_payload)
    print(f"Status: {status_ver}")
    print(f"Response: {body_ver}")
    assert status_ver == 200, "Verification failed"
    token = body_ver.get("access_token")
    assert token is not None, "Did not return access token"
    
    # 4. Try verifying with wrong code or same code again
    print("\n--- Test Case 4: Verify with Expired/Invalid Code ---")
    status_ver_err, body_ver_err = make_request("/api/auth/verify", "POST", verify_payload)
    print(f"Status: {status_ver_err}")
    assert status_ver_err == 400, "Should reject already verified code"
    
    # 5. Access /api/auth/me with token
    print("\n--- Test Case 5: Access Profile ---")
    headers = {"Authorization": f"Bearer {token}"}
    status_me, body_me = make_request("/api/auth/me", "GET", headers=headers)
    print(f"Status: {status_me}")
    print(f"Response: {body_me}")
    assert status_me == 200, "Accessing profile failed"
    assert body_me.get("email") == clinic_email, "Email field should return the Clinic Email"
    
    # 6. Login using clinic email ONLY
    print("\n--- Test Case 6: Login with Clinic Email ---")
    login_data = {
        "username": clinic_email,
        "password": password
    }
    status_log, body_log = make_request(
        "/api/auth/login", 
        "POST", 
        data=login_data, 
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    print(f"Status: {status_log}")
    print(f"Response: {body_log}")
    assert status_log == 200, "Login failed"
    assert body_log.get("access_token") is not None
    
    # 7. Try to login with username instead of clinic email
    print("\n--- Test Case 7: Reject login with username (Clinic Email ONLY) ---")
    login_data_user = {
        "username": username,
        "password": password
    }
    status_log_err, body_log_err = make_request(
        "/api/auth/login", 
        "POST", 
        data=login_data_user, 
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    print(f"Status: {status_log_err}")
    assert status_log_err == 400, "Should reject login by username"
    
    # 8. Logout and invalidate token
    print("\n--- Test Case 8: Logout and Invalidate Token ---")
    status_out, body_out = make_request("/api/auth/logout", "POST", headers=headers)
    print(f"Status: {status_out}")
    print(f"Response: {body_out}")
    assert status_out == 200
    
    # Verify token is blacklisted by calling /api/auth/me again
    print("\n--- Test Case 9: Access Profile with Blacklisted Token ---")
    status_me_blk, body_me_blk = make_request("/api/auth/me", "GET", headers=headers)
    print(f"Status: {status_me_blk}")
    assert status_me_blk == 401, "Token should be blacklisted"
    
    # 9. Forget password
    print("\n--- Test Case 10: Forget Password Request ---")
    forgot_payload = {"clinic_email": clinic_email}
    status_fg, body_fg = make_request("/api/auth/forgot-password", "POST", forgot_payload)
    print(f"Status: {status_fg}")
    print(f"Response: {body_fg}")
    assert status_fg == 200
    assert body_fg.get("personal_email") == personal_email
    
    # 10. Reset Password
    print("\n--- Test Case 11: Reset Password with Token ---")
    reset_token = get_db_reset_token(clinic_email)
    print(f"Retrieved reset token from DB: {reset_token}")
    assert reset_token is not None
    
    reset_payload = {
        "token": reset_token,
        "new_password": new_password
    }
    status_rst, body_rst = make_request("/api/auth/reset-password", "POST", reset_payload)
    print(f"Status: {status_rst}")
    print(f"Response: {body_rst}")
    assert status_rst == 200
    
    # 11. Login with new password
    print("\n--- Test Case 12: Login with New Password ---")
    login_data_new = {
        "username": clinic_email,
        "password": new_password
    }
    status_log_new, body_log_new = make_request(
        "/api/auth/login", 
        "POST", 
        data=login_data_new, 
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    print(f"Status: {status_log_new}")
    print(f"Response: {body_log_new}")
    assert status_log_new == 200
    assert body_log_new.get("access_token") is not None
    
    # 12. Test Registration Attempts Limit
    print("\n--- Test Case 13: Test Registration Attempts Limit ---")
    ts_attempts = int(time.time()) + 100
    username_att = f"tester_att_{ts_attempts}"
    personal_email_att = f"tester_att_{ts_attempts}@gmail.com"
    clinic_email_att = f"{username_att}@doctor.com"
    
    reg_att_payload = {
        "username": username_att,
        "password": "Password123",
        "full_name": "Dr. Attempt Tester",
        "email": clinic_email_att,
        "role": "doctor",
        "personal_email": personal_email_att
    }
    
    status_reg_att, _ = make_request("/api/auth/register", "POST", reg_att_payload)
    assert status_reg_att == 200, "Registration for attempts testing failed"
    
    # First wrong try
    status_v1, body_v1 = make_request("/api/auth/verify", "POST", {"personal_email": personal_email_att, "code": "000000"})
    print(f"Wrong code 1: Status={status_v1}, Response={body_v1}")
    assert status_v1 == 400
    assert body_v1.get("detail") == "Invalid verification code"
    
    # Second wrong try
    status_v2, body_v2 = make_request("/api/auth/verify", "POST", {"personal_email": personal_email_att, "code": "000000"})
    print(f"Wrong code 2: Status={status_v2}, Response={body_v2}")
    assert status_v2 == 400
    assert body_v2.get("detail") == "Invalid verification code"
    
    # Third wrong try
    status_v3, body_v3 = make_request("/api/auth/verify", "POST", {"personal_email": personal_email_att, "code": "000000"})
    print(f"Wrong code 3: Status={status_v3}, Response={body_v3}")
    assert status_v3 == 400
    assert body_v3.get("detail") == "Invalid verification code"
    
    # Fourth wrong try
    status_v4, body_v4 = make_request("/api/auth/verify", "POST", {"personal_email": personal_email_att, "code": "000000"})
    print(f"Wrong code 4: Status={status_v4}, Response={body_v4}")
    assert status_v4 == 400
    assert body_v4.get("detail") == "Invalid verification code"
    
    # Fifth wrong try (Exceeds limit)
    status_v5, body_v5 = make_request("/api/auth/verify", "POST", {"personal_email": personal_email_att, "code": "000000"})
    print(f"Wrong code 5: Status={status_v5}, Response={body_v5}")
    assert status_v5 == 400
    assert "Too many incorrect attempts" in body_v5.get("detail")
    
    # Sixth try (Already deleted)
    status_v6, body_v6 = make_request("/api/auth/verify", "POST", {"personal_email": personal_email_att, "code": "000000"})
    print(f"Wrong code 6: Status={status_v6}, Response={body_v6}")
    assert status_v6 == 400
    assert "Invalid or expired" in body_v6.get("detail")
    
    # 13. Test Reset Attempts Limit
    print("\n--- Test Case 14: Test Reset Password Attempts Limit ---")
    # Reset password on the user created in Test Case 1
    forgot_payload_att = {"clinic_email": clinic_email}
    status_fg_att, body_fg_att = make_request("/api/auth/forgot-password", "POST", forgot_payload_att)
    assert status_fg_att == 200
    
    # First wrong try (using clinic_email in payload to increment properly)
    reset_wrong_payload = {
        "token": "000000",
        "new_password": "Newpassword123",
        "clinic_email": clinic_email
    }
    status_r1, body_r1 = make_request("/api/auth/reset-password", "POST", reset_wrong_payload)
    print(f"Wrong reset 1: Status={status_r1}, Response={body_r1}")
    assert status_r1 == 400
    assert body_r1.get("detail") == "Invalid verification code"
    
    # Second wrong try
    status_r2, body_r2 = make_request("/api/auth/reset-password", "POST", reset_wrong_payload)
    print(f"Wrong reset 2: Status={status_r2}, Response={body_r2}")
    assert status_r2 == 400
    assert body_r2.get("detail") == "Invalid verification code"
    
    # Third wrong try
    status_r3, body_r3 = make_request("/api/auth/reset-password", "POST", reset_wrong_payload)
    print(f"Wrong reset 3: Status={status_r3}, Response={body_r3}")
    assert status_r3 == 400
    assert body_r3.get("detail") == "Invalid verification code"
    
    # Fourth wrong try
    status_r4, body_r4 = make_request("/api/auth/reset-password", "POST", reset_wrong_payload)
    print(f"Wrong reset 4: Status={status_r4}, Response={body_r4}")
    assert status_r4 == 400
    assert body_r4.get("detail") == "Invalid verification code"
    
    # Fifth wrong try
    status_r5, body_r5 = make_request("/api/auth/reset-password", "POST", reset_wrong_payload)
    print(f"Wrong reset 5: Status={status_r5}, Response={body_r5}")
    assert status_r5 == 400
    assert "Too many incorrect attempts" in body_r5.get("detail")
    
    # Sixth try
    status_r6, body_r6 = make_request("/api/auth/reset-password", "POST", reset_wrong_payload)
    print(f"Wrong reset 6: Status={status_r6}, Response={body_r6}")
    assert status_r6 == 400
    assert "Invalid or expired" in body_r6.get("detail")

    # 14. Test Admin Personal Email Management (Add & Update Staff)
    print("\n--- Test Case 15: Admin Staff Management (Personal Emails) ---")
    admin_login_data = {
        "username": "admin@admin.com",
        "password": "password123"
    }
    status_admin_log, body_admin_log = make_request(
        "/api/auth/login", 
        "POST", 
        data=admin_login_data, 
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert status_admin_log == 200
    admin_token = body_admin_log.get("access_token")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    ts_staff = int(time.time()) + 200
    rec_username = f"rec_{ts_staff}"
    rec_personal = f"rec_{ts_staff}@gmail.com"
    rec_clinic = f"{rec_username}@receptionist.com"
    
    new_staff_payload = {
        "username": rec_username,
        "password": "Password123",
        "full_name": "Front Desk Staff",
        "email": rec_clinic,
        "role": "receptionist",
        "personal_email": rec_personal
    }
    status_c, body_c = make_request("/api/staff", "POST", data=new_staff_payload, headers=admin_headers)
    print(f"Create Staff Status: {status_c}, Body: {body_c}")
    assert status_c == 200
    new_staff_id = body_c.get("id")
    
    # Check mapping
    import sqlite3
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pending_users.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT personal_email FROM email_mappings WHERE clinic_email = ?", (rec_clinic.lower(),))
    row = cursor.fetchone()
    conn.close()
    assert row is not None
    assert row[0] == rec_personal.lower()
    
    # Update staff personal email
    updated_personal = f"rec_updated_{ts_staff}@gmail.com"
    update_payload = {
        "personal_email": updated_personal
    }
    status_u, body_u = make_request(f"/api/staff/{new_staff_id}", "PUT", data=update_payload, headers=admin_headers)
    print(f"Update Staff Status: {status_u}, Body: {body_u}")
    assert status_u == 200
    
    # Check mapping updated
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT personal_email FROM email_mappings WHERE clinic_email = ?", (rec_clinic.lower(),))
    row_up = cursor.fetchone()
    conn.close()
    assert row_up is not None
    assert row_up[0] == updated_personal.lower()

    # Update staff username (which updates clinic email automatically)
    new_username = f"rec_new_{ts_staff}"
    new_clinic = f"{new_username}@receptionist.com"
    update_username_payload = {
        "username": new_username
    }
    status_u2, body_u2 = make_request(f"/api/staff/{new_staff_id}", "PUT", data=update_username_payload, headers=admin_headers)
    print(f"Update Staff Username Status: {status_u2}, Body: {body_u2}")
    assert status_u2 == 200
    
    # Check mapping updated for the new username-based clinic email
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT personal_email FROM email_mappings WHERE clinic_email = ?", (new_clinic.lower(),))
    row_up2 = cursor.fetchone()
    conn.close()
    assert row_up2 is not None
    assert row_up2[0] == updated_personal.lower()

    # Update staff to custom clinic email and username
    custom_username = f"rec_custom_{ts_staff}"
    custom_clinic = f"custom_email_{ts_staff}@receptionist.com"
    update_custom_payload = {
        "username": custom_username,
        "email": custom_clinic
    }
    status_u3, body_u3 = make_request(f"/api/staff/{new_staff_id}", "PUT", data=update_custom_payload, headers=admin_headers)
    print(f"Update Custom Staff Username/Email Status: {status_u3}, Body: {body_u3}")
    assert status_u3 == 200

    # Check mapping updated for the new custom clinic email
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT personal_email FROM email_mappings WHERE clinic_email = ?", (custom_clinic.lower(),))
    row_up3 = cursor.fetchone()
    conn.close()
    assert row_up3 is not None
    assert row_up3[0] == updated_personal.lower()

    # Check mapping for old clinic email is deleted
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT personal_email FROM email_mappings WHERE clinic_email = ?", (new_clinic.lower(),))
    row_up4 = cursor.fetchone()
    conn.close()
    assert row_up4 is None

    print("\nALL TESTS PASSED SUCCESSFULLY! AUTHENTICATION SYSTEM IS FULLY CORRECT!")

if __name__ == "__main__":
    run_tests()
