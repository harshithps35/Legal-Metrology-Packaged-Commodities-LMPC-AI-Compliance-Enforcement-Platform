import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  User,
  MapPin,
  Lock,
  ArrowRight,
  Loader2,
  Sparkles,
  Shield,
  FileCheck,
} from 'lucide-react';
import { authAPI } from '../../../services/api';
import toast from 'react-hot-toast';

export default function BrandOwnerRegister() {
  const navigate = useNavigate();

  // Form State
  const [form, setForm] = useState({
    company_name: '',
    gstin_fssai_id: '',
    contact_person: '',
    email: '',
    phone_number: '',
    password: '',
    confirm_password: '',
    category: 'food',
    jurisdiction_zone: 'North Zone (Delhi NCR)',
  });

  // OTP Verification States
  const [phoneOtp, setPhoneOtp] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneOtpPreview, setPhoneOtpPreview] = useState('');
  const [emailOtpPreview, setEmailOtpPreview] = useState('');

  // Loading States
  const [sendingPhoneOtp, setSendingPhoneOtp] = useState(false);
  const [verifyingPhoneOtp, setVerifyingPhoneOtp] = useState(false);
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
  const [verifyingEmailOtp, setVerifyingEmailOtp] = useState(false);
  const [registering, setRegistering] = useState(false);

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // --- Phone OTP Handlers ---
  const handleSendPhoneOtp = async () => {
    if (!form.phone_number || form.phone_number.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number.');
      return;
    }
    try {
      setSendingPhoneOtp(true);
      const res = await authAPI.sendPhoneOTP(form.phone_number);
      setPhoneOtpSent(true);
      setPhoneOtpPreview(res.data?.otp_preview || '');
      toast.success(`OTP sent to +91 ${form.phone_number}!`);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to send Phone OTP');
    } finally {
      setSendingPhoneOtp(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!phoneOtp || phoneOtp.length < 4) {
      toast.error('Please enter the 6-digit OTP code.');
      return;
    }
    try {
      setVerifyingPhoneOtp(true);
      const res = await authAPI.verifyPhoneOTP(form.phone_number, phoneOtp);
      setPhoneVerified(true);
      toast.success('Mobile phone verified successfully! ✅');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Invalid Phone OTP');
    } finally {
      setVerifyingPhoneOtp(false);
    }
  };

  // --- Email OTP Handlers ---
  const handleSendEmailOtp = async () => {
    if (!form.email || !form.email.includes('@')) {
      toast.error('Please enter a valid company email address.');
      return;
    }
    try {
      setSendingEmailOtp(true);
      const res = await authAPI.sendEmailOTP(form.email);
      setEmailOtpSent(true);
      setEmailOtpPreview(res.data?.otp_preview || '');
      toast.success(`Verification code sent to ${form.email}!`);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to send Email OTP');
    } finally {
      setSendingEmailOtp(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp || emailOtp.length < 4) {
      toast.error('Please enter the 6-digit email code.');
      return;
    }
    try {
      setVerifyingEmailOtp(true);
      const res = await authAPI.verifyEmailOTP(form.email, emailOtp);
      setEmailVerified(true);
      toast.success('Company email verified successfully! ✅');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Invalid Email OTP');
    } finally {
      setVerifyingEmailOtp(false);
    }
  };

  // --- Final Submit ---
  const handleRegister = async (e) => {
    e.preventDefault();

    if (!form.company_name || !form.gstin_fssai_id || !form.contact_person) {
      toast.error('Please complete all mandatory enterprise details.');
      return;
    }

    if (!phoneVerified) {
      toast.error('Please verify your Mobile Phone number with OTP.');
      return;
    }

    if (!emailVerified) {
      toast.error('Please verify your Corporate Email with OTP.');
      return;
    }

    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    if (form.password !== form.confirm_password) {
      toast.error('Passwords do not match.');
      return;
    }

    try {
      setRegistering(true);
      const res = await authAPI.registerEmployer({
        company_name: form.company_name,
        gstin_fssai_id: form.gstin_fssai_id,
        contact_person: form.contact_person,
        email: form.email,
        phone_number: form.phone_number,
        password: form.password,
        category: form.category,
        jurisdiction_zone: form.jurisdiction_zone,
        phone_otp: phoneOtp,
        email_otp: emailOtp,
      });

      const { user, access_token, unique_login_id } = res.data;
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));

      toast.success(`Account created! Your Unique ID is ${unique_login_id}`);
      navigate('/employer/dashboard');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Registration failed. Please check your entries.');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EAF0F8] text-slate-900 flex flex-col justify-between selection:bg-blue-600 selection:text-white font-sans antialiased">
      {/* Top National Tricolor Ribbon */}
      <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-white to-emerald-600 shadow-xs" />

      {/* Official Government Top Header */}
      <header className="max-w-5xl w-full mx-auto px-4 pt-4 pb-2">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 via-red-600 to-amber-500 flex items-center justify-center text-white shadow-sm shadow-rose-500/20 shrink-0">
              <Building2 className="w-5 h-5 fill-white/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-900 text-sm tracking-tight">
                  DIRECTORATE OF LEGAL METROLOGY
                </span>
                <span className="text-3xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md">
                  GOVT OF INDIA
                </span>
              </div>
              <span className="text-3xs text-slate-500 font-semibold block">
                Ministry of Consumer Affairs, Food & Public Distribution • Legal Metrology (Packaged Commodities) Rules, 2011
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-xs font-extrabold text-blue-700 hover:text-blue-800 px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200/80 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <span>Existing Brand Login</span>
            </Link>
            <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs shadow-2xs">
              🇮🇳
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl w-full mx-auto px-4 py-4 my-2 space-y-4">
        {/* Institutional Authority Pill Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xs font-mono font-black px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300">
              LEVEL 6 • BRAND OWNER & MANUFACTURER
            </span>
            <span className="text-xs font-bold text-slate-700">
              Enterprise Packaging Clearance & Self-Test Suite
            </span>
          </div>
        </div>

        {/* Registration Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/90 p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>Register New Brand / Manufacturing Enterprise</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify your GSTIN/FSSAI entity, mobile number, and company email to access pre-market self-tests and certificate approvals.
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5 text-xs">
            {/* Step 1: Enterprise Core Details */}
            <div className="space-y-3">
              <div className="font-extrabold text-slate-800 uppercase tracking-wider text-2xs flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-3xs">1</span>
                <span>Enterprise & Statutory Registration</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Company / Brand Name *</label>
                  <input
                    type="text"
                    name="company_name"
                    required
                    placeholder="e.g. Parle Products Pvt Ltd"
                    value={form.company_name}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold p-2.5 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">GSTIN / FSSAI Number *</label>
                  <input
                    type="text"
                    name="gstin_fssai_id"
                    required
                    placeholder="e.g. 27AAACP1234F1Z5 or 14-digit FSSAI"
                    value={form.gstin_fssai_id}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold font-mono p-2.5 rounded-xl uppercase focus:bg-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Contact Person Full Name *</label>
                  <input
                    type="text"
                    name="contact_person"
                    required
                    placeholder="e.g. Vikram Malhotra"
                    value={form.contact_person}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold p-2.5 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Primary Industry Sector</label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold p-2.5 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none"
                  >
                    <option value="food">Food & Beverages</option>
                    <option value="cosmetics">Cosmetics & Personal Care</option>
                    <option value="pharma">Pharmaceuticals & Healthcare</option>
                    <option value="electronics">Consumer Electronics</option>
                    <option value="all">General Packaging Commodities</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 uppercase mb-1">Manufacturing Jurisdiction Zone</label>
                  <select
                    name="jurisdiction_zone"
                    value={form.jurisdiction_zone}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold p-2.5 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none"
                  >
                    <option value="North Zone (Delhi NCR)">North Zone (Delhi NCR, Noida, Haryana)</option>
                    <option value="West Zone (Mumbai / Pune)">West Zone (Maharashtra, Gujarat, Goa)</option>
                    <option value="South Zone (Bangalore / Chennai)">South Zone (Karnataka, Tamil Nadu, Telangana)</option>
                    <option value="East Zone (Kolkata / Guwahati)">East Zone (West Bengal, Bihar, Assam)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Step 2: Dual OTP Verification (Phone + Email) */}
            <div className="space-y-4 pt-3 border-t border-slate-200">
              <div className="font-extrabold text-slate-800 uppercase tracking-wider text-2xs flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-3xs">2</span>
                <span>Dual OTP Verification (Mobile Phone & Company Email)</span>
              </div>

              {/* 1. Mobile Phone OTP Verification */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <Phone className="w-4 h-4 text-indigo-600" />
                    <span>Mobile Phone Verification</span>
                  </div>
                  {phoneVerified ? (
                    <span className="flex items-center gap-1 text-2xs font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verified</span>
                    </span>
                  ) : (
                    <span className="text-2xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-300">
                      Verification Required
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <input
                      type="tel"
                      name="phone_number"
                      disabled={phoneVerified}
                      placeholder="Enter 10-digit mobile number (e.g. 9876543210)"
                      value={form.phone_number}
                      onChange={handleInputChange}
                      className="w-full bg-white border border-slate-300 text-slate-900 font-semibold p-2.5 rounded-xl focus:border-indigo-600 focus:outline-none disabled:bg-slate-100"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendPhoneOtp}
                    disabled={sendingPhoneOtp || phoneVerified}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2.5 px-3 rounded-xl transition-all shadow-xs"
                  >
                    {sendingPhoneOtp ? 'Sending...' : phoneOtpSent ? 'Resend SMS OTP' : 'Send SMS OTP'}
                  </button>
                </div>

                {phoneOtpSent && !phoneVerified && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="Enter 6-digit Phone OTP"
                        value={phoneOtp}
                        onChange={(e) => setPhoneOtp(e.target.value)}
                        className="w-48 bg-white border border-indigo-300 text-slate-900 font-mono font-bold text-center tracking-widest p-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyPhoneOtp}
                        disabled={verifyingPhoneOtp}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl shadow-xs"
                      >
                        {verifyingPhoneOtp ? 'Verifying...' : 'Verify Phone'}
                      </button>
                    </div>

                    {phoneOtpPreview && (
                      <div className="text-3xs text-slate-500 bg-indigo-50/80 p-2 rounded-lg border border-indigo-100 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>Demo SMS Simulation OTP: <strong className="font-mono text-indigo-700 text-xs">{phoneOtpPreview}</strong></span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Company Email OTP Verification */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <Mail className="w-4 h-4 text-indigo-600" />
                    <span>Official Company Email Verification</span>
                  </div>
                  {emailVerified ? (
                    <span className="flex items-center gap-1 text-2xs font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verified</span>
                    </span>
                  ) : (
                    <span className="text-2xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-300">
                      Verification Required
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <input
                      type="email"
                      name="email"
                      disabled={emailVerified}
                      placeholder="corporate.email@company.com"
                      value={form.email}
                      onChange={handleInputChange}
                      className="w-full bg-white border border-slate-300 text-slate-900 font-semibold p-2.5 rounded-xl focus:border-indigo-600 focus:outline-none disabled:bg-slate-100"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendEmailOtp}
                    disabled={sendingEmailOtp || emailVerified}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2.5 px-3 rounded-xl transition-all shadow-xs"
                  >
                    {sendingEmailOtp ? 'Sending...' : emailOtpSent ? 'Resend Email Code' : 'Send Email OTP'}
                  </button>
                </div>

                {emailOtpSent && !emailVerified && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="Enter 6-digit Email OTP"
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value)}
                        className="w-48 bg-white border border-indigo-300 text-slate-900 font-mono font-bold text-center tracking-widest p-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyEmailOtp}
                        disabled={verifyingEmailOtp}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl shadow-xs"
                      >
                        {verifyingEmailOtp ? 'Verifying...' : 'Verify Email'}
                      </button>
                    </div>

                    {emailOtpPreview && (
                      <div className="text-3xs text-slate-500 bg-indigo-50/80 p-2 rounded-lg border border-indigo-100 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>Demo Email Simulation OTP: <strong className="font-mono text-indigo-700 text-xs">{emailOtpPreview}</strong></span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Security & Password */}
            <div className="space-y-3 pt-3 border-t border-slate-200">
              <div className="font-extrabold text-slate-800 uppercase tracking-wider text-2xs flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-3xs">3</span>
                <span>Security & Password Credentials</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Create Password *</label>
                  <input
                    type="password"
                    name="password"
                    required
                    placeholder="Minimum 6 characters"
                    value={form.password}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold p-2.5 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Confirm Password *</label>
                  <input
                    type="password"
                    name="confirm_password"
                    required
                    placeholder="Repeat password"
                    value={form.confirm_password}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold p-2.5 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-200">
              <button
                type="submit"
                disabled={registering}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-sm py-3 px-4 rounded-xl transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
              >
                {registering ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Entity & Creating Account...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Complete Verification & Register Brand Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Already have an account? */}
          <div className="text-center pt-2 border-t border-slate-100 text-xs text-slate-500">
            Already have an enterprise account?{' '}
            <Link to="/login" className="text-blue-700 font-bold hover:underline">
              Sign In to Portal
            </Link>
          </div>
        </div>
      </main>

      {/* Official Government Footer */}
      <footer className="max-w-5xl w-full mx-auto px-4 py-4 text-center text-3xs text-slate-500 space-y-1">
        <p>© 2026 Directorate of Legal Metrology • Ministry of Consumer Affairs, Government of India</p>
        <p>National Portal for Legal Metrology (Packaged Commodities) Compliance • Secured with 256-bit SSL & OTP Authentication</p>
      </footer>
    </div>
  );
}
