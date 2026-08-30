import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Users,
  Building2,
  BrainCircuit,
  FileCheck,
  LayoutDashboard,
  Eye,
  LogOut,
} from 'lucide-react';
export default function SupervisorNavbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const handlePortalSwitch = (portalPath) => {
    navigate(portalPath);
  };

  return (
    <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-950 border-b border-indigo-500/30 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-md shadow-indigo-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-sm tracking-wide text-white flex items-center gap-2">
                <span>DIRECTORATE OF LEGAL METROLOGY</span>
                <span className="text-2xs bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 px-2 py-0.5 rounded-full font-mono font-bold">
                  {user?.role === 'almo'
                    ? 'ALMO / SUPERINTENDENT (L3)'
                    : user?.role === 'director'
                    ? 'STATE COMMISSIONER (L1)'
                    : 'CLMO ADJUDICATOR (L2)'}
                </span>
              </div>
              <div className="text-xs text-slate-300 font-medium">
                {user?.jurisdiction_zone ? `${user.jurisdiction_zone} Directorate Console` : 'Statutory Sanction & Clearance Directorate Console'}
              </div>
            </div>
          </div>

          {/* Officer Profile Badge & Logout */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 pl-2 text-xs">
              <div className="text-right hidden sm:block">
                <div className="font-bold text-slate-100">{user?.full_name || 'Dr. Ananya Roy'}</div>
                <div className="text-2xs font-mono text-indigo-300 font-bold">{user?.unique_login_id || 'CLMO-NZ-001'}</div>
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
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto space-x-1 py-2 border-t border-indigo-900/40 scrollbar-none">
          <NavLink
            to="/supervisor"
            end
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white text-indigo-950 shadow-md font-extrabold'
                  : 'text-slate-300 hover:bg-indigo-900/50 hover:text-white'
              }`
            }
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Executive Overview</span>
          </NavLink>

          <NavLink
            to="/supervisor/inspectors"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white text-indigo-950 shadow-md font-extrabold'
                  : 'text-slate-300 hover:bg-indigo-900/50 hover:text-white'
              }`
            }
          >
            <Users className="w-4 h-4" />
            <span>Inspector Personnel Directory</span>
          </NavLink>

          <NavLink
            to="/supervisor/employers"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white text-indigo-950 shadow-md font-extrabold'
                  : 'text-slate-300 hover:bg-indigo-900/50 hover:text-white'
              }`
            }
          >
            <Building2 className="w-4 h-4" />
            <span>Employer & Brand Tracker</span>
          </NavLink>

          <NavLink
            to="/supervisor/quotas"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white text-indigo-950 shadow-md font-extrabold'
                  : 'text-slate-300 hover:bg-indigo-900/50 hover:text-white'
              }`
            }
          >
            <BrainCircuit className="w-4 h-4" />
            <span>AI Quota Dispatch</span>
          </NavLink>

          <NavLink
            to="/supervisor/sanctions"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white text-indigo-950 shadow-md font-extrabold'
                  : 'text-slate-300 hover:bg-indigo-900/50 hover:text-white'
              }`
            }
          >
            <FileCheck className="w-4 h-4" />
            <span>Legal Sanctions & Clearances</span>
          </NavLink>

          <NavLink
            to="/supervisor/council"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white text-indigo-950 shadow-md font-extrabold'
                  : 'text-slate-300 hover:bg-indigo-900/50 hover:text-white'
              }`
            }
          >
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Executive Council</span>
          </NavLink>
        </div>
      </div>
    </div>
  );
}
