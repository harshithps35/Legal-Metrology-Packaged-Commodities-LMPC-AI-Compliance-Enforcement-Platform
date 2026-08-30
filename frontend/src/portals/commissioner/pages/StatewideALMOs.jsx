import React, { useState, useEffect } from 'react';
import {
  Users,
  MapPin,
  Mail,
  Phone,
  ShieldCheck,
  Award,
  Search,
  CheckCircle2,
  Calendar,
  Building2,
  FileText,
  Loader2,
  Activity,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Gavel,
  Download,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { supervisorAPI } from '../../../services/api';
import toast from 'react-hot-toast';

export default function StatewideALMOs() {
  const [almos, setAlmos] = useState([]);
  const [warrants, setWarrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedOfficer, setSelectedOfficer] = useState(null);

  // Warrant Modal State
  const [warrantTargetAlmo, setWarrantTargetAlmo] = useState(null);
  const [warrantForm, setWarrantForm] = useState({
    warrant_type: 'SHOW_CAUSE_WARRANT',
    charges_summary: '',
    statutory_grounds: 'Section 48 & 52 Legal Metrology Act 2009 — Mandatory Commissioner apex oversight regarding visit sanctioning performance and inspection integrity.',
    action_mandated: 'Submit formal statutory justification within 7 business days or face immediate jurisdiction suspension.',
    hearing_deadline_days: 7,
  });
  const [servingWarrant, setServingWarrant] = useState(false);
  const [downloadingWarrantId, setDownloadingWarrantId] = useState(null);

  useEffect(() => {
    fetchALMOs();
    fetchWarrants();
  }, []);

  const fetchALMOs = async () => {
    try {
      setLoading(true);
      const res = await supervisorAPI.getALMOs();
      setAlmos(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load statewide ALMO officers directory');
    } finally {
      setLoading(false);
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
    if (!warrantTargetAlmo) return;
    try {
      setServingWarrant(true);
      const res = await supervisorAPI.issueWarrant({
        target_officer_id: warrantTargetAlmo.id,
        ...warrantForm,
      });
      toast.success(res.data?.message || 'Apex Statutory Warrant officially served against ALMO!');
      const wId = res.data?.warrant_id;
      const wNum = res.data?.warrant_number;
      setWarrantTargetAlmo(null);
      fetchWarrants();
      fetchALMOs();
      if (wId) {
        handleDownloadWarrant(wId, wNum);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to serve statutory warrant.');
    } finally {
      setServingWarrant(false);
    }
  };

  const filtered = almos.filter((a) => {
    const matchSearch =
      (a.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.unique_login_id || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.jurisdiction_zone || '').toLowerCase().includes(search.toLowerCase());

    if (!matchSearch) return false;
    if (selectedZone === 'all') return true;
    if (selectedZone === 'noida') return (a.jurisdiction_zone || '').toLowerCase().includes('noida');
    if (selectedZone === 'delhi') return (a.jurisdiction_zone || '').toLowerCase().includes('delhi');
    if (selectedZone === 'mumbai') return (a.jurisdiction_zone || '').toLowerCase().includes('mumbai');
    if (selectedZone === 'bangalore') return (a.jurisdiction_zone || '').toLowerCase().includes('bengaluru') || (a.jurisdiction_zone || '').toLowerCase().includes('bangalore');
    return true;
  });

  return (
    <div className="space-y-6 text-slate-800">
      {/* Official Directorate Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-500/30 rounded-3xl p-6 sm:p-7 shadow-xl text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-radial from-blue-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-300">
                <Users className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-black tracking-tight text-white">
                Statewide ALMO Sanctioning Officers Directory
              </h1>
              <span className="text-3xs font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-500/40 font-mono">
                Level 1 Apex Directorate Oversight
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Assistant Legal Metrology Officers (Level 3) sanctioning on-site field visits and reviewing VIR compliance dossiers across all state districts. State Commissioner can issue statutory warrants or disciplinary inquiries under Section 48 & 52.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <div className="bg-white/10 text-white border border-white/20 px-3.5 py-2 rounded-xl font-bold font-mono text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Commissioned: {almos.length}</span>
            </div>
            <button
              onClick={fetchALMOs}
              className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white transition-all cursor-pointer"
              title="Refresh"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-3xs font-bold text-slate-500 uppercase tracking-wider">Total Commissioned ALMOs</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{almos.length}</div>
            <div className="text-3xs text-slate-400 font-medium mt-0.5">Level 3 Regional Authorities</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-3xs font-bold text-slate-500 uppercase tracking-wider">Active Warrants / Inquiries</div>
            <div className="text-2xl font-black text-rose-600 mt-1">{warrants.length}</div>
            <div className="text-3xs text-rose-500 font-medium mt-0.5">Inquiry Dossiers Served</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-3xs font-bold text-slate-500 uppercase tracking-wider">Statutory Hierarchy</div>
            <div className="text-2xl font-black text-indigo-700 mt-1">Level 3</div>
            <div className="text-3xs text-indigo-600 font-medium mt-0.5">Subordinate to CLMO</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-3xs font-bold text-slate-500 uppercase tracking-wider">Operational Status</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">100%</div>
            <div className="text-3xs text-emerald-600 font-medium mt-0.5">Active & Authorized</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Zone Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {[
            { id: 'all', label: `All Jurisdictions (${almos.length})` },
            { id: 'noida', label: 'Noida NCR' },
            { id: 'delhi', label: 'Delhi Central' },
            { id: 'mumbai', label: 'Mumbai Western' },
            { id: 'bangalore', label: 'Bangalore Southern' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedZone(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                selectedZone === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search ALMO name, Unique ID, email, zone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-medium pl-9 pr-3 py-2 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Officers Card Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-500 bg-white rounded-3xl border border-slate-200 font-medium">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <span className="text-xs font-bold text-slate-700">Loading statewide ALMO officers directory...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-16 text-center text-slate-500 bg-white rounded-3xl border border-slate-200 font-medium space-y-2">
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <div className="font-bold text-slate-800 text-sm">No ALMO Officers Found</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No Assistant Legal Metrology Officers matched your search criteria or jurisdictional zone.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((officer) => (
            <div
              key={officer.id}
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                {/* Badge Header */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-black text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg">
                    {officer.unique_login_id}
                  </span>
                  <span className="text-3xs font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 font-mono">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Level 3 Sanctioner</span>
                  </span>
                </div>

                {/* Officer Name & Title */}
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight group-hover:text-blue-700 transition-colors">
                    {officer.full_name}
                  </h3>
                  <p className="text-2xs text-slate-500 font-medium mt-0.5">
                    {officer.department || 'Regional Sanctioning Office'}
                  </p>
                </div>

                {/* Details List */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 space-y-2 text-2xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="truncate font-semibold">{officer.jurisdiction_zone || 'Regional District'}</span>
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
                <button
                  type="button"
                  onClick={() => setSelectedOfficer(officer)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-2xs font-bold transition-all cursor-pointer"
                >
                  View Profile
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setWarrantTargetAlmo(officer);
                    setWarrantForm((prev) => ({
                      ...prev,
                      charges_summary: `Apex Commissioner Inquiry: Audit review of visit sanctioning performance for ${officer.full_name} (${officer.unique_login_id}) in ${officer.jurisdiction_zone}.`,
                    }));
                  }}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-2xs font-black transition-all cursor-pointer flex items-center gap-1"
                >
                  <Gavel className="w-3 h-3 text-rose-600" />
                  <span>Issue Warrant</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Warrant Modal */}
      {warrantTargetAlmo && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-fade-in text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 font-black text-base text-rose-950">
                <Gavel className="w-5 h-5 text-rose-600" />
                <span>Issue Commissioner Statutory Warrant / Show-Cause</span>
              </div>
              <button
                onClick={() => setWarrantTargetAlmo(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleIssueWarrant} className="space-y-4 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                <span className="font-black text-slate-900 block text-xs">
                  Target: {warrantTargetAlmo.full_name} ({warrantTargetAlmo.unique_login_id})
                </span>
                <span className="text-3xs text-slate-500 font-mono">
                  District: {warrantTargetAlmo.jurisdiction_zone} • {warrantTargetAlmo.email}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800 uppercase text-2xs">
                  Warrant Classification *
                </label>
                <select
                  value={warrantForm.warrant_type}
                  onChange={(e) => setWarrantForm({ ...warrantForm, warrant_type: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-bold p-2.5 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-rose-500"
                >
                  <option value="SHOW_CAUSE_WARRANT">Show-Cause Warrant (Section 48 Inquiry)</option>
                  <option value="INQUIRY_NOTICE">Formal Inspection Performance Inquiry Notice</option>
                  <option value="SANCTION_COMPLIANCE_ORDER">Sanction Compliance Audit Order</option>
                </select>
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
                  placeholder="Enter specific regulatory grounds or sanction audit discrepancies..."
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setWarrantTargetAlmo(null)}
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

      {/* Officer Details Modal */}
      {selectedOfficer && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in text-slate-800 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 font-black text-slate-900 text-sm">
                <Users className="w-4 h-4 text-blue-600" />
                <span>ALMO Officer Profile Dossier</span>
              </div>
              <button
                onClick={() => setSelectedOfficer(null)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl space-y-1">
                <span className="font-mono text-3xs font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                  {selectedOfficer.unique_login_id}
                </span>
                <h4 className="text-base font-black text-slate-900">{selectedOfficer.full_name}</h4>
                <p className="text-2xs text-slate-500">{selectedOfficer.department}</p>
              </div>

              <div className="space-y-1.5 text-2xs">
                <div className="flex justify-between border-b border-slate-100 py-1">
                  <span className="text-slate-500 font-bold">District / Zone:</span>
                  <span className="font-extrabold text-slate-900">{selectedOfficer.jurisdiction_zone}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 py-1">
                  <span className="text-slate-500 font-bold">Official Email:</span>
                  <span className="font-mono text-slate-900">{selectedOfficer.email}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 py-1">
                  <span className="text-slate-500 font-bold">Contact Phone:</span>
                  <span className="font-mono text-slate-900">{selectedOfficer.phone_number || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-bold">Hierarchy Authority:</span>
                  <span className="font-bold text-emerald-700">Level 3 Assistant Controller</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedOfficer(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
