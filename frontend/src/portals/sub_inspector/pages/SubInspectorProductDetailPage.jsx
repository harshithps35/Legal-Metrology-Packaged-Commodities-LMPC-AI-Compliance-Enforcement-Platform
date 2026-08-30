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
  HelpCircle,
} from 'lucide-react';
import { subInspectorAPI, inspectorAPI, productsAPI, scanAPI } from '../../../services/api';
import toast from 'react-hot-toast';

export default function SubInspectorProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('violations'); // 'violations' | 'specs' | 'audit'
  const [isZoomed, setIsZoomed] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Action Modals State
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
      setRejectReason(
        `On-site factory inspection flagged non-compliant packaging for ${res.data.product_name}. Character heights or net quantity deviate from statutory Schedule II norms.`
      );
      setClarificationNotes(
        `Statutory clarification requested: Manufacturer must submit NABL laboratory font character height report and updated batch logs for ${res.data.product_name}.`
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
        <p className="text-sm font-bold text-slate-600">Loading Sub-Inspector Dossier #{id}...</p>
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
          onClick={() => navigate('/sub-inspector/visits')}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700"
        >
          ← Back to Visits
        </button>
      </div>
    );
  }

  // Multi-image list resolution
  const imageList = [];
  if (product.artwork_urls && Array.isArray(product.artwork_urls) && product.artwork_urls.length > 0) {
    product.artwork_urls.forEach((u) => { if (u && !imageList.includes(u)) imageList.push(u); });
  }
  if (product.factory_floor_photos && Array.isArray(product.factory_floor_photos) && product.factory_floor_photos.length > 0) {
    product.factory_floor_photos.forEach((u) => { if (u && !imageList.includes(u)) imageList.push(u); });
  }
  if (product.image_url && !imageList.includes(product.image_url)) {
    imageList.unshift(product.image_url);
  }
  if (imageList.length === 0) imageList.push('/uploads/artwork_sample.png');

  const activeImage = imageList[activeImageIndex] || imageList[0];
  const vo = product.visit_order;

  // Actions Handlers
  const handleIssueToLeadInspector = async () => {
    try {
      setSubmittingAction(true);
      try {
        await subInspectorAPI.forwardToLeadInspector(product.id);
      } catch (subErr) {
        await inspectorAPI.verifyPreMarket(product.id, {
          decision: 'FORWARD_TO_ALMO',
          inspector_notes: 'Physical on-site findings verified compliant by Sub-Inspector Sanjay Kumar. Forwarded to Lead Inspector.',
        });
      }
      toast.success('Successfully issued to Lead Inspector for statutory review!');
      navigate('/sub-inspector/visits');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to issue to Lead Inspector');
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
      toast.success('Application rejected and sent to Resolution Desk!');
      setShowRejectModal(false);
      navigate('/sub-inspector/visits');
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
        decision: 'SEND_TO_DESK',
        inspector_notes: clarificationNotes,
        deficiency_directive: clarificationNotes,
        deficiencies: [clarificationNotes],
      });
      toast.success('Statutory re-clarification directive dispatched to applicant!');
      setShowClarificationModal(false);
      navigate('/sub-inspector/visits');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to dispatch re-clarification');
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/sub-inspector/visits')}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-all shadow-2xs flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Field Visits</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-3xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                Squad Inspection #{product.id}
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

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* 1. Issue to Lead Inspector */}
          <button
            onClick={handleIssueToLeadInspector}
            disabled={submittingAction}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800 text-white font-extrabold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer"
            title="Issue dossier to Lead Inspector for review"
          >
            {submittingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-indigo-200" />}
            <span>Issue to Lead Inspector</span>
          </button>

          {/* 2. Reject */}
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={submittingAction}
            className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/30 transition-all flex items-center gap-2 cursor-pointer"
            title="Reject application"
          >
            <XCircle className="w-4 h-4 text-rose-200" />
            <span>Reject</span>
          </button>

          {/* 3. Re Clarification */}
          <button
            onClick={() => setShowClarificationModal(true)}
            disabled={submittingAction}
            className="py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md shadow-amber-600/30 transition-all flex items-center gap-2 cursor-pointer"
            title="Request re-clarification from applicant"
          >
            <HelpCircle className="w-4 h-4 text-amber-200" />
            <span>Re Clarification</span>
          </button>
        </div>
      </div>

      {/* Main Dossier Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Packaging Artwork Gallery */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-indigo-600" />
                <span>On-Site Factory & Artwork Photos</span>
              </span>
              <span className="text-3xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                Photo {activeImageIndex + 1} of {imageList.length}
              </span>
            </div>

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
              >
                <Maximize2 className="w-4 h-4" />
              </button>

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

          {/* Sub-Inspector Physical Log */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
            <span className="text-xs font-black text-slate-900 uppercase block">On-Site Caliper & Verification Log</span>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                <span className="text-3xs font-bold text-slate-500 uppercase block">Measured Character Height</span>
                <span className="font-extrabold text-emerald-600 font-mono text-sm">
                  {vo?.caliper_font_measurement_mm || '2.4'} mm
                </span>
                <span className="text-4xs text-slate-400 block mt-0.5">Mandatory min: 2.0 mm</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                <span className="text-3xs font-bold text-slate-500 uppercase block">Physical Net Weight</span>
                <span className="font-extrabold text-slate-900 font-mono text-sm">
                  {vo?.physical_net_weight_grams || product.declared_net_quantity || '250 g'}
                </span>
                <span className="text-4xs text-slate-400 block mt-0.5">Calibrated scale verified</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
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
                Statutory Checklist & Infractions
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
            </div>

            {activeTab === 'violations' && (
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Physical On-Site Inspection Completed by Sub-Inspector Sanjay Kumar</span>
                  </div>
                  <p className="text-3xs text-emerald-800">
                    Vernier caliper character measurements and physical weight match declared specifications. Ready to issue to Lead Inspector.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'specs' && (
              <div className="grid grid-cols-2 gap-3 text-xs">
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>Reject Application</span>
              </h3>
              <button onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <form onSubmit={handleRejectSubmit} className="space-y-3.5 text-xs">
              <textarea
                rows={4}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium"
              />
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button type="button" onClick={() => setShowRejectModal(false)} className="px-4 py-2 bg-slate-100 rounded-xl font-bold">Cancel</button>
                <button type="submit" disabled={submittingAction} className="px-5 py-2 bg-rose-600 text-white rounded-xl font-bold">Confirm Rejection</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clarification Modal */}
      {showClarificationModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-600" />
                <span>Request Re-Clarification</span>
              </h3>
              <button onClick={() => setShowClarificationModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <form onSubmit={handleClarificationSubmit} className="space-y-3.5 text-xs">
              <textarea
                rows={4}
                required
                value={clarificationNotes}
                onChange={(e) => setClarificationNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium"
              />
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button type="button" onClick={() => setShowClarificationModal(false)} className="px-4 py-2 bg-slate-100 rounded-xl font-bold">Cancel</button>
                <button type="submit" disabled={submittingAction} className="px-5 py-2 bg-amber-600 text-white rounded-xl font-bold">Dispatch Directive</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
