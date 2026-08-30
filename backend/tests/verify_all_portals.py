import requests

BASE = 'http://127.0.0.1:8000/api/v1'

roles = [
    ('State Commissioner', 'commissioner.lmpc@gmail.com', 'commissioner123', '/commissioner/clmos'),
    ('CLMO', 'clmo.supervisor.lmpc@gmail.com', 'supervisor123', '/supervisor/pre-market-queue'),
    ('ALMO', 'almo.noida.lmpc@gmail.com', 'supervisor123', '/supervisor/almo/pending-sanctions'),
    ('Lead Inspector', 'inspector.rajesh.lmpc@gmail.com', 'inspector123', '/inspector/products-pipeline'),
    ('Sub-Inspector & Field Squad', 'sub.inspector.sanjay.lmpc@gmail.com', 'inspector123', '/sub-inspector/assigned-visits'),
    ('Sub-Inspector & Resolution Desk', 'sub.inspector.sanjay.lmpc@gmail.com', 'inspector123', '/sub-inspector/cases'),
    ('Brand Owner', 'parle.compliance.lmpc@gmail.com', 'employer123', '/employer/my-applications'),
]

all_passed = True
for role_name, email, pwd, endpoint in roles:
    login_res = requests.post(f'{BASE}/auth/token', data={'username': email, 'password': pwd})
    if login_res.status_code != 200:
        print(f"FAILED LOGIN: {role_name} -> HTTP {login_res.status_code}")
        all_passed = False
        continue
    token = login_res.json()['access_token']
    ep_res = requests.get(f'{BASE}{endpoint}', headers={'Authorization': f'Bearer {token}'})
    if ep_res.status_code == 200:
        print(f"PASS: [{role_name}] -> HTTP {ep_res.status_code} on {endpoint}")
    else:
        print(f"FAIL: [{role_name}] -> HTTP {ep_res.status_code} on {endpoint}")
        all_passed = False

if all_passed:
    print("\n>>> ALL STATUTORY PORTAL BACKEND ENDPOINTS ARE 100% OPERATIONAL! <<<")
