import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';

// Portals - ALMO (Visit Sanctioning Authority)
import ALMOPortal from './portals/almo/ALMOPortal';
import ALMOSanctionsQueue from './portals/almo/pages/ALMOSanctionsQueue';
import ALMOVisitReportsQueue from './portals/almo/pages/ALMOVisitReportsQueue';
import ALMOOrdersHistory from './portals/almo/pages/ALMOOrdersHistory';
import ALMOProductsHistory from './portals/almo/pages/ALMOProductsHistory';
import ALMOCommissioning from './portals/almo/pages/ALMOCommissioning';
import ALMORegister from './portals/almo/pages/ALMORegister';
import SubordinateInspectors from './portals/almo/pages/SubordinateInspectors';

// Portals - CLMO (Adjudication & Clearance Authority)
import CLMOPortal from './portals/clmo/CLMOPortal';
import CLMOAdjudicationQueue from './portals/clmo/pages/CLMOAdjudicationQueue';
import CLMOCertificateVault from './portals/clmo/pages/CLMOCertificateVault';
import CLMOCommissioning from './portals/clmo/pages/CLMOCommissioning';
import SubordinateALMOs from './portals/clmo/pages/SubordinateALMOs';
import PendingProductsQueue from './portals/clmo/pages/PendingProductsQueue';
import CLMOProductsHistory from './portals/clmo/pages/CLMOProductsHistory';
import CLMORegister from './portals/clmo/pages/CLMORegister';

// Portals - Supervisor (Administrative)
import SupervisorNavbar from './portals/supervisor/components/SupervisorNavbar';
import SupervisorDashboard from './portals/supervisor/pages/SupervisorDashboard';
import InspectorPersonnelTracker from './portals/supervisor/pages/InspectorPersonnelTracker';
import EmployerCompanyTracker from './portals/supervisor/pages/EmployerCompanyTracker';
import AIQuotaAllocation from './portals/supervisor/pages/AIQuotaAllocation';
import SanctionsQueue from './portals/supervisor/pages/SanctionsQueue';
import SupervisorCouncil from './portals/supervisor/pages/SupervisorCouncil';

// Portals - Inspector
import InspectorPortal from './portals/inspector/InspectorPortal';
import InspectorNavbar from './portals/inspector/components/InspectorNavbar';
import ActiveProductsWorkbench from './portals/inspector/pages/ActiveProductsWorkbench';
import PreMarketInspectionQueue from './portals/inspector/pages/PreMarketInspectionQueue';
import AssignedFieldVisits from './portals/inspector/pages/AssignedFieldVisits';
import MonthlyLedger from './portals/inspector/pages/MonthlyLedger';
import InspectorRegister from './portals/inspector/pages/InspectorRegister';

// Portals - Employer / Manufacturer
import EmployerPortal from './portals/employer/EmployerPortal';
import EmployerNavbar from './portals/employer/components/EmployerNavbar';
import EmployerDashboard from './portals/employer/pages/EmployerDashboard';
import PreMarketWorkbench from './portals/employer/pages/PreMarketWorkbench';
import ClearanceApplications from './portals/employer/pages/ClearanceApplications';
import NoticeRectification from './portals/employer/pages/NoticeRectification';
import EmployerResolutionDesk from './portals/employer/pages/EmployerResolutionDesk';
import BrandOwnerRegister from './portals/employer/pages/BrandOwnerRegister';

// Portals - Commissioner
import CommissionerPortal from './portals/commissioner/CommissionerPortal';
import StatewideDashboard from './portals/commissioner/pages/StatewideDashboard';
import SubordinateCLMOs from './portals/commissioner/pages/SubordinateCLMOs';
import StatewideALMOs from './portals/commissioner/pages/StatewideALMOs';
import CertificateRevocationVault from './portals/commissioner/pages/CertificateRevocationVault';
import RulesetCatalog from './portals/commissioner/pages/RulesetCatalog';

// Portals - Sub-Inspector & Resolution Desk (Unified)
import SubInspectorPortal from './portals/sub_inspector/SubInspectorPortal';
import AssignedVisitsList from './portals/sub_inspector/pages/AssignedVisitsList';
import SubInspectorViolationsVerification from './portals/sub_inspector/pages/SubInspectorViolationsVerification';
import ResolutionCasesQueue from './portals/sub_inspector/pages/ResolutionCasesQueue';
import SubInspectorRegister from './portals/sub_inspector/pages/SubInspectorRegister';
import SubInspectorHistory from './portals/sub_inspector/pages/SubInspectorHistory';

// Dedicated Portal Product Detail Pages
import InspectorProductDetailPage from './portals/inspector/pages/InspectorProductDetailPage';
import SubInspectorProductDetailPage from './portals/sub_inspector/pages/SubInspectorProductDetailPage';
import ClmoProductDetailPage from './portals/clmo/pages/ClmoProductDetailPage';
import AlmoProductDetailPage from './portals/almo/pages/AlmoProductDetailPage';
import EmployerProductDetailPage from './portals/employer/pages/EmployerProductDetailPage';
import CommissionerProductDetailPage from './portals/commissioner/pages/CommissionerProductDetailPage';

// Public Verification
import PublicCertificateVerification from './pages/PublicCertificateVerification';

// Shared Pages
import ScanPage from './pages/ScanPage';
import ScanDetail from './pages/ScanDetail';
import HistoryPage from './pages/HistoryPage';
import LoginPage from './pages/LoginPage';
import RulesMatrix from './components/RulesMatrix';
import Dashboard from './pages/Dashboard';
import { Outlet } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

function RoleRoute({ allowedRoles, children }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const token = localStorage.getItem('token');

  if (!token) return <Navigate to="/login" replace />;

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white border border-rose-200 p-8 rounded-3xl max-w-md shadow-xl space-y-4">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black text-slate-900">Statutory Access Restricted</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your authenticated role (<strong>{user?.role || 'Unauthenticated'}</strong>) is not authorized to access this official console.
          </p>
          <div className="pt-2">
            <button
              onClick={() => {
                if (user?.role === 'state_commissioner' || user?.role === 'director') navigate('/commissioner');
                else if (user?.role === 'clmo' || user?.role === 'clmo_supervisor') navigate('/clmo');
                else if (user?.role === 'almo' || user?.role === 'superintendent') navigate('/almo');
                else if (user?.role === 'inspector') navigate('/inspector/products');
                else if (user?.role === 'sub_inspector' || user?.role === 'resolution_desk') navigate('/sub-inspector');
                else if (['employer', 'manufacturer'].includes(user?.role)) navigate('/employer/dashboard');
                else navigate('/login');
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md shadow-indigo-600/30 cursor-pointer transition-all"
            >
              Return to Authorized Portal
            </button>
          </div>
        </div>
      </div>
    );
  }
  return children;
}

function InspectorLayout() {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <InspectorNavbar />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
        <Outlet />
      </main>
    </div>
  );
}

function EmployerLayout() {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <EmployerNavbar />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
        <Outlet />
      </main>
    </div>
  );
}

function SupervisorLayout() {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <SupervisorNavbar />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
        <Outlet />
      </main>
    </div>
  );
}

function SharedLayout() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const token = localStorage.getItem('token');

  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <div className="bg-slate-900 text-white py-3 px-6 shadow-md flex items-center justify-between border-b border-indigo-500/30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (user?.role === 'state_commissioner' || user?.role === 'director') navigate('/commissioner');
              else if (user?.role === 'almo' || user?.role === 'superintendent') navigate('/almo');
              else if (user?.role === 'clmo' || user?.role === 'clmo_supervisor' || user?.role === 'supervisor') navigate('/clmo');
              else if (user?.role === 'sub_inspector' || user?.role === 'resolution_desk') navigate('/sub-inspector');
              else if (['employer', 'manufacturer'].includes(user?.role)) navigate('/employer/dashboard');
              else if (user?.role === 'inspector') navigate('/inspector/products');
              else navigate('/login');
            }}
            className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg cursor-pointer transition-all"
          >
            &larr; Back to My Portal
          </button>
          <span className="font-extrabold text-sm tracking-wide">DIRECTORATE OF LEGAL METROLOGY</span>
        </div>

        <div className="text-xs text-slate-300 font-mono">
          Logged in as: <strong className="text-white">{user?.full_name || user?.username}</strong> ({user?.unique_login_id || user?.role})
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
        <Outlet />
      </main>
    </div>
  );
}

function RootRedirect() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const token = localStorage.getItem('token');

  if (!token || !user) return <Navigate to="/login" replace />;

  if (user.role === 'state_commissioner' || user.role === 'director') {
    return <Navigate to="/commissioner" replace />;
  } else if (user.role === 'almo' || user.role === 'superintendent') {
    return <Navigate to="/almo" replace />;
  } else if (user.role === 'clmo' || user.role === 'clmo_supervisor') {
    return <Navigate to="/clmo" replace />;
  } else if (user.role === 'sub_inspector' || user.role === 'resolution_desk') {
    return <Navigate to="/sub-inspector" replace />;
  } else if (user.role === 'inspector') {
    return <Navigate to="/inspector/products" replace />;
  } else if (['employer', 'manufacturer'].includes(user.role)) {
    return <Navigate to="/employer/dashboard" replace />;
  } else if (user.role === 'supervisor') {
    return <Navigate to="/supervisor" replace />;
  }
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Authentication & Public Registration */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/:portalRole" element={<LoginPage />} />
      <Route path="/register" element={<BrandOwnerRegister />} />
      <Route path="/employer/register" element={<BrandOwnerRegister />} />
      <Route path="/manufacturer/register" element={<BrandOwnerRegister />} />
      <Route path="/inspector/register" element={<InspectorRegister />} />
      <Route path="/sub-inspector/register" element={<SubInspectorRegister />} />
      <Route path="/register/sub-inspector" element={<SubInspectorRegister />} />
      <Route path="/clmo/register" element={<CLMORegister />} />
      <Route path="/register/clmo" element={<CLMORegister />} />
      <Route path="/almo/register" element={<ALMORegister />} />
      <Route path="/register/almo" element={<ALMORegister />} />
      <Route path="/verify/:cert_number" element={<PublicCertificateVerification />} />

      {/* Root Smart Redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Commissioner Portal Nesting (Level 1 Apex) */}
      <Route path="/commissioner" element={<CommissionerPortal />}>
        <Route index element={<StatewideDashboard />} />
        <Route path="products/:id" element={<CommissionerProductDetailPage />} />
        <Route path="clmos" element={<SubordinateCLMOs />} />
        <Route path="almos" element={<StatewideALMOs />} />
        <Route path="revocations" element={<CertificateRevocationVault />} />
        <Route path="rulesets" element={<RulesetCatalog />} />
      </Route>

      {/* ALMO Portal Nesting (Level 3 Sanctions Authority) */}
      <Route path="/almo" element={<ALMOPortal />}>
        <Route index element={<ALMOVisitReportsQueue />} />
        <Route path="products/:id" element={<AlmoProductDetailPage />} />
        <Route path="reports" element={<ALMOVisitReportsQueue />} />
        <Route path="orders" element={<ALMOOrdersHistory />} />
        <Route path="inspectors" element={<SubordinateInspectors />} />
        <Route path="history" element={<ALMOProductsHistory />} />
        <Route path="registration" element={<ALMORegister />} />
      </Route>

      {/* CLMO Portal Nesting (Level 2 Adjudication Authority) */}
      <Route path="/clmo" element={<CLMOPortal />}>
        <Route index element={<CLMOAdjudicationQueue />} />
        <Route path="products/:id" element={<ClmoProductDetailPage />} />
        <Route path="pending" element={<PendingProductsQueue />} />
        <Route path="history" element={<CLMOProductsHistory />} />
        <Route path="almos" element={<SubordinateALMOs />} />
        <Route path="certificates" element={<CLMOCertificateVault />} />
        <Route path="commissioning" element={<CLMOCommissioning />} />
        <Route path="registration" element={<CLMORegister />} />
      </Route>

      {/* Unified Sub-Inspector & Resolution Desk Portal Nesting (Level 5) */}
      <Route path="/sub-inspector" element={<SubInspectorPortal />}>
        <Route index element={<AssignedVisitsList />} />
        <Route path="products/:id" element={<SubInspectorProductDetailPage />} />
        <Route path="visits" element={<AssignedVisitsList />} />
        <Route path="violations" element={<SubInspectorViolationsVerification />} />
        <Route path="resolution" element={<ResolutionCasesQueue />} />
        <Route path="resolution-desk" element={<ResolutionCasesQueue />} />
        <Route path="history" element={<SubInspectorHistory />} />
        <Route path="registration" element={<SubInspectorRegister />} />
      </Route>

      {/* Legacy / Direct Route Redirection for Resolution Desk */}
      <Route path="/resolution-desk" element={<Navigate to="/sub-inspector/resolution" replace />} />
      <Route path="/resolution-desk/*" element={<Navigate to="/sub-inspector/resolution" replace />} />

      {/* Inspector Portal (Level 4 Field Inspectorate) */}
      <Route path="/inspector" element={<InspectorPortal />}>
        <Route index element={<Navigate to="/inspector/pre-market" replace />} />
        <Route path="pre-market" element={<RoleRoute allowedRoles={['inspector']}><PreMarketInspectionQueue /></RoleRoute>} />
        <Route path="visits" element={<RoleRoute allowedRoles={['inspector']}><AssignedFieldVisits /></RoleRoute>} />
        <Route path="products" element={<RoleRoute allowedRoles={['inspector']}><ActiveProductsWorkbench /></RoleRoute>} />
        <Route path="products/:id" element={<RoleRoute allowedRoles={['inspector', 'supervisor', 'clmo', 'almo']}><InspectorProductDetailPage /></RoleRoute>} />
        <Route path="ledger" element={<RoleRoute allowedRoles={['inspector']}><MonthlyLedger /></RoleRoute>} />
        <Route path="registration" element={<InspectorRegister />} />
        <Route path="workspace" element={<Navigate to="/inspector/pre-market" replace />} />
        <Route path="employers" element={<Navigate to="/inspector/products" replace />} />
      </Route>

      {/* Employer / Manufacturer Portal (Level 6 Brand Suite) */}
      <Route path="/employer" element={<EmployerPortal />}>
        <Route index element={<Navigate to="/employer/dashboard" replace />} />
        <Route path="dashboard" element={<RoleRoute allowedRoles={['employer', 'manufacturer']}><EmployerDashboard /></RoleRoute>} />
        <Route path="products/:id" element={<RoleRoute allowedRoles={['employer', 'manufacturer', 'inspector', 'clmo']}><EmployerProductDetailPage /></RoleRoute>} />
        <Route path="workbench" element={<RoleRoute allowedRoles={['employer', 'manufacturer']}><PreMarketWorkbench /></RoleRoute>} />
        <Route path="applications" element={<RoleRoute allowedRoles={['employer', 'manufacturer']}><ClearanceApplications /></RoleRoute>} />
        <Route path="violations" element={<RoleRoute allowedRoles={['employer', 'manufacturer']}><NoticeRectification /></RoleRoute>} />
        <Route path="notices" element={<RoleRoute allowedRoles={['employer', 'manufacturer']}><NoticeRectification /></RoleRoute>} />
        <Route path="resolution" element={<RoleRoute allowedRoles={['employer', 'manufacturer']}><EmployerResolutionDesk /></RoleRoute>} />
        <Route path="resolution-desk" element={<RoleRoute allowedRoles={['employer', 'manufacturer']}><EmployerResolutionDesk /></RoleRoute>} />
      </Route>
      <Route path="/manufacturer" element={<EmployerPortal />}>
        <Route index element={<Navigate to="/employer/dashboard" replace />} />
        <Route path="dashboard" element={<RoleRoute allowedRoles={['employer', 'manufacturer']}><EmployerDashboard /></RoleRoute>} />
        <Route path="products/:id" element={<RoleRoute allowedRoles={['employer', 'manufacturer', 'inspector', 'clmo']}><EmployerProductDetailPage /></RoleRoute>} />
        <Route path="workbench" element={<RoleRoute allowedRoles={['employer', 'manufacturer']}><PreMarketWorkbench /></RoleRoute>} />
        <Route path="applications" element={<RoleRoute allowedRoles={['employer', 'manufacturer']}><ClearanceApplications /></RoleRoute>} />
        <Route path="violations" element={<RoleRoute allowedRoles={['employer', 'manufacturer']}><NoticeRectification /></RoleRoute>} />
        <Route path="notices" element={<RoleRoute allowedRoles={['employer', 'manufacturer']}><NoticeRectification /></RoleRoute>} />
        <Route path="resolution" element={<RoleRoute allowedRoles={['employer', 'manufacturer']}><EmployerResolutionDesk /></RoleRoute>} />
        <Route path="resolution-desk" element={<RoleRoute allowedRoles={['employer', 'manufacturer']}><EmployerResolutionDesk /></RoleRoute>} />
      </Route>

      {/* Supervisor Portal (Legacy / Administrative) */}
      <Route path="/supervisor" element={<SupervisorLayout />}>
        <Route index element={<RoleRoute allowedRoles={['clmo', 'clmo_supervisor', 'state_commissioner', 'director', 'supervisor']}><SupervisorDashboard /></RoleRoute>} />
        <Route path="inspectors" element={<RoleRoute allowedRoles={['clmo', 'clmo_supervisor', 'state_commissioner', 'director', 'supervisor']}><InspectorPersonnelTracker /></RoleRoute>} />
        <Route path="employers" element={<RoleRoute allowedRoles={['clmo', 'clmo_supervisor', 'state_commissioner', 'director', 'supervisor']}><EmployerCompanyTracker /></RoleRoute>} />
        <Route path="quotas" element={<RoleRoute allowedRoles={['clmo', 'clmo_supervisor', 'state_commissioner', 'director', 'supervisor']}><AIQuotaAllocation /></RoleRoute>} />
        <Route path="sanctions" element={<RoleRoute allowedRoles={['clmo', 'clmo_supervisor', 'state_commissioner', 'director', 'supervisor']}><SanctionsQueue /></RoleRoute>} />
        <Route path="council" element={<RoleRoute allowedRoles={['clmo', 'clmo_supervisor', 'state_commissioner', 'director', 'supervisor']}><SupervisorCouncil /></RoleRoute>} />
      </Route>

      {/* Shared Features Layout */}
      <Route element={<SharedLayout />}>
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/scans/:id" element={<ScanDetail />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route
          path="/rules"
          element={
            <div className="space-y-4">
              <h1 className="text-2xl font-extrabold text-slate-900">Official Statutory Gazette Matrix</h1>
              <RulesMatrix />
            </div>
          }
        />
        <Route path="/dashboard" element={<Dashboard />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
