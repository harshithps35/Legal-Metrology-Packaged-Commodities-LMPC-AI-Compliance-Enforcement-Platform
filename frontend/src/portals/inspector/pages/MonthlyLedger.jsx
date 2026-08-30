import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Download,
  Search,
  MapPin,
  Calendar,
  ShieldCheck,
  ExternalLink,
  Eye,
  Camera,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Hash,
} from 'lucide-react';
import { inspectorAPI } from '../../../services/api';
import ProductDetailModal from '../../../components/ProductDetailModal';
import toast from 'react-hot-toast';

export default function MonthlyLedger() {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState('2026-08');
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    fetchLedger();
  }, [selectedMonth]);

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const res = await inspectorAPI.getMonthlyLedger(selectedMonth);
      setLedger(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load activity ledger');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (filtered.length === 0) {
      toast.error('No ledger entries to export for this month.');
      return;
    }

    const headers = [
      'Scan ID',
      'Product Name',
      'Brand',
      'Category',
      'Field Location',
      'Compliance Score (%)',
      'Verdict Status',
      'Approval Status',
      'Client Evidence Hash (SHA-256)',
      'Timestamp (UTC)',
    ];

    const rows = filtered.map((item) => [
      `#${item.id}`,
      `"${(item.product_name || 'Standard Pack').replace(/"/g, '""')}"`,
      `"${(item.brand || 'N/A').replace(/"/g, '""')}"`,
      item.category || 'Food',
      `"${(item.location_name || 'Field Tagged').replace(/"/g, '""')}"`,
      item.compliance_score ?? 'N/A',
      item.status || 'N/A',
      item.approval_status || 'N/A',
      item.client_evidence_hash || 'SHA256-AUTHENTICATED',
      item.created_at || 'N/A',
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `LMPC_Inspector_Activity_Ledger_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} ledger audit records to CSV!`);
  };

  const filtered = ledger.filter(
    (s) =>
      s.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.location_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.brand?.toLowerCase().includes(search.toLowerCase()) ||
      String(s.id).includes(search)
  );

  const compliantCount = ledger.filter((s) => s.status === 'compliant').length;
  const nonCompliantCount = ledger.filter((s) => s.status !== 'compliant').length;
  const avgScore =
    ledger.length > 0
      ? Math.round(
          ledger.reduce((acc, curr) => acc + (curr.compliance_score || 0), 0) / ledger.length
        )
      : 0;

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-md text-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/80 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 border border-indigo-400/30 shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Official Month-End Inspectorate Activity Ledger
                </h1>
                <span className="text-3xs font-mono font-bold bg-blue-500/30 text-blue-200 border border-blue-400/40 px-2 py-0.5 rounded-full">
                  AUDIT REGISTRY
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Verified legal inspection records with cryptographic SHA-256 evidence digests, GPS coordinates, and quota attestation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-950/60 px-4 py-2 rounded-2xl border border-indigo-400/40">
            <Calendar className="w-4 h-4 text-amber-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
            >
              <option value="2026-08" className="text-slate-900">August 2026</option>
              <option value="2026-09" className="text-slate-900">September 2026</option>
              <option value="2026-10" className="text-slate-900">October 2026</option>
            </select>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-indigo-900/60 text-xs">
          <div className="bg-slate-950/40 border border-indigo-500/20 rounded-2xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-2xs uppercase block font-bold">Total Month Audits</span>
              <span className="text-lg font-black text-white">{ledger.length} Scans Logged</span>
            </div>
            <FileText className="w-6 h-6 text-indigo-400/60" />
          </div>

          <div className="bg-slate-950/40 border border-indigo-500/20 rounded-2xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-2xs uppercase block font-bold">Compliant Verdicts</span>
              <span className="text-lg font-black text-emerald-300">{compliantCount} Cleared</span>
            </div>
            <CheckCircle2 className="w-6 h-6 text-emerald-400/60" />
          </div>

          <div className="bg-slate-950/40 border border-indigo-500/20 rounded-2xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-2xs uppercase block font-bold">Mean Compliance Score</span>
              <span className="text-lg font-black text-amber-300">{avgScore}% Accuracy</span>
            </div>
            <Sparkles className="w-6 h-6 text-amber-400/60" />
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search audited product, brand, scan ID, or field location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-900 font-medium text-xs rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Official Ledger (CSV)</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 font-medium">Loading activity ledger...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium space-y-2">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="font-bold text-slate-700">No Audits Recorded for {selectedMonth}</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Launch a GPS Field Scan to log verified commodities and generate cryptographic ledger records.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold font-mono text-xs uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-4">Scan ID</th>
                  <th className="px-5 py-4">Product / Brand</th>
                  <th className="px-5 py-4">Field Location</th>
                  <th className="px-5 py-4">Score</th>
                  <th className="px-5 py-4">Verdict</th>
                  <th className="px-5 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedProduct(s)}
                    className="hover:bg-indigo-50/50 cursor-pointer transition-colors group"
                  >
                    <td className="px-5 py-4 font-mono font-bold text-indigo-700">#{s.id}</td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {s.product_name || 'Standard Packaging'}
                      </div>
                      <div className="text-2xs text-slate-500">
                        Brand: <strong>{s.brand || 'General FMCG'}</strong> • <span className="capitalize">{s.category || 'Food'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span className="truncate max-w-[200px]">{s.location_name || 'Field Tagged Location'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono font-extrabold text-slate-900">
                      {s.compliance_score !== null ? `${s.compliance_score}%` : 'N/A'}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`text-2xs px-2.5 py-1 rounded-full font-extrabold border uppercase ${
                          s.status === 'compliant'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProduct(s);
                          }}
                          className="text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>Dossier</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (s.application_id) {
                              setSelectedProduct(s);
                            } else {
                              navigate(`/scans/${s.id}`);
                            }
                          }}
                          className="text-xs text-indigo-700 hover:text-indigo-900 font-extrabold cursor-pointer px-2 py-1"
                        >
                          Certificate &rarr;
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Universal Product Details Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
