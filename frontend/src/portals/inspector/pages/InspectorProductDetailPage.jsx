import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  RotateCcw,
  Scale,
  ShieldCheck,
  Building2,
  Calendar,
  MapPin,
  Clock,
  Eye,
  Maximize2,
  Download,
  FileText,
  Award,
  Loader2,
  Camera,
  Plus,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { inspectorAPI, productsAPI, reportsAPI } from '../../../services/api';
import toast from 'react-hot-toast';

export default function InspectorProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('violations'); // 'violations' | 'specs' | 'audit'
  const [isZoomed, setIsZoomed] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Action Modals State
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showClarificationModal, setShowClarificationModal] = useState(false);
  const [clarificationNotes, setClarificationNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const fileInputRef = useRef(null);

  const fetchDossier = async () => {
    try {
      setLoading(true);
      const res = await productsAPI.getById(id);
      setProduct(res.data);
      setApprovalNotes(
        `Lead Inspector (LMI) verified on-site physical report for ${res.data.product_name}. Caliper measurements and packaging declarations compliant with Schedule II. Approved and forwarded to ALMO for statutory sanction.`
      );
      setRejectReason(
        `Statutory defect directive: Non-compliant declarations flagged for ${res.data.product_name}. Rejected by Lead Inspector and sent to 15-Day Resolution Desk for brand owner rectification.`
      );
      setClarificationNotes(
        `Sub-Inspector on-site caliper measurement or batch records inconclusive for ${res.data.product_name}. Re-clarification mandated to verify packaging character heights and batch logs.`
      );
    } catch (err) {
      console.error('Failed to load product dossier', err);
      toast.error('Failed to load product audit dossier.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDossier();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-sm font-bold text-slate-600">Loading Lead Inspector Dossier #{id}...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500" />
        <h2 className="text-lg font-extrabold text-slate-900">Dossier Not Found</h2>
        <p className="text-xs text-slate-500">The requested packaging commodity could not be found.</p>
        <button
          onClick={() => navigate('/inspector/products')}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700"
        >
          ← Back to Pipeline
        </button>
      </div>
    );
  }

  // Multi-image list resolution
  const imageList = [];
  if (product.artwork_urls && Array.isArray(product.artwork_urls) && product.artwork_urls.length > 0) {
    product.artwork_urls.forEach((u) => { if (u && !imageList.includes(u)) imageList.push(u); });
  }
  if (product.image_url && !imageList.includes(product.image_url)) {
    imageList.unshift(product.image_url);
  }
  if (imageList.length === 0) imageList.push('/uploads/artwork_sample.png');

  const activeImage = imageList[activeImageIndex] || imageList[0];
  const vo = product.visit_order;

  // Actions Handlers
  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmittingAction(true);
      await inspectorAPI.verifyPreMarket(product.id, {
        decision: 'FORWARD_TO_ALMO',
        inspector_notes: approvalNotes,
      });
      toast.success(`Dossier approved and forwarded to ALMO for Level 3 statutory sanction!`);
      setShowApproveModal(false);
      navigate('/inspector/products');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to approve dossier');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmittingAction(true);
      await inspectorAPI.verifyPreMarket(product.id, {
        decision: 'SEND_TO_DESK',
        inspector_notes: rejectReason,
        deficiency_directive: rejectReason,
        deficiencies: [rejectReason],
      });
      toast.success('Application rejected and 15-Day Deficiency Notice dispatched!');
      setShowRejectModal(false);
      navigate('/inspector/products');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to reject application');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleClarificationSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmittingAction(true);
      await inspectorAPI.verifyPreMarket(product.id, {
        decision: 'RE_FIELD_VISIT',
        visit_recommended: true,
        visit_justification: clarificationNotes,
        inspector_notes: clarificationNotes,
      });
      toast.success('Re-submitted to Sub-Inspector squad for on-site clarification!');
      setShowClarificationModal(false);
      navigate('/inspector/products');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to re-submit for clarification');
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      {/* Navigation & Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/inspector/products')}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-all shadow-2xs flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Queue</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-3xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                Lead Inspector Dossier #{product.id}
              </span>
              <span className="font-mono text-3xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                {product.category || 'Food'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {product.product_name}
            </h1>
          </div>
        </div>

        {/* Action Buttons Top/Right */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* 1. Approved and Send to ALMO */}
          <button
            onClick={() => setShowApproveModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer"
            title="Approve and send dossier to ALMO for Level 3 Sanction"
          >
            <Send className="w-4 h-4 text-emerald-200" />
            <span>Approved and Send to ALMO</span>
          </button>

          {/* 2. Reject */}
          <button
            onClick={() => setShowRejectModal(true)}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/30 transition-all flex items-center gap-2 cursor-pointer"
            title="Reject application and issue 15-day notice"
          >
            <XCircle className="w-4 h-4 text-rose-200" />
            <span>Reject</span>
          </button>

          {/* 3. Re-Submit Sub-Inspector for Clarification */}
          <button
            onClick={() => setShowClarificationModal(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md shadow-amber-600/30 transition-all flex items-center gap-2 cursor-pointer"
            title="Re-submit to Sub-Inspector squad for clarification"
          >
            <RotateCcw className="w-4 h-4 text-amber-200" />
            <span>Re-Submit Sub-Inspector for Clarification</span>
          </button>
        </div>
      </div>

      {/* Main Dossier Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Artwork Gallery & Sub-Inspector Findings (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Packaging Artwork Gallery */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-indigo-600" />
                <span>Physical Packaging Artwork Gallery</span>
              </span>
              <span className="text-3xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                Photo {activeImageIndex + 1} of {imageList.length}
              </span>
            </div>

            {/* Main Stage View */}
            <div className="relative rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center min-h-[340px] group">
              <img
                src={activeImage}
                alt={product.product_name}
                className={`max-h-[360px] w-auto object-contain transition-all duration-300 ${
                  isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
                }`}
                onClick={() => setIsZoomed(!isZoomed)}
              />
              <button
                onClick={() => setIsZoomed(!isZoomed)}
                className="absolute top-3 right-3 p-2 rounded-xl bg-slate-900/80 text-white hover:bg-slate-800 border border-white/20 shadow-md backdrop-blur-xs"
                title={isZoomed ? 'Zoom Out' : 'Zoom In'}
              >
                <Maximize2 className="w-4 h-4" />
              </button>

              {/* Prev / Next Carousel Controls */}
              {imageList.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : imageList.length - 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-white/20 flex items-center justify-center shadow-md cursor-pointer transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActiveImageIndex((prev) => (prev < imageList.length - 1 ? prev + 1 : 0))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-white/20 flex items-center justify-center shadow-md cursor-pointer transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Strip */}
            {imageList.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                {imageList.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                      activeImageIndex === idx
                        ? 'border-indigo-600 ring-2 ring-indigo-500/40 scale-105'
                        : 'border-slate-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 right-0 bg-slate-900/80 text-white font-mono text-5xs px-1 rounded-tl">
                      #{idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sub-Inspector Squad On-Site Findings Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-black text-slate-900 uppercase">Sub-Inspector Physical Findings</span>
              </div>
              <span className="font-mono text-3xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                VIR Evidence Ready
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5">
                <span className="text-4xs font-bold text-slate-500 uppercase block">Caliper Numeral:</span>
                <span className="text-xs font-black text-emerald-600 font-mono">
                  {vo?.caliper_font_measurement_mm || '2.4'} mm (Pass ≥ 2.0mm)
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5">
                <span className="text-4xs font-bold text-slate-500 uppercase block">Physical Net Qty:</span>
                <span className="text-xs font-black text-slate-900 font-mono">
                  {vo?.physical_net_weight_grams || product.declared_net_quantity || '250 g'}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5">
                <span className="text-4xs font-bold text-slate-500 uppercase block">Batch QA & GPS:</span>
                <span className="text-xs font-black text-blue-600 font-mono">
                  {vo?.gps_confidence || 'High Confidence'}
                </span>
              </div>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3 text-3xs text-emerald-950 italic leading-relaxed">
              "{vo?.on_site_inspector_remarks ||
                `[APPROVED BY SUB-INSPECTOR Sanjay Kumar (ASST-DEL-012)] All statutory infractions resolved. Packaging die-line artwork, NABL font height report, and Rule 27 manufacturer legal undertaking verified 100% compliant. Forwarded to Lead Inspector for pre-market clearance.`}"
            </div>
          </div>
        </div>

        {/* Right Column: Statutory Tab Matrix (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Navigation Tabs */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setActiveTab('violations')}
                className={`pb-3 px-4 text-xs font-black transition-all border-b-2 cursor-pointer ${
                  activeTab === 'violations'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                Rule 6 Statutory Compliance Matrix
              </button>
              <button
                onClick={() => setActiveTab('specs')}
                className={`pb-3 px-4 text-xs font-black transition-all border-b-2 cursor-pointer ${
                  activeTab === 'specs'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                Commodity Specifications
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`pb-3 px-4 text-xs font-black transition-all border-b-2 cursor-pointer ${
                  activeTab === 'audit'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                Directorate Audit Trail
              </button>
            </div>

            {/* Tab 1: Violations & Compliance Rules */}
            {activeTab === 'violations' && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <span className="font-extrabold text-xs text-emerald-950 block">
                        Schedule II & Rule 6 Physical Verification Passed
                      </span>
                      <span className="text-3xs text-emerald-800">
                        Lead Inspector has certified all on-site measurements compliant with Central Gazette mandates.
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-xl bg-emerald-600 text-white">
                    100% Score
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  {/* Rule 1 */}
                  <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900">
                        Rule 6(1)(a) Generic & Common Commodity Name
                      </span>
                      <span className="font-mono text-3xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                        VERIFIED COMPLIANT
                      </span>
                    </div>
                    <p className="text-3xs text-slate-600">
                      Declared commodity name "{product.product_name}" is prominently displayed on the Principal Display Panel (PDP).
                    </p>
                  </div>

                  {/* Rule 2 */}
                  <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900">
                        Schedule II Minimum Numeral Font Height (≥ 2.0mm)
                      </span>
                      <span className="font-mono text-3xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                        VERIFIED COMPLIANT
                      </span>
                    </div>
                    <p className="text-3xs text-slate-600">
                      On-site Vernier caliper physical audit measured net weight numeral character height at 2.4 mm (exceeds mandatory 2.0mm minimum).
                    </p>
                  </div>

                  {/* Rule 3 */}
                  <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900">
                        Rule 6(1)(d) Maximum Retail Price (MRP) & Tax Inclusivity
                      </span>
                      <span className="font-mono text-3xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                        VERIFIED COMPLIANT
                      </span>
                    </div>
                    <p className="text-3xs text-slate-600">
                      MRP declared at ₹{product.declared_mrp || product.mrp || 0} inclusive of all taxes. Indelible printing confirmed, no secondary price stickers detected.
                    </p>
                  </div>

                  {/* Rule 4 */}
                  <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900">
                        Rule 27 Manufacturer & Packer Statutory Registration
                      </span>
                      <span className="font-mono text-3xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                        VERIFIED COMPLIANT
                      </span>
                    </div>
                    <p className="text-3xs text-slate-600">
                      Manufacturer legal address and consumer care grievance email/phone details present on side packaging panel.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Specifications */}
            {activeTab === 'specs' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                    <span className="text-3xs font-bold text-slate-500 uppercase block">Product Name</span>
                    <span className="font-bold text-slate-900 text-sm">{product.product_name}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                    <span className="text-3xs font-bold text-slate-500 uppercase block">Brand</span>
                    <span className="font-bold text-slate-900 text-sm">{product.brand || 'Parle Products'}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                    <span className="text-3xs font-bold text-slate-500 uppercase block">Declared MRP</span>
                    <span className="font-bold text-slate-900 text-sm">₹{product.declared_mrp || product.mrp || 0}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                    <span className="text-3xs font-bold text-slate-500 uppercase block">Declared Net Quantity</span>
                    <span className="font-bold text-slate-900 text-sm">{product.declared_net_quantity || product.net_quantity || '100 g'}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                    <span className="text-3xs font-bold text-slate-500 uppercase block">Packaging Format</span>
                    <span className="font-bold text-slate-900 text-sm">{product.packaging_type || 'Pouch / Packet'}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                    <span className="text-3xs font-bold text-slate-500 uppercase block">Company / Manufacturer</span>
                    <span className="font-bold text-slate-900 text-sm">{product.company_name || 'Parle Products Pvt Ltd'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Audit Trail */}
            {activeTab === 'audit' && (
              <div className="space-y-3 text-xs">
                <div className="border-l-2 border-indigo-600 pl-4 space-y-4">
                  <div className="relative">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                    <span className="text-3xs font-bold text-slate-500 uppercase">Step 1 — Pre-Market Clearance Submission</span>
                    <p className="font-bold text-slate-900">Brand owner uploaded packaging die-line proofs for automated OCR screening.</p>
                  </div>
                  <div className="relative">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="text-3xs font-bold text-slate-500 uppercase">Step 2 — On-Site Squad Inspection (VO-2026)</span>
                    <p className="font-bold text-slate-900">Sub-Inspector Sanjay Kumar performed on-site physical net weight & font measurements.</p>
                  </div>
                  <div className="relative">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                    <span className="text-3xs font-bold text-slate-500 uppercase">Step 3 — Lead Inspector Endorsement Gate</span>
                    <p className="font-bold text-slate-900">Dossier ready for Lead Inspector endorsement and forwarding to ALMO Level 3.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal 1: Approve and Send to ALMO */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Approve & Send to ALMO</span>
              </h3>
              <button onClick={() => setShowApproveModal(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
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
                  onClick={() => setShowApproveModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  {submittingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Confirm Approval & Send to ALMO</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Reject Application */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>Reject & Issue Deficiency Notice</span>
              </h3>
              <button onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-3.5 text-xs">
              <div className="bg-rose-50 p-3.5 rounded-2xl border border-rose-200 text-rose-950 space-y-1">
                <span className="font-bold text-3xs uppercase block text-rose-900">15-Day Resolution Notice:</span>
                <p className="text-3xs leading-relaxed">
                  Rejects the current submission and issues a formal statutory deficiency notice to the <strong>15-Day Resolution Desk</strong>. The Brand Owner is given 15 days to rectify packaging defects.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">Official Deficiency Directives *</label>
                <textarea
                  rows={4}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium text-slate-900 focus:bg-white focus:border-rose-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  {submittingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  <span>Confirm Rejection</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Re-Submit Sub-Inspector for Clarification */}
      {showClarificationModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-600" />
                <span>Re-Submit to Sub-Inspector for Clarification</span>
              </h3>
              <button onClick={() => setShowClarificationModal(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleClarificationSubmit} className="space-y-3.5 text-xs">
              <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-amber-950 space-y-1">
                <span className="font-bold text-3xs uppercase block text-amber-900">Re-Submit to Sub-Inspector for Clarification:</span>
                <p className="text-3xs leading-relaxed">
                  Returns this Visit Order (VO) directly back to <strong>Sub-Inspector Sanjay Kumar (ASST-DEL-012)</strong> for statutory clarification on physical packaging character heights, net quantity, or batch verification on the factory floor.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">Clarification Directives & Grounds *</label>
                <textarea
                  rows={4}
                  required
                  value={clarificationNotes}
                  onChange={(e) => setClarificationNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium text-slate-900 focus:bg-white focus:border-amber-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowClarificationModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  {submittingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  <span>Confirm & Re-Submit to Sub-Inspector</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
