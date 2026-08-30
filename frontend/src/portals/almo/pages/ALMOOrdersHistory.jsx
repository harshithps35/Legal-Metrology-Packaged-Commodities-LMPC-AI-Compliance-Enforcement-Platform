import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Clock,
} from 'lucide-react';
import { subInspectorAPI } from '../../../services/api';
import ProductDetailModal from '../../../components/ProductDetailModal';
import toast from 'react-hot-toast';

export default function ALMOOrdersHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await subInspectorAPI.getAssignedVisits();
      setOrders(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load Visit Orders history');
    } finally {
      setLoading(false);
    }
  };

  const filtered = orders.filter((o) =>
    (o.visit_order_no && o.visit_order_no.toLowerCase().includes(search.toLowerCase())) ||
    o.product_name.toLowerCase().includes(search.toLowerCase()) ||
    o.company_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-md text-white">
        <div className="flex items-center gap-2.5 text-amber-300 font-bold text-lg mb-1">
          <History className="w-6 h-6 text-amber-400" />
          <span>Statutory Visit Orders Registry (VO-YYYY-NNNNNN)</span>
        </div>
        <p className="text-sm text-slate-200">
          Permanent chronological log of all field visit orders sanctioned under the authority of the Assistant Legal Metrology Officer.
        </p>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by Visit Order No (e.g. VO-2026-000002), product, or manufacturer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 font-medium">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-600 mb-2" />
          <span>Loading visit orders registry...</span>
        </div>
      ) : orders.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 font-medium">
          No visit orders recorded.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold font-mono text-xs uppercase border-b border-slate-200">
                <tr>
                  <th className="px-5 py-4">Visit Order No</th>
                  <th className="px-5 py-4">Target Product & Facility</th>
                  <th className="px-5 py-4">Scheduled Date</th>
                  <th className="px-5 py-4">Severity Triage</th>
                  <th className="px-5 py-4 text-center">VIR Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filtered.map((o) => (
                  <tr
                    key={o.visit_id}
                    onClick={() => setSelectedProduct(o)}
                    className="hover:bg-amber-50/50 cursor-pointer transition-colors group"
                  >
                    <td className="px-5 py-4 font-mono font-bold text-amber-700">
                      {o.visit_order_no || o.visit_id}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900 group-hover:text-amber-700 transition-colors">{o.product_name}</div>
                      <div className="text-3xs text-slate-500">{o.company_name} • {o.visit_location_name}</div>
                    </td>
                    <td className="px-5 py-4 font-mono">
                      {o.scheduled_date} • {o.scheduled_time}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-2xs font-extrabold border uppercase ${
                        o.triage_severity === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}>
                        {o.triage_severity}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-2xs font-bold border uppercase ${
                        o.visit_report_submitted
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-blue-100 text-blue-900 border-blue-300'
                      }`}>
                        {o.visit_report_submitted ? 'VIR Submitted' : o.visit_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Universal Product Details Modal with Photo & Violations */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
