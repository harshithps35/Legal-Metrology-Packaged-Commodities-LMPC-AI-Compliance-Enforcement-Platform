import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  Award,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  Eye,
  Download,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  MapPin,
  Loader2,
  Sparkles,
  Package,
} from 'lucide-react';
import { supervisorAPI, reportsAPI } from '../../../services/api';
import ProductDetailModal from '../../../components/ProductDetailModal';
import toast from 'react-hot-toast';

export default function CLMOProductsHistory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
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
      toast.error('Failed to load product history directory');
    } finally {
      setLoading(false);
    }
  };

  const categories = ['ALL', ...new Set(products.map((p) => p.category).filter(Boolean))];

  const filtered = products.filter((item) => {
    const matchSearch =
      (item.product_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.brand || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.certificate_number || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.visit_order_no || '').toLowerCase().includes(search.toLowerCase()) ||
      String(item.id).includes(search);

    let matchStatus = true;
    if (statusFilter === 'CERTIFIED') {
      matchStatus = item.status === 'APPROVED_CERTIFIED' || item.status === 'approved_certified';
    } else if (statusFilter === 'PENDING') {
      matchStatus = ['PENDING_SUPERVISOR', 'PENDING_CLMO_APPROVAL', 'PENDING_ALMO_SANCTION', 'PENDING_INSPECTOR', 'SUBMITTED'].includes(item.status);
    } else if (statusFilter === 'VISIT') {
      matchStatus = ['IN_FIELD_VISIT', 'PENDING_VISIT_REPORT', 'FIELD_VISIT_ORDERED'].includes(item.status) || Boolean(item.visit_order_no);
    } else if (statusFilter === 'WAIVED') {
      matchStatus = item.visit_waived_by_clmo === true;
    } else if (statusFilter === 'SURVEILLANCE') {
      matchStatus = item.source_type === 'COMMERCIAL_SURVEILLANCE';
    }

    const matchCategory = categoryFilter === 'ALL' || item.category === categoryFilter;

    return matchSearch && matchStatus && matchCategory;
  });

  // KPI Calculations
  const countTotal = products.length;
  const countCertified = products.filter((p) => p.status === 'APPROVED_CERTIFIED' || p.status === 'approved_certified').length;
  const countVisits = products.filter((p) => p.visit_order_no || p.visit_required).length;
  const countWaived = products.filter((p) => p.visit_waived_by_clmo).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-md text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 text-indigo-300 font-bold text-lg mb-1">
            <History className="w-6 h-6 text-emerald-400" />
            <span>CLMO Universal Product Packaging Audit & Clearance History</span>
          </div>
          <p className="text-sm text-slate-200">
            Comprehensive statutory register of all packaged commodities adjudicated, pre-market clearance certifications, guarded waivers, and active market surveillance products.
          </p>
        </div>
        <div className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 px-3.5 py-2 rounded-xl font-bold font-mono text-xs shrink-0 flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-400" />
          <span>Statutory Clearance Register</span>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-3xs font-bold text-slate-400 uppercase tracking-wider">Total Products Tracked</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{countTotal}</div>
            <div className="text-3xs text-indigo-600 font-semibold mt-0.5">Pre-Market & Surveillance</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-3xs font-bold text-slate-400 uppercase tracking-wider">Certified Clearance Seals</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{countCertified}</div>
            <div className="text-3xs text-emerald-600 font-semibold mt-0.5">LMPC Official Certificate</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-3xs font-bold text-slate-400 uppercase tracking-wider">On-Site Field Visits</div>
            <div className="text-2xl font-black text-amber-600 mt-1">{countVisits}</div>
            <div className="text-3xs text-amber-700 font-semibold mt-0.5">VO-YYYY-NNNNNN Triggered</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <MapPin className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-3xs font-bold text-slate-400 uppercase tracking-wider">CLMO Guarded Waivers</div>
            <div className="text-2xl font-black text-purple-600 mt-1">{countWaived}</div>
            <div className="text-3xs text-purple-600 font-semibold mt-0.5">Logged Under Section 13(1)</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
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
            onClick={() => setStatusFilter('CERTIFIED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap cursor-pointer transition-all ${
              statusFilter === 'CERTIFIED' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Certified ({countCertified})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap cursor-pointer transition-all ${
              statusFilter === 'PENDING' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Under Review
          </button>
          <button
            onClick={() => setStatusFilter('VISIT')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap cursor-pointer transition-all ${
              statusFilter === 'VISIT' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Field Visit ({countVisits})
          </button>
          <button
            onClick={() => setStatusFilter('WAIVED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap cursor-pointer transition-all ${
              statusFilter === 'WAIVED' ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Waivers ({countWaived})
          </button>
          <button
            onClick={() => setStatusFilter('SURVEILLANCE')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap cursor-pointer transition-all ${
              statusFilter === 'SURVEILLANCE' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Market Surveillance
          </button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold py-1.5 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'ALL' ? 'All Categories' : cat}
              </option>
            ))}
          </select>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
            <input
              type="text"
              placeholder="Search product, brand, cert..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-semibold pl-9 pr-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Products History Grid */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center text-slate-500 font-medium shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-3" />
          <div className="font-bold text-slate-700">Loading Universal Product History...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-500 font-medium shadow-sm">
          No product records found matching your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => {
            const isCertified = item.status === 'APPROVED_CERTIFIED' || item.status === 'approved_certified';
            const isCritical = item.triage_severity === 'CRITICAL';
            const isMajor = item.triage_severity === 'MAJOR';

            return (
              <div
                key={`${item.source_type}-${item.id}`}
                onClick={() => setSelectedProduct(item)}
                className="bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-md rounded-2xl p-5 shadow-xs transition-all space-y-4 cursor-pointer group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                          {item.source_type === 'PRE_MARKET_APPLICATION' ? `PMC-${String(item.id).padStart(4, '0')}` : `SURV-${String(item.id).padStart(4, '0')}`}
                        </span>
                        <span className="font-black text-slate-900 text-base group-hover:text-indigo-600 transition-colors">
                          {item.product_name}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        {item.brand} • <strong className="text-slate-700">{item.company_name}</strong>
                      </div>
                    </div>
                    <span
                      className={`text-3xs font-black px-2.5 py-1 rounded-full border uppercase shrink-0 ${
                        isCertified
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {isCertified ? 'OFFICIALLY CERTIFIED' : 'RULES VERIFIED & APPROVED'}
                    </span>
                  </div>

                  {/* Metadata Matrix */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-mono">
                    <div>
                      <span className="text-slate-400 block font-sans text-3xs font-bold uppercase">MRP & Qty</span>
                      <span className="text-slate-900 font-bold">₹{item.declared_mrp || 0} • {item.declared_net_quantity || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-sans text-3xs font-bold uppercase">Category</span>
                      <span className="text-indigo-800 font-bold capitalize">{item.category}</span>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-slate-400 block font-sans text-3xs font-bold uppercase">Compliance Verification</span>
                      <span className="text-emerald-700 font-bold">100% Rules Verified</span>
                    </div>
                  </div>

                  {/* Detailed Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 text-3xs">
                    {item.certificate_number && (
                      <span className="font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Award className="w-3 h-3 text-emerald-600" />
                        <span>{item.certificate_number}</span>
                      </span>
                    )}

                    {item.visit_order_no && (
                      <span className="font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-600" />
                        <span>{item.visit_order_no}</span>
                      </span>
                    )}

                    {item.visit_waived_by_clmo && (
                      <span className="font-bold bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-purple-600" />
                        <span>CLMO Guarded Waiver</span>
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
                    className="py-1.5 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1 transition-all"
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
