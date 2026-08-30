import requests

BASE_URL = "http://localhost:8000/api/v1"

print("--- 1. Login as Brand Owner (Parle / EMP-PARLE-101) ---")
emp_login = requests.post(f"{BASE_URL}/auth/token", data={
    "username": "parle.compliance.lmpc@gmail.com",
    "password": "employer123"
}).json()
emp_headers = {"Authorization": f"Bearer {emp_login['access_token']}"}
print("Brand Owner Login: SUCCESS!")

print("\n--- 2. Fetch Brand Owner Statutory Notices ---")
notices_res = requests.get(f"{BASE_URL}/employer/my-notices", headers=emp_headers)
assert notices_res.status_code == 200, f"Notices fetch failed: {notices_res.text}"
notices = notices_res.json()
assert len(notices) > 0, "Expected at least 1 notice for Parle"
target_notice = notices[0]
print(f"Found Notice: {target_notice['notice_number']} for {target_notice['product_name']}")

print("\n--- 3. Brand Owner Submits Rectification Proof & Reply ---")
reply_res = requests.post(
    f"{BASE_URL}/employer/notices/{target_notice['id']}/reply",
    headers=emp_headers,
    json={
        "reply_text": "Enlarged Schedule II PDP font height to 2.8mm and verified FSSAI 14-digit pattern. Corrective artwork uploaded.",
        "corrective_artwork_url": "/uploads/rectified_marie_gold_v2.png"
    }
)
assert reply_res.status_code == 200, f"Reply failed: {reply_res.text}"
reply_data = reply_res.json()
print("Reply Submitted Successfully:")
print("  - Pre-Market Application ID:", reply_data["application_id"])
print("  - Product Name:", reply_data["product_name"])
print("  - Message:", reply_data["message"])

print("\n--- 4. Field Inspector Login & Queue Check ---")
insp_login = requests.post(f"{BASE_URL}/auth/token", data={
    "username": "inspector.rajesh.lmpc@gmail.com",
    "password": "inspector123"
}).json()
insp_headers = {"Authorization": f"Bearer {insp_login['access_token']}"}

insp_queue_res = requests.get(f"{BASE_URL}/inspector/pre-market-queue", headers=insp_headers)
assert insp_queue_res.status_code == 200
insp_queue = insp_queue_res.json()

# Verify the rectified application is in the inspector queue
rectified_app = next((a for a in insp_queue if a["id"] == reply_data["application_id"]), None)
assert rectified_app is not None, f"Application #{reply_data['application_id']} not found in Inspector queue!"
print(f"SUCCESS! Found Application #{rectified_app['id']} in Inspector Queue:")
print("  - Product:", rectified_app["product_name"])
print("  - Status:", rectified_app["status"])
print("  - Notes:", rectified_app["inspector_notes"])

print("\n--- 5. Field Inspector Verifies & Forwards Rectified Packaging to Supervisor ---")
verify_res = requests.post(
    f"{BASE_URL}/inspector/pre-market/{rectified_app['id']}/verify",
    headers=insp_headers,
    json={
        "decision": "RECOMMEND_APPROVAL",
        "inspector_notes": "Corrective artwork inspected. Font size 2.8mm satisfies Schedule II. Recommended for clearance certificate."
    }
)
assert verify_res.status_code == 200, f"Inspector verify failed: {verify_res.text}"
v_data = verify_res.json()
print("Inspector Verification Result:", v_data["message"])
assert v_data["status"] == "pending_supervisor"

print("\n--- 6. Directorate Supervisor Confirms Receipt ---")
sup_login = requests.post(f"{BASE_URL}/auth/token", data={
    "username": "director.supervisor.lmpc@gmail.com",
    "password": "supervisor123"
}).json()
sup_headers = {"Authorization": f"Bearer {sup_login['access_token']}"}
sup_queue = requests.get(f"{BASE_URL}/supervisor/pre-market-queue", headers=sup_headers).json()
found_in_sup = next((a for a in sup_queue if a["id"] == rectified_app["id"]), None)
assert found_in_sup is not None, "Application not received in Supervisor queue"
print(f"Directorate Supervisor received rectified application #{found_in_sup['id']} ready for digital signature!")

print("\n========================================================================")
print(" ALL BRAND RECTIFICATION & INSPECTOR RECEPTION TESTS PASSED 100%!")
print("========================================================================")
