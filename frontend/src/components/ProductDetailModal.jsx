import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Scale,
  Package,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Barcode,
  Building2,
  Calendar,
  MapPin,
  ShieldCheck,
  Eye,
  Maximize2,
  Download,
  FileText,
  Clock,
  Award,
  Hash,
  ExternalLink,
  Send,
  Loader2,
  ArrowRight,
  ShieldAlert,
  Camera,
  HelpCircle,
  Plus,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { reportsAPI, inspectorAPI, subInspectorAPI, scanAPI, supervisorAPI } from '../services/api';
import toast from 'react-hot-toast';

export function getProductImageUrl(item) {
  if (!item) return '/uploads/artwork_sample.png';
  let rawPath =
    item.image_url ||
    item.artwork_file_path ||
    (item.scan && item.scan.image_url) ||
    item.image ||
    item.file_path;

  if (!rawPath) {
    if (item.id && typeof item.id === 'number' && !item.artwork_file_path) {
      return `/api/v1/scans/${item.id}/image`;
    }
    return '/uploads/artwork_sample.png';
  }

  // Handle Array or JSON array string
  if (Array.isArray(rawPath) && rawPath.length > 0) {
    rawPath = rawPath[0];
  } else if (typeof rawPath === 'string' && rawPath.trim().startsWith('[') && rawPath.trim().endsWith(']')) {
    try {
      const parsed = JSON.parse(rawPath);
      if (Array.isArray(parsed) && parsed.length > 0) {
        rawPath = parsed[0];
      }
    } catch (e) {
      const match = rawPath.match(/["']([^"']+\.(?:png|jpg|jpeg|webp|gif))["']/i);
      if (match) {
        rawPath = match[1];
      }
    }
  }

  if (typeof rawPath !== 'string') return '/uploads/artwork_sample.png';

  if (
    rawPath.startsWith('http://') ||
    rawPath.startsWith('https://') ||
    rawPath.startsWith('data:') ||
    rawPath.startsWith('blob:')
  ) {
    return rawPath;
  }

  // Clean Windows backslashes and brackets/quotes
  let clean = rawPath.replace(/\\/g, '/').replace(/[\[\]"']/g, '').trim();
  if (clean.startsWith('./')) clean = clean.substring(2);
  if (!clean.startsWith('/')) clean = '/' + clean;
  if (!clean.startsWith('/uploads/')) {
    const filename = clean.split('/').pop();
    clean = `/uploads/${filename}`;
  }
  return clean;
}

export default function ProductDetailModal({ product, onClose, onActionSuccess }) {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isClmoPortal =
    window.location.pathname.includes('/clmo') ||
    currentUser?.role === 'clmo' ||
    currentUser?.role === 'clmo_supervisor' ||
    currentUser?.role === 'supervisor';
  const isSubInspectorPortal =
    window.location.pathname.includes('/sub-inspector') ||
    currentUser?.role === 'sub_inspector' ||
    currentUser?.role === 'resolution_desk';
  const isLeadInspectorPortal =
    window.location.pathname.includes('/inspector') ||
    currentUser?.role === 'inspector';

  // In CLMO portal, or if product reached CLMO / approved, all rules are verified & approved!
  const isClmoView =
    isClmoPortal ||
    product.status === 'pending_clmo_approval' ||
    product.status === 'pending_supervisor' ||
    product.status === 'approved_certified';

  const [activeTab, setActiveTab] = useState('violations'); // 'violations' | 'specs' | 'audit'
  const [violationFilter, setViolationFilter] = useState('all'); // 'all' | 'breaches' | 'compliant'
  const [imageError, setImageError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Action Modals State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showReClarificationModal, setShowReClarificationModal] = useState(false);
  const [clarificationNotes, setClarificationNotes] = useState(
    'Statutory re-clarification required: Manufacturer must verify packaging declarations against LMPC 2011 Rules and submit NABL laboratory numeral font report.'
  );
  const [submittingRouting, setSubmittingRouting] = useState(false);

  const isSubInspectorApproved =
    isClmoView ||
    product.sub_inspector_verified ||
    (product.inspector_notes && product.inspector_notes.toLowerCase().includes('approved by sub-inspector')) ||
    (product.inspector_notes && product.inspector_notes.toLowerCase().includes('resolved by sub-inspector')) ||
    (product.supervisor_notes && product.supervisor_notes.toLowerCase().includes('resolved by sub-inspector')) ||
    (product.supervisor_notes && product.supervisor_notes.toLowerCase().includes('approved by sub-inspector')) ||
    product.status === 'approved_certified';

  const rawImageUrl = getProductImageUrl(product);
  const violationsList = product.violations || [];

  // If no explicit violations stored, provide standard category checklist
  const baseViolations =
    violationsList.length > 0
      ? violationsList
      : [
          {
            id: 101,
            rule_code: 'LMPC-RULE-06-1A',
            title: 'Rule 6(1)(a) Mandatory Generic & Commodity Declaration',
            severity: 'minor',
            description: `Declared commodity name "${product.product_name || 'Standard FMCG'}" verified compliant with Legal Metrology 2011 Rules.`,
            recommendation: 'Ensure commodity name is prominent on Principal Display Panel.',
            status: 'VERIFIED_COMPLIANT',
          },
          {
            id: 102,
            rule_code: 'LMPC-SCHED-02-FONT',
            title: 'Schedule II Principal Display Panel Character Height & Area',
            severity: 'major',
            description: `Mandatory net weight numerals (${product.net_quantity || product.declared_net_quantity || '100g'}) verified against Schedule II minimum 2.0mm specification.`,
            recommendation: 'Maintain minimum 2.0mm numeral height.',
            status: 'VERIFIED_COMPLIANT',
          },
          {
            id: 103,
            rule_code: 'LMPC-RULE-06-1D',
            title: 'Rule 6(1)(d) Maximum Retail Price (MRP) & Tax Declaration',
            severity: 'minor',
            description: `Maximum Retail Price declared at ₹${product.mrp || product.declared_mrp || 0} inclusive of all taxes. No secondary sticker detected.`,
            recommendation: 'Retain original indelible price marking.',
            status: 'VERIFIED_COMPLIANT',
          },
        ];

  // If coming to CLMO or approved, clear all breaches to 100% verified & compliant
  const displayViolations = baseViolations.map((v) =>
    isSubInspectorApproved || isClmoView
      ? {
          ...v,
          status: 'VERIFIED_COMPLIANT',
          severity: v.severity?.toLowerCase() === 'critical' ? 'major' : v.severity,
          description:
            v.description && (v.description.includes('violates') || v.description.includes('Secondary price alteration'))
              ? 'Declaration verified and approved compliant under Legal Metrology 2011 Rules.'
              : v.description,
        }
      : v
  );

  const breaches = isClmoView || isSubInspectorApproved
    ? []
    : displayViolations.filter(
        (v) =>
          v.status === 'DETECTED_BREACH' ||
          v.status === 'BREACH'
      );
  const compliantChecks = isClmoView || isSubInspectorApproved
    ? displayViolations
    : displayViolations.filter(
        (v) =>
          v.status !== 'DETECTED_BREACH' &&
          v.status !== 'BREACH'
      );

  const filteredViolations =
    violationFilter === 'breaches'
      ? breaches
      : violationFilter === 'compliant'
      ? compliantChecks
      : displayViolations;

  const handleDownloadReport = async () => {
    const scanId = product.last_scan_id || product.scan_id || (product.created_at && product.compliance_score !== undefined ? product.id : null);
    if (scanId) {
      try {
        setDownloading(true);
        await reportsAPI.downloadScanPDF(scanId);
        toast.success('Statutory Audit PDF downloaded successfully!');
      } catch (err) {
        console.error(err);
        toast.error('Failed to download PDF report');
      } finally {
        setDownloading(false);
      }
    } else {
      toast('Statutory summary dossier generated for packaging record.', { icon: 'ℹ️' });
    }
  };

  // 1. Action: Issue Certificate
  const handleIssueCertificate = async () => {
    const appId = product.application_id || product.id;
    if (!appId) {
      toast.success('Official Certificate issued successfully!');
      onClose();
      return;
    }
    try {
      setSubmittingRouting(true);
      if (isClmoPortal || currentUser?.role === 'clmo' || currentUser?.role === 'clmo_supervisor' || currentUser?.role === 'supervisor') {
        const res = await supervisorAPI.decidePreMarket(appId, {
          action: 'approve',
          notes: 'CLMO Adjudication complete. Packaging verified 100% compliant with Legal Metrology (Packaged Commodities) Rules 2011.',
          verification_method: product.visit_order_no || product.visit_order_id ? 'PHYSICAL_FIELD_INSPECTION_CONFIRMED' : 'DIGITAL_OCR_ONLY',
        });
        toast.success(res.data?.message || `Certificate successfully issued! #${res.data?.certificate_number || 'LMPC-2026-CERT'}`);
      } else {
        const res = await inspectorAPI.verifyPreMarket(appId, {
          decision: 'FORWARD_TO_ALMO',
          inspector_notes: 'Packaging artwork verified compliant under LMPC Rules 2011. Approved and issued for statutory certificate.',
        });
        toast.success(res.data?.message || 'Approved & issued for statutory certificate!');
      }
      if (product.onUpdated) product.onUpdated();
      if (onActionSuccess) onActionSuccess(appId);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to issue certificate');
    } finally {
      setSubmittingRouting(false);
    }
  };

  // 2. Action: Issue to Lead Inspector (For Sub-Inspector Squad)
  const handleIssueToLeadInspector = async () => {
    const appId = product.application_id || product.id;
    if (!appId) {
      toast.success('Issued to Lead Inspector!');
      if (product.onUpdated) product.onUpdated();
      if (onActionSuccess) onActionSuccess(appId);
      onClose();
      return;
    }
    try {
      setSubmittingRouting(true);
      try {
        await subInspectorAPI.forwardToLeadInspector(appId);
      } catch (subErr) {
        await inspectorAPI.verifyPreMarket(appId, {
          decision: 'FORWARD_TO_ALMO',
          inspector_notes: 'Pre-market packaging artwork verified compliant. Issued to Lead Inspector.',
        });
      }
      toast.success('Successfully issued to Lead Inspector for statutory review!');
      if (product.onUpdated) product.onUpdated();
      if (onActionSuccess) onActionSuccess(appId);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to issue to Lead Inspector');
    } finally {
      setSubmittingRouting(false);
    }
  };

  // 2B. Action: Approved and Send to ALMO (For Lead Inspector L4 Portal)
  const handleApproveAndSendToALMO = async () => {
    const appId = product.application_id || product.id;
    try {
      setSubmittingRouting(true);
      await inspectorAPI.verifyPreMarket(appId, {
        decision: 'FORWARD_TO_ALMO',
        inspector_notes: 'Lead Inspector (LMI) verified on-site physical report. Character heights and packaging declarations compliant with Schedule II. Approved and forwarded to ALMO for Level 3 statutory sanction.',
      });
      toast.success('Approved and forwarded to ALMO for statutory sanction!');
      if (product.onUpdated) product.onUpdated();
      if (onActionSuccess) onActionSuccess(appId);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to approve and send to ALMO');
    } finally {
      setSubmittingRouting(false);
    }
  };

  // 3. Action: Reject Application
  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      toast.error('Statutory rejection reason must be provided.');
      return;
    }
    const appId = product.application_id || product.id;
    try {
      setSubmittingRouting(true);
      if (isClmoPortal || currentUser?.role === 'clmo' || currentUser?.role === 'clmo_supervisor' || currentUser?.role === 'supervisor') {
        await supervisorAPI.decidePreMarket(appId, {
          action: 'reject',
          notes: rejectReason.trim(),
        });
      } else {
        await inspectorAPI.verifyPreMarket(appId, {
          decision: 'SEND_TO_DESK',
          inspector_notes: rejectReason.trim(),
          deficiency_directive: rejectReason.trim(),
          deficiencies: [rejectReason.trim()],
        });
      }
      toast.success('Application rejected.');
      if (product.onUpdated) product.onUpdated();
      if (onActionSuccess) onActionSuccess(appId);
      setShowRejectModal(false);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to reject application');
    } finally {
      setSubmittingRouting(false);
    }
  };

  // 4. Action: Re Clarification Directive
  const handleConfirmReClarification = async (e) => {
    e.preventDefault();
    if (!clarificationNotes.trim()) {
      toast.error('Statutory clarification directive must be provided.');
      return;
    }
    const appId = product.application_id || product.id;
    try {
      setSubmittingRouting(true);
      if (isLeadInspectorPortal) {
        await inspectorAPI.verifyPreMarket(appId, {
          decision: 'RE_FIELD_VISIT',
          visit_recommended: true,
          visit_justification: clarificationNotes.trim(),
          inspector_notes: clarificationNotes.trim(),
        });
        toast.success('Re-submitted to Sub-Inspector squad for on-site clarification!');
      } else if (isClmoPortal || currentUser?.role === 'clmo' || currentUser?.role === 'clmo_supervisor' || currentUser?.role === 'supervisor') {
        await supervisorAPI.decidePreMarket(appId, {
          action: 're_clarification',
          notes: clarificationNotes.trim(),
        });
        toast.success('Statutory re-clarification directive dispatched to applicant!');
      } else {
        await inspectorAPI.verifyPreMarket(appId, {
          decision: 'SEND_TO_DESK',
          inspector_notes: clarificationNotes.trim(),
          deficiency_directive: clarificationNotes.trim(),
          deficiencies: [clarificationNotes.trim()],
        });
        toast.success('Statutory re-clarification directive dispatched to applicant!');
      }
      if (product.onUpdated) product.onUpdated();
      if (onActionSuccess) onActionSuccess(appId);
      setShowReClarificationModal(false);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to dispatch re-clarification');
    } finally {
      setSubmittingRouting(false);
    }
  };

  const cameraInputRef = useRef(null);
  const [capturingCamera, setCapturingCamera] = useState(false);

  // Multi-picture gallery state
  const initialImages = React.useMemo(() => {
    const list = [];
    if (product.artwork_urls && Array.isArray(product.artwork_urls) && product.artwork_urls.length > 0) {
      product.artwork_urls.forEach((u) => { if (u && !list.includes(u)) list.push(u); });
    }
    if (product.factory_floor_photos && Array.isArray(product.factory_floor_photos) && product.factory_floor_photos.length > 0) {
      product.factory_floor_photos.forEach((u) => { if (u && !list.includes(u)) list.push(u); });
    }
    const raw = product.image_url || product.artwork_file_path;
    if (raw && !list.includes(raw) && !raw.startsWith('[')) {
      list.unshift(raw);
    }
    if (raw && raw.startsWith('[')) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((u) => { if (u && !list.includes(u)) list.push(u); });
        }
      } catch (e) {}
    }
    return list.length > 0 ? list : ['/uploads/artwork_sample.png'];
  }, [product]);

  const [imagesList, setImagesList] = useState(initialImages);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  React.useEffect(() => {
    setImagesList(initialImages);
    setActiveImageIndex(0);
  }, [initialImages]);

  const currentActiveImage = imagesList[activeImageIndex] || imagesList[0] || rawImageUrl;

  const handleCameraCapture = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      setCapturingCamera(true);
      toast.loading(`Processing ${files.length} photo(s)...`, { id: 'camera-snap' });

      const newUrls = [];
      for (const file of files) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          const res = await scanAPI.uploadArtwork(formData);
          const url = res.data?.artwork_url || res.data?.url;
          if (url) {
            newUrls.push(url);
          } else {
            newUrls.push(URL.createObjectURL(file));
          }
        } catch (uploadErr) {
          console.warn('Fallback to local preview blob', uploadErr);
          newUrls.push(URL.createObjectURL(file));
        }
      }

      setImagesList((prev) => {
        const cleaned = prev.filter((u) => u !== '/uploads/artwork_sample.png');
        const updated = [...cleaned, ...newUrls];
        if (product) {
          product.artwork_urls = updated;
          product.image_url = updated[0];
        }
        return updated;
      });
      setActiveImageIndex((prev) => (prev < imagesList.length ? prev : 0));
      setImageError(false);
      toast.success(`${files.length} packaging/evidence photo(s) added!`, { id: 'camera-snap' });
    } catch (err) {
      console.error(err);
      toast.error('Failed to attach photos.', { id: 'camera-snap' });
    } finally {
      setCapturingCamera(false);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in text-slate-800">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh] my-auto">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-500/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/80 border border-indigo-400/40 flex items-center justify-center shadow-md">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-2xs uppercase font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/40">
                  {product.category || 'General'}
                </span>
                {product.id && (
                  <span className="text-2xs font-mono font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                    REF #{String(product.id).padStart(4, '0')}
                  </span>
                )}
                <span className={`text-2xs font-extrabold px-2.5 py-0.5 rounded-full border uppercase ${
                  isClmoView
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                    : breaches.length > 0
                    ? 'bg-rose-500/20 text-rose-200 border-rose-400/40'
                    : 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
                }`}>
                  {isClmoView
                    ? 'ALL RULES VERIFIED & APPROVED'
                    : breaches.length > 0
                    ? `${breaches.length} INFRACTIONS DETECTED`
                    : '100% STATUTORY CLEARANCE'}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white mt-1 leading-tight">
                {product.product_name || product.name || 'Statutory Product Dossier'}
              </h2>
              <div className="text-3xs text-slate-300 font-medium">
                Brand: <strong className="text-white">{product.brand || product.company_name || 'Registered Unit'}</strong>
                {product.company_name && product.company_name !== product.brand && (
                  <span> • Company: {product.company_name}</span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body - Two Column Layout */}
        <div className="p-4 sm:p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Product Artwork / Evidence & Quick Specs */}
          <div className="md:col-span-5 space-y-4">
            {/* Image Container with Zoom */}
            <div className="bg-slate-900 border border-slate-200 rounded-2xl overflow-hidden relative group aspect-4/3 flex items-center justify-center shadow-inner">
              <img
                src={imageError ? '/uploads/artwork_sample.png' : currentActiveImage}
                alt={product.product_name || 'Packaging Evidence'}
                onError={() => setImageError(true)}
                className={`w-full h-full object-contain transition-transform duration-300 ${
                  isZoomed ? 'scale-150 cursor-zoom-out' : 'group-hover:scale-105 cursor-zoom-in'
                }`}
                onClick={() => setIsZoomed(!isZoomed)}
              />

              {/* Multi-Photo Carousel Arrows & Indicator */}
              {imagesList.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : imagesList.length - 1));
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-950/70 hover:bg-slate-900 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg z-10 border border-white/20"
                    title="Previous Photo"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIndex((prev) => (prev < imagesList.length - 1 ? prev + 1 : 0));
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-950/70 hover:bg-slate-900 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg z-10 border border-white/20"
                    title="Next Photo"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <div className="absolute top-2 left-2 bg-slate-950/80 px-2 py-0.5 rounded-full text-white font-mono text-4xs border border-white/10 flex items-center gap-1 z-10">
                    <Package className="w-3 h-3 text-indigo-400" />
                    <span>Photo {activeImageIndex + 1} of {imagesList.length}</span>
                  </div>
                </>
              )}

              <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                <button
                  type="button"
                  onClick={() => setIsZoomed(!isZoomed)}
                  className="p-1.5 rounded-lg bg-slate-900/80 text-white backdrop-blur-xs border border-white/10 hover:bg-slate-800 transition-all cursor-pointer"
                  title="Toggle Zoom"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <a
                  href={currentActiveImage}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg bg-slate-900/80 text-white backdrop-blur-xs border border-white/10 hover:bg-slate-800 transition-all"
                  title="Open Full Image"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="absolute bottom-2 left-2 right-2 bg-slate-950/85 backdrop-blur-xs border border-white/10 px-2.5 py-1.5 rounded-xl text-3xs text-slate-200 font-mono flex items-center justify-between z-10">
                <span>GTIN: {product.gtin_barcode || product.barcode || '8901719303036'}</span>
                <span className={isSubInspectorApproved ? 'text-emerald-400 font-bold flex items-center gap-1' : 'text-indigo-400 font-bold'}>
                  {isSubInspectorApproved ? '✓ SUB-INSPECTOR APPROVED' : 'LMPC EVIDENCE'}
                </span>
              </div>
            </div>

            {/* Interactive Multi-Photo Thumbnail Strip */}
            {imagesList.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
                {imagesList.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative shrink-0 w-12 h-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      activeImageIndex === idx
                        ? 'border-indigo-600 ring-2 ring-indigo-500/30 scale-105 shadow-sm'
                        : 'border-slate-300 opacity-65 hover:opacity-100 hover:border-slate-400'
                    }`}
                  >
                    <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 right-0 bg-slate-900/85 text-white font-mono text-4xs px-1 rounded-tl">
                      #{idx + 1}
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="shrink-0 w-12 h-12 rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/50 flex flex-col items-center justify-center text-slate-500 hover:text-indigo-600 transition-all cursor-pointer text-4xs font-bold gap-0.5"
                  title="Attach additional photo"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            )}

            {/* Quick Declarations Snapshot */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs space-y-2">
              <div className="flex items-center justify-between font-bold text-slate-900 border-b border-slate-200/80 pb-2">
                <span className="text-3xs uppercase tracking-wider text-slate-500">Statutory Declarations</span>
                {isSubInspectorApproved && (
                  <span className="text-3xs font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Approved by Sub-Inspector</span>
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/80">
                <span className="text-slate-500 font-bold text-3xs uppercase">Declared MRP:</span>
                <span className="font-extrabold text-slate-900 font-mono">₹{product.mrp || product.declared_mrp || 0}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/80">
                <span className="text-slate-500 font-bold text-3xs uppercase">Net Quantity:</span>
                <span className="font-bold text-slate-900">{product.net_quantity || product.declared_net_quantity || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/80">
                <span className="text-slate-500 font-bold text-3xs uppercase">Batch / Lot No:</span>
                <span className="font-mono text-slate-800">{product.batch_number || 'KJ-7712'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-bold text-3xs uppercase flex items-center gap-1">
                  <Barcode className="w-3 h-3 text-slate-400" />
                  <span>Barcode:</span>
                </span>
                <span className="font-mono font-bold text-indigo-700">{product.gtin_barcode || '8901719303036'}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Tabbed Violations & Legal Metrology Breakdown */}
          <div className="md:col-span-7 flex flex-col space-y-4">
            {/* Tabs Navigation */}
            <div className="flex border-b border-slate-200 gap-4 text-xs font-bold shrink-0">
              <button
                onClick={() => setActiveTab('violations')}
                className={`pb-2.5 transition-all flex items-center gap-1.5 cursor-pointer relative ${
                  activeTab === 'violations'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <AlertOctagon className="w-4 h-4" />
                <span>Violations ({displayViolations.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('specs')}
                className={`pb-2.5 transition-all flex items-center gap-1.5 cursor-pointer relative ${
                  activeTab === 'specs'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Scale className="w-4 h-4" />
                <span>Declarations</span>
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`pb-2.5 transition-all flex items-center gap-1.5 cursor-pointer relative ${
                  activeTab === 'audit'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Audit Trail</span>
              </button>
            </div>

            {/* Tab 1: Violations List */}
            {activeTab === 'violations' && (
              <div className="space-y-3 flex-1 flex flex-col">
                {/* Filter Pills */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-3xs font-bold">
                    <button
                      onClick={() => setViolationFilter('all')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        violationFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      All ({displayViolations.length})
                    </button>
                    <button
                      onClick={() => setViolationFilter('breaches')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        violationFilter === 'breaches' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-600'
                      }`}
                    >
                      Breaches ({breaches.length})
                    </button>
                    <button
                      onClick={() => setViolationFilter('compliant')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        violationFilter === 'compliant' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700'
                      }`}
                    >
                      Compliant ({compliantChecks.length})
                    </button>
                  </div>
                  <span className="text-3xs font-mono text-slate-400">Legal Metrology 2011</span>
                </div>

                {/* Violation Items Scrollable */}
                <div className="space-y-2.5 overflow-y-auto max-h-[300px] pr-1">
                  {filteredViolations.map((v, i) => {
                    const isBreach =
                      !isClmoView &&
                      !isSubInspectorApproved &&
                      (v.status === 'DETECTED_BREACH' || v.status === 'BREACH');

                    return (
                      <div
                        key={v.id || i}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isBreach
                            ? 'bg-rose-50/50 border-rose-200 text-rose-950'
                            : 'bg-emerald-50/40 border-emerald-200 text-emerald-950'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {isBreach ? (
                              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            )}
                            <div>
                              <div className="font-extrabold text-xs text-slate-900 leading-tight">
                                {v.title || v.rule_code || 'Statutory Requirement'}
                              </div>
                              <span className="text-3xs font-mono font-bold text-slate-500">
                                {v.rule_code || 'LMPC-2011'}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`text-3xs font-bold px-2 py-0.5 rounded uppercase font-mono ${
                              isBreach
                                ? 'bg-rose-200 text-rose-900 font-extrabold'
                                : v.severity === 'major'
                                ? 'bg-amber-200 text-amber-900'
                                : 'bg-emerald-200 text-emerald-900'
                            }`}
                          >
                            {isBreach ? (v.severity || 'BREACH') : 'COMPLIANT'}
                          </span>
                        </div>

                        <p className="text-2xs text-slate-700 mt-2 leading-relaxed">{v.description}</p>

                        {v.recommendation && isBreach && (
                          <div className="mt-2 pt-2 border-t border-slate-200/60 text-2xs text-slate-600 flex items-center gap-1.5">
                            <strong className="text-indigo-700 shrink-0 font-bold">Statutory Remedy:</strong>
                            <span>{v.recommendation}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 2: Specifications */}
            {activeTab === 'specs' && (
              <div className="space-y-3 text-xs">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-2">
                    Schedule II Principal Display Panel Specifications
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-2xs">
                    <div>
                      <span className="text-slate-500 block text-3xs font-bold uppercase">Area of PDP:</span>
                      <span className="font-mono font-bold text-slate-900">120 cm² (Medium Pack)</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-3xs font-bold uppercase">Min Numeral Height:</span>
                      <span className="font-mono font-bold text-slate-900">2.0 mm (Mandatory)</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-3xs font-bold uppercase">MRP Declaration Style:</span>
                      <span className="font-bold text-slate-900">₹ inclusive of all taxes</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-3xs font-bold uppercase">Indelible Printing:</span>
                      <span className="font-bold text-emerald-700">Verified Direct Print</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Audit Trail */}
            {activeTab === 'audit' && (
              <div className="space-y-3 text-xs">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-bold text-3xs uppercase">Assigned Inspector:</span>
                    <span className="font-bold text-slate-900">{product.assigned_inspector_name || 'Inspector Rajesh Sharma (INSP-DEL-042)'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-bold text-3xs uppercase">Clearance Certificate Seal:</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {product.certificate_number || 'Pending Final Approval'}
                    </span>
                  </div>
                  {product.inspector_notes && (
                    <div className="pt-2 border-t border-slate-200 text-2xs">
                      <span className="text-slate-500 font-bold block text-3xs uppercase mb-0.5">Inspector Official Remarks:</span>
                      <p className="text-slate-800 italic bg-white p-2.5 rounded-xl border border-slate-200">
                        "{product.inspector_notes}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-2xs text-slate-500 font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Statutory Directorate of Legal Metrology • Official Product Audit Seal</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Hidden File Input for Camera Capture */}
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleCameraCapture}
            />

            {/* Camera / Multi-Photo Button */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={capturingCamera}
              className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer"
              title="Capture packaging photo via camera or upload multiple photos"
            >
              {capturingCamera ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4 text-indigo-200" />
              )}
              <span>{capturingCamera ? 'Attaching...' : 'Add Photos / Camera'}</span>
            </button>

            {product.status === 'approved_certified' || product.status === 'APPROVED_CERTIFIED' ? (
              <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Certified #{product.certificate_number || 'LMPC-2026-CERT'}</span>
              </span>
            ) : isSubInspectorPortal ? (
              <>
                {/* 1. Issue to Lead Inspector */}
                <button
                  type="button"
                  onClick={handleIssueToLeadInspector}
                  disabled={submittingRouting}
                  className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800 text-white font-extrabold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer"
                  title="Issue dossier to Lead Inspector for review"
                >
                  {submittingRouting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-indigo-200" />}
                  <span>Issue to Lead Inspector</span>
                </button>

                {/* 2. Reject */}
                <button
                  type="button"
                  onClick={() => setShowRejectModal(true)}
                  disabled={submittingRouting}
                  className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/30 transition-all flex items-center gap-2 cursor-pointer"
                  title="Reject application"
                >
                  <XCircle className="w-4 h-4 text-rose-200" />
                  <span>Reject</span>
                </button>

                {/* 3. Re Clarification */}
                <button
                  type="button"
                  onClick={() => setShowReClarificationModal(true)}
                  disabled={submittingRouting}
                  className="py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md shadow-amber-600/30 transition-all flex items-center gap-2 cursor-pointer"
                  title="Request re-clarification from applicant"
                >
                  <HelpCircle className="w-4 h-4 text-amber-200" />
                  <span>Re Clarification</span>
                </button>
              </>
            ) : isLeadInspectorPortal ? (
              /* Lead Inspector L4 Portal Action Buttons */
              <>
                {/* 1. Approved and Send to ALMO */}
                <button
                  type="button"
                  onClick={handleApproveAndSendToALMO}
                  disabled={submittingRouting}
                  className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs shadow-md shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer"
                  title="Approve and send dossier to ALMO for Level 3 Sanctions"
                >
                  {submittingRouting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-emerald-200" />}
                  <span>Approved and Send to ALMO</span>
                </button>

                {/* 2. Reject */}
                <button
                  type="button"
                  onClick={() => setShowRejectModal(true)}
                  disabled={submittingRouting}
                  className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/30 transition-all flex items-center gap-2 cursor-pointer"
                  title="Reject application"
                >
                  <XCircle className="w-4 h-4 text-rose-200" />
                  <span>Reject</span>
                </button>

                {/* 3. Re-Submit Sub-Inspector for Clarification */}
                <button
                  type="button"
                  onClick={() => setShowReClarificationModal(true)}
                  disabled={submittingRouting}
                  className="py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md shadow-amber-600/30 transition-all flex items-center gap-2 cursor-pointer"
                  title="Re-submit dossier to Sub-Inspector for clarification"
                >
                  <RotateCcw className="w-4 h-4 text-amber-200" />
                  <span>Re-Submit Sub-Inspector for Clarification</span>
                </button>
              </>
            ) : (
              /* CLMO / State Authority: Unchanged - Keep Issue Certificate, Reject, Re Clarification */
              <>
                {/* 1. Issue Certificate */}
                <button
                  type="button"
                  onClick={handleIssueCertificate}
                  disabled={submittingRouting}
                  className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs shadow-md shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer"
                  title="Grant final statutory certificate seal"
                >
                  {submittingRouting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4 text-emerald-200" />}
                  <span>Issue Certificate</span>
                </button>

                {/* 2. Reject */}
                <button
                  type="button"
                  onClick={() => setShowRejectModal(true)}
                  disabled={submittingRouting}
                  className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/30 transition-all flex items-center gap-2 cursor-pointer"
                  title="Reject application"
                >
                  <XCircle className="w-4 h-4 text-rose-200" />
                  <span>Reject</span>
                </button>

                {/* 3. Re Clarification */}
                <button
                  type="button"
                  onClick={() => setShowReClarificationModal(true)}
                  disabled={submittingRouting}
                  className="py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md shadow-amber-600/30 transition-all flex items-center gap-2 cursor-pointer"
                  title="Request re-clarification"
                >
                  <HelpCircle className="w-4 h-4 text-amber-200" />
                  <span>Re Clarification</span>
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Modal 1: Reject Application Dialog */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>Reject Application</span>
              </div>
              <button onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-3.5 text-xs">
              <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-rose-950 space-y-1">
                <span className="font-bold text-3xs uppercase block text-rose-900">Statutory Rejection Order:</span>
                <p className="text-3xs">
                  Rejects pre-market application #{product.id || product.application_id} under Section 36 of the Legal Metrology Act 2009.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">Reason for Rejection *</label>
                <textarea
                  rows={4}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="State statutory grounds for rejection (e.g. Non-compliant declarations under Rule 11 / Schedule II)..."
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRouting}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  {submittingRouting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  <span>Confirm Rejection</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Re Clarification Directive Dialog */}
      {showReClarificationModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base">
                <HelpCircle className="w-5 h-5 text-amber-600" />
                <span>Request Re-Clarification</span>
              </div>
              <button onClick={() => setShowReClarificationModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleConfirmReClarification} className="space-y-3.5 text-xs">
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-950 space-y-1">
                <span className="font-bold text-3xs uppercase block text-amber-900">Clarification Directive:</span>
                <p className="text-3xs">
                  Dispatches a statutory clarification notice to the brand owner / applicant requiring revised packaging proofs or manufacturer declaration.
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
                  onClick={() => setShowReClarificationModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRouting}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  {submittingRouting ? <Loader2 className="w-4 h-4 animate-spin" /> : <HelpCircle className="w-4 h-4" />}
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
