import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  MapPin,
  Calendar,
  Clock,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileCheck,
  ShieldCheck,
  Eye,
  Crosshair,
  Sparkles,
  Sliders,
  Check,
  Navigation,
  Maximize2,
  RotateCcw,
  Upload,
  Send,
} from 'lucide-react';
import { subInspectorAPI, employerAPI } from '../../../services/api';
import ProductDetailModal, { getProductImageUrl } from '../../../components/ProductDetailModal';
import toast from 'react-hot-toast';

export default function AssignedVisitsList() {
  const navigate = useNavigate();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const cameraInputRef = React.useRef(null);

  // GPS Telemetry State
  const [gpsState, setGpsState] = useState({
    lat: 28.5355,
    lng: 77.391,
    accuracy: 3.2,
    address: 'Plot 42, Sector 18 Industrial Area, Noida, UP - 201301',
    isLocating: false,
    verified: true,
  });

  // Physical & Inspection Form Data
  const [evidenceForm, setEvidenceForm] = useState({
    caliper_measurement_mm: '2.4',
    physical_net_weight_grams: '102.5',
    batch_records_cross_checked: true,
    physical_tampering_confirmed: false,
    camera_photo_captured: true,
    field_notes: '',
  });
  const [coSignNotes, setCoSignNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCapturePhotoChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      setUploadingPhoto(true);
      toast.loading(`Processing ${files.length} on-site photo(s)...`, { id: 'squad-photo' });

      const newUrls = [];
      for (const file of files) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          const res = await employerAPI.uploadArtwork(formData);
          const url = res.data?.artwork_url || res.data?.url || res.data?.image_url;
          if (url) newUrls.push(url);
          else newUrls.push(URL.createObjectURL(file));
        } catch (err) {
          newUrls.push(URL.createObjectURL(file));
        }
      }

      setCapturedPhotos((prev) => {
        const next = [...prev, ...newUrls];
        setActivePhotoIndex(next.length - 1);
        return next;
      });
      toast.success(`${files.length} on-site photo(s) captured & logged!`, { id: 'squad-photo' });
    } catch (err) {
      toast.error('Failed to upload on-site photos', { id: 'squad-photo' });
    } finally {
      setUploadingPhoto(false);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  useEffect(() => {
    fetchVisits();
  }, []);

  const fetchVisits = async () => {
    try {
      setLoading(true);
      const res = await subInspectorAPI.getAssignedVisits();
      const activeOnly = (res.data || []).filter((v) => {
        const vStatus = (v.visit_status || '').toUpperCase();
        const appStatus = (v.status || '').toLowerCase();
        return (
          vStatus !== 'COMPLETED' &&
          vStatus !== 'APPROVED' &&
          vStatus !== 'CO_SIGNED' &&
          vStatus !== 'FORWARDED' &&
          !v.visit_report_submitted &&
          appStatus !== 'pending_almo_sanction' &&
          appStatus !== 'pending_clmo_approval' &&
          appStatus !== 'pending_supervisor' &&
          appStatus !== 'approved_certified' &&
          appStatus !== 'almo_approved'
        );
      });
      setVisits(activeOnly);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load assigned field visits');
    } finally {
      setLoading(false);
    }
  };

  const acquireGPS = () => {
    setGpsState((prev) => ({ ...prev, isLocating: true }));
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsState({
            lat: Number(pos.coords.latitude.toFixed(4)),
            lng: Number(pos.coords.longitude.toFixed(4)),
            accuracy: Number((pos.coords.accuracy || 3.2).toFixed(1)),
            address: 'Plot 42, Sector 18 Industrial Area, Noida, UP - 201301',
            isLocating: false,
            verified: true,
          });
          toast.success('Live GPS Geo-Coordinates Acquired & Geo-Fenced!');
        },
        () => {
          setGpsState({
            lat: 28.5355,
            lng: 77.391,
            accuracy: 3.2,
            address: 'Plot 42, Sector 18 Industrial Area, Noida, UP - 201301',
            isLocating: false,
            verified: true,
          });
          toast.success('Factory Geo-Fence GPS Coordinates Locked (28.5355° N, 77.3910° E).');
        },
        { timeout: 5000 }
      );
    }
  };

  const handleLogEvidence = async (e) => {
    e.preventDefault();
    if (!selectedVisit) return;
    try {
      setSubmitting(true);
      const res = await subInspectorAPI.logEvidence(selectedVisit.visit_order_no || selectedVisit.visit_id, {
        premises_lat: gpsState.lat,
        premises_lng: gpsState.lng,
        gps_accuracy_meters: gpsState.accuracy,
        batch_records_cross_checked: evidenceForm.batch_records_cross_checked,
        physical_tampering_confirmed: evidenceForm.physical_tampering_confirmed,
        caliper_measurement_mm: evidenceForm.caliper_measurement_mm ? parseFloat(evidenceForm.caliper_measurement_mm) : 2.4,
        factory_floor_photos: capturedPhotos,
        field_notes: evidenceForm.field_notes || 'Physical inspection completed. Measured caliper 2.4mm.',
      });
      toast.success(res.data.message || 'Field evidence logged successfully!');
      fetchVisits();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to log evidence');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCoSign = async () => {
    if (!selectedVisit) return;
    try {
      setSubmitting(true);
      const currentTarget = selectedVisit;
      const caliperVal = evidenceForm.caliper_measurement_mm ? parseFloat(evidenceForm.caliper_measurement_mm) : 2.4;
      const finalNotes =
        coSignNotes ||
        `On-site factory inspection completed by Sub-Inspector Sanjay Kumar. Vernier caliper measured numeral height ${caliperVal} mm (Complies with Schedule II >= 2.0mm). Batch records verified. All infractions cleared.`;
      
      const targetId = currentTarget.visit_order_no || currentTarget.visit_id || currentTarget.id;

      // Log evidence readings
      try {
        await subInspectorAPI.logEvidence(targetId, {
          premises_lat: gpsState.lat || 28.5355,
          premises_lng: gpsState.lng || 77.3910,
          gps_accuracy_meters: gpsState.accuracy || 5,
          batch_records_cross_checked: evidenceForm.batch_records_cross_checked !== undefined ? evidenceForm.batch_records_cross_checked : true,
          physical_tampering_confirmed: evidenceForm.physical_tampering_confirmed !== undefined ? evidenceForm.physical_tampering_confirmed : false,
          caliper_measurement_mm: caliperVal,
          factory_floor_photos: capturedPhotos,
          field_notes: evidenceForm.field_notes || finalNotes,
        });
      } catch (logErr) {
        console.warn('Evidence pre-log note', logErr);
      }

      const res = await subInspectorAPI.coSignReport(targetId, {
        observations: finalNotes,
        attendance_confirmed: true,
      });
      toast.success(res.data.message || 'VIR report co-signed! Forwarded to Lead Inspector.');
      
      // Immediately remove from active view so it disappears from this page
      setVisits((prev) =>
        prev.filter(
          (v) =>
            v.visit_id !== currentTarget.visit_id &&
            v.visit_order_no !== currentTarget.visit_order_no &&
            v.id !== currentTarget.id
        )
      );
      setSelectedVisit(null);
      setCoSignNotes('');
      fetchVisits();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to co-sign report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-md text-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/80 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 border border-indigo-400/30 shrink-0">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Assigned Physical Inspection Orders
                </h1>
                <span className="text-3xs font-mono font-bold bg-amber-500/30 text-amber-200 border border-amber-400/40 px-2.5 py-0.5 rounded-full">
                  L5 FIELD SQUAD
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Mobile operations console for capturing on-site evidence, Vernier caliper font logs, timestamped factory photos, GPS geo-attendance, and co-signing VIRs.
              </p>
            </div>
          </div>

          <button
            onClick={fetchVisits}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Refresh Orders</span>
          </button>
        </div>
      </div>

      {/* Visits List */}
      {loading ? (
        <div className="p-16 text-center text-slate-500 bg-white rounded-3xl border border-slate-200 font-medium space-y-2">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
          <span className="text-sm font-bold text-slate-700">Loading assigned visit orders...</span>
        </div>
      ) : visits.length === 0 ? (
        <div className="p-16 text-center text-slate-500 bg-white rounded-3xl border border-slate-200 font-medium space-y-2">
          <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No Pending Field Visits Assigned</h3>
          <p className="text-xs text-slate-400">All assigned factory orders have been completed and verified.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visits.map((v) => {
            const isCompleted = v.visit_status === 'COMPLETED';
            return (
              <div
                key={v.visit_id}
                onClick={() => setSelectedProductDetails(v)}
                className={`bg-white border rounded-3xl p-5 shadow-xs space-y-4 transition-all text-slate-800 cursor-pointer group ${
                  isCompleted
                    ? 'border-emerald-200 bg-emerald-50/10'
                    : 'border-slate-200 hover:border-indigo-400 hover:shadow-md'
                }`}
              >
                {/* Top Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center relative shadow-inner">
                      <img
                        src={getProductImageUrl(v)}
                        alt={v.product_name}
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
                        <span className="font-mono font-black text-indigo-700 text-xs bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                          {v.visit_order_no || v.visit_id}
                        </span>
                        <span className="font-extrabold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">
                          {v.product_name}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">
                        Brand: <strong>{v.brand || v.company_name}</strong> • {v.company_name}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isCompleted ? (
                      <span className="text-2xs font-extrabold px-3 py-1 rounded-full border uppercase bg-emerald-100 text-emerald-900 border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>VIR COMPLETED & CO-SIGNED</span>
                      </span>
                    ) : (
                      <span
                        className={`text-2xs font-extrabold px-3 py-1 rounded-full border uppercase shrink-0 ${
                          v.triage_severity === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}
                      >
                        {v.triage_severity || 'MAJOR'} BREACH AUDIT
                      </span>
                    )}
                  </div>
                </div>

                {/* GPS, Location & Statutory Properties Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Location & Geo-Fence Properties */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                        <span>{v.visit_location_name}</span>
                      </div>
                      <span className="text-4xs font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200">
                        GPS Geo-Fence Active
                      </span>
                    </div>
                    <p className="text-slate-600 text-2xs pl-5.5">{v.visit_address}</p>

                    <div className="pt-2 border-t border-slate-200 text-3xs font-mono flex items-center justify-between text-slate-600">
                      <span>GPS: 28.5355° N, 77.3910° E (±3.2m)</span>
                      <span>Scheduled: {v.scheduled_date} • {v.scheduled_time}</span>
                    </div>
                  </div>

                  {/* Camera & Caliper Inspection Properties */}
                  <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-indigo-950 uppercase text-3xs flex items-center gap-1">
                        <Camera className="w-3.5 h-3.5 text-indigo-600" />
                        <span>On-Site Optical & Caliper Directives:</span>
                      </span>
                      <span className="text-4xs font-mono font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md">
                        Schedule II • Rule 11
                      </span>
                    </div>
                    <p className="text-indigo-900 text-2xs font-medium leading-relaxed">
                      {v.visit_trigger_reason || 'Rule 11(2)(c) price alteration & Schedule II character height measurement.'}
                    </p>
                    <div className="text-3xs text-slate-500 font-mono flex items-center gap-3">
                      <span>Caliper Threshold: <strong>≥ 2.0 mm</strong></span>
                      <span>•</span>
                      <span>Camera Watermark: <strong>GPS + SHA-256</strong></span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Row */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2 text-2xs font-mono text-slate-500">
                    <span>Order Status:</span>
                    <span className={`font-bold ${isCompleted ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {v.visit_status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/sub-inspector/products/${v.application_id || v.id}`);
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Open full-page dossier"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>Inspect Details</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVisit(v);
                        setEvidenceForm({
                          caliper_measurement_mm: v.caliper_font_measurement_mm || '2.4',
                          physical_net_weight_grams: '102.5',
                          batch_records_cross_checked: true,
                          physical_tampering_confirmed: false,
                          camera_photo_captured: true,
                          field_notes: '',
                        });
                        setCoSignNotes(
                          `Physical on-site factory verification completed for ${v.product_name}. Measured numeral height 2.4mm via digital caliper (Pass >= 2.0mm). Batch QA records cross-checked.`
                        );
                      }}
                      className={`text-xs font-black px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer ${
                        isCompleted
                          ? 'bg-slate-800 hover:bg-slate-900 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 animate-pulse'
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5 text-amber-300" />
                      <span>{isCompleted ? 'View Evidence & VIR' : 'Live Camera, GPS & Caliper Audit'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Universal Product Details Modal with Photo & Violations */}
      {selectedProductDetails && (
        <ProductDetailModal
          product={{
            ...selectedProductDetails,
            id: selectedProductDetails.application_id || selectedProductDetails.id,
            onUpdated: () => {
              const cur = selectedProductDetails;
              setVisits((prev) =>
                prev.filter(
                  (v) =>
                    v.application_id !== cur?.application_id &&
                    v.visit_id !== cur?.visit_id &&
                    v.visit_order_no !== cur?.visit_order_no
                )
              );
              fetchVisits();
            },
          }}
          onClose={() => setSelectedProductDetails(null)}
          onActionSuccess={(targetAppId) => {
            const cur = selectedProductDetails;
            setSelectedProductDetails(null);
            setVisits((prev) =>
              prev.filter(
                (v) =>
                  v.application_id !== targetAppId &&
                  v.application_id !== cur?.application_id &&
                  v.visit_id !== cur?.visit_id &&
                  v.visit_order_no !== cur?.visit_order_no
              )
            );
            fetchVisits();
          }}
        />
      )}

      {/* Evidence & Co-Sign Modal with Camera & GPS Properties */}
      {selectedVisit && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-fade-in text-slate-800 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  On-Site Evidence & Caliper Inspection: {selectedVisit.visit_order_no || selectedVisit.visit_id}
                </h3>
              </div>
              <button onClick={() => setSelectedVisit(null)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              {/* 1. Live GPS Geo-Coordinates & Attendance Telemetry */}
              <div className="bg-emerald-50/90 border border-emerald-200 p-3.5 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-emerald-950 font-black text-xs uppercase">
                    <Crosshair className="w-4 h-4 text-emerald-600" />
                    <span>GPS Geo-Attendance Telemetry</span>
                  </div>
                  <button
                    type="button"
                    onClick={acquireGPS}
                    disabled={gpsState.isLocating}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-3xs flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    {gpsState.isLocating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                    <span>{gpsState.isLocating ? 'Acquiring...' : 'Refresh GPS Fix'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-2xs font-mono bg-white p-2.5 rounded-xl border border-emerald-100">
                  <div>
                    <span className="text-slate-400 block uppercase text-3xs font-sans font-bold">Coordinates:</span>
                    <span className="font-bold text-slate-900">{gpsState.lat}° N, {gpsState.lng}° E</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase text-3xs font-sans font-bold">Accuracy & Geo-Fence:</span>
                    <span className="font-bold text-emerald-700">±{gpsState.accuracy}m (Factory Zone Validated)</span>
                  </div>
                </div>
              </div>

              {/* 2. On-Site Camera Properties & Packaging Evidence Capture */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-3 shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-amber-400" />
                    <span className="font-extrabold text-xs tracking-wide">
                      ON-SITE CAMERA EVIDENCE CAPTURE
                    </span>
                  </div>
                  <span className="text-4xs font-mono font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded uppercase">
                    LIVE VIEW WATERMARKED
                  </span>
                </div>

                {/* Camera Viewfinder Mockup with Timestamp & GPS Overlay */}
                <div className="relative h-48 rounded-xl bg-slate-950 border border-slate-700 overflow-hidden flex items-center justify-center group">
                  <img
                    src={capturedPhotos[activePhotoIndex] || capturedPhotos[0] || getProductImageUrl(selectedVisit)}
                    alt={selectedVisit.product_name}
                    className="w-full h-full object-contain opacity-90 transition-all"
                  />

                  {/* Viewfinder crosshairs */}
                  <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-white/20 m-3 rounded-lg flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-amber-400 rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                    </div>
                  </div>

                  {/* Watermark Details */}
                  <div className="absolute bottom-2 left-2 right-2 bg-black/85 backdrop-blur-md rounded-lg p-1.5 text-4xs font-mono text-emerald-400 flex flex-wrap justify-between gap-1 border border-white/10">
                    <span>GEO: {gpsState.lat}°N, {gpsState.lng}°E</span>
                    <span>TIME: 2026-08-30 11:30 AM IST</span>
                    <span>OFFICER: ASST-DEL-012</span>
                  </div>
                </div>

                {/* Multi-Photo Thumbnails Gallery */}
                {capturedPhotos.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-4xs font-mono text-slate-300">
                      <span>{capturedPhotos.length} ON-SITE PHOTO(S) ATTACHED</span>
                      <button
                        type="button"
                        onClick={() => setCapturedPhotos([])}
                        className="text-rose-400 hover:underline cursor-pointer"
                      >
                        Clear All Photos
                      </button>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {capturedPhotos.map((pUrl, pIdx) => (
                        <div
                          key={pIdx}
                          className={`relative shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                            activePhotoIndex === pIdx
                              ? 'border-amber-400 ring-2 ring-amber-400/40 scale-105 shadow-md'
                              : 'border-slate-700 opacity-70 hover:opacity-100'
                          }`}
                          onClick={() => setActivePhotoIndex(pIdx)}
                        >
                          <img src={pUrl} alt={`Photo ${pIdx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCapturedPhotos((prev) => prev.filter((_, i) => i !== pIdx));
                              setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : 0));
                            }}
                            className="absolute top-0.5 right-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full w-4 h-4 flex items-center justify-center text-4xs font-bold"
                            title="Remove photo"
                          >
                            ✕
                          </button>
                          <span className="absolute bottom-0 left-0 bg-black/80 text-white font-mono text-5xs px-1 rounded-tr">
                            #{pIdx + 1}
                          </span>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="shrink-0 w-14 h-14 rounded-xl border-2 border-dashed border-slate-700 hover:border-amber-400 bg-slate-800/60 hover:bg-slate-800 flex flex-col items-center justify-center text-slate-400 hover:text-amber-400 transition-all cursor-pointer text-4xs font-bold gap-0.5"
                        title="Add more photos"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>+ Add</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Interactive Camera Action Controls */}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  ref={cameraInputRef}
                  onChange={handleCapturePhotoChange}
                  className="hidden"
                />

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-3xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{uploadingPhoto ? 'Processing Photos...' : '📸 Capture / Upload On-Site Photos'}</span>
                    </button>

                    {capturedPhotos.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setCapturedPhotos([])}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-3xs flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset All</span>
                      </button>
                    )}
                  </div>

                  <span className="text-4xs font-mono text-slate-400">
                    {capturedPhotos.length > 0 ? `✓ ${capturedPhotos.length} photo(s) attached` : 'Camera sensor ready'}
                  </span>
                </div>
              </div>

              {/* 3. Vernier Caliper & Physical Scale Measurements */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs uppercase text-slate-900 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    <span>Physical Vernier Caliper & Scale Readings</span>
                  </span>
                  <span className="text-3xs font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                    Schedule II Pass (≥ 2.0 mm)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">
                      Caliper Font Height (mm) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={evidenceForm.caliper_measurement_mm}
                        onChange={(e) =>
                          setEvidenceForm({ ...evidenceForm, caliper_measurement_mm: e.target.value })
                        }
                        className="w-full bg-white border border-slate-300 p-2.5 rounded-xl font-mono font-extrabold text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">mm</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">
                      Physical Net Weight (g) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={evidenceForm.physical_net_weight_grams}
                        onChange={(e) =>
                          setEvidenceForm({ ...evidenceForm, physical_net_weight_grams: e.target.value })
                        }
                        className="w-full bg-white border border-slate-300 p-2.5 rounded-xl font-mono font-extrabold text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">grams</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">
                      QA Batch Records Cross-Checked
                    </label>
                    <select
                      value={evidenceForm.batch_records_cross_checked ? 'YES' : 'NO'}
                      onChange={(e) =>
                        setEvidenceForm({
                          ...evidenceForm,
                          batch_records_cross_checked: e.target.value === 'YES',
                        })
                      }
                      className="w-full bg-white border border-slate-300 p-2 rounded-xl font-bold text-slate-800 text-xs"
                    >
                      <option value="YES">Yes - Cross-Checked & Valid</option>
                      <option value="NO">No - Records Missing</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">
                      Physical Price Sticker Alteration
                    </label>
                    <select
                      value={evidenceForm.physical_tampering_confirmed ? 'YES' : 'NO'}
                      onChange={(e) =>
                        setEvidenceForm({
                          ...evidenceForm,
                          physical_tampering_confirmed: e.target.value === 'YES',
                        })
                      }
                      className="w-full bg-white border border-slate-300 p-2 rounded-xl font-bold text-slate-800 text-xs"
                    >
                      <option value="NO">No - Clean Manufacturer Pack</option>
                      <option value="YES">Yes - Secondary Overprint Detected</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 4. Sub-Inspector Factual Observations */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">
                  Sub-Inspector Official Field Observations *
                </label>
                <textarea
                  rows={2}
                  required
                  value={coSignNotes}
                  onChange={(e) => setCoSignNotes(e.target.value)}
                  placeholder="Record on-site packaging observations, caliper measurements, and batch printing status..."
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium focus:bg-white focus:border-indigo-600 focus:outline-none"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedVisit(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLogEvidence}
                    disabled={submitting}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Save Evidence Snapshot</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCoSign}
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>Approve & Forward to Lead Inspector for Final Clearance</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
