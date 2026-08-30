import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Calculator,
  ShieldCheck,
  ArrowRight,
  Package,
  AlertCircle,
  Tag,
  Loader2,
  FileText,
  Check,
  X,
  Layers,
} from 'lucide-react';
import { employerAPI, scanAPI } from '../../../services/api';
import toast from 'react-hot-toast';

export default function PreMarketWorkbench() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [productName, setProductName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('food');
  const [packagingType, setPackagingType] = useState('Pouch / Packet');
  const [declaredMrp, setDeclaredMrp] = useState('');
  const [declaredNetQty, setDeclaredNetQty] = useState('');
  const [files, setFiles] = useState([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingStep, setAnalyzingStep] = useState('');
  const [selfTestResult, setSelfTestResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const previews = React.useMemo(() => {
    return files.map((f) => URL.createObjectURL(f));
  }, [files]);

  const handleFiles = (incoming) => {
    const valid = incoming.filter((f) => f && f.type && f.type.startsWith('image/'));
    if (valid.length === 0) {
      toast.error('Please select valid image file(s) (JPEG, PNG).');
      return;
    }
    setFiles((prev) => {
      const next = [...prev, ...valid];
      setActivePreviewIndex(next.length - 1);
      return next;
    });
    setSelfTestResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleRunSelfTest = async () => {
    const targetFile = files[activePreviewIndex] || files[0];
    if (!targetFile) {
      toast.error('Please upload or select packaging artwork image(s) first.');
      return;
    }
    try {
      setAnalyzing(true);
      setAnalyzingStep('Uploading and preprocessing packaging artwork...');

      const formData = new FormData();
      formData.append('file', targetFile);
      formData.append('product_name', productName || 'Pre-Market Packaging Sample');
      formData.append('brand', brand || 'Registered Brand');
      formData.append('category', category);

      setAnalyzingStep('Running Windows Optical Character Recognition & Entity Extraction...');
      const res = await scanAPI.create(formData);

      setAnalyzingStep('Evaluating Rule 6 & Schedule II Font Proportions...');
      setSelfTestResult(res.data);
      toast.success('Artwork self-verification completed successfully!');
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || 'Automated label analysis failed. Please try again.';
      toast.error(msg);
    } finally {
      setAnalyzing(false);
      setAnalyzingStep('');
    }
  };

  const handleSubmitClearance = async () => {
    if (!productName || !brand) {
      toast.error('Please enter product name and brand.');
      return;
    }
    try {
      setSubmitting(true);
      let targetScanId = selfTestResult?.id || null;
      let uploadedUrls = [];

      if (files.length > 0) {
        toast.loading(`Uploading ${files.length} packaging artwork image(s)...`, { id: 'sub-upload' });
        try {
          const formData = new FormData();
          files.forEach((f) => formData.append('files', f));
          const upRes = await employerAPI.uploadMultipleArtwork(formData);
          uploadedUrls = upRes.data?.artwork_urls || [];
          if (uploadedUrls.length === 0 && upRes.data?.artwork_url) {
            uploadedUrls = [upRes.data.artwork_url];
          }
        } catch (uploadErr) {
          console.warn('Batch upload fallback to single upload', uploadErr);
          for (const f of files) {
            try {
              const singleForm = new FormData();
              singleForm.append('file', f);
              const singleRes = await employerAPI.uploadArtwork(singleForm);
              if (singleRes.data?.artwork_url) uploadedUrls.push(singleRes.data.artwork_url);
            } catch (sErr) {}
          }
        } finally {
          toast.dismiss('sub-upload');
        }
      }

      if (selfTestResult?.image_url && !uploadedUrls.includes(selfTestResult.image_url)) {
        uploadedUrls.unshift(selfTestResult.image_url);
      }

      const primaryUrl = uploadedUrls[0] || '/uploads/artwork_sample.png';

      const res = await employerAPI.submitPreMarket({
        product_name: productName,
        brand: brand,
        category: category,
        packaging_type: packagingType,
        declared_mrp: parseFloat(declaredMrp) || 0,
        declared_net_quantity: declaredNetQty,
        artwork_file_path: primaryUrl,
        artwork_urls: uploadedUrls,
        scan_id: targetScanId,
      });
      toast.success(res.data?.message || 'Clearance application submitted to Directorate queue!');
      navigate('/employer/applications');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to submit clearance application.');
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-md text-white">
        <div className="flex items-center gap-2.5 text-indigo-300 font-bold text-lg mb-1">
          <Sparkles className="w-6 h-6 text-emerald-400" />
          <span>Pre-Market Packaging Artwork Verification & Clearance Workbench</span>
        </div>
        <p className="text-sm text-slate-200">
          Upload pre-press packaging artwork for instant AI verification against LMPC Rule 6 mandatory declarations and Schedule II font rules before submitting for official Directorate Packaging Clearance.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Artwork Upload & Details */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-base">1. Packaging Artwork & Commodity Specifications</h3>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Product Title *</label>
              <input
                type="text"
                placeholder="e.g. Marie Gold Biscuits"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-semibold focus:bg-white focus:border-indigo-600 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Brand Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Britannia / Marie"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-semibold focus:bg-white focus:border-indigo-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Industry Sector *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-semibold focus:bg-white focus:border-indigo-600 focus:outline-none cursor-pointer"
                >
                  <option value="food">Food & Beverages</option>
                  <option value="cosmetics">Cosmetics & Personal Care</option>
                  <option value="pharma">Pharmaceuticals</option>
                  <option value="electronics">Electronics</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Declared MRP (₹)</label>
                <input
                  type="number"
                  placeholder="10.00"
                  value={declaredMrp}
                  onChange={(e) => setDeclaredMrp(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-semibold focus:bg-white focus:border-indigo-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Declared Net Qty</label>
                <input
                  type="text"
                  placeholder="100 g"
                  value={declaredNetQty}
                  onChange={(e) => setDeclaredNetQty(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-semibold focus:bg-white focus:border-indigo-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Packaging Format</label>
                <input
                  type="text"
                  placeholder="Packet / Pouch"
                  value={packagingType}
                  onChange={(e) => setPackagingType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-semibold focus:bg-white focus:border-indigo-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Artwork File Uploader */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700 uppercase text-xs">
                  Upload Packaging Artwork Photos *
                </label>
                <span className="text-3xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                  Multiple Angles Supported
                </span>
              </div>

              <div
                onDragEnter={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => previews.length === 0 && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all ${
                  dragActive
                    ? 'border-indigo-600 bg-indigo-50/80 shadow-md'
                    : 'border-slate-300 hover:border-indigo-500 bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
                  className="hidden"
                />

                {previews.length > 0 ? (
                  <div className="space-y-3">
                    {/* Primary Preview */}
                    <div className="relative inline-block max-h-52 rounded-xl overflow-hidden shadow-md border border-slate-200 bg-slate-900 mx-auto">
                      <img
                        src={previews[activePreviewIndex] || previews[0]}
                        alt="Artwork Preview"
                        className="max-h-52 object-contain mx-auto"
                      />
                      <div className="absolute top-2 left-2 bg-slate-900/80 text-white font-mono text-4xs px-2 py-0.5 rounded-full border border-white/10">
                        Active Sample: #{activePreviewIndex + 1} of {previews.length}
                      </div>
                    </div>

                    {/* Multi-Photo Thumbnail Strip */}
                    <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
                      {previews.map((pUrl, idx) => (
                        <div
                          key={idx}
                          onClick={() => setActivePreviewIndex(idx)}
                          className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                            activePreviewIndex === idx
                              ? 'border-indigo-600 ring-2 ring-indigo-500/30 scale-105 shadow-md'
                              : 'border-slate-300 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={pUrl} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFiles((prev) => prev.filter((_, i) => i !== idx));
                              setActivePreviewIndex((prev) => (prev > 0 ? prev - 1 : 0));
                            }}
                            className="absolute top-0.5 right-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full w-4 h-4 flex items-center justify-center text-4xs font-bold"
                            title="Remove photo"
                          >
                            ✕
                          </button>
                          <span className="absolute bottom-0 left-0 bg-slate-900/80 text-white font-mono text-5xs px-1 rounded-tr">
                            #{idx + 1}
                          </span>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-14 h-14 rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-white hover:bg-indigo-50/50 flex flex-col items-center justify-center text-slate-500 hover:text-indigo-600 transition-all cursor-pointer text-4xs font-bold gap-0.5"
                        title="Add more photos"
                      >
                        <Upload className="w-4 h-4" />
                        <span>+ Add</span>
                      </button>
                    </div>

                    <div className="text-2xs font-bold text-indigo-700">
                      Click thumbnails to select primary artwork for AI compliance test
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 py-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center mx-auto shadow-2xs">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-slate-900 font-extrabold text-sm">
                      Click or drop packaging artwork images here (Front, Back, Side PDPs)
                    </div>
                    <div className="text-2xs text-slate-500 font-medium">
                      Select multiple images (JPEG, PNG, WEBP)
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Run Automated Test Button */}
            <button
              type="button"
              onClick={handleRunSelfTest}
              disabled={analyzing || files.length === 0}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 rounded-xl transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{analyzingStep || 'Evaluating Artwork Declarations...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Run Automated Pre-Market Self-Test</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: AI Analysis Result & Application Submit */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base mb-3">2. Rule 6 Statutory Compliance Analysis</h3>

            {!selfTestResult ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center text-slate-500 space-y-3">
                <Calculator className="w-12 h-12 text-indigo-400 mx-auto opacity-70" />
                <p className="text-xs font-medium leading-relaxed">
                  Fill in commodity specifications and upload your label artwork (or click a sample preset above), then click <strong>"Run Automated Pre-Market Self-Test"</strong>.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Score Banner */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500 font-bold uppercase">Estimated Compliance Score:</span>
                    <div className="text-2xl font-extrabold text-indigo-700 mt-0.5">
                      {selfTestResult.compliance_score !== null ? `${selfTestResult.compliance_score}%` : 'Evaluated'}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-bold uppercase border ${
                      selfTestResult.status === 'compliant'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}
                  >
                    {selfTestResult.status}
                  </span>
                </div>

                {/* Extracted Fields Table */}
                {selfTestResult.extracted_fields?.length > 0 && (
                  <div className="text-xs space-y-2">
                    <div className="font-bold text-slate-800 uppercase tracking-wider">Detected Declarations:</div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 font-medium max-h-44 overflow-y-auto">
                      {selfTestResult.extracted_fields.map((f, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-200/60 last:border-none">
                          <span className="font-semibold text-slate-700 capitalize">
                            {f.display_name || f.field_id?.replace(/_/g, ' ')}:
                          </span>
                          <span className="font-bold text-slate-900 max-w-[220px] truncate text-right">
                            {f.value || 'Detected / Verified'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Violations List */}
                {selfTestResult.violations?.length > 0 ? (
                  <div className="text-xs space-y-2">
                    <div className="font-bold text-rose-800 uppercase tracking-wider">
                      Flagged Non-Compliances ({selfTestResult.violations.length}):
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {selfTestResult.violations.map((v, idx) => (
                        <div key={idx} className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-2xs text-rose-900 space-y-0.5">
                          <div className="font-bold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span>{v.title}</span>
                          </div>
                          <p className="text-slate-700">{v.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>All Rule 6 Mandatory Declarations & Font Sizes Compliant!</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submit Formal Application */}
          <div className="pt-4 border-t border-slate-200">
            <button
              onClick={handleSubmitClearance}
              disabled={submitting || !productName}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>{submitting ? 'Submitting Application...' : 'Apply for Official Packaging Clearance Certificate'}</span>
              <ArrowRight className="w-4 h-4 ml-auto" />
            </button>
            <p className="text-2xs text-slate-500 text-center mt-2">
              Submitted applications are queued for executive review by the Directorate Supervisor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
