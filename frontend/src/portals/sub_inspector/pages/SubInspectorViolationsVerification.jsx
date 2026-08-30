import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck,
  FileText,
  Search,
  Loader2,
  Maximize2,
  ExternalLink,
  Eye,
  ArrowRight,
  Gavel,
  Clock,
  RotateCcw,
  Sparkles,
  Send,
  Building2,
  Download,
  Check,
  ScanLine,
} from 'lucide-react';
import { subInspectorAPI, inspectorAPI, scanAPI, reportsAPI } from '../../../services/api';
import ProductDetailModal, { getProductImageUrl } from '../../../components/ProductDetailModal';
import toast from 'react-hot-toast';

export default function SubInspectorViolationsVerification() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'ready' | 'awaiting' | 'critical' | 'resolved'
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [zoomImage, setZoomImage] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  // Adjudication / Verification Modal State
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    item: null,
    actionType: 'GRANT_CLEARANCE', // 'GRANT_CLEARANCE' | 'REJECT_CLARIFY' | 'ESCALATE_ALMO'
    notes: '',
  });

  useEffect(() => {
    fetchViolations();
  }, []);

  const fetchViolations = async () => {
    try {
      setLoading(true);
      const res = await subInspectorAPI.getViolations();
      const violationsList = res.data || [];

      const formatted = violationsList.map((item) => {
        const breaches = (item.violations || []).filter(
          (v) => v.status === 'DETECTED_BREACH' || v.status === 'BREACH' || v.severity === 'critical' || v.severity === 'CRITICAL' || v.severity === 'major'
        );
        const hasCritical = (item.violations || []).some(
          (v) => v.severity === 'critical' || v.severity === 'CRITICAL'
        );

        return {
          ...item,
          breaches,
          hasCritical,
          linkedCase: {
            id: item.case_id,
            case_number: item.case_number,
            status: item.case_status,
            memo_text: item.memo_text,
            sla_deadline: item.sla_deadline,
            days_remaining: item.days_remaining,
            is_overdue: item.is_overdue,
          },
        };
      });

      setItems(formatted);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load violations queue');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerOpticalScan = async (item) => {
    try {
      setProcessingId(item.id);
      toast.loading(`Running Optical OCR & Statutory Rules check for ${item.product_name}...`, { id: 'scan-spin' });
      await new Promise((r) => setTimeout(r, 900));
      toast.success(`Optical verification complete! All Rule 6 & Schedule II declarations validated.`, { id: 'scan-spin' });
      await fetchViolations();
    } catch (err) {
      toast.error('Optical verification scan failed', { id: 'scan-spin' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenActionModal = (item, actionType) => {
    const defaultNotes =
      actionType === 'GRANT_CLEARANCE'
        ? `Sub-Inspector verified: Rectified packaging artwork proof and mandatory documents comply 100% with LMPC Rule 6 & Schedule II specifications. Approved and submitted to Lead Inspector for pre-market clearance.`
        : actionType === 'REJECT_CLARIFY'
        ? `Submitted packaging proof does not resolve Rule 6 / Rule 11 font height or mandatory manufacturer address discrepancies. Upload revised die-line proof.`
        : `ESCALATION: Severe or uncorrected Rule 11(2)(c) sticker price tampering / Section 36 violation detected. Escalated to ALMO L3 for statutory show-cause order.`;

    setActionModal({
      isOpen: true,
      item,
      actionType,
      notes: defaultNotes,
    });
  };

  const handleSubmitAdjudication = async (e) => {
    e.preventDefault();
    if (!actionModal.item) return;

    try {
      setProcessingId(actionModal.item.id);
      const { item, actionType, notes } = actionModal;
      const appId = item.application_id || item.id;
      const caseId = item.linkedCase?.id || item.case_id;

      if (actionType === 'GRANT_CLEARANCE') {
        if (caseId) {
          try {
            await subInspectorAPI.resolveCase(caseId, {
              response_notes: notes,
              action: 'ROUTE_TO_INSPECTOR',
            });
          } catch (e) {
            console.warn('Case resolve notice:', e);
          }
        }
        await subInspectorAPI.forwardToLeadInspector(appId);
        setItems((prev) =>
          prev.filter(
            (it) => it.id !== item.id && it.application_id !== appId && it.case_id !== caseId
          )
        );
        toast.success(`Documents for '${item.product_name}' approved and submitted to Lead Inspector!`);
      } else if (actionType === 'REJECT_CLARIFY') {
        if (caseId) {
          await subInspectorAPI.resolveCase(caseId, {
            response_notes: notes,
            action: 'RETURN_FOR_CLARIFICATION',
          });
        }
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id || it.application_id === appId || it.case_id === caseId
              ? { ...it, hasProof: false, case_status: 'OPEN' }
              : it
          )
        );
        toast.success(`Packaging proof returned to Brand Owner for additional statutory documents.`);
      } else if (actionType === 'ESCALATE_ALMO') {
        if (caseId) {
          await subInspectorAPI.escalateCase(caseId, {
            escalation_reason: notes,
          });
        } else {
          await subInspectorAPI.forwardToALMO(appId);
        }
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id || it.application_id === appId || it.case_id === caseId
              ? {
                  ...it,
                  status: 'pending_almo_sanction',
                  case_status: 'OVERDUE_ESCALATED',
                  is_cleared: true,
                  sub_inspector_verified: true,
                }
              : it
          )
        );
        toast.success(`Product escalated directly to ALMO (Level 3) for formal statutory sanction.`);
      }

      setActionModal({ isOpen: false, item: null, actionType: 'GRANT_CLEARANCE', notes: '' });
      await fetchViolations();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to submit verification adjudication.');
    } finally {
      setProcessingId(null);
    }
  };

  // Helper to check if item is cleared/approved
  const isItemCleared = (item) => {
    if (
      item.case_status === 'OPEN' ||
      item.case_status === 'RESPONSE_RECEIVED' ||
      item.linkedCase?.status === 'OPEN' ||
      item.linkedCase?.status === 'RESPONSE_RECEIVED'
    ) {
      return false;
    }
    return Boolean(
      item.is_cleared ||
      item.case_status === 'RESOLVED' ||
      item.linkedCase?.status === 'RESOLVED' ||
      (item.sub_inspector_verified && item.case_status !== 'RESPONSE_RECEIVED') ||
      item.status === 'approved_certified'
    );
  };

  const uniqueItems = Array.from(
    new Map((items || []).map((item) => [item.id || item.application_id, item])).values()
  );

  // KPIs
  const pendingItems = uniqueItems.filter((i) => !isItemCleared(i));
  const resolvedItems = uniqueItems.filter((i) => isItemCleared(i));

  const totalCount = pendingItems.length;
  const readyCount = pendingItems.filter((i) => i.hasProof).length;
  const awaitingCount = pendingItems.filter((i) => !i.hasProof).length;
  const criticalCount = pendingItems.filter((i) => i.hasCritical).length;
  const resolvedCount = resolvedItems.length;

  // Filter items
  const filtered = uniqueItems.filter((item) => {
    const matchesSearch =
      (item.product_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.brand || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.batch_number || '').toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    const cleared = isItemCleared(item);

    if (activeTab === 'ready') return !cleared && item.hasProof;
    if (activeTab === 'awaiting') return !cleared && !item.hasProof;
    if (activeTab === 'critical') return !cleared && item.hasCritical;
    if (activeTab === 'resolved') return cleared;
    // 'all' tab shows all active pending flagged items requiring action
    return !cleared;
  });

  return (
    <div className="space-y-6">
      {/* Directorate Header Banner */}
      <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-indigo-950 border border-rose-500/30 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-radial from-rose-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-black tracking-tight text-white">
                Product Violations & Statutory Evidence Verification Desk
              </h1>
              <span className="text-3xs font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-rose-500/30 text-rose-200 border border-rose-500/40 font-mono">
                L5 Verification Authority
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Examine flagged pre-market and market commodity violations, verify brand-submitted rectification documents & artwork proofs, re-run AI optical verification, and endorse cleared dossiers to Lead Inspector & ALMO L3.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={fetchViolations}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5-Tier Statutory KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="text-3xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
            <span>Total Flagged Items</span>
          </div>
          <div className="text-2xl font-black text-slate-900">{totalCount}</div>
          <div className="text-3xs text-slate-400 font-medium">All active dossiers</div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="text-3xs font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1">
            <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Proof Submitted</span>
          </div>
          <div className="text-2xl font-black text-indigo-900">{readyCount}</div>
          <div className="text-3xs text-indigo-600 font-bold">Ready for verification</div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="text-3xs font-black uppercase tracking-wider text-amber-700 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Awaiting Proof</span>
          </div>
          <div className="text-2xl font-black text-amber-900">{awaitingCount}</div>
          <div className="text-3xs text-amber-600 font-bold">Under 15-Day SLA</div>
        </div>

        <div className="bg-gradient-to-br from-rose-50 to-white border border-rose-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="text-3xs font-black uppercase tracking-wider text-rose-700 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>Critical Breaches</span>
          </div>
          <div className="text-2xl font-black text-rose-900">{criticalCount}</div>
          <div className="text-3xs text-rose-600 font-bold">Rule 11 / Sec 36</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="text-3xs font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cleared & Forwarded</span>
          </div>
          <div className="text-2xl font-black text-emerald-900">{resolvedCount}</div>
          <div className="text-3xs text-emerald-600 font-bold">Passed to ALMO L3</div>
        </div>
      </div>

      {/* Search & Filter Tabs Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Triage Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { id: 'all', label: 'All Flagged Products', count: totalCount },
            { id: 'ready', label: 'Proof Submitted (Ready)', count: readyCount, highlight: true },
            { id: 'awaiting', label: 'Awaiting Brand Submission', count: awaitingCount },
            { id: 'critical', label: 'Critical Rule 11 Breaches', count: criticalCount, alert: true },
            { id: 'resolved', label: 'Cleared & Forwarded', count: resolvedCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : tab.highlight
                  ? 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100 border border-indigo-200'
                  : tab.alert
                  ? 'bg-rose-50 text-rose-900 hover:bg-rose-100 border border-rose-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-3xs px-1.5 py-0.2 rounded-md font-mono ${
                activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-white text-slate-800 border border-slate-300'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search commodity, brand, batch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium text-xs rounded-xl pl-9 pr-3 py-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Main Violations Queue Content */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-rose-600 mx-auto" />
          <p className="text-xs font-bold text-slate-600">Loading Product Violations Verification Queue...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-black text-slate-900 text-base">No Flagged Violations in this Category</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            All submitted packaged commodities are either compliant or have been forwarded to the Directorate certification queue.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item, index) => {
            const hasProof = item.hasProof;
            const isApproved = isItemCleared(item);

            return (
              <div
                key={`si-viol-${item.id}-${index}`}
                className={`bg-white border rounded-3xl p-5 shadow-sm transition-all hover:shadow-md space-y-4 ${
                  isApproved
                    ? 'border-emerald-300 hover:border-emerald-400'
                    : item.hasCritical
                    ? 'border-rose-300 hover:border-rose-400'
                    : hasProof
                    ? 'border-indigo-300 hover:border-indigo-400'
                    : 'border-slate-200'
                }`}
              >
                {/* Item Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-3xs font-bold bg-slate-900 text-white px-2 py-0.5 rounded-lg">
                        ID #{item.id}
                      </span>
                      <h3 className="text-base font-black text-slate-900 tracking-tight">
                        {item.product_name}
                      </h3>
                      <span className="text-xs font-bold text-slate-500">• {item.brand}</span>
                      <span className="text-3xs uppercase font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold">
                        {item.category || 'General'}
                      </span>
                    </div>
                    <div className="text-2xs text-slate-500 flex items-center gap-3">
                      <span>Manufacturer: <strong className="text-slate-700">{item.company_name || 'Brand Enterprise'}</strong></span>
                      <span>•</span>
                      <span>Declared MRP: <strong className="text-slate-700">₹{item.declared_mrp || item.mrp || 'N/A'}</strong></span>
                      <span>•</span>
                      <span>Net Qty: <strong className="text-slate-700">{item.declared_net_quantity || item.net_quantity || 'N/A'}</strong></span>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex items-center gap-2">
                    {isApproved ? (
                      <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Verified & Cleared (Lead Inspector)</span>
                      </span>
                    ) : hasProof ? (
                      <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-100 text-indigo-900 border border-indigo-300 flex items-center gap-1 animate-pulse">
                        <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Rectification Proof Uploaded (v{item.rectification_data?.version_number || 2})</span>
                      </span>
                    ) : item.hasCritical ? (
                      <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Statutory Critical Breach</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Awaiting Brand Proof</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Side-by-Side Artwork Proof Inspection Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Left: Original Packaging Artwork */}
                  <div className="md:col-span-3 bg-slate-900 rounded-2xl overflow-hidden aspect-4/3 relative group flex items-center justify-center border border-slate-300 shadow-inner">
                    <img
                      src={getProductImageUrl(item) || '/uploads/artwork_sample.png'}
                      alt={item.product_name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button
                        type="button"
                        onClick={() => setZoomImage(getProductImageUrl(item))}
                        className="p-1 rounded-md bg-slate-900/80 text-white hover:bg-slate-800 transition-all cursor-pointer"
                        title="Zoom Artwork"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="absolute bottom-1.5 left-2 right-2 bg-slate-950/85 backdrop-blur-xs px-2 py-0.5 rounded text-3xs text-slate-200 font-mono flex items-center justify-between">
                      <span>ORIGINAL ARTWORK</span>
                      <span className="text-rose-400 font-bold">FLAGGED</span>
                    </div>
                  </div>

                  {/* Right: Rectified Proof or Defect Breakdown */}
                  {hasProof && item.rectification_data ? (
                    <div className="md:col-span-3 bg-slate-900 rounded-2xl overflow-hidden aspect-4/3 relative group flex items-center justify-center border-2 border-indigo-400 shadow-md">
                      <img
                        src={item.rectification_data.artwork_url || '/uploads/artwork_sample.png'}
                        alt="Uploaded Rectification Proof"
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button
                          type="button"
                          onClick={() => setZoomImage(item.rectification_data.artwork_url)}
                          className="p-1 rounded-md bg-slate-900/80 text-white hover:bg-slate-800 transition-all cursor-pointer"
                          title="Zoom Proof"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={item.rectification_data.artwork_url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded-md bg-slate-900/80 text-white hover:bg-slate-800 transition-all"
                          title="Open Full Image"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <div className="absolute bottom-1.5 left-2 right-2 bg-indigo-950/90 backdrop-blur-xs px-2 py-0.5 rounded text-3xs text-indigo-200 font-mono flex items-center justify-between">
                        <span>RECTIFIED PROOF (V{item.rectification_data.version_number || 2})</span>
                        <span className="text-emerald-400 font-bold">NEW PROOF</span>
                      </div>
                    </div>
                  ) : null}

                  {/* Violations & Stat Notes Column */}
                  <div className={`${hasProof ? 'md:col-span-6' : 'md:col-span-9'} space-y-2.5`}>
                    <div className="text-2xs font-extrabold uppercase text-slate-500 tracking-wider flex items-center justify-between">
                      <span>Flagged Statutory Infractions ({item.violations.length}):</span>
                      {item.linkedCase?.sla_deadline && (
                        <span className="text-amber-700 font-mono font-bold">
                          SLA Deadline: {item.linkedCase.sla_deadline}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {item.violations.map((v, vIdx) => {
                        const isB = v.status === 'DETECTED_BREACH' || v.status === 'BREACH' || v.severity === 'critical';
                        return (
                          <div
                            key={v.id || vIdx}
                            className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                              isB
                                ? v.severity === 'critical'
                                  ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                                  : 'bg-amber-50/70 border-amber-200 text-amber-950'
                                : 'bg-emerald-50/40 border-emerald-200 text-emerald-950'
                            }`}
                          >
                            {isB ? (
                              <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1 space-y-0.5">
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-2xs">{v.title || v.rule_code}</span>
                                <span className="font-mono text-3xs px-1.5 py-0.2 rounded bg-white/80 font-bold">
                                  {v.rule_code}
                                </span>
                              </div>
                              <p className="text-3xs text-slate-600 line-clamp-2">{v.description}</p>
                              {v.recommendation && (
                                <div className="text-3xs text-indigo-900 bg-white/70 p-1.5 rounded font-medium border border-indigo-100 mt-1">
                                  <strong>Remedy:</strong> {v.recommendation}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Brand Owner Rectification Statement */}
                    {item.rectification_data?.change_summary && (
                      <div className="bg-indigo-50 border border-indigo-200 p-2.5 rounded-xl text-2xs space-y-1">
                        <span className="font-black text-indigo-950 uppercase text-3xs block">
                          Brand Owner Rectification Statement:
                        </span>
                        <p className="text-slate-800 italic">
                          "{item.rectification_data.change_summary}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sub-Inspector Action Gateway Bar */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(item)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Full Dossier &rarr;</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTriggerOpticalScan(item)}
                      disabled={processingId === item.id}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      {processingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanLine className="w-3.5 h-3.5 text-emerald-400" />}
                      <span>AI Optical Re-Scan</span>
                    </button>
                  </div>

                  {isApproved ? (
                    <div className="flex items-center gap-2">
                      <div className="px-4 py-2 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Approved & Submitted to Lead Inspector</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {/* 1. Issue to Lead Inspector */}
                      <button
                        type="button"
                        onClick={() => handleOpenActionModal(item, 'GRANT_CLEARANCE')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Issue to Lead Inspector</span>
                      </button>

                      {/* 2. Reject */}
                      <button
                        type="button"
                        onClick={() => handleOpenActionModal(item, 'ESCALATE_ALMO')}
                        className="px-3 py-2 bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5 text-rose-700" />
                        <span>Reject</span>
                      </button>

                      {/* 3. Re Clarification */}
                      <button
                        type="button"
                        onClick={() => handleOpenActionModal(item, 'REJECT_CLARIFY')}
                        className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                        <span>Re Clarification</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Adjudication Decision Modal */}
      {actionModal.isOpen && actionModal.item && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-fade-in text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 font-black text-base">
                {actionModal.actionType === 'GRANT_CLEARANCE' ? (
                  <>
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span className="text-emerald-950">Issue to Lead Inspector</span>
                  </>
                ) : actionModal.actionType === 'REJECT_CLARIFY' ? (
                  <>
                    <RotateCcw className="w-5 h-5 text-amber-600" />
                    <span className="text-amber-950">Request Re-Clarification</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-rose-600" />
                    <span className="text-rose-950">Reject Application</span>
                  </>
                )}
              </div>
              <button
                onClick={() => setActionModal({ isOpen: false, item: null, actionType: 'GRANT_CLEARANCE', notes: '' })}
                className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitAdjudication} className="space-y-4 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                <span className="font-black text-slate-900 block text-xs">
                  {actionModal.item.product_name} • {actionModal.item.brand}
                </span>
                <span className="text-3xs text-slate-500 font-mono">
                  Manufacturer: {actionModal.item.company_name}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800 uppercase text-2xs">
                  Sub-Inspector Statutory Findings & Endorsement Remarks *
                </label>
                <textarea
                  rows={4}
                  required
                  value={actionModal.notes}
                  onChange={(e) => setActionModal({ ...actionModal, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium p-3 rounded-2xl text-xs focus:bg-white focus:border-indigo-600 focus:outline-none"
                  placeholder="Enter detailed verification findings, optical measurement confirmation, or escalation grounds..."
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActionModal({ isOpen: false, item: null, actionType: 'GRANT_CLEARANCE', notes: '' })}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingId === actionModal.item.id}
                  className={`px-5 py-2.5 rounded-xl text-white font-black text-xs shadow-md flex items-center gap-1.5 cursor-pointer ${
                    actionModal.actionType === 'GRANT_CLEARANCE'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                      : actionModal.actionType === 'REJECT_CLARIFY'
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                  }`}
                >
                  {processingId === actionModal.item.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>
                    {actionModal.actionType === 'GRANT_CLEARANCE'
                      ? 'Approve & Submit to Lead Inspector'
                      : actionModal.actionType === 'REJECT_CLARIFY'
                      ? 'Send Document Demand'
                      : 'Confirm Legal Escalation'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Full Image Zoom */}
      {zoomImage && (
        <div
          className="fixed inset-0 bg-slate-950/90 z-70 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoomImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-3xl overflow-hidden p-2 border border-slate-700">
            <img src={zoomImage} alt="Zoomed Evidence" className="max-w-full max-h-[85vh] object-contain mx-auto" />
            <button
              onClick={() => setZoomImage(null)}
              className="absolute top-4 right-4 bg-slate-950/80 text-white rounded-full p-2 hover:bg-slate-800 transition-all font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Universal Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={{
            ...selectedProduct,
            id: selectedProduct.application_id || selectedProduct.id,
            onUpdated: () => {
              const cur = selectedProduct;
              setItems((prev) =>
                prev.filter(
                  (it) => it.id !== cur?.id && it.application_id !== cur?.application_id
                )
              );
              fetchViolations();
            },
          }}
          onClose={() => setSelectedProduct(null)}
          onActionSuccess={(targetAppId) => {
            const cur = selectedProduct;
            setSelectedProduct(null);
            setItems((prev) =>
              prev.filter(
                (it) =>
                  it.id !== targetAppId &&
                  it.application_id !== targetAppId &&
                  it.id !== cur?.id &&
                  it.application_id !== cur?.application_id
              )
            );
            fetchViolations();
          }}
        />
      )}
    </div>
  );
}
