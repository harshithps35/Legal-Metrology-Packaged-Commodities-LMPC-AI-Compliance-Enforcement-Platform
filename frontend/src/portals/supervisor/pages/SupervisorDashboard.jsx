import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Building2,
  BrainCircuit,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  MapPin,
} from 'lucide-react';
import { supervisorAPI } from '../../../services/api';
import toast from 'react-hot-toast';

export default function SupervisorDashboard() {
  const navigate = useNavigate();
  const [inspectors, setInspectors] = useState([]);
  const [employers, setEmployers] = useState([]);
  const [pendingSanctions, setPendingSanctions] = useState([]);
  const [preMarketQueue, setPreMarketQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [almoSanctionsCount, setAlmoSanctionsCount] = useState(0);
  const [almoReportsCount, setAlmoReportsCount] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [inspRes, empRes, sancRes, pmRes, almoSancRes, almoRepRes] = await Promise.all([
        supervisorAPI.getInspectors('2026-08'),
        supervisorAPI.getEmployers(),
        supervisorAPI.getPendingSanctions(),
        supervisorAPI.getPreMarketQueue(),
        supervisorAPI.getAlmoPendingSanctions(),
        supervisorAPI.getAlmoPendingReports(),
      ]);
      setInspectors(inspRes.data || []);
      setEmployers(empRes.data || []);
      setPendingSanctions(sancRes.data || []);
      setPreMarketQueue(pmRes.data || []);
      setAlmoSanctionsCount(almoSancRes.data?.length || 0);
      setAlmoReportsCount(almoRepRes.data?.length || 0);
    } catch (err) {
      console.error('Failed to load supervisor dashboard data', err);
      toast.error('Failed to load executive metrics');
    } finally {
      setLoading(false);
    }
  };

  const totalTargetAudits = inspectors.reduce((acc, i) => acc + i.monthly_target, 0);
  const totalCompletedAudits = inspectors.reduce((acc, i) => acc + i.completed_audits, 0);
  const quotaPercent = totalTargetAudits > 0 ? Math.round((totalCompletedAudits / totalTargetAudits) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-md text-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-300 font-bold text-lg mb-1">
              <ShieldAlert className="w-6 h-6 text-indigo-400" />
              <span>National Directorate Executive Overview — August 2026</span>
            </div>
            <p className="text-sm text-slate-200">
              Statutory governance oversight: <strong>CLMO (Level 2)</strong> packaging clearances & legal sanctions; <strong>ALMO (Level 3)</strong> Field Visit Orders & VIR attestations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/supervisor/quotas')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/30 flex items-center gap-2 cursor-pointer"
            >
              <BrainCircuit className="w-4 h-4" />
              <span>AI Quota Dispatch</span>
            </button>
            <button
              onClick={() => navigate('/supervisor/sanctions')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/30 flex items-center gap-2 cursor-pointer"
            >
              <FileCheck className="w-4 h-4" />
              <span>Statutory Gates</span>
            </button>
          </div>
        </div>

        {/* 4 Core Governance KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-5 border-t border-indigo-500/30">
          <div
            onClick={() => navigate('/supervisor/inspectors')}
            className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 text-slate-900 cursor-pointer hover:border-indigo-400 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Field Officers</span>
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{inspectors.length} Active</div>
            <div className="text-xs text-indigo-700 font-semibold mt-1">View Inspector Directory &rarr;</div>
          </div>

          <div
            onClick={() => navigate('/supervisor/sanctions')}
            className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 text-slate-900 cursor-pointer hover:border-indigo-400 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">ALMO Visit Queue</span>
              <FileCheck className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-extrabold text-indigo-900 mt-1">{almoSanctionsCount} Pending VO</div>
            <div className="text-xs text-indigo-700 font-semibold mt-1">{almoReportsCount} Reports Pending VIR &rarr;</div>
          </div>

          <div
            onClick={() => navigate('/supervisor/sanctions')}
            className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 text-slate-900 cursor-pointer hover:border-emerald-400 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">CLMO Clearances</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">{preMarketQueue.length} In Pipeline</div>
            <div className="text-xs text-emerald-700 font-semibold mt-1">Grant Digital & Post-Visit Seals &rarr;</div>
          </div>

          <div
            onClick={() => navigate('/supervisor/sanctions')}
            className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 text-slate-900 cursor-pointer hover:border-amber-400 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Show-Cause Queue</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-extrabold text-amber-700 mt-1">{pendingSanctions.length} Infractions</div>
            <div className="text-xs text-amber-800 font-semibold mt-1">Requires Executive Signature &rarr;</div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Quick Inspector Progress & Quick Employer Applications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Live Inspector Enforcement Status */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Users className="w-5 h-5 text-indigo-600" />
              <span>Inspector Enforcement Progress</span>
            </div>
            <button
              onClick={() => navigate('/supervisor/inspectors')}
              className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {inspectors.map((insp) => (
              <div
                key={insp.id}
                className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-slate-900 text-sm">{insp.full_name}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 font-mono mt-0.5">
                    <span className="text-indigo-700 font-bold">{insp.unique_login_id}</span>
                    <span>•</span>
                    <span>{insp.jurisdiction_zone}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono font-extrabold text-slate-900">
                    {insp.completed_audits} / {insp.monthly_target} Audits
                  </div>
                  <div className="w-24 bg-slate-200 h-2 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full"
                      style={{ width: `${insp.completion_percent}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Card: Registered Employers & Active Packaging Lines */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <span>Registered Enterprise Brands & Packaging Lines</span>
            </div>
            <button
              onClick={() => navigate('/supervisor/employers')}
              className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {employers.map((emp) => (
              <div
                key={emp.id}
                className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-slate-900 text-sm">{emp.company_name}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 font-mono mt-0.5">
                    <span className="text-emerald-700 font-bold">{emp.unique_login_id}</span>
                    <span>•</span>
                    <span className="capitalize">{emp.assigned_category} Category</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold px-2.5 py-1 rounded-md">
                    {emp.active_products_count} Active Lines
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
