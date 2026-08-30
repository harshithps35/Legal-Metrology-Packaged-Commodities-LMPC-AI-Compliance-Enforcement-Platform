import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  AlertOctagon,
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  Send,
  Loader2,
  Package,
  Calendar,
  AlertTriangle,
  Eye,
  ArrowRight,
  Layers,
  Maximize2,
  ExternalLink,
  FileCheck,
  Scale,
  Sparkles,
  Download,
  Search,
  Filter,
  Check,
  Award,
  Gavel,
  Briefcase,
  HelpCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { employerAPI, scanAPI, reportsAPI } from '../../../services/api';
import ProductDetailModal, { getProductImageUrl } from '../../../components/ProductDetailModal';
import toast from 'react-hot-toast';

export default function EmployerResolutionDesk() {
  const [deficiencyCases, setDeficiencyCases] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tabs & Search Filter
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'open', 'response_received', 'resolved', 'overdue'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Forms
  const [selectedCase, setSelectedCase] = useState(null);
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [zoomImageUrl, setZoomImageUrl] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [declaredMrp, setDeclaredMrp] = useState('');
  const [declaredNetQty, setDeclaredNetQty] = useState('');
  const [proofFiles, setProofFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [casesRes, noticesRes] = await Promise.all([
        employerAPI.getDeficiencyCases().catch(() => ({ data: [] })),
        employerAPI.getMyNotices().catch(() => ({ data: [] })),
      ]);
      setDeficiencyCases(casesRes.data || []);
      setNotices(noticesRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load resolution cases.');
    } finally {
      setLoading(false);
    }
  };

  // Metrics calculation
  const legalCases = useMemo(() => {
    return deficiencyCases;
  }, [deficiencyCases]);

  const metrics = useMemo(() => {
    let openCount = 0;
    let inReviewCount = 0;
    let overdueCount = 0;
    let resolvedCount = 0;

    legalCases.forEach((c) => {
      if (c.status === 'RESOLVED') resolvedCount++;
      else if (c.status === 'RESPONSE_RECEIVED' || c.manufacturer_response_notes) inReviewCount++;
      else if (c.is_overdue || c.status === 'OVERDUE_ESCALATED') overdueCount++;
      else openCount++;
    });

    return {
      total: legalCases.length + notices.length,
      open: openCount,
      inReview: inReviewCount,
      overdue: overdueCount,
      resolved: resolvedCount,
    };
  }, [legalCases, notices]);

  // Tab Filtering
  const filteredCases = useMemo(() => {
    return deficiencyCases.filter((c) => {
      const isResolved = c.status === 'RESOLVED';
      const isResponse = !isResolved && (c.status === 'RESPONSE_RECEIVED' || Boolean(c.manufacturer_response_notes));
      const isOverdue = !isResolved && (c.is_overdue || c.status === 'OVERDUE_ESCALATED');
      const isOpen = !isResolved && !isResponse && !isOverdue;

      if (activeTab === 'open' && !isOpen) return false;
      if (activeTab === 'response_received' && !isResponse) return false;
      if (activeTab === 'overdue' && !isOverdue) return false;
      if (activeTab === 'resolved' && !isResolved) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCase = (c.case_number || '').toLowerCase().includes(q);
        const matchesProduct = (c.product_name || '').toLowerCase().includes(q);
        const matchesBrand = (c.brand || '').toLowerCase().includes(q);
        const matchesMemo = (c.memo_text || '').toLowerCase().includes(q);
        if (!matchesCase && !matchesProduct && !matchesBrand && !matchesMemo) return false;
      }

      return true;
    });
  }, [deficiencyCases, activeTab, searchQuery]);

  const handleOpenCaseModal = (c) => {
    setSelectedCase(c);
    setReplyText(
      c.manufacturer_response_notes ||
        'Statutory packaging label corrections applied to conform with Rule 6 & Schedule II font specifications. Revised artwork attached.'
    );
    setDeclaredMrp(c.declared_mrp || '');
    setDeclaredNetQty(c.declared_net_quantity || '');
    setFile(null);
    setPreview(null);
  };

  const handleFileChange = (e) => {
    const incoming = Array.from(e.target.files || []);
    if (incoming.length > 0) {
      setProofFiles((prev) => [...prev, ...incoming]);
    }
  };

  const handleSubmitReply = async (e) => {
    e.preventDefault();
    if (!selectedCase) return;
    if (!replyText.trim()) {
      toast.error('Please provide a statutory rectification explanation.');
      return;
    }

    try {
      setSubmitting(true);
      let uploadedArtworkUrl = selectedCase.artwork_file_path || selectedCase.image_url;

      if (proofFiles.length > 0) {
        toast.loading(`Uploading ${proofFiles.length} proof document(s)...`, { id: 'desk-up' });
        try {
          const formData = new FormData();
          proofFiles.forEach((f) => formData.append('files', f));
          const upRes = await employerAPI.uploadMultipleArtwork(formData);
          const urls = upRes.data?.artwork_urls || [upRes.data?.artwork_url];
          if (urls.length > 0 && urls[0]) {
            uploadedArtworkUrl = urls.length > 1 ? JSON.stringify(urls) : urls[0];
          }
        } catch (err) {
          console.warn('Batch upload fallback to single', err);
          for (const f of proofFiles) {
            try {
              const singleForm = new FormData();
              singleForm.append('file', f);
              const singleRes = await employerAPI.uploadArtwork(singleForm);
              if (singleRes.data?.artwork_url) {
                uploadedArtworkUrl = singleRes.data.artwork_url;
                break;
              }
            } catch (e2) {}
          }
        } finally {
          toast.dismiss('desk-up');
        }
      }

      const payload = {
        response_notes: replyText.trim(),
        corrective_artwork_url: uploadedArtworkUrl,
        declared_mrp: declaredMrp ? parseFloat(declaredMrp) : null,
        declared_net_quantity: declaredNetQty || null,
      };

      const res = await employerAPI.respondDeficiencyCase(selectedCase.id, payload);
      toast.success(res.data?.message || 'Statutory rectification response submitted to Directorate!');
      setSelectedCase(null);
      await fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to submit response.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 border border-indigo-500/30 rounded-3xl p-6 shadow-md text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 text-amber-400 font-extrabold text-lg mb-1">
              <Gavel className="w-6 h-6" />
              <span>Statutory Compliance & Deficiency Resolution Desk</span>
            </div>
            <p className="text-sm text-slate-200 max-w-3xl leading-relaxed">
              Official Legal Resolution Desk for 15-Day Statutory Deficiency Memos, Directorate Show-Cause Notices, Legal Directives, and SLA Escalation Defenses under the Legal Metrology Act 2009.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 shrink-0">
            <div className="text-right">
              <div className="text-3xs uppercase font-extrabold tracking-wider text-indigo-200">Active Memos</div>
              <div className="text-sm font-black text-amber-400">{metrics.open + metrics.overdue} Action Required</div>
            </div>
            <Scale className="w-8 h-8 text-amber-400" />
          </div>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-3xs uppercase font-extrabold text-slate-400">Total Legal Cases</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{metrics.total}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-2xs">
          <div className="text-3xs uppercase font-extrabold text-amber-700">Awaiting Response (SLA)</div>
          <div className="text-2xl font-black text-amber-900 mt-1">{metrics.open}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/30 shadow-2xs">
          <div className="text-3xs uppercase font-extrabold text-blue-700">Under Directorate Review</div>
          <div className="text-2xl font-black text-blue-900 mt-1">{metrics.inReview}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-2xs">
          <div className="text-3xs uppercase font-extrabold text-emerald-700">Resolved & Closed</div>
          <div className="text-2xl font-black text-emerald-900 mt-1">{metrics.resolved}</div>
        </div>
      </div>

      {/* Link to Dedicated Product Violations Desk */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700 shrink-0">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <div className="font-black text-slate-900 text-sm">Pre-Market Product Violations & Required Documents Desk</div>
            <div className="text-slate-600 text-2xs mt-0.5">Flagged pre-market packaging infractions, NABL lab report mandates, and artwork re-scans are managed on the dedicated Violations Desk.</div>
          </div>
        </div>
        <Link
          to="/employer/notices"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-2xs shadow-sm flex items-center gap-1.5 shrink-0 transition-all"
        >
          <span>Open Product Violations Desk</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Tabs & Search Filter */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>All Cases</span>
            <span className="text-3xs px-2 py-0.5 rounded-full font-mono bg-slate-200 text-slate-700">
              {legalCases.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('open')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'open'
                ? 'bg-amber-600 text-white shadow-xs shadow-amber-600/30'
                : 'text-amber-800 hover:bg-amber-50'
            }`}
          >
            <span>Awaiting Response</span>
            <span className="text-3xs px-2 py-0.5 rounded-full font-mono bg-amber-100 text-amber-900">
              {metrics.open}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('response_received')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'response_received'
                ? 'bg-blue-600 text-white shadow-xs shadow-blue-600/30'
                : 'text-blue-800 hover:bg-blue-50'
            }`}
          >
            <span>In Review</span>
            <span className="text-3xs px-2 py-0.5 rounded-full font-mono bg-blue-100 text-blue-900">
              {metrics.inReview}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('overdue')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'overdue'
                ? 'bg-rose-600 text-white shadow-xs shadow-rose-600/30'
                : 'text-rose-800 hover:bg-rose-50'
            }`}
          >
            <span>SLA Overdue</span>
            <span className="text-3xs px-2 py-0.5 rounded-full font-mono bg-rose-100 text-rose-900">
              {metrics.overdue}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('resolved')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'resolved'
                ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30'
                : 'text-emerald-800 hover:bg-emerald-50'
            }`}
          >
            <span>Resolved</span>
            <span className="text-3xs px-2 py-0.5 rounded-full font-mono bg-emerald-100 text-emerald-900">
              {metrics.resolved}
            </span>
          </button>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search case #, product, brand, directive..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-none font-medium"
          />
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 font-medium bg-white rounded-3xl border border-slate-200">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
          <span>Loading statutory resolution cases...</span>
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="p-12 text-center text-slate-500 font-medium bg-white rounded-3xl border border-slate-200 space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-80" />
          <p className="font-bold text-slate-900">No Resolution Cases Found</p>
          <p className="text-xs text-slate-500">Your brand products are currently in full statutory compliance.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCases.map((c) => {
            const isResolved = c.status === 'RESOLVED';
            const isResponseReceived = !isResolved && (c.status === 'RESPONSE_RECEIVED' || Boolean(c.manufacturer_response_notes));
            const isOverdue = !isResolved && (c.is_overdue || c.status === 'OVERDUE_ESCALATED');
            const proofImg = c.versions?.[0]?.artwork_url || c.artwork_file_path || c.image_url;

            return (
              <div
                key={c.id}
                className={`bg-white border-2 rounded-3xl p-5 shadow-sm space-y-4 transition-all ${
                  isResolved
                    ? 'border-emerald-200 bg-emerald-50/10'
                    : isResponseReceived
                    ? 'border-blue-200'
                    : isOverdue
                    ? 'border-rose-300'
                    : 'border-slate-200 hover:border-amber-400'
                }`}
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => setZoomImageUrl(proofImg)}
                      className="w-14 h-14 rounded-2xl bg-slate-950 overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center relative shadow-inner cursor-zoom-in group/thumb"
                      title="Click to Zoom Artwork"
                    >
                      <img
                        src={proofImg || '/uploads/artwork_sample.png'}
                        alt={c.product_name}
                        onError={(e) => {
                          if (!e.target.src.includes('artwork_sample.png')) {
                            e.target.src = '/uploads/artwork_sample.png';
                          }
                        }}
                        className="w-full h-full object-contain p-1 group-hover/thumb:scale-105 transition-transform"
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-slate-900 text-base">{c.product_name}</span>
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 text-3xs font-mono font-bold px-2.5 py-0.5 rounded">
                          {c.case_number}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Brand: <strong>{c.brand}</strong> • Packaging: <span className="capitalize">{c.packaging_type || 'Package'}</span> • Declared MRP: ₹{c.declared_mrp || 0}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs px-3.5 py-1.5 rounded-full font-extrabold border uppercase shadow-2xs inline-flex items-center gap-1.5 ${
                        isResolved
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : isResponseReceived
                          ? 'bg-blue-100 text-blue-900 border-blue-300'
                          : isOverdue
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}
                    >
                      {isResolved ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Resolved & Compliant</span>
                        </>
                      ) : isResponseReceived ? (
                        <>
                          <FileCheck className="w-4 h-4 text-blue-600" />
                          <span>Rectification Submitted • In Review</span>
                        </>
                      ) : isOverdue ? (
                        <>
                          <Clock className="w-4 h-4 text-rose-600" />
                          <span>15-Day SLA Overdue</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 text-amber-600" />
                          <span>{c.days_remaining} Days Left to Respond</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Statutory Directives */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Official Directorate Deficiency Directive:</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed font-medium">"{c.memo_text}"</p>

                  {c.deficiencies && c.deficiencies.length > 0 && (
                    <ul className="list-disc list-inside text-slate-600 pl-1 space-y-1">
                      {c.deficiencies.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  )}

                  <div className="flex items-center justify-between text-3xs font-mono text-slate-500 pt-1 border-t border-slate-200">
                    <span>Dispatched Date: <strong>{c.dispatched_at || 'Recently'}</strong></span>
                    <span>Statutory Deadline: <strong className={isOverdue ? 'text-rose-600' : 'text-slate-800'}>{c.sla_deadline}</strong></span>
                  </div>
                </div>

                {/* Submitted Response Preview if already responded */}
                {c.manufacturer_response_notes && (
                  <div className="bg-blue-50/60 p-3.5 rounded-2xl border border-blue-200 text-xs text-blue-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-blue-950">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />
                      <span>Submitted Brand Rectification Statement:</span>
                    </div>
                    <p className="italic text-slate-700">"{c.manufacturer_response_notes}"</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProductDetails({
                        id: c.application_id,
                        product_name: c.product_name,
                        brand: c.brand,
                        category: c.category,
                        packaging_type: c.packaging_type,
                        declared_mrp: c.declared_mrp,
                        declared_net_quantity: c.declared_net_quantity,
                        artwork_file_path: c.artwork_file_path,
                        image_url: c.image_url,
                        status: c.status,
                        violations: c.violations || [],
                      });
                    }}
                    className="text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Inspect Full Case Dossier</span>
                  </button>

                  {!isResolved && (
                    <button
                      type="button"
                      onClick={() => handleOpenCaseModal(c)}
                      className={`text-xs font-extrabold px-5 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer ${
                        isResponseReceived
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30'
                          : 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30'
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      <span>{isResponseReceived ? 'Update Rectification Proof' : 'Submit 15-Day Rectification Proof'}</span>
                    </button>
                  )}
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

      {/* Modal: Submit 15-Day Rectification Response */}
      {selectedCase && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-fade-in text-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Gavel className="w-5 h-5 text-amber-600" />
                  <span>Submit Rectification Response: {selectedCase.case_number}</span>
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Product: <strong>{selectedCase.product_name}</strong> ({selectedCase.brand})
                </p>
              </div>
              <button
                onClick={() => setSelectedCase(null)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitReply} className="space-y-4 text-xs">
              <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-amber-950 space-y-1">
                <span className="font-bold uppercase text-3xs block">Official Directorate Directive:</span>
                <p className="text-2xs font-medium italic">"{selectedCase.memo_text}"</p>
              </div>

              {/* Upload Corrected Artwork */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 uppercase text-3xs">
                  Upload Corrected Packaging Artwork / Proof Document *
                </label>
                <div className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl p-4 text-center transition-all bg-slate-50 relative">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  />
                  {proofFiles.length > 0 ? (
                    <div className="space-y-2 relative z-20">
                      <div className="flex items-center gap-2 flex-wrap justify-center">
                        {proofFiles.map((f, idx) => (
                          <div key={idx} className="relative w-16 h-16 rounded-xl border border-slate-300 overflow-hidden bg-slate-900">
                            {f.type && f.type.startsWith('image/') ? (
                              <img src={URL.createObjectURL(f)} alt={`Proof ${idx + 1}`} className="w-full h-full object-cover" />
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full text-slate-300 text-4xs p-1 text-center font-mono">
                                <span>DOC</span>
                                <span className="truncate w-full">{f.name}</span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setProofFiles((prev) => prev.filter((_, i) => i !== idx));
                              }}
                              className="absolute top-0.5 right-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full w-4 h-4 flex items-center justify-center text-4xs font-bold z-30"
                              title="Remove"
                            >
                              ✕
                            </button>
                            <span className="absolute bottom-0 left-0 bg-slate-900/80 text-white font-mono text-5xs px-1 rounded-tr">
                              #{idx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                      <span className="text-3xs text-emerald-600 font-bold block">
                        ✓ {proofFiles.length} proof document/image(s) attached. Click or drop to add more.
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1 text-slate-500">
                      <Upload className="w-6 h-6 mx-auto text-amber-600" />
                      <p className="font-bold text-slate-800">Click or drag & drop rectified packaging artwork & proofs</p>
                      <p className="text-3xs text-slate-500">PNG, JPG, WEBP, or PDF (Select Multiple Files)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Declared MRP & Net Qty */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">Rectified Declared MRP (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={declaredMrp}
                    onChange={(e) => setDeclaredMrp(e.target.value)}
                    placeholder="e.g. 25.00"
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">Rectified Declared Net Qty</label>
                  <input
                    type="text"
                    value={declaredNetQty}
                    onChange={(e) => setDeclaredNetQty(e.target.value)}
                    placeholder="e.g. 200g"
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* Response Explanation */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">
                  Manufacturer Rectification Explanation / Defense Statement *
                </label>
                <textarea
                  rows={3}
                  required
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Detail the packaging adjustments made to satisfy statutory requirements..."
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedCase(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-800 font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold shadow-md shadow-amber-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Dispatch Defense to Directorate</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: High-Definition Document Zoom Lightbox */}
      {zoomImageUrl && (
        <div
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-70 flex flex-col items-center justify-center p-4 animate-fade-in"
          onClick={() => setZoomImageUrl(null)}
        >
          <div
            className="relative bg-slate-900 border border-slate-700 rounded-3xl p-4 max-w-5xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 text-white">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <span className="font-extrabold text-sm">Packaging Evidence Inspection</span>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={zoomImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in New Tab</span>
                </a>
                <button
                  onClick={() => setZoomImageUrl(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 w-full h-full min-h-0 bg-slate-950/60 rounded-2xl flex items-center justify-center p-2 overflow-hidden border border-slate-800">
              <img
                src={zoomImageUrl}
                alt="Evidence"
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
