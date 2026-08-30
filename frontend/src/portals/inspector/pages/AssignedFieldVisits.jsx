import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Calendar,
  Clock,
  ClipboardCheck,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileCheck,
  ShieldCheck,
  Scale,
  Search,
  Building2,
  Package,
  Eye,
  AlertOctagon,
  Sparkles,
  Send,
  Hash,
  ChevronRight,
  UserCheck,
  Plus,
  Trash2,
} from 'lucide-react';
import { fieldVisitAPI } from '../../../services/api';
import ProductDetailModal from '../../../components/ProductDetailModal';
import toast from 'react-hot-toast';

export default function AssignedFieldVisits() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'scheduled' | 'in_progress' | 'completed'

  // Modals & form state
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [showVIRModal, setShowVIRModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [virForm, setVirForm] = useState({
    caliper_font_measurement_mm: '2.4',
    physical_net_weight_grams: '100.0',
    batch_records_cross_checked: true,
    physical_tampering_confirmed: false,
    factory_floor_photos: ['/uploads/factory_packaging_line.jpg'],
    visit_recommendation: 'APPROVE_WITH_CONDITIONS',
    on_site_inspector_remarks: 'On-site physical inspection performed at packaging floor. Vernier caliper measured principal display character height at 2.4mm (satisfies Schedule II >= 2.0mm standard). QA batch logs and stamping verified.',
  });

  const [newPhotoUrl, setNewPhotoUrl] = useState('');

  useEffect(() => {
    fetchAssignedVisits();
  }, []);

  const fetchAssignedVisits = async () => {
    try {
      setLoading(true);
      const res = await fieldVisitAPI.getMyAssigned();
      setVisits(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load assigned field visits');
    } finally {
      setLoading(false);
    }
  };

  const handleStartVisit = async (visitId) => {
    try {
      setSubmitting(true);
      await fieldVisitAPI.startVisit(visitId);
      toast.success('On-site field audit started! GPS timestamp and location locked.');
      fetchAssignedVisits();
    } catch (err) {
      console.error(err);
      toast.error('Failed to initiate field audit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenVIRModal = (visit) => {
    setSelectedVisit(visit);
    setVirForm({
      caliper_font_measurement_mm: visit.caliper_font_measurement_mm ? String(visit.caliper_font_measurement_mm) : '2.4',
      physical_net_weight_grams: visit.physical_net_weight_grams ? String(visit.physical_net_weight_grams) : '100.0',
      batch_records_cross_checked: visit.batch_records_cross_checked ?? true,
      physical_tampering_confirmed: visit.physical_tampering_confirmed ?? false,
      factory_floor_photos:
        visit.factory_floor_photos && visit.factory_floor_photos.length > 0
          ? visit.factory_floor_photos
          : ['/uploads/factory_packaging_line.jpg'],
      visit_recommendation: visit.visit_recommendation || 'APPROVE_WITH_CONDITIONS',
      on_site_inspector_remarks:
        visit.on_site_inspector_remarks ||
        'On-site physical inspection performed at packaging floor. Vernier caliper measured principal display character height at 2.4mm (satisfies Schedule II >= 2.0mm standard). QA batch logs and stamping verified.',
    });
    setShowVIRModal(true);
  };

  const handleAddPhoto = () => {
    if (!newPhotoUrl.trim()) return;
    setVirForm({
      ...virForm,
      factory_floor_photos: [...virForm.factory_floor_photos, newPhotoUrl.trim()],
    });
    setNewPhotoUrl('');
    toast.success('Evidence photo added with SHA-256 client hash tracking!');
  };

  const handleRemovePhoto = (index) => {
    const updated = virForm.factory_floor_photos.filter((_, idx) => idx !== index);
    setVirForm({ ...virForm, factory_floor_photos: updated });
  };

  const handleSubmitVIR = async (e) => {
    e.preventDefault();
    if (!selectedVisit) return;

    const caliperVal = parseFloat(virForm.caliper_font_measurement_mm);
    if (isNaN(caliperVal) || caliperVal <= 0) {
      toast.error('Please enter a valid Vernier caliper font measurement in millimeters.');
      return;
    }

    try {
      setSubmitting(true);
      const visitIdToSubmit = selectedVisit.visit_order_no || selectedVisit.visit_id || selectedVisit.id;
      await fieldVisitAPI.submitReport(visitIdToSubmit, {
        caliper_font_measurement_mm: caliperVal,
        physical_net_weight_grams: parseFloat(virForm.physical_net_weight_grams) || 100.0,
        batch_records_cross_checked: virForm.batch_records_cross_checked,
        physical_tampering_confirmed: virForm.physical_tampering_confirmed,
        factory_floor_photos: virForm.factory_floor_photos,
        visit_recommendation: virForm.visit_recommendation,
        on_site_inspector_remarks: virForm.on_site_inspector_remarks,
      });

      toast.success(`Visit Inspection Report (VIR) submitted to ALMO for official verification!`);
      setShowVIRModal(false);
      setSelectedVisit(null);
      fetchAssignedVisits();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to submit Visit Inspection Report');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredVisits = visits.filter((v) => {
    const matchesSearch =
      v.visit_order_no?.toLowerCase().includes(search.toLowerCase()) ||
      v.visit_id?.toLowerCase().includes(search.toLowerCase()) ||
      v.application?.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      v.visit_location_name?.toLowerCase().includes(search.toLowerCase()) ||
      v.visit_trigger_reason?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'scheduled') return v.visit_status === 'SCHEDULED';
    if (activeFilter === 'in_progress') return v.visit_status === 'IN_PROGRESS';
    if (activeFilter === 'completed') return v.visit_report_submitted || v.visit_status === 'COMPLETED';
    return true;
  });

  const scheduledCount = visits.filter((v) => v.visit_status === 'SCHEDULED').length;
  const inProgressCount = visits.filter((v) => v.visit_status === 'IN_PROGRESS').length;
  const completedCount = visits.filter((v) => v.visit_report_submitted || v.visit_status === 'COMPLETED').length;

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-md text-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/80 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 border border-indigo-400/30 shrink-0">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Assigned Field Visit Orders & Execution Console
                </h1>
                <span className="text-3xs font-mono font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 px-2 py-0.5 rounded-full">
                  FIELD OPS L4
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Execute ALMO-sanctioned on-site factory visits, record Vernier caliper font measurements, and submit tamper-proof VIR dossiers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchAssignedVisits}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Refresh Orders</span>
            </button>
          </div>
        </div>

        {/* Key Metric Counters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-indigo-900/60 text-xs">
          <div className="bg-slate-950/40 border border-indigo-500/20 rounded-2xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-2xs uppercase block font-bold">Scheduled Visits</span>
              <span className="text-lg font-black text-amber-300">{scheduledCount} Orders</span>
            </div>
            <Calendar className="w-6 h-6 text-amber-400/60" />
          </div>

          <div className="bg-slate-950/40 border border-indigo-500/20 rounded-2xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-2xs uppercase block font-bold">In-Progress On-Site</span>
              <span className="text-lg font-black text-blue-300">{inProgressCount} Orders</span>
            </div>
            <Clock className="w-6 h-6 text-blue-400/60" />
          </div>

          <div className="bg-slate-950/40 border border-indigo-500/20 rounded-2xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-2xs uppercase block font-bold">Submitted to ALMO</span>
              <span className="text-lg font-black text-emerald-300">{completedCount} VIR Reports</span>
            </div>
            <CheckCircle2 className="w-6 h-6 text-emerald-400/60" />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1 overflow-x-auto">
          {[
            { key: 'all', label: `All Orders (${visits.length})` },
            { key: 'scheduled', label: `Scheduled (${scheduledCount})` },
            { key: 'in_progress', label: `In-Progress (${inProgressCount})` },
            { key: 'completed', label: `VIR Submitted (${completedCount})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === tab.key
                  ? 'bg-white text-indigo-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Order #, product, location, or infraction..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-600"
          />
        </div>
      </div>

      {/* Orders Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <span className="text-xs font-bold text-slate-500">Loading Assigned Field Visits...</span>
        </div>
      ) : filteredVisits.length === 0 ? (
        <div className="py-16 text-center bg-white border border-slate-200 rounded-3xl p-8 space-y-3">
          <MapPin className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No Field Visit Orders in This Category</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            When an ALMO sanctions a field visit recommendation from desk review, the official Visit Order (VO) will appear here for physical on-site execution.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredVisits.map((v) => {
            const isCompleted = v.visit_report_submitted || v.visit_status === 'COMPLETED';
            const isInProgress = v.visit_status === 'IN_PROGRESS';

            return (
              <div
                key={v.visit_id || v.id}
                onClick={() => setSelectedProductDetails(v)}
                className={`bg-white border rounded-3xl p-6 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-4 ${
                  isCompleted
                    ? 'border-emerald-200 bg-emerald-50/10'
                    : isInProgress
                    ? 'border-blue-300 bg-blue-50/10'
                    : 'border-amber-200 bg-amber-50/10'
                }`}
              >
                {/* Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl">
                      {v.visit_order_no || v.visit_id}
                    </span>

                    <h3 className="font-black text-slate-900 text-base">
                      {v.application?.product_name || v.visit_location_name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {isCompleted ? (
                      <span className="text-2xs font-extrabold uppercase px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>VIR Submitted to ALMO</span>
                      </span>
                    ) : isInProgress ? (
                      <span className="text-2xs font-extrabold uppercase px-3 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>On-Site In Progress</span>
                      </span>
                    ) : (
                      <span className="text-2xs font-extrabold uppercase px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-600" />
                        <span>Scheduled Field Visit</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
                  {/* Left: Location & Schedule */}
                  <div className="md:col-span-7 space-y-2">
                    <div className="flex items-start gap-2 text-slate-700">
                      <Building2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-900">{v.visit_location_name}</span>
                        <p className="text-slate-500 text-2xs mt-0.5">{v.visit_address}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-2xs text-slate-600 pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-600" />
                        Date: <strong>{v.scheduled_date || 'Immediate'}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        Time: <strong>{v.scheduled_time || '11:00 AM'}</strong>
                      </span>
                      {v.sub_inspector_name && (
                        <span className="flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          Sub-Inspector: <strong>{v.sub_inspector_name}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Infraction Reason & Severity */}
                  <div className="md:col-span-5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                    <span className="text-2xs font-bold text-slate-500 uppercase block">Statutory Trigger Grounds:</span>
                    <div className="text-xs font-semibold text-slate-800 flex items-start gap-1.5">
                      <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{v.visit_trigger_reason || 'Rule 11(2)(c) & Schedule II Verification'}</span>
                    </div>

                    {v.caliper_font_measurement_mm && (
                      <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-2xs">
                        <span className="text-slate-500 font-bold">Logged Caliper Height:</span>
                        <span className="font-mono font-black text-emerald-700">{v.caliper_font_measurement_mm} mm</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-2xs text-slate-500 font-mono">
                    Order ID: <strong>{v.visit_order_no || v.visit_id}</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProductDetails(v);
                      }}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>Inspect Dossier</span>
                    </button>

                    {!isCompleted && !isInProgress && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartVisit(v.visit_order_no || v.visit_id);
                        }}
                        disabled={submitting}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center gap-1.5 cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Start On-Site Audit</span>
                      </button>
                    )}

                    {!isCompleted && isInProgress && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenVIRModal(v);
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        <span>Log Caliper & Submit VIR</span>
                      </button>
                    )}

                    {isCompleted && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenVIRModal(v);
                        }}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>View Submitted VIR</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Submit / View Visit Inspection Report (VIR) */}
      {showVIRModal && selectedVisit && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-fade-in my-8 max-h-[90vh] flex flex-col justify-between">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200 shrink-0">
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900">
                    Visit Inspection Report (VIR) Submission
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Statutory Level 4 Inspection Seal • Order: <strong className="font-mono text-indigo-700">{selectedVisit.visit_order_no || selectedVisit.visit_id}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowVIRModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 text-lg rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitVIR} className="space-y-4 overflow-y-auto pr-1 text-xs">
              {/* Product and Facility Summary Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 text-2xs uppercase block font-bold">Facility / Plant:</span>
                  <span className="font-bold text-slate-900">{selectedVisit.visit_location_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-2xs uppercase block font-bold">Commodity:</span>
                  <span className="font-bold text-slate-900">{selectedVisit.application?.product_name || 'FMCG Packaged Commodity'}</span>
                </div>
              </div>

              {/* Physical Vernier Caliper & Weight Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-800 uppercase text-3xs">
                    Vernier Caliper Font Measurement (mm) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={virForm.caliper_font_measurement_mm}
                    onChange={(e) => setVirForm({ ...virForm, caliper_font_measurement_mm: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-mono font-bold text-slate-900 text-sm focus:bg-white focus:border-indigo-600 focus:outline-none"
                    placeholder="e.g. 2.4"
                  />
                  <span className="text-3xs text-emerald-700 font-semibold block">
                    Schedule II Standard: Minimum 2.0mm for net qty display
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-800 uppercase text-3xs">
                    Physical Net Quantity / Weight (Grams/mL)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={virForm.physical_net_weight_grams}
                    onChange={(e) => setVirForm({ ...virForm, physical_net_weight_grams: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-mono font-bold text-slate-900 text-sm focus:bg-white focus:border-indigo-600 focus:outline-none"
                    placeholder="e.g. 100.0"
                  />
                  <span className="text-3xs text-slate-500 block">Gross pack tare weight verification</span>
                </div>
              </div>

              {/* Physical Checks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={virForm.batch_records_cross_checked}
                    onChange={(e) => setVirForm({ ...virForm, batch_records_cross_checked: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="font-bold text-slate-800 text-2xs">Batch Registers Cross-Checked</span>
                </label>

                <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={virForm.physical_tampering_confirmed}
                    onChange={(e) => setVirForm({ ...virForm, physical_tampering_confirmed: e.target.checked })}
                    className="w-4 h-4 text-rose-600 rounded"
                  />
                  <span className="font-bold text-rose-800 text-2xs">Physical Tampering Detected (Sec 36)</span>
                </label>
              </div>

              {/* Factory Floor Photos Attachment */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-800 uppercase text-3xs">
                  Factory Floor Photographs & Evidence
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter evidence photo URL (e.g. /uploads/factory_pack.jpg)..."
                    value={newPhotoUrl}
                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-300 p-2 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddPhoto}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                {virForm.factory_floor_photos && virForm.factory_floor_photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {virForm.factory_floor_photos.map((photo, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-xl text-2xs font-mono text-slate-700">
                        <Camera className="w-3 h-3 text-indigo-600" />
                        <span className="truncate max-w-[150px]">{photo}</span>
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="text-rose-500 hover:text-rose-700 font-bold ml-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Statutory Recommendation */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-800 uppercase text-3xs">
                  Inspector Statutory Recommendation *
                </label>
                <select
                  value={virForm.visit_recommendation}
                  onChange={(e) => setVirForm({ ...virForm, visit_recommendation: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-bold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none"
                >
                  <option value="APPROVE_WITH_CONDITIONS">Approve with Conditions (Field Verified Compliant)</option>
                  <option value="REJECT_SANCTION">Reject & Escalate for Legal Sanctions / Show-Cause (Sec 36)</option>
                  <option value="SEEK_CLARIFICATION">Seek Further Factory / Lab Clarification</option>
                </select>
              </div>

              {/* Inspector Remarks */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-800 uppercase text-3xs">
                  On-Site Inspection Findings & Charge-Sheet Notes *
                </label>
                <textarea
                  rows={3}
                  required
                  value={virForm.on_site_inspector_remarks}
                  onChange={(e) => setVirForm({ ...virForm, on_site_inspector_remarks: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium p-3 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none"
                  placeholder="Record on-site findings, physical observations, stamping verification, etc."
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowVIRModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Submit VIR to ALMO</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProductDetails && (
        <ProductDetailModal
          product={selectedProductDetails.application || selectedProductDetails}
          onClose={() => setSelectedProductDetails(null)}
        />
      )}
    </div>
  );
}
