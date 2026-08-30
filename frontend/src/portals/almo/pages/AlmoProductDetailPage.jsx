import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
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

export default function AlmoProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('violations');
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
        `ALMO Level 3 Sanctions Rejection: Non-compliant declarations flagged for ${res.data.product_name}.`
      );
      setClarificationNotes(
        `ALMO Statutory Clarification: Manufacturer must clarify packaging character heights or net weight deviations.`
      );
    } catch (err) {
      console.error('Failed to load product dossier', err);
      toast.error('Failed to load product dossier.');
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
        <p className="text-sm font-bold text-slate-600">Loading ALMO Sanctions Dossier #{id}...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500" />
        <h2 className="text-lg font-extrabold text-slate-900">Dossier Not Found</h2>
        <button
          onClick={() => navigate('/almo/reports')}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700"
        >
          ← Back to Reports
        </button>
      </div>
    );
  }

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

  const handleSanctionAndForward = async () => {
    try {
      setSubmittingAction(true);
      await supervisorAPI.decidePreMarket(product.id, {
        action: 'approve_pre_market',
        notes: `ALMO Level 3 Sanctions Authority endorsed on-site physical report for ${product.product_name}. Forwarded to CLMO for final certification.`,
      });
      toast.success('Sanction endorsed and forwarded to CLMO!');
      navigate('/almo/reports');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to endorse sanction');
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
      navigate('/almo/reports');
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
      toast.success('Clarification directive dispatched!');
      setShowClarificationModal(false);
      navigate('/almo/reports');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to dispatch clarification');
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
            onClick={() => navigate('/almo/reports')}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-all shadow-2xs flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Reports</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-3xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                ALMO Sanctions #{product.id}
              </span>
              <span className="font-mono text-3xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                Level 3 Sanction
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {product.product_name}
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={handleSanctionAndForward}
            disabled={submittingAction}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs shadow-md shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer"
          >
            {submittingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-emerald-200" />}
            <span>Sanction & Forward to CLMO</span>
          </button>

          <button
            onClick={() => setShowRejectModal(true)}
            disabled={submittingAction}
            className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/30 transition-all flex items-center gap-2 cursor-pointer"
          >
            <XCircle className="w-4 h-4 text-rose-200" />
            <span>Reject</span>
          </button>

          <button
            onClick={() => setShowClarificationModal(true)}
            disabled={submittingAction}
            className="py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md shadow-amber-600/30 transition-all flex items-center gap-2 cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-amber-200" />
            <span>Re Clarification</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-indigo-600" />
              <span>Packaging Artwork</span>
            </span>
            <div className="relative rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center min-h-[340px]">
              <img src={activeImage} alt={product.product_name} className="max-h-[360px] w-auto object-contain" />
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900">Commodity Specifications & Sanctions Summary</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                <span className="text-3xs font-bold text-slate-500 uppercase block">Product Name</span>
                <span className="font-bold text-slate-900">{product.product_name}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                <span className="text-3xs font-bold text-slate-500 uppercase block">Brand</span>
                <span className="font-bold text-slate-900">{product.brand || 'Parle Products'}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                <span className="text-3xs font-bold text-slate-500 uppercase block">Declared MRP</span>
                <span className="font-bold text-slate-900">₹{product.declared_mrp || product.mrp || 0}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                <span className="text-3xs font-bold text-slate-500 uppercase block">Net Quantity</span>
                <span className="font-bold text-slate-900">{product.declared_net_quantity || product.net_quantity || '100 g'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 text-slate-800">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600" />
              <span>Reject Application</span>
            </h3>
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
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 text-slate-800">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-amber-600" />
              <span>Request Re-Clarification</span>
            </h3>
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
