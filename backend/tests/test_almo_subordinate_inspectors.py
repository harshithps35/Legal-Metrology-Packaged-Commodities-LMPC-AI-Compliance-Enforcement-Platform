"""
Automated Test for ALMO Subordinate Inspectors & Field Squads Directory.
"""

import sys
from fastapi.testclient import TestClient

sys.path.insert(0, ".")
from app.main import app

client = TestClient(app, base_url="http://127.0.0.1:8000/api/v1")


def test_almo_subordinate_inspectors_roster():
    print("\n" + "=" * 80)
    print("  TESTING ALMO SUBORDINATE INSPECTORS DIRECTORY")
    print("=" * 80)

    # 1. ALMO Logs In
    almo_login = client.post(
        "/auth/token",
        data={"username": "almo.noida.lmpc@gmail.com", "password": "supervisor123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert almo_login.status_code == 200, f"ALMO Login Failed: {almo_login.text}"
    almo_token = almo_login.json()["access_token"]
    almo_headers = {"Authorization": f"Bearer {almo_token}"}
    print("[OK] Logged in as ALMO: Shri Suresh Raina (ALMO-NOI-001)")

    # 2. Fetch Subordinate Inspectors
    res = client.get("/supervisor/almo/subordinate-inspectors", headers=almo_headers)
    assert res.status_code == 200, f"Failed to get subordinate inspectors: {res.text}"
    officers = res.json()
    assert len(officers) > 0, "No subordinate officers returned"
    print(f"[SUCCESS] Retrieved {len(officers)} subordinate field officers under ALMO command.")

    lead_inspectors = [o for o in officers if o["role"] == "inspector"]
    sub_inspectors = [o for o in officers if o["role"] in ["sub_inspector", "resolution_desk"]]

    print(f"  • Lead Inspectors (L4): {len(lead_inspectors)}")
    for lmi in lead_inspectors:
        print(f"    - {lmi['full_name']} ({lmi['unique_login_id']}) | Zone: {lmi['jurisdiction_zone']} | Tag: {lmi['level_tag']}")

    print(f"  • Sub-Inspectors & Field Squads (L5): {len(sub_inspectors)}")
    for si in sub_inspectors:
        print(f"    - {si['full_name']} ({si['unique_login_id']}) | Zone: {si['jurisdiction_zone']} | Assigned Visits: {si['assigned_visits_count']} | Completed VIRs: {si['completed_visits_count']}")

    print("\n" + "=" * 80)
    print("  ALL ALMO SUBORDINATE INSPECTORS TESTS PASSED 100%!")
    print("=" * 80)


if __name__ == "__main__":
    test_almo_subordinate_inspectors_roster()
