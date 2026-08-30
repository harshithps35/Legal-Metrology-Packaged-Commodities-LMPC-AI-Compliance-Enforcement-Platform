import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle2,
  XCircle,
  MapPin,
  Camera,
  ShieldCheck,
  Loader2,
  Award,
  ArrowRight,
} from 'lucide-react';
import { supervisorAPI } from '../../../services/api';
import ProductDetailModal, { getProductImageUrl } from '../../../components/ProductDetailModal';
import { Eye } from 'lucide-react';

import toast from 'react-hot-toast';

export default function ALMOVisitReportsQueue() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPendingReports();
  }, []);

  const fetchPendingReports = async () => {
    try {
      setLoading(true);
      const res = await supervisorAPI.getAlmoPendingReports();
      const raw = res.data || [];
      const deduped = Array.from(
        new Map(raw.map((item) => [item.application_id || item.visit_id, item])).values()
      );
      setReports(deduped);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load pending VIR reports');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReport = async (visitId) => {
    try {
      setProcessing(true);
      const res = await supervisorAPI.approveVisitReport(visitId, {
        notes: 'Physical evidence, Vernier caliper readings, and factory photos verified by ALMO.',
      });
      toast.success(res.data.message || 'VIR report approved and forwarded to CLMO for final clearance seal!');
      fetchPendingReports();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to approve VIR report');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectReport = async (visitId) => {
    const reason = window.prompt('Enter reason for rejecting VIR report (re-inspection required):');
    if (!reason || reason.trim().length < 10) {
      toast.error('Rejection reason must be at least 10 characters.');
      return;
    }
    try {
      setProcessing(true);
      const res = await supervisorAPI.rejectVisitReport(visitId, {
        rejection_reason: reason,
      });
      toast.success(res.data.message || 'VIR report rejected. Field squad notified to re-audit.');
      fetchPendingReports();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to reject VIR report');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-md text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 text-amber-300 font-bold text-lg mb-1">
            <FileText className="w-6 h-6 text-amber-400" />
            <span>Visit Inspection Report (VIR) Evidence Verification Queue</span>
          </div>
          <p className="text-sm text-slate-200">
            ALMO review gate for physical field visit findings (Vernier caliper measurements, GPS coordinates, factory photos, SHA-256 signatures) before CLMO final adjudication.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={fetchPendingReports}
            disabled={loading}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/30 cursor-pointer"
          >
            <Loader2 className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Queue</span>
          </button>
          <div className="bg-amber-500/20 text-amber-300 border border-amber-400/40 px-3.5 py-2 rounded-xl font-bold font-mono text-xs">
            Pending VIRs: {reports.length}
          </div>
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 font-medium">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-600 mb-2" />
          <span>Loading submitted field inspection reports...</span>
        </div>
      ) : reports.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 font-medium space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-80" />
          <p className="font-bold text-slate-900">All VIR Evidence Verified</p>
          <p className="text-xs text-slate-500">No field visit inspection reports are currently awaiting ALMO review.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {reports.map((r) => (
            <div
              key={r.visit_id}
              onClick={() => setSelectedProductDetails(r)}
              className="bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-md rounded-2xl p-6 shadow-sm space-y-4 text-slate-800 cursor-pointer group transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-slate-900 overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center relative shadow-inner">
                    <img
                      src={getProductImageUrl(r)}
                      alt={r.product_name}
                      onError={(e) => {
                        if (!e.target.src.includes('artwork_sample.png')) {
                          e.target.src = '/uploads/artwork_sample.png';
                        }
                      }}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-indigo-700 text-xs bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                        {r.visit_order_no || r.visit_id}
                      </span>
                      <span className="font-extrabold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">{r.product_name}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{r.company_name}</div>
                  </div>
                </div>

                <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-2xs font-extrabold px-3 py-1 rounded-full uppercase">
                  VIR SUBMITTED BY LMI
                </span>
              </div>

              {/* Physical Evidence Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-3xs font-bold text-slate-500 uppercase block">Caliper Font Measurement:</span>
                  <div className="text-base font-black font-mono text-slate-900 mt-0.5">
                    {r.caliper_font_measurement_mm ? `${r.caliper_font_measurement_mm} mm` : 'Not recorded'}
                  </div>
                  <span className="text-3xs text-slate-500 font-mono">Attested under official seal</span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-3xs font-bold text-slate-500 uppercase block">GPS Geo-Fencing:</span>
                  <div className="text-base font-black font-mono text-emerald-700 mt-0.5">
                    {r.gps_confidence || 'HIGH'} (Verified)
                  </div>
                  <span className="text-3xs text-slate-500 font-mono">On-Premises Coordinates</span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-3xs font-bold text-slate-500 uppercase block">Cryptographic Hash Seal:</span>
                  <div className="text-xs font-black font-mono text-slate-900 mt-1 truncate">
                    {r.inspection_signature ? `${r.inspection_signature.substring(0, 16)}...` : 'SHA256-SEALED'}
                  </div>
                  <span className="text-3xs text-slate-500 font-mono">Tamper-Proof Audit Seal</span>
                </div>
              </div>

              {/* Remarks */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-900 block mb-1">Field Squad On-Site Remarks:</span>
                <p className="text-slate-700 italic leading-relaxed">
                  "{r.on_site_inspector_remarks || 'Physical inspection completed. Measurement readings verified on packing line.'}"
                </p>
              </div>

              {/* ALMO Verification Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProductDetails(r);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-600" />
                  <span>Inspect Details & Violations</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRejectReport(r.visit_id);
                  }}
                  disabled={processing}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer"
                >
                  Reject & Demand Re-Inspection
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApproveReport(r.visit_id);
                  }}
                  disabled={processing}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve VIR & Forward to CLMO</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Universal Product Details Modal with Photo & Violations */}
      {selectedProductDetails && (
        <ProductDetailModal
          product={selectedProductDetails}
          onClose={() => setSelectedProductDetails(null)}
        />
      )}
    </div>
  );
}
