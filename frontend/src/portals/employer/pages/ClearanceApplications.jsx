import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck,
  ShieldCheck,
  Download,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Package,
  FileText,
  FileSpreadsheet,
  Loader2,
  UserCheck,
  Award,
  RotateCcw,
  Eye,
} from 'lucide-react';
import { employerAPI, reportsAPI } from '../../../services/api';
import ProductDetailModal, { getProductImageUrl } from '../../../components/ProductDetailModal';
import toast from 'react-hot-toast';

export default function ClearanceApplications() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await employerAPI.getMyApplications();
      setApplications(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load clearance applications');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (appId, certNo, format) => {
    const key = `${appId}-${format}`;
    try {
      setDownloadingId(key);
      if (format === 'pdf') {
        await reportsAPI.downloadClearancePDF(appId, certNo);
        toast.success('Official PDF Clearance Certificate downloaded!');
      } else if (format === 'docx') {
        await reportsAPI.downloadClearanceDOCX(appId, certNo);
        toast.success('Word (.docx) Certificate downloaded!');
      } else if (format === 'excel') {
        await reportsAPI.downloadClearanceExcel(appId, certNo);
        toast.success('Excel (.xlsx) Clearance Record downloaded!');
      }
    } catch (err) {
      console.error(err);
      toast.error(`Failed to download ${format.toUpperCase()} certificate`);
    } finally {
      setDownloadingId(null);
    }
  };

  const filtered = applications.filter((a) =>
    a.product_name.toLowerCase().includes(search.toLowerCase()) ||
    (a.certificate_number && a.certificate_number.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-md text-white">
        <div className="flex items-center gap-2.5 text-indigo-300 font-bold text-lg mb-1">
          <FileCheck className="w-6 h-6 text-emerald-400" />
          <span>Pre-Market Packaging Clearance Certificates & Applications Vault</span>
        </div>
        <p className="text-sm text-slate-200">
          Official repository of submitted packaging designs, 2-tier regulatory review records (Field Inspector Verification → Directorate Supervisor Signature), and official clearance certificates.
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search product line or certificate number (e.g. LMPC/PMC/2026/08/0091)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium text-sm rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 font-medium bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
          <span>Loading clearance applications...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-slate-500 font-medium bg-white rounded-2xl border border-slate-200">
          No clearance applications matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((app) => {
            const isApproved = app.status === 'approved_certified';
            const isInspectorApproved = app.status === 'pending_supervisor' || isApproved;
            const isPendingInspector = app.status === 'pending_inspector' || app.status === 'pending_review';

            return (
              <div
                key={app.id}
                onClick={() => setSelectedProduct(app)}
                className="bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-md rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between cursor-pointer group transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl bg-slate-900 overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center relative shadow-inner">
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
                          <span className="font-extrabold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">{app.product_name}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Brand: <strong className="text-slate-800">{app.brand}</strong> • {app.packaging_type}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-xs px-3 py-1 rounded-full font-bold border uppercase shrink-0 ${
                        isApproved
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : app.status === 'pending_supervisor'
                          ? 'bg-blue-100 text-blue-900 border-blue-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}
                    >
                      {isApproved
                        ? 'Approved & Certified'
                        : app.status === 'pending_clmo_approval' || app.status === 'pending_supervisor'
                        ? 'ALMO / Inspector Verified • At CLMO'
                        : app.status === 'pending_almo_sanction'
                        ? 'Pending ALMO Sanction'
                        : app.status === 'visit_sanctioned'
                        ? 'Field Visit Sanctioned'
                        : app.status === 'field_visit_completed'
                        ? 'Field Audit Completed'
                        : 'Awaiting Inspector Review'}
                    </span>
                  </div>

                  {/* Statutory Multi-Tier Clearance Stepper */}
                  {(() => {
                    const isLmiCompleted = Boolean(
                      app.inspector_verified_at ||
                      [
                        'pending_supervisor',
                        'pending_clmo_approval',
                        'approved_certified',
                        'pending_almo_sanction',
                        'visit_sanctioned',
                        'field_visit_completed',
                        'field_visit_waived',
                        'rejected_revise',
                      ].includes(app.status)
                    );
                    const isLmiInProgress =
                      !isLmiCompleted &&
                      (app.status === 'pending_inspector' ||
                        app.status === 'pending_review' ||
                        Boolean(app.assigned_inspector_name));

                    const isAlmoCompleted = Boolean(
                      isApproved ||
                      [
                        'pending_clmo_approval',
                        'approved_certified',
                        'field_visit_completed',
                        'field_visit_waived',
                      ].includes(app.status)
                    );
                    const isAlmoInProgress =
                      !isAlmoCompleted &&
                      [
                        'pending_almo_sanction',
                        'visit_sanctioned',
                        'pending_supervisor',
                      ].includes(app.status);

                    return (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2">
                        <div className="text-2xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
                          <span>Statutory Clearance Lifecycle:</span>
                          {app.visit_order_no && (
                            <span className="text-3xs font-mono font-bold bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded">
                              {app.visit_order_no}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-4 gap-1.5 text-center text-3xs font-bold">
                          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-1.5 rounded-lg">
                            <CheckCircle2 className="w-3.5 h-3.5 mx-auto mb-0.5 text-emerald-600" />
                            <span>1. Applied</span>
                          </div>

                          <div
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isLmiCompleted
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                : isLmiInProgress
                                ? 'bg-amber-50 border-amber-300 text-amber-900'
                                : 'bg-slate-100 border-slate-200 text-slate-500'
                            }`}
                          >
                            {isLmiCompleted ? (
                              <CheckCircle2 className="w-3.5 h-3.5 mx-auto mb-0.5 text-emerald-600" />
                            ) : isLmiInProgress ? (
                              <Clock className="w-3.5 h-3.5 mx-auto mb-0.5 text-amber-600" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5 mx-auto mb-0.5 text-slate-400" />
                            )}
                            <span>2. LMI Audit</span>
                          </div>

                          <div
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isAlmoCompleted
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                : isAlmoInProgress
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-900'
                                : 'bg-slate-100 border-slate-200 text-slate-500'
                            }`}
                          >
                            {isAlmoCompleted ? (
                              <ShieldCheck className="w-3.5 h-3.5 mx-auto mb-0.5 text-emerald-600" />
                            ) : (
                              <ShieldCheck className="w-3.5 h-3.5 mx-auto mb-0.5 text-slate-400" />
                            )}
                            <span>3. ALMO Gate</span>
                          </div>

                          <div
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isApproved
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                : app.status === 'rejected_revise'
                                ? 'bg-rose-50 border-rose-300 text-rose-800'
                                : 'bg-slate-100 border-slate-200 text-slate-500'
                            }`}
                          >
                            <Award className={`w-3.5 h-3.5 mx-auto mb-0.5 ${isApproved ? 'text-emerald-600' : 'text-slate-400'}`} />
                            <span>4. Certified</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-2xs text-slate-600 pt-1">
                          <span>
                            Assigned LMI:{' '}
                            <strong>
                              {app.assigned_inspector_name || 'Desk Queue'}
                            </strong>
                            {!isLmiCompleted && (
                              <span className="text-amber-700 font-medium ml-1.5 text-3xs bg-amber-100/80 px-1.5 py-0.5 rounded border border-amber-200">
                                (In Review)
                              </span>
                            )}
                          </span>
                          {app.certificate_number && (
                            <span className="font-mono font-bold text-emerald-700">
                              {app.certificate_number}
                            </span>
                          )}
                        </div>

                        {app.supervisor_notes && (
                          <div className="pt-1 text-2xs text-slate-600 italic">
                            CLMO Seal Remarks: "{app.supervisor_notes}"
                          </div>
                        )}
                      </div>
                    );
                  })()}

                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/employer/products/${app.id}`);
                    }}
                    className="text-xs text-indigo-700 hover:text-indigo-900 font-extrabold flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect Full Details & Violations &rarr;</span>
                  </button>
                </div>

                {app.status === 'rejected_revise' && (
                  <div className="mt-3 pt-3 border-t border-rose-200 bg-rose-50/60 p-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5" onClick={(e) => e.stopPropagation()}>
                    <div className="text-2xs text-rose-900 font-bold">
                      Returned for Statutory Revision by Directorate.
                    </div>
                    <button
                      onClick={() => navigate('/employer/notices')}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reapply & Resubmit on Desk &rarr;</span>
                    </button>
                  </div>
                )}

                {isApproved && (
                  <div className="pt-3 border-t border-slate-200 space-y-2" onClick={(e) => e.stopPropagation()}>
                    <div className="text-2xs font-bold uppercase tracking-wider text-slate-600">
                      Download Official Regulatory Certificate:
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleDownload(app.id, app.certificate_number, 'pdf')}
                        disabled={downloadingId === `${app.id}-pdf`}
                        className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold py-2.5 px-2 rounded-xl transition-all shadow-xs cursor-pointer"
                      >
                        {downloadingId === `${app.id}-pdf` ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        <span>PDF</span>
                      </button>

                      <button
                        onClick={() => handleDownload(app.id, app.certificate_number, 'docx')}
                        disabled={downloadingId === `${app.id}-docx`}
                        className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold py-2.5 px-2 rounded-xl transition-all shadow-xs cursor-pointer"
                      >
                        {downloadingId === `${app.id}-docx` ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileText className="w-3.5 h-3.5" />
                        )}
                        <span>Word DOCX</span>
                      </button>

                      <button
                        onClick={() => handleDownload(app.id, app.certificate_number, 'excel')}
                        disabled={downloadingId === `${app.id}-excel`}
                        className="flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold py-2.5 px-2 rounded-xl transition-all shadow-xs cursor-pointer"
                      >
                        {downloadingId === `${app.id}-excel` ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        )}
                        <span>Excel</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
