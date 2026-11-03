import React, { useState } from 'react';
import { ShieldCheck, GraduationCap, Users, X, KeyRound, Building2 } from 'lucide-react';
import { useAuth, type UserRole } from '../context/AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const {
    currentUser,
    switchRole,
    branches,
    currentBranchId,
    setCurrentBranchId,
    loginAdmin,
    loginTeacher,
    loginStudent
  } = useAuth();

  const [roleTab, setRoleTab] = useState<'BRANCH_ADMIN' | 'TEACHER' | 'STUDENT'>('BRANCH_ADMIN');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) return;
    setIsLoading(true);
    setErrorMsg('');

    try {
      let res;
      if (roleTab === 'BRANCH_ADMIN') {
        res = await loginAdmin(identifier.trim(), password);
      } else if (roleTab === 'TEACHER') {
        res = await loginTeacher(identifier.trim(), password);
      } else {
        res = await loginStudent(identifier.trim(), password);
      }

      if (res && res.success) {
        onClose();
      } else {
        setErrorMsg(res?.message || 'Authentication failed. Please verify credentials.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not connect to authentication service.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPersona = (role: UserRole) => {
    switchRole(role);
    onClose();
  };


  return (
    <div className="modal-backdrop animate-fade-in" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div className="m-card" style={{
        width: '100%',
        maxWidth: '540px',
        background: '#FFFFFF',
        borderRadius: '1rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden',
        border: '1px solid #E2E8F0'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          background: 'linear-gradient(135deg, #0B132B 0%, #1C2541 100%)',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Role Access & Persona Switcher</h3>
            <p style={{ fontSize: '0.8125rem', color: '#94A3B8', margin: '0.2rem 0 0 0' }}>
              Switch perspectives or log in with verified institutional credentials
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '0.25rem'
            }}
          >
            <X className="size-5" />
          </button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {/* Quick Demo Personas */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', display: 'block', marginBottom: '0.625rem' }}>
              Select Active Persona (1-Click Test)
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {/* Dean / Admin */}
              <button
                type="button"
                onClick={() => handleSelectPersona('ADMIN')}
                style={{
                  padding: '0.875rem 0.5rem',
                  borderRadius: '0.75rem',
                  border: currentUser?.role === 'ADMIN' ? '2px solid #2563EB' : '1px solid #E2E8F0',
                  background: currentUser?.role === 'ADMIN' ? '#EFF6FF' : '#F8FAFC',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#DBEAFE',
                  color: '#1D4ED8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.5rem auto'
                }}>
                  <ShieldCheck className="size-5" />
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0F172A' }}>Admin / Dean</div>
                <div style={{ fontSize: '0.6875rem', color: '#64748B', marginTop: '0.15rem' }}>Full Governance</div>
              </button>

              {/* Teacher */}
              <button
                type="button"
                onClick={() => handleSelectPersona('TEACHER')}
                style={{
                  padding: '0.875rem 0.5rem',
                  borderRadius: '0.75rem',
                  border: currentUser?.role === 'TEACHER' ? '2px solid #059669' : '1px solid #E2E8F0',
                  background: currentUser?.role === 'TEACHER' ? '#ECFDF5' : '#F8FAFC',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#D1FAE5',
                  color: '#047857',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.5rem auto'
                }}>
                  <Users className="size-5" />
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0F172A' }}>Teacher</div>
                <div style={{ fontSize: '0.6875rem', color: '#64748B', marginTop: '0.15rem' }}>Grading & Classes</div>
              </button>

              {/* Student */}
              <button
                type="button"
                onClick={() => handleSelectPersona('STUDENT')}
                style={{
                  padding: '0.875rem 0.5rem',
                  borderRadius: '0.75rem',
                  border: currentUser?.role === 'STUDENT' ? '2px solid #7C3AED' : '1px solid #E2E8F0',
                  background: currentUser?.role === 'STUDENT' ? '#F5F3FF' : '#F8FAFC',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#EDE9FE',
                  color: '#6D28D9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.5rem auto'
                }}>
                  <GraduationCap className="size-5" />
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0F172A' }}>Student</div>
                <div style={{ fontSize: '0.6875rem', color: '#64748B', marginTop: '0.15rem' }}>Portal & Tests</div>
              </button>
            </div>
          </div>

          {/* Campus Selector */}
          <div style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem', background: '#F8FAFC', borderRadius: '0.5rem', border: '1px solid #E2E8F0' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
              <Building2 className="size-4 text-blue-600" />
              <span>Active Campus / Branch</span>
            </label>
            <select
              value={currentBranchId}
              onChange={(e) => setCurrentBranchId(e.target.value)}
              className="form-input"
              style={{ width: '100%', background: '#FFFFFF' }}
            >
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '1.25rem 0', color: '#94A3B8', fontSize: '0.75rem' }}>
            <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
            <span style={{ padding: '0 0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Or Institutional Login</span>
            <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
          </div>

          {/* Role Tabs for Credential Sign In */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setRoleTab('BRANCH_ADMIN')}
              style={{
                flex: 1,
                padding: '6px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '6px',
                border: '1px solid',
                borderColor: roleTab === 'BRANCH_ADMIN' ? '#2563EB' : '#E2E8F0',
                background: roleTab === 'BRANCH_ADMIN' ? '#EFF6FF' : '#FFFFFF',
                color: roleTab === 'BRANCH_ADMIN' ? '#1D4ED8' : '#64748B',
                cursor: 'pointer'
              }}
            >
              Admin / Dean
            </button>
            <button
              type="button"
              onClick={() => setRoleTab('TEACHER')}
              style={{
                flex: 1,
                padding: '6px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '6px',
                border: '1px solid',
                borderColor: roleTab === 'TEACHER' ? '#059669' : '#E2E8F0',
                background: roleTab === 'TEACHER' ? '#ECFDF5' : '#FFFFFF',
                color: roleTab === 'TEACHER' ? '#047857' : '#64748B',
                cursor: 'pointer'
              }}
            >
              Teacher
            </button>
            <button
              type="button"
              onClick={() => setRoleTab('STUDENT')}
              style={{
                flex: 1,
                padding: '6px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '6px',
                border: '1px solid',
                borderColor: roleTab === 'STUDENT' ? '#EC4899' : '#E2E8F0',
                background: roleTab === 'STUDENT' ? '#FDF2F8' : '#FFFFFF',
                color: roleTab === 'STUDENT' ? '#DB2777' : '#64748B',
                cursor: 'pointer'
              }}
            >
              Student
            </button>
          </div>

          {/* Custom Login Form */}
          <form onSubmit={handleCustomLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {errorMsg && (
              <div style={{ padding: '0.5rem 0.75rem', background: '#FEE2E2', color: '#B91C1C', borderRadius: '0.375rem', fontSize: '0.8125rem' }}>
                {errorMsg}
              </div>
            )}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                {roleTab === 'STUDENT' ? 'Admission Number' : 'Email Address / Mobile'}
              </label>
              <input
                type="text"
                required
                className="form-input"
                placeholder={roleTab === 'STUDENT' ? 'e.g. ADM-2026-001' : roleTab === 'BRANCH_ADMIN' ? 'dean.ramesh@paatam.edu' : 'raina@school.edu'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                Password
              </label>
              <input
                type="password"
                required
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
              style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center' }}
            >
              <KeyRound className="size-4" />
              <span>{isLoading ? 'Verifying...' : `Sign In as ${roleTab.replace('_', ' ')}`}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

