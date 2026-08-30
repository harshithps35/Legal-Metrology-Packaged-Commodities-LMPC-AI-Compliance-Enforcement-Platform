import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award,
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
  Building2,
  UserCheck,
  Scale,
  Send,
  Building,
  Check,
  RotateCcw,
} from 'lucide-react';
import { authAPI } from '../../../services/api';
import toast from 'react-hot-toast';

export default function CLMORegister() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: '',
    department: 'Apex State Legal Metrology Directorate (Level 2)',
    jurisdiction_zone: 'Statewide Headquarters & Pre-Market Adjudication Division',
    assigned_category: 'all',
    email: '',
    phone_number: '',
    password: '',
    confirm_password: '',
  });

  const [phoneOtp, setPhoneOtp] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneOtpPreview, setPhoneOtpPreview] = useState('');
  const [emailOtpPreview, setEmailOtpPreview] = useState('');

  const [sendingPhoneOtp, setSendingPhoneOtp] = useState(false);
  const [verifyingPhoneOtp, setVerifyingPhoneOtp] = useState(false);
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
  const [verifyingEmailOtp, setVerifyingEmailOtp] = useState(false);
  const [registering, setRegistering] = useState(false);

  const [registeredOfficer, setRegisteredOfficer] = useState(null);

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

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
      toast.error('Please enter the email OTP code.');
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirm_password) {
      toast.error('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters.');
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
      };

      const res = await authAPI.registerCLMO(payload);
      setRegisteredOfficer(res.data?.officer || payload);
      toast.success('Candidate CLMO dossier successfully submitted to State Commissioner for sanction! 🎉');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to submit CLMO candidate registration.');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Official Directorate Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border border-purple-500/30 rounded-3xl p-6 sm:p-7 shadow-xl text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-radial from-purple-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300">
                <Scale className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-black tracking-tight text-white">
                Register & Sponsor New CLMO Candidate Post
              </h1>
              <span className="text-3xs font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-500/40 font-mono">
                Level 2 CLMO Onboarding
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Official Directorate of Legal Metrology sponsorship gateway. Active Chief Legal Metrology Officers can onboard new candidate officers and route their credentials directly to the <strong>State Legal Metrology Commissioner (Level 1)</strong> for statutory sanction, certificate sealing authority, and commissioning.
            </p>
          </div>
        </div>
      </div>

      {registeredOfficer ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-sm text-center space-y-6 animate-fade-in">
          <div className="w-16 h-16 rounded-3xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto shadow-inner border border-purple-200">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              CLMO Candidate Dossier Dispatched to Commissioner
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              The onboarding credentials for <strong>{registeredOfficer.full_name}</strong> have been logged under status <span className="font-mono font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-md">PENDING_COMMISSIONER_APPROVAL</span>.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 max-w-md mx-auto text-left text-xs space-y-2">
            <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
              <span className="text-slate-500 font-bold uppercase text-3xs">Candidate Name:</span>
              <span className="font-extrabold text-slate-900">{registeredOfficer.full_name}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
              <span className="text-slate-500 font-bold uppercase text-3xs">Official Email:</span>
              <span className="font-mono text-slate-900">{registeredOfficer.email}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
              <span className="text-slate-500 font-bold uppercase text-3xs">Assigned Division:</span>
              <span className="font-extrabold text-slate-900">{registeredOfficer.jurisdiction_zone}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-slate-500 font-bold uppercase text-3xs">Sanctioning Gate:</span>
              <span className="font-bold text-indigo-700 font-mono">State Commissioner Level 1 Approval Vault</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setRegisteredOfficer(null);
                setForm({
                  full_name: '',
                  department: 'Apex State Legal Metrology Directorate (Level 2)',
                  jurisdiction_zone: 'Statewide Headquarters & Pre-Market Adjudication Division',
                  assigned_category: 'all',
                  email: '',
                  phone_number: '',
                  password: '',
                  confirm_password: '',
                });
                setPhoneVerified(false);
                setEmailVerified(false);
                setPhoneOtpSent(false);
                setEmailOtpSent(false);
              }}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Register Another Candidate Post</span>
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 text-slate-800 text-xs">
          {/* Section 1: Candidate Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">
              <div className="w-5 h-5 rounded-md bg-purple-600 text-white flex items-center justify-center text-3xs font-bold font-mono">
                1
              </div>
              <span>Candidate Officer Identity & Regional Jurisdiction</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 uppercase text-3xs">
                  Full Officer Name & Title (as per Govt ID) *
                </label>
                <input
                  type="text"
                  name="full_name"
                  required
                  value={form.full_name}
                  onChange={handleInputChange}
                  placeholder="e.g. Dr. Anil Verma, Deputy Controller"
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700 uppercase text-3xs">
                  Jurisdiction Region / State Headquarters *
                </label>
                <select
                  name="jurisdiction_zone"
                  value={form.jurisdiction_zone}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-bold text-slate-900 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                >
                  <option value="Statewide Headquarters & Pre-Market Adjudication Division">Statewide Headquarters & Pre-Market Adjudication Division</option>
                  <option value="Northern Region Zone 1 (Delhi NCR & Western UP)">Northern Region Zone 1 (Delhi NCR & Western UP)</option>
                  <option value="Western Region Zone 2 (Maharashtra & Gujarat)">Western Region Zone 2 (Maharashtra & Gujarat)</option>
                  <option value="Southern Region Zone 3 (Karnataka & Tamil Nadu)">Southern Region Zone 3 (Karnataka & Tamil Nadu)</option>
                  <option value="Eastern Region Zone 4 (West Bengal & Odisha)">Eastern Region Zone 4 (West Bengal & Odisha)</option>
                </select>
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="block font-bold text-slate-700 uppercase text-3xs">
                  Directorate Division / Statutory Wing *
                </label>
                <input
                  type="text"
                  name="department"
                  required
                  value={form.department}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Contact & Official Verification */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">
              <div className="w-5 h-5 rounded-md bg-purple-600 text-white flex items-center justify-center text-3xs font-bold font-mono">
                2
              </div>
              <span>Official Communications & Two-Factor Authentication</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Email */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 uppercase text-3xs">
                  Official Directorate Email *
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    name="email"
                    required
                    disabled={emailVerified}
                    value={form.email}
                    onChange={handleInputChange}
                    placeholder="e.g. clmo.supervisor.lmpc@gmail.com"
                    className="flex-1 bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-purple-600 outline-none"
                  />
                  {!emailVerified && (
                    <button
                      type="button"
                      onClick={handleSendEmailOtp}
                      disabled={sendingEmailOtp || !form.email}
                      className="px-3.5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-3xs transition-all cursor-pointer shrink-0"
                    >
                      {sendingEmailOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : emailOtpSent ? 'Resend' : 'Send OTP'}
                    </button>
                  )}
                  {emailVerified && (
                    <span className="px-3 py-2.5 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-xl text-3xs flex items-center gap-1 shrink-0">
                      <Check className="w-3.5 h-3.5" />
                      <span>Verified</span>
                    </span>
                  )}
                </div>

                {emailOtpSent && !emailVerified && (
                  <div className="flex gap-2 mt-2 p-2.5 bg-purple-50 border border-purple-200 rounded-xl">
                    <input
                      type="text"
                      placeholder={`Enter OTP (${emailOtpPreview || '123456'})`}
                      value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value)}
                      className="flex-1 bg-white border border-purple-300 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyEmailOtp}
                      disabled={verifyingEmailOtp}
                      className="px-3 py-1.5 bg-purple-600 text-white font-bold rounded-lg text-3xs hover:bg-purple-700"
                    >
                      {verifyingEmailOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Verify'}
                    </button>
                  </div>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 uppercase text-3xs">
                  Officer Official Mobile Number *
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    name="phone_number"
                    required
                    disabled={phoneVerified}
                    value={form.phone_number}
                    onChange={handleInputChange}
                    placeholder="e.g. 9811029384"
                    className="flex-1 bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-purple-600 outline-none"
                  />
                  {!phoneVerified && (
                    <button
                      type="button"
                      onClick={handleSendPhoneOtp}
                      disabled={sendingPhoneOtp || !form.phone_number}
                      className="px-3.5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-3xs transition-all cursor-pointer shrink-0"
                    >
                      {sendingPhoneOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : phoneOtpSent ? 'Resend' : 'Send OTP'}
                    </button>
                  )}
                  {phoneVerified && (
                    <span className="px-3 py-2.5 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-xl text-3xs flex items-center gap-1 shrink-0">
                      <Check className="w-3.5 h-3.5" />
                      <span>Verified</span>
                    </span>
                  )}
                </div>

                {phoneOtpSent && !phoneVerified && (
                  <div className="flex gap-2 mt-2 p-2.5 bg-purple-50 border border-purple-200 rounded-xl">
                    <input
                      type="text"
                      placeholder={`Enter OTP (${phoneOtpPreview || '123456'})`}
                      value={phoneOtp}
                      onChange={(e) => setPhoneOtp(e.target.value)}
                      className="flex-1 bg-white border border-purple-300 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyPhoneOtp}
                      disabled={verifyingPhoneOtp}
                      className="px-3 py-1.5 bg-purple-600 text-white font-bold rounded-lg text-3xs hover:bg-purple-700"
                    >
                      {verifyingPhoneOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Verify'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Portal Security Passcode */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">
              <div className="w-5 h-5 rounded-md bg-purple-600 text-white flex items-center justify-center text-3xs font-bold font-mono">
                3
              </div>
              <span>Adjudication Authority Access Credentials</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 uppercase text-3xs">
                  Create Account Password *
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  value={form.password}
                  onChange={handleInputChange}
                  placeholder="Min 6 characters"
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-purple-600 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700 uppercase text-3xs">
                  Confirm Account Password *
                </label>
                <input
                  type="password"
                  name="confirm_password"
                  required
                  value={form.confirm_password}
                  onChange={handleInputChange}
                  placeholder="Re-type password"
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-purple-600 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Statutory Review Notice */}
          <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 text-2xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-purple-900">
              <ShieldCheck className="w-4 h-4 text-purple-700" />
              <span>Apex Commissioner Commissioning Gate (Section 13(1))</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Upon submission, the candidate CLMO dossier is placed in the <strong>State Legal Metrology Commissioner</strong> commissioning vault. The officer will receive certificate signing and pre-market clearance authority upon gazetted sanction.
            </p>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/clmo')}
              className="px-5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer text-xs"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={registering}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-md shadow-purple-600/30 flex items-center gap-2 cursor-pointer transition-all"
            >
              {registering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Submit Dossier to Commissioner for Sanction</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
