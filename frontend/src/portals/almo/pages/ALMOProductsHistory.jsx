import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  ClipboardCheck,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  MapPin,
  Loader2,
  Award,
  Package,
  Activity,
} from 'lucide-react';
import { supervisorAPI } from '../../../services/api';
import ProductDetailModal from '../../../components/ProductDetailModal';
import toast from 'react-hot-toast';

export default function ALMOProductsHistory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await supervisorAPI.getProductsHistory();
      setProducts(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load district products history');
    } finally {
      setLoading(false);
    }
  };

  const filtered = products.filter((item) => {
    const matchSearch =
      (item.product_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.brand || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.visit_order_no || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.certificate_number || '').toLowerCase().includes(search.toLowerCase()) ||
      String(item.id).includes(search);

    let matchStatus = true;
    if (statusFilter === 'SANCTIONED_VISIT') {
      matchStatus = Boolean(item.visit_order_no) || item.visit_required === true;
    } else if (statusFilter === 'VIR_ATTESTED') {
      matchStatus = item.visit_order?.almo_report_approved === true || item.status === 'APPROVED_CERTIFIED';
    } else if (statusFilter === 'PENDING_SANCTION') {
      matchStatus = item.status === 'PENDING_ALMO_SANCTION' || item.visit_recommended === true;
    } else if (statusFilter === 'CERTIFIED') {
      matchStatus = item.status === 'APPROVED_CERTIFIED' || item.status === 'approved_certified';
    }

    return matchSearch && matchStatus;
  });

  const totalAssessed = products.length;
  const totalSanctioned = products.filter((p) => p.visit_order_no || p.visit_required).length;
  const totalAttested = products.filter((p) => p.visit_order?.almo_report_approved || p.status === 'APPROVED_CERTIFIED').length;
  const totalPending = products.filter((p) => p.status === 'PENDING_ALMO_SANCTION' || p.visit_recommended).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-md text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 text-amber-300 font-bold text-lg mb-1">
            <History className="w-6 h-6 text-amber-400" />
            <span>ALMO District Packaging Product Audit & Sanction History</span>
          </div>
          <p className="text-sm text-slate-200">
            Statutory registry of all district enterprise packaging artwork submissions, Field Visit Orders (VO-YYYY-NNNNNN), and on-site Verification Inspection Reports (VIR).
          </p>
        </div>
        <div className="bg-amber-500/20 text-amber-300 border border-amber-400/40 px-3.5 py-2 rounded-xl font-bold font-mono text-xs shrink-0 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span>Sanctioning Authority (Level 3)</span>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-3xs font-bold text-slate-400 uppercase tracking-wider">District Products Assessed</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{totalAssessed}</div>
            <div className="text-3xs text-indigo-600 font-semibold mt-0.5">Pre-Market & Surveillance</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-3xs font-bold text-slate-400 uppercase tracking-wider">Visit Orders Sanctioned</div>
            <div className="text-2xl font-black text-amber-600 mt-1">{totalSanctioned}</div>
            <div className="text-3xs text-amber-700 font-semibold mt-0.5">Physical Audits Mandated</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <MapPin className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-3xs font-bold text-slate-400 uppercase tracking-wider">Attested VIR Evidence</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{totalAttested}</div>
            <div className="text-3xs text-emerald-600 font-semibold mt-0.5">Caliper & Weighing Verified</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ClipboardCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-3xs font-bold text-slate-400 uppercase tracking-wider">Awaiting Sanction Decision</div>
            <div className="text-2xl font-black text-purple-600 mt-1">{totalPending}</div>
            <div className="text-3xs text-purple-600 font-semibold mt-0.5">In ALMO Action Queue</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap cursor-pointer transition-all ${
              statusFilter === 'ALL' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Products ({products.length})
          </button>
          <button
            onClick={() => setStatusFilter('SANCTIONED_VISIT')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap cursor-pointer transition-all ${
              statusFilter === 'SANCTIONED_VISIT' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Visit Orders ({totalSanctioned})
          </button>
          <button
            onClick={() => setStatusFilter('VIR_ATTESTED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap cursor-pointer transition-all ${
              statusFilter === 'VIR_ATTESTED' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Attested VIRs ({totalAttested})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING_SANCTION')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap cursor-pointer transition-all ${
              statusFilter === 'PENDING_SANCTION' ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Pending Sanction ({totalPending})
          </button>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
          <input
            type="text"
            placeholder="Search by product, company, VO#..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-semibold pl-9 pr-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* History Cards Grid */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center text-slate-500 font-medium shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-600 mb-3" />
          <div className="font-bold text-slate-700">Loading District Product Records...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-500 font-medium shadow-sm">
          No product records found matching your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => {
            const hasVisitOrder = Boolean(item.visit_order_no);
            const isCertified = item.status === 'APPROVED_CERTIFIED' || item.status === 'approved_certified';

            return (
              <div
                key={`${item.source_type}-${item.id}`}
                onClick={() => setSelectedProduct(item)}
                className="bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md rounded-2xl p-5 shadow-xs transition-all space-y-4 cursor-pointer group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md">
                          {item.source_type === 'PRE_MARKET_APPLICATION' ? `PMC-${String(item.id).padStart(4, '0')}` : `SURV-${String(item.id).padStart(4, '0')}`}
                        </span>
                        <span className="font-black text-slate-900 text-base group-hover:text-amber-600 transition-colors">
                          {item.product_name}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        {item.brand} • <strong className="text-slate-700">{item.company_name}</strong>
                      </div>
                    </div>

                    <span
                      className={`text-3xs font-black px-2.5 py-1 rounded-full border uppercase shrink-0 ${
                        hasVisitOrder
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : isCertified
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-blue-100 text-blue-800 border-blue-300'
                      }`}
                    >
                      {hasVisitOrder ? 'VISIT SANCTIONED' : item.status}
                    </span>
                  </div>

                  {/* Matrix Details */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-mono">
                    <div>
                      <span className="text-slate-400 block font-sans text-3xs font-bold uppercase">MRP & Qty</span>
                      <span className="text-slate-900 font-bold">₹{item.declared_mrp || 0} • {item.declared_net_quantity || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-sans text-3xs font-bold uppercase">Category</span>
                      <span className="text-slate-800 font-bold capitalize">{item.category}</span>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-slate-400 block font-sans text-3xs font-bold uppercase">Visit Order</span>
                      <span className="text-amber-800 font-bold">{item.visit_order_no || 'Digital OCR'}</span>
                    </div>
                  </div>

                  {/* Badge Row */}
                  <div className="flex flex-wrap items-center gap-1.5 text-3xs">
                    {item.visit_order?.caliper_font_measurement_mm && (
                      <span className="font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-md">
                        Caliper: {item.visit_order.caliper_font_measurement_mm}mm
                      </span>
                    )}

                    {item.visit_order?.physical_net_weight_grams && (
                      <span className="font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
                        Net Wt: {item.visit_order.physical_net_weight_grams}g
                      </span>
                    )}

                    {item.visit_order?.almo_report_approved && (
                      <span className="font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-md">
                        VIR Attested by ALMO
                      </span>
                    )}

                    <span className="text-slate-400 font-mono ml-auto">
                      {item.created_at}
                    </span>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="text-2xs text-slate-500 font-medium">
                    Inspector: <strong className="text-slate-700">{item.assigned_inspector_name}</strong>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProduct(item);
                    }}
                    className="py-1.5 px-3 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold flex items-center gap-1 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect Record</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
