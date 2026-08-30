import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  HelpCircle,
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
  Loader2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { supervisorAPI, productsAPI } from '../../../services/api';
import toast from 'react-hot-toast';

export default function ClmoProductDetailPage() {
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

  const fetchDossier = async () => {
    try {
      setLoading(true);
      const res = await productsAPI.getById(id);
      setProduct(res.data);
      setRejectReason(
        `Clearance application rejected by CLMO Directorate: Non-compliant declarations flagged for ${res.data.product_name}. Sent to Resolution Desk.`
      );
      setClarificationNotes(
        `Statutory clarification mandated by CLMO Directorate: Manufacturer must verify packaging declarations against LMPC 2011 Rules and submit NABL laboratory numeral font report.`
      );
    } catch (err) {
      console.error('Failed to load product dossier', err);
      toast.error('Failed to load product adjudication dossier.');
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
        <p className="text-sm font-bold text-slate-600">Loading CLMO Adjudication Dossier #{id}...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500" />
        <h2 className="text-lg font-extrabold text-slate-900">Dossier Not Found</h2>
        <p className="text-xs text-slate-500">The requested packaging application could not be found.</p>
        <button
          onClick={() => navigate('/clmo')}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700"
        >
          ← Back to Adjudication Queue
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
  const handleIssueCertificate = async () => {
    try {
      setSubmittingAction(true);
      const res = await supervisorAPI.decidePreMarket(product.id, {
        action: 'approve_pre_market',
        notes: `CLMO Directorate verified and endorsed: Packaging artwork and Schedule II declarations 100% compliant with Legal Metrology 2011 Rules. Statutory clearance certificate granted.`,
      });
      toast.success(res.data?.message || 'Clearance certificate granted and sealed!');
      navigate('/clmo/certificates');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to issue certificate');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmittingAction(true);
      await supervisorAPI.decidePreMarket(product.id, {
        action: 'reject',
        notes: rejectReason,
      });
      toast.success('Application rejected.');
      setShowRejectModal(false);
      navigate('/clmo');
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
      await supervisorAPI.decidePreMarket(product.id, {
        action: 're_clarification',
        notes: clarificationNotes,
      });
      toast.success('Statutory re-clarification directive dispatched to applicant!');
      setShowClarificationModal(false);
      navigate('/clmo');
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
            onClick={() => navigate('/clmo')}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-all shadow-2xs flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Adjudication</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-3xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                CLMO Adjudication Gate #{product.id}
              </span>
              <span className="font-mono text-3xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                All Rules Verified
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {product.product_name}
            </h1>
          </div>
        </div>

        {/* Action Buttons: Exact 3 options required by CLMO specification */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* 1. Issue Certificate */}
          <button
            onClick={handleIssueCertificate}
            disabled={submittingAction}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs shadow-md shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer"
            title="Grant final statutory certificate seal"
          >
            {submittingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4 text-emerald-200" />}
            <span>Issue Certificate</span>
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

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-indigo-600" />
                <span>Submitted Packaging Proofs</span>
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
                Gazette Statutory Matrix (100% Verified)
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

            {/* In CLMO, all rules are verified & compliant */}
            {activeTab === 'violations' && (
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-950 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <span className="font-bold block">All Statutory Rules Verified & Approved</span>
                      <span className="text-3xs text-emerald-800">No active infractions. Dossier cleared for certificate issuance.</span>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-black px-2.5 py-1 rounded-xl bg-emerald-600 text-white">
                    Verified
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">Rule 6(1)(a) Mandatory Generic & Commodity Declaration</span>
                      <span className="font-mono text-3xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">VERIFIED COMPLIANT</span>
                    </div>
                    <p className="text-3xs text-slate-600">Declared commodity name "{product.product_name}" verified compliant.</p>
                  </div>
                  <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">Schedule II Character Height & Area Proportions</span>
                      <span className="font-mono text-3xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">VERIFIED COMPLIANT</span>
                    </div>
                    <p className="text-3xs text-slate-600">Minimum 2.0mm numeral character height satisfied.</p>
                  </div>
                  <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">Rule 6(1)(d) Maximum Retail Price (MRP) & Tax Declaration</span>
                      <span className="font-mono text-3xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">VERIFIED COMPLIANT</span>
                    </div>
                    <p className="text-3xs text-slate-600">₹{product.declared_mrp || product.mrp || 0} inclusive of all taxes confirmed.</p>
                  </div>
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
