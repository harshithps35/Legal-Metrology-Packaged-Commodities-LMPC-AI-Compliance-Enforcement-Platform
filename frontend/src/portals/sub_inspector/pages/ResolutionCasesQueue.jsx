import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  AlertTriangle,
  Send,
  CheckCircle2,
  Search,
  Loader2,
  FileCheck,
  Building2,
  ArrowRight,
  Eye,
  RotateCcw,
  Maximize2,
  ExternalLink,
  FileText,
  Download,
  ShieldAlert,
  AlertOctagon,
  Scale,
  XCircle,
  Gavel,
  ShieldCheck,
  Sparkles,
  Package,
  Layers,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  Check,
} from 'lucide-react';
import { subInspectorAPI, supervisorAPI, reportsAPI } from '../../../services/api';
import ProductDetailModal, { getProductImageUrl } from '../../../components/ProductDetailModal';
import toast from 'react-hot-toast';

export default function ResolutionCasesQueue() {
  const [cases, setCases] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tabs & Search
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'ready_for_review', 'awaiting_brand', 'overdue', 'resolved'
  const [search, setSearch] = useState('');

  // Modals & Details
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [zoomImageUrl, setZoomImageUrl] = useState(null);

  // Create memo modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [memoForm, setMemoForm] = useState({
    application_id: '',
    memo_text: '',
    deficiency_1: '',
    deficiency_2: '',
    sla_days: 15,
  });

  // Adjudicate / Resolve case modal
  const [selectedCase, setSelectedCase] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [casesRes, appsRes] = await Promise.all([
        subInspectorAPI.getCases().catch(() => ({ data: [] })),
        subInspectorAPI.getApplications().catch(() => ({ data: [] })),
      ]);
      setCases(casesRes.data || []);
      setApplications(appsRes.data || []);
      if (appsRes.data && appsRes.data.length > 0) {
        setMemoForm((prev) => ({ ...prev, application_id: appsRes.data[0].id }));
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load statutory resolution desk cases.');
    } finally {
      setLoading(false);
    }
  };

  // Only consider post-market / commercial surveillance legal cases for this desk
  const legalCases = useMemo(() => {
    return cases.filter((c) => !c.application_id);
  }, [cases]);

  // Metrics calculation
  const metrics = useMemo(() => {
    let awaitingBrand = 0;
    let readyForReview = 0;
    let overdue = 0;
    let resolved = 0;

    legalCases.forEach((c) => {
      if (c.status === 'RESOLVED') {
        resolved++;
      } else if (c.status === 'RESPONSE_RECEIVED' || c.manufacturer_response_notes || (c.versions && c.versions.length > 0)) {
        readyForReview++;
      } else if (c.is_overdue || c.status === 'OVERDUE_ESCALATED') {
        overdue++;
      } else {
        awaitingBrand++;
      }
    });

    return {
      total: legalCases.length,
      awaitingBrand,
      readyForReview,
      overdue,
      resolved,
    };
  }, [legalCases]);

  // Tab Filtering: Exclude pre-market packaging cases that belong exclusively to Product Violations Desk
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      // If case is for a pre-market packaging application, it belongs exclusively on Product Violations Desk
      if (c.application_id) return false;

      const isResolved = c.status === 'RESOLVED';
      const isResponseReceived = !isResolved && (c.status === 'RESPONSE_RECEIVED' || Boolean(c.manufacturer_response_notes) || (c.versions && c.versions.length > 0));
      const isOverdue = !isResolved && (c.is_overdue || c.status === 'OVERDUE_ESCALATED');
      const isAwaitingBrand = !isResolved && !isResponseReceived && !isOverdue;

      if (activeTab === 'ready_for_review' && !isResponseReceived) return false;
      if (activeTab === 'awaiting_brand' && !isAwaitingBrand) return false;
      if (activeTab === 'overdue' && !isOverdue) return false;
      if (activeTab === 'resolved' && !isResolved) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesCase = (c.case_number || '').toLowerCase().includes(q);
        const matchesProduct = (c.product_name || '').toLowerCase().includes(q);
        const matchesCompany = (c.company_name || '').toLowerCase().includes(q);
        const matchesMemo = (c.memo_text || '').toLowerCase().includes(q);
        if (!matchesCase && !matchesProduct && !matchesCompany && !matchesMemo) return false;
      }

      return true;
    });
  }, [cases, activeTab, search]);

  const handleCreateMemo = async (e) => {
    e.preventDefault();
    if (!memoForm.application_id) return;
    try {
      setSubmitting(true);
      const defs = [memoForm.deficiency_1, memoForm.deficiency_2].filter(Boolean);
      const res = await subInspectorAPI.createMemo({
        application_id: parseInt(memoForm.application_id, 10),
        memo_text: memoForm.memo_text,
        deficiencies: defs.length > 0 ? defs : ['Statutory declaration clarification required under Rule 6.'],
        sla_days: parseInt(memoForm.sla_days, 10) || 15,
      });
      toast.success(res.data?.message || 'Statutory 15-Day Deficiency Memo dispatched to Brand Owner!');
      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to dispatch memo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveCase = async (e) => {
    e.preventDefault();
    if (!selectedCase) return;
    try {
      setSubmitting(true);
      const res = await subInspectorAPI.resolveCase(selectedCase.id, {
        response_notes: resolutionNotes || 'Corrected artwork & statutory declarations verified compliant with LMPC Rules 2011.',
        action: 'APPROVE',
      });
      toast.success(res.data?.message || 'Statutory clearance granted! Product verified compliant.');
      setSelectedCase(null);
      setResolutionNotes('');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to resolve case.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectClarification = async () => {
    if (!selectedCase) return;
    if (!resolutionNotes.trim()) {
      toast.error('Please specify the deficiency reasons why the submitted proof was rejected.');
      return;
    }
    try {
      setSubmitting(true);
      const res = await subInspectorAPI.resolveCase(selectedCase.id, {
        response_notes: resolutionNotes,
        action: 'REQUEST_CLARIFICATION',
      });
      toast.success(res.data?.message || 'Case returned to Brand Owner for mandatory rectification resubmission.');
      setSelectedCase(null);
      setResolutionNotes('');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to return case.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEscalateToALMO = async () => {
    if (!selectedCase) return;
    try {
      setSubmitting(true);
      if (selectedCase.application_id) {
        await subInspectorAPI.forwardToALMO(selectedCase.application_id);
      }
      toast.success(`Case ${selectedCase.case_number} escalated to ALMO Level 3 for formal statutory sanction!`);
      setSelectedCase(null);
      setResolutionNotes('');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to escalate to ALMO.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Directorate Command Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 border border-indigo-500/30 rounded-3xl p-6 shadow-md text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 text-amber-400 font-extrabold text-lg mb-1">
              <Gavel className="w-6 h-6" />
              <span>Statutory Compliance Resolution & Adjudication Desk</span>
            </div>
            <p className="text-sm text-slate-200 max-w-3xl leading-relaxed">
              Directorate 15-Day Statutory Deficiency Memo Adjudication Command under Section 36 & 49 of the Legal Metrology Act 2009. Review brand owner legal submissions, examine rectified label packaging proofs, hold resolution hearings, grant statutory clearances, and escalate non-compliant entities to ALMO L3.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-amber-600/30 flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Dispatch 15-Day Deficiency Memo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Link to Dedicated Product Violations Verification Desk */}
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="font-black text-slate-900 text-sm">Product Violations Verification Desk</div>
            <div className="text-slate-600 text-2xs mt-0.5">Pre-market packaging violations, brand-submitted documents/v2 proofs, and optical re-scans are verified on the dedicated desk.</div>
          </div>
        </div>
        <Link
          to="/sub-inspector/violations"
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-2xs shadow-sm flex items-center gap-1.5 shrink-0 transition-all"
        >
          <span>Open Product Violations Desk</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Statutory Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-3xs uppercase font-extrabold text-slate-400">Total Cases</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{metrics.total}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/30 shadow-2xs">
          <div className="text-3xs uppercase font-extrabold text-blue-700">Ready for Adjudication</div>
          <div className="text-2xl font-black text-blue-900 mt-1">{metrics.readyForReview}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-2xs">
          <div className="text-3xs uppercase font-extrabold text-amber-700">Awaiting Brand Proof</div>
          <div className="text-2xl font-black text-amber-900 mt-1">{metrics.awaitingBrand}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/30 shadow-2xs">
          <div className="text-3xs uppercase font-extrabold text-rose-700">15-Day SLA Overdue</div>
          <div className="text-2xl font-black text-rose-900 mt-1">{metrics.overdue}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-2xs">
          <div className="text-3xs uppercase font-extrabold text-emerald-700">Resolved & Cleared</div>
          <div className="text-2xl font-black text-emerald-900 mt-1">{metrics.resolved}</div>
        </div>
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
            <span>All Resolution Cases</span>
            <span className="text-3xs px-2 py-0.5 rounded-full font-mono bg-slate-200 text-slate-700">
              {legalCases.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ready_for_review')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ready_for_review'
                ? 'bg-blue-600 text-white shadow-xs shadow-blue-600/30'
                : 'text-blue-800 hover:bg-blue-50'
            }`}
          >
            <span>Brand Responses Ready</span>
            <span className="text-3xs px-2 py-0.5 rounded-full font-mono bg-blue-100 text-blue-900">
              {metrics.readyForReview}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('awaiting_brand')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'awaiting_brand'
                ? 'bg-amber-600 text-white shadow-xs shadow-amber-600/30'
                : 'text-amber-800 hover:bg-amber-50'
            }`}
          >
            <span>Awaiting Submission (SLA)</span>
            <span className="text-3xs px-2 py-0.5 rounded-full font-mono bg-amber-100 text-amber-900">
              {metrics.awaitingBrand}
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
            <span>Resolved & Cleared</span>
            <span className="text-3xs px-2 py-0.5 rounded-full font-mono bg-emerald-100 text-emerald-900">
              {metrics.resolved}
            </span>
          </button>
        </div>

        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by case #, product, brand, directive..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-none font-medium"
          />
        </div>
      </div>

      {/* Cases List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-200 font-medium">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-600 mb-2" />
          <span>Loading Directorate resolution cases...</span>
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-200 font-medium space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-80" />
          <p className="font-bold text-slate-900">No Resolution Cases In This Category</p>
          <p className="text-xs text-slate-500">All statutory packaging deficiency cases are currently resolved or filtered.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold font-mono text-xs uppercase border-b border-slate-200">
                <tr>
                  <th className="px-5 py-4">Case Ref / ID</th>
                  <th className="px-5 py-4">Product & Entity</th>
                  <th className="px-5 py-4">Statutory Directives & Breaches</th>
                  <th className="px-5 py-4">Proof & Evidence</th>
                  <th className="px-5 py-4">15-Day SLA Meter</th>
                  <th className="px-5 py-4 text-center">Adjudication Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredCases.map((c) => {
                  const isResolved = c.status === 'RESOLVED';
                  const isResponseReceived = !isResolved && (c.status === 'RESPONSE_RECEIVED' || Boolean(c.manufacturer_response_notes) || (c.versions && c.versions.length > 0));
                  const isOverdue = !isResolved && (c.is_overdue || c.status === 'OVERDUE_ESCALATED');

                  const matchedApp = applications.find((a) => a.id === c.application_id) || {
                    id: c.application_id,
                    product_name: c.product_name,
                    brand: c.company_name,
                    company_name: c.company_name,
                    category: 'food',
                    status: c.status,
                    violations: c.violations || [],
                  };

                  const proofImg = c.latest_rectified_artwork_url || c.artwork_file_path || c.image_url || '/uploads/artwork_sample.png';

                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedProductDetails(matchedApp)}
                      className="hover:bg-amber-50/40 cursor-pointer transition-colors group"
                    >
                      {/* Case Ref */}
                      <td className="px-5 py-4 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span className="text-amber-700 font-black">{c.case_number}</span>
                        </div>
                        <span className="block text-3xs font-mono text-slate-400 font-normal mt-0.5">
                          App #{c.application_id}
                        </span>
                      </td>

                      {/* Product & Entity */}
                      <td className="px-5 py-4">
                        <div className="min-w-[180px]">
                          <div className="font-extrabold text-slate-900 group-hover:text-amber-700 transition-colors">
                            {c.product_name}
                          </div>
                          <div className="text-xs text-slate-500 font-medium">{c.company_name}</div>
                          {c.manufacturer_response_notes && (
                            <div className="text-3xs text-blue-900 bg-blue-50 px-2 py-1 rounded-md mt-1 border border-blue-100 font-medium italic line-clamp-1">
                              <strong>Brand Note:</strong> "{c.manufacturer_response_notes}"
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Directives & Breaches */}
                      <td className="px-5 py-4 max-w-xs">
                        <div className="space-y-1.5">
                          {c.violations && c.violations.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {c.violations.slice(0, 3).map((v, vIdx) => {
                                const isBreach = v.status === 'DETECTED_BREACH';
                                const sev = (v.severity || '').toLowerCase();
                                return (
                                  <span
                                    key={vIdx}
                                    className={`text-3xs font-extrabold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                                      isBreach
                                        ? sev === 'critical'
                                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                                          : 'bg-amber-50 text-amber-800 border-amber-200'
                                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    }`}
                                  >
                                    <span className="font-mono">{v.rule_code || 'RULE-06'}:</span>
                                    <span>{v.title || 'Packaging Violation'}</span>
                                  </span>
                                );
                              })}
                              {c.violations.length > 3 && (
                                <span className="text-3xs text-slate-500 font-bold">
                                  +{c.violations.length - 3} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="text-slate-800 font-medium line-clamp-2">{c.memo_text}</div>
                          )}
                          <div className="text-3xs text-slate-500 font-mono">Dispatched: {c.dispatched_at}</div>
                        </div>
                      </td>

                      {/* Proof Artwork Thumbnail */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setZoomImageUrl(proofImg);
                            }}
                            className="w-12 h-12 rounded-xl bg-slate-950 overflow-hidden border border-slate-300 relative group/zoom cursor-zoom-in shrink-0 shadow-xs hover:ring-2 hover:ring-indigo-500 transition-all flex items-center justify-center"
                            title="Click to Zoom Artwork Proof"
                          >
                            <img
                              src={proofImg}
                              alt={c.product_name}
                              className="w-full h-full object-contain p-0.5 group-hover/zoom:scale-105 transition-transform"
                              onError={(e) => {
                                if (!e.target.src.includes('artwork_sample.png')) e.target.src = '/uploads/artwork_sample.png';
                              }}
                            />
                            <span className="absolute bottom-0 inset-x-0 bg-slate-950/90 text-white text-[7px] font-bold text-center py-0.5 font-mono">
                              {isResponseReceived ? '✓ PROOF' : 'SAMPLE'}
                            </span>
                          </div>

                          <div className="text-3xs space-y-0.5">
                            {isResponseReceived ? (
                              <span className="bg-emerald-100 text-emerald-900 font-extrabold px-2 py-0.5 rounded-full border border-emerald-300 inline-flex items-center gap-1">
                                <FileCheck className="w-2.5 h-2.5 text-emerald-600" />
                                <span>Proof Uploaded</span>
                              </span>
                            ) : (
                              <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-300 inline-block">
                                Awaiting Proof
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 15-Day SLA Meter */}
                      <td className="px-5 py-4">
                        {isResolved ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Resolved ({c.resolved_at || 'Compliant'})</span>
                          </span>
                        ) : (
                          <div>
                            <div className={`font-mono font-black text-xs ${isOverdue ? 'text-rose-600' : 'text-amber-700'}`}>
                              {c.days_remaining} Days Left
                            </div>
                            <div className="text-3xs text-slate-500">Deadline: {c.sla_deadline}</div>
                          </div>
                        )}
                      </td>

                      {/* Action Button */}
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {isResolved ? (
                            <span className="bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-full text-2xs font-bold border border-emerald-300 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Verified Compliant</span>
                            </span>
                          ) : isResponseReceived ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCase(c);
                                setResolutionNotes(
                                  `Brand owner submitted artwork & declaration documents verified compliant with Rule 6 & Schedule II directives.`
                                );
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-3.5 py-1.5 rounded-xl transition-all shadow-md shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer animate-pulse"
                            >
                              <Gavel className="w-3.5 h-3.5" />
                              <span>Adjudicate Proof</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCase(c);
                              }}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1.5 rounded-xl text-3xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
                            >
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Awaiting Brand Proof</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Universal Product Details Modal */}
      {selectedProductDetails && (
        <ProductDetailModal
          product={selectedProductDetails}
          onClose={() => setSelectedProductDetails(null)}
        />
      )}

      {/* Modal: Adjudicate / Resolve Case */}
      {selectedCase && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-fade-in text-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Gavel className="w-5 h-5 text-indigo-600" />
                  <span>Adjudicate Case: {selectedCase.case_number}</span>
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Product: <strong>{selectedCase.product_name}</strong> • Entity: {selectedCase.company_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedCase(null)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResolveCase} className="space-y-4 text-xs">
              {/* Directive Summary */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
                <span className="font-bold text-3xs uppercase text-slate-500">Statutory Deficiency Directives:</span>
                <p className="text-slate-800 font-medium">"{selectedCase.memo_text}"</p>
              </div>

              {/* Brand Submitted Statement */}
              {selectedCase.manufacturer_response_notes && (
                <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-200 space-y-1 text-blue-950">
                  <span className="font-bold text-3xs uppercase text-blue-800">Brand Owner Rectification Statement:</span>
                  <p className="font-medium italic">"{selectedCase.manufacturer_response_notes}"</p>
                </div>
              )}

              {/* Evidence Comparison Preview */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 uppercase text-3xs">
                  Submitted Packaging Evidence & Proof Document
                </label>
                <div className="flex items-center gap-4 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <img
                    src={selectedCase.latest_rectified_artwork_url || selectedCase.artwork_file_path || selectedCase.image_url || '/uploads/artwork_sample.png'}
                    alt="Proof"
                    className="h-28 object-contain rounded-lg border border-slate-700 cursor-zoom-in"
                    onClick={() => setZoomImageUrl(selectedCase.latest_rectified_artwork_url || selectedCase.artwork_file_path || selectedCase.image_url)}
                  />
                  <div className="text-slate-300 text-2xs space-y-1">
                    <p className="text-emerald-400 font-bold">✓ High-Resolution Artwork Attached</p>
                    <p className="text-slate-400">Click thumbnail to open full-scale optical zoom inspector.</p>
                    <button
                      type="button"
                      onClick={() => setZoomImageUrl(selectedCase.latest_rectified_artwork_url || selectedCase.artwork_file_path || selectedCase.image_url)}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-3xs flex items-center gap-1 mt-1 cursor-pointer"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Inspect Evidence Lightbox</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Directorate Adjudication Order Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">
                  Directorate Statutory Finding / Adjudication Order *
                </label>
                <textarea
                  rows={3}
                  required
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Record official verification notes and statutory compliance confirmation..."
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium"
                />
              </div>

              {/* Legal Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleEscalateToALMO}
                  disabled={submitting}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-2xs flex items-center gap-1 cursor-pointer"
                >
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                  <span>Escalate to ALMO L3 for Sanctions</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRejectClarification}
                    disabled={submitting}
                    className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-2xs cursor-pointer"
                  >
                    Reject & Return for Clarification
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Grant Clearance & Close Case</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Dispatch New Deficiency Memo */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-amber-600" />
                <span>Issue 15-Day Statutory Deficiency Memo</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMemo} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">Target Product Application *</label>
                <select
                  required
                  value={memoForm.application_id}
                  onChange={(e) => setMemoForm({ ...memoForm, application_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium"
                >
                  {applications.map((app) => (
                    <option key={app.id} value={app.id}>
                      #{app.id} - {app.product_name} ({app.brand || app.company_name || 'Brand'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">Statutory Directives Explanation *</label>
                <textarea
                  rows={3}
                  required
                  value={memoForm.memo_text}
                  onChange={(e) => setMemoForm({ ...memoForm, memo_text: e.target.value })}
                  placeholder="Detail the mandatory packaging corrections required under Rule 6 / Schedule II..."
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">Deficiency 1 Citation</label>
                  <input
                    type="text"
                    value={memoForm.deficiency_1}
                    onChange={(e) => setMemoForm({ ...memoForm, deficiency_1: e.target.value })}
                    placeholder="e.g. Rule 6(1)(c) Missing MRP"
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">Deficiency 2 Citation</label>
                  <input
                    type="text"
                    value={memoForm.deficiency_2}
                    onChange={(e) => setMemoForm({ ...memoForm, deficiency_2: e.target.value })}
                    placeholder="e.g. Schedule II Font Height < 2mm"
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">Statutory SLA Window</label>
                <select
                  value={memoForm.sla_days}
                  onChange={(e) => setMemoForm({ ...memoForm, sla_days: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium"
                >
                  <option value={15}>15 Days Statutory Window (Standard)</option>
                  <option value={7}>7 Days Emergency Final Notice</option>
                  <option value={30}>30 Days Extended Industrial Window</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
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
                  <span>Dispatch Statutory Memo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Zoom Modal */}
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
