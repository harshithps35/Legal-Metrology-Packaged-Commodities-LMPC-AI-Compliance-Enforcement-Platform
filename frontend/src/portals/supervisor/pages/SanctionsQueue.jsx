import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  AlertOctagon,
  CheckCircle2,
  MapPin,
  Clock,
  ShieldCheck,
  Building2,
  ExternalLink,
  Package,
  UserCheck,
  ArrowRightLeft,
  Search,
  Filter,
  Loader2,
  Users,
} from 'lucide-react';
import { supervisorAPI } from '../../../services/api';
import ProductDetailModal from '../../../components/ProductDetailModal';
import { Eye, Scale } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SanctionsQueue() {
  const [activeTab, setActiveTab] = useState('almo_sanctions'); // 'almo_sanctions' | 'almo_reports' | 'clmo_clearance' | 'field_sanctions'
  const [pendingSanctions, setPendingSanctions] = useState([]);
  const [preMarketQueue, setPreMarketQueue] = useState([]);
  const [almoSanctions, setAlmoSanctions] = useState([]);
  const [almoReports, setAlmoReports] = useState([]);
  const [inspectorsList, setInspectorsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProductForInspection, setSelectedProductForInspection] = useState(null);

  // Pre-Market Sub-Filter
  const [pmFilter, setPmFilter] = useState('all'); // 'all' | 'pending_inspector' | 'pending_supervisor' | 'approved_certified'

  // Field Sanction Modal
  const [selectedScan, setSelectedScan] = useState(null);
  const [sanctionAction, setSanctionAction] = useState('approve_notice');
  const [sanctionNotes, setSanctionNotes] = useState('');

  // ALMO Sanction Visit Modal
  const [selectedAlmoApp, setSelectedAlmoApp] = useState(null);
  const [almoSanctionForm, setAlmoSanctionForm] = useState({
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: '11:30 AM',
    visit_location_name: 'Production Facility',
    visit_address: 'Sector 18 Industrial Area, Noida',
    notes: 'Sanctioned under statutory authority. Assigned to Lead Inspector.',
  });

  // ALMO Review Report Modal
  const [selectedAlmoReport, setSelectedAlmoReport] = useState(null);
  const [almoReportAction, setAlmoReportAction] = useState('approve');
  const [almoReportRemarks, setAlmoReportRemarks] = useState('');

  // CLMO Decision Modal
  const [selectedPreMarket, setSelectedPreMarket] = useState(null);
  const [pmDecision, setPmDecision] = useState('approve');
  const [pmNotes, setPmNotes] = useState('');
  const [pmVerificationMethod, setPmVerificationMethod] = useState('DIGITAL_OCR_ONLY');

  // CLMO Waiver Modal
  const [selectedWaiverApp, setSelectedWaiverApp] = useState(null);
  const [waiverJustification, setWaiverJustification] = useState('');

  // Pre-Market Assign / Transfer Modal
  const [selectedTransferApp, setSelectedTransferApp] = useState(null);
  const [targetInspectorId, setTargetInspectorId] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    fetchQueues();
  }, [activeTab]);

  const fetchQueues = async () => {
    try {
      setLoading(true);
      const [sancRes, pmRes, inspRes, almoSancRes, almoRepRes] = await Promise.all([
        supervisorAPI.getPendingSanctions(),
        supervisorAPI.getPreMarketQueue(),
        supervisorAPI.getInspectors(),
        supervisorAPI.getAlmoPendingSanctions(),
        supervisorAPI.getAlmoPendingReports(),
      ]);
      setPendingSanctions(sancRes.data || []);
      setPreMarketQueue(pmRes.data || []);
      setInspectorsList(inspRes.data || []);
      setAlmoSanctions(almoSancRes.data || []);
      setAlmoReports(almoRepRes.data || []);
      if (inspRes.data && inspRes.data.length > 0) {
        setTargetInspectorId(inspRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load sanction queues');
    } finally {
      setLoading(false);
    }
  };

  const handleSanctionSubmit = async () => {
    if (!selectedScan) return;
    try {
      setLoading(true);
      const res = await supervisorAPI.sanctionScan(selectedScan.id, {
        action: sanctionAction,
        notes: sanctionNotes,
      });
      toast.success(`Sanction executed! (${res.data.legal_notice_number || 'Updated'})`);
      setSelectedScan(null);
      setSanctionNotes('');
      fetchQueues();
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit sanction');
    } finally {
      setLoading(false);
    }
  };

  const handleAlmoSanctionVisitSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAlmoApp) return;
    try {
      setLoading(true);
      const res = await supervisorAPI.sanctionFieldVisit(selectedAlmoApp.id, almoSanctionForm);
      toast.success(res.data.message || `Field Visit Order #${res.data.visit_order_no} issued!`);
      setSelectedAlmoApp(null);
      fetchQueues();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to sanction field visit');
    } finally {
      setLoading(false);
    }
  };

  const handleAlmoRejectSanction = async (appId) => {
    const remarks = prompt('Enter reason for rejecting visit recommendation:');
    if (!remarks) return;
    try {
      setLoading(true);
      const res = await supervisorAPI.rejectVisitSanction(appId, { remarks });
      toast.success(res.data.message || 'Visit recommendation returned to inspector');
      fetchQueues();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to reject sanction');
    } finally {
      setLoading(false);
    }
  };

  const handleAlmoReportReviewSubmit = async () => {
    if (!selectedAlmoReport) return;
    try {
      setLoading(true);
      if (almoReportAction === 'approve') {
        const res = await supervisorAPI.approveVisitReport(selectedAlmoReport.visit_id, {
          notes: almoReportRemarks || 'Visit Inspection Report verified and attested by ALMO.',
        });
        toast.success(res.data.message || 'Report approved and routed to CLMO!');
      } else {
        const res = await supervisorAPI.rejectVisitReport(selectedAlmoReport.visit_id, {
          notes: almoReportRemarks || 'VIR rejected: Evidence clarification required.',
        });
        toast.success(res.data.message || 'Report rejected and returned to inspector');
      }
      setSelectedAlmoReport(null);
      setAlmoReportRemarks('');
      fetchQueues();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to process report review');
    } finally {
      setLoading(false);
    }
  };

  const handleCLMOWaiverSubmit = async (e) => {
    e.preventDefault();
    if (!selectedWaiverApp) return;
    try {
      setLoading(true);
      const res = await supervisorAPI.waiveVisit(selectedWaiverApp.id, {
        justification: waiverJustification,
      });
      toast.success(res.data.message || 'Field visit waiver granted by CLMO.');
      setSelectedWaiverApp(null);
      setWaiverJustification('');
      fetchQueues();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to waive field visit.');
    } finally {
      setLoading(false);
    }
  };

  const handlePreMarketDecision = async () => {
    if (!selectedPreMarket) return;
    try {
      setLoading(true);
      const res = await supervisorAPI.decidePreMarket(selectedPreMarket.id, {
        action: pmDecision,
        notes: pmNotes,
        verification_method: pmVerificationMethod,
      });
      toast.success(res.data.message);
      setSelectedPreMarket(null);
      setPmNotes('');
      fetchQueues();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to decide pre-market application');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTransferModal = (app) => {
    setSelectedTransferApp(app);
    setTargetInspectorId(app.assigned_inspector_id || (inspectorsList[0]?.id || ''));
    setTransferNotes(
      `Reassigned to field officer for mandatory Rule 6 and Schedule II font verification.`
    );
  };

  const handleTransferSubmit = async () => {
    if (!selectedTransferApp || !targetInspectorId) return;
    try {
      setTransferring(true);
      const res = await supervisorAPI.assignPreMarket(selectedTransferApp.id, {
        inspector_id: parseInt(targetInspectorId, 10),
        notes: transferNotes,
      });
      toast.success(res.data.message || 'Application reassigned successfully!');
      setSelectedTransferApp(null);
      await fetchQueues();
    } catch (err) {
      console.error(err);
      toast.error('Failed to assign/transfer inspector.');
    } finally {
      setTransferring(false);
    }
  };

  const filteredPreMarket = preMarketQueue.filter((pm) => {
    if (pmFilter === 'all') return true;
    if (pmFilter === 'pending_inspector') {
      return pm.status === 'pending_inspector' || pm.status === 'pending_review';
    }
    return pm.status === pmFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-md text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5 text-indigo-300 font-bold text-lg mb-1">
              <FileCheck className="w-6 h-6 text-indigo-400" />
              <span>Directorate Statutory Sanction & Clearance Authority</span>
            </div>
            <p className="text-sm text-slate-200">
              Statutory separation: <strong>CLMO (Level 2)</strong> adjudicates clearances, guarded waivers, and Show-Cause notices; <strong>ALMO / Superintendent (Level 3)</strong> issues immutable Field Visit Orders & verifies VIRs.
            </p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex flex-wrap gap-2.5 mt-5 pt-4 border-t border-indigo-500/30 text-xs font-bold">
          <button
            onClick={() => setActiveTab('almo_sanctions')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
              activeTab === 'almo_sanctions'
                ? 'bg-white text-indigo-950 shadow-md'
                : 'bg-indigo-950/60 text-slate-300 hover:text-white'
            }`}
          >
            <Scale className="w-4 h-4 text-indigo-400" />
            <span>ALMO: Visit Sanctions Queue ({almoSanctions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('almo_reports')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
              activeTab === 'almo_reports'
                ? 'bg-white text-indigo-950 shadow-md'
                : 'bg-indigo-950/60 text-slate-300 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>ALMO: Field Visit Reports ({almoReports.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('pre_market')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
              activeTab === 'pre_market'
                ? 'bg-white text-indigo-950 shadow-md'
                : 'bg-indigo-950/60 text-slate-300 hover:text-white'
            }`}
          >
            <FileCheck className="w-4 h-4 text-blue-400" />
            <span>CLMO: Clearance & Waivers ({preMarketQueue.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('field_sanctions')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
              activeTab === 'field_sanctions'
                ? 'bg-white text-indigo-950 shadow-md'
                : 'bg-indigo-950/60 text-slate-300 hover:text-white'
            }`}
          >
            <AlertOctagon className="w-4 h-4 text-amber-500" />
            <span>Show-Cause Sanctions ({pendingSanctions.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ALMO Pending Visit Sanctions */}
      {activeTab === 'almo_sanctions' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">ALMO Sanction Authority: Field Visit Recommendations</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review Inspector desk audits and issue immutable Field Visit Orders (VO-YYYY-NNNNNN) or return with remarks.
              </p>
            </div>
            <span className="text-2xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-full">
              Authority: ALMO / Superintendent (Level 3)
            </span>
          </div>

          {almoSanctions.length === 0 ? (
            <div className="p-12 text-center text-slate-500 font-medium">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p>No visit recommendations pending ALMO sanction.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold font-mono text-xs uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-4">App ID</th>
                    <th className="px-5 py-4">Product & Enterprise</th>
                    <th className="px-5 py-4">Triage Severity</th>
                    <th className="px-5 py-4">Inspector Justification</th>
                    <th className="px-5 py-4 text-center">ALMO Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {almoSanctions.map((app) => (
                    <tr
                      key={app.id}
                      onClick={() => setSelectedProductForInspection(app)}
                      className="hover:bg-indigo-50/50 cursor-pointer transition-colors group"
                    >
                      <td className="px-5 py-4 font-mono font-bold text-indigo-700">
                        PMC-{String(app.id).padStart(4, '0')}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{app.product_name}</div>
                        <div className="text-xs text-slate-500">{app.company_name} ({app.category})</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-2xs font-extrabold px-2.5 py-1 rounded-full border uppercase ${
                          app.triage_severity === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}>
                          {app.triage_severity || 'MAJOR'} BREACH
                        </span>
                      </td>
                      <td className="px-5 py-4 max-w-sm">
                        <div className="text-xs text-slate-800 font-medium">{app.visit_recommendation_justification || app.inspector_notes || 'Physical on-site audit required.'}</div>
                        <div className="text-2xs text-slate-500 mt-0.5 font-mono">Officer: {app.assigned_inspector_name}</div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProductForInspection(app);
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-2.5 py-1.5 rounded-xl border border-slate-300 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>Inspect</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAlmoApp(app);
                              setAlmoSanctionForm({
                                scheduled_date: new Date().toISOString().split('T')[0],
                                scheduled_time: '11:30 AM',
                                visit_location_name: `${app.company_name} Manufacturing Plant`,
                                visit_address: 'Sector 18 Industrial Area, Noida',
                                notes: `Sanctioned by ALMO for ${app.triage_severity} breach investigation.`,
                              });
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                          >
                            <Scale className="w-3.5 h-3.5" />
                            <span>Sanction Visit</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAlmoRejectSanction(app.id);
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-300 transition-all cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ALMO Pending Visit Reports (VIR) */}
      {activeTab === 'almo_reports' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">ALMO Evidence Verification: Field Visit Reports (VIR)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Verify vernier caliper measurements, tamper-evident photos, GPS geo-confidence, and sealed cryptographic signatures.
              </p>
            </div>
            <span className="text-2xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full">
              Pre-Clearance Gate
            </span>
          </div>

          {almoReports.length === 0 ? (
            <div className="p-12 text-center text-slate-500 font-medium">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p>No submitted Visit Inspection Reports awaiting ALMO review.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold font-mono text-xs uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-4">Visit Order No</th>
                    <th className="px-5 py-4">Product & Inspector</th>
                    <th className="px-5 py-4">Caliper Font Measurement</th>
                    <th className="px-5 py-4">Crypto Signature & GPS</th>
                    <th className="px-5 py-4 text-center">ALMO Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {almoReports.map((rep) => (
                    <tr
                      key={rep.visit_id}
                      onClick={() => setSelectedProductForInspection(rep)}
                      className="hover:bg-indigo-50/50 cursor-pointer transition-colors group"
                    >
                      <td className="px-5 py-4 font-mono font-bold text-indigo-700">
                        {rep.visit_order_no || rep.visit_id}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{rep.product_name}</div>
                        <div className="text-xs text-slate-500">LMI: {rep.inspector_name}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-black text-slate-900 font-mono text-sm">
                          {rep.caliper_font_measurement_mm || '2.4'} mm
                        </div>
                        <div className="text-3xs text-slate-500">Attested: {rep.caliper_attested_at || 'Sealed on-site'}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-mono text-3xs text-slate-600 truncate max-w-xs">
                          SIG: {rep.inspection_signature ? rep.inspection_signature.substring(0, 16) + '...' : 'Sealed'}
                        </div>
                        <span className="inline-block text-3xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 mt-1">
                          GPS: {rep.gps_confidence || 'HIGH_CONFIDENCE'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProductForInspection(rep);
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-2.5 py-1.5 rounded-xl border border-slate-300 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>Inspect</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAlmoReport(rep);
                              setAlmoReportRemarks(`Verified caliper measurement of ${rep.caliper_font_measurement_mm}mm and on-site evidence.`);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Review & Route to CLMO</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CLMO Pre-Market Clearance & Guarded Waivers */}
      {activeTab === 'pre_market' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm space-y-0">
          <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base">CLMO Clearance Authority: Digital Clearances & Guarded Waivers</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Fast-track digital approvals (Minor/Zero violations) and final post-visit clearance certificate issuance.
              </p>
            </div>

            {/* Sub-Filters */}
            <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl text-2xs font-bold">
              <button
                onClick={() => setPmFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  pmFilter === 'all' ? 'bg-white text-indigo-950 shadow-xs' : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                All ({preMarketQueue.length})
              </button>

              <button
                onClick={() => setPmFilter('pending_supervisor')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  pmFilter === 'pending_supervisor' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Ready for CLMO ({preMarketQueue.filter(p => p.status === 'pending_supervisor' || p.status === 'pending_clmo_approval').length})
              </button>

              <button
                onClick={() => setPmFilter('approved_certified')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  pmFilter === 'approved_certified' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Certified ({preMarketQueue.filter(p => p.status === 'approved_certified').length})
              </button>
            </div>
          </div>

          {filteredPreMarket.length === 0 ? (
            <div className="p-12 text-center text-slate-500 font-medium">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p>No packaging applications found in this view.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold font-mono text-xs uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-4">App ID</th>
                    <th className="px-5 py-4">Enterprise Brand</th>
                    <th className="px-5 py-4">Product Line</th>
                    <th className="px-5 py-4">Verification Route</th>
                    <th className="px-5 py-4 text-center">Status</th>
                    <th className="px-5 py-4 text-center">CLMO Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredPreMarket.map((pm) => {
                    const isReadyForClmo = pm.status === 'pending_supervisor' || pm.status === 'pending_clmo_approval' || pm.status === 'field_visit_waived';
                    const canWaive = (pm.visit_required || pm.visit_recommended) && !pm.visit_waived_by_clmo;

                    return (
                      <tr
                        key={pm.id}
                        onClick={() => setSelectedProductForInspection(pm)}
                        className="hover:bg-indigo-50/50 cursor-pointer transition-colors group"
                      >
                        <td className="px-5 py-4 font-mono font-bold text-indigo-700">
                          PMC-{String(pm.id).padStart(4, '0')}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{pm.company_name}</div>
                          <div className="text-xs text-slate-500 capitalize">{pm.category} Sector</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900">{pm.product_name}</div>
                          <div className="text-xs text-slate-600 font-mono">₹{pm.declared_mrp || 0} • {pm.declared_net_quantity || 'N/A'}</div>
                        </td>
                        <td className="px-5 py-4">
                          {pm.visit_order_no || pm.visit_order ? (
                            <span className="text-2xs font-extrabold bg-indigo-50 text-indigo-900 border border-indigo-200 px-2 py-0.5 rounded">
                              On-Site Field Inspection ({pm.visit_order_no || pm.visit_order?.visit_order_no})
                            </span>
                          ) : pm.visit_waived_by_clmo ? (
                            <span className="text-2xs font-extrabold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded">
                              CLMO Waived (Audit Logged)
                            </span>
                          ) : (
                            <span className="text-2xs font-extrabold bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded">
                              Digital OCR Fast-Track
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span
                            className={`text-2xs px-2.5 py-1 rounded-full font-bold border uppercase ${
                              pm.status === 'approved_certified'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : isReadyForClmo
                                ? 'bg-blue-100 text-blue-900 border-blue-300 font-extrabold'
                                : pm.status === 'pending_almo_sanction'
                                ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                                : pm.status === 'rejected_revise'
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : 'bg-amber-100 text-amber-900 border-amber-300'
                            }`}
                          >
                            {pm.status === 'approved_certified'
                              ? 'Certified & Signed'
                              : isReadyForClmo
                              ? 'Ready for CLMO Seal'
                              : pm.status === 'pending_almo_sanction'
                              ? 'Pending ALMO Sanction'
                              : pm.status === 'rejected_revise'
                              ? 'Revision Req.'
                              : 'In Desk Review'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProductForInspection(pm);
                              }}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-2.5 py-1.5 rounded-xl border border-slate-300 transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span>Inspect</span>
                            </button>

                            {isReadyForClmo && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPreMarket(pm);
                                  setPmVerificationMethod(
                                    pm.visit_order_no || pm.visit_order ? 'PHYSICAL_FIELD_INSPECTION_CONFIRMED' : 'DIGITAL_OCR_ONLY'
                                  );
                                  setPmNotes(
                                    pm.supervisor_notes ||
                                      `Statutory verification complete. Certified under Legal Metrology (Packaged Commodities) Rules 2011.`
                                  );
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Sign Certificate</span>
                              </button>
                            )}

                            {canWaive && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedWaiverApp(pm);
                                  setWaiverJustification('');
                                }}
                                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                              >
                                <span>Waive Visit</span>
                              </button>
                            )}

                            {pm.status === 'approved_certified' && (
                              <span className="text-2xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                                {pm.certificate_number}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Field Show-Cause Queue */}
      {activeTab === 'field_sanctions' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-200 bg-slate-50">
            <h3 className="font-bold text-slate-900 text-base">Field Infractions Pending Executive Sanction</h3>
          </div>

          {pendingSanctions.length === 0 ? (
            <div className="p-12 text-center text-slate-500 font-medium">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p>No critical field infractions pending sanction.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold font-mono text-xs uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-4">Scan ID</th>
                    <th className="px-5 py-4">Product & Category</th>
                    <th className="px-5 py-4">Field Officer & GPS</th>
                    <th className="px-5 py-4">Critical Infraction</th>
                    <th className="px-5 py-4 text-center">Executive Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {pendingSanctions.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => setSelectedProductForInspection(s)}
                      className="hover:bg-indigo-50/50 cursor-pointer transition-colors group"
                    >
                      <td className="px-5 py-4 font-mono font-bold text-indigo-700">
                        #{s.id}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{s.product_name || 'Unlabeled Sample'}</div>
                        <div className="text-xs text-slate-500 capitalize">{s.category || 'General FMCG'}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          <span>{s.location_name || 'Field Location'}</span>
                        </div>
                        <div className="text-2xs font-mono text-slate-500 mt-0.5">
                          Officer: {s.inspector_name}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-block px-2.5 py-1 rounded-full text-2xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                          {s.violations?.[0]?.issue_description || s.violations?.[0]?.title || 'Mandatory Declaration Missing'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProductForInspection(s);
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-2.5 py-1.5 rounded-xl border border-slate-300 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>Inspect</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedScan(s);
                              setSanctionNotes(
                                `Show-Cause Notice issued under Rule 6(1) and Section 36 of Legal Metrology Act 2009 for ${s.product_name}.`
                              );
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
                          >
                            Review & Sign
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: ALMO Sanction Field Visit Order */}
      {selectedAlmoApp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Scale className="w-5 h-5 text-indigo-600" />
                <span>ALMO Issue Field Visit Order (VO-YYYY-NNNNNN)</span>
              </h3>
              <button onClick={() => setSelectedAlmoApp(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleAlmoSanctionVisitSubmit} className="space-y-3.5 text-xs text-slate-800">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <div>
                  <span className="text-slate-500 font-bold uppercase text-2xs block">Target Commodity:</span>
                  <span className="font-extrabold text-slate-900 text-sm">{selectedAlmoApp.product_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold uppercase text-2xs block">Brand / Enterprise:</span>
                  <span className="font-semibold text-slate-800">{selectedAlmoApp.company_name}</span>
                </div>
                <div className="text-2xs text-rose-700 font-bold">
                  Breach Triage: {selectedAlmoApp.triage_severity}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 uppercase text-2xs mb-1">Target Inspection Facility *</label>
                <input
                  type="text"
                  required
                  value={almoSanctionForm.visit_location_name}
                  onChange={(e) => setAlmoSanctionForm({ ...almoSanctionForm, visit_location_name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 uppercase text-2xs mb-1">Inspection Date *</label>
                  <input
                    type="date"
                    required
                    value={almoSanctionForm.scheduled_date}
                    onChange={(e) => setAlmoSanctionForm({ ...almoSanctionForm, scheduled_date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 uppercase text-2xs mb-1">Inspection Time</label>
                  <input
                    type="text"
                    value={almoSanctionForm.scheduled_time}
                    onChange={(e) => setAlmoSanctionForm({ ...almoSanctionForm, scheduled_time: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 uppercase text-2xs mb-1">Physical Address *</label>
                <textarea
                  rows={2}
                  required
                  value={almoSanctionForm.visit_address}
                  onChange={(e) => setAlmoSanctionForm({ ...almoSanctionForm, visit_address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedAlmoApp(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <Scale className="w-4 h-4" />
                  <span>Execute ALMO Sanction & Issue Order</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: ALMO Review Visit Report */}
      {selectedAlmoReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>ALMO Verification: VIR #{selectedAlmoReport.visit_order_no}</span>
              </h3>
              <button onClick={() => setSelectedAlmoReport(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="space-y-3 text-xs text-slate-800">
              <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold uppercase text-2xs">Product:</span>
                  <span className="font-bold text-slate-900">{selectedAlmoReport.product_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold uppercase text-2xs">Lead Inspector:</span>
                  <span className="font-bold text-slate-900">{selectedAlmoReport.inspector_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold uppercase text-2xs">Vernier Caliper Reading:</span>
                  <span className="font-black text-emerald-800">{selectedAlmoReport.caliper_font_measurement_mm} mm</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 uppercase text-2xs mb-1">ALMO Review Action</label>
                <select
                  value={almoReportAction}
                  onChange={(e) => setAlmoReportAction(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-bold text-slate-900"
                >
                  <option value="approve">Approve Report & Route to CLMO for Final Clearance</option>
                  <option value="reject">Reject Report & Return to Inspector for Correction</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 uppercase text-2xs mb-1">ALMO Endorsement Remarks</label>
                <textarea
                  rows={3}
                  value={almoReportRemarks}
                  onChange={(e) => setAlmoReportRemarks(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                onClick={() => setSelectedAlmoReport(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAlmoReportReviewSubmit}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Submit ALMO Verification</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: CLMO Guarded Waiver (Blocked for Critical) */}
      {selectedWaiverApp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-amber-600" />
                <span>CLMO Guarded Field Visit Waiver</span>
              </h3>
              <button onClick={() => setSelectedWaiverApp(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleCLMOWaiverSubmit} className="space-y-3.5 text-xs text-slate-800">
              <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 space-y-1">
                <div>
                  <span className="text-amber-900 font-bold uppercase text-2xs block">Statutory Non-Waivable Guardrail:</span>
                  <p className="text-3xs text-amber-950 mt-0.5 leading-relaxed">
                    Under LMPC Rule 11(2)(c) & Sec 36, <strong>CRITICAL violations CANNOT be waived</strong> by any authority. Physical evidence is legally mandatory. MAJOR violations require written justification (min 20 chars).
                  </p>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 uppercase text-2xs mb-1">
                  Statutory Waiver Justification (Min 20 characters) *
                </label>
                <textarea
                  rows={3}
                  required
                  value={waiverJustification}
                  onChange={(e) => setWaiverJustification(e.target.value)}
                  placeholder="Enter statutory justification for waiving physical inspection..."
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedWaiverApp(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Grant CLMO Waiver</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pre-Market Clearance Decision Modal */}
      {selectedPreMarket && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Directorate Executive Seal: {selectedPreMarket.product_name}</span>
              </h3>
              <button
                onClick={() => setSelectedPreMarket(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-800">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold uppercase text-2xs">Applicant Enterprise:</span>
                  <span className="font-bold text-slate-900">{selectedPreMarket.company_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold uppercase text-2xs">Declared Specifications:</span>
                  <span className="font-semibold text-slate-800">₹{selectedPreMarket.declared_mrp} • {selectedPreMarket.declared_net_quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold uppercase text-2xs">Assigned Inspector:</span>
                  <span className="font-bold text-indigo-700">{selectedPreMarket.assigned_inspector_name || 'Field Inspector'}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Clearance Action</label>
                <select
                  value={pmDecision}
                  onChange={(e) => setPmDecision(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="approve">Grant Official Directorate Seal & Sign Clearance Certificate</option>
                  <option value="reject">Reject & Request Label Design Revision</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Directorate Executive Notes & Endorsement</label>
                <textarea
                  rows={3}
                  value={pmNotes}
                  onChange={(e) => setPmNotes(e.target.value)}
                  placeholder="Enter remarks for the certificate or revision directives..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => setSelectedPreMarket(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-800 text-sm font-bold hover:bg-slate-200"
              >
                Close
              </button>
              <button
                onClick={handlePreMarketDecision}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-600/30 cursor-pointer"
              >
                {loading ? 'Processing...' : 'Submit Clearance Decision'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Field Sanction Decision Modal */}
      {selectedScan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-indigo-600" />
                <span>Executive Sanction: Scan #{selectedScan.id}</span>
              </h3>
              <button
                onClick={() => setSelectedScan(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-sm text-slate-800">
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase">Product:</span>{' '}
                <span className="font-bold text-slate-900">{selectedScan.product_name}</span>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Sanction Action</label>
                <select
                  value={sanctionAction}
                  onChange={(e) => setSanctionAction(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="approve_notice">Approve & Issue Statutory Show-Cause Notice</option>
                  <option value="grant_certificate">Grant Packaging Clearance Certificate</option>
                  <option value="request_reinspection">Reject & Demand Re-Inspection</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Executive Directives</label>
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
                onClick={() => setSelectedScan(null)}
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

      {/* Universal Product Details Modal with Photo & Violations */}
      {selectedProductForInspection && (
        <ProductDetailModal
          product={selectedProductForInspection}
          onClose={() => setSelectedProductForInspection(null)}
        />
      )}
    </div>
  );
}
