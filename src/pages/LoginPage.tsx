import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
  GraduationCap,
  KeyRound,
  ArrowRight,
  Lock,
  Mail,
  CheckCircle2,
  Crown,
  Key,
  Smartphone,
  Building2,
  FileText,
  Search,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import RegisterCorporateModal from '../components/RegisterCorporateModal';

type LoginRoleTab = 'BRANCH_ADMIN' | 'TEACHER' | 'STUDENT' | 'CORPORATE_ADMIN';

export default function LoginPage() {
  const navigate = useNavigate();
  const {
    loginCorporateInitiate,
    loginCorporateVerify,
    loginAdmin,
    loginTeacher,
    loginStudent,
    forgotPassword,
    resetPassword,
    lookupCorporate
  } = useAuth();

  const [activeTab, setActiveTab] = useState<LoginRoleTab>('BRANCH_ADMIN');
  const [identifier, setIdentifier] = useState('');
  // Distinct states for Corporate Registration Number and Corporate ID
  const [registrationNo, setRegistrationNo] = useState<string>(() => {
    return localStorage.getItem('paatam_last_corporate_reg') || '';
  });
  const [corporateId, setCorporateId] = useState<string>(() => {
    return localStorage.getItem('paatam_last_corporate_id') || '';
  });
  const [corporateName, setCorporateName] = useState<string>('');
  const [isLookingUp, setIsLookingUp] = useState<boolean>(false);
  const [lookupFeedback, setLookupFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpStep, setOtpStep] = useState<'request' | 'verify'>('request');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Forgot password modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [isRegisterCorpOpen, setIsRegisterCorpOpen] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotCorporateId, setForgotCorporateId] = useState<string>(() => {
    return localStorage.getItem('paatam_last_corporate_id') || localStorage.getItem('paatam_last_corporate_reg') || '';
  });
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'reset'>('request');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Clear fields whenever active desk changes
  useEffect(() => {
    setErrorMsg('');
    setSuccessMsg('');
    setIdentifier('');
    setPassword('');
    setOtp('');
    setOtpStep('request');
    setLookupFeedback(null);
  }, [activeTab]);

  // Lookup Corporate Entity by Registration Number: GET /api/corporate/lookup/:registrationNo
  const handleLookupByRegistration = async (customReg?: string) => {
    const regToSearch = (customReg ?? registrationNo).trim();
    if (!regToSearch) {
      setLookupFeedback({ type: 'error', text: 'Please enter a Corporate Registration Number to look up.' });
      return;
    }

    setIsLookingUp(true);
    setLookupFeedback(null);

    try {
      const res = await lookupCorporate(regToSearch);
      if (res.success && res.corporate) {
        const cId = res.corporate.corporateId || res.corporate.id || '';
        const cName = res.corporate.name || '';
        const cReg = res.corporate.registration_no || regToSearch;

        if (cId) {
          setCorporateId(String(cId));
          localStorage.setItem('paatam_last_corporate_id', String(cId));
        }
        setRegistrationNo(cReg);
        localStorage.setItem('paatam_last_corporate_reg', cReg);
        setCorporateName(cName);
        setLookupFeedback({
          type: 'success',
          text: `Verified: ${cName || 'Corporate Entity'}${cId ? ` (Corporate ID: #${cId})` : ''}`
        });
      } else {
        setLookupFeedback({
          type: 'error',
          text: res.message || 'No registered corporate entity found with this registration number.'
        });
      }
    } catch {
      setLookupFeedback({
        type: 'error',
        text: 'Unable to connect to corporate lookup service.'
      });
    } finally {
      setIsLookingUp(false);
    }
  };

  // Vice-versa lookup by Corporate ID: GET /api/corporate/lookup/:param
  const handleLookupByCorporateId = async (customId?: string) => {
    const idToSearch = (customId ?? corporateId).trim();
    if (!idToSearch) {
      setLookupFeedback({ type: 'error', text: 'Please enter a Corporate ID to look up.' });
      return;
    }

    setIsLookingUp(true);
    setLookupFeedback(null);

    try {
      const res = await lookupCorporate(idToSearch);
      if (res.success && res.corporate) {
        const cId = res.corporate.corporateId || res.corporate.id || idToSearch;
        const cName = res.corporate.name || '';
        const cReg = res.corporate.registration_no || '';

        setCorporateId(String(cId));
        localStorage.setItem('paatam_last_corporate_id', String(cId));
        if (cReg) {
          setRegistrationNo(cReg);
          localStorage.setItem('paatam_last_corporate_reg', cReg);
        }
        setCorporateName(cName);
        setLookupFeedback({
          type: 'success',
          text: `Verified: ${cName || 'Corporate Entity'}${cReg ? ` (Registration: ${cReg})` : ''}`
        });
      } else {
        setLookupFeedback({
          type: 'info',
          text: `Corporate ID #${idToSearch} selected.`
        });
      }
    } catch {
      setLookupFeedback({
        type: 'info',
        text: `Corporate ID #${idToSearch} selected.`
      });
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      if (activeTab === 'CORPORATE_ADMIN') {
        if (otpStep === 'request') {
          if (!identifier.trim()) {
            setErrorMsg('Please enter your corporate email or mobile');
            setIsLoading(false);
            return;
          }
          const targetCorp = corporateId.trim() || registrationNo.trim();
          if (!targetCorp) {
            setErrorMsg('Please provide your Corporate ID or Registration Number.');
            setIsLoading(false);
            return;
          }
          const res = await loginCorporateInitiate(identifier.trim(), targetCorp);
          if (res.success) {
            setOtpStep('verify');
            if (res.otp) setOtp(res.otp);
            if (res.resolvedCorporateId) {
              setCorporateId(res.resolvedCorporateId);
              localStorage.setItem('paatam_last_corporate_id', res.resolvedCorporateId);
            }
            if (registrationNo.trim()) {
              localStorage.setItem('paatam_last_corporate_reg', registrationNo.trim());
            }
            setSuccessMsg(res.otp ? `OTP generated: ${res.otp} (auto-filled for testing)` : (res.message || 'OTP sent to registered corporate mobile/email (valid for 10 minutes)'));
          } else {
            setErrorMsg(res.message || 'Failed to send corporate OTP. Please verify identifier.');
          }
        } else {
          const targetCorp = corporateId.trim() || registrationNo.trim();
          const res = await loginCorporateVerify(identifier.trim(), otp.trim(), targetCorp);
          if (res.success) {
            setSuccessMsg('Corporate Super Admin authenticated successfully!');
            setTimeout(() => navigate('/campuses'), 500);
          } else {
            setErrorMsg(res.message || 'Invalid OTP code. Please enter valid 6 digits.');
          }
        }
      } else if (activeTab === 'BRANCH_ADMIN') {
        const res = await loginAdmin(identifier.trim(), password);
        if (res.success) {
          setSuccessMsg('Branch Administrator authenticated successfully!');
          setTimeout(() => navigate('/'), 500);
        } else {
          setErrorMsg(res.message || 'Invalid email/username or password. Please verify your credentials.');
        }
      } else if (activeTab === 'TEACHER') {
        const res = await loginTeacher(identifier.trim(), password);
        if (res.success) {
          setSuccessMsg('Faculty Teacher authenticated successfully!');
          setTimeout(() => navigate('/'), 500);
        } else {
          setErrorMsg(res.message || 'Invalid Staff ID / email or password.');
        }
      } else if (activeTab === 'STUDENT') {
        const res = await loginStudent(identifier.trim(), password);
        if (res.success) {
          setSuccessMsg('Student verified successfully!');
          setTimeout(() => navigate('/student'), 500);
        } else {
          setErrorMsg(res.message || 'Invalid Admission Number or password.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during authentication');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) return;
    setForgotLoading(true);
    setForgotMsg(null);

    const roleKey = activeTab === 'BRANCH_ADMIN' ? 'admin' : activeTab === 'TEACHER' ? 'teacher' : 'student';
    const corpId = roleKey === 'admin' ? forgotCorporateId.trim() : undefined;
    const res = await forgotPassword(roleKey, forgotIdentifier.trim(), corpId);
    setForgotLoading(false);
    if (res.success) {
      setForgotStep('reset');
      setForgotMsg({ type: 'success', text: res.message || '6-digit OTP sent to registered contact.' });
    } else {
      setForgotMsg({ type: 'error', text: res.message || 'Failed to dispatch reset OTP.' });
    }
  };

  const handleForgotResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp.trim() || !newPassword.trim()) return;
    setForgotLoading(true);
    setForgotMsg(null);

    const roleKey = activeTab === 'BRANCH_ADMIN' ? 'admin' : activeTab === 'TEACHER' ? 'teacher' : 'student';
    const payload: any = {
      identifier: forgotIdentifier.trim(),
      otp: forgotOtp.trim(),
      new_password: newPassword
    };
    if (roleKey === 'admin' && forgotCorporateId) {
      payload.corporateId = forgotCorporateId.trim();
    }
    const res = await resetPassword(roleKey, payload);
    setForgotLoading(false);
    if (res.success) {
      setForgotMsg({ type: 'success', text: 'Password reset successful! You can now log in.' });
      setTimeout(() => {
        setIsForgotModalOpen(false);
        setForgotStep('request');
        setForgotIdentifier('');
        setForgotOtp('');
        setNewPassword('');
      }, 1500);
    } else {
      setForgotMsg({ type: 'error', text: res.message || 'Reset failed. Check OTP and password requirements.' });
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-bg-aurora" />
      <div className="login-bg-glow-top" />
      <div className="login-bg-glow-bottom" />

      <div className="login-container sso-shell">
        {/* Institutional Branding Header */}
        <div className="sso-branding-block">
          <div className="sso-brand-row">
            <img
              src="/logo.jpg"
              alt="Paatam AI Logo"
              className="sso-brand-logo"
            />
            <span className="sso-brand-name">
              PAATAM.AI
            </span>
          </div>
          <h1 className="sso-brand-title">
            Enterprise Academic Single Sign-On
          </h1>
          <p className="sso-brand-subtitle">
            Intelligent School Management, Curriculum RAG & Automated OCR Grading
          </p>
        </div>

        {/* Central Sign-In Card */}
        <div className="login-panel form-panel sso-login-card">
          {/* Institutional Role Tabs */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div className="sso-desk-label">
              Select Institutional Desk
            </div>
            <div className="sso-desk-tabs-grid">
              {/* 1. Branch Admin */}
              <button
                type="button"
                className={`login-role-tab ${activeTab === 'BRANCH_ADMIN' ? 'active' : ''}`}
                onClick={() => setActiveTab('BRANCH_ADMIN')}
                style={{ padding: '0.55rem 0.25rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, borderRadius: '0.5rem', border: 'none', cursor: 'pointer', transition: 'all 0.15s ease' }}
              >
                <ShieldCheck size={16} style={{ margin: '0 auto 0.2rem auto', display: 'block' }} />
                <span>Admin / Dean</span>
              </button>

              {/* 2. Faculty Teacher */}
              <button
                type="button"
                className={`login-role-tab ${activeTab === 'TEACHER' ? 'active' : ''}`}
                onClick={() => setActiveTab('TEACHER')}
                style={{ padding: '0.55rem 0.25rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, borderRadius: '0.5rem', border: 'none', cursor: 'pointer', transition: 'all 0.15s ease' }}
              >
                <Users size={16} style={{ margin: '0 auto 0.2rem auto', display: 'block' }} />
                <span>Teacher</span>
              </button>

              {/* 3. Student */}
              <button
                type="button"
                className={`login-role-tab ${activeTab === 'STUDENT' ? 'active' : ''}`}
                onClick={() => setActiveTab('STUDENT')}
                style={{ padding: '0.55rem 0.25rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, borderRadius: '0.5rem', border: 'none', cursor: 'pointer', transition: 'all 0.15s ease' }}
              >
                <GraduationCap size={16} style={{ margin: '0 auto 0.2rem auto', display: 'block' }} />
                <span>Student</span>
              </button>

              {/* 4. Corporate Admin */}
              <button
                type="button"
                className={`login-role-tab ${activeTab === 'CORPORATE_ADMIN' ? 'active' : ''}`}
                onClick={() => setActiveTab('CORPORATE_ADMIN')}
                style={{ padding: '0.55rem 0.25rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, borderRadius: '0.5rem', border: 'none', cursor: 'pointer', transition: 'all 0.15s ease' }}
              >
                <Crown size={16} style={{ margin: '0 auto 0.2rem auto', display: 'block' }} />
                <span>Corporate</span>
              </button>
            </div>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="login-alert-box error animate-fade-in" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '0.5rem', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '0.8125rem' }}>
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="login-alert-box success animate-fade-in" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '0.5rem', background: '#ECFDF5', border: '1px solid #6EE7B7', color: '#065F46', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form Content */}
          <form onSubmit={handleLoginSubmit} className="login-form-body">
            {/* Field 0 (Corporate Only): Corporate ID or Registration Number */}
            {activeTab === 'CORPORATE_ADMIN' && (
              <>
                {/* Row 1: Corporate Registration Number with Lookup Button */}
                <div className="form-field-group" style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                    <label className="form-field-label" style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', margin: 0 }}>
                      Corporate Registration Number
                    </label>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>e.g. REG-HYD-2026-001</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div className="form-input-box" style={{ position: 'relative', flex: 1 }}>
                      <FileText size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                      <input
                        type="text"
                        value={registrationNo}
                        onChange={(e) => {
                          setRegistrationNo(e.target.value);
                          setLookupFeedback(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleLookupByRegistration();
                          }
                        }}
                        placeholder="e.g. REG-HYD-2026-001"
                        style={{ width: '100%', padding: '0.65rem 0.875rem 0.65rem 2.5rem', borderRadius: '0.5rem', border: '1px solid #CBD5E1', fontSize: '0.875rem', outline: 'none' }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLookupByRegistration()}
                      disabled={isLookingUp || !registrationNo.trim()}
                      style={{
                        padding: '0.65rem 0.875rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #2563EB',
                        background: isLookingUp ? '#DBEAFE' : '#EFF6FF',
                        color: '#1D4ED8',
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        cursor: isLookingUp || !registrationNo.trim() ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease'
                      }}
                      title="Look up Corporate ID via GET /api/corporate/lookup/:registrationNo"
                    >
                      {isLookingUp ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Looking up...</span>
                        </>
                      ) : (
                        <>
                          <Search size={14} />
                          <span>Lookup ID</span>
                        </>
                      )}
                    </button>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginTop: '0.25rem' }}>
                    Institutional registration code — click "Lookup ID" to automatically find your Corporate ID
                  </span>
                </div>

                {/* Row 2: Corporate ID with optional reverse lookup */}
                <div className="form-field-group" style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                    <label className="form-field-label" style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', margin: 0 }}>
                      Corporate ID
                    </label>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>System Numeric ID</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div className="form-input-box" style={{ position: 'relative', flex: 1 }}>
                      <Building2 size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                      <input
                        type="text"
                        value={corporateId}
                        onChange={(e) => {
                          setCorporateId(e.target.value);
                          setLookupFeedback(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleLookupByCorporateId();
                          }
                        }}
                        placeholder="e.g. 1001 or 3998313955240962"
                        style={{ width: '100%', padding: '0.65rem 0.875rem 0.65rem 2.5rem', borderRadius: '0.5rem', border: '1px solid #CBD5E1', fontSize: '0.875rem', outline: 'none' }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLookupByCorporateId()}
                      disabled={isLookingUp || !corporateId.trim()}
                      style={{
                        padding: '0.65rem 0.875rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #CBD5E1',
                        background: '#F8FAFC',
                        color: '#475569',
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        cursor: isLookingUp || !corporateId.trim() ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease'
                      }}
                      title="Look up registration number by Corporate ID"
                    >
                      <Search size={14} />
                      <span>Lookup Reg</span>
                    </button>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginTop: '0.25rem' }}>
                    Numeric entity ID (auto-populated by registration lookup or entered directly)
                  </span>
                </div>

                {/* Lookup Result Feedback Banner */}
                {lookupFeedback && (
                  <div
                    className="animate-fade-in"
                    style={{
                      marginBottom: '1rem',
                      padding: '0.625rem 0.875rem',
                      borderRadius: '0.5rem',
                      fontSize: '0.8125rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      background:
                        lookupFeedback.type === 'success'
                          ? '#ECFDF5'
                          : lookupFeedback.type === 'error'
                          ? '#FEF2F2'
                          : '#EFF6FF',
                      color:
                        lookupFeedback.type === 'success'
                          ? '#065F46'
                          : lookupFeedback.type === 'error'
                          ? '#991B1B'
                          : '#1E40AF',
                      border: `1px solid ${
                        lookupFeedback.type === 'success'
                          ? '#A7F3D0'
                          : lookupFeedback.type === 'error'
                          ? '#FECACA'
                          : '#BFDBFE'
                      }`
                    }}
                  >
                    {lookupFeedback.type === 'success' ? (
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    ) : lookupFeedback.type === 'error' ? (
                      <AlertCircle size={16} className="text-red-500 shrink-0" />
                    ) : (
                      <Building2 size={16} className="text-blue-500 shrink-0" />
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
  <span style={{ fontWeight: 600 }}>{lookupFeedback.text}</span>
  {corporateName && (
    <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>
      Verified Institution: {corporateName}
    </span>
  )}
</div>
                  </div>
                )}
              </>
            )}

            {/* Field 1: Identifier */}
            <div className="form-field-group" style={{ marginBottom: '1rem' }}>
              <label className="form-field-label" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                {activeTab === 'STUDENT'
                  ? 'Student Admission No / Roll ID'
                  : activeTab === 'CORPORATE_ADMIN'
                  ? 'Corporate Email or Mobile'
                  : activeTab === 'TEACHER'
                  ? 'Staff ID or Institutional Email'
                  : 'Administrator Email or Username'}
              </label>
              <div className="form-input-box" style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={
                    activeTab === 'STUDENT'
                      ? 'e.g. ADM-2026-001'
                      : activeTab === 'CORPORATE_ADMIN'
                      ? 'e.g. corp.admin@paatam.edu'
                      : 'e.g. name@school.edu'
                  }
                  style={{ width: '100%', padding: '0.65rem 0.875rem 0.65rem 2.5rem', borderRadius: '0.5rem', border: '1px solid #CBD5E1', fontSize: '0.875rem', outline: 'none' }}
                />
              </div>
            </div>

            {/* Field 2: Password or OTP */}
            {activeTab === 'CORPORATE_ADMIN' ? (
              otpStep === 'verify' && (
                <div className="form-field-group animate-fade-in" style={{ marginBottom: '1rem' }}>
                  <label className="form-field-label" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                    Enter 6-Digit OTP Code
                  </label>
                  <div className="form-input-box" style={{ position: 'relative' }}>
                    <Key size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="123456"
                      style={{ width: '100%', padding: '0.65rem 0.875rem 0.65rem 2.5rem', borderRadius: '0.5rem', border: '1px solid #CBD5E1', fontSize: '0.875rem', letterSpacing: '0.15em', outline: 'none' }}
                    />
                  </div>
                  <div style={{ marginTop: '0.35rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ color: '#64748B' }}>Valid for 10 minutes</span>
                    <button
                      type="button"
                      onClick={() => setOtpStep('request')}
                      style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                    >
                      Resend OTP
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div className="form-field-group" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                  <label className="form-field-label" style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', margin: 0 }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotIdentifier(identifier);
                      setIsForgotModalOpen(true);
                    }}
                    style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="form-input-box" style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ width: '100%', padding: '0.65rem 0.875rem 0.65rem 2.5rem', borderRadius: '0.5rem', border: '1px solid #CBD5E1', fontSize: '0.875rem', outline: 'none' }}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                background: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(37,99,235,0.25)',
                marginTop: '1.25rem',
                transition: 'all 0.15s ease'
              }}
            >
              {isLoading ? (
                <span>Authenticating with Paatam Cloud...</span>
              ) : activeTab === 'CORPORATE_ADMIN' && otpStep === 'request' ? (
                <>
                  <Smartphone size={16} />
                  <span>Send Login OTP</span>
                </>
              ) : (
                <>
                  <KeyRound size={16} />
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

            {/* New Corporate Group Registration Action (POST /api/corporate/create) */}
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => setIsRegisterCorpOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#4F46E5',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Building2 size={13} />
                <span>Register New Educational Group</span>
              </button>
            </div>
          </div>
        </div>

        {/* Trust & Security Badge Footer */}
        <div className="sso-trust-row">
          <span className="sso-trust-item">
            <Lock size={12} className="sso-trust-icon-green" /> 256-Bit SSL Encrypted
          </span>
          <span>•</span>
          <span className="sso-trust-item">
            <ShieldCheck size={12} className="sso-trust-icon-blue" /> Institutional RBAC
          </span>
          <span>•</span>
          <span>SOC-2 Cloud</span>
        </div>

        <RegisterCorporateModal
          isOpen={isRegisterCorpOpen}
          onClose={() => setIsRegisterCorpOpen(false)}
          onRegistered={(orgName) => {
            const lastReg = localStorage.getItem('paatam_last_corporate_reg');
            const lastEmail = localStorage.getItem('paatam_last_corporate_email');
            if (lastReg) setCorporateId(lastReg);
            if (lastEmail) setIdentifier(lastEmail);
            setSuccessMsg(`Institution "${orgName}" registered. Click "Send Login OTP" to sign in!`);
            setActiveTab('CORPORATE_ADMIN');
          }}
        />

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div
          className="modal-backdrop animate-fade-in"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              background: '#FFFFFF',
              borderRadius: '1rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              border: '1px solid #E2E8F0'
            }}
          >
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>
                Reset Password
              </h3>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '1.25rem', padding: '0.25rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {forgotMsg && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  background: forgotMsg.type === 'error' ? '#FEF2F2' : '#ECFDF5',
                  border: `1px solid ${forgotMsg.type === 'error' ? '#FCA5A5' : '#6EE7B7'}`,
                  color: forgotMsg.type === 'error' ? '#991B1B' : '#065F46',
                  fontSize: '0.8125rem',
                  marginBottom: '1rem'
                }}>
                  {forgotMsg.text}
                </div>
              )}

              {forgotStep === 'request' ? (
                <form onSubmit={handleForgotRequestOtp}>
                  <p style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: 0, marginBottom: '1rem' }}>
                    Enter your registered email address, staff ID, or admission number to receive a 6-digit recovery OTP.
                  </p>
                  {activeTab === 'BRANCH_ADMIN' && (
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                        Corporate ID
                      </label>
                      <input
                        type="text"
                        required
                        value={forgotCorporateId}
                        onChange={(e) => setForgotCorporateId(e.target.value)}
                        placeholder="e.g. 1512528182029314"
                        style={{ width: '100%', padding: '0.65rem 0.875rem', borderRadius: '0.5rem', border: '1px solid #CBD5E1', fontSize: '0.875rem', outline: 'none' }}
                      />
                    </div>
                  )}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                      Registered Identifier
                    </label>
                    <input
                      type="text"
                      required
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      placeholder="e.g. name@school.edu or ADM-2026-001"
                      style={{ width: '100%', padding: '0.65rem 0.875rem', borderRadius: '0.5rem', border: '1px solid #CBD5E1', fontSize: '0.875rem', outline: 'none' }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: '#2563EB', color: '#FFFFFF', border: 'none', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
                  >
                    {forgotLoading ? 'Sending...' : 'Send Recovery OTP'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleForgotResetPassword}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                      6-Digit OTP Code
                    </label>
                    <input
                      type="text"
                      required
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value)}
                      placeholder="e.g. 123456"
                      style={{ width: '100%', padding: '0.65rem 0.875rem', borderRadius: '0.5rem', border: '1px solid #CBD5E1', fontSize: '0.875rem', outline: 'none' }}
                    />
                  </div>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{ width: '100%', padding: '0.65rem 0.875rem', borderRadius: '0.5rem', border: '1px solid #CBD5E1', fontSize: '0.875rem', outline: 'none' }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: '#2563EB', color: '#FFFFFF', border: 'none', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
                  >
                    {forgotLoading ? 'Updating Password...' : 'Confirm New Password'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
