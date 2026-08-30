import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, ShieldAlert, ShieldQuestion, TrendingUp,
  ScanLine, AlertTriangle, CheckCircle, BarChart3
} from 'lucide-react';
import { dashboardAPI } from '../services/api';
import RulesMatrix from '../components/RulesMatrix';

function StatCard({ icon: Icon, label, value, color, bgColor }) {
  return (
    <div className="bg-white rounded-card border border-surface-border shadow-card p-5
      hover:shadow-card-hover transition-shadow duration-200">
      <div className="flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${bgColor}`}>
          <Icon size={22} className={color} />
        </div>
        <div>
          <p className="text-sm text-text-secondary font-medium">{label}</p>
          <p className="text-2xl font-bold text-text-primary mt-0.5">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ComplianceScoreRing({ score }) {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  let color = '#16A34A';
  if (score < 50) color = '#DC2626';
  else if (score < 75) color = '#F59E0B';

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#E2E8F0" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="45" fill="none"
            stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-text-primary">{score.toFixed(0)}%</span>
        </div>
      </div>
      <p className="text-sm text-text-secondary mt-2 font-medium">Avg. Compliance</p>
    </div>
  );
}

function ViolationRow({ title, severity, count }) {
  const severityStyles = {
    CRITICAL: { bg: 'bg-severity-critical-bg', text: 'text-severity-critical', label: 'Critical' },
    MAJOR:    { bg: 'bg-severity-major-bg',    text: 'text-severity-major',    label: 'Major' },
    MINOR:    { bg: 'bg-severity-minor-bg',    text: 'text-severity-minor',    label: 'Minor' },
  };
  const style = severityStyles[severity] || severityStyles.MINOR;

  return (
    <div className="flex items-center justify-between py-3 border-b border-surface-border last:border-0">
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-sm text-text-primary font-medium truncate">{title}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
          {style.label}
        </span>
        <span className="text-sm font-bold text-text-primary w-8 text-right">{count}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await dashboardAPI.getStats();
      setStats(res.data);
    } catch (err) {
      // Use demo data if API not available
      setStats({
        total_scans: 0,
        compliant_count: 0,
        non_compliant_count: 0,
        review_count: 0,
        avg_compliance_score: 0,
        most_common_violations: [],
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1">Overview of compliance inspection activity</p>
        </div>
        <button
          onClick={() => navigate('/scan')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm
            font-semibold hover:bg-primary-700 active:bg-primary-800 transition-colors shadow-sm"
        >
          <ScanLine size={18} />
          New Scan
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BarChart3}
          label="Total Scans"
          value={stats.total_scans}
          color="text-primary-600"
          bgColor="bg-primary-50"
        />
        <StatCard
          icon={CheckCircle}
          label="Compliant"
          value={stats.compliant_count}
          color="text-status-compliant"
          bgColor="bg-status-compliant-bg"
        />
        <StatCard
          icon={ShieldAlert}
          label="Non-Compliant"
          value={stats.non_compliant_count}
          color="text-status-non-compliant"
          bgColor="bg-status-non-compliant-bg"
        />
        <StatCard
          icon={ShieldQuestion}
          label="Requires Review"
          value={stats.review_count}
          color="text-status-review"
          bgColor="bg-status-review-bg"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance Score */}
        <div className="bg-white rounded-card border border-surface-border shadow-card p-6">
          <h3 className="text-base font-semibold text-text-primary mb-6">Compliance Score</h3>
          <div className="flex justify-center">
            <ComplianceScoreRing score={stats.avg_compliance_score} />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-xl bg-status-compliant-bg">
              <p className="text-lg font-bold text-status-compliant">{stats.compliant_count}</p>
              <p className="text-[11px] text-text-muted font-medium">Pass</p>
            </div>
            <div className="p-2 rounded-xl bg-status-review-bg">
              <p className="text-lg font-bold text-status-review">{stats.review_count}</p>
              <p className="text-[11px] text-text-muted font-medium">Review</p>
            </div>
            <div className="p-2 rounded-xl bg-status-non-compliant-bg">
              <p className="text-lg font-bold text-status-non-compliant">{stats.non_compliant_count}</p>
              <p className="text-[11px] text-text-muted font-medium">Fail</p>
            </div>
          </div>
        </div>

        {/* Most Common Violations */}
        <div className="lg:col-span-2 bg-white rounded-card border border-surface-border shadow-card p-6">
          <h3 className="text-base font-semibold text-text-primary mb-4">Most Common Violations</h3>
          {stats.most_common_violations.length > 0 ? (
            <div>
              {stats.most_common_violations.map((v, i) => (
                <ViolationRow key={i} title={v.title} severity={v.severity} count={v.count} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-text-muted">
              <ShieldCheck size={40} className="mb-3 text-status-compliant" />
              <p className="text-sm font-medium">No violations recorded yet</p>
              <p className="text-xs mt-1">Start scanning labels to see analytics</p>
            </div>
          )}
        </div>
      </div>

      {/* Embedded Statutory Rules Reference Matrix & Font Calculator */}
      <div className="mt-8">
        <h3 className="text-lg font-bold text-text-primary mb-4">Legal Metrology Statutory Standards Reference</h3>
        <RulesMatrix />
      </div>
    </div>
  );
}
