import { useState } from 'react';
import {
  Settings, Sliders, Shield, Scale, Cpu, Save, CheckCircle2,
  Info, Database, RefreshCw, AlertCircle
} from 'lucide-react';

export default function SettingsPage() {
  const [tolerance, setTolerance] = useState(10);
  const [ocrEngine, setOcrEngine] = useState('tesseract');
  const [ocrLanguage, setOcrLanguage] = useState('hin+eng');
  const [confidenceThreshold, setConfidenceThreshold] = useState(60);
  const [calibrationTier, setCalibrationTier] = useState('relative');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem('lmpc_settings', JSON.stringify({
      tolerance, ocrEngine, ocrLanguage, confidenceThreshold, calibrationTier
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">System Settings & Calibration</h1>
        <p className="text-sm text-text-secondary mt-1">
          Configure rule engine tolerances, OCR engines, and statutory Schedule II parameters
        </p>
      </div>

      {saved && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
          <span>Settings saved successfully! Changes apply to all future scans.</span>
        </div>
      )}

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Rule Engine & Font Calibration */}
        <div className="bg-white rounded-card border border-surface-border p-6 shadow-card space-y-5">
          <div className="flex items-center gap-3 border-b border-surface-border pb-3">
            <Scale className="text-primary-600" size={20} />
            <div>
              <h3 className="text-sm font-bold text-text-primary">Rule Engine & Tolerance Band</h3>
              <p className="text-xs text-text-muted">LMPC Rule 9 / Schedule II settings</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-text-primary">Borderline Tolerance Band</span>
              <span className="font-bold text-primary-600">±{tolerance}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="25"
              step="1"
              value={tolerance}
              onChange={(e) => setTolerance(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />
            <p className="text-[11px] text-text-muted mt-1">
              Measurements within ±{tolerance}% of legal minimum are marked as <strong>Borderline</strong> instead of a hard violation.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Default Calibration Strategy
            </label>
            <select
              value={calibrationTier}
              onChange={(e) => setCalibrationTier(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-light border border-surface-border text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-200"
            >
              <option value="relative">Tier 1: Relative Ratio (Auto-estimated from net quantity)</option>
              <option value="calibrated">Tier 2: Reference Object Calibration (Coin, Credit Card, Marker)</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-text-primary">Confidence Review Threshold</span>
              <span className="font-bold text-primary-600">{confidenceThreshold}%</span>
            </div>
            <input
              type="range"
              min="30"
              max="90"
              step="5"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />
            <p className="text-[11px] text-text-muted mt-1">
              Fields extracted with confidence below {confidenceThreshold}% trigger automatic <strong>REQUIRES_MANUAL_REVIEW</strong> verdict.
            </p>
          </div>
        </div>

        {/* Card 2: OCR Engine & Multilingual Settings */}
        <div className="bg-white rounded-card border border-surface-border p-6 shadow-card space-y-5">
          <div className="flex items-center gap-3 border-b border-surface-border pb-3">
            <Cpu className="text-primary-600" size={20} />
            <div>
              <h3 className="text-sm font-bold text-text-primary">OCR Engine & Languages</h3>
              <p className="text-xs text-text-muted">Optical Character Recognition Pipeline</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Primary OCR Engine
            </label>
            <select
              value={ocrEngine}
              onChange={(e) => setOcrEngine(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-light border border-surface-border text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-200"
            >
              <option value="tesseract">Tesseract OCR (Offline, Multi-PSM Auto-selection)</option>
              <option value="google_vision">Google Cloud Vision API (Cloud Fallback)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              OCR Languages
            </label>
            <select
              value={ocrLanguage}
              onChange={(e) => setOcrLanguage(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-light border border-surface-border text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-200"
            >
              <option value="hin+eng">English + Hindi (hin+eng - Default)</option>
              <option value="eng">English only (eng)</option>
              <option value="hin+eng+tam+tel">Multilingual (English, Hindi, Tamil, Telugu)</option>
            </select>
          </div>

          <div className="p-3 rounded-xl bg-surface-light border border-surface-border text-xs space-y-1 text-text-secondary">
            <p className="font-semibold text-text-primary flex items-center gap-1">
              <Info size={14} className="text-primary-600" />
              Pre-processing Active:
            </p>
            <p>• Bilateral noise filtering & adaptive OTSU thresholding</p>
            <p>• Auto-deskewing (Hough Transform ±45°)</p>
            <p>• Multi-PSM consensus (modes 3, 6, 11)</p>
          </div>
        </div>
      </div>

      {/* Schedule II Reference Table */}
      <div className="bg-white rounded-card border border-surface-border p-6 shadow-card">
        <h3 className="text-sm font-bold text-text-primary mb-1">
          Statutory Schedule II — Minimum Height of Numerals & Letters
        </h3>
        <p className="text-xs text-text-muted mb-4">
          Legal Metrology (Packaged Commodities) Rules, 2011 (Rule 9 Table)
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-surface-border bg-surface-light">
                <th className="py-2.5 px-4 font-semibold text-text-muted">Net Quantity Range (Weight / Volume)</th>
                <th className="py-2.5 px-4 font-semibold text-text-muted">Min Height (Normal Printed)</th>
                <th className="py-2.5 px-4 font-semibold text-text-muted">Min Height (Blown / Moulded)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              <tr>
                <td className="py-2.5 px-4 font-medium">Up to 50 g / ml</td>
                <td className="py-2.5 px-4 font-mono font-bold text-primary-700">1.0 mm</td>
                <td className="py-2.5 px-4 font-mono text-text-secondary">2.0 mm</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium">50 g / ml to 200 g / ml</td>
                <td className="py-2.5 px-4 font-mono font-bold text-primary-700">2.0 mm</td>
                <td className="py-2.5 px-4 font-mono text-text-secondary">4.0 mm</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium">200 g / ml to 1 kg / litre</td>
                <td className="py-2.5 px-4 font-mono font-bold text-primary-700">4.0 mm</td>
                <td className="py-2.5 px-4 font-mono text-text-secondary">6.0 mm</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium">Above 1 kg / litre</td>
                <td className="py-2.5 px-4 font-mono font-bold text-primary-700">6.0 mm</td>
                <td className="py-2.5 px-4 font-mono text-text-secondary">9.0 mm</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-xl text-xs font-semibold hover:bg-primary-700 transition shadow-sm"
        >
          <Save size={16} />
          Save Configuration
        </button>
      </div>
    </div>
  );
}
