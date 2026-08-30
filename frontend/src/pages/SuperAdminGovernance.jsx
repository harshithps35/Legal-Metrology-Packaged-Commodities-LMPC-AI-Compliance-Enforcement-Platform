import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Send,
  CheckCircle2,
  AlertOctagon,
  Users,
  BrainCircuit,
  FileCheck,
  RefreshCw,
  MapPin,
  ExternalLink,
  Clock,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { adminAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function SuperAdminGovernance() {
  const [activeTab, setActiveTab] = useState('recommender'); // 'recommender' | 'sanctions' | 'directory'
  const [loading, setLoading] = useState(false);

  // Recommendations state
  const [selectedMonth, setSelectedMonth] = useState('2026-08');
  const [recommendationData, setRecommendationData] = useState(null);
  const [assignmentsToDispatch, setAssignmentsToDispatch] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Sanctions queue state
  const [pendingSanctions, setPendingSanctions] = useState([]);
  const [selectedSanctionScan, setSelectedSanctionScan] = useState(null);
  const [sanctionAction, setSanctionAction] = useState('approve_notice');
  const [sanctionNotes, setSanctionNotes] = useState('');

  // Personnel directory state
  const [directory, setDirectory] = useState([]);

  useEffect(() => {
    if (activeTab === 'recommender') {
      fetchRecommendations();
    } else if (activeTab === 'sanctions') {
      fetchPendingSanctions();
    } else if (activeTab === 'directory') {
      fetchDirectory();
    }
  }, [activeTab, selectedMonth]);

  // Fetch AI Recommendations
  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getAIRecommendations(selectedMonth);
      setRecommendationData(res.data);
      // Populate editable draft assignments
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
      console.error(err);
      toast.error('Failed to load AI quota recommendations');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Pending Sanction Queue
  const fetchPendingSanctions = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getPendingSanctions();
      setPendingSanctions(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load pending sanctions');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Personnel Directory
  const fetchDirectory = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getUsersDirectory();
      setDirectory(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load users directory');
    } finally {
      setLoading(false);
    }
  };

  // Handle Quota Input Edit
  const handleQuotaChange = (index, newCount) => {
    const updated = [...assignmentsToDispatch];
    updated[index].target_count = parseInt(newCount, 10) || 0;
    setAssignmentsToDispatch(updated);
  };

  // Atomic Batch Dispatch ("Verify & Assign All / OK")
  const handleBatchDispatch = async () => {
    try {
      setLoading(true);
      await adminAPI.batchDispatchAssignments(assignmentsToDispatch);
      setShowConfirmModal(false);
      toast.success(`Successfully dispatched ${assignmentsToDispatch.length} work assignments atomically!`);
      fetchRecommendations();
    } catch (err) {
      console.error(err);
      toast.error('Batch assignment dispatch failed. Transaction rolled back.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Sanction Decision
  const handleSanctionSubmit = async () => {
    if (!selectedSanctionScan) return;
    try {
      setLoading(true);
      const res = await adminAPI.sanctionScan(selectedSanctionScan.id, {
        action: sanctionAction,
        notes: sanctionNotes,
      });
      toast.success(
        sanctionAction === 'approve_notice'
          ? `Legal Notice Signed (${res.data.legal_notice_number})`
          : sanctionAction === 'grant_certificate'
          ? `Packaging Certificate Granted (${res.data.legal_notice_number})`
          : 'Re-inspection Requested'
      );
      setSelectedSanctionScan(null);
      setSanctionNotes('');
      fetchPendingSanctions();
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit regulatory sanction');
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
              <ShieldAlert className="w-6 h-6 text-indigo-400" />
              <span>State Regulatory Governance & Enforcement Console</span>
            </div>
            <p className="text-sm text-slate-200">
              Super Admin Executive Portal — AI Risk Allocation, Batch Dispatch, and Two-Tier Legal Sanction Gate.
            </p>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-slate-900/90 px-3.5 py-2 rounded-xl border border-indigo-400/40">
            <span className="text-xs text-slate-300 font-semibold uppercase">Audit Cycle:</span>
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

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2.5 mt-6 pt-4 border-t border-indigo-500/30">
          <button
            onClick={() => setActiveTab('recommender')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-xs ${
              activeTab === 'recommender'
                ? 'bg-white text-indigo-900 shadow-md'
                : 'bg-indigo-950/60 text-slate-200 hover:bg-indigo-950 hover:text-white border border-indigo-500/20'
            }`}
          >
            <BrainCircuit className="w-4 h-4 text-indigo-500" />
            <span>AI Quota Recommender & Batch Dispatch</span>
          </button>

          <button
            onClick={() => setActiveTab('sanctions')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-xs ${
              activeTab === 'sanctions'
                ? 'bg-white text-indigo-900 shadow-md'
                : 'bg-indigo-950/60 text-slate-200 hover:bg-indigo-950 hover:text-white border border-indigo-500/20'
            }`}
          >
            <FileCheck className="w-4 h-4 text-indigo-500" />
            <span>Pending Sanction Queue</span>
            {pendingSanctions.length > 0 && (
              <span className="bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full font-black">
                {pendingSanctions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('directory')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-xs ${
              activeTab === 'directory'
                ? 'bg-white text-indigo-900 shadow-md'
                : 'bg-indigo-950/60 text-slate-200 hover:bg-indigo-950 hover:text-white border border-indigo-500/20'
            }`}
          >
            <Users className="w-4 h-4 text-indigo-500" />
            <span>Regulatory Personnel Directory</span>
          </button>
        </div>
      </div>

      {/* TAB 1: AI Quota Recommender */}
      {activeTab === 'recommender' && (
        <div className="space-y-6">
          {/* Summary Metric Cards - Ultra High Contrast */}
          {recommendationData && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Active Field Officers</div>
                <div className="text-2xl font-extrabold text-slate-900 mt-1">
                  {recommendationData.summary?.total_inspectors || 0} Inspectors
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
                    <th className="px-5 py-4">Industry Category</th>
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
        </div>
      )}

      {/* TAB 2: Pending Sanction Queue */}
      {activeTab === 'sanctions' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-amber-600" />
                <span>Statutory Sanction & Show-Cause Queue</span>
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Field inspections with critical violations requiring final executive sanction under Legal Metrology Act Sec 36.
              </p>
            </div>

            {pendingSanctions.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-medium">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p>No critical violations pending executive sanction. All queues cleared.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold font-mono text-xs uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-4">Scan ID</th>
                      <th className="px-5 py-4">Product / Brand</th>
                      <th className="px-5 py-4">Location / GPS</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {pendingSanctions.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4 font-mono font-bold text-indigo-700">#{s.id}</td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900">{s.product_name || 'Unlabeled Product'}</div>
                          <div className="text-xs text-slate-600">{s.brand || 'Unknown Brand'}</div>
                        </td>
                        <td className="px-5 py-4 text-xs font-medium text-slate-700">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-rose-600" />
                            <span>{s.location_name || 'Field Inspection'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-xs bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 rounded-full font-bold">
                            Pending Sanction
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button
                            onClick={() => setSelectedSanctionScan(s)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-xs"
                          >
                            Review & Sanction
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Regulatory Personnel Directory */}
      {activeTab === 'directory' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-200 bg-slate-50">
            <h3 className="font-bold text-slate-900 text-base">Registered Enforcement Officers</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold font-mono text-xs uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-4">Officer Name</th>
                  <th className="px-5 py-4">Role</th>
                  <th className="px-5 py-4">Zone / Jurisdiction</th>
                  <th className="px-5 py-4">Sector</th>
                  <th className="px-5 py-4">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {directory.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-bold text-slate-900">{u.full_name || u.username}</td>
                    <td className="px-5 py-4 capitalize font-mono text-xs font-bold text-indigo-700">{u.role}</td>
                    <td className="px-5 py-4 text-xs font-medium text-slate-700">{u.jurisdiction_zone || 'State HQ'}</td>
                    <td className="px-5 py-4 text-xs capitalize font-semibold text-slate-800">{u.assigned_category || 'All'}</td>
                    <td className="px-5 py-4 text-xs text-slate-600 font-mono">{u.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Batch Dispatch */}
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

      {/* Review & Sanction Modal */}
      {selectedSanctionScan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-indigo-600" />
                <span>Executive Sanction: Scan #{selectedSanctionScan.id}</span>
              </h3>
              <button
                onClick={() => setSelectedSanctionScan(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-sm text-slate-800">
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase">Product:</span>{' '}
                <span className="font-bold text-slate-900">{selectedSanctionScan.product_name}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase">Location:</span> {selectedSanctionScan.location_name}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Sanction Action</label>
                <select
                  value={sanctionAction}
                  onChange={(e) => setSanctionAction(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="approve_notice">Approve & Issue Statutory Show-Cause Notice</option>
                  <option value="grant_certificate">Grant Pre-Market Packaging Clearance Certificate</option>
                  <option value="request_reinspection">Reject & Demand Re-Inspection</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Executive Review Notes / Directives</label>
                <textarea
                  rows={3}
                  value={sanctionNotes}
                  onChange={(e) => setSanctionNotes(e.target.value)}
                  placeholder="Enter official sanction directives or grounds for notice..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => setSelectedSanctionScan(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-800 text-sm font-bold hover:bg-slate-200"
              >
                Close
              </button>
              <button
                onClick={handleSanctionSubmit}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-600/30"
              >
                {loading ? 'Submitting...' : 'Sign & Sanction Decision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
