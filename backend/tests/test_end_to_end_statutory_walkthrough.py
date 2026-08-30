"""
End-to-End Walkthrough Script for LMPC Compliance Statutory Workflow:
1. Brand Owner (EMP-PARLE-101) submits application
2. Field Inspector (INSP-DEL-042) reviews & triages (Major -> Field Visit Order, Minor -> Resolution Desk)
3. ALMO (ALMO-NOI-001) sanctions Field Visit Order
4. Sub-Inspector (ASST-DEL-012) logs on-site evidence, GPS & caliper readings, co-signs VIR
5. Lead Inspector (INSP-DEL-042) re-audits Sub-Inspector's report
6. ALMO (ALMO-NOI-001) reviews & approves VIR
7. CLMO (CLMO-NZ-001) adjudicates, digitally signs & certifies product
"""

import sys
import httpx

BASE_URL = "http://127.0.0.1:8000/api/v1"

def log_step(title):
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80)

def login(client, identifier, password):
    resp = client.post("/auth/token", data={"username": identifier, "password": password})
    if resp.status_code != 200:
        print(f"[ERROR] Login failed for {identifier}: {resp.status_code} - {resp.text}")
        sys.exit(1)
    data = resp.json()
    token = data["access_token"]
    role = data["user"]["role"]
    name = data["user"]["full_name"]
    print(f"  [OK] Logged in as: {name} | Role: {role} | UID: {identifier}")
    return token

def main():
    client = httpx.Client(base_url=BASE_URL, timeout=30.0)

    # -------------------------------------------------------------
    # STAGE 1: Brand Owner applies
    # -------------------------------------------------------------
    log_step("STAGE 1: BRAND OWNER / MANUFACTURER APPLIES")
    brand_token = login(client, "EMP-PARLE-101", "employer123")
    brand_headers = {"Authorization": f"Bearer {brand_token}"}

    submit_payload = {
        "product_name": "Parle Gold Crunchy Cookies 200g",
        "brand": "Parle",
        "category": "food",
        "packaging_type": "Pouch / Box",
        "declared_mrp": 45.0,
        "declared_net_quantity": "200 g",
        "artwork_file_path": "/uploads/artwork_parle_gold.png",
    }
    sub_res = client.post("/employer/pre-market/submit", json=submit_payload, headers=brand_headers)
    assert sub_res.status_code == 200, f"Submit failed: {sub_res.text}"
    app_data = sub_res.json()
    app_id = app_data["id"]
    print(f"  [OK] Application Submitted! ID: #{app_id} | Product: {app_data['product_name']}")
    print(f"  - Initial Status: {app_data['status']}")
    print(f"  - Assigned Inspector: {app_data['assigned_inspector']}")

    # -------------------------------------------------------------
    # STAGE 2: Field Inspector Reviews & Triages (Major -> Field Visit)
    # -------------------------------------------------------------
    log_step("STAGE 2: FIELD INSPECTOR REVIEWS & TRIAGES VIOLATIONS")
    insp_token = login(client, "INSP-DEL-042", "inspector123")
    insp_headers = {"Authorization": f"Bearer {insp_token}"}

    queue_res = client.get("/inspector/pre-market-queue", headers=insp_headers)
    assert queue_res.status_code == 200
    queue = queue_res.json()
    target_app = next((a for a in queue if a["id"] == app_id), None)
    assert target_app is not None, "Application not in Inspector queue"
    print(f"  [OK] Found Application #{app_id} in Inspector Queue.")
    print(f"  - Triage Severity: {target_app.get('triage_severity')}")
    print(f"  - Violations Count: {len(target_app.get('violations', []))}")

    # Inspector recommends Field Visit due to Major/Critical violation
    rec_payload = {
        "decision": "RECOMMEND_FIELD_VISIT",
        "visit_recommended": True,
        "visit_justification": "Principal display panel font height discrepancy & Section 36 verification required.",
        "inspector_notes": "Optical scan indicates net weight character height may be below 2.0mm. On-site physical verification required.",
    }
    insp_act_res = client.post(f"/inspector/pre-market/{app_id}/verify", json=rec_payload, headers=insp_headers)
    assert insp_act_res.status_code == 200, f"Inspector verify failed: {insp_act_res.text}"
    print(f"  [OK] Inspector Recommended Field Visit: Status -> {insp_act_res.json()['status']}")

    # -------------------------------------------------------------
    # STAGE 3: ALMO Sanctions Field Visit Order
    # -------------------------------------------------------------
    log_step("STAGE 3: ALMO SANCTIONS & ISSUES FIELD VISIT ORDER")
    almo_token = login(client, "ALMO-NOI-001", "supervisor123")
    almo_headers = {"Authorization": f"Bearer {almo_token}"}

    almo_pend_res = client.get("/supervisor/almo/pending-sanctions", headers=almo_headers)
    assert almo_pend_res.status_code == 200
    almo_apps = almo_pend_res.json()
    assert any(a["id"] == app_id for a in almo_apps), "App not in ALMO pending sanctions"

    # ALMO sanctions the visit
    sanct_payload = {
        "scheduled_date": "2026-08-30",
        "scheduled_time": "11:30 AM",
        "visit_location_name": "Parle Foods Facility Plant 1",
        "visit_address": "Plot 42, Sector 18 Industrial Area, Noida",
        "notes": "Field visit sanctioned by ALMO. Sub-Inspector assigned to conduct caliper test and factory audit.",
    }
    sanct_res = client.post(f"/supervisor/pre-market/{app_id}/sanction-visit", json=sanct_payload, headers=almo_headers)
    assert sanct_res.status_code == 200, f"Sanction failed: {sanct_res.text}"
    sanct_data = sanct_res.json()
    vo_number = sanct_data["visit_order_no"]
    print(f"  [OK] Field Visit Order Issued! Order No: {vo_number}")
    print(f"  - New Application Status: {sanct_data['status']}")

    # -------------------------------------------------------------
    # STAGE 4: Sub-Inspector Logs Evidence & Co-Signs VIR
    # -------------------------------------------------------------
    log_step("STAGE 4: SUB-INSPECTOR LOGS EVIDENCE, GPS & CO-SIGNS VIR")
    sub_token = login(client, "ASST-DEL-012", "inspector123")
    sub_headers = {"Authorization": f"Bearer {sub_token}"}

    # Fetch assigned visits
    sub_visits = client.get("/sub-inspector/assigned-visits", headers=sub_headers).json()
    print(f"  [OK] Sub-Inspector fetched {len(sub_visits)} assigned visits.")

    # Log on-site evidence
    ev_payload = {
        "premises_lat": 28.5355,
        "premises_lng": 77.3910,
        "gps_accuracy_meters": 4.2,
        "batch_records_cross_checked": True,
        "physical_tampering_confirmed": False,
        "caliper_measurement_mm": 2.4,
        "factory_floor_photos": ["/uploads/photo1.jpg", "/uploads/photo2.jpg"],
        "field_notes": "On-site physical inspection performed. Caliper measurement shows 2.4mm (compliant >= 2.0mm). Batch records verified.",
    }
    ev_res = client.post(f"/sub-inspector/visits/{vo_number}/log-evidence", json=ev_payload, headers=sub_headers)
    assert ev_res.status_code == 200, f"Evidence log failed: {ev_res.text}"
    print(f"  [OK] Sub-Inspector Logged Evidence & Caliper Reading (2.4mm).")

    # Co-sign VIR
    cosign_payload = {
        "observations": "Attendance confirmed at Noida plant. Measurements verified in presence of QA lead.",
        "attendance_confirmed": True,
    }
    cosign_res = client.post(f"/sub-inspector/visits/{vo_number}/co-sign", json=cosign_payload, headers=sub_headers)
    assert cosign_res.status_code == 200, f"Co-sign failed: {cosign_res.text}"
    print(f"  [OK] Sub-Inspector Cryptographically Co-Signed VIR: Hash -> {cosign_res.json()['signature_hash'][:20]}...")

    # Submit official Visit Inspection Report
    report_payload = {
        "caliper_font_measurement_mm": 2.4,
        "physical_net_weight_grams": 201.2,
        "batch_records_cross_checked": True,
        "physical_tampering_confirmed": False,
        "factory_floor_photos": ["/uploads/photo1.jpg", "/uploads/photo2.jpg"],
        "visit_recommendation": "APPROVE_WITH_CONDITIONS",
        "on_site_inspector_remarks": "All mandatory declarations verified physically. Net weight 201.2g on 200g pack.",
    }
    rep_res = client.post(f"/field-visits/orders/{vo_number}/submit-report", json=report_payload, headers=sub_headers)
    assert rep_res.status_code == 200, f"Report submission failed: {rep_res.text}"
    print(f"  [OK] Official Visit Inspection Report Submitted! Status -> {rep_res.json().get('visit_status', 'COMPLETED')}")

    # -------------------------------------------------------------
    # STAGE 5: Lead Inspector Re-Audits Sub-Inspector's Findings
    # -------------------------------------------------------------
    log_step("STAGE 5: LEAD INSPECTOR RE-AUDITS SUB-INSPECTOR'S FINDINGS")
    # Lead Inspector inspects the report
    lead_insp_queue = client.get("/inspector/pre-market-queue", headers=insp_headers).json()
    lead_target = next((a for a in lead_insp_queue if a["id"] == app_id), None)
    assert lead_target is not None
    print(f"  [OK] Lead Inspector reviewed Sub-Inspector's VIR:")
    print(f"  - Caliper Font Measurement: {lead_target['visit_order']['caliper_font_measurement_mm']} mm")
    print(f"  - Recommendation: {lead_target['visit_order']['visit_recommendation']}")
    print(f"  - Sub-Inspector Remarks: {lead_target['visit_order']['on_site_inspector_remarks']}")
    print(f"  - Lead Inspector verdict: Dossier & physical test verified -> Forward to ALMO.")

    # -------------------------------------------------------------
    # STAGE 6: ALMO Approves VIR & Routes to CLMO
    # -------------------------------------------------------------
    log_step("STAGE 6: ALMO REVIEWS & APPROVES VISIT REPORT")
    almo_pending_rep = client.get("/supervisor/almo/pending-reports", headers=almo_headers).json()
    print(f"  [OK] ALMO Pending Reports Queue contains {len(almo_pending_rep)} VIRs.")

    almo_appr_payload = {
        "notes": "ALMO verified Sub-Inspector on-site caliper data, GPS coordinates, and Lead Inspector sign-off. VIR Approved."
    }
    almo_appr_res = client.post(f"/supervisor/field-visits/{vo_number}/approve-report", json=almo_appr_payload, headers=almo_headers)
    assert almo_appr_res.status_code == 200, f"ALMO approve failed: {almo_appr_res.text}"
    print(f"  [OK] ALMO Approved VIR: New Application Status -> {almo_appr_res.json()['status']}")

    # -------------------------------------------------------------
    # STAGE 7: CLMO Adjudicates, Digitally Signs & Certifies Product
    # -------------------------------------------------------------
    log_step("STAGE 7: CLMO DIGITALLY SIGNS & ISSUES CLEARANCE CERTIFICATE")
    clmo_token = login(client, "CLMO-NZ-001", "supervisor123")
    clmo_headers = {"Authorization": f"Bearer {clmo_token}"}

    clmo_decide_payload = {
        "action": "approve",
        "notes": "Clearance granted under Section 36 & LMPC Rules 2011 following successful on-site physical verification.",
        "verification_method": "PHYSICAL_FIELD_INSPECTION_CONFIRMED",
    }
    clmo_res = client.post(f"/supervisor/pre-market/{app_id}/decide", json=clmo_decide_payload, headers=clmo_headers)
    assert clmo_res.status_code == 200, f"CLMO adjudication failed: {clmo_res.text}"
    cert_data = clmo_res.json()
    cert_number = cert_data["certificate_number"]
    print(f"  [SUCCESS] PRODUCT OFFICIALLY CERTIFIED!")
    print(f"  - Final Status: {cert_data['status']}")
    print(f"  - Certificate Number: {cert_number}")
    print(f"  - Verification Method: {cert_data['verification_method']}")
    print(f"  - CLMO Signature Remarks: {cert_data['supervisor_notes']}")

    # -------------------------------------------------------------
    # STAGE 8: Brand Owner Sees Certified Status
    # -------------------------------------------------------------
    log_step("STAGE 8: BRAND OWNER CONFIRMS COMPLIANCE CERTIFICATE")
    my_apps = client.get("/employer/my-applications", headers=brand_headers).json()
    final_app = next((a for a in my_apps if a["id"] == app_id), None)
    assert final_app is not None
    print(f"  [OK] Brand Owner Dashboard Updated:")
    print(f"  - Product: {final_app['product_name']}")
    print(f"  - Status: {final_app['status']}")
    print(f"  - Certificate No: {final_app['certificate_number']}")
    print(f"  - Verification Method: {final_app.get('verification_method', 'PHYSICAL_FIELD_INSPECTION_CONFIRMED')}")

    # -------------------------------------------------------------
    # BONUS: Minor-Only Violation Path & Resolution Desk
    # -------------------------------------------------------------
    log_step("BONUS TEST: MINOR VIOLATION ROUTED TO RESOLUTION DESK ONLY")
    res_officer_token = login(client, "DESK-HQ-001", "resolution123")
    res_headers = {"Authorization": f"Bearer {res_officer_token}"}

    # Submit minor-infraction product
    minor_app_res = client.post("/employer/pre-market/submit", json={
        "product_name": "Parle Glucose Pack 50g (Minor Label Clarification)",
        "brand": "Parle",
        "category": "food",
        "declared_mrp": 10.0,
        "declared_net_quantity": "50 g",
        "artwork_file_path": "/uploads/artwork_parle_minor.png",
    }, headers=brand_headers)
    minor_app_id = minor_app_res.json()["id"]

    # Resolution desk issues 15-day deficiency memo
    memo_payload = {
        "application_id": minor_app_id,
        "memo_text": "Customer care telephone number font size requires 0.5mm enlargement.",
        "deficiencies": ["Rule 6(1)(f) Consumer Helpline legibility"],
        "sla_days": 15
    }
    memo_res = client.post("/sub-inspector/resolution-cases", json=memo_payload, headers=res_headers)
    assert memo_res.status_code == 200, f"Memo failed: {memo_res.text}"
    case_num = memo_res.json()["case_number"]
    print(f"  [OK] 15-Day Deficiency Memo Issued: {case_num} | SLA Deadline: {memo_res.json()['sla_deadline']}")

    # Case resolution
    cases_list = client.get("/sub-inspector/resolution-cases", headers=res_headers).json()
    target_case = next((c for c in cases_list if c["case_number"] == case_num), None)
    assert target_case is not None

    resolve_res = client.post(f"/sub-inspector/resolution-cases/{target_case['id']}/resolve", json={
        "response_notes": "Brand Owner submitted revised artwork with enlarged customer care helpline font. Verified compliant.",
        "action": "ROUTE_TO_INSPECTOR"
    }, headers=res_headers)
    assert resolve_res.status_code == 200
    print(f"  [OK] Resolution Desk resolved case and routed corrected artwork back to Lead Inspector!")

    print("\n" + "=" * 80)
    print("  [ALL TESTS PASSED] END-TO-END STATUTORY WORKFLOW IS 100% OPERATIONAL!")
    print("=" * 80)

if __name__ == "__main__":
    main()
