import requests
import random

BASE_URL = "http://localhost:8000/api/v1"

print("--- 1. Login as Existing Working Supervisor (Dr. Ananya Roy / SUP-HQ-001) ---")
sup_login = requests.post(f"{BASE_URL}/auth/token", data={
    "username": "director.supervisor.lmpc@gmail.com",
    "password": "supervisor123"
})
assert sup_login.status_code == 200, f"Working Supervisor login failed: {sup_login.text}"
sup_token = sup_login.json()["access_token"]
sup_headers = {"Authorization": f"Bearer {sup_token}"}
print("Working Supervisor Login: SUCCESS!")

print("\n--- 2. Working Supervisor Generates & Grants New Supervisor ID ---")
rand_id = random.randint(100, 999)
new_sup_gmail = f"sanjeev.supervisor_{rand_id}.lmpc@gmail.com"
new_sup_name = f"Dr. Sanjeev Khurana {rand_id} (Additional Controller)"
new_sup_phone = f"981100{rand_id}"

comm_res = requests.post(f"{BASE_URL}/supervisor/commission-supervisor", headers=sup_headers, json={
    "full_name": new_sup_name,
    "email": new_sup_gmail,
    "phone_number": new_sup_phone,
    "password": "newsupervisorpass123",
    "department": "Directorate of Legal Metrology HQ",
    "jurisdiction_zone": "National HQ / All Zones",
    "warrant_notes": "Granted executive authority by Joint Controller."
})
assert comm_res.status_code == 200, f"Commissioning failed: {comm_res.text}"
comm_data = comm_res.json()
new_sup_uid = comm_data["unique_login_id"]
print("SUCCESS! New Supervisor Commissioned:")
print("  - Generated Unique ID:", new_sup_uid)
print("  - Officer Name:", comm_data["full_name"])
print("  - Official Gmail:", comm_data["email"])
print("  - Commissioned By:", comm_data["commissioned_by"], f"({comm_data['commissioned_by_id']})")

print("\n--- 3. Verifying Non-Supervisors Cannot Commission Supervisors ---")
# Inspector tries to call commission endpoint
insp_login = requests.post(f"{BASE_URL}/auth/token", data={
    "username": "inspector.rajesh.lmpc@gmail.com",
    "password": "inspector123"
}).json()
insp_headers = {"Authorization": f"Bearer {insp_login['access_token']}"}
unauth_res = requests.post(f"{BASE_URL}/supervisor/commission-supervisor", headers=insp_headers, json={
    "full_name": "Unauthorized Person",
    "email": "unauth@gmail.com",
    "phone_number": "9999999999",
    "password": "password"
})
assert unauth_res.status_code == 403, f"Expected 403 Forbidden for Inspector, got {unauth_res.status_code}"
print("Unauthorized Attempt Blocked as Expected: 403 Forbidden")

print("\n--- 4. Newly Commissioned Supervisor Logs In via Official Gmail ---")
new_sup_login = requests.post(f"{BASE_URL}/auth/token", data={
    "username": new_sup_gmail,
    "password": "newsupervisorpass123"
})
assert new_sup_login.status_code == 200, f"New Supervisor login failed: {new_sup_login.text}"
new_sup_token = new_sup_login.json()["access_token"]
print(f"Login via Gmail ({new_sup_gmail}): SUCCESS!")

# 4B. Also login via generated Unique ID
new_sup_uid_login = requests.post(f"{BASE_URL}/auth/token", data={
    "username": new_sup_uid,
    "password": "newsupervisorpass123"
})
assert new_sup_uid_login.status_code == 200, f"New Supervisor Unique ID login failed: {new_sup_uid_login.text}"
print(f"Login via Unique ID ({new_sup_uid}): SUCCESS!")

print("\n--- 5. Newly Commissioned Supervisor Exercises Directorate Authority ---")
new_headers = {"Authorization": f"Bearer {new_sup_token}"}
council_res = requests.get(f"{BASE_URL}/supervisor/supervisors", headers=new_headers)
assert council_res.status_code == 200, f"Council access failed: {council_res.text}"
council_list = council_res.json()
print("Council Roster Count:", len(council_list))
found = any(s["unique_login_id"] == new_sup_uid for s in council_list)
assert found, "Newly commissioned supervisor not found in council roster"
print(f"Confirmed {new_sup_uid} is listed in Council with full executive authority!")

print("\n=======================================================================")
print(" ALL SUPERVISOR COMMISSIONING & EXECUTIVE GRANT TESTS PASSED 100%!")
print("=======================================================================")
