import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Building2,
  FileCheck,
  Sparkles,
  AlertOctagon,
  BookOpen,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
export default function EmployerNavbar() {
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
          {/* Logo & Enterprise Brand Title */}
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-xl text-white shadow-md shadow-emerald-500/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-sm tracking-wide text-white flex items-center gap-2">
                <span>{user?.company_name || 'ENTERPRISE BRAND PORTAL'}</span>
                <span className="text-2xs bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 px-2 py-0.5 rounded-full font-mono">
                  PRE-MARKET CLEARANCE
                </span>
              </div>
              <div className="text-xs text-slate-300 font-medium">
                Legal Metrology Packaging Self-Certification & Clearance Vault
              </div>
            </div>
          </div>

          {/* Profile & Logout */}
          <div className="flex items-center gap-3 text-xs">
            <div className="text-right hidden sm:block">
              <div className="font-bold text-slate-100">{user?.full_name || 'Vikram Seth'}</div>
              <div className="text-2xs font-mono text-emerald-400">{user?.unique_login_id || 'EMP-PARLE-101'}</div>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-rose-950/60 hover:border-rose-700 text-slate-400 hover:text-rose-300 transition-all"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto space-x-1 py-2 border-t border-indigo-900/40 scrollbar-none">
          <NavLink
            to="/employer/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white text-indigo-950 shadow-md font-extrabold'
                  : 'text-slate-300 hover:bg-indigo-900/50 hover:text-white'
              }`
            }
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Brand Overview</span>
          </NavLink>

          <NavLink
            to="/employer/workbench"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white text-indigo-950 shadow-md font-extrabold'
                  : 'text-slate-300 hover:bg-indigo-900/50 hover:text-white'
              }`
            }
          >
            <Sparkles className="w-4 h-4" />
            <span>Pre-Market Label Self-Test</span>
          </NavLink>

          <NavLink
            to="/employer/applications"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white text-indigo-950 shadow-md font-extrabold'
                  : 'text-slate-300 hover:bg-indigo-900/50 hover:text-white'
              }`
            }
          >
            <FileCheck className="w-4 h-4" />
            <span>Clearance Certificates Vault</span>
          </NavLink>

          <NavLink
            to="/employer/notices"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white text-indigo-950 shadow-md font-extrabold'
                  : 'text-slate-300 hover:bg-indigo-900/50 hover:text-white'
              }`
            }
          >
            <AlertOctagon className="w-4 h-4" />
            <span>Statutory Show-Cause Replies</span>
          </NavLink>

          <NavLink
            to="/rules"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap text-slate-300 hover:bg-indigo-900/50 hover:text-white"
          >
            <BookOpen className="w-4 h-4" />
            <span>Gazette Rules & Font Calculator</span>
          </NavLink>
        </div>
      </div>
    </div>
  );
}
