import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Scale,
  Search,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { commissionerAPI } from '../../../services/api';
import toast from 'react-hot-toast';

export default function RulesetCatalog() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchRulesets();
  }, []);

  const fetchRulesets = async () => {
    try {
      setLoading(true);
      const res = await commissionerAPI.getRulesets();
      setRules(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load rulesets');
    } finally {
      setLoading(false);
    }
  };

  const filtered = rules.filter((r) =>
    r.rule_code.toLowerCase().includes(search.toLowerCase()) ||
    r.statutory_title.toLowerCase().includes(search.toLowerCase()) ||
    r.standard_specification.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-md text-white">
        <div className="flex items-center gap-2.5 text-indigo-300 font-bold text-lg mb-1">
          <BookOpen className="w-6 h-6 text-indigo-400" />
          <span>Statutory Gazette Rulesets Matrix & Standard Specifications</span>
        </div>
        <p className="text-sm text-slate-200">
          Official gazetted rules under the Legal Metrology (Packaged Commodities) Rules, 2011, governing OCR bounding box tolerances, font heights, and mandatory declarations.
        </p>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search rule code, title, or statutory specification (e.g. Schedule II, Rule 6(1)(c))..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Grid of Rules */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 font-medium">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
          <span>Loading gazette rulesets...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((r) => (
            <div key={r.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <span className="font-mono font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg text-xs">
                    {r.rule_code}
                  </span>
                  <span className={`text-2xs font-extrabold px-2.5 py-0.5 rounded-full border uppercase ${
                    r.severity === 'CRITICAL'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}>
                    {r.severity}
                  </span>
                </div>

                <div className="font-bold text-slate-900 text-sm">{r.statutory_title}</div>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {r.standard_specification}
                </p>
              </div>

              <div className="flex items-center justify-between text-2xs text-slate-500 pt-2 border-t border-slate-200">
                <span className="capitalize">Category: <strong>{r.category}</strong></span>
                <span className="flex items-center gap-1 text-emerald-700 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Enforced by Engine</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
