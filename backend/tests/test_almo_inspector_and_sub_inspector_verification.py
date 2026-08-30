"""
Automated Test for ALMO Verification & Commissioning of Registering Inspectors & Sub-Inspectors.
"""

import sys
import random
from fastapi.testclient import TestClient

sys.path.insert(0, ".")
from app.main import app

client = TestClient(app, base_url="http://127.0.0.1:8000/api/v1")


def test_almo_inspector_and_sub_inspector_verification_flow():
    print("\n" + "=" * 80)
    print("  TESTING ALMO VERIFICATION & COMMISSIONING OF INSPECTORS & SUB-INSPECTORS")
    print("=" * 80)

    # 1. Register Candidate 1 as Lead Inspector (L4)
    rnd1 = random.randint(1000, 9999)
    insp_email = f"lead.insp.{rnd1}@lmpc.gov.in"
    insp_phone = f"98{random.randint(10000000, 99999999)}"

    client.post("/auth/employer/send-phone-otp", json={"phone_number": insp_phone})
    client.post("/auth/employer/send-email-otp", json={"email": insp_email})

    p_res1 = client.post("/auth/employer/send-phone-otp", json={"phone_number": insp_phone})
    phone_otp1 = p_res1.json().get("otp_preview", "123456")
    e_res1 = client.post("/auth/employer/send-email-otp", json={"email": insp_email})
    email_otp1 = e_res1.json().get("otp_preview", "123456")

    insp_payload = {
        "full_name": f"Lead Inspector Candidate {rnd1}",
        "email": insp_email,
        "phone_number": insp_phone,
        "password": "inspPass123",
        "department": "Lead Legal Metrology Enforcement Directorate",
        "jurisdiction_zone": "North Zone (Noida / Delhi NCR)",
        "assigned_category": "all",
        "phone_otp": phone_otp1,
        "email_otp": email_otp1,
    }
    insp_reg = client.post("/auth/inspector/register", json=insp_payload)
    assert insp_reg.status_code == 200, f"Inspector registration failed: {insp_reg.text}"
    insp_data = insp_reg.json()
    insp_uid = insp_data["unique_login_id"]
    insp_id = insp_data["user"]["id"]
    print(f"[OK] Candidate 1 registered as Lead Inspector (L4): {insp_uid} (User ID: {insp_id}, is_approved: {insp_data['is_approved']})")

    # 2. Register Candidate 2 as Sub-Inspector (L5)
    rnd2 = random.randint(1000, 9999)
    sub_email = f"sub.insp.{rnd2}@lmpc.gov.in"
    sub_phone = f"97{random.randint(10000000, 99999999)}"

    p_res2 = client.post("/auth/employer/send-phone-otp", json={"phone_number": sub_phone})
    phone_otp2 = p_res2.json().get("otp_preview", "123456")
    e_res2 = client.post("/auth/employer/send-email-otp", json={"email": sub_email})
    email_otp2 = e_res2.json().get("otp_preview", "123456")

    sub_payload = {
        "full_name": f"Sub-Inspector Candidate {rnd2}",
        "email": sub_email,
        "phone_number": sub_phone,
        "password": "subPass123",
        "department": "Field Inspection Squad & On-site Verification",
        "jurisdiction_zone": "North Zone (Noida / Delhi NCR)",
        "assigned_category": "all",
        "phone_otp": phone_otp2,
        "email_otp": email_otp2,
    }
    sub_reg = client.post("/auth/sub-inspector/register", json=sub_payload)
    assert sub_reg.status_code == 200, f"Sub-Inspector registration failed: {sub_reg.text}"
    sub_data = sub_reg.json()
    sub_uid = sub_data["unique_login_id"]
    sub_id = sub_data["user"]["id"]
    print(f"[OK] Candidate 2 registered as Sub-Inspector (L5): {sub_uid} (User ID: {sub_id}, is_approved: {sub_data['is_approved']})")

    # 3. Verify candidates cannot log in before ALMO approval
    unapproved_login1 = client.post(
        "/auth/token",
        data={"username": insp_uid.lower(), "password": "inspPass123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert unapproved_login1.status_code == 403
    print(f"[OK] Unapproved Lead Inspector rejected at login as expected (HTTP 403).")

    unapproved_login2 = client.post(
        "/auth/token",
        data={"username": sub_uid.lower(), "password": "subPass123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert unapproved_login2.status_code == 403
    print(f"[OK] Unapproved Sub-Inspector rejected at login as expected (HTTP 403).")

    # 4. ALMO logs in
    almo_login = client.post(
        "/auth/token",
        data={"username": "almo.noida.lmpc@gmail.com", "password": "supervisor123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert almo_login.status_code == 200
    almo_token = almo_login.json()["access_token"]
    almo_headers = {"Authorization": f"Bearer {almo_token}"}
    print("[OK] Logged in as ALMO: Shri Suresh Raina (ALMO-NOI-001)")

    # 5. ALMO views pending verification queue
    pending_res = client.get("/supervisor/almo/pending-inspectors", headers=almo_headers)
    assert pending_res.status_code == 200
    pending_list = pending_res.json()
    pending_ids = [p["id"] for p in pending_list]
    assert insp_id in pending_ids
    assert sub_id in pending_ids
    print(f"[PASS] ALMO retrieved pending verification queue: {len(pending_list)} applications waiting.")

    # 6. ALMO verifies & commissions Candidate 1 (Lead Inspector)
    app1_res = client.post(
        f"/supervisor/inspectors/{insp_id}/approve",
        json={"jurisdiction_zone": "North Zone (Noida / Delhi NCR)"},
        headers=almo_headers,
    )
    assert app1_res.status_code == 200
    perm_insp_id = app1_res.json()["unique_login_id"]
    print(f"[PASS] ALMO approved Lead Inspector: Permanent ID -> {perm_insp_id}")

    # 7. ALMO verifies & commissions Candidate 2 (Sub-Inspector)
    app2_res = client.post(
        f"/supervisor/inspectors/{sub_id}/approve",
        json={"jurisdiction_zone": "North Zone (Noida / Delhi NCR)"},
        headers=almo_headers,
    )
    assert app2_res.status_code == 200
    perm_sub_id = app2_res.json()["unique_login_id"]
    print(f"[PASS] ALMO approved Sub-Inspector: Permanent ID -> {perm_sub_id}")

    # 8. Both newly approved officers log in successfully
    insp_login = client.post(
        "/auth/token",
        data={"username": perm_insp_id.lower(), "password": "inspPass123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert insp_login.status_code == 200, f"Commissioned Inspector login failed: {insp_login.text}"
    print(f"[SUCCESS] Commissioned Lead Inspector ({perm_insp_id}) logged in successfully!")

    sub_login = client.post(
        "/auth/token",
        data={"username": perm_sub_id.lower(), "password": "subPass123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert sub_login.status_code == 200, f"Commissioned Sub-Inspector login failed: {sub_login.text}"
    print(f"[SUCCESS] Commissioned Sub-Inspector ({perm_sub_id}) logged in successfully!")

    print("\n" + "=" * 80)
    print("  ALL ALMO INSPECTOR & SUB-INSPECTOR VERIFICATION TESTS PASSED 100%!")
    print("=" * 80)


if __name__ == "__main__":
    test_almo_inspector_and_sub_inspector_verification_flow()
