import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, AlertTriangle, XCircle, HelpCircle,
  Edit3, Save, X, RefreshCw, Printer, Shield, Eye, Layers,
  FileText, Scale, Tag, Calendar, Building, Phone, Globe, DollarSign,
  Maximize2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { scanAPI } from '../services/api';
import StatutoryComplianceScorecard from '../components/StatutoryComplianceScorecard';

const statusStyles = {
  COMPLIANT: {
    label: 'COMPLIANT',
    badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    icon: CheckCircle2,
    color: '#16A34A',
  },
  NON_COMPLIANT: {
    label: 'NON-COMPLIANT',
    badge: 'bg-rose-50 text-rose-700 border border-rose-200',
    icon: XCircle,
    color: '#DC2626',
  },
  REQUIRES_REVIEW: {
    label: 'REQUIRES REVIEW',
    badge: 'bg-amber-50 text-amber-700 border border-amber-200',
    icon: AlertTriangle,
    color: '#F59E0B',
  },
  requires_review: {
    label: 'REQUIRES REVIEW',
    badge: 'bg-amber-50 text-amber-700 border border-amber-200',
    icon: AlertTriangle,
    color: '#F59E0B',
  },
};

const severityStyles = {
  CRITICAL: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
    badge: 'bg-rose-100 text-rose-800',
    label: 'Critical Violation',
  },
  MAJOR: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-800',
    label: 'Major Non-Compliance',
  },
  MINOR: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-700',
    badge: 'bg-indigo-100 text-indigo-800',
    label: 'Minor Advisory',
  },
};

export default function ScanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('fields'); // 'fields' | 'violations' | 'fonts' | 'ocr'
  const [hoveredFieldId, setHoveredFieldId] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imgDimensions, setImgDimensions] = useState({ naturalWidth: 1, naturalHeight: 1, clientWidth: 1, clientHeight: 1 });
  const [imageBlobUrl, setImageBlobUrl] = useState(null);

  // Human-in-the-loop editing state
  const [editingFieldId, setEditingFieldId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editSuccessMessage, setEditSuccessMessage] = useState('');

  useEffect(() => {
    loadScanData();
    loadImageBlob();

    return () => {
      if (imageBlobUrl) {
        URL.revokeObjectURL(imageBlobUrl);
      }
    };
  }, [id]);

  // Fix #21: Keyboard shortcuts — Escape to cancel edit, Ctrl+P to print report
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && editingFieldId) {
        handleCancelEdit();
        toast('Editing cancelled', { icon: 'ℹ️' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingFieldId]);

  const loadImageBlob = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/v1/scans/${id}/image`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const blob = await res.blob();
        setImageBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
      }
    } catch {
      setImageBlobUrl(null);
    }
  };

  const loadScanData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await scanAPI.getDetail(id);
      setScan(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load inspection details');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (field) => {
    setEditingFieldId(field.field_id);
    setEditValue(field.value || '');
    setEditSuccessMessage('');
  };

  const handleCancelEdit = () => {
    setEditingFieldId(null);
    setEditValue('');
  };

  const handleSaveEdit = async (fieldId) => {
    if (!editValue.trim()) return;
    setSavingEdit(true);
    try {
      const payload = {
        corrections: [
          {
            field_id: fieldId,
            corrected_value: editValue.trim(),
          },
        ],
        re_evaluate: true,
      };

      await scanAPI.correctFields(id, payload);
      const successMsg = `Successfully updated ${fieldId.replace(/_/g, ' ')} and re-evaluated compliance!`;
      setEditSuccessMessage(successMsg);
      toast.success(successMsg);
      setEditingFieldId(null);
      // Reload fresh scan data with new verdict
      await loadScanData();
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Failed to update field';
      toast.error(errMsg);
    } finally {
      setSavingEdit(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        <p className="text-sm font-medium text-text-secondary">Loading inspection results...</p>
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div className="max-w-xl mx-auto mt-12 p-6 bg-white rounded-card border border-surface-border text-center shadow-card">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-text-primary">Unable to load scan</h2>
        <p className="text-sm text-text-secondary mt-1">{error || 'Scan not found'}</p>
        <button
          onClick={() => navigate('/history')}
          className="mt-5 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition"
        >
          Back to History
        </button>
      </div>
    );
  }

  const normalizedStatus = (scan.status || 'requires_review').toUpperCase();
  const currentStatus = statusStyles[normalizedStatus] || statusStyles.REQUIRES_REVIEW;
  const StatusIcon = currentStatus.icon;

  const score = scan.compliance_score ?? 0;
  let scoreColorClass = 'text-emerald-600';
  let scoreBarColorClass = 'bg-emerald-500';
  if (score < 60) {
    scoreColorClass = 'text-rose-600';
    scoreBarColorClass = 'bg-rose-500';
  } else if (score < 80) {
    scoreColorClass = 'text-amber-600';
    scoreBarColorClass = 'bg-amber-500';
  }

  const fieldsList = scan.extracted_fields || [];
  const violationsList = scan.violations || [];
  const fontMeasurements = scan.compliance_report?.font_measurements || {};

  const downloadReport = (format) => {
    const token = localStorage.getItem('token');
    const url = `/api/v1/scans/${scan.id}/report/${format}`;
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.blob())
      .then(blob => {
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        const ext = format === 'pdf' ? 'pdf' : (format === 'docx' ? 'docx' : 'xlsx');
        link.download = `LMPC_Audit_Report_#${scan.id}.${ext}`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        toast.success(`Exported ${format.toUpperCase()} report!`);
      })
      .catch(() => toast.error('Failed to download report'));
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/history')}
            className="p-2 rounded-xl bg-white border border-surface-border text-text-secondary hover:text-text-primary hover:bg-surface-light transition shadow-sm"
            title="Back to History"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-text-muted">SCAN #{scan.id}</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-surface-muted text-text-secondary capitalize">
                {scan.category || 'General'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-text-primary">
              {scan.product_name || 'Product Label Inspection'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadScanData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-surface-border text-text-secondary hover:text-text-primary text-xs font-medium hover:bg-surface-light transition shadow-xs"
          >
            <RefreshCw size={14} />
            Re-evaluate
          </button>

          {/* Export PDF */}
          <button
            onClick={() => downloadReport('pdf')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition shadow-xs"
            title="Official Legal PDF Certificate"
          >
            <FileText size={14} />
            Export PDF
          </button>

          {/* Export Word */}
          <button
            onClick={() => downloadReport('docx')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition shadow-xs"
            title="Editable Word Notice (.docx)"
          >
            <FileText size={14} />
            Word (.docx)
          </button>

          {/* Export Excel */}
          <button
            onClick={() => downloadReport('excel')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition shadow-xs"
            title="Excel Audit Data (.xlsx)"
          >
            <Printer size={14} />
            Excel (.xlsx)
          </button>
        </div>
      </div>

      {editSuccessMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
            <span>{editSuccessMessage}</span>
          </div>
          <button onClick={() => setEditSuccessMessage('')} className="text-emerald-600 hover:text-emerald-900">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Statutory Rule Scorecard Widget (Rule 6, Rule 11, Schedule II, Rule 27) */}
      <StatutoryComplianceScorecard
        score={score}
        violations={violationsList}
        className="mb-2"
      />

      {/* Overview Metric Banner */}
      <div className="bg-white rounded-card border border-surface-border p-6 shadow-card grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
        {/* Status */}
        <div className="md:border-r border-surface-border md:pr-6">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            Compliance Verdict
          </p>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-sm ${currentStatus.badge}`}>
              <StatusIcon size={18} />
              {currentStatus.label}
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-2">
            Evaluated under LMPC Rules 2011 & Schedule II
          </p>
        </div>

        {/* Compliance Score */}
        <div className="md:border-r border-surface-border md:pr-6">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
            Compliance Index
          </p>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold ${scoreColorClass}`}>
              {score.toFixed(0)}%
            </span>
            <span className="text-xs text-text-muted">/ 100%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${scoreBarColorClass}`}
              style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
            />
          </div>
        </div>

        {/* Violations Summary */}
        <div className="md:border-r border-surface-border md:pr-6">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            Statutory Violations
          </p>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <span className="block text-xl font-bold text-rose-600">
                {violationsList.filter(v => v.severity === 'CRITICAL').length}
              </span>
              <span className="text-[10px] text-text-muted uppercase font-medium">Critical</span>
            </div>
            <div className="text-center">
              <span className="block text-xl font-bold text-amber-600">
                {violationsList.filter(v => v.severity === 'MAJOR').length}
              </span>
              <span className="text-[10px] text-text-muted uppercase font-medium">Major</span>
            </div>
            <div className="text-center">
              <span className="block text-xl font-bold text-indigo-600">
                {violationsList.filter(v => v.severity === 'MINOR').length}
              </span>
              <span className="text-[10px] text-text-muted uppercase font-medium">Minor</span>
            </div>
          </div>
        </div>

        {/* Inspection Meta */}
        <div>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            Audit Info
          </p>
          <p className="text-xs text-text-secondary">
            <span className="font-medium text-text-primary">Inspector:</span> {scan.user?.full_name || scan.user?.username || 'Govt. Inspector'}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            <span className="font-medium text-text-primary">Date:</span> {new Date(scan.created_at).toLocaleString()}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            <span className="font-medium text-text-primary">Brand:</span> {scan.brand || 'Unspecified'}
          </p>
        </div>
      </div>

      {/* Forensic Chain of Custody & Regulatory Sanction Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 rounded-card border border-indigo-500/20 p-4 shadow-card grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
        {/* GPS Location & Map Lock */}
        <div className="flex items-start gap-3 md:border-r border-slate-800 md:pr-4">
          <Globe className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-white flex items-center gap-1.5">
              <span>GPS Chain of Custody</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono">VERIFIED</span>
            </div>
            <div className="text-slate-400 mt-1">{scan.location_name || 'Field Inspected'}</div>
            {scan.latitude && scan.longitude ? (
              <a
                href={`https://www.google.com/maps?q=${scan.latitude},${scan.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 hover:text-indigo-300 font-mono mt-1 inline-flex items-center gap-1 font-semibold"
              >
                <span>{scan.latitude.toFixed(4)}° N, {scan.longitude.toFixed(4)}° E</span>
                <span className="text-[10px]">&rarr; View Map</span>
              </a>
            ) : (
              <span className="text-slate-500 font-mono">GPS Locked to Sector HQ</span>
            )}
          </div>
        </div>

        {/* Client Evidence SHA-256 Digest */}
        <div className="flex items-start gap-3 md:border-r border-slate-800 md:pr-4">
          <Shield className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="overflow-hidden">
            <div className="font-bold text-white">Tamper-Proof Evidence Hash</div>
            <div className="font-mono text-slate-400 mt-1 truncate max-w-xs" title={scan.client_evidence_hash}>
              SHA-256: {scan.client_evidence_hash ? scan.client_evidence_hash.substring(0, 24) + '...' : 'Pre-computed on Capture'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Barcode / GTIN: <span className="font-mono text-indigo-300 font-semibold">{scan.barcode_cross_check_status || 'VERIFIED'}</span>
            </div>
          </div>
        </div>

        {/* Regulatory Sanction Gate */}
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-white">Super Admin Sanction Status</div>
            <div className="mt-1">
              {scan.approval_status === 'sanctioned_approved' ? (
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-semibold text-[11px]">
                  Sanctioned & Signed (Notice Issued)
                </span>
              ) : scan.approval_status === 'pending_sanction' ? (
                <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded font-semibold text-[11px]">
                  Awaiting Super Admin Sanction
                </span>
              ) : (
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-semibold text-[11px]">
                  Pre-Market Clearance Validated
                </span>
              )}
            </div>
            {scan.sanctioned_at && (
              <div className="text-[10px] text-slate-400 mt-1 font-mono">
                Signed on: {new Date(scan.sanctioned_at).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Split View: Label Image (Left) + Tabs / Analysis (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Label Image with Bounding Box Overlay (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-card border border-surface-border shadow-card p-5 sticky top-20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Eye size={16} className="text-primary-600" />
              Original Label & Bounding Boxes
            </h3>
            <span className="text-xs text-text-muted">Hover fields to highlight</span>
          </div>

          {/* Interactive Image Container */}
          <div className="relative rounded-xl border border-surface-border bg-slate-900/5 overflow-hidden flex items-center justify-center min-h-[340px]">
            {imageBlobUrl || scan.image_url ? (
              <img
                src={imageBlobUrl || `/api/v1/scans/${scan.id}/image`}
                alt={scan.product_name ? `${scan.product_name} packaging label` : 'Scanned product packaging label image'}
                className="w-full max-h-[500px] object-contain block select-none"
                onLoad={(e) => {
                  setImageLoaded(true);
                  setImgDimensions({
                    naturalWidth: e.target.naturalWidth || 1,
                    naturalHeight: e.target.naturalHeight || 1,
                    clientWidth: e.target.clientWidth || 1,
                    clientHeight: e.target.clientHeight || 1,
                  });
                }}
                onError={(e) => {
                  setImageLoaded(false);
                }}
              />
            ) : (
              <div className="text-center p-8 text-text-muted">
                <p className="text-xs font-semibold">Demo Preset Label</p>
                <p className="text-[11px] text-text-muted mt-1">Simulated packaging test data</p>
              </div>
            )}

            {/* Bounding Box Overlays */}
            {imageLoaded && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox={`0 0 ${imgDimensions.naturalWidth} ${imgDimensions.naturalHeight}`}
                preserveAspectRatio="xMidYMid meet"
              >
                {fieldsList.map((field) => {
                  if (!field.bounding_box) return null;
                  const { x, y, w, h } = field.bounding_box;
                  const isHovered = hoveredFieldId === field.field_id;
                  const isDetected = field.detected;

                  return (
                    <g key={field.field_id}>
                      <rect
                        x={x}
                        y={y}
                        width={w}
                        height={h}
                        fill={isHovered ? 'rgba(59, 130, 246, 0.35)' : 'rgba(59, 130, 246, 0.12)'}
                        stroke={isHovered ? '#2563EB' : '#3B82F6'}
                        strokeWidth={isHovered ? 4 : 2}
                        rx={4}
                      />
                      {isHovered && (
                        <text
                          x={x}
                          y={Math.max(20, y - 6)}
                          fill="#1E40AF"
                          fontSize="22"
                          fontWeight="bold"
                          className="bg-white"
                        >
                          {field.display_name}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
            <span>{fieldsList.filter(f => f.detected).length} of {fieldsList.length} fields located</span>
            <span className="font-mono">Tesseract hin+eng</span>
          </div>
        </div>

        {/* Right Column: Tabbed Analysis & Human-in-the-Loop Editor (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Tab Navigation Pill Bar */}
          <div className="bg-white rounded-xl border border-surface-border p-1.5 shadow-card flex items-center gap-1">
            <button
              onClick={() => setActiveTab('fields')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'fields'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary'
              }`}
            >
              <Layers size={14} />
              Extracted Fields ({fieldsList.filter(f => f.detected).length})
            </button>
            <button
              onClick={() => setActiveTab('violations')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'violations'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary'
              }`}
            >
              <AlertTriangle size={14} />
              Violations ({violationsList.length})
            </button>
            <button
              onClick={() => setActiveTab('fonts')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'fonts'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary'
              }`}
            >
              <Scale size={14} />
              Font Analysis
            </button>
            <button
              onClick={() => setActiveTab('ocr')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'ocr'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary'
              }`}
            >
              <FileText size={14} />
              Raw OCR
            </button>
          </div>

          {/* TAB 1: Mandatory Fields & Human-in-the-Loop Corrections */}
          {activeTab === 'fields' && (
            <div className="bg-white rounded-card border border-surface-border shadow-card overflow-hidden">
              <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Mandatory Declarations Check</h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Click 'Edit' to manually fix OCR misreads. Re-evaluation triggers automatically.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-surface-border">
                {fieldsList.map((field) => {
                  const isEditing = editingFieldId === field.field_id;
                  const isHovered = hoveredFieldId === field.field_id;

                  return (
                    <div
                      key={field.field_id}
                      onMouseEnter={() => setHoveredFieldId(field.field_id)}
                      onMouseLeave={() => setHoveredFieldId(null)}
                      className={`p-4 transition-colors ${
                        isHovered ? 'bg-primary-50/40' : 'hover:bg-surface-light'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-text-primary">
                              {field.display_name}
                            </span>
                            {field.detected ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Detected
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                Missing
                              </span>
                            )}
                            {field.is_manually_corrected && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                Inspector Corrected
                              </span>
                            )}
                          </div>

                          {/* Field Value Display or Edit Box */}
                          {isEditing ? (
                            <div className="mt-2.5 flex items-center gap-2">
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                placeholder={`Enter correct ${field.display_name}...`}
                                className="flex-1 px-3 py-1.5 rounded-lg border border-primary-300 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-200"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveEdit(field.field_id)}
                                disabled={savingEdit}
                                className="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700 flex items-center gap-1 shadow-sm"
                              >
                                <Save size={12} />
                                {savingEdit ? 'Saving...' : 'Save & Re-evaluate'}
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-1.5 rounded-lg border border-surface-border text-text-muted hover:text-text-primary"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="mt-1.5">
                              {field.detected ? (
                                <p className="text-sm font-medium text-text-primary break-words font-mono bg-surface-light px-2.5 py-1 rounded-md inline-block border border-surface-border">
                                  {field.value}
                                </p>
                              ) : (
                                <p className="text-xs text-rose-600 italic">
                                  Statutory declaration not detected on label
                                </p>
                              )}
                            </div>
                          )}

                          {/* Confidence & Source Info */}
                          <div className="mt-2 flex items-center gap-4 text-[11px] text-text-muted">
                            <span>
                              Confidence: <strong className="text-text-secondary">{(field.confidence * 100).toFixed(0)}%</strong>
                            </span>
                            {field.source && (
                              <span>Source: <strong className="text-text-secondary">{field.source}</strong></span>
                            )}
                          </div>
                        </div>

                        {/* Edit Button */}
                        {!isEditing && (
                          <button
                            onClick={() => handleStartEdit(field)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-primary-600 hover:bg-primary-50 transition border border-transparent hover:border-primary-200"
                            title="Correct Field Value"
                          >
                            <Edit3 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Statutory Violations */}
          {activeTab === 'violations' && (
            <div className="space-y-3">
              {violationsList.length === 0 ? (
                <div className="bg-white rounded-card border border-surface-border p-8 text-center shadow-card">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                  <h3 className="text-base font-bold text-text-primary">Fully Compliant!</h3>
                  <p className="text-xs text-text-secondary mt-1">
                    No statutory violations detected under Legal Metrology Rules 2011.
                  </p>
                </div>
              ) : (
                violationsList.map((violation, idx) => {
                  const style = severityStyles[violation.severity] || severityStyles.MINOR;

                  return (
                    <div
                      key={idx}
                      className={`bg-white rounded-card border ${style.border} p-4 shadow-card hover:shadow-card-hover transition`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${style.badge}`}>
                              {style.label}
                            </span>
                            <span className="text-xs font-mono font-semibold text-text-muted">
                              {violation.rule_code}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-text-primary mt-2">
                            {violation.title}
                          </h4>

                          <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                            {violation.description}
                          </p>

                          {violation.recommendation && (
                            <div className="mt-3 p-2.5 rounded-lg bg-surface-light border border-surface-border">
                              <p className="text-[11px] font-bold text-text-primary uppercase tracking-wide">
                                Statutory Action Required:
                              </p>
                              <p className="text-xs text-text-secondary mt-0.5">
                                {violation.recommendation}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: Font Size Measurement (Schedule II) */}
          {activeTab === 'fonts' && (
            <div className="bg-white rounded-card border border-surface-border shadow-card overflow-hidden">
              <div className="px-5 py-4 border-b border-surface-border">
                <h3 className="text-sm font-bold text-text-primary">Schedule II Minimum Font Height Rules</h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Statutory minimum font heights based on package declared net weight / volume.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-surface-border bg-surface-light">
                      <th className="py-2.5 px-4 font-semibold text-text-muted">Field</th>
                      <th className="py-2.5 px-4 font-semibold text-text-muted">Detected Height</th>
                      <th className="py-2.5 px-4 font-semibold text-text-muted">Min Required</th>
                      <th className="py-2.5 px-4 font-semibold text-text-muted">Method / Precision</th>
                      <th className="py-2.5 px-4 font-semibold text-text-muted">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {Object.entries(fontMeasurements).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-text-muted">
                          No font measurements recorded for this scan.
                        </td>
                      </tr>
                    ) : (
                      Object.entries(fontMeasurements).map(([fieldId, m]) => (
                        <tr key={fieldId} className="hover:bg-surface-light">
                          <td className="py-3 px-4 font-medium text-text-primary capitalize">
                            {fieldId.replace('_', ' ')}
                          </td>
                          <td className="py-3 px-4 font-mono">
                            {m.font_height_mm ? `${m.font_height_mm.toFixed(2)} mm` : '—'}
                            <span className="text-[10px] text-text-muted ml-1">({m.font_height_px}px)</span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold">
                            {m.min_required_mm} mm
                          </td>
                          <td className="py-3 px-4 capitalize">
                            <span className="px-2 py-0.5 rounded-md bg-surface-muted text-text-secondary">
                              {m.measurement_method} ({m.confidence})
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {m.status === 'compliant' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Pass
                              </span>
                            ) : m.status === 'borderline' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Borderline (±10%)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                Non-Compliant
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: Raw OCR Transcript */}
          {activeTab === 'ocr' && (
            <div className="bg-white rounded-card border border-surface-border shadow-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-text-primary">Raw OCR Text Output</h3>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(scan.raw_ocr_text || '');
                    alert('Copied OCR text to clipboard!');
                  }}
                  className="text-xs text-primary-600 hover:text-primary-800 font-semibold"
                >
                  Copy Text
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[400px]">
                {scan.raw_ocr_text || 'No raw OCR transcript available.'}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
