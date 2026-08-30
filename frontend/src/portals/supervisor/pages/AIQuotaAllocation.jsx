import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  Calendar,
} from 'lucide-react';
import { supervisorAPI } from '../../../services/api';
import toast from 'react-hot-toast';

export default function AIQuotaAllocation() {
  const [selectedMonth, setSelectedMonth] = useState('2026-08');
  const [recommendationData, setRecommendationData] = useState(null);
  const [assignmentsToDispatch, setAssignmentsToDispatch] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    fetchRecommendations();
  }, [selectedMonth]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const res = await supervisorAPI.getAIRecommendations(selectedMonth);
      setRecommendationData(res.data);
      const drafts = res.data.recommendations.map((r) => ({
        inspector_id: r.inspector_id,
        inspector_name: r.inspector_name,
        title: `${r.industry_category.toUpperCase()} Compliance Enforcement (${r.jurisdiction_zone})`,
        industry_category: r.industry_category,
        target_company: 'Regional FMCG Brands',
        target_count: r.recommended_quota,
        month_year: selectedMonth,
        due_date: new Date(2026, 7, 31, 23, 59, 59).toISOString(),
        notes: r.reasoning,
        risk_level: r.risk_level,
      }));
      setAssignmentsToDispatch(drafts);
    } catch (err) {
      console.error('Failed to load AI recommendations', err);
      toast.error('Failed to load quota recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleQuotaChange = (index, newCount) => {
    const updated = [...assignmentsToDispatch];
    updated[index].target_count = parseInt(newCount, 10) || 0;
    setAssignmentsToDispatch(updated);
  };

  const handleBatchDispatch = async () => {
    try {
      setLoading(true);
      const res = await supervisorAPI.batchDispatchAssignments(assignmentsToDispatch);
      setShowConfirmModal(false);
      const count = res.data?.dispatched_count || assignmentsToDispatch.length;
      toast.success(`Successfully dispatched ${count} work assignments across regional inspector workspaces!`);
      await fetchRecommendations();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || 'Batch assignment dispatch failed. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-md text-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 text-indigo-300 font-bold text-lg mb-1">
              <BrainCircuit className="w-6 h-6 text-indigo-400" />
              <span>AI Risk-Weighted Work Allocation & Batch Dispatch Engine</span>
            </div>
            <p className="text-sm text-slate-200">
              Evaluates historical violation rates across industry sectors and auto-recommends targeted quotas for field inspectors.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/90 px-3.5 py-2 rounded-xl border border-indigo-400/40">
            <Calendar className="w-4 h-4 text-amber-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer"
            >
              <option value="2026-08" className="text-slate-900">August 2026</option>
              <option value="2026-09" className="text-slate-900">September 2026</option>
            </select>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      {recommendationData && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Active Field Officers</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {recommendationData.summary?.total_inspectors || 0} Officers
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Recommended Quota</div>
            <div className="text-2xl font-extrabold text-indigo-700 mt-1">
              {recommendationData.summary?.total_recommended_audits || 0} Audits
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">High-Risk Sectors</div>
            <div className="text-base font-extrabold text-amber-700 mt-1 capitalize">
              {recommendationData.summary?.high_risk_categories?.join(', ') || 'None'}
            </div>
          </div>
        </div>
      )}

      {/* Allocation Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-base">Proposed Monthly Work Orders for {selectedMonth}</h3>
          </div>

          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={loading || assignmentsToDispatch.length === 0}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/30 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Verify & Assign All / OK</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold font-mono text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-4">Inspector</th>
                <th className="px-5 py-4">Industry Sector</th>
                <th className="px-5 py-4">Jurisdiction</th>
                <th className="px-5 py-4 text-center">Risk Assessment</th>
                <th className="px-5 py-4 text-center">Target Quota</th>
                <th className="px-5 py-4">AI Statistical Reasoning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-sans">
              {assignmentsToDispatch.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-4 font-bold text-slate-900">{item.inspector_name}</td>
                  <td className="px-5 py-4 capitalize font-mono font-bold text-indigo-700">{item.industry_category}</td>
                  <td className="px-5 py-4 text-xs font-medium text-slate-700">
                    {recommendationData?.recommendations[idx]?.jurisdiction_zone}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-extrabold border uppercase inline-block shadow-xs ${
                        item.risk_level === 'HIGH'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : item.risk_level === 'MEDIUM'
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      {item.risk_level}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <input
                      type="number"
                      value={item.target_count}
                      onChange={(e) => handleQuotaChange(idx, e.target.value)}
                      className="w-20 bg-slate-50 border border-slate-300 text-slate-900 font-bold font-mono text-center rounded-lg px-2 py-1.5 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-5 py-4 text-xs font-normal text-slate-700 max-w-sm leading-relaxed">{item.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900">Confirm Work Allocation Dispatch</h3>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              You are about to batch-dispatch <strong>{assignmentsToDispatch.length} work orders</strong> across regional
              inspectors in a single atomic transaction. Field officers will immediately see updated quotas in their workspaces.
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchDispatch}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-600/30"
              >
                {loading ? 'Dispatching...' : 'Confirm & Dispatch All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
