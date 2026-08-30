"""
Test Script: Officer Warrants & Statutory Hierarchy
1. Login as State Commissioner (COMM-HQ-001)
2. Login as CLMO (CLMO-NZ-001)
3. Fetch CLMOs and ALMOs
4. Commissioner files Statutory Warrant against CLMO
5. CLMO files Supervisory Warrant against ALMO
6. Verify Warrants List
7. Resolve Warrant
"""

import sys
import httpx

BASE_URL = "http://127.0.0.1:8000/api/v1"


def login(client, identifier, password):
    resp = client.post("/auth/token", data={"username": identifier, "password": password})
    if resp.status_code != 200:
        print(f"[ERROR] Login failed for {identifier}: {resp.status_code} - {resp.text}")
        sys.exit(1)
    data = resp.json()
    return data["access_token"], data["user"]


def run_warrant_tests():
    print("=" * 80)
    print("  TESTING STATUTORY OFFICER WARRANTS HIERARCHY")
    print("=" * 80)

    client = httpx.Client(base_url=BASE_URL, timeout=30.0)

    # 1. Login as State Commissioner (Level 1 Apex)
    comm_token, comm_user = login(client, "COMM-HQ-001", "commissioner123")
    comm_headers = {"Authorization": f"Bearer {comm_token}"}
    print(f"[OK] Logged in as Commissioner: {comm_user['full_name']} ({comm_user['unique_login_id']})")

    # 2. Login as CLMO (Level 2B)
    clmo_token, clmo_user = login(client, "CLMO-NZ-001", "supervisor123")
    clmo_headers = {"Authorization": f"Bearer {clmo_token}"}
    print(f"[OK] Logged in as CLMO: {clmo_user['full_name']} ({clmo_user['unique_login_id']})")

    # 3. Fetch CLMOs and ALMOs
    clmos_res = client.get("/supervisor/clmos", headers=comm_headers)
    assert clmos_res.status_code == 200, f"Failed to get CLMOs: {clmos_res.text}"
    clmo_list = clmos_res.json()
    assert len(clmo_list) > 0, "No CLMOs found"
    target_clmo = clmo_list[0]
    print(f"[OK] Found Target CLMO: {target_clmo['full_name']} (ID: {target_clmo['id']}, UID: {target_clmo['unique_login_id']})")

    almos_res = client.get("/supervisor/almos", headers=clmo_headers)
    assert almos_res.status_code == 200, f"Failed to get ALMOs: {almos_res.text}"
    almo_list = almos_res.json()
    assert len(almo_list) > 0, "No ALMOs found"
    target_almo = almo_list[0]
    print(f"[OK] Found Target ALMO: {target_almo['full_name']} (ID: {target_almo['id']}, UID: {target_almo['unique_login_id']})")

    # 4. State Commissioner files Statutory Warrant against CLMO
    comm_warrant_payload = {
        "target_officer_id": target_clmo["id"],
        "warrant_type": "SHOW_CAUSE_WARRANT",
        "charges_summary": "Inquiry into turnaround on FMCG pre-market packaging clearance adjudications.",
        "statutory_grounds": "Section 13 & 48 Legal Metrology Act 2009 — Commissioner apex supervisory authority.",
        "action_mandated": "Submit written justification within 7 business days.",
        "hearing_deadline_days": 7,
    }
    w1_res = client.post("/supervisor/warrants/issue", json=comm_warrant_payload, headers=comm_headers)
    assert w1_res.status_code == 201, f"Commissioner warrant failed: {w1_res.text}"
    w1_data = w1_res.json()
    print(f"[PASS] Commissioner served warrant: {w1_data['warrant_number']} -> {w1_data['target_officer_name']}")

    # 5. CLMO files Supervisory Warrant against ALMO
    clmo_warrant_payload = {
        "target_officer_id": target_almo["id"],
        "warrant_type": "STATUTORY_INQUIRY",
        "charges_summary": "Supervisory review of pending field visit sanctions in Noida NCR zone.",
        "statutory_grounds": "Section 48 & 52 Legal Metrology Act 2009 — CLMO supervisory mandate over Level 2A officers.",
        "action_mandated": "Provide compliance register logs within 5 days.",
        "hearing_deadline_days": 5,
    }
    w2_res = client.post("/supervisor/warrants/issue", json=clmo_warrant_payload, headers=clmo_headers)
    assert w2_res.status_code == 201, f"CLMO warrant failed: {w2_res.text}"
    w2_data = w2_res.json()
    print(f"[PASS] CLMO served supervisory warrant: {w2_data['warrant_number']} -> {w2_data['target_officer_name']}")

    # 5B. ALMO files Statutory Warrant against subordinate Lead Inspector
    almo_login = client.post(
        "/auth/token",
        data={"username": "almo.noida.lmpc@gmail.com", "password": "supervisor123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert almo_login.status_code == 200
    almo_headers = {"Authorization": f"Bearer {almo_login.json()['access_token']}"}

    subordinates_res = client.get("/supervisor/almo/subordinate-inspectors", headers=almo_headers)
    assert subordinates_res.status_code == 200
    subordinates = subordinates_res.json()
    target_insp = next((o for o in subordinates if o["role"] == "inspector"), subordinates[0])

    almo_warrant_payload = {
        "target_officer_id": target_insp["id"],
        "warrant_type": "SHOW_CAUSE_WARRANT",
        "charges_summary": "Inquiry into delayed optical pre-market triage for confectionary packaging.",
        "statutory_grounds": "Section 15, 48 & 52 Legal Metrology Act 2009 — ALMO supervisory power over field inspectors.",
        "action_mandated": "Submit explanation within 5 business days.",
        "hearing_deadline_days": 5,
    }
    w3_res = client.post("/supervisor/warrants/issue", json=almo_warrant_payload, headers=almo_headers)
    assert w3_res.status_code == 201, f"ALMO warrant failed: {w3_res.text}"
    w3_data = w3_res.json()
    assert "WRT-ALMO" in w3_data["warrant_number"]
    print(f"[PASS] ALMO served statutory warrant: {w3_data['warrant_number']} -> {w3_data['target_officer_name']}")

    # Export ALMO-issued warrant PDF
    almo_pdf_res = client.get(f"/supervisor/warrants/{w3_data['warrant_id']}/pdf", headers=almo_headers)
    assert almo_pdf_res.status_code == 200
    assert len(almo_pdf_res.content) > 1000
    print(f"[PASS] Exported ALMO-issued Statutory Warrant PDF ({len(almo_pdf_res.content)} bytes).")

    # 6. Verify Warrants List
    list_res = client.get("/supervisor/warrants", headers=comm_headers)
    assert list_res.status_code == 200
    warrants = list_res.json()
    print(f"[PASS] Retrieved {len(warrants)} warrants from directory.")

    # 7. Resolve Warrant
    w1_id = w1_data["warrant_id"]
    resolve_res = client.post(
        f"/supervisor/warrants/{w1_id}/resolve",
        json={"resolution_action": "RESOLVE_DISMISSED", "resolution_notes": "Officer explanation reviewed and accepted by State Commissioner."},
        headers=comm_headers,
    )
    assert resolve_res.status_code == 200
    print(f"[PASS] Resolved Warrant {w1_id}: Status updated to {resolve_res.json()['status']}")

    # 8. Test Statutory Warrant PDF Export
    pdf_res = client.get(f"/supervisor/warrants/{w1_id}/pdf", headers=comm_headers)
    assert pdf_res.status_code == 200, f"PDF export failed: {pdf_res.status_code}"
    assert "application/pdf" in pdf_res.headers.get("content-type", "")
    assert len(pdf_res.content) > 1000, "PDF content is too small"
    print(f"[PASS] Successfully exported Official Statutory Warrant PDF ({len(pdf_res.content)} bytes).")

    print("\n" + "=" * 80)
    print("  ALL STATUTORY WARRANT HIERARCHY & PDF EXPORT TESTS COMPLETED WITH 100% SUCCESS!")
    print("=" * 80)


if __name__ == "__main__":
    run_warrant_tests()
