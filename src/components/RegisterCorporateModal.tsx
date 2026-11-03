import { useState } from 'react';
import {
  X,
  Building2,
  Hash,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Mail,
  Phone,
  User,
  KeyRound,
  Search,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface RegisterCorporateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegistered?: (name: string) => void;
}

export default function RegisterCorporateModal({
  isOpen,
  onClose,
  onRegistered
}: RegisterCorporateModalProps) {
  const { createCorporate, sendOtp, verifyOtp, lookupCorporate } = useAuth();

  // Corporate Info
  const [name, setName] = useState('');
  const [registrationNo, setRegistrationNo] = useState('');

  // Super Admin Info
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminMobile, setAdminMobile] = useState('');

  // OTP Verification
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Lookup state
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupResult, setLookupResult] = useState<string | null>(null);

  // Form Submission
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  // Lookup existing registration: GET /api/corporate/lookup/:registrationNo
  const handleLookup = async () => {
    if (!registrationNo.trim()) {
      setErrorMsg('Enter a registration number to lookup.');
      return;
    }
    setIsLookingUp(true);
    setErrorMsg('');
    setLookupResult(null);
    try {
      const res = await lookupCorporate(registrationNo.trim());
      if (res.success && res.corporate) {
        setLookupResult(`Found: ${res.corporate.name || 'Registered organization'}`);
      } else {
        setLookupResult('Registration number is available.');
      }
    } catch {
      setLookupResult('Registration number is available.');
    } finally {
      setIsLookingUp(false);
    }
  };

  // Dispatch OTP: POST /api/auth/send-otp
  const handleSendOtp = async () => {
    if (!adminEmail.trim() || !adminMobile.trim()) {
      setErrorMsg('Please provide Admin Email and Mobile number to receive OTP.');
      return;
    }
    setIsSendingOtp(true);
    setErrorMsg('');
    try {
      const res = await sendOtp(adminEmail.trim(), adminMobile.trim());
      if (res.success) {
        setOtpSent(true);
        if (res.otp) setOtp(res.otp);
        setSuccessMsg(res.otp ? `OTP generated: ${res.otp} (auto-filled for testing)` : (res.message || 'OTP sent successfully.'));
      } else {
        setErrorMsg(res.message || 'Failed to send OTP.');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Error sending OTP.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Verify OTP: POST /api/auth/verify-otp
  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setErrorMsg('Please enter the 6-digit OTP received.');
      return;
    }
    setIsVerifyingOtp(true);
    setErrorMsg('');
    try {
      const res = await verifyOtp(adminEmail.trim(), adminMobile.trim(), otp.trim());
      if (res.success && res.verificationToken) {
        setVerificationToken(res.verificationToken);
        setSuccessMsg('OTP verified successfully! Verification token secured.');
      } else {
        setErrorMsg(res.message || 'Invalid OTP code. Please enter valid 6 digits.');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Invalid OTP verification.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Final Registration: POST /api/corporate/create
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !registrationNo.trim()) {
      setErrorMsg('Please fill in both institution name and registration number.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const adminData = adminName.trim()
        ? {
            name: adminName.trim(),
            email: adminEmail.trim(),
            mobile: adminMobile.trim()
          }
        : undefined;

      const res = await createCorporate(
        name.trim(),
        registrationNo.trim(),
        verificationToken || undefined,
        adminData
      );

      if (res.success) {
        const createdCorp = res.data || {};
        const corpId = createdCorp.id || createdCorp.corporateId;
        if (corpId) localStorage.setItem('paatam_last_corporate_id', String(corpId));
        localStorage.setItem('paatam_last_corporate_reg', registrationNo.trim());
        localStorage.setItem('paatam_last_corporate_email', adminEmail.trim());

        setSuccessMsg(`✅ ${name} registered successfully! Corporate ID: ${corpId || registrationNo}`);
        if (onRegistered) onRegistered(name.trim());
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setErrorMsg(res.message || 'Failed to create corporate entity. Please check details.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating corporate entity.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="modal-backdrop animate-fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
        overflowY: 'auto'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="m-card animate-scale-up"
        style={{
          width: '100%',
          maxWidth: '520px',
          background: '#FFFFFF',
          borderRadius: '1rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid #E2E8F0',
          margin: 'auto'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F8FAFC'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '0.625rem',
                background: '#EEF2FF',
                color: '#4F46E5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Building2 size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>
                New Corporate Organization
              </h3>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.75rem', color: '#64748B' }}>
                Register multi-campus educational group with 2FA verification
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '0.375rem'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem' }}>
          {errorMsg && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                color: '#991B1B',
                fontSize: '0.8125rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                background: '#ECFDF5',
                border: '1px solid #6EE7B7',
                color: '#065F46',
                fontSize: '0.8125rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Step 1: Corporate Details */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Corporate Entity / Educational Group Name <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Building2 size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Narayana Educational Institutions"
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '2.5rem', fontSize: '0.875rem' }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', margin: 0 }}>
                  Official Registration Number <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <button
                  type="button"
                  onClick={handleLookup}
                  disabled={isLookingUp || !registrationNo.trim()}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#4F46E5',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Search size={12} />
                  <span>{isLookingUp ? 'Checking...' : 'Check Availability'}</span>
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Hash size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="text"
                  required
                  value={registrationNo}
                  onChange={(e) => setRegistrationNo(e.target.value)}
                  placeholder="e.g. REG-HYD-2026-001"
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '2.5rem', fontSize: '0.875rem' }}
                />
              </div>
              {lookupResult && (
                <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.75rem', color: '#4F46E5', fontWeight: 500 }}>
                  {lookupResult}
                </p>
              )}
            </div>

            {/* Step 2: Super Admin Info */}
            <div style={{ paddingTop: '0.75rem', borderTop: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <ShieldCheck size={14} color="#4F46E5" />
                <span>Initial Super Admin &amp; 2FA Verification</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Super Admin Name <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                    <input
                      type="text"
                      required
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="e.g. Sunita Sharma"
                      className="form-input"
                      style={{ width: '100%', paddingLeft: '2.5rem', fontSize: '0.875rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                      Official Email <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                      <input
                        type="email"
                        required
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="admin@paatam.in"
                        className="form-input"
                        style={{ width: '100%', paddingLeft: '2.5rem', fontSize: '0.875rem' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                      Mobile Number <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                      <input
                        type="tel"
                        required
                        value={adminMobile}
                        onChange={(e) => setAdminMobile(e.target.value)}
                        placeholder="9876543210"
                        className="form-input"
                        style={{ width: '100%', paddingLeft: '2.5rem', fontSize: '0.875rem' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Pre-registration OTP block */}
                {!verificationToken ? (
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      background: '#F8FAFC',
                      borderRadius: '0.5rem',
                      border: '1px solid #E2E8F0',
                      marginTop: '0.25rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: otpSent ? '0.5rem' : 0 }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>
                        {otpSent ? 'Enter 6-Digit Verification OTP' : 'Verification Required'}
                      </span>
                      {!otpSent ? (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={isSendingOtp || !adminEmail.trim() || !adminMobile.trim()}
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.75rem', color: '#4F46E5', fontWeight: 600 }}
                        >
                          {isSendingOtp ? 'Sending OTP...' : 'Send OTP'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={isSendingOtp}
                          style={{ background: 'none', border: 'none', color: '#4F46E5', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
                        >
                          Resend OTP
                        </button>
                      )}
                    </div>

                    {otpSent && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                          <KeyRound size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                          <input
                            type="text"
                            maxLength={6}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            placeholder="6-digit OTP (e.g. 123456)"
                            className="form-input"
                            style={{ width: '100%', paddingLeft: '2.5rem', letterSpacing: '0.15em', fontSize: '0.875rem' }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleVerifyOtp}
                          disabled={isVerifyingOtp || otp.length < 4}
                          className="btn btn-primary"
                          style={{ padding: '6px 14px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                        >
                          {isVerifyingOtp ? 'Verifying...' : 'Verify OTP'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.65rem 0.85rem',
                      background: '#ECFDF5',
                      border: '1px solid #6EE7B7',
                      borderRadius: '0.5rem',
                      fontSize: '0.8125rem',
                      color: '#065F46',
                      fontWeight: 600
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>Identity Verified. Verification token attached.</span>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginTop: '0.5rem'
              }}
            >
              {isLoading ? (
                <span>Registering Organization...</span>
              ) : (
                <>
                  <span>Register Educational Entity</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
