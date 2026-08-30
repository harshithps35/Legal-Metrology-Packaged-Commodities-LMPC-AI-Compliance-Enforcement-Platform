import React, { useState, useEffect } from 'react';
import {
  Award,
  AlertOctagon,
  Search,
  CheckCircle2,
  Loader2,
  FileCheck,
  ShieldAlert,
} from 'lucide-react';
import { supervisorAPI, commissionerAPI } from '../../../services/api';
import ProductDetailModal from '../../../components/ProductDetailModal';
import { Eye } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CertificateRevocationVault() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [revocationReason, setRevocationReason] = useState('');
  const [revocationRef, setRevocationRef] = useState('Commissioner Order Sec 36');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchCertifiedApplications();
  }, []);

  const fetchCertifiedApplications = async () => {
    try {
      setLoading(true);
      const res = await supervisorAPI.getPreMarketQueue();
      // Filter for certified or all
      setApplications(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedApp) return;
    if (revocationReason.length < 15) {
      toast.error('Mandatory justification must be at least 15 characters long.');
      return;
    }
    try {
      setProcessing(true);
      const res = await commissionerAPI.revokeCertificate(selectedApp.id, {
        reason: revocationReason,
        authority_reference: revocationRef,
      });
      toast.success(res.data.message || 'Certificate successfully revoked with logged audit event.');
      setSelectedApp(null);
      setRevocationReason('');
      fetchCertifiedApplications();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to revoke certificate');
    } finally {
      setProcessing(false);
    }
  };

  const filtered = applications.filter((a) =>
    a.product_name.toLowerCase().includes(search.toLowerCase()) ||
    (a.certificate_number && a.certificate_number.toLowerCase().includes(search.toLowerCase())) ||
    a.company_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-md text-white">
        <div className="flex items-center gap-2.5 text-indigo-300 font-bold text-lg mb-1">
          <Award className="w-6 h-6 text-emerald-400" />
          <span>State Certificate Vault & Exceptional Revocation Gate</span>
        </div>
        <p className="text-sm text-slate-200">
          Commissioner-level authority to inspect all issued Packaging Clearance Certificates and execute logged statutory revocations under Section 36 of Legal Metrology Act, 2009.
        </p>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by product, company, or certificate number (e.g. LMPC/PMC/2026/08/0091)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 font-medium">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
          <span>Loading state certificate records...</span>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 bg-slate-50 font-bold text-slate-900 text-sm">
            Statewide Issued Packaging Certificates ({filtered.length})
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold font-mono text-xs uppercase border-b border-slate-200">
                <tr>
                  <th className="px-5 py-4">App ID</th>
                  <th className="px-5 py-4">Product & Manufacturer</th>
                  <th className="px-5 py-4">Certificate Number</th>
                  <th className="px-5 py-4 text-center">Status</th>
                  <th className="px-5 py-4 text-center">Commissioner Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((app) => {
                  const isCertified = app.status === 'approved_certified';

                  return (
                    <tr
                      key={app.id}
                      onClick={() => setSelectedProductDetails(app)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors group"
                    >
                      <td className="px-5 py-4 font-mono font-bold text-indigo-700">
                        PMC-{String(app.id).padStart(4, '0')}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{app.product_name}</div>
                        <div className="text-xs text-slate-500">{app.company_name} ({app.category})</div>
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-slate-900 text-xs">
                        {app.certificate_number || 'Pending Final CLMO Seal'}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span
                          className={`text-2xs px-2.5 py-1 rounded-full font-bold border uppercase ${
                            isCertified
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : app.status === 'rejected_revise'
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : 'bg-blue-100 text-blue-900 border-blue-300'
                          }`}
                        >
                          {isCertified ? 'Active Certified' : app.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProductDetails(app);
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>Inspect</span>
                          </button>

                          {isCertified && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedApp(app);
                                setRevocationReason('');
                              }}
                              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                              <AlertOctagon className="w-3.5 h-3.5" />
                              <span>Revoke</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Universal Product Details Modal with Photo & Violations */}
      {selectedProductDetails && (
        <ProductDetailModal
          product={selectedProductDetails}
          onClose={() => setSelectedProductDetails(null)}
        />
      )}

      {/* Revocation Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-rose-600" />
                <span>Statutory Certificate Revocation: {selectedApp.product_name}</span>
              </h3>
              <button onClick={() => setSelectedApp(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleRevokeSubmit} className="space-y-3.5 text-xs text-slate-800">
              <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-200 space-y-1">
                <div className="text-rose-900 font-bold uppercase text-2xs">State Commissioner Revocation Notice:</div>
                <p className="text-3xs text-rose-950 leading-relaxed">
                  Executing this action immediately invalidates Certificate <strong>{selectedApp.certificate_number}</strong> across all retail QR verification databases and logs an immutable audit event under Section 36.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-800 uppercase text-2xs mb-1">
                  Authority Reference Order *
                </label>
                <input
                  type="text"
                  required
                  value={revocationRef}
                  onChange={(e) => setRevocationRef(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 uppercase text-2xs mb-1">
                  Statutory Grounds for Revocation (Min 15 chars) *
                </label>
                <textarea
                  rows={3}
                  required
                  value={revocationReason}
                  onChange={(e) => setRevocationReason(e.target.value)}
                  placeholder="State the statutory grounds (e.g. Subsequent discovery of price overprint tampering or falsified license)..."
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <AlertOctagon className="w-4 h-4" />
                  <span>{processing ? 'Revoking...' : 'Execute Statutory Revocation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
