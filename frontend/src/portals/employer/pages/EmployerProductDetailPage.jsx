import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  CheckCircle2,
  AlertTriangle,
  Download,
  FileText,
  ShieldCheck,
  Building2,
  Calendar,
  Clock,
  Eye,
  Maximize2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { employerAPI, productsAPI } from '../../../services/api';
import toast from 'react-hot-toast';

export default function EmployerProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [downloading, setDownloading] = useState(false);

  const fetchDossier = async () => {
    try {
      setLoading(true);
      const res = await productsAPI.getById(id);
      setProduct(res.data);
    } catch (err) {
      console.error('Failed to load application dossier', err);
      toast.error('Failed to load application dossier.');
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
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <p className="text-sm font-bold text-slate-600">Loading Packaging Application #{id}...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500" />
        <h2 className="text-lg font-extrabold text-slate-900">Application Not Found</h2>
        <button
          onClick={() => navigate('/employer/applications')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700"
        >
          ← Back to Applications
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
  const isCertified = product.status === 'approved_certified' || product.status === 'APPROVED_CERTIFIED';

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);
      await employerAPI.downloadClearancePDF(product.id, product.certificate_number);
      toast.success('Clearance certificate PDF downloaded!');
    } catch (err) {
      console.error(err);
      toast.error('Certificate PDF download failed.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/employer/applications')}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-all shadow-2xs flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Applications</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-3xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                Application #{product.id}
              </span>
              <span className={`font-mono text-3xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                isCertified ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {product.status}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {product.product_name}
            </h1>
          </div>
        </div>

        {/* Certificate Download Actions */}
        {isCertified && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition-all"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>Download Official Certificate (PDF)</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-indigo-600" />
                <span>Uploaded Pre-Press Packaging Artwork</span>
              </span>
              <span className="text-3xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                Photo {activeImageIndex + 1} of {imageList.length}
              </span>
            </div>
            <div className="relative rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center min-h-[340px]">
              <img src={activeImage} alt={product.product_name} className="max-h-[360px] w-auto object-contain" />
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
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900">Application Specifications & Status</h3>
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
                <span className="text-3xs font-bold text-slate-500 uppercase block">Declared Net Quantity</span>
                <span className="font-bold text-slate-900">{product.declared_net_quantity || product.net_quantity || '100 g'}</span>
              </div>
            </div>

            {isCertified && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold block text-xs">Statutory Clearance Granted</span>
                  <span className="text-3xs text-emerald-800">
                    Certificate #{product.certificate_number || 'LMPC-2026-CERT'} issued under Legal Metrology Rules 2011.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
