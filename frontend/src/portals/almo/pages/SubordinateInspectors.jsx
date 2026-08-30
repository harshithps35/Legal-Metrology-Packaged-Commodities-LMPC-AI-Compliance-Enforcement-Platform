import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  Shield,
  ShieldCheck,
  MapPin,
  Mail,
  Phone,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ClipboardList,
  Eye,
  Loader2,
  Sparkles,
  Building2,
  Calendar,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  User,
  Activity,
  Layers,
  Award,
  AlertOctagon,
  FileDown,
  Scale,
  Send,
  Download,
  UserPlus,
  XCircle,
  Check,
} from 'lucide-react';
import { supervisorAPI } from '../../../services/api';
import toast from 'react-hot-toast';

export default function SubordinateInspectors() {
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'pending'
  const [officers, setOfficers] = useState([]);
  const [pendingInspectors, setPendingInspectors] = useState([]);
  const [warrants, setWarrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'inspector' | 'sub_inspector'
  const [zoneFilter, setZoneFilter] = useState('all');
  const [selectedOfficer, setSelectedOfficer] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Warrant Modal State
  const [warrantTargetOfficer, setWarrantTargetOfficer] = useState(null);
  const [servingWarrant, setServingWarrant] = useState(false);
  const [downloadingWarrantId, setDownloadingWarrantId] = useState(null);
  const [warrantForm, setWarrantForm] = useState({
    warrant_type: 'SHOW_CAUSE_WARRANT',
    charges_summary: 'Inquiry into physical verification delays and on-site caliper measurement non-compliance.',
    statutory_grounds: 'Section 15, 48 & 52 Legal Metrology Act 2009 — ALMO supervisory authority over field officers.',
    action_mandated: 'Submit written justification and unfulfilled visit logs within 5 business days.',
    hearing_deadline_days: 5,
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchSubordinateInspectors(),
        fetchPendingInspectors(),
        fetchWarrants(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubordinateInspectors = async () => {
    try {
      const res = await supervisorAPI.getSubordinateInspectors();
      setOfficers(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPendingInspectors = async () => {
    try {
      const res = await supervisorAPI.getPendingInspectors();
      setPendingInspectors(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWarrants = async () => {
    try {
      const res = await supervisorAPI.getWarrants();
      setWarrants(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleApproveOfficer = async (officer) => {
    try {
      setActionLoadingId(officer.id);
      const res = await supervisorAPI.approveInspector(officer.id, {
        jurisdiction_zone: officer.jurisdiction_zone,
      });
      toast.success(res.data?.message || `Officer ${officer.full_name} verified and commissioned!`);
      await Promise.all([fetchSubordinateInspectors(), fetchPendingInspectors()]);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to verify and commission officer');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectOfficer = async (officerId) => {
    if (!window.confirm('Are you sure you want to reject this officer registration application?')) return;
    try {
      setActionLoadingId(officerId);
      await supervisorAPI.rejectInspector(officerId);
      toast.success('Officer registration application rejected.');
      await fetchPendingInspectors();
    } catch (err) {
      console.error(err);
      toast.error('Failed to reject registration');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDownloadWarrant = async (warrantId, warrantNum) => {
    try {
      setDownloadingWarrantId(warrantId);
      await supervisorAPI.downloadWarrantPDF(warrantId, warrantNum);
      toast.success(`Official Statutory Warrant ${warrantNum || warrantId} PDF exported successfully!`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to export warrant PDF');
    } finally {
      setDownloadingWarrantId(null);
    }
  };

  const handleIssueWarrant = async (e) => {
    e.preventDefault();
    if (!warrantTargetOfficer) return;
    try {
      setServingWarrant(true);
      const res = await supervisorAPI.issueWarrant({
        target_officer_id: warrantTargetOfficer.id,
        ...warrantForm,
      });
      toast.success(res.data?.message || 'Statutory Warrant officially served against Officer!');
      const wId = res.data?.warrant_id;
      const wNum = res.data?.warrant_number;
      setWarrantTargetOfficer(null);
      fetchWarrants();
      fetchSubordinateInspectors();
      if (wId) {
        await handleDownloadWarrant(wId, wNum);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to issue statutory warrant on officer');
    } finally {
      setServingWarrant(false);
    }
  };

  // Active commissioned officers filter
  const zones = Array.from(new Set(officers.map((o) => o.jurisdiction_zone).filter(Boolean)));

  const filteredOfficers = officers.filter((o) => {
    const matchSearch =
      (o.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.unique_login_id || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.jurisdiction_zone || '').toLowerCase().includes(search.toLowerCase());

    const matchRole =
      roleFilter === 'all' ||
      (roleFilter === 'inspector' && o.role === 'inspector') ||
      (roleFilter === 'sub_inspector' && (o.role === 'sub_inspector' || o.role === 'resolution_desk'));

    const matchZone = zoneFilter === 'all' || o.jurisdiction_zone === zoneFilter;

    return matchSearch && matchRole && matchZone;
  });

  const totalInspectors = officers.filter((o) => o.role === 'inspector').length;
  const totalSubInspectors = officers.filter((o) => o.role === 'sub_inspector' || o.role === 'resolution_desk').length;
  const totalVisitsAssigned = officers.reduce((acc, o) => acc + (o.assigned_visits_count || 0), 0);
  const totalVisitsCompleted = officers.reduce((acc, o) => acc + (o.completed_visits_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Title & Pill Switcher (Extej Header) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Subordinate Field Command
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Supervise Lead Inspectors (L4), Sub-Inspector Squads (L5), and verify pending registrations.
          </p>
        </div>

        {/* Pill Sub-Tabs Switcher */}
        <div className="bg-[#EAEFF8] p-1 rounded-2xl flex items-center gap-1 self-start md:self-auto border border-slate-200/60 shadow-inner">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'active'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active Field Roster ({officers.length})
          </button>

          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Pending Verifications</span>
            {pendingInspectors.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-3xs font-black">
                {pendingInspectors.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-6">
          
          {/* TAB 1: ACTIVE COMMISSIONED SUBORDINATES */}
          {activeTab === 'active' && (
            <div className="space-y-6">
              {/* Metric Highlights Selection Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-1 hover:border-blue-300 transition-colors">
                  <div className="text-3xs font-bold text-slate-600 uppercase tracking-wider font-mono">
                    All Active
                  </div>
                  <div className="text-2xl font-black text-emerald-600">
                    {officers.length} <span className="text-xs font-bold text-slate-600">Officers</span>
                  </div>
                  <div className="text-3xs text-slate-600 font-medium">Zonal Roster</div>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-1 hover:border-blue-300 transition-colors">
                  <div className="text-3xs font-bold text-slate-600 uppercase tracking-wider font-mono">
                    Lead LMIs (L4)
                  </div>
                  <div className="text-2xl font-black text-blue-600">
                    {totalInspectors} <span className="text-xs font-bold text-slate-600">Lead</span>
                  </div>
                  <div className="text-3xs text-slate-600 font-medium">Pre-Market Triage</div>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-1 hover:border-blue-300 transition-colors">
                  <div className="text-3xs font-bold text-slate-600 uppercase tracking-wider font-mono">
                    Field Squads (L5)
                  </div>
                  <div className="text-2xl font-black text-emerald-600">
                    {totalSubInspectors} <span className="text-xs font-bold text-slate-600">Squads</span>
                  </div>
                  <div className="text-3xs text-slate-600 font-medium">Caliper & GPS</div>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-1 hover:border-blue-300 transition-colors">
                  <div className="text-3xs font-bold text-slate-600 uppercase tracking-wider font-mono">
                    Executed VIRs
                  </div>
                  <div className="text-2xl font-black text-amber-600">
                    {totalVisitsCompleted} <span className="text-xs font-bold text-slate-600">/ {totalVisitsAssigned}</span>
                  </div>
                  <div className="text-3xs text-slate-600 font-medium">Completed Audits</div>
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search officer name, UID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-[#F4F7FB] border border-slate-200/80 rounded-2xl pl-10 pr-3.5 py-2 text-xs text-slate-800 placeholder-slate-600 focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                  <div className="flex items-center gap-1 bg-[#F4F7FB] p-1 rounded-xl border border-slate-200/80 text-xs">
                    <button
                      onClick={() => setRoleFilter('all')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        roleFilter === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setRoleFilter('inspector')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        roleFilter === 'inspector' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      L4 Inspectors
                    </button>
                    <button
                      onClick={() => setRoleFilter('sub_inspector')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        roleFilter === 'sub_inspector' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      L5 Sub-Inspectors
                    </button>
                  </div>

                  {zones.length > 0 && (
                    <select
                      value={zoneFilter}
                      onChange={(e) => setZoneFilter(e.target.value)}
                      className="bg-[#F4F7FB] border border-slate-200/80 text-slate-700 text-xs font-bold p-2 rounded-xl outline-none"
                    >
                      <option value="all">All Zones</option>
                      {zones.map((z) => (
                        <option key={z} value={z}>{z}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Data Cards / Table */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Commissioned Personnel Directory
                  </h3>
                  <span className="text-3xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                    {filteredOfficers.length} Records
                  </span>
                </div>

                {loading ? (
                  <div className="py-12 text-center text-slate-600 flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="text-xs">Loading officer directory...</span>
                  </div>
                ) : filteredOfficers.length === 0 ? (
                  <div className="py-8 text-center text-slate-600 text-xs font-medium">
                    No subordinate officers found matching criteria.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredOfficers.map((off) => {
                      const isLead = off.role === 'inspector';
                      const officerWarrants = warrants.filter((w) => w.target_officer_id === off.id);
                      const hasActiveWarrant = officerWarrants.some((w) => w.status === 'ACTIVE_SERVED');

                      return (
                        <div key={off.id} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-blue-600 text-xs bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 rounded-lg">
                                {off.unique_login_id}
                              </span>
                              <span className="font-extrabold text-slate-900 text-sm">
                                {off.full_name}
                              </span>
                              <span
                                className={`text-3xs font-mono font-bold px-2 py-0.5 rounded-md border ${
                                  isLead
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {off.level_tag}
                              </span>
                              {hasActiveWarrant && (
                                <span className="text-3xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <AlertOctagon className="w-3 h-3 text-rose-600" />
                                  Warrant Served
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3.5 h-3.5 text-slate-600" />
                                <span>{off.email}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5 text-slate-600" />
                                <span>+91 {off.phone_number}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                                <span>{off.jurisdiction_zone}</span>
                              </span>
                            </div>
                          </div>

                          {/* Action Pill Buttons */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => setWarrantTargetOfficer(off)}
                              className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                              <span>File Warrant</span>
                            </button>

                            <button
                              onClick={() => setSelectedOfficer(off)}
                              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/20 flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Dossier</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PENDING CANDIDATE VERIFICATIONS */}
          {activeTab === 'pending' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-blue-600" />
                    <span>Candidate Inspector & Sub-Inspector Queue</span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Review background credentials and commission new officers into your jurisdiction.
                  </p>
                </div>
                <span className="text-3xs font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                  {pendingInspectors.length} Awaiting Approval
                </span>
              </div>

              {pendingInspectors.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <h4 className="font-bold text-sm text-slate-800">All Candidate Registrations Verified</h4>
                  <p className="text-xs text-slate-600">No pending officer applications in your queue.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pendingInspectors.map((c) => {
                    const isLead = c.role === 'inspector';
                    const isActing = actionLoadingId === c.id;

                    return (
                      <div key={c.id} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-lg">
                              {c.unique_login_id}
                            </span>
                            <span className="font-extrabold text-slate-900 text-sm">{c.full_name}</span>
                            <span
                              className={`text-3xs font-mono font-bold px-2 py-0.5 rounded-md border ${
                                isLead
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {c.level_tag}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5 text-slate-600" />
                              <span>{c.email}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-slate-600" />
                              <span>+91 {c.phone_number}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-amber-500" />
                              <span>{c.jurisdiction_zone}</span>
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleRejectOfficer(c.id)}
                            disabled={isActing}
                            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 text-xs font-bold transition-all cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-500" />
                          </button>

                          <button
                            onClick={() => handleApproveOfficer(c)}
                            disabled={isActing}
                            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            {isActing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            <span>Verify & Commission</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
      </div>

      {/* Warrant Filing Modal */}
      {warrantTargetOfficer && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-fade-in text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200">
                  <AlertOctagon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">File Statutory Officer Warrant</h3>
                  <p className="text-2xs text-slate-600">Respondent: <strong>{warrantTargetOfficer.full_name}</strong> ({warrantTargetOfficer.unique_login_id})</p>
                </div>
              </div>
              <button
                onClick={() => setWarrantTargetOfficer(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleIssueWarrant} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1 text-3xs">Warrant Order Classification *</label>
                <select
                  value={warrantForm.warrant_type}
                  onChange={(e) => setWarrantForm({ ...warrantForm, warrant_type: e.target.value })}
                  className="w-full bg-[#F4F7FB] border border-slate-200 p-2.5 rounded-xl font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                >
                  <option value="SHOW_CAUSE_WARRANT">Official Statutory Show-Cause Warrant</option>
                  <option value="STATUTORY_INQUIRY">Formal Field Duty Statutory Inquiry</option>
                  <option value="AUDIT_SUBPOENA">Audit Subpoena & Evidence Call-In</option>
                  <option value="SUSPENSION_ORDER">Immediate Field Powers Suspension Order</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1 text-3xs">Itemized Statement of Charges *</label>
                <textarea
                  rows={3}
                  required
                  value={warrantForm.charges_summary}
                  onChange={(e) => setWarrantForm({ ...warrantForm, charges_summary: e.target.value })}
                  className="w-full bg-[#F4F7FB] border border-slate-200 p-2.5 rounded-xl text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1 text-3xs">Statutory Grounds *</label>
                  <input
                    type="text"
                    required
                    value={warrantForm.statutory_grounds}
                    onChange={(e) => setWarrantForm({ ...warrantForm, statutory_grounds: e.target.value })}
                    className="w-full bg-[#F4F7FB] border border-slate-200 p-2 rounded-xl text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1 text-3xs">Hearing SLA (Days) *</label>
                  <select
                    value={warrantForm.hearing_deadline_days}
                    onChange={(e) => setWarrantForm({ ...warrantForm, hearing_deadline_days: parseInt(e.target.value) })}
                    className="w-full bg-[#F4F7FB] border border-slate-200 p-2 rounded-xl text-slate-800 font-bold outline-none"
                  >
                    <option value={3}>3 Business Days</option>
                    <option value={5}>5 Business Days</option>
                    <option value={7}>7 Business Days</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setWarrantTargetOfficer(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={servingWarrant}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold shadow-md shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  {servingWarrant ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Sign & Serve (Auto-Export PDF)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Officer Dossier Modal */}
      {selectedOfficer && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-fade-in text-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">{selectedOfficer.full_name}</h3>
                  <p className="text-2xs text-slate-600 font-mono">{selectedOfficer.unique_login_id} • {selectedOfficer.level_tag}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOfficer(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-[#F4F7FB] rounded-2xl border border-slate-200">
                  <span className="text-3xs uppercase font-bold text-slate-600 block">Territory</span>
                  <span className="font-bold text-slate-900">{selectedOfficer.jurisdiction_zone}</span>
                </div>
                <div className="p-3 bg-[#F4F7FB] rounded-2xl border border-slate-200">
                  <span className="text-3xs uppercase font-bold text-slate-600 block">Department</span>
                  <span className="font-bold text-blue-700">{selectedOfficer.department}</span>
                </div>
              </div>

              {/* Warrants Served List */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="font-extrabold text-slate-800 text-2xs uppercase block">Statutory Warrants on Record</span>
                {warrants.filter((w) => w.target_officer_id === selectedOfficer.id).length === 0 ? (
                  <div className="p-3 bg-[#F4F7FB] rounded-xl text-center text-3xs text-slate-600">
                    No active warrants or show-cause notices against this officer.
                  </div>
                ) : (
                  warrants
                    .filter((w) => w.target_officer_id === selectedOfficer.id)
                    .map((w) => (
                      <div key={w.id} className="p-3 bg-[#F4F7FB] border border-slate-200 rounded-xl flex items-center justify-between text-2xs">
                        <div>
                          <div className="font-mono font-bold text-rose-700">{w.warrant_number}</div>
                          <div className="text-slate-600 text-3xs line-clamp-1">{w.charges_summary}</div>
                        </div>
                        <button
                          onClick={() => handleDownloadWarrant(w.id, w.warrant_number)}
                          disabled={downloadingWarrantId === w.id}
                          className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-3xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          {downloadingWarrantId === w.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileDown className="w-3 h-3" />}
                          <span>PDF</span>
                        </button>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedOfficer(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
