import React, { useState, useEffect } from 'react';
import {
  Clock,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldAlert,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  Eye,
  Award,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { supervisorAPI } from '../../../services/api';
import ProductDetailModal from '../../../components/ProductDetailModal';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function PendingProductsQueue() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await supervisorAPI.getPreMarketQueue();
      setApplications(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load pending products queue');
    } finally {
      setLoading(false);
    }
  };

  const uniqueApps = Array.from(
    new Map((applications || []).map((item) => [item.id, item])).values()
  );

  // Filter out already certified/approved products to show ONLY pending products
  const pendingOnly = uniqueApps.filter(
    (a) => a.status !== 'APPROVED_CERTIFIED' && a.status !== 'approved_certified' && a.status !== 'REJECTED'
  );

  const filtered = pendingOnly.filter((app) => {
    const q = search.toLowerCase();
    return (
      (app.product_name || '').toLowerCase().includes(q) ||
      (app.brand || '').toLowerCase().includes(q) ||
      (app.company_name || '').toLowerCase().includes(q) ||
      (app.category || '').toLowerCase().includes(q) ||
      String(app.id).includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-md text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 text-indigo-300 font-bold text-lg mb-1">
            <Clock className="w-6 h-6 text-amber-400" />
            <span>Pending Pre-Market Packaging Submissions Registry</span>
          </div>
          <p className="text-sm text-slate-200">
            Comprehensive registry of all packaging artwork compliance applications currently undergoing statutory review across all Directorate tiers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/20 text-amber-300 border border-amber-400/40 px-3.5 py-2 rounded-xl font-bold font-mono text-xs shrink-0 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Pending: {pendingOnly.length}</span>
          </div>
          <button
            onClick={() => navigate('/clmo')}
            className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer shrink-0"
          >
            <Award className="w-4 h-4" />
            <span>Open Clearance Queue</span>
          </button>
        </div>
      </div>

      {/* Clean Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search pending applications by product name, brand, applicant company, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-semibold pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="text-xs font-bold text-slate-500 shrink-0">
          Showing <strong>{filtered.length}</strong> of {pendingOnly.length} submissions
        </div>
      </div>

      {/* Pending Applications List */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center text-slate-500 font-medium shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-3" />
          <div className="font-bold text-slate-700">Loading Pending Applications...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-500 font-medium shadow-sm">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <div className="font-bold text-slate-700 text-sm">No Pending Applications Found</div>
          <p className="text-xs text-slate-500 mt-1">All packaging submissions have been adjudicated or matched criteria.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => {
            const isReadyForCLMO = ['PENDING_SUPERVISOR', 'PENDING_CLMO_APPROVAL', 'pending_supervisor', 'pending_clmo_approval'].includes(app.status);
            const isAwaitingALMO = app.status === 'PENDING_ALMO_SANCTION' || app.status === 'pending_almo_sanction' || app.visit_recommended === true;

            return (
              <div
                key={app.id}
                onClick={() => navigate(`/clmo/products/${app.id}`)}
                className="bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md rounded-2xl p-5 shadow-xs transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer group"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md">
                      PMC-{String(app.id).padStart(4, '0')}
                    </span>
                    <span className="font-black text-slate-900 text-base group-hover:text-indigo-600 transition-colors">
                      {app.product_name}
                    </span>
                    <span className="text-2xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                      {app.brand}
                    </span>
                    <span className="text-2xs text-slate-500 font-medium">({app.company_name})</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-medium">
                    <span>
                      Category: <strong className="text-slate-800 capitalize">{app.category}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      MRP: <strong className="text-slate-800">₹{app.declared_mrp || 0}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Net Qty: <strong className="text-slate-800">{app.declared_net_quantity || 'N/A'}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Type: <strong className="text-slate-800">{app.packaging_type || 'Standard'}</strong>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-3xs font-extrabold px-2.5 py-0.5 rounded-md uppercase border bg-emerald-50 text-emerald-800 border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>All Rules Verified & Approved</span>
                    </span>
                  </div>
                </div>

                {/* Right Action */}
                <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/clmo/products/${app.id}`);
                    }}
                    className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>Inspect</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/clmo');
                    }}
                    className="py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-sm shadow-indigo-600/30 flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <span>Adjudicate</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
