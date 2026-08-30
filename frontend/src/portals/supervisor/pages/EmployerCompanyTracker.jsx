import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  CheckCircle2,
  AlertCircle,
  Package,
  FileCheck,
  UserCheck,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { supervisorAPI } from '../../../services/api';
import toast from 'react-hot-toast';

export default function EmployerCompanyTracker() {
  const [employers, setEmployers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchEmployers();
  }, []);

  const fetchEmployers = async () => {
    try {
      setLoading(true);
      const res = await supervisorAPI.getEmployers();
      setEmployers(res.data);
    } catch (err) {
      console.error('Failed to load employer directory', err);
      toast.error('Failed to load registered brands directory');
    } finally {
      setLoading(false);
    }
  };

  const filtered = employers.filter((e) => {
    const matchesSearch =
      e.company_name.toLowerCase().includes(search.toLowerCase()) ||
      e.unique_login_id.toLowerCase().includes(search.toLowerCase()) ||
      e.contact_person.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'all' || e.assigned_category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-md text-white">
        <div className="flex items-center gap-2.5 text-indigo-300 font-bold text-lg mb-1">
          <Building2 className="w-6 h-6 text-indigo-400" />
          <span>Registered Enterprises, Manufacturers & Packaging Lines Directory</span>
        </div>
        <p className="text-sm text-slate-200">
          Live monitoring of registered brand owners, active commercial packaging lines, pre-market packaging submissions, and assigned supervisory inspectors.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search company name, enterprise ID (EMP-xxx), or contact person..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium text-sm rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-slate-50 border border-slate-300 text-slate-900 font-semibold text-sm rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="all">All Industry Sectors</option>
          <option value="food">Food & Beverages</option>
          <option value="cosmetics">Cosmetics & Personal Care</option>
          <option value="pharma">Pharmaceuticals</option>
        </select>
      </div>

      {/* Detailed Employer Cards Roster */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 font-medium bg-white rounded-2xl border border-slate-200">
          Loading registered enterprise directory...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-slate-500 font-medium bg-white rounded-2xl border border-slate-200">
          No matching enterprise employers found.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map((emp) => (
            <div
              key={emp.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all space-y-4"
            >
              {/* Header: Company Name, Unique ID & Status */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 text-base">{emp.company_name}</span>
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-mono font-bold px-2.5 py-0.5 rounded-md">
                      {emp.unique_login_id}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 flex items-center gap-2 mt-1">
                    <span>Contact: <strong>{emp.contact_person}</strong></span>
                    <span>•</span>
                    <span className="font-mono text-slate-500">{emp.email}</span>
                  </div>
                </div>

                <span className="text-xs font-bold uppercase bg-slate-100 text-slate-800 border border-slate-300 px-3 py-1 rounded-md capitalize">
                  {emp.assigned_category}
                </span>
              </div>

              {/* Facility & Legal Details */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <div>
                  <div className="text-slate-500 font-bold uppercase text-2xs">Jurisdiction Plant:</div>
                  <div className="font-semibold text-slate-800 mt-0.5">{emp.jurisdiction_zone}</div>
                </div>
                <div>
                  <div className="text-slate-500 font-bold uppercase text-2xs">Assigned Field Inspector:</div>
                  <div className="font-semibold text-indigo-700 mt-0.5">{emp.assigned_inspector}</div>
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-200">
                  <div className="text-slate-500 font-bold uppercase text-2xs">GSTIN / FSSAI License:</div>
                  <div className="font-mono font-semibold text-slate-800 mt-0.5">{emp.gstin_fssai_id}</div>
                </div>
              </div>

              {/* Active Products Being Packaged */}
              <div>
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Active Packaging Lines ({emp.products.length}):</span>
                </div>
                <div className="space-y-1.5">
                  {emp.products.length === 0 ? (
                    <div className="text-xs text-slate-500 italic">No commercial products registered yet.</div>
                  ) : (
                    emp.products.map((p) => (
                      <div
                        key={p.id}
                        className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-xs flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-slate-900">{p.product_name}</span>
                          <span className="text-slate-500 ml-2 font-mono">Batch: {p.batch_number}</span>
                        </div>
                        <span className="font-bold text-indigo-800">₹{p.mrp}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Pre-Market Clearance Submissions */}
              <div>
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Pre-Market Clearance Applications ({emp.pre_market_applications.length}):</span>
                </div>
                <div className="space-y-1.5">
                  {emp.pre_market_applications.length === 0 ? (
                    <div className="text-xs text-slate-500 italic">No pre-market artwork applications in queue.</div>
                  ) : (
                    emp.pre_market_applications.map((pm) => (
                      <div
                        key={pm.id}
                        className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-xs flex items-center justify-between"
                      >
                        <span className="font-semibold text-slate-800 line-clamp-1">{pm.product_name}</span>
                        <span
                          className={`text-2xs font-extrabold px-2.5 py-0.5 rounded-full border uppercase ${
                            pm.status === 'approved_certified'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-amber-100 text-amber-900 border-amber-300'
                          }`}
                        >
                          {pm.status === 'approved_certified' ? 'Certified' : 'In Review'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
