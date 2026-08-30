import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Package,
  Building2,
  Clock,
  Send,
  Loader2,
  Sparkles,
  Scale,
  ShieldAlert,
  AlertOctagon,
  ChevronRight,
  Info,
  MapPin,
  Calendar,
  Camera,
  ClipboardList,
  RotateCcw,
  Eye,
  BadgeAlert,
  Download,
  Maximize2,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { inspectorAPI, fieldVisitAPI, reportsAPI } from '../../../services/api';
import { getProductImageUrl } from '../../../components/ProductDetailModal';
import toast from 'react-hot-toast';

export default function PreMarketInspectionQueue() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [inspectorNotes, setInspectorNotes] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [violationsState, setViolationsState] = useState([]);
  const [zoomImageUrl, setZoomImageUrl] = useState(null);

  // Field Visit Recommendation Modal State
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showExecuteVisitModal, setShowExecuteVisitModal] = useState(false);
  const [visitForm, setVisitForm] = useState({
    scheduled_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    scheduled_time: '11:30 AM',
    visit_location_name: '',
    visit_location_type: 'MANUFACTURING_PLANT',
    visit_address: '',
    visit_trigger_reason: '',
  });

  // 15-Day Resolution Desk Dispatch Modal State
  const [showDeskModal, setShowDeskModal] = useState(false);
  const [deskForm, setDeskForm] = useState({
    directive_text: '',
    sla_days: 15,
    selected_violation: null,
  });

  // Violations & Required Documents Modal State
  const [showViolationsModal, setShowViolationsModal] = useState(false);
  const [violationsForm, setViolationsForm] = useState({
    directive_text: '',
    required_docs: [
      'Corrected Packaging Artwork & High-Res Die-Line (Front & Back)',
      'NABL / Accredited Laboratory Font Height & Measurement Report',
      'Rule 27 Manufacturer Legal Undertaking / Affidavit',
    ],
    sla_days: 15,
  });

  const [executeVisitForm, setExecuteVisitForm] = useState({
    caliper_font_measurement_mm: '2.4',
    physical_net_weight_grams: '102.5',
    batch_records_cross_checked: true,
    physical_tampering_confirmed: false,
    visit_recommendation: 'APPROVE_WITH_CONDITIONS',
    on_site_inspector_remarks: 'Physical inspection completed at production line. Vernier caliper measured numeral height 2.4mm (Pass >= 2.0mm). QA batch records verified.',
  });

  const [queueTab, setQueueTab] = useState('pending'); // 'pending' | 'visits' | 'history' | 'all'

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const res = await inspectorAPI.getPreMarketQueue();
      setQueue(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load Pre-Market Inspection Queue');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenInspectModal = (app) => {
    setSelectedApp(app);
    const violations = app.violations || [];
    setViolationsState(violations);
    const breachCount = violations.filter((v) => v.status === 'DETECTED_BREACH').length;

    setVisitForm({
      scheduled_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      scheduled_time: '11:30 AM',
      visit_location_name: `${app.company_name} Industrial Plant`,
      visit_location_type: 'MANUFACTURING_PLANT',
      visit_address: `Plot 42, Sector 18 Industrial Area, Noida, UP - 201301`,
      visit_trigger_reason: app.visit_trigger_reason || 'Rule 11(2)(c) & Schedule II Character Height Physical Verification',
    });

    if (app.inspector_notes) {
      setInspectorNotes(app.inspector_notes);
    } else if (breachCount > 0) {
      setInspectorNotes(
        `Non-compliance detected during optical audit for ${app.product_name}. Found ${breachCount} statutory discrepancies against Legal Metrology (Packaged Commodities) Rules 2011.`
      );
    } else {
      setInspectorNotes(
        `All Rule 6 mandatory declarations and Schedule II font height specifications verified for ${app.product_name}. Recommended for Directorate clearance certificate.`
      );
    }
  };

  const toggleViolationStatus = (index) => {
    const updated = [...violationsState];
    updated[index].status =
      updated[index].status === 'DETECTED_BREACH' ? 'VERIFIED_COMPLIANT' : 'DETECTED_BREACH';
    setViolationsState(updated);
  };

  // Severity Analysis of Currently Selected App
  const activeViolations = violationsState.filter((v) => v.status === 'DETECTED_BREACH');
  const hasCriticalViolation = activeViolations.some(
    (v) => (v.severity || '').toLowerCase() === 'critical'
  );
  const hasMajorViolation = activeViolations.some(
    (v) => (v.severity || '').toLowerCase() === 'major'
  );
  const hasMinorOnly =
    activeViolations.length > 0 && !hasCriticalViolation && !hasMajorViolation;
  const isZeroViolations = activeViolations.length === 0;

  const handleVerify = async (decision) => {
    if (!selectedApp) return;

    // Guardrail Check
    if (decision === 'RECOMMEND_APPROVAL' && (hasCriticalViolation || hasMajorViolation)) {
      toast.error(
        `Cannot digitally approve: ${
          hasCriticalViolation ? 'Critical' : 'Major'
        } violations require on-site physical inspection by statutory mandate.`
      );
      return;
    }

    try {
      setVerifying(true);
      const res = await inspectorAPI.verifyPreMarket(selectedApp.id, {
        decision,
        inspector_notes: inspectorNotes,
        managed_violations: violationsState,
      });
      toast.success(res.data?.message || 'Inspector action recorded successfully!');
      setSelectedApp(null);
      await fetchQueue();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to process inspector verification decision.');
    } finally {
      setVerifying(false);
    }
  };

  const handleRecommendVisitToALMO = async (e) => {
    e.preventDefault();
    if (!selectedApp) return;

    if (!visitForm.visit_trigger_reason || visitForm.visit_trigger_reason.trim().length < 5) {
      toast.error('Statutory recommendation justification must be provided.');
      return;
    }

    try {
      setVerifying(true);
      const res = await inspectorAPI.verifyPreMarket(selectedApp.id, {
        decision: 'RECOMMEND_FIELD_VISIT',
        visit_recommended: true,
        visit_justification: visitForm.visit_trigger_reason,
        visit_location_name: visitForm.visit_location_name,
        visit_address: visitForm.visit_address,
        scheduled_date: visitForm.scheduled_date,
        scheduled_time: visitForm.scheduled_time,
        inspector_notes:
          inspectorNotes ||
          `Field visit dispatched to Sub-Inspector squad for ${selectedApp.product_name}. Reason: ${visitForm.visit_trigger_reason}`,
      });
      toast.success(
        res.data?.message || `Field visit order dispatched to Sub-Inspector squad for ${selectedApp.product_name}!`
      );
      setShowVisitModal(false);
      setSelectedApp(null);
      await fetchQueue();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to dispatch field visit order to Sub-Inspector.');
    } finally {
      setVerifying(false);
    }
  };

  const handleSendViolationToDesk = (v) => {
    setDeskForm({
      directive_text: `Statutory defect directive under ${v.rule_code || 'LMPC Rule 6'}: ${v.title}. Remedy: ${v.recommendation || v.description}. Brand owner must submit rectified packaging proof before statutory clearance.`,
      sla_days: 15,
      selected_violation: v,
    });
    setShowDeskModal(true);
  };

  const handleSendToDeskSubmit = async (e) => {
    e.preventDefault();
    if (!selectedApp) return;
    try {
      setVerifying(true);
      const res = await inspectorAPI.verifyPreMarket(selectedApp.id, {
        decision: 'SEND_TO_DESK',
        inspector_notes: deskForm.directive_text,
        deficiency_directive: deskForm.directive_text,
        deficiencies: deskForm.selected_violation ? [deskForm.selected_violation.title] : undefined,
      });
      toast.success(res.data?.message || 'Statutory 15-Day Deficiency Memo dispatched to Resolution Desk!');
      setShowDeskModal(false);
      setSelectedApp(null);
      await fetchQueue();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to dispatch deficiency memo to Resolution Desk.');
    } finally {
      setVerifying(false);
    }
  };

  const handleOpenViolationsModal = (app) => {
    const breaches = (app.violations || []).filter((v) => v.status === 'DETECTED_BREACH');
    const breachSummary = breaches.map((b) => `${b.rule_code || 'Rule 6'}: ${b.title}`).join(', ');
    setViolationsForm({
      directive_text: breachSummary
        ? `Statutory breach detected: ${breachSummary}. Brand owner is mandated to upload suitable corrective documents, rectified label artwork, and laboratory reports on the Product Violations Desk.`
        : `Statutory non-compliance notice issued for ${app.product_name}. Please upload suitable corrective documents and rectified artwork proof.`,
      required_docs: [
        'Corrected Packaging Artwork & High-Res Die-Line (Front & Back)',
        'NABL / Accredited Laboratory Font Height & Measurement Report',
        'Rule 27 Manufacturer Legal Undertaking / Affidavit',
      ],
      sla_days: 15,
    });
    setShowViolationsModal(true);
  };

  const handleOpenViolationsModalForViolation = (v) => {
    setViolationsForm({
      directive_text: `Statutory non-compliance detected under ${v.rule_code || 'LMPC Rule 6'}: ${v.title}. Statutory Remedy: ${v.recommendation || v.description}. Brand owner is mandated to upload suitable corrective documents, rectified packaging proof, and laboratory reports on the Product Violations Desk.`,
      required_docs: [
        'Corrected Packaging Artwork & High-Res Die-Line (Front & Back)',
        'NABL / Accredited Laboratory Font Height & Measurement Report',
        'Rule 27 Manufacturer Legal Undertaking / Affidavit',
      ],
      sla_days: 15,
    });
    setShowViolationsModal(true);
  };

  const handleSendToViolationsSubmit = async (e) => {
    e.preventDefault();
    if (!selectedApp) return;
    try {
      setVerifying(true);
      const combinedNotes = `${violationsForm.directive_text} | Required Documents: ${violationsForm.required_docs.join(', ')}`;
      const res = await inspectorAPI.verifyPreMarket(selectedApp.id, {
        decision: 'SEND_TO_DESK',
        inspector_notes: combinedNotes,
        deficiency_directive: combinedNotes,
        deficiencies: violationsForm.required_docs,
      });
      toast.success(res.data?.message || 'Statutory violation notice & document requirement dispatched to Brand Owner!');
      setShowViolationsModal(false);
      setSelectedApp(null);
      await fetchQueue();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to dispatch violations notice.');
    } finally {
      setVerifying(false);
    }
  };

  const handleExecuteVisitSubmit = async (e) => {
    e.preventDefault();
    if (!selectedApp?.visit_order?.visit_id && !selectedApp?.visit_order_no) return;
    const targetVisitId =
      selectedApp.visit_order?.visit_id || selectedApp.visit_order_no || selectedApp.visit_order_id;

    try {
      setVerifying(true);
      await fieldVisitAPI.submitReport(targetVisitId, {
        caliper_font_measurement_mm: parseFloat(executeVisitForm.caliper_font_measurement_mm) || 2.4,
        physical_net_weight_grams: parseFloat(executeVisitForm.physical_net_weight_grams) || 100.0,
        batch_records_cross_checked: executeVisitForm.batch_records_cross_checked,
        physical_tampering_confirmed: executeVisitForm.physical_tampering_confirmed,
        visit_recommendation: executeVisitForm.visit_recommendation,
        on_site_inspector_remarks: executeVisitForm.on_site_inspector_remarks,
      });
      toast.success('Field Visit Report submitted to ALMO for official verification!');
      setShowExecuteVisitModal(false);
      setSelectedApp(null);
      await fetchQueue();
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit field visit report.');
    } finally {
      setVerifying(false);
    }
  };

  const isVisitActive = (q) => {
    const s = (q.status || '').toLowerCase();
    if (isSubInspectorVerified(q) && s === 'pending_inspector') return false;
    const voStatus = (q.visit_order?.visit_status || '').toLowerCase();
    if (voStatus === 'completed') return false;

    return Boolean(
      (Boolean(q.visit_order) && voStatus !== 'completed') ||
      q.visit_recommended === true ||
      s === 'visit_sanctioned' ||
      s === 'pending_field_inspection' ||
      s.includes('field') ||
      s === 'pending_almo_sanction' ||
      s === 'pending_clmo_approval'
    );
  };

  const isHistory = (q) => {
    if (isSubInspectorVerified(q) && (q.status || '').toLowerCase() === 'pending_inspector') return false;
    const s = (q.status || '').toLowerCase();
    return s === 'approved_certified' || s === 'rejected_sanctioned' || s === 'rejected_revise';
  };

  const isSubInspectorVerified = (q) => {
    return Boolean(
      q.sub_inspector_verified ||
      q.is_resolved_by_sub_inspector ||
      q.inspector_notes?.includes('APPROVED BY SUB-INSPECTOR') ||
      q.supervisor_notes?.includes('RESOLVED BY SUB-INSPECTOR') ||
      q.supervisor_notes?.includes('VERIFIED & APPROVED BY SUB-INSPECTOR')
    );
  };

  const uniqueQueue = Array.from(
    new Map((queue || []).map((item) => [item.id, item])).values()
  );

  const pendingQueue = uniqueQueue.filter((q) => {
    if (isHistory(q)) return false;
    const s = (q.status || '').toLowerCase();
    if (s === 'pending_almo_sanction' || s === 'pending_clmo_approval') return false;

    // If verified by Sub-Inspector, it is ready in Pending Review for Lead Inspector field visit dispatch or clearance!
    if (isSubInspectorVerified(q)) return true;

    if (isVisitActive(q)) return false;

    const hasViolations = (q.violations_count || 0) > 0 || (q.violations && q.violations.length > 0) || (q.status || '').includes('violation') || (q.status || '').includes('deficiency') || q.visit_required;
    return !hasViolations;
  });

  const violationsQueue = uniqueQueue.filter((q) => {
    if (isHistory(q) || isVisitActive(q)) return false;
    if (isSubInspectorVerified(q)) return false;
    const s = (q.status || '').toLowerCase();
    if (s === 'pending_almo_sanction' || s === 'pending_clmo_approval') return false;

    const hasViolations = (q.violations_count || 0) > 0 || (q.violations && q.violations.length > 0) || (q.status || '').includes('violation') || (q.status || '').includes('deficiency') || q.visit_required;
    return hasViolations;
  });

  const visitsQueue = uniqueQueue.filter((q) => {
    return isVisitActive(q) && !isHistory(q);
  });

  const historyQueue = uniqueQueue.filter((q) => {
    return isHistory(q);
  });

  const filtered = (
    queueTab === 'pending'
      ? pendingQueue
      : queueTab === 'violations'
      ? violationsQueue
      : queueTab === 'visits'
      ? visitsQueue
      : queueTab === 'history'
      ? historyQueue
      : uniqueQueue
  ).filter(
    (a) =>
      a.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.brand?.toLowerCase().includes(search.toLowerCase()) ||
      a.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.certificate_number?.toLowerCase().includes(search.toLowerCase()) ||
      String(a.id).includes(search)
  );

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-md text-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/80 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 border border-indigo-400/30 shrink-0">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Pre-Market Verification & Severity Gate
                </h1>
                <span className="text-3xs font-mono font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 px-2 py-0.5 rounded-full">
                  L4 TRIAGE DESK
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Statutory optical packaging audit • Minor Digital Correction Loop • Mandatory ALMO Visit Sanction Gates for Major/Critical infractions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchQueue}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>

        {/* Stats Pill Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-indigo-900/60 text-xs">
          <div className="bg-slate-950/40 border border-indigo-500/20 rounded-2xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-2xs uppercase block font-bold">Pending Desk Review</span>
              <span className="text-lg font-black text-amber-300">{pendingQueue.length} Submissions</span>
            </div>
            <Clock className="w-6 h-6 text-amber-400/60" />
          </div>

          <div className="bg-slate-950/40 border border-indigo-500/20 rounded-2xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-2xs uppercase block font-bold">Field Visit Gateways</span>
              <span className="text-lg font-black text-blue-300">{visitsQueue.length} Active Orders</span>
            </div>
            <MapPin className="w-6 h-6 text-blue-400/60" />
          </div>

          <div className="bg-slate-950/40 border border-indigo-500/20 rounded-2xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-2xs uppercase block font-bold">Certified History</span>
              <span className="text-lg font-black text-emerald-300">{historyQueue.length} Certificates</span>
            </div>
            <ShieldCheck className="w-6 h-6 text-emerald-400/60" />
          </div>
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1 overflow-x-auto">
          <button
            onClick={() => setQueueTab('pending')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              queueTab === 'pending'
                ? 'bg-white text-indigo-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Pending Review ({pendingQueue.length})</span>
          </button>

          <button
            onClick={() => setQueueTab('violations')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              queueTab === 'violations'
                ? 'bg-white text-rose-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>Violations ({violationsQueue.length})</span>
          </button>

          <button
            onClick={() => setQueueTab('visits')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              queueTab === 'visits'
                ? 'bg-white text-blue-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            <span>Field Visits ({visitsQueue.length})</span>
          </button>

          <button
            onClick={() => setQueueTab('history')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              queueTab === 'history'
                ? 'bg-white text-emerald-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Certified Records ({historyQueue.length})</span>
          </button>

          <button
            onClick={() => setQueueTab('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              queueTab === 'all'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Submissions ({queue.length})
          </button>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name, brand, certificate #, or company..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-600"
          />
        </div>
      </div>

      {/* Submissions Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <span className="text-xs font-bold text-slate-500">Loading Packaging Submissions...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white border border-slate-200 rounded-3xl p-8 space-y-2">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">
            {queueTab === 'violations'
              ? 'No Products Under Violations Review'
              : queueTab === 'history'
              ? 'No Certified Records in History'
              : queueTab === 'visits'
              ? 'No Active Field Visit Gateways'
              : 'No Packaging Submissions in Queue'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Applications submitted by packaging manufacturers or brand owners will appear here for optical verification and severity-based statutory review.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((app, index) => {
            const hasBreach = (app.violations_count || 0) > 0 || app.visit_required || (app.violations && app.violations.some(v => v.status === 'DETECTED_BREACH'));
            const isVisitScheduled = app.status === 'pending_field_inspection' || app.status === 'visit_sanctioned' || !!app.visit_order;
            const isCritical = app.triage_severity === 'CRITICAL';
            const isMajor = app.triage_severity === 'MAJOR';

            return (
              <div
                key={`premarket-${app.id}-${index}`}
                onClick={() => handleOpenInspectModal(app)}
                className={`bg-white border rounded-3xl p-6 space-y-4 hover:shadow-lg transition-all cursor-pointer relative group flex flex-col justify-between ${
                  isVisitScheduled
                    ? 'border-amber-300 bg-amber-50/20'
                    : isCritical
                    ? 'border-rose-300 bg-rose-50/20'
                    : isMajor
                    ? 'border-amber-200 bg-amber-50/10'
                    : hasBreach
                    ? 'border-rose-200 bg-rose-50/10'
                    : 'border-slate-200 hover:border-indigo-300'
                }`}
              >
                <div className="space-y-3.5">
                  {/* Status Badges */}
                  <div className="flex items-center justify-between">
                    <span className="text-2xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                      ID #{app.id}
                    </span>

                    {app.status === 'approved_certified' ? (
                      <span className="text-2xs font-extrabold uppercase bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                        <span>CLMO Certified</span>
                      </span>
                    ) : (app.sub_inspector_verified || app.is_resolved_by_sub_inspector || app.inspector_notes?.includes('APPROVED BY SUB-INSPECTOR')) ? (
                      <span className="text-2xs font-extrabold uppercase bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-1 rounded-full flex items-center gap-1 animate-pulse">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                        <span>Sub-Inspector Verified</span>
                      </span>
                    ) : app.status === 'pending_almo_sanction' ? (
                      <span className="text-2xs font-extrabold uppercase bg-purple-100 text-purple-900 border border-purple-300 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3 text-purple-700" />
                        <span>Pending ALMO Sanction</span>
                      </span>
                    ) : isVisitScheduled ? (
                      <span className="text-2xs font-extrabold uppercase bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-700" />
                        <span>Visit Sanctioned</span>
                      </span>
                    ) : isCritical ? (
                      <span className="text-2xs font-extrabold uppercase bg-rose-100 text-rose-900 border border-rose-300 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <AlertOctagon className="w-3 h-3 text-rose-700" />
                        <span>Critical Breach</span>
                      </span>
                    ) : (hasBreach || (app.violations_count || 0) > 0 || (app.violations && app.violations.length > 0)) ? (
                      <span className="text-2xs font-extrabold uppercase bg-rose-100 text-rose-900 border border-rose-300 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3 text-rose-700" />
                        <span>Under Violations Review</span>
                      </span>
                    ) : (
                      <span className="text-2xs font-extrabold uppercase bg-indigo-100 text-indigo-900 border border-indigo-300 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3 text-indigo-700" />
                        <span>Under Desk Review</span>
                      </span>
                    )}
                  </div>

                  {/* Product Title & Thumbnail */}
                  <div className="flex gap-3 items-start">
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center relative shadow-inner">
                      <img
                        src={getProductImageUrl(app) || '/uploads/artwork_sample.png'}
                        alt={app.product_name}
                        onError={(e) => {
                          if (!e.target.src.includes('artwork_sample.png')) {
                            e.target.src = '/uploads/artwork_sample.png';
                          }
                        }}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-base text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {app.product_name}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                        Brand: <strong className="text-slate-700">{app.brand}</strong> • {app.company_name}
                      </p>
                    </div>
                  </div>

                  {/* Key Metrics Grid */}
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 text-2xs uppercase block font-bold">Declared MRP:</span>
                      <span className="font-black text-slate-800">₹{app.declared_mrp || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-2xs uppercase block font-bold">Declared Qty:</span>
                      <span className="font-black text-slate-800">{app.declared_net_quantity || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Statutory Triage Severity Flag */}
                  {app.visit_required && (
                    <div className="bg-amber-100/80 border border-amber-300 p-2.5 rounded-xl text-3xs text-amber-950 font-bold flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <span>
                        <strong>Severity Gate Active:</strong> On-site visit mandated ({app.visit_trigger_reason || 'Rule 11(2)(c) / Schedule II'}).
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="pt-3 border-t border-slate-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenInspectModal(app);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Open Compliance Audit & Triage</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Comprehensive Violation Audit & Desk Review Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full p-6 md:p-8 space-y-6 shadow-2xl animate-fade-in my-8 max-h-[92vh] flex flex-col justify-between">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center border border-indigo-200 shrink-0">
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                    <span>{selectedApp.product_name}</span>
                    <span className="text-2xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md uppercase font-bold border border-slate-300">
                      ID #{selectedApp.id}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Manufacturer: <strong className="text-slate-800">{selectedApp.company_name}</strong> • Brand: <strong>{selectedApp.brand}</strong> • Category: <strong className="capitalize">{selectedApp.category}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedApp(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 text-lg rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="space-y-5 overflow-y-auto pr-1">
              {/* Severity Banner */}
              {hasCriticalViolation ? (
                <div className="bg-rose-50 border border-rose-300 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-rose-900 font-black text-xs uppercase tracking-wide">
                    <AlertOctagon className="w-4 h-4 text-rose-600" />
                    <span>Statutory Critical Breach: Physical Field Inspection Mandated</span>
                  </div>
                  <p className="text-2xs text-rose-950 leading-relaxed font-medium">
                    Critical infraction detected (e.g. Rule 11(2)(c) sticker tampering, altered MRP, or forged credentials). Digital waiver is strictly prohibited. Lead Inspector can dispatch an on-site Field Visit Order (VO) directly to Sub-Inspector Sanjay Kumar (ASST-DEL-012).
                  </p>
                </div>
              ) : hasMajorViolation ? (
                <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-black text-xs uppercase tracking-wide">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Statutory Major Deficiency: Field Inspection Required</span>
                  </div>
                  <p className="text-2xs text-amber-950 leading-relaxed font-medium">
                    Major discrepancy detected (Schedule II numeral font height deficiency &lt; 2.0mm or missing mandatory packer address). Lead Inspector can issue a Field Visit Order directly to the Sub-Inspector squad.
                  </p>
                </div>
              ) : hasMinorOnly ? (
                <div className="bg-blue-50 border border-blue-300 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-blue-900 font-black text-xs uppercase tracking-wide">
                    <Info className="w-4 h-4 text-blue-600" />
                    <span>Minor Deficiency: Fast-Track Digital Correction Loop</span>
                  </div>
                  <p className="text-2xs text-blue-950 leading-relaxed font-medium">
                    Minor clerical or layout nuances detected. Field visits are <strong>strictly barred</strong> for minor infractions. Choose "Advise Manufacturer" to request a revised digital artwork label.
                  </p>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl space-y-1">
                  <div className="flex items-center gap-2 text-emerald-900 font-black text-xs uppercase tracking-wide">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Zero Violations: Fully Compliant Packaging Artwork</span>
                  </div>
                  <p className="text-2xs text-emerald-950 font-medium">
                    All mandatory Rule 6 declarations, Schedule II font sizes, and FSSAI logo patterns verified. Ready for CLMO digital certificate clearance.
                  </p>
                </div>
              )}

              {/* Artwork & Specs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Photo */}
                <div className="md:col-span-4 bg-slate-900 border border-slate-200 rounded-2xl overflow-hidden aspect-4/3 flex items-center justify-center relative shadow-inner">
                  <img
                    src={getProductImageUrl(selectedApp) || '/uploads/artwork_sample.png'}
                    alt={selectedApp.product_name}
                    onError={(e) => {
                      if (!e.target.src.includes('artwork_sample.png')) {
                        e.target.src = '/uploads/artwork_sample.png';
                      }
                    }}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute bottom-1.5 left-2 right-2 bg-slate-950/80 backdrop-blur-md rounded-lg py-1 px-2 border border-white/10 flex items-center justify-between text-3xs text-slate-300 font-mono">
                    <span>LMPC ARTWORK</span>
                    <span className="text-emerald-400 font-bold">DIGITAL AUDIT</span>
                  </div>
                </div>

                {/* Specs */}
                <div className="md:col-span-8 bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 font-bold block text-3xs uppercase">Declared MRP:</span>
                    <span className="font-black text-slate-900 text-sm">₹{selectedApp.declared_mrp || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-3xs uppercase">Declared Net Qty:</span>
                    <span className="font-black text-slate-900 text-sm">{selectedApp.declared_net_quantity || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-3xs uppercase">Packaging Format:</span>
                    <span className="font-semibold text-slate-900">{selectedApp.packaging_type || 'Standard Pouch / Box'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-3xs uppercase">GSTIN / FSSAI:</span>
                    <span className="font-mono text-2xs font-bold text-indigo-700">{selectedApp.gstin_fssai_id || '27AABCP1234F1Z5'}</span>
                  </div>
                </div>
              </div>

              {/* Brand Owner Rectification & Uploaded Proof Documents */}
              {selectedApp.rectification_data && (
                <div className="bg-gradient-to-br from-indigo-50/90 via-purple-50/50 to-white border-2 border-indigo-200/90 rounded-2xl p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-indigo-700" />
                      <span className="text-xs font-black text-indigo-950 uppercase tracking-wide">
                        Brand Owner Rectification Submission & Uploaded Proof Documents
                      </span>
                    </div>
                    <span className="text-3xs font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                      <span>Proof Attached • Version {selectedApp.rectification_data.version_number || 2}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                    {/* Uploaded Artwork Proof Thumbnail with Lightbox */}
                    <div className="sm:col-span-4 bg-slate-900 rounded-xl overflow-hidden aspect-4/3 relative group flex items-center justify-center border border-slate-300 shadow-inner">
                      <img
                        src={selectedApp.rectification_data.artwork_url || '/uploads/artwork_sample.png'}
                        alt="Uploaded Rectification Proof"
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute top-1.5 right-1.5 flex gap-1">
                        <button
                          type="button"
                          onClick={() => setZoomImageUrl(selectedApp.rectification_data.artwork_url)}
                          className="p-1 rounded-md bg-slate-900/80 text-white hover:bg-slate-800 transition-all cursor-pointer"
                          title="Zoom Document"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={selectedApp.rectification_data.artwork_url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded-md bg-slate-900/80 text-white hover:bg-slate-800 transition-all"
                          title="Open Full Image"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <div className="absolute bottom-1 left-1 right-1 bg-slate-950/85 backdrop-blur-xs px-2 py-0.5 rounded text-3xs text-slate-200 font-mono flex items-center justify-between">
                        <span>RECTIFIED ARTWORK</span>
                        <span className="text-emerald-400 font-bold">✓ ATTACHED</span>
                      </div>
                    </div>

                    {/* Brand Statements & Declarations */}
                    <div className="sm:col-span-8 space-y-2 text-xs">
                      {selectedApp.rectification_data.notes && (
                        <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-xs">
                          <span className="text-3xs uppercase font-extrabold text-indigo-900 block mb-0.5">
                            Brand Owner Rectification Statement:
                          </span>
                          <p className="text-slate-800 italic text-2xs leading-relaxed">
                            "{selectedApp.rectification_data.notes}"
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-2xs">
                        <div className="bg-white/80 p-2 rounded-lg border border-slate-200">
                          <span className="text-slate-500 font-bold block text-3xs uppercase">Rectified MRP:</span>
                          <span className="font-black text-slate-900">₹{selectedApp.rectification_data.declared_mrp || selectedApp.declared_mrp || 'N/A'}</span>
                        </div>
                        <div className="bg-white/80 p-2 rounded-lg border border-slate-200">
                          <span className="text-slate-500 font-bold block text-3xs uppercase">Rectified Net Qty:</span>
                          <span className="font-black text-slate-900">{selectedApp.rectification_data.declared_net_quantity || selectedApp.declared_net_quantity || 'N/A'}</span>
                        </div>
                      </div>

                      {selectedApp.rectification_data.case_number && (
                        <div className="text-3xs text-slate-500 font-medium">
                          Associated 15-Day Resolution Case: <strong className="font-mono text-indigo-700">{selectedApp.rectification_data.case_number}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Optical Scan Findings & Rule Compliance Breakdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Optical Scan Findings & Rule Compliance Breakdown ({violationsState.length} Checks)
                    </h4>
                  </div>
                  <span className="text-2xs text-slate-500 italic">Click item to toggle compliance state</span>
                </div>

                <div className="space-y-2.5">
                  {violationsState.map((v, idx) => {
                    const isBreach = v.status === 'DETECTED_BREACH';
                    const sev = (v.severity || '').toLowerCase();

                    return (
                      <div
                        key={v.id || idx}
                        onClick={() => toggleViolationStatus(idx)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                          isBreach
                            ? sev === 'critical'
                              ? 'bg-rose-50/80 border-rose-300 hover:border-rose-400'
                              : 'bg-amber-50/80 border-amber-300 hover:border-amber-400'
                            : 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-300'
                        }`}
                      >
                        <div className="pt-0.5">
                          {isBreach ? (
                            <div
                              className={`w-5 h-5 rounded-md text-white flex items-center justify-center ${
                                sev === 'critical' ? 'bg-rose-600' : 'bg-amber-600'
                              }`}
                            >
                              <XCircle className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 space-y-1 text-xs">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900">{v.title}</span>
                              <span className="font-mono text-3xs bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-bold">
                                {v.rule_code}
                              </span>
                            </div>

                            <span
                              className={`text-3xs font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                isBreach
                                  ? sev === 'critical'
                                    ? 'bg-rose-200 text-rose-900 border border-rose-300'
                                    : 'bg-amber-200 text-amber-900 border border-amber-300'
                                  : 'bg-emerald-200 text-emerald-900 border border-emerald-300'
                              }`}
                            >
                              {isBreach ? `${v.severity} breach` : 'Statutory Compliant'}
                            </span>
                          </div>

                          <p className="text-slate-600 text-2xs leading-relaxed">{v.description}</p>
                          {v.recommendation && (
                            <div className="text-3xs text-indigo-900 bg-indigo-50/80 p-2 rounded-lg border border-indigo-100 font-medium">
                              <strong>Statutory Remedy:</strong> {v.recommendation}
                            </div>
                          )}

                          {isBreach && (
                            <div className="pt-2 flex justify-end gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenViolationsModalForViolation(v);
                                }}
                                className="py-1 px-3 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-3xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                              >
                                <FileText className="w-3 h-3 text-purple-200" />
                                <span>Send to Violations (Require Docs)</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSendViolationToDesk(v);
                                }}
                                className="py-1 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-3xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                              >
                                <Clock className="w-3 h-3 text-amber-300" />
                                <span>Send Violation to 15-Day Resolution Desk</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Inspector Official Observations & Notes */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800 uppercase text-2xs">
                  Inspector Statutory Findings & Charge-Sheet Remarks *
                </label>
                <textarea
                  rows={3}
                  value={inspectorNotes}
                  onChange={(e) => setInspectorNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium p-3 rounded-2xl text-xs focus:bg-white focus:border-indigo-600 focus:outline-none"
                  placeholder="Enter official inspection observations, non-compliance charge-sheet notes, or clearance recommendations..."
                />
              </div>
            </div>

            {/* Decision & Action Bar */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="text-2xs font-extrabold text-slate-500 uppercase tracking-wider">
                Inspector Statutory Actions & Gateways:
              </div>

              {isSubInspectorVerified(selectedApp) && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-950 font-black text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Sub-Inspector Endorsement & Rectification Review Complete</span>
                    <span className="text-3xs font-mono font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full ml-auto">
                      AWAITING L4 ACTION
                    </span>
                  </div>
                  <p className="text-2xs text-emerald-900 leading-relaxed font-medium">
                    {selectedApp.inspector_notes || selectedApp.supervisor_notes || 'All statutory label corrections and declarations endorsed by Sub-Inspector.'}
                  </p>
                  <div className="text-3xs text-emerald-800 font-bold flex items-center gap-2 pt-1 border-t border-emerald-200">
                    <span>Action Choice:</span>
                    <span className="text-amber-900 font-extrabold">• Assign / Dispatch Field Visit to Field Squad</span>
                    <span>or</span>
                    <span className="text-emerald-900 font-extrabold">• Endorse directly to ALMO for Final Certificate Sanction</span>
                  </div>
                </div>
              )}

              {selectedApp.status === 'approved_certified' ? (
                <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-extrabold text-xs text-emerald-950 block">Statutory Directorate Clearance Granted</span>
                      <span className="font-mono text-3xs font-bold text-emerald-800">
                        Certificate #{selectedApp.certificate_number || 'LMPC-2026-CERT-0001'} • Digitally Signed & Sealed
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        try {
                          await reportsAPI.downloadScanPDF(selectedApp.id);
                          toast.success('Certificate Dossier PDF downloaded successfully!');
                        } catch (err) {
                          toast.success('Official Certificate Dossier ready.');
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Certificate PDF</span>
                    </button>

                    <button
                      onClick={() => setSelectedApp(null)}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (() => {
                const isAlreadySanctioned =
                  !isSubInspectorVerified(selectedApp) &&
                  (selectedApp.status === 'visit_sanctioned' ||
                   selectedApp.status === 'pending_field_inspection') &&
                  Boolean(selectedApp.visit_order && selectedApp.visit_order.visit_status !== 'COMPLETED');

                const isAlreadySentToDesk =
                  selectedApp.status === 'pending_deficiency_resolution' ||
                  selectedApp.status === 'pending_resolution_desk' ||
                  selectedApp.has_open_deficiency === true;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                    {/* 1. Dispatch Field Visit to Sub-Inspector Squad */}
                    {isAlreadySanctioned ? (
                      <div className="py-3 px-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs text-center">
                        <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="truncate">Visit Sanctioned</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowVisitModal(true)}
                        className="py-3 px-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md shadow-amber-600/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <MapPin className="w-4 h-4" />
                        <span>Dispatch Field Visit</span>
                      </button>
                    )}

                    {/* 2. Send to Violations Page & Require Suitable Documents */}
                    <button
                      onClick={() => handleOpenViolationsModal(selectedApp)}
                      disabled={verifying}
                      className="py-3 px-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs shadow-md shadow-purple-700/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Send to Product Violations page and mandate suitable documents"
                    >
                      <FileText className="w-4 h-4 text-purple-200" />
                      <span>Send to Violations (Require Docs)</span>
                    </button>

                    {/* 3. Statutory Endorsement & Forward to ALMO */}
                    <button
                      onClick={() => handleVerify('FORWARD_TO_ALMO')}
                      disabled={verifying}
                      className="py-3 px-2 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30 cursor-pointer"
                      title="Endorse packaging compliance and forward dossier to ALMO (Level 3) for statutory report verification"
                    >
                      {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      <span>Endorse to ALMO</span>
                    </button>

                    {/* 4. Route to 15-Day Statutory Resolution Desk */}
                    {isAlreadySentToDesk ? (
                      <div className="py-3 px-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs text-center">
                        <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="truncate">At Resolution Desk</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setDeskForm({
                            directive_text: `Statutory label corrections and declaration rectification required for ${selectedApp.product_name} under Rule 6 / Schedule II. Brand owner must submit rectified artwork and proof.`,
                            sla_days: 15,
                            selected_violation: null,
                          });
                          setShowDeskModal(true);
                        }}
                        disabled={verifying}
                        className="py-3 px-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span>Send to 15-Day Desk</span>
                      </button>
                    )}

                    {/* 5. Return to Brand Owner with Defect Notice */}
                    <button
                      onClick={() => handleVerify('REQUEST_REVISION')}
                      disabled={verifying}
                      className="py-3 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4 text-slate-500" />
                      <span>Defect Notice</span>
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Route to 15-Day Resolution Desk */}
      {showDeskModal && selectedApp && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-fade-in text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-indigo-900 font-black text-base">
                <Clock className="w-5 h-5 text-indigo-600" />
                <span>Route to 15-Day Statutory Resolution Desk</span>
              </div>
              <button onClick={() => setShowDeskModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold">✕</button>
            </div>

            <form onSubmit={handleSendToDeskSubmit} className="space-y-3.5 text-xs">
              <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-amber-950 space-y-1">
                <span className="font-bold text-3xs uppercase block text-amber-900">15-Day Statutory Correction Directive:</span>
                <p className="text-3xs leading-relaxed">
                  Issues an official deficiency memo to <strong>{selectedApp.company_name || selectedApp.brand}</strong>. The brand owner will provide corrected packaging artwork & proof within 15 days, which will be verified and cleared by <strong>Sub-Inspector Sanjay Kumar</strong>.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">Target Commodity</label>
                <input
                  type="text"
                  disabled
                  value={`${selectedApp.product_name} (${selectedApp.company_name || selectedApp.brand})`}
                  className="w-full bg-slate-100 border border-slate-300 p-2.5 rounded-xl font-bold text-slate-700 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">Deficiency Memo Directives & Corrective Actions Required *</label>
                <textarea
                  rows={4}
                  required
                  value={deskForm.directive_text}
                  onChange={(e) => setDeskForm({ ...deskForm, directive_text: e.target.value })}
                  placeholder="State the mandatory statutory corrections the brand owner must submit..."
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium focus:bg-white focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeskModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifying}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Dispatch to 15-Day Resolution Desk</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Send to Violations & Demand Suitable Documents */}
      {showViolationsModal && selectedApp && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl animate-fade-in text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-purple-900 font-black text-base">
                <FileText className="w-5 h-5 text-purple-600" />
                <span>Send to Violations Desk & Require Documents</span>
              </div>
              <button onClick={() => setShowViolationsModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3.5 space-y-1.5">
                <span className="font-extrabold text-purple-950 block">Target Commodity & Brand:</span>
                <div className="font-bold text-slate-800 text-sm">{selectedApp.product_name} • {selectedApp.brand}</div>
                <div className="text-2xs text-purple-700 font-mono">Manufacturer: {selectedApp.company_name}</div>
              </div>

              <div className="space-y-2">
                <label className="block font-bold text-slate-800 uppercase text-2xs">
                  Mandatory Suitable Documents Demanded from Brand Owner:
                </label>
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  {[
                    'Corrected Packaging Artwork & High-Res Die-Line (Front & Back)',
                    'NABL / Accredited Laboratory Font Height & Measurement Report',
                    'Rule 27 Manufacturer Legal Undertaking / Affidavit',
                    'Authorized Batch Manufacturing Record & Invoicing Copy',
                    'FSSAI / Statutory Ingredient Declaration Endorsement',
                  ].map((docName, idx) => {
                    const isSelected = violationsForm.required_docs.includes(docName);
                    return (
                      <label key={idx} className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-800 hover:text-purple-900">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setViolationsForm({
                                ...violationsForm,
                                required_docs: [...violationsForm.required_docs, docName],
                              });
                            } else {
                              setViolationsForm({
                                ...violationsForm,
                                required_docs: violationsForm.required_docs.filter((d) => d !== docName),
                              });
                            }
                          }}
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
                        />
                        <span>{docName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800 uppercase text-2xs">
                  Statutory Directive & Instructions for Brand Owner:
                </label>
                <textarea
                  rows={3}
                  value={violationsForm.directive_text}
                  onChange={(e) => setViolationsForm({ ...violationsForm, directive_text: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium p-3 rounded-2xl text-xs focus:bg-white focus:border-purple-600 focus:outline-none"
                  placeholder="Specify statutory defects and instructions for uploading suitable corrective documents..."
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-2xs text-amber-900 flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Statutory 15-Day SLA Cure Window:</strong> This product will be listed on the Brand Owner's Product Violations & Rectifications Desk. The manufacturer must submit the demanded documents within 15 days.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowViolationsModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendToViolationsSubmit}
                disabled={verifying || violationsForm.required_docs.length === 0}
                className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-extrabold text-xs shadow-md shadow-purple-700/30 flex items-center gap-1.5 cursor-pointer"
              >
                {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                <span>Dispatch to Violations Desk</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Dispatch Field Visit Order to Sub-Inspector Squad */}
      {showVisitModal && selectedApp && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-fade-in text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-indigo-900 font-black text-base">
                <MapPin className="w-5 h-5 text-indigo-600" />
                <span>Dispatch Field Visit to Sub-Inspector Squad</span>
              </div>
              <button onClick={() => setShowVisitModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold">✕</button>
            </div>

            <form onSubmit={handleRecommendVisitToALMO} className="space-y-3.5 text-xs">
              <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-200 text-indigo-950 space-y-1">
                <span className="font-bold text-3xs uppercase block text-indigo-900">Direct Squad Assignment:</span>
                <p className="text-3xs">
                  This issues an official <strong>Field Visit Order (VO)</strong> directly to <strong>Sub-Inspector Sanjay Kumar (ASST-DEL-012)</strong> for physical caliper measurements and on-site factory verification.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">Target Facility / Plant Name *</label>
                <input
                  type="text"
                  required
                  value={visitForm.visit_location_name}
                  onChange={(e) => setVisitForm({ ...visitForm, visit_location_name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">Suggested Date *</label>
                  <input
                    type="date"
                    required
                    value={visitForm.scheduled_date}
                    onChange={(e) => setVisitForm({ ...visitForm, scheduled_date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">Suggested Time</label>
                  <input
                    type="text"
                    value={visitForm.scheduled_time}
                    onChange={(e) => setVisitForm({ ...visitForm, scheduled_time: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">Physical Premises Address *</label>
                <textarea
                  rows={2}
                  required
                  value={visitForm.visit_address}
                  onChange={(e) => setVisitForm({ ...visitForm, visit_address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">
                  Statutory Grounds for On-Site Inspection *
                </label>
                <textarea
                  rows={2}
                  required
                  value={visitForm.visit_trigger_reason}
                  onChange={(e) => setVisitForm({ ...visitForm, visit_trigger_reason: e.target.value })}
                  placeholder="State the statutory reason requiring on-site evidence under Rule 11(2)(c) or Schedule II..."
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowVisitModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifying}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md shadow-amber-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                  <span>Dispatch Field Visit Order to Sub-Inspector</span>
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
                <span className="font-extrabold text-sm">
                  Brand Owner Uploaded Rectification Proof — High Definition Inspection
                </span>
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
                alt="High-Res Packaging Evidence"
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
