import requests
import random

BASE_URL = "http://localhost:8000/api/v1"

# 1. Login as Supervisor
sup_login = requests.post(f"{BASE_URL}/auth/token", data={
    "username": "director.supervisor.lmpc@gmail.com",
    "password": "supervisor123"
}).json()
sup_headers = {"Authorization": f"Bearer {sup_login['access_token']}"}
print("1. Supervisor Login: SUCCESS!")

# 2. Test Direct Inspector Commissioning with ID Generation by Supervisor
rand_id = random.randint(100, 999)
insp_gmail_1 = f"ramesh.inspector_{rand_id}.lmpc@gmail.com"
insp_phone_1 = f"987123{rand_id}"

comm_res = requests.post(f"{BASE_URL}/supervisor/commission-inspector", headers=sup_headers, json={
    "full_name": f"Inspector Ramesh Kulkarni {rand_id}",
    "email": insp_gmail_1,
    "phone_number": insp_phone_1,
    "password": "inspectorpassword123",
    "jurisdiction_zone": "West Zone (Mumbai / Pune)",
    "assigned_category": "food"
})
assert comm_res.status_code == 200, f"Direct commissioning failed: {comm_res.text}"
comm_data = comm_res.json()
generated_id_1 = comm_data["unique_login_id"]
print("2. Direct Inspector Commissioned by Supervisor:")
print("   - Generated Statutory Unique ID:", generated_id_1)
print("   - Officer Name:", comm_data["full_name"])
print("   - Commissioned By:", comm_data["commissioned_by"])

# Test direct login for newly commissioned inspector
insp_login_1 = requests.post(f"{BASE_URL}/auth/token", data={
    "username": generated_id_1,
    "password": "inspectorpassword123"
})
assert insp_login_1.status_code == 200, f"Login failed for commissioned inspector: {insp_login_1.text}"
print("   - Inspector Login with Supervisor-Generated Unique ID: SUCCESS (200 OK)!")


# 3. Test Inspector Registration -> Supervisor Generates & Assigns Unique ID on Approval
rand_id_2 = random.randint(1000, 9999)
insp_gmail_2 = f"candidate.officer_{rand_id_2}.lmpc@gmail.com"
insp_phone_2 = f"987123{rand_id_2}"

# 3A. Verify OTPs
p_res = requests.post(f"{BASE_URL}/auth/employer/send-phone-otp", json={"phone_number": insp_phone_2}).json()
p_otp = p_res["otp_preview"]
requests.post(f"{BASE_URL}/auth/employer/verify-phone-otp", json={"phone_number": insp_phone_2, "otp": p_otp})

e_res = requests.post(f"{BASE_URL}/auth/employer/send-email-otp", json={"email": insp_gmail_2}).json()
e_otp = e_res["otp_preview"]
requests.post(f"{BASE_URL}/auth/employer/verify-email-otp", json={"email": insp_gmail_2, "otp": e_otp})

# 3B. Register
reg_res = requests.post(f"{BASE_URL}/auth/inspector/register", json={
    "full_name": f"Officer Manoj Tiwari {rand_id_2}",
    "email": insp_gmail_2,
    "phone_number": insp_phone_2,
    "password": "candidatepass123",
    "jurisdiction_zone": "North Zone (Delhi NCR)",
    "phone_otp": p_otp,
    "email_otp": e_otp
}).json()
candidate_id = reg_res["user"]["id"]
print(f"\n3. Candidate Inspector Registered: ID #{candidate_id} (Awaiting Supervisor ID Grant)")

# 3C. Supervisor Approves and Assigns Specific Official Statutory Unique ID
custom_assigned_id = f"INSP-DEL-{rand_id_2 % 1000:03d}"
approve_res = requests.post(f"{BASE_URL}/supervisor/inspectors/{candidate_id}/approve", headers=sup_headers, json={
    "custom_unique_id": custom_assigned_id,
    "jurisdiction_zone": "North Zone (Delhi NCR)",
    "assigned_category": "cosmetics"
})
assert approve_res.status_code == 200, f"Approval with ID generation failed: {approve_res.text}"
app_data = approve_res.json()
print("   - Supervisor Assigned & Granted Official ID:", app_data["unique_login_id"])
print("   - Commissioning Decision:", app_data["message"])

# 3D. Verify Inspector can log in with Supervisor-Assigned ID
insp_login_2 = requests.post(f"{BASE_URL}/auth/token", data={
    "username": custom_assigned_id,
    "password": "candidatepass123"
})
assert insp_login_2.status_code == 200, f"Login with assigned ID failed: {insp_login_2.text}"
print("   - Officer Login with Supervisor-Assigned ID: SUCCESS (200 OK)!")

print("\n=========================================================================")
print(" ALL INSPECTOR ID GENERATION BY SUPERVISOR TESTS PASSED 100%!")
print("=========================================================================")
