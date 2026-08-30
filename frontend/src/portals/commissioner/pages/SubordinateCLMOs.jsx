import React, { useState, useEffect } from 'react';
import {
  Users,
  Award,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  UserPlus,
  Loader2,
  Clock,
  ArrowRight,
  Sparkles,
  Layers,
  Activity,
  PlusCircle,
  Scale,
  Gavel,
  Eye,
  Check,
  UserCheck,
  RotateCcw,
} from 'lucide-react';
import { commissionerAPI, supervisorAPI } from '../../../services/api';
import toast from 'react-hot-toast';

export default function SubordinateCLMOs() {
  const [clmos, setClmos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedZone, setSelectedZone] = useState('ALL');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'pending' | 'active'

  // Modals
  const [approvingClmo, setApprovingClmo] = useState(null);
  const [rejectingClmo, setRejectingClmo] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showDirectCommissionModal, setShowDirectCommissionModal] = useState(false);
  const [selectedProfileClmo, setSelectedProfileClmo] = useState(null);

  // Warrant Modal State
  const [warrantTargetClmo, setWarrantTargetClmo] = useState(null);
  const [warrantForm, setWarrantForm] = useState({
    warrant_type: 'SHOW_CAUSE_WARRANT',
    charges_summary: '',
    statutory_grounds: 'Section 48 & 52 Legal Metrology Act 2009 — Mandatory Commissioner oversight regarding pre-market clearance decisions and subordinate ALMO management.',
    action_mandated: 'Submit formal statutory explanation within 7 business days or face immediate gazetted suspension.',
    hearing_deadline_days: 7,
  });
  const [servingWarrant, setServingWarrant] = useState(false);

  // Approval Form State
  const [approvalForm, setApprovalForm] = useState({
    custom_unique_id: '',
    jurisdiction_zone: '',
    gazette_order_ref: '',
    commissioner_remarks: '',
  });
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  // Direct Commissioning Form
  const [directForm, setDirectForm] = useState({
    full_name: '',
    email: '',
    phone_number: '+91 ',
    password: 'supervisor123',
    jurisdiction_zone: 'North Zone Directorate (Delhi NCR)',
    department: 'Department of Consumer Affairs / Legal Metrology Directorate',
    custom_unique_id: '',
    commissioner_remarks: 'Direct Commissioning by State Legal Metrology Commissioner under Section 13(1).',
  });
  const [commissioning, setCommissioning] = useState(false);

  useEffect(() => {
    fetchCLMOs();
  }, []);

  const handleIssueWarrant = async (e) => {
    e.preventDefault();
    if (!warrantTargetClmo) return;

    try {
      setServingWarrant(true);
      const res = await supervisorAPI.issueWarrant({
        target_officer_id: warrantTargetClmo.id,
        ...warrantForm,
      });
      toast.success(res.data?.message || 'Apex Statutory Warrant served against CLMO!');
      setWarrantTargetClmo(null);
      fetchCLMOs();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to issue warrant on CLMO');
    } finally {
      setServingWarrant(false);
    }
  };

  const fetchCLMOs = async () => {
    try {
      setLoading(true);
      const res = await commissionerAPI.getCLMOs();
      setClmos(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load subordinate CLMO directory');
    } finally {
      setLoading(false);
    }
  };

  const pendingCLMOs = clmos.filter((c) => !c.is_approved);
  const activeCLMOs = clmos.filter((c) => c.is_approved);

  const filteredCLMOs = clmos.filter((c) => {
    const matchesSearch =
      c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.unique_login_id?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.jurisdiction_zone?.toLowerCase().includes(search.toLowerCase());

    const matchesZone =
      selectedZone === 'ALL' ||
      (c.jurisdiction_zone && c.jurisdiction_zone.toLowerCase().includes(selectedZone.toLowerCase()));

    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'pending' && !c.is_approved) ||
      (activeTab === 'active' && c.is_approved);

    return matchesSearch && matchesZone && matchesTab;
  });

  const handleOpenApproveModal = (clmo) => {
    setApprovingClmo(clmo);
    setApprovalForm({
      custom_unique_id: clmo.unique_login_id || '',
      jurisdiction_zone: clmo.jurisdiction_zone || 'North Zone Directorate (Delhi NCR)',
      gazette_order_ref: `DLM/CLMO/COMM/2026/${clmo.id.toString().padStart(4, '0')}`,
      commissioner_remarks: 'Commissioned under Section 13(1) of Legal Metrology Act 2009 with Level 2 Adjudication & Pre-Market Clearance Authority.',
    });
  };

  const handleExecuteApproval = async (e) => {
    e.preventDefault();
    if (!approvingClmo) return;

    try {
      setApproving(true);
      const res = await commissionerAPI.approveCLMO(approvingClmo.id, approvalForm);
      toast.success(res.data?.message || `CLMO ${approvingClmo.full_name} officially commissioned & approved!`);
      setApprovingClmo(null);
      fetchCLMOs();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to approve CLMO');
    } finally {
      setApproving(false);
    }
  };

  const handleExecuteRejection = async (e) => {
    e.preventDefault();
    if (!rejectingClmo) return;
    if (rejectionReason.trim().length < 10) {
      toast.error('Please enter a valid rejection reason (min 10 characters).');
      return;
    }

    try {
      setRejecting(true);
      const res = await commissionerAPI.rejectCLMO(rejectingClmo.id, { reason: rejectionReason });
      toast.success(res.data?.message || 'CLMO application rejected.');
      setRejectingClmo(null);
      setRejectionReason('');
      fetchCLMOs();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to reject CLMO application');
    } finally {
      setRejecting(false);
    }
  };

  const handleDirectCommission = async (e) => {
    e.preventDefault();
    if (!directForm.full_name || !directForm.email) {
      toast.error('Please fill in required officer details.');
      return;
    }

    try {
      setCommissioning(true);
      const res = await commissionerAPI.commissionCLMO(directForm);
      toast.success(res.data?.message || `CLMO ${directForm.full_name} commissioned successfully!`);
      setShowDirectCommissionModal(false);
      setDirectForm({
        full_name: '',
        email: '',
        phone_number: '+91 ',
        password: 'supervisor123',
        jurisdiction_zone: 'North Zone Directorate (Delhi NCR)',
        department: 'Department of Consumer Affairs / Legal Metrology Directorate',
        custom_unique_id: '',
        commissioner_remarks: 'Direct Commissioning by State Legal Metrology Commissioner under Section 13(1).',
      });
      fetchCLMOs();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to commission new CLMO');
    } finally {
      setCommissioning(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* Official Government Directorate Header */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-500/30 rounded-3xl p-6 sm:p-7 shadow-xl text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-radial from-blue-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-300">
                <Award className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-black tracking-tight text-white">
                Chief Legal Metrology Officers (CLMOs) Directory
              </h1>
              <span className="text-3xs font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-500/40 font-mono">
                Level 1 Apex Directorate
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Official roster of Commissioned Adjudicating Authorities (Level 2) and Regional Directorate Heads operating under the executive authority of the State Commissioner.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setShowDirectCommissionModal(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-600/30 flex items-center gap-2 cursor-pointer transition-all shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Directly Commission New CLMO</span>
            </button>
            <button
              onClick={fetchCLMOs}
              className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white transition-all cursor-pointer"
              title="Refresh Roster"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Counters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-3xs font-bold text-slate-500 uppercase tracking-wider">Commissioned CLMOs</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{activeCLMOs.length}</div>
            <div className="text-3xs text-emerald-600 font-medium mt-0.5">Active Adjudicators</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-3xs font-bold text-slate-500 uppercase tracking-wider">Pending Sanction Gate</div>
            <div className="text-2xl font-black text-amber-600 mt-1">{pendingCLMOs.length}</div>
            <div className="text-3xs text-amber-600 font-medium mt-0.5">Awaiting Commissioner</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-3xs font-bold text-slate-500 uppercase tracking-wider">Zonal Jurisdictions</div>
            <div className="text-2xl font-black text-indigo-700 mt-1">
              {new Set(clmos.map((c) => c.jurisdiction_zone)).size || 1}
            </div>
            <div className="text-3xs text-indigo-600 font-medium mt-0.5">State Directorate Zones</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold">
            <MapPin className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-3xs font-bold text-slate-500 uppercase tracking-wider">Statutory Rank</div>
            <div className="text-2xl font-black text-purple-700 mt-1">Level 2</div>
            <div className="text-3xs text-purple-600 font-medium mt-0.5">Section 13(1) Authority</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center font-bold">
            <Scale className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Pending Approvals Alert Banner */}
      {pendingCLMOs.length > 0 && activeTab !== 'pending' && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-black text-amber-950">
                {pendingCLMOs.length} Candidate CLMO Dossier{pendingCLMOs.length > 1 ? 's' : ''} Awaiting Commissioner Sanction
              </div>
              <div className="text-xs text-amber-800">
                New candidate officers require official gazetted commissioning to issue packaging clearance certificates.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
          >
            <span>Review Applicants ({pendingCLMOs.length}) &rarr;</span>
          </button>
        </div>
      )}

      {/* Controls & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Officers ({clmos.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Gate ({pendingCLMOs.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'active'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Active Commissioned ({activeCLMOs.length})
          </button>
        </div>

        {/* Search & Zone Dropdown */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search CLMO name, ID, email, zone..."
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-medium pl-9 pr-3 py-2 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL">All State Zones</option>
              <option value="North">North Zone (Delhi NCR)</option>
              <option value="South">South Zone</option>
              <option value="East">East Zone</option>
              <option value="West">West Zone</option>
            </select>
          </div>
        </div>
      </div>

      {/* CLMO Roster Cards Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-500 bg-white rounded-3xl border border-slate-200 font-medium">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <span className="text-xs font-bold text-slate-700">Loading commissioned CLMO roster...</span>
        </div>
      ) : filteredCLMOs.length === 0 ? (
        <div className="p-16 text-center text-slate-500 bg-white rounded-3xl border border-slate-200 font-medium space-y-2">
          <UserCheck className="w-10 h-10 text-slate-300 mx-auto" />
          <div className="font-bold text-slate-800 text-sm">No CLMO Officers Found</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {activeTab === 'pending'
              ? 'There are currently no new CLMO applicants pending commissioner approval.'
              : 'No commissioned officers matched your search criteria.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCLMOs.map((officer) => (
            <div
              key={officer.id}
              className={`bg-white border rounded-3xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group ${
                !officer.is_approved ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="space-y-3">
                {/* Badge Header */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-black text-purple-900 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-lg">
                    {officer.unique_login_id}
                  </span>
                  <span className={`text-3xs font-bold uppercase px-2.5 py-0.5 rounded-full border flex items-center gap-1 font-mono ${
                    officer.is_approved
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}>
                    {officer.is_approved ? (
                      <>
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>Commissioned L2</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>Pending Approval</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Name and Designation */}
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight group-hover:text-blue-700 transition-colors">
                    {officer.full_name}
                  </h3>
                  <p className="text-2xs text-slate-500 font-medium mt-0.5">
                    {officer.department || 'Department of Consumer Affairs'}
                  </p>
                </div>

                {/* Details List */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 space-y-2 text-2xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="truncate font-semibold">{officer.jurisdiction_zone || 'Statewide Zone'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="font-mono truncate">{officer.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{officer.phone_number || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                {!officer.is_approved ? (
                  <div className="flex items-center gap-2 w-full">
                    <button
                      type="button"
                      onClick={() => handleOpenApproveModal(officer)}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve & Commission</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectingClmo(officer)}
                      className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold cursor-pointer"
                      title="Reject"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedProfileClmo(officer)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-2xs font-bold transition-all cursor-pointer"
                    >
                      View Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setWarrantTargetClmo(officer);
                        setWarrantForm((prev) => ({
                          ...prev,
                          charges_summary: `Apex Commissioner Inquiry: Audit review of adjudication clearance decisions for ${officer.full_name} (${officer.unique_login_id}).`,
                        }));
                      }}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-2xs font-black transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Gavel className="w-3 h-3 text-rose-600" />
                      <span>Issue Warrant</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Direct Commissioning Modal */}
      {showDirectCommissionModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl animate-fade-in text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 font-black text-base text-slate-900">
                <PlusCircle className="w-5 h-5 text-blue-600" />
                <span>Directly Commission New CLMO Post</span>
              </div>
              <button
                onClick={() => setShowDirectCommissionModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDirectCommission} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block font-bold text-slate-800 uppercase text-2xs">
                  Full Officer Name & Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Rajeshwari Sundaram, Joint Controller"
                  value={directForm.full_name}
                  onChange={(e) => setDirectForm({ ...directForm, full_name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-800 uppercase text-2xs">
                  Official Directorate Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. clmo.south.lmpc@gmail.com"
                  value={directForm.email}
                  onChange={(e) => setDirectForm({ ...directForm, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-800 uppercase text-2xs">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={directForm.phone_number}
                    onChange={(e) => setDirectForm({ ...directForm, phone_number: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-800 uppercase text-2xs">
                    Zonal Directorate *
                  </label>
                  <select
                    value={directForm.jurisdiction_zone}
                    onChange={(e) => setDirectForm({ ...directForm, jurisdiction_zone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="North Zone Directorate (Delhi NCR)">North Zone (Delhi NCR)</option>
                    <option value="South Zone Directorate (Bengaluru / Chennai)">South Zone (Bengaluru / Chennai)</option>
                    <option value="West Zone Directorate (Mumbai / Pune)">West Zone (Mumbai / Pune)</option>
                    <option value="East Zone Directorate (Kolkata / Patna)">East Zone (Kolkata / Patna)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowDirectCommissionModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={commissioning}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black shadow-md shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  {commissioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>Issue Gazette Commissioning</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Warrant Modal */}
      {warrantTargetClmo && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-fade-in text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 font-black text-base text-rose-950">
                <Gavel className="w-5 h-5 text-rose-600" />
                <span>Issue Commissioner Statutory Warrant / Show-Cause</span>
              </div>
              <button
                onClick={() => setWarrantTargetClmo(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleIssueWarrant} className="space-y-4 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                <span className="font-black text-slate-900 block text-xs">
                  Target: {warrantTargetClmo.full_name} ({warrantTargetClmo.unique_login_id})
                </span>
                <span className="text-3xs text-slate-500 font-mono">
                  Zone: {warrantTargetClmo.jurisdiction_zone} • {warrantTargetClmo.email}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800 uppercase text-2xs">
                  Charges / Grounds Summary *
                </label>
                <textarea
                  rows={3}
                  required
                  value={warrantForm.charges_summary}
                  onChange={(e) => setWarrantForm({ ...warrantForm, charges_summary: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium p-2.5 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-rose-500"
                  placeholder="Enter specific regulatory grounds or adjudication audit discrepancies..."
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setWarrantTargetClmo(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={servingWarrant}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs shadow-md shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  {servingWarrant ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gavel className="w-4 h-4" />}
                  <span>Sign & Serve Statutory Warrant</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {approvingClmo && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-fade-in text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 font-black text-base text-emerald-950">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Sanction & Commission CLMO Candidate</span>
              </div>
              <button
                onClick={() => setApprovingClmo(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteApproval} className="space-y-4 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 space-y-1">
                <span className="font-black text-emerald-950 block text-xs">
                  Candidate: {approvingClmo.full_name}
                </span>
                <span className="text-3xs text-emerald-800 font-mono">
                  Email: {approvingClmo.email} • Phone: {approvingClmo.phone_number}
                </span>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-800 uppercase text-2xs">
                  Gazette Order Reference Number
                </label>
                <input
                  type="text"
                  value={approvalForm.gazette_order_ref}
                  onChange={(e) => setApprovalForm({ ...approvalForm, gazette_order_ref: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-mono text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-800 uppercase text-2xs">
                  Commissioner Sanction Remarks
                </label>
                <textarea
                  rows={2}
                  value={approvalForm.commissioner_remarks}
                  onChange={(e) => setApprovalForm({ ...approvalForm, commissioner_remarks: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setApprovingClmo(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={approving}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-md shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>Grant Commissioning Sanction</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
