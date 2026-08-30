import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ScanLine, History, FileText, Settings,
  ChevronLeft, ChevronRight, LogOut, Shield, Menu, Search,
  Bell, User, ShieldAlert, Briefcase, BookOpen
} from 'lucide-react';

const navItems = [
  { path: '/',           icon: LayoutDashboard, label: 'Dashboard',   badge: null },
  { path: '/workspace',  icon: Briefcase,       label: 'My Workspace', badge: 'Active' },
  { path: '/governance', icon: ShieldAlert,     label: 'Super Admin',  badge: null },
  { path: '/scan',       icon: ScanLine,        label: 'New Scan',    badge: null },
  { path: '/rules',      icon: BookOpen,        label: 'Rules Matrix', badge: null },
  { path: '/history',    icon: History,         label: 'History',     badge: null },
  { path: '/reports',    icon: FileText,        label: 'Reports',     badge: null },
  { path: '/settings',   icon: Settings,        label: 'Settings',    badge: null },
];

export default function Sidebar({ collapsed, onToggle, user, onLogout }) {
  const location = useLocation();

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-white border-r border-surface-border shadow-sidebar
        flex flex-col z-30 transition-all duration-300 ease-in-out
        ${collapsed ? 'w-[68px]' : 'w-[240px]'}`}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-surface-border">
        <Shield className="w-8 h-8 text-primary-600 flex-shrink-0" />
        {!collapsed && (
          <span className="ml-3 text-lg font-bold text-text-primary tracking-tight">
            LMPC
          </span>
        )}
        <button
          onClick={onToggle}
          className="ml-auto p-1.5 rounded-lg hover:bg-surface-muted text-text-muted
            transition-colors duration-200"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Section Label */}
      {!collapsed && (
        <div className="px-5 pt-5 pb-2">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Pages
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map(({ path, icon: Icon, label, badge }) => {
          const isActive = location.pathname === path ||
            (path !== '/' && location.pathname.startsWith(path));

          return (
            <Link
              key={path}
              to={path}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200
                ${isActive
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary'
                }
                ${collapsed ? 'justify-center px-2' : ''}`}
              title={collapsed ? label : undefined}
            >
              <Icon size={20} className={isActive ? 'text-white' : 'text-text-muted group-hover:text-text-secondary'} />
              {!collapsed && (
                <>
                  <span className="flex-1">{label}</span>
                  {badge !== null && (
                    <span className={`min-w-[20px] h-5 flex items-center justify-center rounded-full text-xs font-semibold
                      ${isActive ? 'bg-white/20 text-white' : 'bg-primary-100 text-primary-700'}`}>
                      {badge}
                    </span>
                  )}
                  <ChevronRight size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity
                    ${isActive ? 'text-white/60' : 'text-text-muted'}`} />
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* UI Elements Section */}
      {!collapsed && (
        <div className="px-5 pt-4 pb-2">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Quick Actions
          </span>
        </div>
      )}

      {!collapsed && (
        <div className="px-3 pb-4 space-y-1">
          <Link
            to="/scan"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
              text-primary-600 bg-primary-50 hover:bg-primary-100 transition-colors"
          >
            <ScanLine size={20} />
            <span>Quick Scan</span>
          </Link>
        </div>
      )}

      {/* User section */}
      <div className="border-t border-surface-border p-3">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
            <User size={18} className="text-primary-600" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {user?.full_name || user?.username || 'User'}
              </p>
              <p className="text-xs text-text-muted capitalize">{user?.role || 'Inspector'}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg hover:bg-red-50 text-text-muted hover:text-red-600
                transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

export function TopBar({ onMenuToggle }) {
  return (
    <header className="h-16 bg-white border-b border-surface-border flex items-center px-6 gap-4 sticky top-0 z-20">
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 rounded-lg hover:bg-surface-muted text-text-muted"
      >
        <Menu size={20} />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-md relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Search scans, products..."
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-light border border-surface-border
            text-sm text-text-primary placeholder:text-text-muted
            focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400
            transition-all"
        />
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <button className="p-2 rounded-xl hover:bg-surface-muted text-text-muted relative transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
      </div>
    </header>
  );
}
