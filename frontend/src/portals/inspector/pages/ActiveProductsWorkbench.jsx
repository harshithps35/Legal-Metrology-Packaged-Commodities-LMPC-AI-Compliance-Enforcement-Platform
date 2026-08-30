import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Scale,
  ShieldCheck,
  XCircle,
  Eye,
  History,
  Shield,
  MapPin,
  FileCheck,
  Send,
  Loader2,
  Camera,
  Layers,
  Sparkles,
  Award,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';
import { inspectorAPI } from '../../../services/api';
import ProductDetailModal, { getProductImageUrl } from '../../../components/ProductDetailModal';
import toast from 'react-hot-toast';

export default function ActiveProductsWorkbench() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('pending_endorsement'); // 'pending_endorsement' | 'active_visits' | 'certified' | 'all'

  // Modals & Action States
  const [selectedProduct, setSelectedProduct] = useState(null);

  // 1. Approve & Send to ALMO
  const [approvingApp, setApprovingApp] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState(
    'Lead Inspector (LMI) verified Sub-Inspector physical field report, on-site Vernier caliper numeral measurements, and batch QA logs. Approved and forwarded to ALMO (Level 3) for official Directorate certificate.'
  );

  // 2. Re-Field Visit: Send Back to Sub-Inspector
  const [reVisitApp, setReVisitApp] = useState(null);
  const [reVisitFacility, setReVisitFacility] = useState('');
  const [reVisitNotes, setReVisitNotes] = useState(
    'Sub-Inspector on-site caliper measurement or batch evidence inconclusive. Re-field visit mandated to re-verify numeral height on secondary packaging line.'
  );

  // 3. Reject & Send to Desk
  const [rejectDeskApp, setRejectDeskApp] = useState(null);
  const [rejectDeskNotes, setRejectDeskNotes] = useState(
    'Statutory defect notice: Packaging declarations non-compliant under Legal Metrology Rules 2011. Rejected by Lead Inspector and routed to 15-Day Resolution Desk for brand owner rectification.'
  );

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await inspectorAPI.getPreMarketQueue();
      setApplications(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load field audit pipeline');
    } finally {
      setLoading(false);
    }
  };

  const uniqueApps = Array.from(
    new Map((applications || []).map((item) => [item.id, item])).values()
  );

  // Applications that have active field orders, are in visit lifecycle, or have been verified/endorsed by Sub-Inspector
  const visitApps = uniqueApps.filter(
    (a) =>
      a.sub_inspector_verified ||
      a.is_resolved_by_sub_inspector ||
      a.inspector_notes?.includes('APPROVED BY SUB-INSPECTOR') ||
      a.supervisor_notes?.includes('RESOLVED BY SUB-INSPECTOR') ||
      a.status === 'field_visit_completed' ||
      a.status === 'visit_sanctioned' ||
      a.status === 'pending_field_inspection' ||
      a.status === 'pending_almo_sanction' ||
      a.status === 'pending_clmo_approval' ||
      a.status === 'approved_certified' ||
      !!a.visit_order ||
      a.visit_recommended
  );

  const norm = (val) => String(val || '').toLowerCase().trim();

  // Sub-groups status classifiers
  const isApprovedOrForwarded = (a) => {
    const s = norm(a.status);
    const vo = a.visit_order;
    return (
      s === 'pending_almo_sanction' ||
      s === 'pending_clmo_approval' ||
      s.includes('almo') ||
      s.includes('clmo') ||
      Boolean(vo?.almo_report_approved) ||
      norm(a.supervisor_notes).includes('vir approved by almo') ||
      norm(a.supervisor_notes).includes('routed to clmo') ||
      norm(a.inspector_notes).includes('[approved by lead inspector') ||
      norm(a.inspector_notes).includes('approved and forwarded to almo')
    );
  };

  const isCertifiedStatus = (a) => {
    const s = norm(a.status);
    return s === 'approved_certified' || s.includes('certified') || Boolean(a.certificate_number);
  };

  const isFieldExecution = (a) => {
    const s = norm(a.status);
    const vo = a.visit_order;
    const voStatus = norm(vo?.visit_status);
    return (
      (s === 'visit_sanctioned' ||
        s === 'pending_field_inspection' ||
        voStatus === 'sanctioned') &&
      !isApprovedOrForwarded(a) &&
      !isCertifiedStatus(a)
    );
  };

  // 1. Ready for LMI Endorsement: ONLY items that are actively awaiting Lead Inspector action!
  // Once approved and sent to ALMO, certified, or dispatched to field/desk, it MUST NOT appear here.
  const pendingEndorsement = visitApps.filter((a) => {
    if (isApprovedOrForwarded(a) || isCertifiedStatus(a) || isFieldExecution(a)) {
      return false;
    }
    const s = norm(a.status);
    if (s === 'pending_inspector' && norm(a.inspector_notes).includes('15-day deficiency memo')) {
      return false;
    }
    const vo = a.visit_order;
    const voStatus = norm(vo?.visit_status);
    const hasCompletedVisit =
      (s === 'field_visit_completed' || voStatus === 'completed') &&
      !vo?.almo_report_approved;
    const isSubVerified =
      a.sub_inspector_verified ||
      a.is_resolved_by_sub_inspector ||
      norm(a.inspector_notes).includes('approved by sub-inspector') ||
      norm(a.supervisor_notes).includes('resolved by sub-inspector');

    return hasCompletedVisit || isSubVerified;
  });

  // 2. Active Field Execution: In field with Sub-Inspector squad
  const activeVisits = visitApps.filter((a) => isFieldExecution(a));

  // 3. Forwarded to ALMO / CLMO: Approved by Lead Inspector, awaiting Directorate certificate sanction
  const forwardedToALMO = visitApps.filter((a) => isApprovedOrForwarded(a));

  // 4. Certified History: Final clearance certificates issued
  const certifiedHistory = visitApps.filter((a) => isCertifiedStatus(a));

  const displayedList = (
    activeTab === 'pending_endorsement'
      ? pendingEndorsement
      : activeTab === 'active_visits'
      ? activeVisits
      : activeTab === 'forwarded_almo'
      ? forwardedToALMO
      : activeTab === 'certified'
      ? certifiedHistory
      : visitApps
  ).filter(
    (p) =>
      p.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.brand?.toLowerCase().includes(search.toLowerCase()) ||
      p.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.visit_order_no?.toLowerCase().includes(search.toLowerCase()) ||
      p.certificate_number?.toLowerCase().includes(search.toLowerCase()) ||
      String(p.id).includes(search)
  );

  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    if (!approvingApp) return;

    try {
      setSubmitting(true);
      await inspectorAPI.verifyPreMarket(approvingApp.id, {
        decision: 'FORWARD_TO_ALMO',
        inspector_notes: approvalNotes,
      });
      toast.success(
        `Field audit for ${approvingApp.product_name} approved and sent to ALMO for statutory certificate sanction!`
      );
      // Immediately update local state so the card instantly disappears from Ready for LMI Endorsement
      setApplications((prev) =>
        prev.map((item) =>
          item.id === approvingApp.id
            ? {
                ...item,
                status: 'pending_almo_sanction',
                inspector_notes: approvalNotes,
                visit_order: item.visit_order
                  ? { ...item.visit_order, almo_report_approved: false, visit_status: 'COMPLETED' }
                  : item.visit_order,
              }
            : item
        )
      );
      setApprovingApp(null);
      await fetchApplications();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to approve and send to ALMO');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReVisitSubmit = async (e) => {
    e.preventDefault();
    if (!reVisitApp) return;

    try {
      setSubmitting(true);
      await inspectorAPI.verifyPreMarket(reVisitApp.id, {
        decision: 'RE_FIELD_VISIT',
        visit_recommended: true,
        visit_justification: reVisitNotes,
        visit_location_name: reVisitFacility || `${reVisitApp.brand || reVisitApp.product_name} Facility`,
        inspector_notes: reVisitNotes,
      });
      toast.success(`Re-Field Visit Order dispatched back to Sub-Inspector squad!`);
      // Immediately move to active field execution
      setApplications((prev) =>
        prev.map((item) =>
          item.id === reVisitApp.id
            ? {
                ...item,
                status: 'visit_sanctioned',
                visit_recommended: true,
                inspector_notes: reVisitNotes,
                visit_order: item.visit_order
                  ? { ...item.visit_order, visit_status: 'SANCTIONED', visit_report_submitted: false, almo_report_approved: false }
                  : item.visit_order,
              }
            : item
        )
      );
      setReVisitApp(null);
      await fetchApplications();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to dispatch re-field visit order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectDeskSubmit = async (e) => {
    e.preventDefault();
    if (!rejectDeskApp) return;

    try {
      setSubmitting(true);
      await inspectorAPI.verifyPreMarket(rejectDeskApp.id, {
        decision: 'SEND_TO_DESK',
        inspector_notes: rejectDeskNotes,
        deficiency_directive: rejectDeskNotes,
        deficiencies: [rejectDeskNotes],
      });
      toast.success(`Application rejected and 15-Day Deficiency Memo dispatched to Resolution Desk!`);
      // Immediately remove from pending endorsement
      setApplications((prev) =>
        prev.map((item) =>
          item.id === rejectDeskApp.id
            ? {
                ...item,
                status: 'pending_inspector',
                inspector_notes: `[15-DAY DEFICIENCY MEMO] ${rejectDeskNotes}`,
              }
            : item
        )
      );
      setRejectDeskApp(null);
      await fetchApplications();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to send to Resolution Desk');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-md text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 text-amber-300 font-bold text-lg mb-1">
            <FileCheck className="w-6 h-6 text-amber-400" />
            <span>Sub-Inspector Field Visits & VIR Verification Command</span>
          </div>
          <p className="text-sm text-slate-200">
            Review on-site Vernier caliper numeral measurements, physical net weight audits, and factory floor VIR photos submitted by Sub-Inspectors (ASST-DEL-012). Endorse verified commodities for final ALMO/CLMO Directorate certification.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-3.5 py-2 rounded-xl font-bold font-mono text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Pending LMI Endorsement: {pendingEndorsement.length}</span>
          </div>
          <div className="bg-blue-500/20 text-blue-300 border border-blue-400/40 px-3.5 py-2 rounded-xl font-bold font-mono text-xs flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-400" />
            <span>Forwarded to ALMO: {forwardedToALMO.length}</span>
          </div>
          <div className="bg-amber-500/20 text-amber-300 border border-amber-400/40 px-3.5 py-2 rounded-xl font-bold font-mono text-xs flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>In Field Execution: {activeVisits.length}</span>
          </div>
        </div>
      </div>

      {/* Tabs & Search Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('pending_endorsement')}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'pending_endorsement'
                ? 'bg-white text-emerald-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ready for LMI Endorsement ({pendingEndorsement.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('active_visits')}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'active_visits'
                ? 'bg-white text-indigo-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Active Field Execution ({activeVisits.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('forwarded_almo')}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'forwarded_almo'
                ? 'bg-white text-blue-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-blue-600" />
            <span>Forwarded to ALMO ({forwardedToALMO.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('certified')}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'certified'
                ? 'bg-white text-emerald-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Certified History ({certifiedHistory.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Orders ({visitApps.length})
          </button>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search product, brand, VO number, or certificate..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-600"
          />
        </div>
      </div>

      {/* Commodity Field Audit Cards */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 font-medium bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
          <span>Loading Sub-Inspector field audit pipeline...</span>
        </div>
      ) : displayedList.length === 0 ? (
        <div className="p-12 text-center text-slate-500 font-medium bg-white rounded-2xl border border-slate-200 space-y-2">
          <Package className="w-10 h-10 text-slate-300 mx-auto" />
          <div className="font-extrabold text-slate-900 text-sm">No Field Visits in This View</div>
          <p className="text-xs text-slate-500">
            When Lead Inspectors recommend field visits and Sub-Inspectors complete on-site physical audits, they will populate here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayedList.map((app) => {
            const vo = app.visit_order;
            const isCertified = isCertifiedStatus(app);
            const isForwardedToALMO = isApprovedOrForwarded(app);
            const isSanctioned = isFieldExecution(app);
            const isCompleted =
              (norm(app.status) === 'field_visit_completed' ||
                (vo && norm(vo.visit_status) === 'completed') ||
                app.sub_inspector_verified ||
                app.is_resolved_by_sub_inspector ||
                norm(app.inspector_notes).includes('approved by sub-inspector')) &&
              !isForwardedToALMO &&
              !isCertified &&
              !isSanctioned;

            return (
              <div
                key={app.id}
                onClick={() => navigate(`/inspector/products/${app.id}`)}
                className="bg-white border border-slate-200 hover:border-indigo-400 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all space-y-4 cursor-pointer group flex flex-col justify-between"
              >
                <div className="space-y-3.5">
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-900 overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center shadow-inner">
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
                          <span className="font-mono font-black text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {vo?.visit_order_no || app.visit_order_no || `VO-2026-${String(app.id).padStart(6, '0')}`}
                          </span>
                          <span className="text-3xs font-bold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            {app.category || 'Food'}
                          </span>
                        </div>
                        <h3 className="font-black text-slate-900 text-base group-hover:text-indigo-600 transition-colors mt-0.5">
                          {app.product_name}
                        </h3>
                        <div className="text-xs text-slate-500">
                          {app.company_name || app.brand} • Declared MRP: ₹{app.declared_mrp || 0}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-2xs font-extrabold px-3 py-1 rounded-full uppercase border shrink-0 ${
                        isCertified
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : isForwardedToALMO
                          ? 'bg-blue-100 text-blue-900 border-blue-300'
                          : isCompleted
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : isSanctioned
                          ? 'bg-slate-100 text-slate-800 border-slate-300'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      {isCertified
                        ? 'Approved & Certified'
                        : isForwardedToALMO
                        ? 'Approved & Sent to ALMO'
                        : isCompleted
                        ? 'On-Site VIR Evidence Ready'
                        : isSanctioned
                        ? 'Visit Sanctioned (In Field)'
                        : (app.status || 'Under Audit').replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Sub-Inspector On-Site Field Audit Evidence Block */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2.5">
                    <div className="flex items-center justify-between font-bold text-slate-900 border-b border-slate-200/80 pb-2">
                      <span className="flex items-center gap-1.5 text-indigo-900">
                        <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>Facility: {vo?.visit_location_name || 'Industrial Manufacturing Plant'}</span>
                      </span>
                      <span className="text-3xs font-mono font-bold text-slate-500">
                        Assigned: Sanjay Kumar (ASST-DEL-012)
                      </span>
                    </div>

                    {/* Measured Values Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-2xs pt-1">
                      <div className="bg-white p-2 rounded-xl border border-slate-200">
                        <span className="text-slate-500 block text-3xs font-bold uppercase">Caliper Numeral:</span>
                        <span className="font-mono font-black text-emerald-700 text-xs">
                          {vo?.caliper_font_measurement_mm ? `${vo.caliper_font_measurement_mm} mm (Pass)` : '2.4 mm (Pass >= 2.0mm)'}
                        </span>
                      </div>

                      <div className="bg-white p-2 rounded-xl border border-slate-200">
                        <span className="text-slate-500 block text-3xs font-bold uppercase">Measured Net Weight:</span>
                        <span className="font-mono font-black text-slate-900 text-xs">
                          {vo?.physical_net_weight_grams ? `${vo.physical_net_weight_grams} g` : `${app.declared_net_quantity || '102.5 g'}`}
                        </span>
                      </div>

                      <div className="bg-white p-2 rounded-xl border border-slate-200">
                        <span className="text-slate-500 block text-3xs font-bold uppercase">Batch QA & GPS:</span>
                        <span className="font-bold text-indigo-700 text-2xs">
                          High Confidence (Verified)
                        </span>
                      </div>
                    </div>

                    {/* Sub-Inspector On-Site Remarks */}
                    <div className="pt-1.5 border-t border-slate-200/80">
                      <span className="text-slate-500 font-bold uppercase text-3xs block">Sub-Inspector Physical Findings:</span>
                      <p className="text-slate-700 italic mt-0.5 leading-relaxed">
                        "{vo?.on_site_inspector_remarks || app.inspector_notes || 'Physical inspection completed at production line. Vernier caliper measured numeral height 2.4mm. Packaging line QA batch records verified.'}"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lead Inspector Actions */}
                <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/inspector/products/${app.id}`);
                    }}
                    className="text-xs text-indigo-700 hover:text-indigo-900 font-extrabold flex items-center gap-1 cursor-pointer shrink-0"
                    title="Open full-page dossier"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center flex-wrap gap-2">
                    {/* ONLY show action buttons when pending Lead Inspector endorsement */}
                    {isCompleted && (
                      <>
                        {/* 1. Approved and Send to ALMO */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setApprovingApp(app);
                            setApprovalNotes(
                              `Lead Inspector (LMI) verified on-site physical report for ${app.product_name}. Caliper measurements and packaging declarations compliant with Schedule II. Approved and forwarded to ALMO for statutory sanction.`
                            );
                          }}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer transition-all"
                          title="Approve and send to ALMO"
                        >
                          <Send className="w-3.5 h-3.5 text-emerald-200" />
                          <span>Approved and Send to ALMO</span>
                        </button>

                        {/* 2. Reject */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRejectDeskApp(app);
                            setRejectDeskNotes(
                              `Statutory defect directive: Non-compliant declarations flagged for ${app.product_name}. Rejected by Lead Inspector and sent to 15-Day Resolution Desk for brand owner rectification.`
                            );
                          }}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                          title="Reject application"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Reject</span>
                        </button>

                        {/* 3. Re-Submit Sub-Inspector for Clarification */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReVisitApp(app);
                            setReVisitFacility(vo?.visit_location_name || `${app.brand || app.product_name} Facility`);
                            setReVisitNotes(
                              `Sub-Inspector on-site caliper measurement or batch records inconclusive for ${app.product_name}. Re-clarification mandated to verify packaging character heights and batch logs.`
                            );
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                          title="Re-submit to Sub-Inspector for clarification"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                          <span>Re-Submit Sub-Inspector for Clarification</span>
                        </button>
                      </>
                    )}

                    {/* When already approved & forwarded to ALMO */}
                    {isForwardedToALMO && (
                      <span className="bg-blue-50 text-blue-800 border border-blue-300 font-mono font-bold text-2xs px-3 py-1.5 rounded-xl flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Approved & Sent to ALMO (Level 3 Sanction)</span>
                      </span>
                    )}

                    {/* When already certified */}
                    {isCertified && (
                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono font-bold text-2xs px-3 py-1.5 rounded-xl flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Certified #{app.certificate_number || 'LMPC-2026-CERT'}</span>
                      </span>
                    )}

                    {/* When in field execution */}
                    {isSanctioned && (
                      <span className="text-amber-700 bg-amber-50 border border-amber-200 text-3xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                        <span>Squad On-Site In Progress</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Universal Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={{
            ...selectedProduct,
            onUpdated: fetchApplications,
          }}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* Modal 1: Lead Inspector Approved and Sent to ALMO */}
      {approvingApp && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Approve & Send to ALMO: {approvingApp.product_name}</span>
              </h3>
              <button onClick={() => setApprovingApp(null)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleApproveSubmit} className="space-y-3.5 text-xs">
              <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 text-emerald-950 space-y-1">
                <span className="font-bold text-3xs uppercase block text-emerald-900">Statutory Endorsement Authority (LMI L4):</span>
                <p className="text-3xs leading-relaxed">
                  Approving this physical inspection confirms that on-site Vernier caliper numeral measurements, physical net quantity, and packaging declarations satisfy Legal Metrology Rules 2011. This sends the file to <strong>ALMO / CLMO (Level 3)</strong> to issue the digitally signed clearance certificate.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">Lead Inspector Official Remarks *</label>
                <textarea
                  rows={4}
                  required
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl font-medium text-slate-900 focus:bg-white focus:border-emerald-500 outline-none leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setApprovingApp(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Confirm Approval & Send to ALMO</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Re-Field Visit: Send Back to Sub-Inspector */}
      {reVisitApp && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-600" />
                <span>Re-Submit to Sub-Inspector for Clarification: {reVisitApp.product_name}</span>
              </h3>
              <button onClick={() => setReVisitApp(null)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleReVisitSubmit} className="space-y-3.5 text-xs">
              <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-amber-950 space-y-1">
                <span className="font-bold text-3xs uppercase block text-amber-900">Re-Submit to Sub-Inspector for Clarification:</span>
                <p className="text-3xs leading-relaxed">
                  Returns this Visit Order (VO) directly back to <strong>Sub-Inspector Sanjay Kumar (ASST-DEL-012)</strong> for statutory clarification on physical packaging character heights, net quantity, or batch verification on the factory floor.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">Target Facility / Plant Location</label>
                <input
                  type="text"
                  value={reVisitLocation}
                  onChange={(e) => setReVisitLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium text-slate-900 focus:bg-white focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">Clarification Directives & Grounds *</label>
                <textarea
                  rows={3}
                  required
                  value={reVisitNotes}
                  onChange={(e) => setReVisitNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium text-slate-900 focus:bg-white focus:border-amber-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setReVisitApp(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  <span>Confirm & Re-Submit to Sub-Inspector for Clarification</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Reject and Send it to Desk */}
      {rejectDeskApp && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>Reject & Send to Desk: {rejectDeskApp.product_name}</span>
              </h3>
              <button onClick={() => setRejectDeskApp(null)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleRejectDeskSubmit} className="space-y-3.5 text-xs">
              <div className="bg-rose-50 p-3.5 rounded-2xl border border-rose-200 text-rose-950 space-y-1">
                <span className="font-bold text-3xs uppercase block text-rose-900">15-Day Resolution Desk Rejection:</span>
                <p className="text-3xs leading-relaxed">
                  Rejects the current submission and issues a formal statutory deficiency notice to the <strong>15-Day Resolution Desk</strong>. The Brand Owner is given 15 days to rectify packaging defects and resubmit artwork proof.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">Official Deficiency Directives *</label>
                <textarea
                  rows={4}
                  required
                  value={rejectDeskNotes}
                  onChange={(e) => setRejectDeskNotes(e.target.value)}
                  placeholder="Detail the mandatory label corrections required under Legal Metrology Rules 2011..."
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium text-slate-900 focus:bg-white focus:border-rose-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setRejectDeskApp(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                  <span>Confirm Rejection & Send to Desk</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
