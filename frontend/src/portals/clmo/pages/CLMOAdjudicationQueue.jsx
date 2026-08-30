import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck,
  ShieldCheck,
  Loader2,
  ShieldAlert,
  Eye,
  History,
  Clock,
  ExternalLink,
  Search,
  HelpCircle,
} from 'lucide-react';
import { supervisorAPI } from '../../../services/api';
import ProductDetailModal, { getProductImageUrl } from '../../../components/ProductDetailModal';
import toast from 'react-hot-toast';


export default function CLMOAdjudicationQueue() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history' | 'all'
  const [search, setSearch] = useState('');

  // Detail Modal & Action Modals
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [rejectApp, setRejectApp] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [reClarificationApp, setReClarificationApp] = useState(null);
  const [clarificationNotes, setClarificationNotes] = useState(
    'Statutory re-clarification required regarding packaging declarations under LMPC Rules 2011.'
  );
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchAdjudicationQueue();
  }, []);

  const fetchAdjudicationQueue = async () => {
    try {
      setLoading(true);
      const res = await supervisorAPI.getPreMarketQueue();
      setApplications(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load CLMO adjudication queue');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (app) => {
    try {
      setProcessing(true);
      const res = await supervisorAPI.decidePreMarket(app.id, {
        action: 'approve',
        notes: 'CLMO Adjudication complete. Packaging verified compliant with Legal Metrology (Packaged Commodities) Rules 2011.',
        verification_method: app.visit_order_no || app.visit_order_id ? 'PHYSICAL_FIELD_INSPECTION_CONFIRMED' : 'DIGITAL_OCR_ONLY',
      });
      toast.success(res.data.message || `Product successfully certified! Certificate: ${res.data.certificate_number || 'Issued'}`);
      await fetchAdjudicationQueue();
      setActiveTab('history'); // Automatically switch to History tab so user immediately sees the certified record
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to approve application');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectApp) return;
    if (!rejectReason.trim()) {
      toast.error('Statutory rejection reason is required.');
      return;
    }
    try {
      setProcessing(true);
      const res = await supervisorAPI.decidePreMarket(rejectApp.id, {
        action: 'reject',
        notes: rejectReason.trim(),
      });
      toast.success(res.data?.message || 'Application rejected.');
      setRejectApp(null);
      setRejectReason('');
      await fetchAdjudicationQueue();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to reject application');
    } finally {
      setProcessing(false);
    }
  };

  const handleReClarificationSubmit = async (e) => {
    e.preventDefault();
    if (!reClarificationApp) return;
    if (!clarificationNotes.trim()) {
      toast.error('Statutory clarification notes are required.');
      return;
    }
    try {
      setProcessing(true);
      const res = await supervisorAPI.decidePreMarket(reClarificationApp.id, {
        action: 're_clarification',
        notes: clarificationNotes.trim(),
      });
      toast.success(res.data?.message || 'Re-clarification directive dispatched to applicant.');
      setReClarificationApp(null);
      setClarificationNotes('Statutory re-clarification required regarding packaging declarations under LMPC Rules 2011.');
      await fetchAdjudicationQueue();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to dispatch re-clarification');
    } finally {
      setProcessing(false);
    }
  };

  const isAlmoApprovedForCLMO = (a) => {
    const s = (a.status || '').toLowerCase();
    return (
      s === 'pending_clmo_approval' ||
      s === 'pending_supervisor' ||
      s === 'almo_approved' ||
      a.visit_order?.almo_report_approved === true ||
      a.almo_approved === true ||
      a.supervisor_notes?.includes('RECOMMENDED FOR CLMO') ||
      a.supervisor_notes?.includes('APPROVED BY ALMO') ||
      a.supervisor_notes?.includes('VIR APPROVED BY ALMO') ||
      a.supervisor_notes?.includes('Routed to CLMO') ||
      a.supervisor_notes?.includes('Verified complete compliance')
    );
  };

  const uniqueApps = Array.from(
    new Map((applications || []).map((item) => [item.id, item])).values()
  );

  const pendingApps = uniqueApps.filter((a) => {
    const s = (a.status || '').toLowerCase();
    const isCertified = s === 'approved_certified' || s === 'rejected_sanctioned';
    if (isCertified) return false;
    return isAlmoApprovedForCLMO(a);
  });

  const historyApps = uniqueApps.filter(
    (a) => a.status === 'approved_certified' || a.status === 'rejected_sanctioned'
  );

  const clmoRelevantApps = uniqueApps.filter((a) => {
    const s = (a.status || '').toLowerCase();
    const isCertified = s === 'approved_certified' || s === 'rejected_sanctioned';
    return isCertified || isAlmoApprovedForCLMO(a);
  });

  const displayedList = (activeTab === 'pending'
    ? pendingApps
    : activeTab === 'history'
    ? historyApps
    : clmoRelevantApps
  ).filter((app) => {
    const q = search.toLowerCase();
    return (
      (app.product_name || '').toLowerCase().includes(q) ||
      (app.brand || '').toLowerCase().includes(q) ||
      (app.company_name || '').toLowerCase().includes(q) ||
      (app.certificate_number || '').toLowerCase().includes(q) ||
      String(app.id).includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-md text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 text-indigo-300 font-bold text-lg mb-1">
            <Award className="w-6 h-6 text-emerald-400" />
            <span>CLMO Executive Adjudication & Certificate Clearance Queue</span>
          </div>
          <p className="text-sm text-slate-200">
            Chief Legal Metrology Officer (CLMO) Level 2 authority to issue final statutory packaging clearance certificates and grant guarded waivers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-amber-500/20 text-amber-300 border border-amber-400/40 px-3.5 py-1.5 rounded-xl font-bold font-mono text-xs flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Pending: {pendingApps.length}</span>
          </div>
          <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-3.5 py-1.5 rounded-xl font-bold font-mono text-xs flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Certified: {historyApps.length}</span>
          </div>
        </div>
      </div>

      {/* Tabs & Search Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'bg-white text-indigo-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Pending Adjudication ({pendingApps.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-white text-emerald-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Certified & Clearance History ({historyApps.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Submissions ({clmoRelevantApps.length})
          </button>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product, brand, certificate #, or company..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-600"
          />
        </div>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 font-medium">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
          <span>Loading adjudication applications...</span>
        </div>
      ) : displayedList.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 font-medium">
          {activeTab === 'pending' ? (
            <div>
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <div className="font-extrabold text-slate-900 text-sm">All Adjudications Completed</div>
              <p className="text-xs text-slate-500 mt-1">
                No applications currently waiting for CLMO signing. View certified records in the <strong>Certified & Clearance History</strong> tab.
              </p>
            </div>
          ) : (
            <div>
              <History className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <div className="font-extrabold text-slate-900 text-sm">No History Records Found</div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {displayedList.map((app) => {
            const isCritical = app.triage_severity === 'CRITICAL';
            const isMajor = app.triage_severity === 'MAJOR';
            const isCertified = app.status === 'approved_certified';

            return (
              <div
                key={app.id}
                onClick={() => setSelectedProductDetails(app)}
                className={`bg-white border rounded-2xl p-6 shadow-sm space-y-4 text-slate-800 hover:shadow-md transition-all cursor-pointer group ${
                  isCertified
                    ? 'border-emerald-200 bg-emerald-50/10 hover:border-emerald-400'
                    : 'border-slate-200 hover:border-indigo-400'
                }`}
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
                        <span className="font-mono font-black text-indigo-700 text-xs bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                          PMC-{String(app.id).padStart(4, '0')}
                        </span>
                        <span className="font-extrabold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">
                          {app.product_name}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {app.company_name || app.brand} • Category: <strong className="capitalize">{app.category}</strong>
                      </div>
                    </div>
                  </div>

                  {isCertified ? (
                    <span className="text-2xs font-extrabold px-3 py-1 rounded-full border uppercase shrink-0 bg-emerald-100 text-emerald-800 border-emerald-300 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>OFFICIALLY CERTIFIED</span>
                    </span>
                  ) : (
                    <span className="text-2xs font-extrabold px-3 py-1 rounded-full border uppercase shrink-0 bg-emerald-50 text-emerald-800 border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>RULES VERIFIED & APPROVED</span>
                    </span>
                  )}
                </div>

                {/* Audit Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 block font-sans font-bold text-3xs uppercase">Declared Price & Quantity</span>
                    <span className="text-slate-900 font-bold">₹{app.declared_mrp || 'N/A'} • {app.declared_net_quantity || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-sans font-bold text-3xs uppercase">Clearance Route</span>
                    <span className="text-indigo-800 font-bold">
                      {app.visit_order_no ? `On-Site Visit: ${app.visit_order_no}` : (app.verification_method || 'Digital Rule Review')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-sans font-bold text-3xs uppercase">Certificate Seal</span>
                    <span className="text-emerald-800 font-bold">
                      {app.certificate_number || 'Pending Final CLMO Signature'}
                    </span>
                  </div>
                </div>

                {/* Action Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="text-2xs text-slate-500">
                    {app.supervisor_signed_at && (
                      <span>Signed: {app.supervisor_signed_at}</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProductDetails(app);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-600" />
                      <span>Inspect Artwork & Declarations</span>
                    </button>

                    {!isCertified ? (
                      <>
                        {/* 1. Issue Certificate */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(app);
                          }}
                          disabled={processing}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer"
                        >
                          {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                          <span>Issue Certificate</span>
                        </button>

                        {/* 2. Reject */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRejectApp(app);
                            setRejectReason('');
                          }}
                          disabled={processing}
                          className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Reject</span>
                        </button>

                        {/* 3. Re Clarification */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReClarificationApp(app);
                            setClarificationNotes('Statutory re-clarification required regarding packaging declarations under LMPC Rules 2011.');
                          }}
                          disabled={processing}
                          className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
                          <span>Re Clarification</span>
                        </button>
                      </>
                    ) : (
                      <div className="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-extrabold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        <span>Certified ({app.certificate_number})</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Universal Product Details Modal with Photo & Violations */}
      {selectedProductDetails && (
        <ProductDetailModal
          product={selectedProductDetails}
          onClose={() => setSelectedProductDetails(null)}
        />
      )}

      {/* Modal 1: Reject Application Dialog */}
      {rejectApp && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>Reject Application</span>
              </div>
              <button onClick={() => setRejectApp(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-3.5 text-xs">
              <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-rose-950 space-y-1">
                <span className="font-bold text-3xs uppercase block text-rose-900">Statutory Rejection Order:</span>
                <p className="text-3xs">
                  Rejects pre-market application #{rejectApp.id} under Section 36 of Legal Metrology Act 2009.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">Reason for Rejection *</label>
                <textarea
                  rows={4}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="State statutory grounds for rejection..."
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setRejectApp(null)}
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
                  <span>Confirm Rejection</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Re Clarification Directive Dialog */}
      {reClarificationApp && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base">
                <HelpCircle className="w-5 h-5 text-amber-600" />
                <span>Request Re-Clarification</span>
              </div>
              <button onClick={() => setReClarificationApp(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleReClarificationSubmit} className="space-y-3.5 text-xs">
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-950 space-y-1">
                <span className="font-bold text-3xs uppercase block text-amber-900">Clarification Directive:</span>
                <p className="text-3xs">
                  Dispatches statutory clarification mandate to applicant requiring revised packaging proofs or legal manufacturer declaration.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">Clarification Notes & Mandate *</label>
                <textarea
                  rows={4}
                  required
                  value={clarificationNotes}
                  onChange={(e) => setClarificationNotes(e.target.value)}
                  placeholder="Detail the mandatory clarifications needed..."
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setReClarificationApp(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <HelpCircle className="w-4 h-4" />}
                  <span>Dispatch Re Clarification</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
