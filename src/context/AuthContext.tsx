import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL, getAuthToken, setAuthToken, setRefreshToken, clearAuthToken } from '../config/api';

export type UserRole =
  | 'CORPORATE_ADMIN'
  | 'SUPER_ADMIN'
  | 'BRANCH_ADMIN'
  | 'DEAN'
  | 'PRINCIPAL'
  | 'VICE_PRINCIPAL'
  | 'TEACHER'
  | 'STUDENT'
  | 'PARENT'
  | 'ADMIN'
  | 'GUEST';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  admission_no?: string;
  teacher_id?: string;
  branchId?: string;
  branchName?: string;
  classId?: string;
  className?: string;
  sectionName?: string;
}

export interface Branch {
  id: string;
  corporate_id?: string;
  name: string;
  pincode?: string;
  address?: string;
  branch_contact_mail?: string;
  mobile_number?: string;
}

interface AuthContextType {
  currentUser: UserProfile | null;
  role: UserRole;
  isAuthenticated: boolean;
  branches: Branch[];
  currentBranchId: string;
  setCurrentBranchId: (id: string) => void;
  switchRole: (role: UserRole) => void;
  loginWithProfile: (profile: UserProfile, token?: string) => void;
  isRole: (roles: UserRole[]) => boolean;
  logout: () => void;
  // Documented Role-Based Auth Actions
  loginCorporateInitiate: (identifier: string, corporateId?: string) => Promise<{ success: boolean; otp?: string; resolvedCorporateId?: string; message?: string }>;
  loginCorporateVerify: (identifier: string, otp: string, corporateId?: string) => Promise<{ success: boolean; message?: string }>;
  loginAdmin: (identifier: string, password: string) => Promise<{ success: boolean; message?: string }>;
  loginTeacher: (identifier: string, password: string) => Promise<{ success: boolean; message?: string }>;
  loginStudent: (admission_no: string, password: string) => Promise<{ success: boolean; message?: string }>;
  forgotPassword: (role: 'admin' | 'teacher' | 'student', identifier: string, corporateId?: string) => Promise<{ success: boolean; message?: string }>;
  resetPassword: (role: 'admin' | 'teacher' | 'student', payload: any) => Promise<{ success: boolean; message?: string }>;
  createCorporate: (name: string, registration_no: string, verificationToken?: string, admin?: { name: string; email: string; mobile: string }) => Promise<{ success: boolean; data?: any; message?: string }>;
  sendOtp: (email: string, mobile: string) => Promise<{ success: boolean; otp?: string; message?: string }>;
  verifyOtp: (email: string, mobile: string, otp: string) => Promise<{ success: boolean; verificationToken?: string; message?: string }>;
  lookupCorporate: (registrationNo: string) => Promise<{ success: boolean; corporate?: any; message?: string }>;
  fetchLiveProfile: () => Promise<void>;
  refreshBranches: () => Promise<void>;
}

export const DEMO_PROFILES: Record<string, UserProfile> = {
  CORPORATE_ADMIN: {
    id: '',
    name: 'Corporate Admin',
    email: '',
    role: 'CORPORATE_ADMIN',
    title: 'Corporate Super Admin'
  },
  BRANCH_ADMIN: {
    id: '',
    name: 'Branch Admin',
    email: '',
    role: 'BRANCH_ADMIN',
    title: 'Branch Administrator'
  },
  ADMIN: {
    id: '',
    name: 'Branch Admin',
    email: '',
    role: 'BRANCH_ADMIN',
    title: 'Branch Administrator'
  },
  TEACHER: {
    id: '',
    name: 'Faculty Teacher',
    email: '',
    role: 'TEACHER',
    title: 'Faculty / Subject Teacher'
  },
  STUDENT: {
    id: '',
    name: 'Student',
    email: '',
    role: 'STUDENT',
    title: 'Student'
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('paatam_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.role) return parsed;
      } catch (e) {}
    }
    // Starts unauthenticated so user always lands on the Login Page
    return null;
  });

  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranchId, setCurrentBranchId] = useState<string>(() => {
    return localStorage.getItem('paatam_branch_id') || '';
  });

  // Fetch branches according to user role strictly using documented endpoints
  const fetchBranches = async () => {
    if (!currentUser) return;
    if (['TEACHER', 'STUDENT', 'PARENT', 'GUEST'].includes(currentUser.role)) {
      return;
    }
    const endpoints = currentUser.role === 'CORPORATE_ADMIN' || currentUser.role === 'SUPER_ADMIN'
      ? [`${API_BASE_URL}/api/branch/corporate/all`]
      : [`${API_BASE_URL}/api/branch-admin/my-branches`];

    let found = false;
    for (const url of endpoints) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        const branchList = Array.isArray(data.data) ? data.data : Array.isArray(data.branches) ? data.branches : null;
        if (branchList && Array.isArray(branchList)) {
          setBranches(branchList);
          if (branchList.length > 0 && (!currentBranchId || !branchList.some((b: Branch) => b.id === currentBranchId))) {
            setCurrentBranchId(branchList[0].id);
            localStorage.setItem('paatam_branch_id', branchList[0].id);
          }
          found = true;
          break;
        }
      } catch (e) {
        // try next endpoint
      }
    }
    if (!found) {
      setBranches([]);
    }
  };

  // Fetch live role-specific profile using documented GET /api/branch-admin/profile, /api/teacher/profile, /api/student/profile
  const fetchLiveProfile = async () => {
    if (!currentUser) return;
    try {
      let endpoint = '';
      if (['BRANCH_ADMIN', 'ADMIN', 'DEAN', 'PRINCIPAL', 'VICE_PRINCIPAL'].includes(currentUser.role)) {
        endpoint = `${API_BASE_URL}/api/branch-admin/profile`;
      } else if (currentUser.role === 'TEACHER') {
        endpoint = `${API_BASE_URL}/api/teacher/profile`;
      } else if (currentUser.role === 'STUDENT') {
        endpoint = `${API_BASE_URL}/api/student/profile`;
      }

      if (!endpoint) return;

      const res = await fetch(endpoint);
      if (res.ok) {
        const json = await res.json();
        const p = json.data || json.user || json.profile;
        if (p) {
          setCurrentUser(prev => {
            if (!prev) return prev;
            const updated: UserProfile = {
              ...prev,
              id: p.id ? String(p.id) : prev.id,
              name: p.name || p.admin_name || p.teacher_name || prev.name,
              email: p.contact_email || p.email || prev.email,
              admission_no: p.admission_no || prev.admission_no,
              teacher_id: p.teacher_id || p.staff_id || (p as any).teacherId || prev.teacher_id,
              className: p.class_name || prev.className,
              sectionName: p.section_name || prev.sectionName
            };
            localStorage.setItem('paatam_user', JSON.stringify(updated));
            return updated;
          });
        }
      }
    } catch {
      // Keep existing profile if offline or mock
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchBranches();
      fetchLiveProfile();
    }
  }, [currentUser?.role]);

  const switchRole = (newRole: UserRole) => {
    const profile = DEMO_PROFILES[newRole] || DEMO_PROFILES.BRANCH_ADMIN;
    setCurrentUser(profile);
    localStorage.setItem('paatam_user', JSON.stringify(profile));
  };

  const loginWithProfile = (profile: UserProfile, token?: string, refreshToken?: string) => {
    setCurrentUser(profile);
    localStorage.setItem('paatam_user', JSON.stringify(profile));
    if (token) setAuthToken(token);
    if (refreshToken) setRefreshToken(refreshToken);
  };

  const logout = () => {
    clearAuthToken();
    localStorage.removeItem('paatam_user');
    setCurrentUser(null);
  };

  const isRole = (roles: UserRole[]) => {
    if (!currentUser) return false;
    return (
      roles.includes(currentUser.role) ||
      (roles.includes('ADMIN') &&
        ['BRANCH_ADMIN', 'CORPORATE_ADMIN', 'SUPER_ADMIN', 'DEAN', 'PRINCIPAL', 'VICE_PRINCIPAL', 'ADMIN'].includes(
          currentUser.role
        ))
    );
  };

  const handleBranchChange = (branchId: string) => {
    setCurrentBranchId(branchId);
    localStorage.setItem('paatam_branch_id', branchId);
  };

  // Helper to resolve string / registration number to numeric corporateId
  const resolveNumericCorporateId = async (idOrReg?: string): Promise<string> => {
    let raw = idOrReg?.trim() || localStorage.getItem('paatam_last_corporate_id') || '';
    if (!raw) return '';
    if (/^\d{6,}$/.test(raw)) return raw;

    try {
      const lookupRes = await fetch(`${API_BASE_URL}/api/corporate/lookup/${encodeURIComponent(raw)}`);
      if (lookupRes.ok) {
        const lookupData = await lookupRes.json();
        const foundId = lookupData.data?.corporateId || lookupData.corporateId || lookupData.data?.id;
        if (foundId) {
          localStorage.setItem('paatam_last_corporate_id', String(foundId));
          return String(foundId);
        }
      }
    } catch {}

    return localStorage.getItem('paatam_last_corporate_id') || '';
  };

  // 1. Corporate Admin Login Initiation
  const loginCorporateInitiate = async (identifier: string, corporateId?: string) => {
    try {
      const activeCorpId = await resolveNumericCorporateId(corporateId);
      if (!activeCorpId) {
        return { success: false, message: 'corporateId is required for login.' };
      }
      if (!identifier.includes('@')) {
        return { success: false, message: 'Corporate login requires email as per API contract.' };
      }
      const payload: any = {
        corporateId: activeCorpId,
        email: identifier.trim()
      };

      const res = await fetch(`${API_BASE_URL}/api/auth/corporate/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      const otpCode = data.data?.otp || data.otp;
      return {
        success: res.ok,
        otp: otpCode,
        resolvedCorporateId: activeCorpId,
        message: data.message || (otpCode ? `OTP generated: ${otpCode}` : (res.ok ? 'OTP sent to registered corporate contact' : 'Failed to send OTP'))
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Connection error' };
    }
  };

  // 2. Corporate Admin OTP Verification
  const loginCorporateVerify = async (identifier: string, otp: string, corporateId?: string) => {
    try {
      const activeCorpId = await resolveNumericCorporateId(corporateId);
      if (!activeCorpId) {
        return { success: false, message: 'corporateId is required for verification.' };
      }
      if (!identifier.includes('@')) {
        return { success: false, message: 'Corporate verification requires email as per API contract.' };
      }
      const payload: any = {
        corporateId: activeCorpId,
        email: identifier.trim(),
        otp: otp.trim()
      };

      const res = await fetch(`${API_BASE_URL}/api/auth/corporate/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      const token = data.data?.accessToken || data.accessToken || data.token;
      if (res.ok && token) {
        setAuthToken(token);
        const rToken = data.data?.refreshToken || data.data?.refresh_token || data.refreshToken || data.refresh_token;
        if (rToken) setRefreshToken(rToken);
        const userData = data.data?.user || data.user || data.data?.admin || data.admin;
        const profile: UserProfile = {
          id: userData?.id ? String(userData.id) : 'corp-admin-01',
          name: userData?.name || userData?.admin_name || identifier.split('@')[0],
          email: userData?.email || identifier,
          role: 'CORPORATE_ADMIN',
          title: 'Corporate Super Admin'
        };
        loginWithProfile(profile, token, data.data?.refreshToken || data.data?.refresh_token || data.refreshToken || data.refresh_token);
        return { success: true };
      }
      return { success: false, message: data.message || 'Invalid OTP' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Verification failed' };
    }
  };

  // 3. Branch Admin Password Login: POST /api/auth/admin/login & /api/auth/branch-admin/login
  const loginAdmin = async (identifier: string, password: string) => {
    try {
      let res = await fetch(`${API_BASE_URL}/api/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });
      if (!res.ok && res.status === 404) {
        res = await fetch(`${API_BASE_URL}/api/auth/branch-admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password })
        });
      }
      const data = await res.json();
      if (res.ok) {
        const token = data.data?.accessToken || data.accessToken || data.token;
        if (token) setAuthToken(token);
        const rToken = data.data?.refreshToken || data.data?.refresh_token || data.refreshToken || data.refresh_token;
        if (rToken) setRefreshToken(rToken);
        const userData = data.data?.user || data.user || data.data?.admin || data.admin;
        const role = (userData?.role || 'BRANCH_ADMIN') as UserRole;
        const profile: UserProfile = {
          id: userData?.id ? String(userData.id) : 'admin-01',
          name: userData?.name || userData?.admin_name || identifier.split('@')[0],
          email: userData?.email || userData?.contact_email || identifier,
          role: role,
          title: `${role.replace(/_/g, ' ')} (Branch Admin)`
        };
        loginWithProfile(profile, token, data.data?.refreshToken || data.data?.refresh_token || data.refreshToken || data.refresh_token);
        return { success: true };
      }
      return { success: false, message: data.message || 'Authentication failed' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Login failed' };
    }
  };

  // 4. Teacher Password Login
  const loginTeacher = async (identifier: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/teacher/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });
      const data = await res.json();
      if (res.ok) {
        const token = data.data?.accessToken || data.accessToken || data.token;
        if (token) setAuthToken(token);
        const rToken = data.data?.refreshToken || data.data?.refresh_token || data.refreshToken || data.refresh_token;
        if (rToken) setRefreshToken(rToken);
        const userData = data.data?.user || data.user || data.data?.teacher || data.teacher;
        const profile: UserProfile = {
          id: userData?.id ? String(userData.id) : 'teacher-01',
          name: userData?.name || userData?.teacher_name || identifier.split('@')[0],
          email: userData?.email || userData?.contact_email || identifier,
          role: 'TEACHER',
          title: 'Faculty / Subject Teacher'
        };
        loginWithProfile(profile, token, data.data?.refreshToken || data.data?.refresh_token || data.refreshToken || data.refresh_token);
        return { success: true };
      }
      return { success: false, message: data.message || 'Invalid credentials' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Login failed' };
    }
  };

  // 5. Student Admission No Login
  const loginStudent = async (admission_no: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/student/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admission_no, password })
      });
      const data = await res.json();
      if (res.ok) {
        const token = data.data?.accessToken || data.accessToken || data.token;
        if (token) setAuthToken(token);
        const rToken = data.data?.refreshToken || data.data?.refresh_token || data.refreshToken || data.refresh_token;
        if (rToken) setRefreshToken(rToken);
        const userData = data.data?.user || data.user || data.data?.student || data.student;
        const profile: UserProfile = {
          id: userData?.id ? String(userData.id) : 'student-01',
          name: userData?.name || admission_no,
          email: userData?.email || `${admission_no.toLowerCase()}@student.paatam.edu`,
          admission_no: admission_no,
          role: 'STUDENT',
          title: `Student (${admission_no})`
        };
        loginWithProfile(profile, token, data.data?.refreshToken || data.data?.refresh_token || data.refreshToken || data.refresh_token);
        return { success: true };
      }
      return { success: false, message: data.message || 'Invalid Admission Number or password' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Login failed' };
    }
  };

  // Forgot password OTP request: POST /api/auth/:role/forgot-password
  // Explicitly references:
  // POST /api/auth/admin/forgot-password
  // POST /api/auth/teacher/forgot-password
  // POST /api/auth/student/forgot-password
  // POST /api/auth/branch-admin/forgot-password (alias)
  // POST /api/auth/branch/forgot-password (alias)
  const forgotPassword = async (role: 'admin' | 'teacher' | 'student', identifier: string, corporateId?: string) => {
    try {
      const endpointMap: Record<string, string[]> = {
        admin: [
          `${API_BASE_URL}/api/auth/admin/forgot-password`,
          `${API_BASE_URL}/api/auth/branch-admin/forgot-password`,
          `${API_BASE_URL}/api/auth/branch/forgot-password`
        ],
        teacher: [`${API_BASE_URL}/api/auth/teacher/forgot-password`],
        student: [`${API_BASE_URL}/api/auth/student/forgot-password`]
      };
      const targets = endpointMap[role] || [`${API_BASE_URL}/api/auth/${role}/forgot-password`];
      const body = role === 'admin' ? { identifier, corporateId } : { identifier };

      let res: Response | null = null;
      for (const target of targets) {
        res = await fetch(target, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (res.ok || res.status !== 404) break;
      }
      if (!res) throw new Error('No auth forgot-password endpoint reachable');
      const data = await res.json();
      return { success: res.ok, message: data.message };
    } catch (err: any) {
      return { success: false, message: err.message || 'Request failed' };
    }
  };

  // Reset password with OTP: POST /api/auth/:role/reset-password
  // Explicitly references:
  // POST /api/auth/admin/reset-password
  // POST /api/auth/teacher/reset-password
  // POST /api/auth/student/reset-password
  // POST /api/auth/branch-admin/reset-password (alias)
  // POST /api/auth/branch/reset-password (alias)
  const resetPassword = async (role: 'admin' | 'teacher' | 'student', payload: any) => {
    try {
      const endpointMap: Record<string, string[]> = {
        admin: [
          `${API_BASE_URL}/api/auth/admin/reset-password`,
          `${API_BASE_URL}/api/auth/branch-admin/reset-password`,
          `${API_BASE_URL}/api/auth/branch/reset-password`
        ],
        teacher: [`${API_BASE_URL}/api/auth/teacher/reset-password`],
        student: [`${API_BASE_URL}/api/auth/student/reset-password`]
      };
      const targets = endpointMap[role] || [`${API_BASE_URL}/api/auth/${role}/reset-password`];
      let res: Response | null = null;
      for (const target of targets) {
        res = await fetch(target, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok || res.status !== 404) break;
      }
      if (!res) throw new Error('No auth reset-password endpoint reachable');
      const data = await res.json();
      return { success: res.ok, message: data.message };
    } catch (err: any) {
      return { success: false, message: err.message || 'Reset failed' };
    }
  };

  // Dispatch Verification / Login OTP (POST /api/auth/send-otp)
  const sendOtp = async (email: string, mobile: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, mobile })
      });
      const data = await res.json().catch(() => ({}));
      const otpCode = data.data?.otp || data.otp;
      return {
        success: res.ok,
        otp: otpCode,
        message: data.message || (otpCode ? `OTP generated: ${otpCode}` : (res.ok ? 'OTP sent successfully' : 'Failed to send OTP'))
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Error sending OTP' };
    }
  };

  // Verify OTP & Issue Pre-Registration Token (POST /api/auth/verify-otp)
  const verifyOtp = async (email: string, mobile: string, otp: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, mobile, otp })
      });
      const data = await res.json().catch(() => ({}));
      const vToken = data.data?.verificationToken || data.verificationToken || data.token;
      return {
        success: res.ok && !!vToken,
        verificationToken: vToken,
        message: data.message || (res.ok ? 'OTP verified successfully' : 'Invalid OTP')
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'OTP verification failed' };
    }
  };

  // Lookup Corporate Entity by Registration Number (GET /api/corporate/lookup/:registrationNo)
  const lookupCorporate = async (registrationNo: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/corporate/lookup/${encodeURIComponent(registrationNo.trim())}`);
      const data = await res.json().catch(() => ({}));
      const corpData = data.data || data.corporate || (data.corporateId ? data : null);
      const isSuccess = res.ok && data.status !== 'error' && !!corpData;
      return {
        success: isSuccess,
        corporate: corpData,
        message: data.message || (isSuccess ? 'Corporate entity found' : 'Corporate entity not found')
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Lookup failed' };
    }
  };

  // Initial Corporate Entity Registration (POST /api/corporate/create)
  const createCorporate = async (
    name: string,
    registration_no: string,
    verificationToken?: string,
    admin?: { name: string; email: string; mobile: string }
  ) => {
    try {
      const payload: any = {
        name,
        registration_no
      };
      if (verificationToken) payload.verificationToken = verificationToken;
      if (admin) payload.admin = admin;

      const res = await fetch(`${API_BASE_URL}/api/corporate/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      return { success: res.ok, data: data.data || data, message: data.message };
    } catch (err: any) {
      return { success: false, message: err.message || 'Corporate creation failed' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role: currentUser ? currentUser.role : 'GUEST',
        isAuthenticated: currentUser !== null && !!getAuthToken(),
        branches,
        currentBranchId,
        setCurrentBranchId: handleBranchChange,
        switchRole,
        loginWithProfile,
        isRole,
        logout,
        loginCorporateInitiate,
        loginCorporateVerify,
        loginAdmin,
        loginTeacher,
        loginStudent,
        forgotPassword,
        resetPassword,
        sendOtp,
        verifyOtp,
        lookupCorporate,
        createCorporate,
        fetchLiveProfile,
        refreshBranches: fetchBranches
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

