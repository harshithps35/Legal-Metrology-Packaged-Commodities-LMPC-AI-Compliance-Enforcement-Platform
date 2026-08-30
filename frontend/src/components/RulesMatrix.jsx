import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Filter, Calculator, Scale, AlertTriangle, ShieldCheck, Info } from 'lucide-react';
import { rulesAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function RulesMatrix({ categoryFilter = null }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(categoryFilter || 'all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');

  // Interactive Font Calculator state
  const [calcQty, setCalcQty] = useState(150);
  const [calcUnit, setCalcUnit] = useState('g');
  const [calcResult, setCalcResult] = useState({ min_mm: 2.0, rule: 'Schedule II, Table I (50g < Q <= 200g)' });

  useEffect(() => {
    fetchRules();
  }, [selectedCategory]);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const res = await rulesAPI.getCatalog(selectedCategory === 'all' ? null : selectedCategory);
      setRules(res.data);
    } catch (err) {
      console.error('Failed to load rules matrix', err);
      toast.error('Failed to load statutory rules matrix');
    } finally {
      setLoading(false);
    }
  };

  // Compute font size on quantity change
  const handleCalcChange = (qty, unit) => {
    setCalcQty(qty);
    setCalcUnit(unit);
    const num = parseFloat(qty) || 0;
    let grams = num;
    if (unit === 'kg' || unit === 'l') grams = num * 1000;

    let min_mm = 1.0;
    let rule = 'Schedule II, Table I';
    if (grams <= 50) {
      min_mm = 1.5;
      rule = 'Schedule II, Table I (Q <= 50g)';
    } else if (grams <= 200) {
      min_mm = 2.0;
      rule = 'Schedule II, Table I (50g < Q <= 200g)';
    } else if (grams <= 1000) {
      min_mm = 4.0;
      rule = 'Schedule II, Table I (200g < Q <= 1kg)';
    } else {
      min_mm = 6.0;
      rule = 'Schedule II, Table I (Q > 1kg)';
    }
    setCalcResult({ min_mm, rule });
  };

  const filteredRules = rules.filter((r) => {
    const matchesSearch =
      r.rule_code.toLowerCase().includes(search.toLowerCase()) ||
      r.statutory_title.toLowerCase().includes(search.toLowerCase()) ||
      r.legal_text.toLowerCase().includes(search.toLowerCase()) ||
      r.standard_specification.toLowerCase().includes(search.toLowerCase());
    const matchesSeverity = selectedSeverity === 'all' || r.severity === selectedSeverity;
    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="space-y-6">
      {/* Header & Font Calculator Card - High Contrast Crisp Styling */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-indigo-400/30 rounded-2xl p-6 shadow-md text-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2.5 text-indigo-300 font-bold text-base mb-1.5">
              <BookOpen className="w-5 h-5 text-indigo-300" />
              <span>Statutory Gazette Reference & Legal Standards Matrix</span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed max-w-2xl">
              Official Legal Metrology (Packaged Commodities) Rules, 2011 & Gazette Amendments. Single source of truth
              for mandatory labeling declarations and font thresholds.
            </p>
          </div>

          {/* Interactive Font Calculator Widget */}
          <div className="bg-slate-900/90 border border-indigo-400/40 rounded-xl p-3.5 flex flex-wrap items-center gap-3 shadow-inner">
            <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold uppercase tracking-wide">
              <Calculator className="w-4 h-4 text-amber-400" />
              <span>Schedule II Calculator:</span>
            </div>
            <input
              type="number"
              value={calcQty}
              onChange={(e) => handleCalcChange(e.target.value, calcUnit)}
              className="w-20 bg-white border border-slate-300 text-slate-900 font-bold text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
              placeholder="Qty"
            />
            <select
              value={calcUnit}
              onChange={(e) => handleCalcChange(calcQty, e.target.value)}
              className="bg-white border border-slate-300 text-slate-900 font-bold text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
            >
              <option value="g">grams (g)</option>
              <option value="kg">kilograms (kg)</option>
              <option value="ml">milliliters (ml)</option>
              <option value="l">liters (l)</option>
            </select>
            <div className="text-xs bg-indigo-500 text-white font-mono px-3 py-1.5 rounded-lg border border-indigo-400 font-bold shadow-xs">
              Min Height: <span className="text-amber-200 font-black text-sm">{calcResult.min_mm} mm</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar - Ultra High Contrast */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search rule clause (e.g. Rule 6, Rule 11), title, or keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium text-sm rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-slate-500"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-slate-50 border border-slate-300 text-slate-900 font-semibold text-sm rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="all">All Industries</option>
          <option value="food">Food & Beverages</option>
          <option value="cosmetics">Cosmetics & Personal Care</option>
          <option value="pharma">Pharmaceuticals</option>
          <option value="electronics">Electronics</option>
        </select>

        <select
          value={selectedSeverity}
          onChange={(e) => setSelectedSeverity(e.target.value)}
          className="bg-slate-50 border border-slate-300 text-slate-900 font-semibold text-sm rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="all">All Severities</option>
          <option value="CRITICAL">Critical Only</option>
          <option value="MAJOR">Major Only</option>
          <option value="MINOR">Minor Only</option>
        </select>
      </div>

      {/* Rules Table - Crisp, Sharp, High Contrast */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-500 font-medium">Loading statutory rules matrix...</div>
        ) : filteredRules.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium">No matching statutory rules found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold font-mono text-xs uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-4 w-36">Rule Clause</th>
                  <th className="px-5 py-4">Statutory Provision & Legal Mandate</th>
                  <th className="px-5 py-4 w-28 text-center">Category</th>
                  <th className="px-5 py-4">Validation Standard</th>
                  <th className="px-5 py-4 w-32 text-center">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-sans">
                {filteredRules.map((rule, idx) => {
                  const isCritical = rule.severity === 'CRITICAL';
                  const isMajor = rule.severity === 'MAJOR';
                  return (
                    <tr
                      key={rule.id || idx}
                      className="hover:bg-indigo-50/40 transition-colors duration-150"
                    >
                      {/* Column 1: Rule Clause */}
                      <td className="px-5 py-4 font-mono font-extrabold text-indigo-700 whitespace-nowrap text-sm align-top">
                        {rule.rule_code}
                      </td>

                      {/* Column 2: Provision Title & Description */}
                      <td className="px-5 py-4 align-top">
                        <div className="font-bold text-slate-900 text-sm leading-snug">
                          {rule.statutory_title}
                        </div>
                        <div className="text-xs text-slate-700 mt-1.5 leading-relaxed font-normal">
                          {rule.legal_text}
                        </div>
                      </td>

                      {/* Column 3: Category */}
                      <td className="px-5 py-4 whitespace-nowrap text-center align-top">
                        <span className="text-xs font-mono font-bold bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md border border-slate-300 capitalize inline-block">
                          {rule.category}
                        </span>
                      </td>

                      {/* Column 4: Validation Standard */}
                      <td className="px-5 py-4 text-xs text-slate-800 font-medium leading-relaxed align-top">
                        {rule.standard_specification}
                      </td>

                      {/* Column 5: Severity Badge */}
                      <td className="px-5 py-4 whitespace-nowrap text-center align-top">
                        <span
                          className={`text-xs px-3 py-1 rounded-full font-extrabold border tracking-wide uppercase inline-block shadow-xs ${
                            isCritical
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : isMajor
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-indigo-100 text-indigo-800 border-indigo-300'
                          }`}
                        >
                          {rule.severity}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
