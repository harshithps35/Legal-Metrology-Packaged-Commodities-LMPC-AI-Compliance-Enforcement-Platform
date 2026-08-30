import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Download, Search, Filter, Calendar, FileSpreadsheet,
  FileCheck, Shield, Eye, ArrowUpRight, CheckCircle2, XCircle, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { scanAPI } from '../services/api';

const statusConfig = {
  compliant:       { label: 'Compliant',     badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  non_compliant:   { label: 'Non-Compliant', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
  requires_review: { label: 'Review Needed', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  processing:      { label: 'Processing',    badge: 'bg-blue-50 text-blue-700 border-blue-200' },
};

export default function ReportsPage() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadReports();
  }, [statusFilter]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const params = { page: 1, page_size: 50 };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const res = await scanAPI.list(params);
      setScans(res.data.items || []);
    } catch {
      setScans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadReports();
  };

  const downloadFile = (scanId, format) => {
    const token = localStorage.getItem('token');
    const url = `/api/v1/scans/${scanId}/report/${format}`;
    
    // Trigger browser download with auth header via fetch/blob
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.blob())
      .then(blob => {
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        const ext = format === 'pdf' ? 'pdf' : (format === 'docx' ? 'docx' : 'xlsx');
        link.download = `LMPC_Audit_Report_#${scanId}.${ext}`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        toast.success(`Exported ${format.toUpperCase()} report!`);
      })
      .catch(() => toast.error('Failed to download report'));
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Compliance Reports & Notices</h1>
          <p className="text-sm text-text-secondary mt-1">
            Download official Legal Metrology certificates, Word notices, and Excel spreadsheets
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-card border border-surface-border p-4 shadow-card flex flex-wrap items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="flex-1 min-w-[240px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product or brand name..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-light border border-surface-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
        </form>

        <div className="flex items-center gap-2">
          <Filter size={15} className="text-text-muted" />
          {['', 'compliant', 'non_compliant', 'requires_review'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                statusFilter === s
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-surface-muted text-text-secondary hover:bg-surface-border'
              }`}
            >
              {s === '' ? 'All' : statusConfig[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Table Card */}
      <div className="bg-white rounded-card border border-surface-border shadow-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : scans.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-text-muted">
            <FileText size={40} className="mb-2 text-slate-300" />
            <p className="text-sm font-medium">No audit reports found</p>
            <p className="text-xs mt-1">Run a scan first to generate official audit certificates</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-surface-border bg-surface-light">
                  <th className="py-3 px-4 font-semibold text-text-muted uppercase tracking-wider">Audit #</th>
                  <th className="py-3 px-4 font-semibold text-text-muted uppercase tracking-wider">Product Name</th>
                  <th className="py-3 px-4 font-semibold text-text-muted uppercase tracking-wider">Category</th>
                  <th className="py-3 px-4 font-semibold text-text-muted uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4 font-semibold text-text-muted uppercase tracking-wider">Compliance Score</th>
                  <th className="py-3 px-4 font-semibold text-text-muted uppercase tracking-wider">Audit Date</th>
                  <th className="py-3 px-4 font-semibold text-text-muted uppercase tracking-wider text-right">Download Formats</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {scans.map((scan) => {
                  const st = statusConfig[scan.status] || statusConfig.processing;
                  const score = scan.compliance_score ?? 0;

                  return (
                    <tr key={scan.id} className="hover:bg-surface-light transition">
                      <td className="py-3.5 px-4 font-mono text-text-muted font-semibold">
                        #{scan.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => navigate(`/scans/${scan.id}`)}
                          className="font-bold text-text-primary hover:text-primary-600 flex items-center gap-1 group"
                        >
                          <span>{scan.product_name || 'Product Label'}</span>
                          <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                        <span className="text-[11px] text-text-muted block mt-0.5">{scan.brand || 'Unbranded'}</span>
                      </td>
                      <td className="py-3.5 px-4 capitalize text-text-secondary">
                        {scan.category || 'General'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${st.badge}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-text-primary">
                        {score.toFixed(0)}%
                      </td>
                      <td className="py-3.5 px-4 text-text-secondary">
                        {new Date(scan.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* PDF */}
                          <button
                            onClick={() => downloadFile(scan.id, 'pdf')}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[11px] flex items-center gap-1 border border-rose-200 transition shadow-xs"
                            title="Download PDF Certificate"
                          >
                            <FileText size={12} />
                            PDF
                          </button>

                          {/* DOCX */}
                          <button
                            onClick={() => downloadFile(scan.id, 'docx')}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] flex items-center gap-1 border border-blue-200 transition shadow-xs"
                            title="Download Word Notice (.docx)"
                          >
                            <FileCheck size={12} />
                            Word
                          </button>

                          {/* Excel */}
                          <button
                            onClick={() => downloadFile(scan.id, 'excel')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-[11px] flex items-center gap-1 border border-emerald-200 transition shadow-xs"
                            title="Download Excel Data (.xlsx)"
                          >
                            <FileSpreadsheet size={12} />
                            Excel
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
