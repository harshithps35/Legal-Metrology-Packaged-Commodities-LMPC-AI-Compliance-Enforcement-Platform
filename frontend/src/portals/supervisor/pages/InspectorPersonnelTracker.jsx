import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  MapPin,
  Clock,
  Target,
  CheckCircle,
  TrendingUp,
  Mail,
  Phone,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  UserCheck,
  UserX,
  Plus,
  Loader2,
  KeyRound,
} from 'lucide-react';
import { supervisorAPI } from '../../../services/api';
import toast from 'react-hot-toast';

export default function InspectorPersonnelTracker() {
  const [inspectors, setInspectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedZone, setSelectedZone] = useState('all');
  const [approvalFilter, setApprovalFilter] = useState('all'); // 'all' | 'pending' | 'approved'
  const [processingId, setProcessingId] = useState(null);

  // Commission Modal State
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [commissionForm, setCommissionForm] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    password: '',
    department: 'Legal Metrology Enforcement Directorate',
    jurisdiction_zone: 'North Zone (Delhi NCR)',
    assigned_category: 'all',
    custom_unique_id: '',
  });
  const [commissioning, setCommissioning] = useState(false);

  // Approve & Assign ID Modal State
  const [approvingInspector, setApprovingInspector] = useState(null);
  const [approvalForm, setApprovalForm] = useState({
    custom_unique_id: '',
    jurisdiction_zone: '',
    assigned_category: '',
  });

  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');

  useEffect(() => {
    fetchInspectors();
  }, []);

  const fetchInspectors = async () => {
    try {
      setLoading(true);
      const res = await supervisorAPI.getInspectors('2026-08');
      setInspectors(res.data || []);
    } catch (err) {
      console.error('Failed to load inspector directory', err);
      toast.error('Failed to load inspector roster');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenApproveModal = (insp) => {
    setApprovingInspector(insp);
    setApprovalForm({
      custom_unique_id: insp.unique_login_id.startsWith('PROV') ? '' : insp.unique_login_id,
      jurisdiction_zone: insp.jurisdiction_zone || 'North Zone (Delhi NCR)',
      assigned_category: insp.assigned_category || 'all',
    });
  };

  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    if (!approvingInspector) return;
    try {
      setProcessingId(approvingInspector.id);
      const res = await supervisorAPI.approveInspector(approvingInspector.id, approvalForm);
      toast.success(res.data.message || `Inspector approved and assigned ID ${res.data.unique_login_id}!`);
      setApprovingInspector(null);
      await fetchInspectors();
    } catch (err) {
      console.error(err);
      toast.error('Failed to approve inspector application.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (inspectorId, officerName) => {
    if (!window.confirm(`Are you sure you want to reject registration for ${officerName}?`)) return;
    try {
      setProcessingId(inspectorId);
      const res = await supervisorAPI.rejectInspector(inspectorId);
      toast.success(res.data.message || `Inspector application rejected.`);
      await fetchInspectors();
    } catch (err) {
      console.error(err);
      toast.error('Failed to reject inspector.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCommissionSubmit = async (e) => {
    e.preventDefault();
    if (!commissionForm.full_name || !commissionForm.email || !commissionForm.phone_number || !commissionForm.password) {
      toast.error('Please fill in all mandatory officer fields.');
      return;
    }
    try {
      setCommissioning(true);
      const res = await supervisorAPI.commissionInspector(commissionForm);
      toast.success(res.data.message || 'Field Inspector commissioned successfully!');
      setShowCommissionModal(false);
      setCommissionForm({
        full_name: '',
        email: '',
        phone_number: '',
        password: '',
        department: 'Legal Metrology Enforcement Directorate',
        jurisdiction_zone: 'North Zone (Delhi NCR)',
        assigned_category: 'all',
        custom_unique_id: '',
      });
      await fetchInspectors();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to commission field inspector.');
    } finally {
      setCommissioning(false);
    }
  };

  const pendingInspectors = inspectors.filter((i) => !i.is_approved);

  const filtered = inspectors.filter((i) => {
    const matchesSearch =
      i.full_name.toLowerCase().includes(search.toLowerCase()) ||
      i.unique_login_id.toLowerCase().includes(search.toLowerCase()) ||
      i.email.toLowerCase().includes(search.toLowerCase()) ||
      i.jurisdiction_zone.toLowerCase().includes(search.toLowerCase());
    const matchesZone = selectedZone === 'all' || i.jurisdiction_zone.toLowerCase().includes(selectedZone.toLowerCase());
    const matchesApproval =
      approvalFilter === 'all'
        ? true
        : approvalFilter === 'pending'
        ? !i.is_approved
        : i.is_approved;
    return matchesSearch && matchesZone && matchesApproval;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-md text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 text-indigo-300 font-bold text-lg mb-1">
            <Users className="w-6 h-6 text-indigo-400" />
            <span>Regional Field Inspectorate & ID Generation Authority</span>
          </div>
          <p className="text-sm text-slate-200">
            Supervise field officers, generate/assign official statutory Inspector IDs (e.g. <code className="font-mono text-indigo-300">INSP-DEL-xxx</code>), approve registrations, and dispatch quotas.
          </p>
        </div>

        {/* Commission New Inspector Button */}
        <button
          onClick={() => setShowCommissionModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-3 rounded-xl transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Commission New Inspector</span>
        </button>
      </div>

      {/* Pending Approval Callout Badge */}
      {pendingInspectors.length > 0 && (
        <div className="bg-amber-500/20 border border-amber-400/40 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-950 font-bold">
            <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0" />
            <span>
              <strong>{pendingInspectors.length} New Field Officer Application(s)</strong> awaiting Supervisor ID Generation & Commissioning.
            </span>
          </div>
          <button
            onClick={() => setApprovalFilter('pending')}
            className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold px-4 py-2 rounded-xl text-xs transition-all shadow-xs shrink-0"
          >
            Review & Issue Inspector IDs &rarr;
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search inspector name, unique officer ID (INSP-xxx), Gmail, or zone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium text-sm rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={approvalFilter}
          onChange={(e) => setApprovalFilter(e.target.value)}
          className="bg-slate-50 border border-slate-300 text-slate-900 font-semibold text-xs rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="all">All Statuses ({inspectors.length})</option>
          <option value="pending">Pending Supervisor ID & Approval ({pendingInspectors.length})</option>
          <option value="approved">Commissioned & Active ({inspectors.filter(i => i.is_approved).length})</option>
        </select>

        <select
          value={selectedZone}
          onChange={(e) => setSelectedZone(e.target.value)}
          className="bg-slate-50 border border-slate-300 text-slate-900 font-semibold text-xs rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="all">All Enforcement Zones</option>
          <option value="north">North Zone (Delhi NCR / UP)</option>
          <option value="south">South Zone (Bengaluru / Chennai)</option>
          <option value="west">West Zone (Mumbai / Pune)</option>
          <option value="east">East Zone (Kolkata / Guwahati)</option>
        </select>
      </div>

      {/* Detailed Inspector Cards Roster */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 font-medium bg-white rounded-2xl border border-slate-200">
          Loading inspector personnel roster...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-slate-500 font-medium bg-white rounded-2xl border border-slate-200">
          No matching field officers found in this view.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map((insp) => {
            const isPending = !insp.is_approved;
            const isProcessing = processingId === insp.id;

            return (
              <div
                key={insp.id}
                className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all space-y-4 ${
                  isPending ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200'
                }`}
              >
                {/* Header: Name, Unique ID & Category */}
                <div className="flex items-start justify-between pb-3 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900 text-base">{insp.full_name}</span>
                      <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-mono font-bold px-2.5 py-0.5 rounded-md">
                        {insp.unique_login_id}
                      </span>
                      {isPending ? (
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 text-2xs font-extrabold px-2 py-0.5 rounded-full uppercase">
                          Pending ID Grant
                        </span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-2xs font-extrabold px-2 py-0.5 rounded-full uppercase">
                          Commissioned
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 flex items-center gap-1.5 mt-1 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-rose-600" />
                      <span>{insp.jurisdiction_zone}</span>
                    </div>
                  </div>

                  <span className="text-2xs font-bold uppercase bg-slate-100 text-slate-800 border border-slate-300 px-2.5 py-1 rounded-md capitalize">
                    {insp.assigned_category} Sector
                  </span>
                </div>

                {/* Verified Contact Details (Gmail & Phone) */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Mail className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="truncate font-semibold">{insp.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-semibold">+91 {insp.phone_number}</span>
                  </div>
                </div>

                {/* If Pending Approval: Supervisor Action Banner */}
                {isPending ? (
                  <div className="bg-amber-100/70 border border-amber-300 p-3.5 rounded-xl space-y-2.5">
                    <div className="flex items-center gap-2 text-amber-950 font-bold text-xs">
                      <ShieldAlert className="w-4 h-4 text-amber-700" />
                      <span>Officer verified via OTP — Awaiting Supervisor Unique ID Generation & Grant:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenApproveModal(insp)}
                        disabled={isProcessing}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Issue Official ID & Commission Officer</span>
                      </button>

                      <button
                        onClick={() => handleReject(insp.id, insp.full_name)}
                        disabled={isProcessing}
                        className="bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 font-bold py-2 px-3 rounded-xl text-xs transition-all"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Monthly Quota Metric Bar */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex justify-between text-xs font-bold text-slate-800">
                        <span>August 2026 Target Quota:</span>
                        <span className="font-mono text-indigo-700 text-sm">
                          {insp.completed_audits} / {insp.monthly_target} Audits ({insp.completion_percent}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full rounded-full transition-all"
                          style={{ width: `${insp.completion_percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Active Assigned Tasks List */}
                    <div>
                      <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Assigned Work Orders ({insp.tasks.length}):</span>
                      </div>
                      <div className="space-y-1.5">
                        {insp.tasks.length === 0 ? (
                          <div className="text-xs text-slate-500 italic">No work orders dispatched for this cycle.</div>
                        ) : (
                          insp.tasks.map((t) => (
                            <div
                              key={t.id}
                              className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-xs flex items-center justify-between"
                            >
                              <span className="font-semibold text-slate-800 line-clamp-1">{t.title}</span>
                              <span className="font-mono font-bold text-indigo-800 whitespace-nowrap ml-2">
                                Quota: {t.target_count}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Footer: Live Last Audit Location & GPS */}
                    <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Last Active: <strong>{insp.last_active_at}</strong></span>
                      </div>
                      <div className="font-mono text-slate-700">
                        GPS: <span className="font-bold text-slate-900">{insp.last_gps}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal 1: Commission New Inspector Directly */}
      {showCommissionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                <span>Direct Inspector Commissioning & ID Issuance</span>
              </h3>
              <button
                onClick={() => setShowCommissionModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCommissionSubmit} className="space-y-3.5 text-xs text-slate-800">
              <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-xl text-2xs text-indigo-950 font-medium">
                Authorizing Supervisor: <strong className="font-bold">{currentUser?.full_name}</strong> ({currentUser?.unique_login_id})
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Officer Full Name & Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Inspector Ramesh Kulkarni"
                    value={commissionForm.full_name}
                    onChange={(e) => setCommissionForm({ ...commissionForm, full_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold p-2.5 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Official Directorate Gmail *</label>
                  <input
                    type="email"
                    required
                    placeholder="ramesh.inspector.lmpc@gmail.com"
                    value={commissionForm.email}
                    onChange={(e) => setCommissionForm({ ...commissionForm, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold p-2.5 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Official Mobile Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9871234509"
                    value={commissionForm.phone_number}
                    onChange={(e) => setCommissionForm({ ...commissionForm, phone_number: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold p-2.5 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Initial Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Minimum 6 characters"
                    value={commissionForm.password}
                    onChange={(e) => setCommissionForm({ ...commissionForm, password: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold p-2.5 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Jurisdiction Zone *</label>
                  <select
                    value={commissionForm.jurisdiction_zone}
                    onChange={(e) => setCommissionForm({ ...commissionForm, jurisdiction_zone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold p-2.5 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none"
                  >
                    <option value="North Zone (Delhi NCR)">North Zone (Delhi NCR, Noida, Haryana)</option>
                    <option value="West Zone (Mumbai / Pune)">West Zone (Maharashtra, Gujarat, Goa)</option>
                    <option value="South Zone (Bangalore / Chennai)">South Zone (Karnataka, Tamil Nadu, Telangana)</option>
                    <option value="East Zone (Kolkata / Guwahati)">East Zone (West Bengal, Bihar, Assam)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Assigned Audit Sector</label>
                  <select
                    value={commissionForm.assigned_category}
                    onChange={(e) => setCommissionForm({ ...commissionForm, assigned_category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold p-2.5 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none"
                  >
                    <option value="all">All Commodities (General FMCG)</option>
                    <option value="food">Food & Beverages</option>
                    <option value="cosmetics">Cosmetics & Personal Care</option>
                    <option value="pharma">Pharmaceuticals & Healthcare</option>
                    <option value="electronics">Consumer Electronics</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Custom Unique ID (Optional — leave blank for auto-generation e.g. <span className="font-mono text-indigo-700">INSP-DEL-xxx</span>)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INSP-DEL-045 (Auto-calculated if blank)"
                    value={commissionForm.custom_unique_id}
                    onChange={(e) => setCommissionForm({ ...commissionForm, custom_unique_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold p-2.5 rounded-xl uppercase focus:bg-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCommissionModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-800 font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={commissioning}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
                >
                  {commissioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Generate ID & Commission Officer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Approve & Assign / Generate Official ID */}
      {approvingInspector && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <span>Issue Statutory ID & Commission Inspector</span>
              </h3>
              <button
                onClick={() => setApprovingInspector(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApproveSubmit} className="space-y-3.5 text-xs text-slate-800">
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1">
                <div>
                  <span className="text-slate-500 font-bold uppercase text-2xs block">Candidate Officer:</span>
                  <span className="font-extrabold text-slate-900 text-sm">{approvingInspector.full_name}</span>
                </div>
                <div className="text-2xs text-slate-600">
                  Gmail: <strong className="text-slate-900">{approvingInspector.email}</strong> • Phone: <strong className="text-slate-900">+91 {approvingInspector.phone_number}</strong>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Assign Statutory Unique Inspector ID (Supervisor Generated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. INSP-DEL-043 (Leave blank for automatic sequential generation)"
                  value={approvalForm.custom_unique_id}
                  onChange={(e) => setApprovalForm({ ...approvalForm, custom_unique_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-mono font-extrabold p-2.5 rounded-xl uppercase focus:bg-white focus:border-indigo-600 focus:outline-none"
                />
                <p className="text-3xs text-slate-500 mt-1">
                  The Inspector will use this Unique ID or their official Gmail for portal login and field enforcement sign-offs.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Confirmed Jurisdiction Zone</label>
                  <select
                    value={approvalForm.jurisdiction_zone}
                    onChange={(e) => setApprovalForm({ ...approvalForm, jurisdiction_zone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold p-2.5 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none"
                  >
                    <option value="North Zone (Delhi NCR)">North Zone (Delhi NCR, Noida, Haryana)</option>
                    <option value="West Zone (Mumbai / Pune)">West Zone (Maharashtra, Gujarat, Goa)</option>
                    <option value="South Zone (Bangalore / Chennai)">South Zone (Karnataka, Tamil Nadu, Telangana)</option>
                    <option value="East Zone (Kolkata / Guwahati)">East Zone (West Bengal, Bihar, Assam)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Assigned Audit Sector</label>
                  <select
                    value={approvalForm.assigned_category}
                    onChange={(e) => setApprovalForm({ ...approvalForm, assigned_category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold p-2.5 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none"
                  >
                    <option value="all">All Commodities (General FMCG)</option>
                    <option value="food">Food & Beverages</option>
                    <option value="cosmetics">Cosmetics & Personal Care</option>
                    <option value="pharma">Pharmaceuticals & Healthcare</option>
                    <option value="electronics">Consumer Electronics</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setApprovingInspector(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-800 font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingId === approvingInspector.id}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
                >
                  {processingId === approvingInspector.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>Generate ID & Commission Officer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
