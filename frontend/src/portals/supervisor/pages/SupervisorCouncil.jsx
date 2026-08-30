import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Plus,
  Mail,
  Phone,
  Building,
  KeyRound,
  CheckCircle2,
  Calendar,
  Lock,
  Loader2,
  Sparkles,
  Search,
  ExternalLink,
} from 'lucide-react';
import { supervisorAPI } from '../../../services/api';
import toast from 'react-hot-toast';

export default function SupervisorCouncil() {
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    password: '',
    department: 'Directorate of Legal Metrology HQ',
    jurisdiction_zone: 'National HQ / All Zones',
    warrant_notes: 'Appointed with full regulatory sanction and pre-market packaging clearance authority.',
  });

  const [commissionResult, setCommissionResult] = useState(null);

  useEffect(() => {
    fetchSupervisors();
  }, []);

  const fetchSupervisors = async () => {
    try {
      setLoading(true);
      const res = await supervisorAPI.getSupervisors();
      setSupervisors(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load supervisor council roster');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCommissionSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.phone_number || !form.password) {
      toast.error('Please complete all required officer details.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await supervisorAPI.commissionSupervisor(form);
      setCommissionResult(res.data);
      toast.success(`Supervisor ${res.data.full_name} commissioned successfully!`);
      await fetchSupervisors();
      setForm({
        full_name: '',
        email: '',
        phone_number: '',
        password: '',
        department: 'Directorate of Legal Metrology HQ',
        jurisdiction_zone: 'National HQ / All Zones',
        warrant_notes: 'Appointed with full regulatory sanction and pre-market packaging clearance authority.',
      });
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to commission new supervisor.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = supervisors.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.full_name.toLowerCase().includes(q) ||
      s.unique_login_id.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.department.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-md text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 text-indigo-300 font-bold text-lg mb-1">
            <ShieldAlert className="w-6 h-6 text-indigo-400" />
            <span>Directorate Executive Council & Supervisor Succession Authority</span>
          </div>
          <p className="text-sm text-slate-200">
            Official roster of active Directorate Supervisors. New supervisor IDs must be officially generated, sanctioned, and granted by an existing working supervisor.
          </p>
        </div>

        {/* Action Button to Commission New Supervisor */}
        <button
          onClick={() => {
            setCommissionResult(null);
            setShowModal(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-3 rounded-xl transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Commission New Supervisor</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search supervisor name, Unique ID (SUP-HQ-xxx), or Gmail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium text-sm rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Supervisors Directory Cards */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 font-medium bg-white rounded-2xl border border-slate-200">
          Loading executive supervisor roster...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-slate-500 font-medium bg-white rounded-2xl border border-slate-200">
          No matching supervisors found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all space-y-4"
            >
              <div className="flex items-start justify-between pb-3 border-b border-slate-200">
                <div>
                  <div className="font-extrabold text-slate-900 text-base">{s.full_name}</div>
                  <div className="text-2xs font-mono font-bold text-indigo-700 mt-0.5">{s.unique_login_id}</div>
                </div>
                <span className="text-2xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-full uppercase flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Commissioned</span>
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="font-semibold truncate">{s.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-semibold">+91 {s.phone_number}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-2xs text-slate-600">{s.department}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 text-2xs text-slate-500 flex items-center justify-between">
                <span>Commissioned: {s.created_at}</span>
                <span className="font-mono text-indigo-700 font-bold">Executive Authority</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Commission New Supervisor Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <span>Executive Commissioning Warrant — Issue New Supervisor Credentials</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {!commissionResult ? (
              <form onSubmit={handleCommissionSubmit} className="space-y-3.5 text-xs text-slate-800">
                <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-xl text-2xs text-indigo-950 font-medium">
                  Authorizing Executive: <strong className="font-bold">{currentUser?.full_name || 'Working Directorate Supervisor'}</strong> ({currentUser?.unique_login_id || 'SUP-HQ-001'})
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Supervisor Full Name & Title *</label>
                    <input
                      type="text"
                      name="full_name"
                      required
                      placeholder="e.g. Dr. Sanjeev Khurana (Additional Controller)"
                      value={form.full_name}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold p-2.5 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Official Directorate Gmail *</label>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="sanjeev.supervisor.lmpc@gmail.com"
                      value={form.email}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold p-2.5 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Official Mobile Phone *</label>
                    <input
                      type="tel"
                      name="phone_number"
                      required
                      placeholder="e.g. 9811005544"
                      value={form.phone_number}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold p-2.5 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Initial Security Password *</label>
                    <input
                      type="password"
                      name="password"
                      required
                      placeholder="Minimum 6 characters"
                      value={form.password}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold p-2.5 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 uppercase mb-1">Department / Administrative Wing</label>
                    <input
                      type="text"
                      name="department"
                      value={form.department}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold p-2.5 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 uppercase mb-1">Commissioning Warrant Notes</label>
                    <textarea
                      rows={2}
                      name="warrant_notes"
                      value={form.warrant_notes}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium p-2.5 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-800 font-bold hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    <span>Generate & Grant Supervisor ID</span>
                  </button>
                </div>
              </form>
            ) : (
              /* Success Commissioning Certificate */
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-300 shadow-md">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-900">Supervisor Authority Successfully Granted</h4>
                  <p className="text-xs text-slate-600">
                    The new officer has been granted full Directorate Supervisor authority in the system.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 max-w-md mx-auto text-left space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Generated Unique ID:</span>
                    <span className="font-mono font-extrabold text-indigo-700 text-sm">{commissionResult.unique_login_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Officer Name:</span>
                    <span className="font-bold text-slate-900">{commissionResult.full_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Official Gmail:</span>
                    <span className="font-semibold text-slate-800">{commissionResult.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Commissioned By:</span>
                    <span className="font-semibold text-indigo-700">{commissionResult.commissioned_by} ({commissionResult.commissioned_by_id})</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setShowModal(false)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-md transition-all text-xs"
                  >
                    Done & Return to Council
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
