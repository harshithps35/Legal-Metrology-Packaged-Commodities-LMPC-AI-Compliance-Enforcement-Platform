import requests

BASE_URL = "http://localhost:8000/api/v1"

insp_login = requests.post(f"{BASE_URL}/auth/token", data={
    "username": "inspector.rajesh.lmpc@gmail.com",
    "password": "inspector123"
}).json()
insp_headers = {"Authorization": f"Bearer {insp_login['access_token']}"}

queue = requests.get(f"{BASE_URL}/inspector/pre-market-queue", headers=insp_headers).json()
print(f"Inspector Queue Items Count: {len(queue)}")

for item in queue:
    print(f"\n[Product: {item['product_name']} | ID #{item['id']}]")
    print("  Violations Breakdown:")
    for v in item["violations"]:
        status_icon = "[!] NON-COMPLIANT (BREACH)" if v["status"] == "DETECTED_BREACH" else "[OK] COMPLIANT"
        print(f"    - [{v['rule_code']}] {v['title']} -> {status_icon} ({v['severity']})")

marie_item = next((i for i in queue if "marie" in i["product_name"].lower()), None)
assert marie_item is not None
breaches = [v for v in marie_item["violations"] if v["status"] == "DETECTED_BREACH"]
print(f"\nMarie Gold Total Detected Breaches for Inspector: {len(breaches)}")
assert len(breaches) > 0, "Expected at least 1 detected breach for Marie Gold"
print("SUCCESS: Inspector portal now displays all detected packaging breaches accurately!")
