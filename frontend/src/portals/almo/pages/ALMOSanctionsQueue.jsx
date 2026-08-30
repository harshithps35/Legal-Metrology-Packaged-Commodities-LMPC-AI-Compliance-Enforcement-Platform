import React, { useState, useEffect } from 'react';
import {
  MapPin,
  ClipboardCheck,
  AlertTriangle,
  FileCheck,
  Calendar,
  Clock,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { supervisorAPI } from '../../../services/api';
import ProductDetailModal, { getProductImageUrl } from '../../../components/ProductDetailModal';
import { Eye } from 'lucide-react';
import toast from 'react-hot-toast';


export default function ALMOSanctionsQueue() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Detail Modal, Sanction Modal, & Rejection Modal
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [rejectingApp, setRejectingApp] = useState(null);
  const [rejectRemarks, setRejectRemarks] = useState(
    'Optical OCR verification sufficient under Rule 11. Physical factory visit not warranted. Returned for desk review.'
  );
  const [sanctionForm, setSanctionForm] = useState({
    scheduled_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    scheduled_time: '11:00 AM',
    visit_location_name: 'Industrial Production Plant',
    visit_address: 'Plot 42, Sector 18 Industrial Area, UP',
    assigned_sub_inspector_id: 6,
    instructions: 'Perform physical Vernier caliper font audit and cross-check batch printing line.',
  });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchSanctionQueue();
  }, []);

  const fetchSanctionQueue = async () => {
    try {
      setLoading(true);
      const res = await supervisorAPI.getAlmoPendingSanctions();
      setApplications(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load pending visit sanctions');
    } finally {
      setLoading(false);
    }
  };

  const handleSanctionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedApp) return;
    try {
      setProcessing(true);
      const res = await supervisorAPI.sanctionFieldVisit(selectedApp.id, sanctionForm);
      toast.success(res.data.message || 'Field Visit Order officially sanctioned under statutory seal!');
      setSelectedApp(null);
      await fetchSanctionQueue();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to sanction field visit');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectingApp) return;
    const finalReason = rejectRemarks.trim();
    if (finalReason.length < 5) {
      toast.error('Statutory rejection reason must be provided.');
      return;
    }
    try {
      setProcessing(true);
      const res = await supervisorAPI.rejectVisitSanction(rejectingApp.id, {
        remarks: finalReason,
        rejection_reason: finalReason,
      });
      toast.success(res.data.message || 'Visit recommendation rejected. Application returned to Inspector desk audit.');
      setRejectingApp(null);
      await fetchSanctionQueue();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to reject sanction');
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
            <ClipboardCheck className="w-6 h-6 text-amber-400" />
            <span>Statutory Field Visit Sanctions Queue</span>
          </div>
          <p className="text-sm text-slate-200">
            Assistant Legal Metrology Officer (ALMO) Level 3 authority to review LMI visit recommendations, issue collision-free Visit Orders (<code>VO-YYYY-NNNNNN</code>), and assign Sub-Inspectors.
          </p>
        </div>
        <div className="bg-amber-500/20 text-amber-300 border border-amber-400/40 px-3.5 py-1.5 rounded-xl font-bold font-mono text-xs shrink-0">
          Pending Sanctions: {applications.length}
        </div>
      </div>

      {/* Queue Cards */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 font-medium">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-600 mb-2" />
          <span>Loading pending sanction recommendations...</span>
        </div>
      ) : applications.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 font-medium space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-80" />
          <p className="font-bold text-slate-900">All Field Visit Recommendations Sanctioned</p>
          <p className="text-xs text-slate-500">There are no pending physical inspection requests in your jurisdiction.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {applications.map((app) => (
            <div
              key={app.id}
              onClick={() => setSelectedProductDetails(app)}
              className="bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md rounded-2xl p-5 shadow-sm space-y-4 transition-all text-slate-800 cursor-pointer group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-slate-900 overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center relative shadow-inner">
                    <img
                      src={getProductImageUrl(app)}
                      alt={app.product_name}
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
                      <span className="font-mono font-black text-amber-700 text-xs bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                        PMC-{String(app.id).padStart(4, '0')}
                      </span>
                      <span className="font-extrabold text-slate-900 text-base group-hover:text-amber-700 transition-colors">{app.product_name}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {app.company_name || app.brand} • Category: <strong className="capitalize">{app.category}</strong>
                    </div>
                  </div>
                </div>

                <span className={`text-2xs font-extrabold px-3 py-1 rounded-full border uppercase shrink-0 ${
                  app.triage_severity === 'CRITICAL'
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}>
                  {app.triage_severity} INFRACTION
                </span>
              </div>

              {/* Inspector Recommendation & Trigger Reason */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Statutory Trigger: {app.visit_trigger_reason || 'Schedule II Font Height Discrepancy'}</span>
                </div>
                <p className="text-slate-600 italic leading-relaxed">
                  "{app.visit_recommendation_justification || app.inspector_notes || 'LMI physical verification recommended due to automated OCR boundary conflict.'}"
                </p>
                <div className="text-3xs text-slate-500 font-mono pt-1 border-t border-slate-200 flex justify-between">
                  <span>Declared MRP: ₹{app.declared_mrp || 0}</span>
                  <span>Net Qty: {app.declared_net_quantity || 'N/A'}</span>
                  <span>Assigned LMI: Rajesh Sharma (INSP-DEL-042)</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProductDetails(app);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-600" />
                  <span>Inspect Details & Violations</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRejectingApp(app);
                    setRejectRemarks(
                      'Optical OCR verification sufficient under Rule 11. Physical factory visit not warranted. Returned for desk review.'
                    );
                  }}
                  disabled={processing}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer"
                >
                  Reject & Return to Desk
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedApp(app);
                    setSanctionForm({
                      ...sanctionForm,
                      visit_location_name: `${app.company_name || app.brand} Production Plant`,
                    });
                  }}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Sanction Visit Order (VO)</span>
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

      {/* Rejection Modal: Return to Desk */}
      {rejectingApp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>Reject Visit Recommendation: {rejectingApp.product_name}</span>
              </h3>
              <button onClick={() => setRejectingApp(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-3.5 text-xs">
              <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 space-y-1">
                <div className="text-rose-900 font-bold uppercase text-3xs">Statutory Desk Remand Directive:</div>
                <p className="text-3xs text-rose-950">
                  Rejecting this recommendation cancels physical visit scheduling and returns the case back to <strong>Lead Inspector (LMI)</strong> for digital desk audit or 15-day deficiency notice.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5 uppercase text-3xs">Quick Statutory Presets:</label>
                <div className="space-y-1.5">
                  {[
                    'Optical OCR verification sufficient under Rule 11. Physical factory visit not warranted. Returned for desk review.',
                    'Minor declaration discrepancy only. Issue 15-Day Statutory Deficiency Memo instead of field visit.',
                    'Inconclusive optical breach. LMI must re-verify Schedule II font dimensions on high-res artwork proof.',
                    'Manufacturing facility located outside regional jurisdiction. Transfer dossier to zonal office.',
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setRejectRemarks(preset)}
                      className={`w-full text-left p-2.5 rounded-xl border text-2xs transition-all ${
                        rejectRemarks === preset
                          ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">Official ALMO Rejection Remarks *</label>
                <textarea
                  rows={3}
                  required
                  value={rejectRemarks}
                  onChange={(e) => setRejectRemarks(e.target.value)}
                  placeholder="Enter detailed statutory justification..."
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium text-slate-900 focus:bg-white focus:border-rose-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setRejectingApp(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  <span>{processing ? 'Processing...' : 'Confirm Rejection & Return'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sanction Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-amber-600" />
                <span>Sanction Visit Order: {selectedApp.product_name}</span>
              </h3>
              <button onClick={() => setSelectedApp(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleSanctionSubmit} className="space-y-3.5 text-xs">
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 space-y-1">
                <div className="text-amber-900 font-bold uppercase text-3xs">Statutory Order Generation:</div>
                <p className="text-3xs text-amber-950">
                  Submitting generates a collision-free sequential <strong>VO-{new Date().getFullYear()}-NNNNNN</strong> order number and dispatches the task to the field squad.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">Scheduled Date *</label>
                  <input
                    type="date"
                    required
                    value={sanctionForm.scheduled_date}
                    onChange={(e) => setSanctionForm({ ...sanctionForm, scheduled_date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">Scheduled Time *</label>
                  <input
                    type="text"
                    required
                    value={sanctionForm.scheduled_time}
                    onChange={(e) => setSanctionForm({ ...sanctionForm, scheduled_time: e.target.value })}
                    placeholder="e.g. 11:30 AM"
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">Inspection Facility Name *</label>
                <input
                  type="text"
                  required
                  value={sanctionForm.visit_location_name}
                  onChange={(e) => setSanctionForm({ ...sanctionForm, visit_location_name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">Factory / Warehouse Postal Address *</label>
                <input
                  type="text"
                  required
                  value={sanctionForm.visit_address}
                  onChange={(e) => setSanctionForm({ ...sanctionForm, visit_address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">ALMO Directives to Inspection Squad</label>
                <textarea
                  rows={2}
                  value={sanctionForm.instructions}
                  onChange={(e) => setSanctionForm({ ...sanctionForm, instructions: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{processing ? 'Sanctioning...' : 'Issue Visit Order'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
