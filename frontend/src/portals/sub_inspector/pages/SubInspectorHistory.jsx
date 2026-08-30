import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History,
  MapPin,
  Calendar,
  Clock,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileCheck,
  ShieldCheck,
  Eye,
  Crosshair,
  Sparkles,
  Sliders,
  Check,
  Navigation,
  Search,
  Filter,
  CheckCircle,
  FileText,
  Building2,
  Award,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { subInspectorAPI } from '../../../services/api';
import ProductDetailModal, { getProductImageUrl } from '../../../components/ProductDetailModal';
import toast from 'react-hot-toast';

export default function SubInspectorHistory() {
  const navigate = useNavigate();
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'COMPLETED' | 'FIELD_VISITS' | 'RESOLUTION_DESK'
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await subInspectorAPI.getHistory();
      setHistoryItems(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load audit history');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = historyItems.filter((item) => {
    // Tab filtering
    if (activeTab === 'ACTIVE' && item.is_completed) return false;
    if (activeTab === 'COMPLETED' && !item.is_completed) return false;
    if (activeTab === 'FIELD_VISITS' && item.item_type !== 'FIELD_VISIT') return false;
    if (activeTab === 'RESOLUTION_DESK' && item.item_type !== 'RESOLUTION_DESK') return false;

    // Search filtering
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      item.product_name?.toLowerCase().includes(s) ||
      item.brand?.toLowerCase().includes(s) ||
      item.company_name?.toLowerCase().includes(s) ||
      item.reference_id?.toLowerCase().includes(s) ||
      item.location_name?.toLowerCase().includes(s)
    );
  });

  const totalCount = historyItems.length;
  const completedCount = historyItems.filter((i) => i.is_completed).length;
  const activeCount = historyItems.filter((i) => !i.is_completed).length;
  const fieldVisitsCount = historyItems.filter((i) => i.item_type === 'FIELD_VISIT').length;
  const resolutionCount = historyItems.filter((i) => i.item_type === 'RESOLUTION_DESK').length;

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-md text-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/80 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 border border-indigo-400/30 shrink-0">
              <History className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Audit, Field & Resolution History
                </h1>
                <span className="text-3xs font-mono font-bold bg-amber-500/30 text-amber-200 border border-amber-400/40 px-2.5 py-0.5 rounded-full">
                  OFFICIAL AUDIT LEDGER
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Complete historical record of all pre-market products, on-site factory audits, caliper measurements, GPS check-ins, and 15-day resolution memos worked on by Sub-Inspector Sanjay Kumar (ASST-DEL-012).
              </p>
            </div>
          </div>

          <button
            onClick={fetchHistory}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Refresh Ledger</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-2xs font-bold uppercase text-slate-400 tracking-wider">Total Handled</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{totalCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-2xs font-bold uppercase text-emerald-600 tracking-wider">Completed & Cleared</div>
            <div className="text-2xl font-black text-emerald-700 mt-0.5">{completedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-2xs font-bold uppercase text-amber-600 tracking-wider">Active In Progress</div>
            <div className="text-2xl font-black text-amber-700 mt-0.5">{activeCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-2xs font-bold uppercase text-blue-600 tracking-wider">Field Visits Co-Signed</div>
            <div className="text-2xl font-black text-blue-700 mt-0.5">{fieldVisitsCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { id: 'ALL', label: `All Records (${totalCount})` },
            { id: 'ACTIVE', label: `Active Working (${activeCount})` },
            { id: 'COMPLETED', label: `Completed (${completedCount})` },
            { id: 'FIELD_VISITS', label: `Field Visits (${fieldVisitsCount})` },
            { id: 'RESOLUTION_DESK', label: `15-Day Desks (${resolutionCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product, brand, order ID..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-indigo-600 focus:outline-none"
          />
        </div>
      </div>

      {/* History Items List */}
      {loading ? (
        <div className="p-16 text-center text-slate-500 bg-white rounded-3xl border border-slate-200 font-medium space-y-2">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
          <span className="text-sm font-bold text-slate-700">Loading audit history ledger...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-16 text-center text-slate-500 bg-white rounded-3xl border border-slate-200 font-medium space-y-2">
          <History className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No Historical Records Match Filter</h3>
          <p className="text-xs text-slate-400">Try changing the tab filter or search query.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const isVisit = item.item_type === 'FIELD_VISIT';
            return (
              <div
                key={item.history_id}
                onClick={() => setSelectedProductDetails(item)}
                className={`bg-white border rounded-3xl p-5 shadow-xs space-y-4 transition-all text-slate-800 cursor-pointer group ${
                  item.is_completed
                    ? 'border-emerald-200/80 hover:border-emerald-400'
                    : 'border-amber-200/80 hover:border-amber-400'
                } hover:shadow-md`}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center relative shadow-inner">
                      <img
                        src={getProductImageUrl(item)}
                        alt={item.product_name}
                        onError={(e) => {
                          if (!e.target.src.includes('artwork_sample.png')) {
                            e.target.src = '/uploads/artwork_sample.png';
                          }
                        }}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-indigo-700 text-xs bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                          {item.reference_id}
                        </span>
                        <span className="font-extrabold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">
                          {item.product_name}
                        </span>
                        <span className="text-3xs font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                          {item.type_label}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">
                        Brand: <strong>{item.brand || item.company_name}</strong> • {item.company_name} • Category: {item.category}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.is_completed ? (
                      <span className="text-2xs font-extrabold px-3 py-1 rounded-full border uppercase bg-emerald-100 text-emerald-900 border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{isVisit ? 'VIR CO-SIGNED & APPROVED' : 'VIOLATION RECTIFIED & FORWARDED'}</span>
                      </span>
                    ) : (
                      <span className="text-2xs font-extrabold px-3 py-1 rounded-full border uppercase bg-amber-100 text-amber-900 border-amber-300 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-700" />
                        <span>PENDING RESOLUTION ({item.status})</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Properties Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Location & GPS */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                        <span>{item.location_name}</span>
                      </div>
                      <span className="text-4xs font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                        {item.scheduled_date}
                      </span>
                    </div>
                    <p className="text-slate-600 text-2xs pl-5.5">{item.location_address}</p>
                    <div className="pt-2 border-t border-slate-200 text-3xs font-mono flex items-center justify-between text-slate-600">
                      <span>GPS: {item.gps_coordinates}</span>
                      {item.caliper_reading_mm && (
                        <span className="font-bold text-indigo-700">
                          Caliper: {item.caliper_reading_mm} mm (Pass ≥ 2.0mm)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sub-Inspector Observations & Digital Seal */}
                  <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-indigo-950 uppercase text-3xs flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Sub-Inspector Endorsement & Audit Observations:</span>
                      </span>
                      {item.co_signed_at && (
                        <span className="text-4xs font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                          {item.co_signed_at}
                        </span>
                      )}
                    </div>
                    <p className="text-indigo-900 text-2xs font-medium leading-relaxed italic">
                      "{item.observations}"
                    </p>
                    {item.signature_hash && (
                      <div className="text-4xs font-mono text-slate-500 truncate pt-1 border-t border-indigo-100">
                        Cryptographic Seal: <strong className="text-slate-700">{item.signature_hash}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-3xs font-mono text-slate-500">
                    Officer: <strong>Sanjay Kumar (ASST-DEL-012)</strong> • Sub-Inspector & Resolution Desk
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/sub-inspector/products/${item.application_id || item.id}`);
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Open full-page dossier"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-600" />
                    <span>Inspect Full Dossier</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Universal Product Details Modal */}
      {selectedProductDetails && (
        <ProductDetailModal
          product={selectedProductDetails}
          onClose={() => setSelectedProductDetails(null)}
        />
      )}
    </div>
  );
}
