import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Shield,
  Eye,
  EyeOff,
  Building2,
  UserCheck,
  Mail,
  Lock,
  CheckCircle2,
  Sparkles,
  Scale,
  FileCheck,
  BrainCircuit,
  MapPin,
  Barcode,
  Layers,
  ArrowRight,
  Award,
  Clock,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { portalRole } = useParams();

  // Default to 'employer' (Brand Owner)
  const [activeRole, setActiveRole] = useState('employer');

  const [form, setForm] = useState({
    username: 'parle.compliance.lmpc@gmail.com',
    password: 'employer123',
  });

  useEffect(() => {
    if (portalRole) {
      const norm = portalRole.toLowerCase().replace('-', '_');
      if (norm === 'brand_owner' || norm === 'manufacturer' || norm === 'brand' || norm === 'employer') {
        handleRoleSelect('employer');
      } else if (norm === 'commissioner' || norm === 'state_commissioner' || norm === 'director') {
        handleRoleSelect('commissioner');
      } else if (norm === 'clmo' || norm === 'clmo_supervisor') {
        handleRoleSelect('clmo');
      } else if (norm === 'almo' || norm === 'superintendent') {
        handleRoleSelect('almo');
      } else if (norm === 'inspector' || norm === 'lmi') {
        handleRoleSelect('inspector');
      } else if (norm === 'sub_inspector' || norm === 'asst_inspector' || norm === 'resolution_desk' || norm === 'resolution') {
        handleRoleSelect('sub_inspector');
      }
    } else {
      handleRoleSelect('employer');
    }
  }, [portalRole]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleRoleSelect = (roleKey) => {
    setActiveRole(roleKey);
    setError('');
    if (roleKey === 'clmo') {
      setForm({ username: 'clmo.supervisor.lmpc@gmail.com', password: 'supervisor123' });
    } else if (roleKey === 'almo') {
      setForm({ username: 'almo.noida.lmpc@gmail.com', password: 'supervisor123' });
    } else if (roleKey === 'commissioner') {
      setForm({ username: 'commissioner.lmpc@gmail.com', password: 'commissioner123' });
    } else if (roleKey === 'inspector') {
      setForm({ username: 'inspector.rajesh.lmpc@gmail.com', password: 'inspector123' });
    } else if (roleKey === 'sub_inspector') {
      setForm({ username: 'sub.inspector.sanjay.lmpc@gmail.com', password: 'inspector123' });
    } else {
      setForm({ username: 'parle.compliance.lmpc@gmail.com', password: 'employer123' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const cleanUsername = form.username.trim();
      const cleanPassword = form.password.trim();
      const res = await authAPI.login(cleanUsername, cleanPassword);
      localStorage.setItem('token', res.data.access_token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      const userRole = res.data.user.role;
      toast.success(`Welcome, ${res.data.user.full_name || cleanUsername}!`);

      if (userRole === 'state_commissioner' || userRole === 'director') {
        navigate('/commissioner');
      } else if (userRole === 'clmo' || userRole === 'clmo_supervisor') {
        navigate('/clmo');
      } else if (userRole === 'almo' || userRole === 'superintendent') {
        navigate('/almo');
      } else if (userRole === 'inspector') {
        navigate('/inspector/products');
      } else if (userRole === 'sub_inspector' || userRole === 'resolution_desk') {
        navigate('/sub-inspector');
      } else if (['employer', 'manufacturer'].includes(userRole)) {
        navigate('/employer/dashboard');
      } else {
        navigate('/supervisor');
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 403) {
        setError(err.response?.data?.detail || 'Account pending official Directorate approval.');
      } else if (err.response?.status === 401) {
        setError(err.response?.data?.detail || 'Incorrect Unique ID, Email or password.');
      } else if (!err.response) {
        setError('Cannot connect to backend server. Please verify backend is running on port 8000.');
      } else {
        setError(err.response?.data?.detail || 'Invalid Unique ID / Email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EAF0F8] text-slate-900 flex flex-col justify-between selection:bg-blue-600 selection:text-white p-3 sm:p-6 lg:p-8">
      {/* Top Banner Header */}
      <header className="max-w-7xl w-full mx-auto bg-white rounded-3xl border border-slate-200/80 shadow-sm px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 via-red-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
            <Shield className="w-5 h-5 fill-white/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-base tracking-tight">LMPC Directorate</span>
              <span className="text-3xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md">
                GOVT OF INDIA
              </span>
            </div>
            <span className="text-3xs text-slate-600 font-semibold block">
              Directorate of Legal Metrology • Legal Metrology Act 2009
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/register"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            Brand Onboarding &rarr;
          </Link>
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm">
            🇮🇳
          </div>
        </div>
      </header>

      {/* Main Container Grid */}
      <main className="max-w-7xl w-full mx-auto my-6 space-y-6">
        
        {/* Tier Level Switcher Pill Bar */}
        <div className="bg-white rounded-3xl p-3 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between px-3 pb-2 text-3xs font-mono font-bold uppercase text-slate-600">
            <span className="flex items-center gap-1.5 text-blue-700">
              <ShieldCheck className="w-4 h-4" />
              Select Institutional Authority Tier:
            </span>
            <span>Click any tier to populate demo credentials</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {[
              { key: 'commissioner', label: 'Commissioner', icon: Shield, tag: 'L1 APEX' },
              { key: 'clmo', label: 'CLMO Authority', icon: Award, tag: 'L2 CLMO' },
              { key: 'almo', label: 'ALMO Sanctions', icon: Scale, tag: 'L3 ALMO' },
              { key: 'inspector', label: 'Lead Inspector', icon: UserCheck, tag: 'L4 INSP' },
              { key: 'sub_inspector', label: 'Sub-Inspector & Desk', icon: MapPin, tag: 'L5 SQUAD' },
              { key: 'employer', label: 'Brand Owner / Mfg', icon: Building2, tag: 'L6 BRAND' },
            ].map((r) => {
              const Icon = r.icon;
              const isSelected = activeRole === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => handleRoleSelect(r.key)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/25'
                      : 'bg-[#F9FBFE] border-slate-200/80 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-blue-600'}`} />
                    <span
                      className={`text-3xs font-mono font-bold px-1.5 py-0.5 rounded-md ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {r.tag}
                    </span>
                  </div>
                  <div className="font-extrabold text-xs truncate">{r.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Layout: Left Briefing + Right Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Left Briefing Card (Col 7) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200/60">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Institutional Multi-Tier Compliance Framework</span>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                National Packaging Compliance & Enforcement Gateway
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm mt-1.5 leading-relaxed">
                Automated optical compliance auditing, Schedule II font size measurement, price-tampering detection, and statutory chain-of-custody enforcement across India.
              </p>
            </div>

            {/* Role Specific Highlight Panels */}
            <div className="bg-[#F8FAFD] rounded-2xl border border-slate-200/80 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">
                  {activeRole === 'commissioner' && '🏛️ L1 State Legal Metrology Commissioner'}
                  {activeRole === 'clmo' && '⚖️ L2 Chief Legal Metrology Officer (CLMO)'}
                  {activeRole === 'almo' && '📋 L3 Assistant Legal Metrology Officer (ALMO)'}
                  {activeRole === 'inspector' && '👮 L4 Lead Legal Metrology Inspector (LMI)'}
                  {activeRole === 'sub_inspector' && '🚗 L5 Sub-Inspector Squad & Resolution Desk'}
                  {activeRole === 'employer' && '🏢 L6 Brand Owner & Packaging Manufacturer'}
                </span>
                <span className="text-3xs font-mono font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  Active Tier
                </span>
              </div>

              {activeRole === 'commissioner' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <BrainCircuit className="w-3.5 h-3.5 text-blue-600" />
                      Statewide Intelligence
                    </span>
                    <p className="text-slate-600 text-2xs">Real-time oversight over all subordinate CLMO and ALMO zonal offices.</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-blue-600" />
                      Revocation Vault
                    </span>
                    <p className="text-slate-600 text-2xs">Apex statutory powers to revoke non-compliant certificates under Section 52.</p>
                  </div>
                </div>
              )}

              {activeRole === 'clmo' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-emerald-600" />
                      Certificate Issuance
                    </span>
                    <p className="text-slate-600 text-2xs">Grant statutory pre-market clearance and digitally sign certificates.</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-blue-600" />
                      ALMO Verification
                    </span>
                    <p className="text-slate-600 text-2xs">Verify and commission registering ALMO officers into district offices.</p>
                  </div>
                </div>
              )}

              {activeRole === 'almo' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-500" />
                      Visit Order Sanctions
                    </span>
                    <p className="text-slate-600 text-2xs">Sanction on-site visit orders (VO-YYYY-NNNNNN) upon inspector triage.</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Inspector Commissioning
                    </span>
                    <p className="text-slate-600 text-2xs">Commission candidate Lead Inspectors & Sub-Inspectors in your zone.</p>
                  </div>
                </div>
              )}

              {activeRole === 'inspector' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-blue-600" />
                      Schedule II Font Metering
                    </span>
                    <p className="text-slate-600 text-2xs">Automated OCR verification against statutory area height thresholds.</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-500" />
                      Price Tampering OCR
                    </span>
                    <p className="text-slate-600 text-2xs">Detect dual-MRP stickers and fraudulent overprints under Rule 11(2)(c).</p>
                  </div>
                </div>
              )}

              {activeRole === 'sub_inspector' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      GPS Field Geo-Attendance
                    </span>
                    <p className="text-slate-600 text-2xs">Geo-stamped on-site batch verification and physical inspection logging.</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      15-Day Deficiency Memos
                    </span>
                    <p className="text-slate-600 text-2xs">Issue deficiency notices under Rule 6 and monitor 15-day resolution SLAs.</p>
                  </div>
                </div>
              )}

              {activeRole === 'employer' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Barcode className="w-3.5 h-3.5 text-blue-600" />
                      Pre-Market Artwork Test
                    </span>
                    <p className="text-slate-600 text-2xs">Upload packaging artwork to detect font sizing and 14-digit FSSAI code.</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Clearance Applications
                    </span>
                    <p className="text-slate-600 text-2xs">Apply directly for statutory certificates with digital verification.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Login Form Card (Col 5) */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-dashboard space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-3xs font-mono font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full uppercase">
                  {activeRole === 'employer' ? 'Public Enterprise Gateway' : 'Directorate Secure Sign-In'}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  {activeRole === 'employer' ? 'Brand Owner Portal' : `${activeRole.toUpperCase()} Officer Portal`}
                </h3>
              </div>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Lock className="w-4 h-4" />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1 text-3xs">
                  {activeRole === 'employer' ? 'Corporate Email / Unique ID *' : 'Official Directorate Email / Unique ID *'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    required
                    placeholder="Enter Unique ID or Email"
                    className="w-full bg-[#F4F7FB] border border-slate-200/80 rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1 text-3xs">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    placeholder="••••••••"
                    className="w-full bg-[#F4F7FB] border border-slate-200/80 rounded-2xl pl-10 pr-10 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:border-blue-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-800"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {loading ? 'Authenticating...' : 'Sign In to Portal'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Registration Direct Links */}
            <div className="pt-3 border-t border-slate-100 text-center space-y-1.5 text-xs text-slate-600">
              {activeRole === 'employer' && (
                <div>
                  New Brand Manufacturer?{' '}
                  <Link to="/register" className="text-blue-600 font-extrabold hover:underline">
                    Register Enterprise Profile
                  </Link>
                </div>
              )}
              {activeRole === 'inspector' && (
                <div className="text-2xs text-slate-500 font-medium px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                  🔒 Lead Inspector post onboarding is internal. Only an active Lead Inspector can register a new Lead Inspector post.
                </div>
              )}
              {activeRole === 'sub_inspector' && (
                <div className="text-2xs text-slate-500 font-medium px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                  🔒 Sub-Inspector post onboarding is internal. Only an active Sub-Inspector can register a new Sub-Inspector post.
                </div>
              )}
              {activeRole === 'almo' && (
                <div className="text-2xs text-slate-500 font-medium px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                  🔒 ALMO post onboarding is internal. Only an active ALMO can register a new ALMO post.
                </div>
              )}
              {activeRole === 'clmo' && (
                <div className="text-2xs text-slate-500 font-medium px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                  🔒 CLMO post onboarding is internal. Only an active CLMO can register a new CLMO post.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl w-full mx-auto text-center text-3xs text-slate-600 space-y-1">
        <p>© 2026 Directorate of Legal Metrology • Legal Metrology (Packaged Commodities) Rules, 2011</p>
        <p>Secured with AES-256 GCM encryption and dual SMS + Email OTP verification.</p>
      </footer>
    </div>
  );
}
