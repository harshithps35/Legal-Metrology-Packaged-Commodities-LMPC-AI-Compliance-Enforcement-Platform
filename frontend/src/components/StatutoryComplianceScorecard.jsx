import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Scale, FileText } from 'lucide-react';

/**
 * StatutoryComplianceScorecard
 *
 * Professional executive compliance summary card codifying the core Legal Metrology checks:
 * - Rule 6: Mandatory Packaging Declarations
 * - Rule 11: Price Tampering / Secondary Sticker Detection
 * - Schedule II: Minimum Numeral & Font Height
 * - Rule 27: Manufacturer / Importer State Registration
 *
 * Provides instant clarity to evaluators, inspectors, and brand owners.
 */
export default function StatutoryComplianceScorecard({
  score = 100,
  violations = [],
  className = '',
  compact = false,
}) {
  // Determine compliance for each canonical statutory rule
  const rule6Violations = violations.filter((v) => {
    const code = (v.rule_code || v.rule || '').toLowerCase();
    const title = (v.title || '').toLowerCase();
    return code.includes('rule 6') || code.includes('rule6') || title.includes('declaration') || title.includes('mrp');
  });

  const rule11Violations = violations.filter((v) => {
    const code = (v.rule_code || v.rule || '').toLowerCase();
    const title = (v.title || '').toLowerCase();
    return code.includes('rule 11') || code.includes('rule11') || title.includes('price') || title.includes('tamper') || title.includes('sticker');
  });

  const scheduleIIViolations = violations.filter((v) => {
    const code = (v.rule_code || v.rule || '').toLowerCase();
    const title = (v.title || '').toLowerCase();
    return code.includes('schedule ii') || code.includes('schedule_ii') || code.includes('font') || title.includes('height') || title.includes('font');
  });

  const rule27Violations = violations.filter((v) => {
    const code = (v.rule_code || v.rule || '').toLowerCase();
    const title = (v.title || '').toLowerCase();
    return code.includes('rule 27') || code.includes('rule27') || title.includes('registration') || title.includes('license');
  });

  const ruleChecks = [
    {
      id: 'rule_6',
      label: 'Rule 6',
      subtitle: 'Mandatory Declarations (MRP, Net Qty, Mfg, Address)',
      passed: rule6Violations.length === 0,
      violationCount: rule6Violations.length,
      statute: 'Legal Metrology (PC) Rules, 2011',
    },
    {
      id: 'rule_11',
      label: 'Rule 11',
      subtitle: 'Price Alteration & Secondary Sticker Tampering',
      passed: rule11Violations.length === 0,
      violationCount: rule11Violations.length,
      statute: 'Rule 11(2)(c) & Sec 36',
    },
    {
      id: 'schedule_ii',
      label: 'Schedule II',
      subtitle: 'Minimum Numeral & Letter Height (≥ 1.0mm - 6.0mm)',
      passed: scheduleIIViolations.length === 0,
      violationCount: scheduleIIViolations.length,
      statute: 'Gazette Area Ratio Matrix',
    },
    {
      id: 'rule_27',
      label: 'Rule 27',
      subtitle: 'Manufacturer / Packer / Importer Registration',
      passed: rule27Violations.length === 0,
      violationCount: rule27Violations.length,
      statute: 'State LMPC Undertaking',
    },
  ];

  const overallPercentage = Math.max(0, Math.min(100, Math.round(score)));

  let scoreColorClass = 'text-emerald-600';
  let scoreBgClass = 'bg-emerald-50 border-emerald-200';
  let scoreBadgeClass = 'bg-emerald-600 text-white';

  if (overallPercentage < 60) {
    scoreColorClass = 'text-rose-600';
    scoreBgClass = 'bg-rose-50 border-rose-200';
    scoreBadgeClass = 'bg-rose-600 text-white';
  } else if (overallPercentage < 85) {
    scoreColorClass = 'text-amber-600';
    scoreBgClass = 'bg-amber-50 border-amber-200';
    scoreBadgeClass = 'bg-amber-600 text-white';
  }

  const criticalCount = violations.filter((v) => (v.severity || '').toUpperCase() === 'CRITICAL').length;
  const majorCount = violations.filter((v) => (v.severity || '').toUpperCase() === 'MAJOR').length;
  const minorCount = violations.filter((v) => (v.severity || '').toUpperCase() === 'MINOR').length;

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-4 px-6 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black tracking-wide uppercase text-white">
                Statutory Compliance Scorecard
              </h3>
              <span className="text-[10px] bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 px-2 py-0.5 rounded font-mono font-bold">
                LMPC 2011 AUDIT
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Automated Gazette Rule Engine Verdict &amp; Schedule II Alignment
            </p>
          </div>
        </div>

        {/* Overall Score Badge */}
        <div className="text-right">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Overall Verdict</div>
          <div className="flex items-baseline justify-end gap-1.5 mt-0.5">
            <span className="text-2xl font-black text-emerald-400">
              {overallPercentage}%
            </span>
            <span className="text-xs text-slate-400 font-medium">Compliance</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Rule Breakdown (Left 4 cols) + Overall Summary (Right) */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Rules Itemized Column */}
        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ruleChecks.map((rule) => (
            <div
              key={rule.id}
              className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                rule.passed
                  ? 'bg-emerald-50/60 border-emerald-200 hover:border-emerald-300'
                  : 'bg-rose-50/70 border-rose-200 hover:border-rose-300'
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="mt-0.5 shrink-0">
                  {rule.passed ? (
                    <CheckCircle2 size={20} className="text-emerald-600 fill-emerald-100" />
                  ) : (
                    <XCircle size={20} className="text-rose-600 fill-rose-100" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-900">{rule.label}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono uppercase ${
                        rule.passed
                          ? 'bg-emerald-200 text-emerald-900'
                          : 'bg-rose-200 text-rose-900'
                      }`}
                    >
                      {rule.passed ? 'PASSED' : 'FLAGGED'}
                    </span>
                  </div>
                  {!compact && (
                    <p className="text-[11px] text-slate-600 mt-1 line-clamp-1 leading-tight" title={rule.subtitle}>
                      {rule.subtitle}
                    </p>
                  )}
                  <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                    Ref: {rule.statute}
                  </p>
                </div>
              </div>

              {/* Status Mark */}
              <div className="text-right shrink-0">
                <span
                  className={`text-base font-extrabold ${
                    rule.passed ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {rule.passed ? '✔' : '❌'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Executive Overall Summary Box */}
        <div className="md:col-span-4 bg-slate-50 rounded-xl border border-slate-200 p-4 text-center flex flex-col justify-between h-full space-y-3">
          <div>
            <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
              Statutory Decision Gate
            </div>
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className={`text-4xl font-extrabold ${scoreColorClass}`}>
                {overallPercentage}%
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 mt-2.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-700 ${
                  overallPercentage >= 85
                    ? 'bg-emerald-500'
                    : overallPercentage >= 60
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${overallPercentage}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-600 font-medium mt-2">
              {overallPercentage >= 90
                ? '✅ Eligible for Statutory Clearance'
                : overallPercentage >= 70
                ? '⚠️ Actionable Deficiencies Flagged'
                : '❌ Critical Non-Compliance Detected'}
            </p>
          </div>

          {/* Severity Counters */}
          <div className="pt-2 border-t border-slate-200 grid grid-cols-3 gap-1.5 text-center">
            <div className="bg-rose-100/70 border border-rose-200/80 rounded-lg p-1.5">
              <div className="text-xs font-black text-rose-700">{criticalCount}</div>
              <div className="text-[9px] font-bold text-rose-600 uppercase">Critical</div>
            </div>
            <div className="bg-amber-100/70 border border-amber-200/80 rounded-lg p-1.5">
              <div className="text-xs font-black text-amber-700">{majorCount}</div>
              <div className="text-[9px] font-bold text-amber-600 uppercase">Major</div>
            </div>
            <div className="bg-indigo-100/70 border border-indigo-200/80 rounded-lg p-1.5">
              <div className="text-xs font-black text-indigo-700">{minorCount}</div>
              <div className="text-[9px] font-bold text-indigo-600 uppercase">Minor</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
