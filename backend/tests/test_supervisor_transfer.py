import requests

# 1. Login as Supervisor
sup_login = requests.post('http://localhost:8000/api/v1/auth/token', data={'username': 'SUP-HQ-001', 'password': 'supervisor123'}).json()
sup_token = sup_login['access_token']
sup_headers = {'Authorization': f'Bearer {sup_token}'}

# 2. Get list of inspectors
inspectors = requests.get('http://localhost:8000/api/v1/supervisor/inspectors', headers=sup_headers).json()
print('Available Inspectors Count:', len(inspectors))
target_inspector = inspectors[-1]
t_name = target_inspector['full_name']
t_id = target_inspector['id']
print('Selected Target Inspector:', t_name, 'ID:', t_id, 'Zone:', target_inspector['jurisdiction_zone'])

# 3. Create a fresh Pre-Market Application
emp_login = requests.post('http://localhost:8000/api/v1/auth/token', data={'username': 'EMP-PARLE-101', 'password': 'employer123'}).json()
emp_token = emp_login['access_token']
emp_headers = {'Authorization': f'Bearer {emp_token}'}

new_app = requests.post('http://localhost:8000/api/v1/employer/pre-market/submit', headers=emp_headers, json={
    'product_name': 'Hide & Seek Milano Choco 120g',
    'brand': 'Parle',
    'category': 'food',
    'packaging_type': 'Carton Box',
    'declared_mrp': 60.0,
    'declared_net_quantity': '120 g',
    'artwork_file_path': '/uploads/milano_choco.png'
}).json()
app_id = new_app['id']
print('Created Application ID:', app_id, 'Initial Officer:', new_app.get('assigned_inspector'))

# 4. Supervisor Transfers / Reassigns to Target Inspector
transfer_res = requests.post(f'http://localhost:8000/api/v1/supervisor/pre-market/{app_id}/assign', headers=sup_headers, json={
    'inspector_id': t_id,
    'notes': f'Transferred to {t_name} for specialized zone verification.'
})
print('Transfer Status Code:', transfer_res.status_code)
transfer_data = transfer_res.json()
print('Transferred App Response:', transfer_data['message'])
print('Assigned Inspector Name:', transfer_data['assigned_inspector_name'])

# 5. Check queue as the target inspector
target_insp_login = requests.post('http://localhost:8000/api/v1/auth/token', data={'username': target_inspector['username'], 'password': 'inspector123'}).json()
t_token = target_insp_login['access_token']
target_insp_headers = {'Authorization': f'Bearer {t_token}'}
target_queue = requests.get('http://localhost:8000/api/v1/inspector/pre-market-queue', headers=target_insp_headers).json()
found_in_target_queue = any(a['id'] == app_id for a in target_queue)
print('SUCCESS! Transferred Application appears in Target Inspector queue:', found_in_target_queue)
