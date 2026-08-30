import requests

BASE_URL = "http://localhost:8000/api/v1"

# 1. Login as Field Inspector
insp_login = requests.post(f"{BASE_URL}/auth/token", data={
    "username": "inspector.rajesh.lmpc@gmail.com",
    "password": "inspector123"
}).json()
insp_headers = {"Authorization": f"Bearer {insp_login['access_token']}"}
print("1. Field Inspector Login: SUCCESS!")

# 2. Fetch Inspector Pre-Market Queue & Verify Violations Breakdown
queue_res = requests.get(f"{BASE_URL}/inspector/pre-market-queue", headers=insp_headers)
assert queue_res.status_code == 200, f"Queue fetch failed: {queue_res.text}"
queue = queue_res.json()
assert len(queue) > 0, "Expected at least 1 pre-market application in queue"
print(f"2. Fetched {len(queue)} Pre-Market Applications for Inspector Audit:")

for app in queue:
    print(f"\n  [Commodity: {app['product_name']} | Brand: {app['brand']}]")
    print(f"  - Status: {app['status']}")
    print(f"  - Declared MRP: INR {app['declared_mrp']} | Net Qty: {app['declared_net_quantity']}")
    violations = app.get("violations", [])
    print(f"  - Total Optical & Statutory Rule Checks: {len(violations)}")
    assert len(violations) > 0, "Expected violations / rule checks array for application"
    for v in violations:
        print(f"    • [{v['rule_code']}] {v['title']} -> Severity: {v['severity']} | Status: {v['status']}")

# 3. Test Inspector Decision: Escalate Severe Violations to Supervisor
target_app = queue[0]
esc_res = requests.post(f"{BASE_URL}/inspector/pre-market/{target_app['id']}/verify", headers=insp_headers, json={
    "decision": "ESCALATE_SANCTION",
    "inspector_notes": "Optical measurement confirms Rule 11(2)(c) price sticker overprint and Schedule II font height deficiency.",
    "managed_violations": target_app["violations"]
})
assert esc_res.status_code == 200, f"Escalation failed: {esc_res.text}"
esc_data = esc_res.json()
print("\n3. Inspector Escalated Violations to Supervisor:")
print("   - Product:", esc_data["product_name"])
print("   - Status:", esc_data["status"])
print("   - Escalation Notes:", esc_data["supervisor_notes"])
assert esc_data["status"] == "pending_supervisor"

# 4. Supervisor Logs In and Sees Escalated Pre-Market Item
sup_login = requests.post(f"{BASE_URL}/auth/token", data={
    "username": "director.supervisor.lmpc@gmail.com",
    "password": "supervisor123"
}).json()
sup_headers = {"Authorization": f"Bearer {sup_login['access_token']}"}

sup_queue_res = requests.get(f"{BASE_URL}/supervisor/pre-market-queue", headers=sup_headers)
assert sup_queue_res.status_code == 200
sup_queue = sup_queue_res.json()
found_item = next((item for item in sup_queue if item["id"] == target_app["id"]), None)
assert found_item is not None, "Escalated item not found in Supervisor queue"
print("\n4. Supervisor Review Confirmed:")
print("   - Supervisor sees escalated product:", found_item["product_name"])
print("   - Inspector Assigned Notes:", found_item.get("supervisor_notes"))

print("\n=========================================================================")
print(" ALL INSPECTOR VIOLATION AUDIT & SUPERVISOR ESCALATION TESTS PASSED 100%!")
print("=========================================================================")
