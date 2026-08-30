import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  CheckCircle2,
  AlertTriangle,
  Award,
  ShieldAlert,
  Loader2,
  Eye,
} from 'lucide-react';
import { commissionerAPI, productsAPI } from '../../../services/api';
import toast from 'react-hot-toast';

export default function CommissionerProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [revoking, setRevoking] = useState(false);

  const fetchDossier = async () => {
    try {
      setLoading(true);
      const res = await productsAPI.getById(id);
      setProduct(res.data);
      setRevokeReason(
        `Apex Directorate Sanction Revocation: Serious statutory breach under Rule 6 / Schedule II discovered post-issuance for ${res.data.product_name}.`
      );
    } catch (err) {
      console.error(err);
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
        <Loader2 className="w-10 h-10 animate-spin text-rose-600" />
        <p className="text-sm font-bold text-slate-600">Loading Apex Dossier #{id}...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500" />
        <h2 className="text-lg font-extrabold text-slate-900">Dossier Not Found</h2>
        <button
          onClick={() => navigate('/commissioner')}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
        >
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  const handleRevokeSubmit = async (e) => {
    e.preventDefault();
    try {
      setRevoking(true);
      await commissionerAPI.revokeCertificate(product.id, { reason: revokeReason });
      toast.success('Clearance certificate revoked by State Commissioner!');
      setShowRevokeModal(false);
      navigate('/commissioner/revocations');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to revoke certificate');
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/commissioner')}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
          <div>
            <span className="font-mono text-3xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
              State Commissioner Oversight #{product.id}
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {product.product_name}
            </h1>
          </div>
        </div>

        <button
          onClick={() => setShowRevokeModal(true)}
          className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/30 flex items-center gap-2 cursor-pointer"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Revoke Certificate</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">Packaging Evidence</span>
            <div className="relative rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center min-h-[340px]">
              <img src={product.image_url || '/uploads/artwork_sample.png'} alt={product.product_name} className="max-h-[360px] w-auto object-contain" />
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900">Statutory Dossier Summary</h3>
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
                <span className="text-3xs font-bold text-slate-500 uppercase block">Certificate Number</span>
                <span className="font-bold text-slate-900">{product.certificate_number || 'Under Review'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showRevokeModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 text-slate-800">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <span>Revoke Statutory Clearance Certificate</span>
            </h3>
            <form onSubmit={handleRevokeSubmit} className="space-y-3.5 text-xs">
              <textarea
                rows={4}
                required
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium"
              />
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button type="button" onClick={() => setShowRevokeModal(false)} className="px-4 py-2 bg-slate-100 rounded-xl font-bold">Cancel</button>
                <button type="submit" disabled={revoking} className="px-5 py-2 bg-rose-600 text-white rounded-xl font-bold">Confirm Revocation</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
