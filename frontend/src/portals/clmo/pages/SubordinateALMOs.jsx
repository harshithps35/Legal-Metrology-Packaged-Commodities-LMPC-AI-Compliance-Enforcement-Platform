import React, { useState, useEffect } from 'react';
import {
  Users,
  MapPin,
  Mail,
  Phone,
  ShieldCheck,
  ShieldAlert,
  Award,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Building2,
  FileText,
  UserPlus,
  Loader2,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { supervisorAPI } from '../../../services/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function SubordinateALMOs() {
  const [almos, setAlmos] = useState([]);
  const [warrants, setWarrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const navigate = useNavigate();

  // Warrant Modal State
  const [warrantTargetAlmo, setWarrantTargetAlmo] = useState(null);
  const [warrantForm, setWarrantForm] = useState({
    warrant_type: 'SHOW_CAUSE_WARRANT',
    charges_summary: '',
    statutory_grounds: 'Section 48 & 52 Legal Metrology Act 2009 — Failure to sanction mandatory field visit orders or unexplained delays in VIR verification.',
    action_mandated: 'Submit written statutory explanation within 7 business days or face formal jurisdiction suspension.',
    hearing_deadline_days: 7,
  });
  const [servingWarrant, setServingWarrant] = useState(false);

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
      toast.error('Failed to load subordinate ALMO officers');
    } finally {
      setLoading(false);
    }
  };

  const [downloadingWarrantId, setDownloadingWarrantId] = useState(null);

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
      toast.success(`Official Supervisory Warrant ${warrantNum || warrantId} PDF exported successfully!`);
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
      toast.success(res.data?.message || 'Supervisory Warrant officially served against ALMO!');
      const wId = res.data?.warrant_id;
      const wNum = res.data?.warrant_number;
      setWarrantTargetAlmo(null);
      fetchWarrants();
      fetchALMOs();
      if (wId) {
        await handleDownloadWarrant(wId, wNum);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to issue warrant on ALMO');
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

    const matchDistrict =
      selectedDistrict === 'all' ||
      (a.jurisdiction_zone || '').toLowerCase().includes(selectedDistrict.toLowerCase());

    return matchSearch && matchDistrict;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-md text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 text-indigo-300 font-bold text-lg mb-1">
            <Users className="w-6 h-6 text-indigo-400" />
            <span>Subordinate ALMO Sanctioning Officers Directory</span>
          </div>
          <p className="text-sm text-slate-200">
            Assistant Legal Metrology Officers (Level 3) operating under the statutory supervision of the Chief Legal Metrology Officer (CLMO). CLMOs can commission new officers or serve supervisory warrants for performance inquiries.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/clmo/commissioning')}
            className="py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md shadow-amber-600/30 flex items-center gap-2 transition-all cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Approve / Commission ALMO</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-3xs font-bold text-slate-400 uppercase tracking-wider">Subordinate ALMOs</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{almos.length}</div>
            <div className="text-3xs text-indigo-600 font-semibold mt-0.5">Assigned Officers</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-3xs font-bold text-slate-400 uppercase tracking-wider">Supervisory Warrants</div>
            <div className="text-2xl font-black text-rose-700 mt-1">{warrants.length}</div>
            <div className="text-3xs text-rose-600 font-semibold mt-0.5">Inquiries Active</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-3xs font-bold text-slate-400 uppercase tracking-wider">Operational Standing</div>
            <div className="text-2xl font-black text-emerald-700 mt-1">100%</div>
            <div className="text-3xs text-emerald-600 font-semibold mt-0.5">Authorized & Commissioned</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-3xs font-bold text-slate-400 uppercase tracking-wider">Hierarchy Position</div>
            <div className="text-2xl font-black text-indigo-900 mt-1">Level 3</div>
            <div className="text-3xs text-indigo-600 font-semibold mt-0.5">Subordinate to CLMO</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search subordinate ALMO by name, Unique ID, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-semibold pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All District Jurisdictions</option>
            <option value="noida">Noida / Greater Noida</option>
            <option value="delhi">Delhi Districts</option>
            <option value="bengaluru">Bengaluru Urban</option>
            <option value="mumbai">Mumbai Central</option>
            <option value="gurugram">Gurugram / Manesar</option>
          </select>
        </div>
      </div>

      {/* Subordinate ALMOs Cards Grid */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center text-slate-500 font-medium shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-3" />
          <div className="font-bold text-slate-700">Loading Subordinate ALMO Officers...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-500 font-medium shadow-sm">
          No ALMO officers found matching the filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((a) => (
            <div
              key={a.id}
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-amber-800 text-xs bg-amber-50 border border-amber-300 px-2.5 py-0.5 rounded-lg">
                        {a.unique_login_id}
                      </span>
                      <span className="font-black text-slate-900 text-base">{a.full_name}</span>
                    </div>
                    <div className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{a.email}</span>
                    </div>
                    <div className="text-2xs text-slate-500 flex items-center gap-1.5 font-medium">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{a.phone_number}</span>
                    </div>
                  </div>

                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-3xs font-black px-2.5 py-1 rounded-full uppercase shrink-0">
                    LEVEL 3 SANCTIONER
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-3xs font-bold text-slate-400 uppercase block">District Jurisdiction</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5 text-2xs">
                      <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{a.jurisdiction_zone}</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-3xs font-bold text-slate-400 uppercase block">Commissioned Authority</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5 text-2xs">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>{a.created_at}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer: Mandate & Warrant Button */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-2xs gap-2">
                <span className="text-slate-500 font-medium">
                  Statutory Mandate: <strong className="text-slate-700">Visit Orders & VIR Attestation</strong>
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setWarrantTargetAlmo(a);
                    setWarrantForm({
                      warrant_type: 'SHOW_CAUSE_WARRANT',
                      charges_summary: `Supervisory Inquiry on Inspection Turnaround for ${a.full_name} (${a.unique_login_id})`,
                      statutory_grounds: 'Section 48 & 52 Legal Metrology Act 2009 — Mandatory supervisory review regarding field visit order issuance and diligence in VIR approval.',
                      action_mandated: 'Submit written statutory explanation within 7 business days or face jurisdiction suspension.',
                      hearing_deadline_days: 7,
                    });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 text-2xs font-extrabold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  <span>File Warrant / Inquiry</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: File Statutory Warrant on ALMO */}
      {warrantTargetAlmo && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-rose-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 border border-rose-300 flex items-center justify-center font-bold">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Serve Supervisory Warrant / Inquiry Notice
                  </h3>
                  <div className="text-2xs font-mono text-rose-700 font-bold">
                    Target: {warrantTargetAlmo.full_name} ({warrantTargetAlmo.unique_login_id}) • Level 3 ALMO
                  </div>
                </div>
              </div>
              <button
                onClick={() => setWarrantTargetAlmo(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleIssueWarrant} className="space-y-3.5 text-xs">
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl space-y-1">
                <div className="text-2xs font-bold text-rose-900 uppercase tracking-wide">
                  CLMO Supervisory Prerogative (Level 2)
                </div>
                <p className="text-3xs text-slate-600 leading-relaxed">
                  Under Section 13(2) of the Legal Metrology Act 2009, the Chief Legal Metrology Officer may issue formal Inquiry Notices, Show-Cause Warrants, or Sanction Review Orders against subordinate ALMOs for undue delay or failure to enforce field visit mandates.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">Warrant Classification *</label>
                <select
                  value={warrantForm.warrant_type}
                  onChange={(e) => setWarrantForm({ ...warrantForm, warrant_type: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 p-2.5 rounded-xl font-medium"
                >
                  <option value="SHOW_CAUSE_WARRANT">Formal Show-Cause Warrant & Explanation Order</option>
                  <option value="STATUTORY_INQUIRY">Field Visit Sanction Performance Inquiry</option>
                  <option value="SUSPENSION_ORDER">Suspension of Visit Sanctioning Authority</option>
                  <option value="AUDIT_SUBPOENA">Audit Subpoena of Inspection Registers</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">Charges & Inquiry Summary *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Failure to sanction visit orders on high-severity price tampering infractions."
                  value={warrantForm.charges_summary}
                  onChange={(e) => setWarrantForm({ ...warrantForm, charges_summary: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 p-2.5 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">Statutory Grounds & Act References *</label>
                <textarea
                  rows={2}
                  required
                  value={warrantForm.statutory_grounds}
                  onChange={(e) => setWarrantForm({ ...warrantForm, statutory_grounds: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 p-2.5 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">Hearing / Reply SLA Deadline</label>
                  <select
                    value={warrantForm.hearing_deadline_days}
                    onChange={(e) => setWarrantForm({ ...warrantForm, hearing_deadline_days: parseInt(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 p-2.5 rounded-xl font-medium"
                  >
                    <option value={3}>3 Business Days (Urgent)</option>
                    <option value={7}>7 Business Days (Standard)</option>
                    <option value={14}>14 Business Days (Detailed Inquiry)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">Action Mandated</label>
                  <input
                    type="text"
                    value={warrantForm.action_mandated}
                    onChange={(e) => setWarrantForm({ ...warrantForm, action_mandated: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 p-2.5 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setWarrantTargetAlmo(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={servingWarrant}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black shadow-md shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  {servingWarrant ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                  <span>Sign & Serve Warrant</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
