import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Award,
  Building2,
  Mail,
  Phone,
  Lock,
  MapPin,
  CheckCircle2,
  Loader2,
  KeyRound,
  Send,
  Eye,
  Check,
  XCircle,
  Clock,
  RotateCcw,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { supervisorAPI } from '../../../services/api';
import toast from 'react-hot-toast';

export default function CLMOCommissioning() {
  const [almos, setAlmos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  // ALMO Direct Commission Form
  const [almoForm, setAlmoForm] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    jurisdiction_zone: 'Noida / Greater Noida District Office',
    password: 'almopassword123',
    custom_unique_id: '',
    warrant_notes: 'Officially approved by CLMO as Regional Visit Sanctioning Authority (Level 3).',
  });

  useEffect(() => {
    fetchALMOs();
  }, []);

  const fetchALMOs = async () => {
    try {
      setLoading(true);
      const res = await supervisorAPI.getALMOs();
      setAlmos(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load ALMO officers directory');
    } finally {
      setLoading(false);
    }
  };

  const getALMODistCode = (zone) => {
    if (zone.includes('Delhi') || zone.includes('Azadpur')) return 'DEL';
    if (zone.includes('Bengaluru') || zone.includes('Bangalore')) return 'BLR';
    if (zone.includes('Mumbai') || zone.includes('Pune')) return 'MUM';
    if (zone.includes('Kolkata') || zone.includes('Patna')) return 'KOL';
    if (zone.includes('Gurugram') || zone.includes('Manesar')) return 'GGN';
    return 'NOI';
  };

  const previewALMOId = almoForm.custom_unique_id.trim()
    ? almoForm.custom_unique_id.toUpperCase()
    : `ALMO-${getALMODistCode(almoForm.jurisdiction_zone)}-${String(almos.length + 1).padStart(3, '0')}`;

  const handleApproveALMO = async (almoId, almoName) => {
    try {
      setProcessingId(almoId);
      await supervisorAPI.approveALMO(almoId);
      toast.success(`ALMO Officer ${almoName} officially approved & commissioned!`);
      await fetchALMOs();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to approve ALMO officer.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCommissionALMO = async (e) => {
    e.preventDefault();
    if (!almoForm.full_name || !almoForm.email) {
      toast.error('Please fill in required ALMO candidate credentials.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...almoForm,
        custom_unique_id: previewALMOId,
      };
      await supervisorAPI.commissionALMO(payload);
      toast.success(`New ALMO ${payload.full_name} commissioned under ID ${previewALMOId}! 🎉`);
      setAlmoForm({
        full_name: '',
        email: '',
        phone_number: '',
        jurisdiction_zone: 'Noida / Greater Noida District Office',
        password: 'almopassword123',
        custom_unique_id: '',
        warrant_notes: 'Officially approved by CLMO as Regional Visit Sanctioning Authority (Level 3).',
      });
      await fetchALMOs();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to commission ALMO.');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingALMOs = almos.filter((a) => a.is_approved === false);
  const activeALMOs = almos.filter((a) => a.is_approved !== false);

  return (
    <div className="space-y-6">
      {/* Official CLMO Verification Header */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border border-purple-500/30 rounded-3xl p-6 sm:p-7 shadow-xl text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-radial from-purple-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300">
                <Award className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-black tracking-tight text-white">
                Subordinate ALMO Statutory Verification & Commissioning Desk
              </h1>
              <span className="text-3xs font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-500/40 font-mono">
                Level 2 CLMO Authority
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Statutory adjudication portal for the <strong>Chief Legal Metrology Officer (CLMO)</strong> to review, verify credentials, and sanction appointments for Assistant Legal Metrology Officers (ALMOs - Level 3) across regional district offices.
            </p>
          </div>

          <button
            onClick={fetchALMOs}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm self-start md:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh Roster</span>
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="text-3xs font-black uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Pending ALMO Approvals</span>
          </div>
          <div className="text-2xl font-black text-amber-900">{pendingALMOs.length}</div>
          <div className="text-3xs text-amber-700 font-medium">Awaiting CLMO Sanction</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="text-3xs font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Commissioned ALMOs</span>
          </div>
          <div className="text-2xl font-black text-emerald-900">{activeALMOs.length}</div>
          <div className="text-3xs text-emerald-700 font-medium">Active Sanctioning Officers</div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="text-3xs font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-indigo-600" />
            <span>District Sanctioning Zones</span>
          </div>
          <div className="text-2xl font-black text-indigo-900">
            {new Set(almos.map((a) => a.jurisdiction_zone)).size || 1}
          </div>
          <div className="text-3xs text-indigo-700 font-medium">Regional Directorate Coverage</div>
        </div>
      </div>

      {/* Section 1: Pending Verification Queue */}
      {pendingALMOs.length > 0 && (
        <div className="bg-amber-50/60 border border-amber-300 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-amber-200 pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-700" />
              <h3 className="text-sm font-black text-amber-950 uppercase tracking-tight">
                Pending ALMO Candidate Verification Requests ({pendingALMOs.length})
              </h3>
            </div>
            <span className="text-3xs font-mono font-bold bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full">
              Requires CLMO Sign-off
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingALMOs.map((officer) => (
              <div
                key={officer.id}
                className="bg-white border border-amber-200 rounded-2xl p-4.5 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-3xs font-bold bg-slate-900 text-white px-2 py-0.5 rounded-md">
                      {officer.unique_login_id}
                    </span>
                    <h4 className="text-sm font-black text-slate-900 mt-1">
                      {officer.full_name}
                    </h4>
                    <p className="text-2xs text-slate-500">{officer.department}</p>
                  </div>
                  <span className="text-3xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    PENDING
                  </span>
                </div>

                <div className="text-xs text-slate-700 space-y-1 bg-slate-50 p-2.5 rounded-xl">
                  <div><strong>Email:</strong> <span className="font-mono">{officer.email}</span></div>
                  <div><strong>Phone:</strong> {officer.phone_number}</div>
                  <div><strong>Zone:</strong> {officer.jurisdiction_zone}</div>
                </div>

                <div className="pt-1 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleApproveALMO(officer.id, officer.full_name)}
                    disabled={processingId === officer.id}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    {processingId === officer.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    <span>Approve & Issue Badge</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 2: Split Grid: Direct Commissioning Form (Left) + Commissioned Directory (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Direct Commissioning Form */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-purple-600" />
              <h3 className="text-sm font-black text-slate-900 tracking-tight">
                Directly Commission New ALMO
              </h3>
            </div>
            <p className="text-2xs text-slate-500 mt-0.5">
              Instantly create, approve, and allot an official Directorate Unique ID to an ALMO officer.
            </p>
          </div>

          <form onSubmit={handleCommissionALMO} className="space-y-3.5 text-xs">
            {/* Auto-allocated ID Banner */}
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3 flex items-center justify-between">
              <div>
                <span className="text-3xs uppercase font-bold text-purple-700 block">
                  Generated Unique Login ID:
                </span>
                <span className="font-mono text-sm font-black text-purple-950">
                  {previewALMOId}
                </span>
              </div>
              <span className="text-3xs font-mono font-bold bg-white text-purple-800 border border-purple-200 px-2 py-0.5 rounded-md">
                Auto-Allotted
              </span>
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-700 uppercase text-3xs">
                Officer Full Name & Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Shri Suresh Raina"
                value={almoForm.full_name}
                onChange={(e) => setAlmoForm({ ...almoForm, full_name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-purple-600 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-700 uppercase text-3xs">
                Official Directorate Email *
              </label>
              <input
                type="email"
                required
                placeholder="e.g. almo.noida.lmpc@gmail.com"
                value={almoForm.email}
                onChange={(e) => setAlmoForm({ ...almoForm, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-purple-600 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 uppercase text-3xs">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="9811029384"
                  value={almoForm.phone_number}
                  onChange={(e) => setAlmoForm({ ...almoForm, phone_number: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-purple-600 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700 uppercase text-3xs">
                  Initial Password *
                </label>
                <input
                  type="password"
                  required
                  value={almoForm.password}
                  onChange={(e) => setAlmoForm({ ...almoForm, password: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-purple-600 outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-700 uppercase text-3xs">
                Assigned Jurisdiction District Office *
              </label>
              <select
                value={almoForm.jurisdiction_zone}
                onChange={(e) => setAlmoForm({ ...almoForm, jurisdiction_zone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-bold text-slate-900 focus:bg-white focus:border-purple-600 outline-none"
              >
                <option value="Noida / Greater Noida District Office">Noida / Greater Noida District Office</option>
                <option value="Ghaziabad / Meerut Regional Division">Ghaziabad / Meerut Regional Division</option>
                <option value="Central Delhi Metrology Enforcement Zone">Central Delhi Metrology Enforcement Zone</option>
                <option value="Gurugram / Faridabad Industrial Belt">Gurugram / Faridabad Industrial Belt</option>
                <option value="Mumbai Metropolitan Region (MMR)">Mumbai Metropolitan Region (MMR)</option>
                <option value="Bengaluru Urban & Industrial Corridor">Bengaluru Urban & Industrial Corridor</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black text-xs shadow-md shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all mt-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>Commission ALMO Post & Issue ID</span>
            </button>
          </form>
        </div>

        {/* Right: Commissioned ALMOs Directory Table */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                  Commissioned ALMO Officers Roster ({activeALMOs.length})
                </h3>
              </div>
              <span className="text-3xs font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                Level 3 Sanctioning
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-500 font-medium">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600 mx-auto mb-2" />
                <span>Loading ALMO directory...</span>
              </div>
            ) : activeALMOs.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-medium">
                No commissioned ALMO officers found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold font-mono uppercase text-3xs border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5">Badge ID</th>
                      <th className="px-3 py-2.5">Officer Name</th>
                      <th className="px-3 py-2.5">District Zone</th>
                      <th className="px-3 py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {activeALMOs.map((officer) => (
                      <tr key={officer.id} className="hover:bg-purple-50/50 transition-colors">
                        <td className="px-3 py-3 font-mono font-bold text-purple-700">
                          {officer.unique_login_id}
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-bold text-slate-900">{officer.full_name}</div>
                          <div className="text-3xs text-slate-500 font-mono">{officer.email}</div>
                        </td>
                        <td className="px-3 py-3 text-slate-700 font-medium">
                          {officer.jurisdiction_zone}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-3xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            COMMISSIONED
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 text-2xs text-slate-500 flex items-center justify-between">
            <span>Total Officers: <strong>{activeALMOs.length}</strong></span>
            <span className="font-mono text-3xs text-indigo-700 font-bold">L2 CLMO Governance Framework</span>
          </div>
        </div>
      </div>
    </div>
  );
}
