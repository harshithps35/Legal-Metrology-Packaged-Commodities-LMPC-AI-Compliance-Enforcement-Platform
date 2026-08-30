import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertOctagon,
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Send,
  Loader2,
  Package,
  Calendar,
  AlertTriangle,
  Eye,
  ArrowRight,
  Layers,
  Maximize2,
  ExternalLink,
  FileCheck,
  Scale,
  Sparkles,
  Download,
  Search,
  Filter,
  Check,
  Award,
} from 'lucide-react';
import { employerAPI, scanAPI, reportsAPI } from '../../../services/api';
import ProductDetailModal, { getProductImageUrl } from '../../../components/ProductDetailModal';
import toast from 'react-hot-toast';

export default function NoticeRectification() {
  const [deficiencyCases, setDeficiencyCases] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tabs & Search Filter
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'action_required', 'in_verification', 'resolved'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Forms
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [zoomImageUrl, setZoomImageUrl] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [declaredMrp, setDeclaredMrp] = useState('');
  const [declaredNetQty, setDeclaredNetQty] = useState('');
  const [proofFiles, setProofFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingCert, setDownloadingCert] = useState(null);

  useEffect(() => {
    fetchAllNoticesAndCases();
  }, []);

  const fetchAllNoticesAndCases = async () => {
    try {
      setLoading(true);
      const [casesRes, noticesRes] = await Promise.all([
        employerAPI.getDeficiencyCases().catch(() => ({ data: [] })),
        employerAPI.getMyNotices().catch(() => ({ data: [] })),
      ]);
      setDeficiencyCases(casesRes.data || []);
      setNotices(noticesRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load statutory deficiency notices');
    } finally {
      setLoading(false);
    }
  };

  // Group multiple deficiency notices/cases by single target product
  const productGroups = useMemo(() => {
    const map = {};
    deficiencyCases.forEach((c) => {
      const key = c.application_id || c.product_name;
      if (!map[key]) {
        map[key] = {
          application_id: c.application_id,
          product_name: c.product_name,
          brand: c.brand,
          category: c.category,
          packaging_type: c.packaging_type,
          declared_mrp: c.declared_mrp,
          declared_net_quantity: c.declared_net_quantity,
          artwork_file_path: c.artwork_file_path,
          image_url: c.image_url,
          days_remaining: c.days_remaining,
          sla_deadline: c.sla_deadline,
          is_overdue: c.is_overdue,
          cases: [],
          all_violations: [],
          all_directives: [],
          latest_response_notes: c.manufacturer_response_notes,
          latest_version: c.versions && c.versions.length > 0 ? c.versions[0] : null,
          status: c.status,
          certificate_number: c.certificate_number || `LMPC/CERT/2026/${c.application_id || 101}`,
        };
      }
      map[key].cases.push(c);

      // Collect memo directive text
      if (c.memo_text && !map[key].all_directives.includes(c.memo_text)) {
        map[key].all_directives.push(c.memo_text);
      }

      // Collect itemized violations
      if (c.violations && c.violations.length > 0) {
        c.violations.forEach((v) => {
          if (!map[key].all_violations.some((ex) => (ex.rule_code === v.rule_code && ex.title === v.title))) {
            map[key].all_violations.push(v);
          }
        });
      }
      if (c.deficiencies && c.deficiencies.length > 0) {
        c.deficiencies.forEach((d) => {
          if (!map[key].all_violations.some((ex) => ex.title === d)) {
            map[key].all_violations.push({ title: d, rule_code: 'LMPC-RULE-06', severity: 'major', description: d });
          }
        });
      }

      if (c.manufacturer_response_notes) {
        map[key].latest_response_notes = c.manufacturer_response_notes;
      }
      if (c.versions && c.versions.length > 0) {
        if (!map[key].latest_version || c.versions[0].version_number > map[key].latest_version.version_number) {
          map[key].latest_version = c.versions[0];
        }
      }
      if (c.days_remaining < map[key].days_remaining) {
        map[key].days_remaining = c.days_remaining;
        map[key].sla_deadline = c.sla_deadline;
      }
      if (c.status === 'RESPONSE_RECEIVED') {
        map[key].status = 'RESPONSE_RECEIVED';
      }
      if (c.status === 'RESOLVED') {
        map[key].status = 'RESOLVED';
      }
    });

    return Object.values(map);
  }, [deficiencyCases]);

  // Tab Filtering & Search
  const filteredGroups = useMemo(() => {
    return productGroups.filter((g) => {
      const isResolved = g.cases.every((c) => c.status === 'RESOLVED') || g.status === 'RESOLVED';
      const isResponseReceived = !isResolved && (g.status === 'RESPONSE_RECEIVED' || Boolean(g.latest_response_notes));
      const isActionRequired = !isResolved && !isResponseReceived;

      // Tab match
      if (activeTab === 'action_required' && !isActionRequired) return false;
      if (activeTab === 'in_verification' && !isResponseReceived) return false;
      if (activeTab === 'resolved' && !isResolved) return false;

      // Search query match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesProduct = (g.product_name || '').toLowerCase().includes(q);
        const matchesBrand = (g.brand || '').toLowerCase().includes(q);
        const matchesCase = g.cases.some((c) => (c.case_number || '').toLowerCase().includes(q));
        const matchesViolation = g.all_violations.some(
          (v) => (v.title || '').toLowerCase().includes(q) || (v.rule_code || '').toLowerCase().includes(q)
        );
        if (!matchesProduct && !matchesBrand && !matchesCase && !matchesViolation) return false;
      }

      return true;
    });
  }, [productGroups, activeTab, searchQuery]);

  // Tab Counts
  const counts = useMemo(() => {
    let actionReq = 0;
    let inVerif = 0;
    let resolved = 0;

    productGroups.forEach((g) => {
      const isResolved = g.cases.every((c) => c.status === 'RESOLVED') || g.status === 'RESOLVED';
      const isResponseReceived = !isResolved && (g.status === 'RESPONSE_RECEIVED' || Boolean(g.latest_response_notes));
      if (isResolved) {
        resolved += 1;
      } else if (isResponseReceived) {
        inVerif += 1;
      } else {
        actionReq += 1;
      }
    });

    return {
      all: productGroups.length,
      action_required: actionReq,
      in_verification: inVerif,
      resolved: resolved,
    };
  }, [productGroups]);

  const handleOpenRectificationModal = (group) => {
    setSelectedGroup(group);
    setReplyText(
      group.latest_response_notes ||
        'Statutory packaging label corrections applied to conform with Rule 6 & Schedule II font specifications. Rectified packaging proof attached.'
    );
    setDeclaredMrp(group.declared_mrp || '');
    setDeclaredNetQty(group.declared_net_quantity || '');
    setProofFiles([]);
  };

  const handleFileChange = (e) => {
    const incoming = Array.from(e.target.files || []);
    if (incoming.length > 0) {
      setProofFiles((prev) => [...prev, ...incoming]);
    }
  };

  const handleDownloadCertificate = async (group) => {
    try {
      setDownloadingCert(group.application_id);
      await reportsAPI.downloadClearancePDF(group.application_id, group.certificate_number);
      toast.success('Clearance certificate downloaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to download certificate.');
    } finally {
      setDownloadingCert(null);
    }
  };

  const handleDeficiencySubmit = async (e) => {
    e.preventDefault();
    if (!selectedGroup) return;
    if (!replyText.trim()) {
      toast.error('Please provide a statutory rectification explanation.');
      return;
    }

    try {
      setSubmitting(true);
      let uploadedArtworkUrl = selectedGroup.latest_version?.artwork_url || selectedGroup.artwork_file_path || selectedGroup.image_url;

      // Upload newly attached photos if selected
      if (proofFiles.length > 0) {
        toast.loading(`Uploading ${proofFiles.length} proof document(s)...`, { id: 'rect-up' });
        try {
          const formData = new FormData();
          proofFiles.forEach((f) => formData.append('files', f));
          const upRes = await employerAPI.uploadMultipleArtwork(formData);
          const urls = upRes.data?.artwork_urls || [upRes.data?.artwork_url];
          if (urls.length > 0 && urls[0]) {
            uploadedArtworkUrl = urls.length > 1 ? JSON.stringify(urls) : urls[0];
          }
        } catch (uploadErr) {
          console.warn('Direct upload fallback', uploadErr);
          for (const f of proofFiles) {
            try {
              const singleForm = new FormData();
              singleForm.append('file', f);
              const singleRes = await employerAPI.uploadArtwork(singleForm);
              if (singleRes.data?.artwork_url) {
                uploadedArtworkUrl = singleRes.data.artwork_url;
                break;
              }
            } catch (e2) {}
          }
        } finally {
          toast.dismiss('rect-up');
        }
      }

      const payload = {
        response_notes: replyText.trim(),
        corrective_artwork_url: uploadedArtworkUrl,
        declared_mrp: declaredMrp ? parseFloat(declaredMrp) : null,
        declared_net_quantity: declaredNetQty || null,
      };

      // Submit response for all associated case numbers under this product
      await Promise.all(
        selectedGroup.cases.map((c) => employerAPI.respondDeficiencyCase(c.id, payload))
      );

      toast.success('Rectification proof and statements submitted to Directorate for verification!');
      setSelectedGroup(null);
      await fetchAllNoticesAndCases();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to submit rectification response.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-md text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 text-indigo-300 font-bold text-lg mb-1">
              <ShieldAlert className="w-6 h-6 text-amber-400" />
              <span>Product Violations & Statutory Verification Desk</span>
            </div>
            <p className="text-sm text-slate-200 max-w-3xl">
              Comprehensive Directorate compliance audit dashboard for product-line violations, statutory packaging rectifications, proof uploads, and final Directorate clearance endorsements.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 shrink-0">
            <div className="text-right">
              <div className="text-3xs uppercase font-extrabold tracking-wider text-indigo-200">Compliance Health</div>
              <div className="text-sm font-black text-emerald-400">
                {counts.resolved}/{counts.all} Products Cleared
              </div>
            </div>
            <Award className="w-8 h-8 text-amber-400" />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Header */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>All Products Audited</span>
            <span className={`text-3xs px-2 py-0.5 rounded-full font-mono ${activeTab === 'all' ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'}`}>
              {counts.all}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('action_required')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'action_required'
                ? 'bg-amber-600 text-white shadow-xs shadow-amber-600/30'
                : 'text-amber-800 hover:bg-amber-50'
            }`}
          >
            <span>Action Required (Active Breaches)</span>
            <span className={`text-3xs px-2 py-0.5 rounded-full font-mono ${activeTab === 'action_required' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-900'}`}>
              {counts.action_required}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('in_verification')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'in_verification'
                ? 'bg-blue-600 text-white shadow-xs shadow-blue-600/30'
                : 'text-blue-800 hover:bg-blue-50'
            }`}
          >
            <span>In Directorate Verification</span>
            <span className={`text-3xs px-2 py-0.5 rounded-full font-mono ${activeTab === 'in_verification' ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-900'}`}>
              {counts.in_verification}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('resolved')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'resolved'
                ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30'
                : 'text-emerald-800 hover:bg-emerald-50'
            }`}
          >
            <span>Verified & Cleared Compliant</span>
            <span className={`text-3xs px-2 py-0.5 rounded-full font-mono ${activeTab === 'resolved' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-900'}`}>
              {counts.resolved}
            </span>
          </button>
        </div>

        {/* Search Box */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search product, brand, rule, case ref..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-none font-medium"
          />
        </div>
      </div>

      {/* Main Single Product Violations List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 font-medium bg-white rounded-3xl border border-slate-200">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
          <span>Loading product violations and verification desk...</span>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="p-12 text-center text-slate-500 font-medium bg-white rounded-3xl border border-slate-200 space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-80" />
          <p className="font-bold text-slate-900">No Products in this Verification Category</p>
          <p className="text-xs text-slate-500">Try switching tabs or adjusting your search filters.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredGroups.map((group, gIdx) => {
            const isResolved = group.cases.every((c) => c.status === 'RESOLVED') || group.status === 'RESOLVED';
            const isResponseReceived = !isResolved && (group.status === 'RESPONSE_RECEIVED' || Boolean(group.latest_response_notes));
            const isOverdue = group.is_overdue;
            const proofImg = group.latest_version?.artwork_url || group.artwork_file_path || group.image_url;

            return (
              <div
                key={`prod-group-${group.application_id || 'app'}-${gIdx}`}
                className={`bg-white border-2 rounded-3xl p-6 shadow-sm space-y-5 transition-all ${
                  isResolved
                    ? 'border-emerald-200/90 hover:border-emerald-400 bg-gradient-to-b from-emerald-50/20 to-white'
                    : isResponseReceived
                    ? 'border-blue-200 hover:border-blue-400'
                    : isOverdue
                    ? 'border-rose-300 hover:border-rose-500'
                    : 'border-slate-200 hover:border-amber-400'
                }`}
              >
                {/* Product Header & SLA / Verification Status */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200">
                  <div className="flex items-start gap-4">
                    {/* Packaging Thumbnail with Lightbox */}
                    <div
                      onClick={() => setZoomImageUrl(proofImg)}
                      className="w-16 h-16 rounded-2xl bg-slate-950 overflow-hidden border border-slate-300 shrink-0 flex items-center justify-center relative shadow-inner cursor-zoom-in group/thumb"
                      title="Click to Zoom Packaging Artwork"
                    >
                      <img
                        src={proofImg || '/uploads/artwork_sample.png'}
                        alt={group.product_name}
                        onError={(e) => {
                          if (!e.target.src.includes('artwork_sample.png')) {
                            e.target.src = '/uploads/artwork_sample.png';
                          }
                        }}
                        className="w-full h-full object-contain p-1 group-hover/thumb:scale-105 transition-transform"
                      />
                      <span className="absolute bottom-0 inset-x-0 bg-slate-950/80 text-white text-[7px] font-bold text-center py-0.5 font-mono">
                        {group.latest_version ? `VER. ${group.latest_version.version_number}` : 'ORIGINAL'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-slate-900 text-base">{group.product_name}</span>
                        {group.cases.map((c) => (
                          <span
                            key={c.id}
                            className={`text-3xs font-mono font-bold px-2 py-0.5 rounded border ${
                              isResolved
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : 'bg-amber-100 text-amber-900 border-amber-300'
                            }`}
                          >
                            {c.case_number}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs text-slate-600">
                        Brand: <strong>{group.brand}</strong> • Packaging: <span className="capitalize">{group.packaging_type || 'Package'}</span> • Declared MRP: <strong>₹{group.declared_mrp || 0}</strong> • Net Qty: <strong>{group.declared_net_quantity || 'N/A'}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <span
                      className={`text-xs px-3.5 py-1.5 rounded-full font-extrabold border uppercase shadow-2xs inline-flex items-center gap-1.5 ${
                        isResolved
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : isResponseReceived
                          ? 'bg-blue-100 text-blue-900 border-blue-300'
                          : isOverdue
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}
                    >
                      {isResolved ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Resolved & Verified Compliant</span>
                        </>
                      ) : isResponseReceived ? (
                        <>
                          <FileCheck className="w-4 h-4 text-blue-600" />
                          <span>Rectification Submitted • In Verification</span>
                        </>
                      ) : isOverdue ? (
                        <>
                          <Clock className="w-4 h-4 text-rose-600" />
                          <span>15-Day SLA Overdue</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 text-amber-600" />
                          <span>{group.days_remaining} Days Left to Respond</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Section 1: Detected Packaging Violations & Verification Checklist */}
                <div className={`p-4 rounded-2xl border text-xs space-y-3 ${
                  isResolved ? 'bg-emerald-50/40 border-emerald-200' : 'bg-rose-50/70 border-rose-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className={`font-black flex items-center gap-1.5 uppercase text-3xs tracking-wider ${
                      isResolved ? 'text-emerald-950' : 'text-rose-950'
                    }`}>
                      {isResolved ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>
                        {isResolved
                          ? `All Statutory Violations Cleared & Verified (${group.all_violations.length || 1})`
                          : `Statutory Violations Cited for this Product (${group.all_violations.length || group.all_directives.length})`}
                      </span>
                    </div>

                    {!isResolved && (
                      <span className="text-3xs font-mono text-slate-500">
                        Deadline: <strong className={isOverdue ? 'text-rose-600' : 'text-slate-800'}>{group.sla_deadline}</strong>
                      </span>
                    )}
                  </div>

                  {/* Violations Pill Badges with Individual Verification Tag */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.all_violations.map((v, vIdx) => {
                      const sev = (v.severity || '').toLowerCase();
                      return (
                        <div
                          key={vIdx}
                          className={`bg-white p-3 rounded-xl border flex items-start justify-between gap-2 shadow-2xs ${
                            isResolved ? 'border-emerald-200' : 'border-rose-100'
                          }`}
                        >
                          <div>
                            <div className="font-extrabold text-slate-900 flex items-center gap-1.5 flex-wrap">
                              <span className={`font-mono font-bold ${isResolved ? 'text-emerald-700' : 'text-rose-700'}`}>
                                {v.rule_code || 'RULE-06'}
                              </span>
                              <span>•</span>
                              <span>{v.title || 'Infraction'}</span>
                            </div>
                            <p className="text-3xs text-slate-600 mt-1 leading-relaxed">{v.description || v.recommendation}</p>

                            {/* Individual Verification Status Tag */}
                            <div className="mt-2 flex items-center gap-1.5">
                              <span className="text-4xs font-bold uppercase text-slate-400">Status:</span>
                              <span
                                className={`text-4xs font-black px-2 py-0.5 rounded-md uppercase font-mono ${
                                  isResolved
                                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                    : isResponseReceived
                                    ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                                }`}
                              >
                                {isResolved
                                  ? '✓ Verified & Cleared'
                                  : isResponseReceived
                                  ? 'Proof Under Verification'
                                  : 'Pending Rectification'}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`text-4xs font-black px-2 py-0.5 rounded uppercase border shrink-0 ${
                              isResolved
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : sev === 'critical'
                                ? 'bg-rose-100 text-rose-900 border-rose-300'
                                : 'bg-amber-100 text-amber-900 border-amber-300'
                            }`}
                          >
                            {isResolved ? 'CLEARED' : v.severity || 'BREACH'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Official Directives Summary */}
                  {group.all_directives.map((dir, dIdx) => (
                    <div
                      key={dIdx}
                      className={`p-3 rounded-xl border text-xs ${
                        isResolved ? 'bg-white border-emerald-200' : 'bg-white/80 border-rose-200/80'
                      }`}
                    >
                      <span className={`font-extrabold uppercase text-4xs block mb-0.5 ${
                        isResolved ? 'text-emerald-900' : 'text-rose-900'
                      }`}>
                        Directorate Deficiency Directive #{dIdx + 1}:
                      </span>
                      <p className="text-slate-800 italic text-2xs leading-relaxed font-medium">"{dir}"</p>
                    </div>
                  ))}
                </div>

                {/* Section 2: Uploaded Rectification Proof & Brand Statement (If Submitted) */}
                {group.latest_response_notes && (
                  <div className={`p-4 rounded-2xl border text-xs space-y-3 ${
                    isResolved ? 'bg-emerald-50/60 border-emerald-200' : 'bg-indigo-50/70 border-indigo-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className={`font-black flex items-center gap-1.5 uppercase text-3xs tracking-wider ${
                        isResolved ? 'text-emerald-950' : 'text-indigo-950'
                      }`}>
                        <FileCheck className={`w-4 h-4 shrink-0 ${isResolved ? 'text-emerald-600' : 'text-indigo-600'}`} />
                        <span>Brand Owner Uploaded Rectification Proof & Statements</span>
                      </div>
                      <span className={`text-3xs font-mono font-bold px-2 py-0.5 rounded-full ${
                        isResolved ? 'bg-emerald-200/70 text-emerald-950' : 'bg-indigo-200/70 text-indigo-950'
                      }`}>
                        {group.latest_version ? `Version ${group.latest_version.version_number} Attached` : 'Proof Attached'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                      {/* Rectified Artwork Photo Thumbnail */}
                      <div
                        onClick={() => setZoomImageUrl(proofImg)}
                        className="sm:col-span-4 h-32 rounded-xl bg-slate-950 overflow-hidden border border-slate-300 relative group/zoom cursor-zoom-in flex items-center justify-center shadow-xs"
                        title="Click to Zoom Corrected Packaging"
                      >
                        <img
                          src={proofImg || '/uploads/artwork_sample.png'}
                          alt="Rectified Artwork Proof"
                          className="w-full h-full object-contain p-1 group-hover/zoom:scale-105 transition-transform"
                        />
                        <div className="absolute top-1.5 right-1.5 bg-slate-900/90 text-white p-1 rounded-md">
                          <Maximize2 className="w-3 h-3" />
                        </div>
                        <div className="absolute bottom-1 left-1 right-1 bg-slate-950/85 backdrop-blur-xs px-2 py-0.5 rounded text-4xs text-emerald-300 font-mono flex items-center justify-between">
                          <span>RECTIFIED ARTWORK</span>
                          <span>✓ ATTACHED</span>
                        </div>
                      </div>

                      {/* Brand Statement & Rectified Declarations */}
                      <div className="sm:col-span-8 space-y-2">
                        <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs">
                          <span className="text-indigo-950 font-bold uppercase text-3xs block mb-0.5">
                            Brand Rectification Statement:
                          </span>
                          <p className="text-slate-800 italic text-2xs leading-relaxed">
                            "{group.latest_response_notes}"
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-2xs">
                          <div className="bg-white/80 p-2 rounded-lg border border-slate-200">
                            <span className="text-slate-500 font-bold block text-3xs uppercase">Rectified MRP:</span>
                            <span className="font-black text-slate-900">₹{group.declared_mrp || 'N/A'}</span>
                          </div>
                          <div className="bg-white/80 p-2 rounded-lg border border-slate-200">
                            <span className="text-slate-500 font-bold block text-3xs uppercase">Rectified Net Qty:</span>
                            <span className="font-black text-slate-900">{group.declared_net_quantity || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions Bar tailored specifically for Verification vs Action Required */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProductDetails({
                        id: group.application_id,
                        product_name: group.product_name,
                        brand: group.brand,
                        category: group.category,
                        packaging_type: group.packaging_type,
                        declared_mrp: group.declared_mrp,
                        declared_net_quantity: group.declared_net_quantity,
                        artwork_file_path: proofImg,
                        image_url: proofImg,
                        status: group.status,
                        violations: group.all_violations,
                      });
                    }}
                    className="text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Inspect Full Product Dossier & Optical Scan</span>
                  </button>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {isResolved ? (
                      <button
                        type="button"
                        onClick={() => handleDownloadCertificate(group)}
                        disabled={downloadingCert === group.application_id}
                        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {downloadingCert === group.application_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        <span>Download Statutory Clearance Certificate</span>
                      </button>
                    ) : isResponseReceived ? (
                      <button
                        type="button"
                        onClick={() => handleOpenRectificationModal(group)}
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Update Uploaded Rectification Proof</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenRectificationModal(group)}
                        className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-amber-600/30 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Submit the Necessary Documents</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Universal Product Details Modal */}
      {selectedProductDetails && (
        <ProductDetailModal
          product={selectedProductDetails}
          onClose={() => setSelectedProductDetails(null)}
        />
      )}

      {/* Modal: Submit 15-Day Rectification Proof for Single Product */}
      {selectedGroup && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-fade-in text-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-amber-600" />
                  <span>Submit Rectification Proof for Product</span>
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Target Product: <strong>{selectedGroup.product_name}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedGroup(null)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDeficiencySubmit} className="space-y-4 text-xs">
              {/* Product & Violations Summary Box */}
              <div className="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200 space-y-2">
                <span className="font-extrabold text-amber-950 uppercase text-3xs block">
                  Violations Being Rectified ({selectedGroup.all_violations.length}):
                </span>
                <div className="space-y-1">
                  {selectedGroup.all_violations.map((v, i) => (
                    <div key={i} className="text-2xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <span className="font-mono text-amber-800 font-bold">• {v.rule_code || 'RULE-06'}:</span>
                      <span>{v.title}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upload Corrected Packaging Artwork */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 uppercase text-3xs">
                  Upload Rectified Packaging Artwork Photo / Proof Document *
                </label>
                <div className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl p-4 text-center transition-all bg-slate-50 relative">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  />
                  {proofFiles.length > 0 ? (
                    <div className="space-y-2 relative z-20">
                      <div className="flex items-center gap-2 flex-wrap justify-center">
                        {proofFiles.map((f, idx) => (
                          <div key={idx} className="relative w-16 h-16 rounded-xl border border-slate-300 overflow-hidden bg-slate-900">
                            {f.type && f.type.startsWith('image/') ? (
                              <img src={URL.createObjectURL(f)} alt={`Proof ${idx + 1}`} className="w-full h-full object-cover" />
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full text-slate-300 text-4xs p-1 text-center font-mono">
                                <span>DOC</span>
                                <span className="truncate w-full">{f.name}</span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setProofFiles((prev) => prev.filter((_, i) => i !== idx));
                              }}
                              className="absolute top-0.5 right-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full w-4 h-4 flex items-center justify-center text-4xs font-bold z-30"
                              title="Remove"
                            >
                              ✕
                            </button>
                            <span className="absolute bottom-0 left-0 bg-slate-900/80 text-white font-mono text-5xs px-1 rounded-tr">
                              #{idx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                      <span className="text-3xs text-emerald-600 font-bold block">
                        ✓ {proofFiles.length} proof document/image(s) attached. Click or drop to add more.
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1 text-slate-500">
                      <Upload className="w-6 h-6 mx-auto text-amber-600" />
                      <p className="font-bold text-slate-800">Click or drag & drop rectified packaging artwork & proofs</p>
                      <p className="text-3xs text-slate-500">PNG, JPG, WEBP, or PDF (Select Multiple Files)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Declared MRP & Net Qty */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">Rectified Declared MRP (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={declaredMrp}
                    onChange={(e) => setDeclaredMrp(e.target.value)}
                    placeholder="e.g. 25.00"
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">Rectified Declared Net Qty</label>
                  <input
                    type="text"
                    value={declaredNetQty}
                    onChange={(e) => setDeclaredNetQty(e.target.value)}
                    placeholder="e.g. 200g"
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* Brand Owner Rectification Statement */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-3xs">
                  Brand Owner Statutory Rectification Statement *
                </label>
                <textarea
                  rows={3}
                  required
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Detail the statutory rectifications made (e.g. Updated manufacturer postal address, resized net weight font to conform with Schedule II)..."
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedGroup(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-800 font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold shadow-md shadow-amber-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Submit the Necessary Documents</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: High-Definition Document Zoom Lightbox */}
      {zoomImageUrl && (
        <div
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-70 flex flex-col items-center justify-center p-4 animate-fade-in"
          onClick={() => setZoomImageUrl(null)}
        >
          <div
            className="relative bg-slate-900 border border-slate-700 rounded-3xl p-4 max-w-5xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 text-white">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <span className="font-extrabold text-sm">
                  Packaging Artwork & Rectification Proof — High Definition Inspection
                </span>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={zoomImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in New Tab</span>
                </a>
                <button
                  onClick={() => setZoomImageUrl(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 w-full h-full min-h-0 bg-slate-950/60 rounded-2xl flex items-center justify-center p-2 overflow-hidden border border-slate-800">
              <img
                src={zoomImageUrl}
                alt="High-Res Packaging Evidence"
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
