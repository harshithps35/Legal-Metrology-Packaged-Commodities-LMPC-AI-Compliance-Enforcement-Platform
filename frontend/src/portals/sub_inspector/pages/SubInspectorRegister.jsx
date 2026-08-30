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
  Compass,
  FileText,
  BadgeCheck,
  ExternalLink,
} from 'lucide-react';
import { authAPI } from '../../../services/api';
import toast from 'react-hot-toast';

export default function SubInspectorRegister() {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine if this is rendered as a standalone page vs embedded inside the portal layout
  const isStandalone = location.pathname === '/sub-inspector/register' || location.pathname === '/register/sub-inspector';

  // Form State
  const [form, setForm] = useState({
    full_name: '',
    department: 'Field Inspection Squad & On-site Verification',
    jurisdiction_zone: 'North Zone (Noida / Delhi NCR)',
    assigned_category: 'all',
    email: '',
    phone_number: '',
    password: '',
    confirm_password: '',
  });

  // Statutory Undertaking Acceptance
  const [declaredAffirmation, setDeclaredAffirmation] = useState(true);

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
      toast.error('Please enter the OTP verification code.');
      return;
    }
    try {
      setVerifyingPhoneOtp(true);
      const res = await authAPI.verifyPhoneOTP(form.phone_number, phoneOtp);
      setPhoneVerified(true);
      toast.success('Mobile number verified successfully! ✅');
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
      toast.error('Please enter a valid official Directorate email address.');
      return;
    }
    try {
      setSendingEmailOtp(true);
      const res = await authAPI.sendEmailOTP(form.email);
      setEmailOtpSent(true);
      setEmailOtpPreview(res.data?.otp_preview || '');
      toast.success(`Verification OTP sent to ${form.email}!`);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to send Email OTP');
    } finally {
      setSendingEmailOtp(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp || emailOtp.length < 4) {
      toast.error('Please enter the Email verification code.');
      return;
    }
    try {
      setVerifyingEmailOtp(true);
      const res = await authAPI.verifyEmailOTP(form.email, emailOtp);
      setEmailVerified(true);
      toast.success('Official Email verified successfully! ✅');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Invalid Email OTP');
    } finally {
      setVerifyingEmailOtp(false);
    }
  };

  // --- Final Sub-Inspector Registration Submit ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!phoneVerified) {
      toast.error('Please verify your Mobile Phone number via OTP first.');
      return;
    }
    if (!emailVerified) {
      toast.error('Please verify your Official Directorate Email via OTP first.');
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
    if (!declaredAffirmation) {
      toast.error('You must accept the statutory affirmation to proceed.');
      return;
    }

    try {
      setRegistering(true);
      const payload = {
        full_name: form.full_name,
        department: form.department,
        jurisdiction_zone: form.jurisdiction_zone,
        assigned_category: form.assigned_category,
        email: form.email,
        phone_number: form.phone_number,
        password: form.password,
        phone_otp: phoneOtp,
        email_otp: emailOtp,
      };

      const res = await authAPI.registerSubInspector(payload);
      toast.success(res.data?.message || 'Sub-Inspector application submitted successfully!');
      setRegisteredOfficer(res.data);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to register Sub-Inspector account.');
    } finally {
      setRegistering(false);
    }
  };

  // Inner Form Content Component
  const FormContent = (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
      {/* Header Info */}
      <div className="border-b border-slate-100 pb-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-3xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full">
            LEVEL 5 • FIELD SQUAD ONBOARDING
          </span>
          <span className="text-3xs text-slate-500 font-mono font-semibold flex items-center gap-1">
            <BadgeCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Section 15 Field Authority</span>
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Register & Sponsor New Sub-Inspector Candidate Post
        </h1>
        <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-2xl">
          Active Sub-Inspector authority to register, verify credentials, and sponsor a new Sub-Inspector candidate post. The application is forwarded directly to the <strong>Assistant Legal Metrology Officer (ALMO - Level 3)</strong> for statutory sanction, badge allotment, and commissioning.
        </p>
      </div>

      {!registeredOfficer ? (
        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          
          {/* SECTION 1: Officer Profile & Deployment */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
              <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center text-3xs font-bold font-mono">
                1
              </div>
              <span>Officer Identity & Territorial Posting</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1 text-3xs">
                  Full Legal Name (as per Govt ID) *
                </label>
                <input
                  type="text"
                  name="full_name"
                  required
                  placeholder="e.g. Sanjay Kumar"
                  value={form.full_name}
                  onChange={handleInputChange}
                  className="w-full bg-[#F8FAFD] border border-slate-300 text-slate-900 font-semibold p-2.5 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1 text-3xs">
                  Department / Division Unit *
                </label>
                <input
                  type="text"
                  name="department"
                  required
                  value={form.department}
                  onChange={handleInputChange}
                  className="w-full bg-[#F8FAFD] border border-slate-300 text-slate-900 font-semibold p-2.5 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1 text-3xs">
                  Assigned District Zone Jurisdiction *
                </label>
                <select
                  name="jurisdiction_zone"
                  value={form.jurisdiction_zone}
                  onChange={handleInputChange}
                  className="w-full bg-[#F8FAFD] border border-slate-300 text-slate-900 font-bold p-2.5 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all cursor-pointer"
                >
                  <option value="North Zone (Noida / Delhi NCR)">North Zone (Noida / Delhi NCR)</option>
                  <option value="South Zone (Bengaluru / Chennai)">South Zone (Bengaluru / Chennai)</option>
                  <option value="West Zone (Mumbai / Pune)">West Zone (Mumbai / Pune)</option>
                  <option value="East Zone (Kolkata / Patna)">East Zone (Kolkata / Patna)</option>
                  <option value="Central Zone (Bhopal / Indore)">Central Zone (Bhopal / Indore)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1 text-3xs">
                  Assigned Packaged Sector Specialization *
                </label>
                <select
                  name="assigned_category"
                  value={form.assigned_category}
                  onChange={handleInputChange}
                  className="w-full bg-[#F8FAFD] border border-slate-300 text-slate-900 font-bold p-2.5 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all cursor-pointer"
                >
                  <option value="all">All Packaged Commodity Sectors</option>
                  <option value="food">Packaged Foods & Confectionery</option>
                  <option value="cosmetics">Cosmetics & Personal Care</option>
                  <option value="electronics">Electronics & Appliances</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 2: Dual-Channel OTP Directorate Verification */}
          <div className="space-y-3.5 pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wide">
                <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center text-3xs font-bold font-mono">
                  2
                </div>
                <span>Directorate Security Dual-Channel OTP Authentication</span>
              </div>
              <span className="text-3xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                MANDATORY 2-STEP
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mobile OTP Card */}
              <div className={`p-4 rounded-2xl border transition-all ${
                phoneVerified
                  ? 'bg-emerald-50/60 border-emerald-300'
                  : 'bg-[#F8FAFD] border-slate-200'
              } space-y-3`}>
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Official Mobile Phone *</span>
                  </label>
                  {phoneVerified && (
                    <span className="inline-flex items-center gap-1 text-3xs font-mono font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> VERIFIED
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                      +91
                    </span>
                    <input
                      type="tel"
                      name="phone_number"
                      required
                      disabled={phoneVerified}
                      placeholder="10-digit mobile"
                      value={form.phone_number}
                      onChange={handleInputChange}
                      className="w-full bg-white border border-slate-300 text-slate-900 font-semibold pl-11 pr-3 py-2 rounded-xl focus:border-blue-600 focus:outline-none text-xs"
                    />
                  </div>
                  {!phoneVerified && (
                    <button
                      type="button"
                      onClick={handleSendPhoneOtp}
                      disabled={sendingPhoneOtp || !form.phone_number}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold rounded-xl whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 shadow-xs"
                    >
                      {sendingPhoneOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3.5 h-3.5" />}
                      <span>{phoneOtpSent ? 'Resend' : 'Send OTP'}</span>
                    </button>
                  )}
                </div>

                {phoneOtpSent && !phoneVerified && (
                  <div className="pt-2 space-y-2 border-t border-slate-200">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter 6-digit SMS OTP"
                        value={phoneOtp}
                        onChange={(e) => setPhoneOtp(e.target.value)}
                        className="flex-1 bg-white border border-blue-400 text-blue-950 font-mono font-bold text-center tracking-widest py-2 px-3 rounded-xl focus:outline-none text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyPhoneOtp}
                        disabled={verifyingPhoneOtp || !phoneOtp}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
                      >
                        {verifyingPhoneOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span>Verify</span>
                      </button>
                    </div>
                    {phoneOtpPreview && (
                      <div className="text-3xs text-slate-600 font-mono bg-white p-2 rounded-lg border border-slate-200 text-center">
                        Official Sandbox OTP: <strong className="text-blue-700 font-black">{phoneOtpPreview}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Email OTP Card */}
              <div className={`p-4 rounded-2xl border transition-all ${
                emailVerified
                  ? 'bg-emerald-50/60 border-emerald-300'
                  : 'bg-[#F8FAFD] border-slate-200'
              } space-y-3`}>
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    <span>Official Directorate Email *</span>
                  </label>
                  {emailVerified && (
                    <span className="inline-flex items-center gap-1 text-3xs font-mono font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> VERIFIED
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="email"
                    name="email"
                    required
                    disabled={emailVerified}
                    placeholder="sanjay.subinsp@lmpc.gov.in"
                    value={form.email}
                    onChange={handleInputChange}
                    className="flex-1 bg-white border border-slate-300 text-slate-900 font-semibold p-2 rounded-xl focus:border-blue-600 focus:outline-none text-xs"
                  />
                  {!emailVerified && (
                    <button
                      type="button"
                      onClick={handleSendEmailOtp}
                      disabled={sendingEmailOtp || !form.email}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold rounded-xl whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 shadow-xs"
                    >
                      {sendingEmailOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                      <span>{emailOtpSent ? 'Resend' : 'Send OTP'}</span>
                    </button>
                  )}
                </div>

                {emailOtpSent && !emailVerified && (
                  <div className="pt-2 space-y-2 border-t border-slate-200">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter 6-digit Email OTP"
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value)}
                        className="flex-1 bg-white border border-blue-400 text-blue-950 font-mono font-bold text-center tracking-widest py-2 px-3 rounded-xl focus:outline-none text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyEmailOtp}
                        disabled={verifyingEmailOtp || !emailOtp}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
                      >
                        {verifyingEmailOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span>Verify</span>
                      </button>
                    </div>
                    {emailOtpPreview && (
                      <div className="text-3xs text-slate-600 font-mono bg-white p-2 rounded-lg border border-slate-200 text-center">
                        Official Sandbox OTP: <strong className="text-blue-700 font-black">{emailOtpPreview}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 3: Portal Security Credentials */}
          <div className="space-y-3.5 pt-2">
            <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
              <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center text-3xs font-bold font-mono">
                3
              </div>
              <span>Portal Access Security Credentials</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1 text-3xs">
                  Portal Security Password *
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={form.password}
                  onChange={handleInputChange}
                  className="w-full bg-[#F8FAFD] border border-slate-300 text-slate-900 font-semibold p-2.5 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-xs transition-all"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1 text-3xs">
                  Confirm Security Password *
                </label>
                <input
                  type="password"
                  name="confirm_password"
                  required
                  placeholder="Confirm password"
                  value={form.confirm_password}
                  onChange={handleInputChange}
                  className="w-full bg-[#F8FAFD] border border-slate-300 text-slate-900 font-semibold p-2.5 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-xs transition-all"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: Statutory Undertaking */}
          <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={declaredAffirmation}
                onChange={(e) => setDeclaredAffirmation(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-3xs text-slate-700 leading-relaxed">
                <strong>Statutory Undertaking:</strong> I hereby apply for commissioning as a Sub-Inspector (Level 5) under the Legal Metrology Act, 2009. I solemnly declare that all information submitted is true, complete, and verifiable. I agree that field powers and electronic credentials remain subject to formal approval and oversight by the Assistant Legal Metrology Officer (ALMO - Level 3).
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => isStandalone ? navigate('/login') : navigate('/sub-inspector/visits')}
              className="text-xs font-extrabold text-slate-600 hover:text-slate-900 py-2.5 px-4 cursor-pointer"
            >
              Cancel & Return
            </button>

            <button
              type="submit"
              disabled={registering || !phoneVerified || !emailVerified}
              className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              {registering ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting to ALMO Directorate...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Submit Application for ALMO Commissioning</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* Application Submitted Success State */
        <div className="text-center py-6 space-y-5 animate-fade-in">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-400 shadow-md">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Officer Commissioning Application Submitted
            </h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto mt-1 leading-relaxed">
              Your registration dossier has been logged and transmitted to the <strong>Assistant Legal Metrology Officer (ALMO - Level 3)</strong> for statutory review and login credential activation.
            </p>
          </div>

          <div className="bg-[#F8FAFD] p-5 rounded-2xl border border-slate-200 max-w-md mx-auto text-left space-y-2.5 text-xs shadow-xs">
            <div className="flex justify-between items-center border-b border-slate-200/80 pb-2">
              <span className="text-slate-500 font-bold text-3xs uppercase">Provisional Login ID:</span>
              <span className="font-mono font-black text-blue-700 text-sm bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                {registeredOfficer.unique_login_id}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold">Officer Name:</span>
              <span className="font-bold text-slate-900">{registeredOfficer.user?.full_name || form.full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold">Institutional Designation:</span>
              <span className="font-mono font-bold text-emerald-700">Sub-Inspector (Level 5)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold">Zonal Jurisdiction:</span>
              <span className="font-bold text-slate-800">{form.jurisdiction_zone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold">Commissioning Authority:</span>
              <span className="font-bold text-indigo-700">ALMO Regional Directorate (Level 3)</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-200/80">
              <span className="text-slate-500 font-bold">Current Status:</span>
              <span className="text-3xs font-mono font-extrabold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full">
                PENDING_ALMO_APPROVAL
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => isStandalone ? navigate('/login') : navigate('/sub-inspector/visits')}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-500/25 transition-all cursor-pointer"
            >
              {isStandalone ? 'Return to Portal Login' : 'Return to Field Visits'}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // If accessed inside the portal (e.g. /sub-inspector/registration), render cleanly without outer page wrappers
  if (!isStandalone) {
    return (
      <div className="space-y-6 animate-fade-in">
        {FormContent}
      </div>
    );
  }

  // Standalone Public Registration View
  return (
    <div className="min-h-screen bg-[#EAF0F8] text-slate-900 flex flex-col justify-between selection:bg-blue-600 selection:text-white font-sans antialiased">
      {/* Top National Tricolor Ribbon */}
      <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-white to-emerald-600 shadow-xs" />

      {/* Official Government Top Header */}
      <header className="max-w-5xl w-full mx-auto px-4 pt-4 pb-2">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 via-red-600 to-amber-500 flex items-center justify-center text-white shadow-sm shadow-rose-500/20 shrink-0">
              <Shield className="w-5 h-5 fill-white/20" />
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
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs shadow-2xs">
              🇮🇳
            </div>
          </div>
        </div>
      </header>

      {/* Main Registration Container */}
      <main className="max-w-4xl w-full mx-auto px-4 py-4 my-2">
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
