import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronLeft, ChevronRight, Eye, Trash2, ScanLine } from 'lucide-react';
import { scanAPI } from '../services/api';

const statusConfig = {
  compliant:       { label: 'Compliant',    bg: 'bg-status-compliant-bg',     text: 'text-status-compliant' },
  non_compliant:   { label: 'Non-Compliant', bg: 'bg-status-non-compliant-bg', text: 'text-status-non-compliant' },
  requires_review: { label: 'Review',       bg: 'bg-status-review-bg',        text: 'text-status-review' },
  processing:      { label: 'Processing',   bg: 'bg-status-processing-bg',    text: 'text-status-processing' },
};

function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.processing;
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

export default function HistoryPage() {
  const [scans, setScans] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const pageSize = 15;

  useEffect(() => {
    loadScans();
  }, [page, statusFilter]);

  const loadScans = async () => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;

      const res = await scanAPI.list(params);
      setScans(res.data.items);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch (err) {
      setScans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadScans();
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this scan?')) return;
    try {
      await scanAPI.delete(id);
      loadScans();
    } catch (err) { /* noop */ }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Scan History</h1>
        <p className="text-sm text-text-secondary mt-1">View and manage your compliance inspections</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-card border border-surface-border shadow-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={handleSearch} className="flex-1 min-w-[200px] relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product name or brand..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-surface-border bg-surface-light
                text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400"
            />
          </form>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-text-muted" />
            {['', 'compliant', 'non_compliant', 'requires_review'].map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                  ${statusFilter === s
                    ? 'bg-primary-600 text-white'
                    : 'bg-surface-muted text-text-secondary hover:bg-surface-border'
                  }`}
              >
                {s === '' ? 'All' : statusConfig[s]?.label || s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-card border border-surface-border shadow-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : scans.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-text-muted">
            <ScanLine size={40} className="mb-3" />
            <p className="text-sm font-medium">No scans found</p>
            <button
              onClick={() => navigate('/scan')}
              className="mt-3 text-sm text-primary-600 font-medium hover:text-primary-700"
            >
              Start your first scan →
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-border">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Scan #</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Product</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Category</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Score</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Date</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map((scan) => (
                    <tr
                      key={scan.id}
                      onClick={() => navigate(`/scans/${scan.id}`)}
                      className="border-b border-surface-border hover:bg-surface-light cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 text-sm text-text-secondary font-mono">#{scan.id}</td>
                      <td className="py-3 px-4 text-sm text-text-primary font-medium">
                        {scan.product_name || '—'}
                      </td>
                      <td className="py-3 px-4 text-sm text-text-secondary capitalize">
                        {scan.category || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={scan.status} />
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold text-text-primary">
                        {scan.compliance_score != null ? `${scan.compliance_score.toFixed(0)}%` : '—'}
                      </td>
                      <td className="py-3 px-4 text-sm text-text-secondary">
                        {new Date(scan.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/scans/${scan.id}`); }}
                            className="px-3 py-1 rounded-lg text-xs font-medium bg-primary-50 text-primary-600
                              hover:bg-primary-100 transition-colors"
                          >
                            Details
                          </button>
                          <button
                            onClick={(e) => handleDelete(scan.id, e)}
                            className="px-3 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-600
                              hover:bg-red-100 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border">
                <p className="text-sm text-text-secondary">
                  Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg hover:bg-surface-muted disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="px-3 py-1 text-sm font-medium text-text-primary">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg hover:bg-surface-muted disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
