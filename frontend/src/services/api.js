import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// --- Auth ---
export const authAPI = {
  login: (username, password) =>
    api.post('/auth/token', new URLSearchParams({ username, password }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }),
  portalLogin: (portalRole, username, password) =>
    api.post(`/auth/login/${portalRole}`, { username, password }),
  register: (data) => api.post('/auth/register', data),
  getProfile: () => api.get('/auth/me'),
  sendPhoneOTP: (phone_number) =>
    api.post('/auth/employer/send-phone-otp', { phone_number }),
  verifyPhoneOTP: (phone_number, otp) =>
    api.post('/auth/employer/verify-phone-otp', { phone_number, otp }),
  sendEmailOTP: (email) =>
    api.post('/auth/employer/send-email-otp', { email }),
  verifyEmailOTP: (email, otp) =>
    api.post('/auth/employer/verify-email-otp', { email, otp }),
  registerEmployer: (data) =>
    api.post('/auth/employer/register', data),
  registerInspector: (data) =>
    api.post('/auth/inspector/register', data),
  registerSubInspector: (data) =>
    api.post('/auth/sub-inspector/register', data),
  registerCLMO: (data) =>
    api.post('/auth/clmo/register', data),
  registerALMO: (data) =>
    api.post('/auth/almo/register', data),
};

// --- Scans ---
export const scanAPI = {
  create: (formData) =>
    api.post('/scan', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  list: (params) => api.get('/scans', { params }),
  getDetail: (id) => api.get(`/scans/${id}`),
  correctFields: (id, corrections) =>
    api.patch(`/scans/${id}/fields`, corrections),
  delete: (id) => api.delete(`/scans/${id}`),
  uploadArtwork: (formData) =>
    api.post('/employer/upload-artwork', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  uploadMultipleArtwork: (formData) =>
    api.post('/employer/upload-multiple-artwork', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// --- Dashboard ---
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

// --- Supervisor Governance API ---
export const supervisorAPI = {
  getAIRecommendations: (month) =>
    api.get('/supervisor/ai-recommendations', { params: { month } }),
  batchDispatchAssignments: (assignments) =>
    api.post('/supervisor/assignments/batch', { assignments }),
  getInspectors: (month) =>
    api.get('/supervisor/inspectors', { params: { month } }),
  getPendingInspectors: () =>
    api.get('/supervisor/almo/pending-inspectors'),
  approveInspector: (inspectorId, data) =>
    api.post(`/supervisor/inspectors/${inspectorId}/approve`, data || {}),
  commissionInspector: (data) =>
    api.post('/supervisor/commission-inspector', data),
  rejectInspector: (inspectorId) =>
    api.post(`/supervisor/inspectors/${inspectorId}/reject`),
  getEmployers: () =>
    api.get('/supervisor/employers'),
  getPendingSanctions: () =>
    api.get('/supervisor/pending-sanctions'),
  sanctionScan: (scanId, data) =>
    api.post(`/supervisor/scans/${scanId}/sanction`, data),
  getPreMarketQueue: () =>
    api.get('/supervisor/pre-market-queue'),
  decidePreMarket: (applicationId, data) =>
    api.post(`/supervisor/pre-market/${applicationId}/decide`, data),
  assignPreMarket: (applicationId, data) =>
    api.post(`/supervisor/pre-market/${applicationId}/assign`, data),
  waiveVisit: (applicationId, data) =>
    api.post(`/supervisor/pre-market/${applicationId}/waive-visit`, data),
  // ALMO Statutory Functions
  getAlmoPendingSanctions: () =>
    api.get('/supervisor/almo/pending-sanctions'),
  sanctionFieldVisit: (applicationId, data) =>
    api.post(`/supervisor/pre-market/${applicationId}/sanction-visit`, data),
  rejectVisitSanction: (applicationId, data) =>
    api.post(`/supervisor/pre-market/${applicationId}/reject-sanction`, data),
  getAlmoPendingReports: () =>
    api.get('/supervisor/almo/pending-reports'),
  getSubordinateInspectors: () =>
    api.get('/supervisor/almo/subordinate-inspectors'),
  approveVisitReport: (visitId, data) =>
    api.post(`/supervisor/field-visits/${visitId}/approve-report`, data || {}),
  rejectVisitReport: (visitId, data) =>
    api.post(`/supervisor/field-visits/${visitId}/reject-report`, data || {}),
  getRules: (category) =>
    api.get('/supervisor/rules', { params: { category } }),
  getSupervisors: () =>
    api.get('/supervisor/supervisors'),
  commissionSupervisor: (data) =>
    api.post('/supervisor/commission-supervisor', data),
  getCLMOs: () =>
    api.get('/supervisor/clmos'),
  commissionCLMO: (data) =>
    api.post('/supervisor/commission-clmo', data),
  getALMOs: () =>
    api.get('/supervisor/almos'),
  commissionALMO: (data) =>
    api.post('/supervisor/commission-almo', data),
  approveALMO: (almoId, data) =>
    api.post(`/supervisor/almos/${almoId}/approve`, data || {}),
  getProductsHistory: () =>
    api.get('/supervisor/products-history'),
  issueWarrant: (data) =>
    api.post('/supervisor/warrants/issue', data),
  getWarrants: (params) =>
    api.get('/supervisor/warrants', { params }),
  resolveWarrant: (warrantId, data) =>
    api.post(`/supervisor/warrants/${warrantId}/resolve`, data),
  downloadWarrantPDF: async (warrantId, warrantNum) => {
    const res = await api.get(`/supervisor/warrants/${warrantId}/pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `LMPC_Statutory_Warrant_${(warrantNum || warrantId).toString().replace(/\//g, '_')}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

// Alias for backward compatibility
export const adminAPI = supervisorAPI;

// --- Field Visit Orders API ---
export const fieldVisitAPI = {
  createOrder: (data) =>
    api.post('/field-visits/orders', data),
  getMyAssigned: () =>
    api.get('/field-visits/orders/my-assigned'),
  getSchedule: () =>
    api.get('/field-visits/orders/schedule'),
  getDetail: (visitId) =>
    api.get(`/field-visits/orders/${visitId}`),
  startVisit: (visitId) =>
    api.patch(`/field-visits/orders/${visitId}/start`),
  uploadEvidence: (visitId, data) =>
    api.post(`/field-visits/orders/${visitId}/evidence`, data),
  submitReport: (visitId, data) =>
    api.post(`/field-visits/orders/${visitId}/submit-report`, data),
};

// --- Inspector Workspace API ---
export const inspectorAPI = {
  getMyAssignments: (month) =>
    api.get('/inspector/my-assignments', { params: { month } }),
  getAssignedEmployers: () =>
    api.get('/inspector/assigned-employers'),
  getProductsPipeline: (status_filter) =>
    api.get('/inspector/products-pipeline', { params: { status_filter } }),
  addProductToPipeline: (data) =>
    api.post('/inspector/products-pipeline', data),
  getMonthlyLedger: (month) =>
    api.get('/inspector/monthly-ledger', { params: { month } }),
  getPreMarketQueue: () =>
    api.get('/inspector/pre-market-queue'),
  verifyPreMarket: (applicationId, data) =>
    api.post(`/inspector/pre-market/${applicationId}/verify`, data),
};

// --- Employer Brand Portal API ---
export const employerAPI = {
  submitPreMarket: (data) =>
    api.post('/employer/pre-market/submit', data),
  getMyApplications: () =>
    api.get('/employer/my-applications'),
  getMyProducts: () =>
    api.get('/employer/my-products'),
  getMyNotices: () =>
    api.get('/employer/my-notices'),
  replyNotice: (scanId, data) =>
    api.post(`/employer/notices/${scanId}/reply`, data),
  getDeficiencyCases: () =>
    api.get('/employer/deficiency-cases'),
  respondDeficiencyCase: (caseId, data) =>
    api.post(`/employer/deficiency-cases/${caseId}/respond`, data),
  uploadArtwork: (formData) =>
    api.post('/employer/upload-artwork', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  uploadMultipleArtwork: (formData) =>
    api.post('/employer/upload-multiple-artwork', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// --- Reports & Export Downloads ---
export const reportsAPI = {
  downloadScanPDF: async (scanId) => {
    const res = await api.get(`/scans/${scanId}/report/pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `LMPC_Audit_Report_#${scanId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
  downloadScanDOCX: async (scanId) => {
    const res = await api.get(`/scans/${scanId}/report/docx`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `LMPC_Audit_Notice_#${scanId}.docx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
  downloadScanExcel: async (scanId) => {
    const res = await api.get(`/scans/${scanId}/report/excel`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `LMPC_Audit_Data_#${scanId}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
  downloadClearancePDF: async (applicationId, certNo) => {
    const res = await api.get(`/employer/pre-market/${applicationId}/certificate/pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `LMPC_Clearance_Certificate_${(certNo || applicationId).toString().replace(/\//g, '_')}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
  downloadClearanceDOCX: async (applicationId, certNo) => {
    const res = await api.get(`/employer/pre-market/${applicationId}/certificate/docx`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `LMPC_Clearance_Certificate_${(certNo || applicationId).toString().replace(/\//g, '_')}.docx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
  downloadClearanceExcel: async (applicationId, certNo) => {
    const res = await api.get(`/employer/pre-market/${applicationId}/certificate/excel`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `LMPC_Clearance_Record_${(certNo || applicationId).toString().replace(/\//g, '_')}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

// --- State Commissioner API ---
export const commissionerAPI = {
  getDashboard: () =>
    api.get('/commissioner/dashboard'),
  getCLMOs: () =>
    api.get('/commissioner/clmos'),
  getALMOs: () =>
    api.get('/commissioner/almos'),
  approveCLMO: (clmoId, data) =>
    api.post(`/commissioner/clmos/${clmoId}/approve`, data),
  rejectCLMO: (clmoId, data) =>
    api.post(`/commissioner/clmos/${clmoId}/reject`, data),
  commissionCLMO: (data) =>
    api.post('/commissioner/clmos/commission', data),
  getRulesets: () =>
    api.get('/commissioner/rulesets'),
  revokeCertificate: (applicationId, data) =>
    api.post(`/commissioner/certificates/${applicationId}/revoke`, data),
};

// --- Sub-Inspector & Resolution Operations API ---
export const subInspectorAPI = {
  getAssignedVisits: () =>
    api.get('/sub-inspector/assigned-visits'),
  logEvidence: (visitOrderNo, data) =>
    api.post(`/sub-inspector/visits/${visitOrderNo}/log-evidence`, data),
  coSignReport: (visitOrderNo, data) =>
    api.post(`/sub-inspector/visits/${visitOrderNo}/co-sign`, data),
  getResolutionCases: () =>
    api.get('/sub-inspector/cases'),
  getCases: () =>
    api.get('/sub-inspector/cases'),
  getViolations: () =>
    api.get('/sub-inspector/violations'),
  getApplications: () =>
    api.get('/sub-inspector/applications'),
  createMemo: (data) =>
    api.post('/sub-inspector/cases', data),
  resolveCase: (caseId, data) =>
    api.post(`/sub-inspector/cases/${caseId}/resolve`, data),
  escalateCase: (caseId, data) =>
    api.post(`/sub-inspector/cases/${caseId}/escalate-to-almo`, data),
  forwardToALMO: (applicationId) =>
    api.post(`/sub-inspector/applications/${applicationId}/forward-to-almo`),
  forwardToLeadInspector: (applicationId) =>
    api.post(`/sub-inspector/applications/${applicationId}/forward-to-lead-inspector`),
  forwardToInspector: (applicationId) =>
    api.post(`/sub-inspector/applications/${applicationId}/forward-to-lead-inspector`),
  getHistory: () =>
    api.get('/sub-inspector/history'),
};

export const resolutionDeskAPI = subInspectorAPI;

// --- Products & Applications Universal Dossier API ---
export const productsAPI = {
  getById: (id) => api.get(`/products/${id}`),
};

// --- Rules Matrix ---
export const rulesAPI = {
  getCatalog: (category) =>
    api.get('/supervisor/rules', { params: { category } }),
};

export default api;
