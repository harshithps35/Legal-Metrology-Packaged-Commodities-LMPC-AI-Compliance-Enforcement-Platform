import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  ShieldAlert,
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
  Building,
  UserCheck,
} from 'lucide-react';
import { authAPI } from '../../../services/api';
import toast from 'react-hot-toast';

export default function InspectorRegister() {
  const navigate = useNavigate();

  // Form State
  const [form, setForm] = useState({
    full_name: '',
    department: 'Legal Metrology Enforcement Directorate',
    jurisdiction_zone: 'North Zone (Delhi NCR)',
    assigned_category: 'all',
    email: '',
    phone_number: '',
    password: '',
    confirm_password: '',
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

  // Success Application Modal State
  const [registeredOfficer, setRegisteredOfficer] = useState(null);

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
      toast.error('Please enter a valid official Gmail / Email address.');
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
      toast.success('Official Gmail verified successfully! ✅');
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

    if (!form.full_name) {
      toast.error('Please enter your full name and designation.');
      return;
    }

    if (!phoneVerified) {
      toast.error('Please verify your Mobile Phone number with OTP.');
      return;
    }

    if (!emailVerified) {
      toast.error('Please verify your Official Gmail with OTP.');
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
      const res = await authAPI.registerInspector({
        full_name: form.full_name,
        department: form.department,
        jurisdiction_zone: form.jurisdiction_zone,
        assigned_category: form.assigned_category,
        email: form.email,
        phone_number: form.phone_number,
        password: form.password,
        phone_otp: phoneOtp,
        email_otp: emailOtp,
      });

      setRegisteredOfficer(res.data);
      toast.success('Application submitted for Supervisor Approval!');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Inspector registration failed.');
    } finally {
      setRegistering(false);
    }
  };

  const location = useLocation();
  const isStandalone = location.pathname === '/inspector/register' || location.pathname === '/register/inspector';

  const FormContent = (
    <div className="bg-white rounded-3xl shadow-xs border border-slate-200/90 p-6 sm:p-8 space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-2xs font-mono font-bold uppercase mb-2">
          <span>Level 4 • Lead Inspector Commissioning</span>
        </div>
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          <span>Register & Sponsor New Lead Inspector Candidate Post</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Active Lead Inspector authority to register, verify credentials, and sponsor a new candidate Lead Inspector post. The dossier is submitted directly to the <strong>Assistant Legal Metrology Officer (ALMO - Level 3)</strong> for statutory sanction, badge allotment, and commissioning.
        </p>
      </div>

      {!registeredOfficer ? (
            <form onSubmit={handleRegister} className="space-y-5 text-xs">
              {/* Step 1: Officer Credentials */}
              <div className="space-y-3">
                <div className="font-extrabold text-slate-800 uppercase tracking-wider text-2xs flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-3xs">1</span>
                  <span>Officer Identity & Deployment</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Full Name & Title *</label>
                    <input
                      type="text"
                      name="full_name"
                      required
                      placeholder="e.g. Inspector Priya Deshmukh"
                      value={form.full_name}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold p-2.5 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Department / Wing</label>
                    <input
                      type="text"
                      name="department"
                      value={form.department}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold p-2.5 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Jurisdiction Zone *</label>
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

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Assigned Audit Sector</label>
                    <select
                      name="assigned_category"
                      value={form.assigned_category}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold p-2.5 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none"
                    >
                      <option value="all">All Commodities (General FMCG)</option>
                      <option value="food">Food & Beverages</option>
                      <option value="cosmetics">Cosmetics & Personal Care</option>
                      <option value="pharma">Pharmaceuticals & Healthcare</option>
                      <option value="electronics">Consumer Electronics</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Step 2: Dual OTP Verification (Phone + Gmail) */}
              <div className="space-y-4 pt-3 border-t border-slate-200">
                <div className="font-extrabold text-slate-800 uppercase tracking-wider text-2xs flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-3xs">2</span>
                  <span>Dual OTP Verification (Mobile Phone & Official Gmail)</span>
                </div>

                {/* 1. Mobile Phone OTP Verification */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-slate-800">
                      <Phone className="w-4 h-4 text-indigo-600" />
                      <span>Officer Mobile Phone Verification</span>
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
                        placeholder="Enter 10-digit mobile number (e.g. 9871234504)"
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

                {/* 2. Official Gmail OTP Verification */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-slate-800">
                      <Mail className="w-4 h-4 text-indigo-600" />
                      <span>Official Gmail / Email Verification</span>
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
                        placeholder="officer.name.lmpc@gmail.com"
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
                      {sendingEmailOtp ? 'Sending...' : emailOtpSent ? 'Resend Email Code' : 'Send Gmail OTP'}
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
                          {verifyingEmailOtp ? 'Verifying...' : 'Verify Gmail'}
                        </button>
                      </div>

                      {emailOtpPreview && (
                        <div className="text-3xs text-slate-500 bg-indigo-50/80 p-2 rounded-lg border border-indigo-100 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>Demo Gmail Simulation OTP: <strong className="font-mono text-indigo-700 text-xs">{emailOtpPreview}</strong></span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3: Password */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="font-extrabold text-slate-800 uppercase tracking-wider text-2xs flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-3xs">3</span>
                  <span>Security Password</span>
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
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-sm py-3 px-4 rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
                >
                  {registering ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Officer Application...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Submit Officer Application for Supervisor Approval</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Application Submitted Success State */
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto border-2 border-amber-300 shadow-md">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Application Submitted for ALMO Verification</h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
                  Your officer registration has been forwarded to the <strong>Assistant Legal Metrology Officer (ALMO - Level 3)</strong> for statutory verification, commissioning, and login activation.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 max-w-md mx-auto text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Provisional Unique ID:</span>
                  <span className="font-mono font-extrabold text-indigo-700 text-sm">{registeredOfficer.unique_login_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Officer Name:</span>
                  <span className="font-bold text-slate-900">{registeredOfficer.user?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Role:</span>
                  <span className="font-mono font-bold text-blue-700">Lead Inspector (Level 4)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Verification Authority:</span>
                  <span className="font-bold text-amber-600">ALMO Sanctioning Office</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Registered Gmail:</span>
                  <span className="font-semibold text-slate-800">{registeredOfficer.user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Approval Status:</span>
                  <span className="text-2xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                    Pending ALMO Approval
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => navigate('/login')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-md transition-all text-xs"
                >
                  Return to Portal Login
                </button>
              </div>
            </div>
          )}

          {/* Already have an account? */}
          <div className="text-center pt-2 border-t border-slate-100 text-xs text-slate-500">
            Already commissioned?{' '}
            <Link to="/login" className="text-blue-700 font-bold hover:underline">
              Sign In with Gmail / Unique ID
            </Link>
          </div>
    </div>
  );

  if (!isStandalone) {
    return (
      <div className="space-y-6 animate-fade-in">
        {FormContent}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EAF0F8] text-slate-900 flex flex-col justify-between selection:bg-blue-600 selection:text-white font-sans antialiased">
      {/* Top National Tricolor Ribbon */}
      <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-white to-emerald-600 shadow-xs" />

      {/* Official Government Top Header */}
      <header className="max-w-5xl w-full mx-auto px-4 pt-4 pb-2">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 via-red-600 to-amber-500 flex items-center justify-center text-white shadow-sm shadow-rose-500/20 shrink-0">
              <UserCheck className="w-5 h-5 fill-white/20" />
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
                Ministry of Consumer Affairs, Food & Public Distribution • Legal Metrology Act, 2009
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-xs font-extrabold text-blue-700 hover:text-blue-800 px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200/80 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <span>Existing Officer Login</span>
            </Link>
            <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs shadow-2xs">
              🇮🇳
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl w-full mx-auto px-4 py-4 my-2 space-y-4">
        {FormContent}
      </main>

      {/* Official Government Footer */}
      <footer className="max-w-5xl w-full mx-auto px-4 py-4 text-center text-3xs text-slate-500 space-y-1">
        <p>© 2026 Directorate of Legal Metrology • Ministry of Consumer Affairs, Government of India</p>
        <p>National Portal for Legal Metrology (Packaged Commodities) Compliance • Secured with 256-bit SSL & OTP Authentication</p>
      </footer>
    </div>
  );
}
