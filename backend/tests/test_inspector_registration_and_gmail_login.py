import requests
import random

BASE_URL = "http://localhost:8000/api/v1"

print("--- 1. Testing Login with Official Gmail Addresses ---")
# 1A. Supervisor Login via Gmail
sup_login = requests.post(f"{BASE_URL}/auth/token", data={
    "username": "director.supervisor.lmpc@gmail.com",
    "password": "supervisor123"
})
assert sup_login.status_code == 200, f"Supervisor Gmail login failed: {sup_login.text}"
sup_token = sup_login.json()["access_token"]
print("Supervisor Gmail Login: SUCCESS! (Token obtained)")

# 1B. Inspector Login via Gmail
insp_login = requests.post(f"{BASE_URL}/auth/token", data={
    "username": "inspector.rajesh.lmpc@gmail.com",
    "password": "inspector123"
})
assert insp_login.status_code == 200, f"Inspector Gmail login failed: {insp_login.text}"
print("Inspector Gmail Login: SUCCESS! (Token obtained)")

# 1C. Employer Login via Gmail
emp_login = requests.post(f"{BASE_URL}/auth/token", data={
    "username": "parle.compliance.lmpc@gmail.com",
    "password": "employer123"
})
assert emp_login.status_code == 200, f"Employer Gmail login failed: {emp_login.text}"
print("Brand Owner Gmail Login: SUCCESS! (Token obtained)")


print("\n--- 2. Testing New Inspector Registration with Dual OTP (Phone + Gmail) ---")
rand_id = random.randint(1000, 9999)
insp_phone = f"987123{rand_id}"
insp_gmail = f"inspector.officer_{rand_id}.lmpc@gmail.com"

# 2A. Phone OTP
p_res = requests.post(f"{BASE_URL}/auth/employer/send-phone-otp", json={"phone_number": insp_phone}).json()
p_otp = p_res["otp_preview"]
v_p_res = requests.post(f"{BASE_URL}/auth/employer/verify-phone-otp", json={"phone_number": insp_phone, "otp": p_otp})
assert v_p_res.status_code == 200, "Phone OTP verify failed"
print(f"Phone {insp_phone} Verified with OTP {p_otp}")

# 2B. Gmail OTP
e_res = requests.post(f"{BASE_URL}/auth/employer/send-email-otp", json={"email": insp_gmail}).json()
e_otp = e_res["otp_preview"]
v_e_res = requests.post(f"{BASE_URL}/auth/employer/verify-email-otp", json={"email": insp_gmail, "otp": e_otp})
assert v_e_res.status_code == 200, "Gmail OTP verify failed"
print(f"Gmail {insp_gmail} Verified with OTP {e_otp}")

# 2C. Submit Inspector Registration
reg_res = requests.post(f"{BASE_URL}/auth/inspector/register", json={
    "full_name": f"Officer Sandeep Joshi {rand_id}",
    "department": "Legal Metrology Enforcement Directorate",
    "jurisdiction_zone": "North Zone (Delhi NCR)",
    "assigned_category": "food",
    "email": insp_gmail,
    "phone_number": insp_phone,
    "password": "inspectorpassword123",
    "phone_otp": p_otp,
    "email_otp": e_otp
})
assert reg_res.status_code == 200, f"Inspector registration failed: {reg_res.text}"
reg_data = reg_res.json()
new_insp_id = reg_data["user"]["id"]
new_insp_uid = reg_data["unique_login_id"]
print(f"Inspector Application Created: ID #{new_insp_id} | Unique ID: {new_insp_uid}")
print(f"Approval State: is_approved = {reg_data['is_approved']}")


print("\n--- 3. Verifying Login Attempt BEFORE Supervisor Approval (Should be Blocked) ---")
blocked_login = requests.post(f"{BASE_URL}/auth/token", data={
    "username": insp_gmail,
    "password": "inspectorpassword123"
})
assert blocked_login.status_code == 403, f"Expected 403 Forbidden but got {blocked_login.status_code}"
print("Login Blocked as Expected: 403 Forbidden -", blocked_login.json()["detail"])


print("\n--- 4. Supervisor Approves & Commissions New Inspector ---")
sup_headers = {"Authorization": f"Bearer {sup_token}"}
approve_res = requests.post(f"{BASE_URL}/supervisor/inspectors/{new_insp_id}/approve", headers=sup_headers)
assert approve_res.status_code == 200, f"Supervisor approval failed: {approve_res.text}"
print("Supervisor Commissioning Decision:", approve_res.json()["message"])


print("\n--- 5. Inspector Login AFTER Supervisor Approval ---")
allowed_login = requests.post(f"{BASE_URL}/auth/token", data={
    "username": insp_gmail,
    "password": "inspectorpassword123"
})
assert allowed_login.status_code == 200, f"Login failed after approval: {allowed_login.text}"
new_token = allowed_login.json()["access_token"]
print("Inspector Login via Gmail: SUCCESS! (Account is now active)")

# 5B. Access inspector workspace API
insp_headers = {"Authorization": f"Bearer {new_token}"}
work_res = requests.get(f"{BASE_URL}/inspector/assigned-employers", headers=insp_headers)
assert work_res.status_code == 200, f"Inspector workspace access failed: {work_res.text}"
print("Inspector Workspace API Status: 200 OK")

print("\n=======================================================")
print(" ALL GMAIL LOGIN & SUPERVISOR APPROVAL TESTS PASSED 100%!")
print("=======================================================")
