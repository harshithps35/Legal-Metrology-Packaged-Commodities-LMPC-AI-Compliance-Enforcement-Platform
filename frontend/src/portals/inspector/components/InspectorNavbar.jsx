import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Package,
  FileText,
  FileCheck,
  LogOut,
  Shield,
  ShieldCheck,
  MapPin,
} from 'lucide-react';

export default function InspectorNavbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-indigo-500/30 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Officer Title */}
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-md shadow-indigo-500/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-sm tracking-wide text-white flex items-center gap-2">
                <span>LEGAL METROLOGY ENFORCEMENT</span>
                <span className="text-2xs bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded-full font-mono font-bold">
                  LEAD INSPECTOR (L4)
                </span>
              </div>
              <div className="text-xs text-slate-300 font-medium">
                {user?.jurisdiction_zone || 'Regional Enforcement Directorate'}
              </div>
            </div>
          </div>

          {/* Officer Profile Badge */}
          <div className="flex items-center gap-3 text-xs">
            <div className="text-right hidden sm:block">
              <div className="font-bold text-slate-100">{user?.full_name || 'Rajesh Sharma'}</div>
              <div className="text-2xs font-mono text-indigo-400">{user?.unique_login_id || 'INSP-DEL-042'}</div>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-rose-950/60 hover:border-rose-700 text-slate-400 hover:text-rose-300 transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto space-x-1 py-2 border-t border-indigo-900/40 scrollbar-none">
          <NavLink
            to="/inspector/pre-market"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white text-indigo-950 shadow-md font-extrabold'
                  : 'text-slate-300 hover:bg-indigo-900/50 hover:text-white'
              }`
            }
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Pre-Market Triage & Severity Gate</span>
          </NavLink>

          <NavLink
            to="/inspector/products"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white text-indigo-950 shadow-md font-extrabold'
                  : 'text-slate-300 hover:bg-indigo-900/50 hover:text-white'
              }`
            }
          >
            <FileCheck className="w-4 h-4 text-amber-400" />
            <span>Field Visits & VIR Verification</span>
          </NavLink>

          <NavLink
            to="/inspector/ledger"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white text-indigo-950 shadow-md font-extrabold'
                  : 'text-slate-300 hover:bg-indigo-900/50 hover:text-white'
              }`
            }
          >
            <FileText className="w-4 h-4 text-blue-400" />
            <span>Monthly Activity Ledger</span>
          </NavLink>
        </div>
      </div>
    </div>
  );
}
