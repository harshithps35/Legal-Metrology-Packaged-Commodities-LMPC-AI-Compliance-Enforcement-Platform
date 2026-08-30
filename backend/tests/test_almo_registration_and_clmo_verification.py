"""
Automated Test Suite for ALMO Statutory Registration & CLMO Verification Workflow.
1. Candidate submits ALMO registration (Pending CLMO approval).
2. Unapproved ALMO is rejected at login with HTTP 403.
3. CLMO logs in, verifies the ALMO credentials, and approves their commissioning.
4. Newly commissioned ALMO logs in successfully with official credentials!
"""

import sys
import random
from fastapi.testclient import TestClient

sys.path.insert(0, ".")
from app.main import app

client = TestClient(app, base_url="http://127.0.0.1:8000/api/v1")


def test_almo_registration_clmo_verification_flow():
    print("\n" + "=" * 80)
    print("  TESTING ALMO REGISTRATION & CLMO VERIFICATION HIERARCHY")
    print("=" * 80)

    # 1. Send OTPs for ALMO Candidate
    rnd = random.randint(1000, 9999)
    test_email = f"almo.candidate.{rnd}@lmpc.gov.in"
    test_phone = f"98{random.randint(10000000, 99999999)}"

    p_res = client.post("/auth/employer/send-phone-otp", json={"phone_number": test_phone})
    assert p_res.status_code == 200, f"Phone OTP failed: {p_res.text}"
    phone_otp = p_res.json().get("otp_preview", "7492")

    e_res = client.post("/auth/employer/send-email-otp", json={"email": test_email})
    assert e_res.status_code == 200, f"Email OTP failed: {e_res.text}"
    email_otp = e_res.json().get("otp_preview", "5821")

    # 2. Candidate registers as ALMO
    reg_payload = {
        "full_name": f"Candidate Officer {rnd}",
        "email": test_email,
        "phone_number": test_phone,
        "password": "candidatePass123",
        "jurisdiction_zone": "Bengaluru Southern Metrology Office",
        "department": "Regional Legal Metrology Sanctioning Office",
        "assigned_category": "all",
        "phone_otp": phone_otp,
        "email_otp": email_otp,
    }

    reg_res = client.post("/auth/almo/register", json=reg_payload)
    assert reg_res.status_code == 200, f"ALMO register failed: {reg_res.text}"
    reg_data = reg_res.json()
    provisional_id = reg_data["unique_login_id"]
    almo_user_id = reg_data["user"]["id"]
    print(f"[OK] Candidate submitted ALMO Registration: ID -> {provisional_id} (User ID: {almo_user_id})")
    assert reg_data["is_approved"] is False

    # 3. Attempt login before CLMO approval (Must be rejected)
    unapproved_login = client.post(
        "/auth/token",
        data={"username": provisional_id.lower(), "password": "candidatePass123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert unapproved_login.status_code == 403, f"Expected 403, got {unapproved_login.status_code}"
    print(f"[OK] Unapproved ALMO rejected at login as expected (HTTP 403: {unapproved_login.json()['detail']})")

    # 4. CLMO logs in
    clmo_login = client.post(
        "/auth/token",
        data={"username": "clmo.supervisor.lmpc@gmail.com", "password": "supervisor123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert clmo_login.status_code == 200, f"CLMO Login Failed: {clmo_login.text}"
    clmo_token = clmo_login.json()["access_token"]
    clmo_headers = {"Authorization": f"Bearer {clmo_token}"}
    print("[OK] Logged in as Chief Legal Metrology Officer (CLMO-NZ-001).")

    # 5. CLMO approves and commissions the ALMO
    approve_res = client.post(
        f"/supervisor/almos/{almo_user_id}/approve",
        json={"notes": "Credentials, background and zonal jurisdiction verified by CLMO."},
        headers=clmo_headers,
    )
    assert approve_res.status_code == 200, f"CLMO approval failed: {approve_res.text}"
    approved_data = approve_res.json()
    permanent_id = approved_data["unique_login_id"]
    print(f"[SUCCESS] CLMO verified & approved ALMO: Permanent ID -> {permanent_id}")
    assert approved_data["is_approved"] is True

    # 6. Newly approved ALMO logs in successfully
    almo_login = client.post(
        "/auth/token",
        data={"username": permanent_id.lower(), "password": "candidatePass123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert almo_login.status_code == 200, f"Approved ALMO login failed: {almo_login.text}"
    print(f"[SUCCESS] Newly Commissioned ALMO ({permanent_id}) logged in successfully!")

    print("\n" + "=" * 80)
    print("  ALL ALMO REGISTRATION & CLMO VERIFICATION TESTS PASSED 100%!")
    print("=" * 80)


if __name__ == "__main__":
    test_almo_registration_clmo_verification_flow()
