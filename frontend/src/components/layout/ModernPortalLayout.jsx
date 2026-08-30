import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Shield,
  ShieldCheck,
  Search,
  Bell,
  Mail,
  ChevronRight,
  LogOut,
  HelpCircle,
  Play,
  ExternalLink,
  ChevronLeft,
  Menu,
  X,
  User,
  Sparkles,
  Award,
} from 'lucide-react';

export default function ModernPortalLayout({
  portalTitle = "Legal Metrology Enforcement",
  portalLevel = "L3",
  levelName = "Assistant Legal Metrology Officer",
  menuSections = [],
  showDemoCard = true,
  demoTitle = "Watch Statutory Demo",
  demoDescription = "Learn how pre-market packaging optical verification, 15-day deficiency resolution, and on-site caliper audits function across directorate tiers.",
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const getRoleHierarchyInfo = (role) => {
    switch (role) {
      case 'state_commissioner':
      case 'director':
        return { level: 'L1', title: 'State Commissioner / Director', rank: 'L1 • State Commissioner' };
      case 'clmo':
      case 'clmo_supervisor':
        return { level: 'L2', title: 'Chief Legal Metrology Officer (CLMO)', rank: 'L2 • CLMO Authority' };
      case 'almo':
      case 'superintendent':
        return { level: 'L3', title: 'Assistant Legal Metrology Officer (ALMO)', rank: 'L3 • ALMO Sanctions' };
      case 'inspector':
        return { level: 'L4', title: 'Lead Legal Metrology Inspector (LMI)', rank: 'L4 • Lead Inspector' };
      case 'sub_inspector':
      case 'resolution_desk':
        return { level: 'L5', title: 'Sub-Inspector & Resolution Desk', rank: 'L5 • Sub-Inspector / Desk' };
      case 'employer':
      case 'manufacturer':
        return { level: 'L6', title: 'Brand Owner / Packaging Manufacturer', rank: 'L6 • Brand Owner / Mfg' };
      default:
        return { level: portalLevel || 'L3', title: levelName || 'Officer', rank: `${portalLevel || 'L3'} • ${levelName || 'Officer'}` };
    }
  };

  const roleInfo = getRoleHierarchyInfo(user?.role);
  const activeLevelTag = roleInfo.level;
  const activeLevelTitle = roleInfo.title;
  const activeRankDisplay = roleInfo.rank;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'LM';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[#EAF0F8] p-2 sm:p-4 lg:p-6 flex items-center justify-center font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Elevated Extej Master Window Container */}
      <div className="w-full max-w-[1720px] min-h-[94vh] bg-white rounded-[28px] shadow-[0_20px_50px_rgba(59,130,246,0.07)] border border-slate-200/80 flex flex-col lg:flex-row overflow-hidden">
        
        {/* ================= LEFT SIDEBAR ================= */}
        <aside
          className={`w-full lg:w-68 xl:w-72 bg-[#FFFFFF] border-r border-slate-100 flex flex-col justify-between shrink-0 p-5 z-30 transition-all ${
            mobileMenuOpen ? 'block' : 'hidden lg:flex'
          }`}
        >
          <div className="space-y-6">
            {/* Brand Logo Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 via-red-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
                  <Shield className="w-5 h-5 fill-white/20" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-slate-900 text-lg tracking-tight">LMPC</span>
                    <span className="text-3xs font-mono font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60">
                      {activeLevelTag}
                    </span>
                  </div>
                  <span className="text-3xs font-bold text-slate-600 block uppercase tracking-wider">
                    LMPC Directorate
                  </span>
                </div>
              </div>

              <button
                onClick={() => setMobileMenuOpen(false)}
                className="lg:hidden text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Groups */}
            <div className="space-y-5 overflow-y-auto max-h-[calc(100vh-260px)] pr-1">
              {menuSections.map((sec, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="px-3 text-3xs font-extrabold tracking-widest text-slate-600 uppercase font-mono">
                    {sec.title}
                  </div>

                  <div className="space-y-1">
                    {sec.items.map((item, itemIdx) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={itemIdx}
                          to={item.to}
                          end={item.exact}
                          onClick={() => setMobileMenuOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all group ${
                              isActive
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 font-extrabold'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <div className="flex items-center gap-3 truncate">
                                <Icon
                                  className={`w-4 h-4 shrink-0 transition-colors ${
                                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
                                  }`}
                                />
                                <span className="truncate">{item.label}</span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {item.badge && (
                                  <span
                                    className={`text-3xs px-2 py-0.5 rounded-full font-mono font-black ${
                                      isActive
                                        ? 'bg-white/20 text-white'
                                        : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                                    }`}
                                  >
                                    {item.badge}
                                  </span>
                                )}
                                <ChevronRight
                                  className={`w-3.5 h-3.5 transition-transform ${
                                    isActive ? 'text-white/80 translate-x-0.5' : 'text-slate-300 group-hover:text-slate-400'
                                  }`}
                                />
                              </div>
                            </>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar Footer - Level Indicator & Logout */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <div className="px-3 py-2 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-3xs font-extrabold text-slate-600 uppercase font-mono block">
                  Designation Rank
                </span>
                <span className="text-2xs font-extrabold text-slate-800 truncate block">
                  {activeRankDisplay}
                </span>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </aside>

        {/* ================= MAIN CONTENT CONTAINER ================= */}
        <div className="flex-1 flex flex-col bg-[#F9FBFE] min-w-0 overflow-hidden">
          
          {/* TOP NAVBAR */}
          <header className="bg-white border-b border-slate-100 px-5 sm:px-8 py-3.5 flex items-center justify-between gap-4 shrink-0">
            {/* Left: Mobile Toggle & Search Pill */}
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-600"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search dossiers, products, warrants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#F4F7FB] border border-slate-200/80 rounded-2xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-600 focus:bg-white focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Right: Notifications, Help, User Profile Badge */}
            <div className="flex items-center gap-3 sm:gap-4">
              <button className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors">
                <Mail className="w-4 h-4" />
              </button>

              <button className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600" />
              </button>

              {/* Profile Card Pill */}
              <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white font-extrabold flex items-center justify-center text-xs shadow-sm shadow-amber-500/20 ring-2 ring-white">
                  {getInitials(user?.full_name || 'Officer')}
                </div>
                <div className="hidden sm:block text-left">
                  <span className="text-xs font-extrabold text-slate-900 block leading-tight">
                    {user?.full_name || 'Shri Suresh Raina'}
                  </span>
                  <span className="text-3xs font-semibold text-slate-600 block">
                    {user?.unique_login_id || 'ALMO-NOI-001'} • {activeLevelTitle}
                  </span>
                </div>

                {/* National Emblem Badge Icon */}
                <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs">
                  🇮🇳
                </div>

                {/* Top Navbar Quick Log Out Button */}
                <button
                  onClick={handleLogout}
                  title="Sign out of portal session"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 text-xs font-extrabold transition-all cursor-pointer shadow-2xs ml-1 hover:scale-[1.02]"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span className="hidden sm:inline">Log Out</span>
                </button>
              </div>
            </div>
          </header>

          {/* PAGE BODY & OPTIONAL GUIDANCE SIDEBAR */}
          <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            <Outlet context={{ searchQuery }} />
          </div>
        </div>
      </div>
    </div>
  );
}
