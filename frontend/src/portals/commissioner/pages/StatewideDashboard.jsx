import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Building2,
  Users,
  FileCheck,
  TrendingUp,
  AlertTriangle,
  MapPin,
  FileText,
  Clock,
  Download,
  Loader2,
  CheckCircle2,
  Award,
} from 'lucide-react';
import { commissionerAPI } from '../../../services/api';
import toast from 'react-hot-toast';

export default function StatewideDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await commissionerAPI.getDashboard();
      setData(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load statewide analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 font-medium">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
        <span>Loading Statewide Governance Dashboard...</span>
      </div>
    );
  }

  const kpis = data?.state_kpis || {};
  const heatmap = data?.regional_heatmap || [];
  const auditTrail = data?.recent_audit_trail || [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-950 border border-indigo-500/30 rounded-2xl p-6 shadow-md text-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-300 font-bold text-lg mb-1">
              <ShieldAlert className="w-6 h-6 text-indigo-400" />
              <span>State Legal Metrology Commissioner (Level 1 Directorate)</span>
            </div>
            <p className="text-sm text-slate-200">
              Statewide governance, regional compliance heatmaps, statutory overrides, and certificate revocation oversight.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-3 py-1.5 rounded-xl font-bold font-mono">
              COMPLIANCE INDEX: {kpis.statewide_compliance_index}
            </span>
          </div>
        </div>

        {/* 4 Statewide KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-5 border-t border-indigo-500/30 text-slate-900">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Submissions</span>
              <FileCheck className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{kpis.total_applications}</div>
            <div className="text-2xs text-indigo-700 font-semibold mt-1">Packaging Artwork Line</div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Certified Products</span>
              <Award className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-1">{kpis.total_certified}</div>
            <div className="text-2xs text-emerald-800 font-semibold mt-1">Official LMPC Certificates</div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Field Visit Orders</span>
              <MapPin className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-700 mt-1">{kpis.total_field_visits}</div>
            <div className="text-2xs text-amber-800 font-semibold mt-1">On-Site Caliper Audits</div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Field Infractions</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-700 mt-1">{kpis.total_field_breaches}</div>
            <div className="text-2xs text-rose-800 font-semibold mt-1">Sec 36 Show-Cause Queue</div>
          </div>
        </div>
      </div>

      {/* Regional Compliance Heatmap */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 text-slate-900 font-black text-base">
            <MapPin className="w-5 h-5 text-indigo-600" />
            <span>Statewide Regional Compliance Heatmap</span>
          </div>
          <span className="text-2xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200">
            Active Zones: {heatmap.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-bold text-xs uppercase font-mono border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Jurisdiction District</th>
                <th className="px-4 py-3">Active Field Audits</th>
                <th className="px-4 py-3">Compliance Index</th>
                <th className="px-4 py-3">Critical Breaches</th>
                <th className="px-4 py-3 text-center">Enforcement Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {heatmap.map((h, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-900">{h.region}</td>
                  <td className="px-4 py-3 font-mono">{h.active_inspections} Audits</td>
                  <td className="px-4 py-3 font-bold text-emerald-700">{h.compliance_rate}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded font-bold ${h.critical_breaches > 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'}`}>
                      {h.critical_breaches} Critical
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-2xs font-extrabold border uppercase ${
                      h.risk_level === 'LOW'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : h.risk_level === 'MODERATE'
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}>
                      {h.risk_level} RISK
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Immutable Commissioner Audit Trail Log */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 text-slate-900 font-black text-base">
            <Clock className="w-5 h-5 text-indigo-600" />
            <span>Statewide Audit & Override Trail (Cryptographic SHA-256 Ledger)</span>
          </div>
          <span className="text-2xs font-mono font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-200">
            Immutable Chain of Custody
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-bold text-xs uppercase font-mono border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Event ID</th>
                <th className="px-4 py-3">Event Type</th>
                <th className="px-4 py-3">Target Entity</th>
                <th className="px-4 py-3">Crypto Hash Seal</th>
                <th className="px-4 py-3">Timestamp (UTC)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs font-mono">
              {auditTrail.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-indigo-700">#{a.id}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">{a.event_type}</td>
                  <td className="px-4 py-3 text-slate-600">{a.entity_type} #{a.entity_id}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-3xs">{a.event_hash}</td>
                  <td className="px-4 py-3 text-slate-700">{a.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
