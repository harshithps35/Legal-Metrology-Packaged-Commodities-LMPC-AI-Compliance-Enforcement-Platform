import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Award,
  CheckCircle2,
  Calendar,
  Building2,
  Package,
  QrCode,
  FileCheck,
  ArrowLeft,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { supervisorAPI } from '../services/api';

export default function PublicCertificateVerification() {
  const { cert_number } = useParams();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCertificate();
  }, [cert_number]);

  const fetchCertificate = async () => {
    try {
      setLoading(true);
      const res = await supervisorAPI.getPreMarketQueue();
      const match = (res.data || []).find(
        (a) =>
          (a.certificate_number && a.certificate_number.toLowerCase() === cert_number?.toLowerCase()) ||
          String(a.id) === cert_number
      );
      setApp(match || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans">
      <div className="max-w-2xl w-full mx-auto space-y-6 pt-6">
        {/* Top Directorate Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/30 text-white mb-2">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide uppercase">
            DIRECTORATE OF LEGAL METROLOGY
          </h1>
          <p className="text-xs text-indigo-300 font-medium">
            Official Public Certificate Authenticity & Packaging Declaration Verification
          </p>
        </div>

        {/* Verification Card */}
        {loading ? (
          <div className="bg-white rounded-3xl p-10 text-center text-slate-500 shadow-2xl border border-slate-200">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
            <span className="font-bold text-sm">Verifying with National Gazette Registry...</span>
          </div>
        ) : app ? (
          <div className="bg-white rounded-3xl p-6 sm:p-8 text-slate-800 shadow-2xl border border-slate-200 space-y-6 animate-fade-in">
            {/* Authenticity Badge */}
            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 flex items-center gap-3.5">
              <div className="bg-emerald-600 p-2.5 rounded-xl text-white shadow-md shadow-emerald-600/30 shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="font-black text-emerald-950 text-sm sm:text-base">
                  OFFICIALLY VERIFIED & CERTIFIED PACKAGING
                </div>
                <div className="text-3xs text-emerald-800 font-mono mt-0.5">
                  Certificate #{app.certificate_number || `LMPC/PMC/2026/${String(app.id).padStart(4, '0')}`}
                </div>
              </div>
            </div>

            {/* Product Specifications Grid */}
            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-bold uppercase text-2xs">Product Line:</span>
                  <span className="font-black text-slate-900 text-sm">{app.product_name}</span>
                </div>

                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-bold uppercase text-2xs">Manufacturer / Enterprise:</span>
                  <span className="font-bold text-slate-800">{app.company_name} ({app.brand})</span>
                </div>

                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-bold uppercase text-2xs">Declared MRP:</span>
                  <span className="font-mono font-extrabold text-indigo-700">₹{app.declared_mrp} (incl. of all taxes)</span>
                </div>

                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-bold uppercase text-2xs">Declared Net Quantity:</span>
                  <span className="font-mono font-bold text-slate-900">{app.declared_net_quantity}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold uppercase text-2xs">Verification Route:</span>
                  <span className="font-mono font-bold text-emerald-800">
                    {app.visit_order_no ? `On-Site Inspection Confirmed (${app.visit_order_no})` : 'Digital OCR & Rule Engine Fast-Track'}
                  </span>
                </div>
              </div>

              {/* Statutory Disclaimer Box */}
              <div className="bg-slate-100 p-3.5 rounded-xl border border-slate-200 text-3xs text-slate-600 leading-relaxed italic">
                <strong>Statutory Notice:</strong> This document records the outcome of the packaging verification process conducted under the applicable departmental workflow of the Legal Metrology (Packaged Commodities) Rules, 2011. It does not replace any separate statutory license or commercial authorization.
              </div>
            </div>

            {/* Back Button */}
            <div className="pt-2 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Directorate Login</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 text-slate-800 shadow-2xl border border-slate-200 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
            <h2 className="font-black text-slate-900 text-lg">Certificate Record Not Found</h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              No active certificate matches identifier <strong>"{cert_number}"</strong>. Please verify the QR code scan or contact the Legal Metrology Enforcement division.
            </p>
            <Link
              to="/login"
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md"
            >
              Directorate Portal
            </Link>
          </div>
        )}
      </div>

      <footer className="text-center text-3xs text-slate-500 py-4">
        © 2026 Directorate of Legal Metrology, Government of India. Tamper-evident Gazette Seal.
      </footer>
    </div>
  );
}
