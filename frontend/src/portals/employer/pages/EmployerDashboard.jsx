import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  FileCheck,
  Sparkles,
  Package,
  AlertOctagon,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { employerAPI } from '../../../services/api';
import toast from 'react-hot-toast';

export default function EmployerDashboard() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [applications, setApplications] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployerData();
  }, []);

  const fetchEmployerData = async () => {
    try {
      setLoading(true);
      const [prodRes, appRes, notRes] = await Promise.all([
        employerAPI.getMyProducts(),
        employerAPI.getMyApplications(),
        employerAPI.getMyNotices(),
      ]);
      setProducts(prodRes.data);
      setApplications(appRes.data);
      setNotices(notRes.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load employer dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  const certifiedCount = applications.filter((a) => a.status === 'approved_certified').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-md text-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-300 font-bold text-lg mb-1">
              <Building2 className="w-6 h-6 text-emerald-400" />
              <span>Enterprise Packaging Compliance & Pre-Market Certification Vault</span>
            </div>
            <p className="text-sm text-slate-200">
              Verify digital packaging artwork before commercial printing, request official Legal Metrology Pre-Market Clearance Certificates, and track compliance health.
            </p>
          </div>

          <button
            onClick={() => navigate('/employer/workbench')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/30 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Test New Artwork</span>
          </button>
        </div>

        {/* 4 Brand Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-5 border-t border-indigo-500/30">
          <div
            onClick={() => navigate('/employer/workbench')}
            className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 text-slate-900 cursor-pointer hover:border-indigo-400 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Packaging Lines</span>
              <Package className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{products.length} Registered</div>
            <div className="text-xs text-indigo-700 font-semibold mt-1">Active in retail distribution &rarr;</div>
          </div>

          <div
            onClick={() => navigate('/employer/applications')}
            className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 text-slate-900 cursor-pointer hover:border-emerald-400 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Clearance Certificates</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">{certifiedCount} Granted</div>
            <div className="text-xs text-emerald-700 font-semibold mt-1">View official certificates &rarr;</div>
          </div>

          <div
            onClick={() => navigate('/employer/applications')}
            className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 text-slate-900 cursor-pointer hover:border-amber-400 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">In Review Queue</span>
              <FileCheck className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-extrabold text-amber-700 mt-1">
              {applications.filter((a) => a.status === 'pending_review').length} Applications
            </div>
            <div className="text-xs text-amber-800 font-semibold mt-1">Under Directorate scrutiny &rarr;</div>
          </div>

          <div
            onClick={() => navigate('/employer/notices')}
            className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 text-slate-900 cursor-pointer hover:border-rose-400 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Show-Cause Notices</span>
              <AlertOctagon className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-extrabold text-rose-700 mt-1">{notices.length} Active</div>
            <div className="text-xs text-rose-800 font-semibold mt-1">Upload rectification replies &rarr;</div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Commercial Lines & Pre-Market Clearance Applications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Products */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Package className="w-5 h-5 text-indigo-600" />
              <span>Active Commercial Packaging Lines</span>
            </div>
          </div>

          <div className="space-y-3">
            {products.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs italic">No commercial products registered yet.</div>
            ) : (
              products.map((p) => (
                <div
                  key={p.id}
                  className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{p.product_name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Batch: <strong className="font-mono text-slate-700">{p.batch_number}</strong> • Qty: {p.net_quantity}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-indigo-800 text-sm">₹{p.mrp}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Clearance Applications */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <FileCheck className="w-5 h-5 text-emerald-600" />
              <span>Pre-Market Clearance Applications</span>
            </div>
            <button
              onClick={() => navigate('/employer/applications')}
              className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {applications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs italic">No pre-market applications submitted yet.</div>
            ) : (
              applications.map((app) => (
                <div
                  key={app.id}
                  className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{app.product_name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Submitted: <span className="font-mono">{app.created_at}</span>
                    </div>
                  </div>
                  <div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold border uppercase ${
                        app.status === 'approved_certified'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}
                    >
                      {app.status === 'approved_certified' ? 'Certified' : 'In Review'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
