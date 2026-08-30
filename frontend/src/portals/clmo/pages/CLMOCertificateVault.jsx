import React, { useState, useEffect } from 'react';
import {
  Award,
  Download,
  Search,
  CheckCircle2,
  FileText,
  Loader2,
  QrCode,
  ExternalLink,
} from 'lucide-react';
import { supervisorAPI, reportsAPI } from '../../../services/api';
import ProductDetailModal from '../../../components/ProductDetailModal';
import toast from 'react-hot-toast';

export default function CLMOCertificateVault() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const res = await supervisorAPI.getPreMarketQueue();
      const certified = (res.data || []).filter((a) => a.status === 'approved_certified');
      setCertificates(certified);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (appId, certNo, format) => {
    try {
      toast.loading(`Preparing ${format.toUpperCase()} certificate...`, { id: 'dl' });
      if (format === 'pdf') {
        await reportsAPI.downloadClearancePDF(appId, certNo);
      } else if (format === 'docx') {
        await reportsAPI.downloadClearanceDOCX(appId, certNo);
      } else if (format === 'excel') {
        await reportsAPI.downloadClearanceExcel(appId, certNo);
      }
      toast.success(`${format.toUpperCase()} downloaded successfully!`, { id: 'dl' });
    } catch (err) {
      console.error(err);
      toast.error(`Failed to download certificate ${format.toUpperCase()}`, { id: 'dl' });
    }
  };

  const filtered = certificates.filter((c) =>
    c.product_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.certificate_number && c.certificate_number.toLowerCase().includes(search.toLowerCase())) ||
    (c.company_name && c.company_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-md text-white">
        <div className="flex items-center gap-2.5 text-indigo-300 font-bold text-lg mb-1">
          <Award className="w-6 h-6 text-emerald-400" />
          <span>Statutory Packaging Clearance Certificate Vault</span>
        </div>
        <p className="text-sm text-slate-200">
          Official repository of signed LMPC clearance certificates with embedded QR cryptographic seals, exportable to high-resolution PDF, Word (DOCX), and Excel (XLSX).
        </p>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by certificate number (e.g. LMPC/PMC/2026/08/0091) or product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Certificates Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 font-medium">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
          <span>Loading certificate vault...</span>
        </div>
      ) : certificates.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 font-medium">
          No approved certificates found. Approve applications in the Adjudication Queue to generate certificates.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelectedProduct(c)}
              className="bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-md rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between text-slate-800 cursor-pointer group transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <span className="font-mono font-black text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-lg text-xs">
                    {c.certificate_number || `LMPC/PMC/2026/${String(c.id).padStart(4, '0')}`}
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-2xs font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                    ACTIVE SEAL
                  </span>
                </div>

                <div className="font-extrabold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">{c.product_name}</div>
                <div className="text-xs text-slate-500 font-medium">{c.company_name || c.brand}</div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-mono space-y-1">
                  <div>Declared MRP: <strong>₹{c.declared_mrp}</strong></div>
                  <div>Declared Net Qty: <strong>{c.declared_net_quantity}</strong></div>
                  <div>Clearance Method: <strong>{c.visit_order_no ? `On-Site (${c.visit_order_no})` : 'Digital Fast-Track'}</strong></div>
                </div>
              </div>

              {/* Downloads & QR Link */}
              <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <a
                  href={`/verify/${c.certificate_number || c.id}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Public QR Seal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleDownload(c.id, c.certificate_number, 'pdf')}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-2xs font-bold transition-all cursor-pointer"
                  >
                    PDF
                  </button>
                  <button
                    onClick={() => handleDownload(c.id, c.certificate_number, 'docx')}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-2xs font-bold transition-all cursor-pointer"
                  >
                    DOCX
                  </button>
                  <button
                    onClick={() => handleDownload(c.id, c.certificate_number, 'excel')}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-2xs font-bold transition-all cursor-pointer"
                  >
                    Excel
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Universal Product Details Modal with Photo & Violations */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
