import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL, setAuthToken, clearAuthToken } from '../config/api';

export type UserRole =
  | 'CORPORATE_ADMIN'
  | 'BRANCH_ADMIN'
  | 'DEAN'
  | 'PRINCIPAL'
  | 'VICE_PRINCIPAL'
  | 'TEACHER'
  | 'STUDENT'
  | 'ADMIN'
  | 'GUEST';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  admission_no?: string;
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
  loginCorporateInitiate: (identifier: string) => Promise<{ success: boolean; message?: string }>;
  loginCorporateVerify: (identifier: string, otp: string) => Promise<{ success: boolean; message?: string }>;
  loginAdmin: (identifier: string, password: string) => Promise<{ success: boolean; message?: string }>;
  loginTeacher: (identifier: string, password: string) => Promise<{ success: boolean; message?: string }>;
  loginStudent: (admission_no: string, password: string) => Promise<{ success: boolean; message?: string }>;
  forgotPassword: (role: 'admin' | 'teacher' | 'student', identifier: string, corporateId?: string) => Promise<{ success: boolean; message?: string }>;
  resetPassword: (role: 'admin' | 'teacher' | 'student', payload: any) => Promise<{ success: boolean; message?: string }>;
  refreshBranches: () => Promise<void>;
}

// Pre-configured Personas for instant demo switching
export const DEMO_PROFILES: Record<string, UserProfile> = {
  CORPORATE_ADMIN: {
    id: 'corp-admin-01',
    name: 'Sunita Sharma',
    email: 'corp.admin@paatam.edu',
    role: 'CORPORATE_ADMIN',
    title: 'Corporate Super Admin',
    branchId: '301',
    branchName: 'Madhapur Campus'
  },
  BRANCH_ADMIN: {
    id: 'admin-dean-1',
    name: 'Dr. Ramesh Sundaram',
    email: 'dean.ramesh@paatam.edu',
    role: 'BRANCH_ADMIN',
    title: 'Dean & Principal (Executive Admin)',
    branchId: '301',
    branchName: 'Madhapur Campus'
  },
  ADMIN: {
    id: 'admin-dean-1',
    name: 'Dr. Ramesh Sundaram',
    email: 'dean.ramesh@paatam.edu',
    role: 'BRANCH_ADMIN',
    title: 'Dean & Principal (Executive Admin)',
    branchId: '301',
    branchName: 'Madhapur Campus'
  },
  TEACHER: {
    id: 'teacher-101',
    name: 'Suresh Raina',
    email: 'raina@school.edu',
    role: 'TEACHER',
    title: 'Faculty / Subject Teacher',
    branchId: '301',
    branchName: 'Madhapur Campus'
  },
  STUDENT: {
    id: 'student-204',
    name: 'Aarav Sharma',
    email: 'aarav@school.edu',
    admission_no: 'ADM-2026-001',
    role: 'STUDENT',
    title: 'Grade 10 - Section A (Roll: 101)',
    branchId: '301',
    branchName: 'Madhapur Campus',
    className: 'Grade 10',
    sectionName: 'A'
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

  const [branches, setBranches] = useState<Branch[]>([
    { id: '301', name: 'Madhapur Campus', address: 'Hitech City, Hyderabad' },
    { id: '302', name: 'Jubilee Hills Campus', address: 'Road No 36, Hyderabad' }
  ]);
  const [currentBranchId, setCurrentBranchId] = useState<string>(() => {
    return localStorage.getItem('paatam_branch_id') || '301';
  });

  // Fetch branches according to user role using documented endpoints
  const fetchBranches = async () => {
    if (!currentUser) return;
    const endpoints = currentUser.role === 'CORPORATE_ADMIN'
      ? [`${API_BASE_URL}/api/branch/corporate`, `${API_BASE_URL}/api/branches`]
      : [`${API_BASE_URL}/api/branch-admin/my-branches`, `${API_BASE_URL}/api/branches`];

    for (const url of endpoints) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        const branchList = Array.isArray(data.data) ? data.data : Array.isArray(data.branches) ? data.branches : null;
        if (branchList && branchList.length > 0) {
          setBranches(branchList);
          if (!branchList.some((b: Branch) => b.id === currentBranchId)) {
            setCurrentBranchId(branchList[0].id);
          }
          break;
        }
      } catch (e) {
        // try fallback endpoint
      }
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchBranches();
    }
  }, [currentUser?.role]);

  const switchRole = (newRole: UserRole) => {
    const profile = DEMO_PROFILES[newRole] || DEMO_PROFILES.BRANCH_ADMIN;
    setCurrentUser(profile);
    localStorage.setItem('paatam_user', JSON.stringify(profile));
  };

  const loginWithProfile = (profile: UserProfile, token?: string) => {
    setCurrentUser(profile);
    localStorage.setItem('paatam_user', JSON.stringify(profile));
    if (token) setAuthToken(token);
  };

  const logout = () => {
    clearAuthToken();
    localStorage.removeItem('paatam_user');
    setCurrentUser(null);
  };

  const isRole = (roles: UserRole[]) => {
    if (!currentUser) return false;
    return roles.includes(currentUser.role) || (roles.includes('ADMIN') && (currentUser.role === 'BRANCH_ADMIN' || currentUser.role === 'CORPORATE_ADMIN' || currentUser.role === 'DEAN' || currentUser.role === 'PRINCIPAL' || currentUser.role === 'VICE_PRINCIPAL'));
  };

  const handleBranchChange = (branchId: string) => {
    setCurrentBranchId(branchId);
    localStorage.setItem('paatam_branch_id', branchId);
  };

  // 1. Corporate Admin Login Initiation
  const loginCorporateInitiate = async (identifier: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/corporate/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier })
      });
      const data = await res.json();
      return { success: res.ok, message: data.message };
    } catch (err: any) {
      return { success: false, message: err.message || 'Connection error' };
    }
  };

  // 2. Corporate Admin OTP Verification
  const loginCorporateVerify = async (identifier: string, otp: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/corporate/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, otp })
      });
      const data = await res.json();
      if (res.ok && data.accessToken) {
        setAuthToken(data.accessToken);
        const profile: UserProfile = {
          id: data.user?.id || 'corp-admin-01',
          name: data.user?.name || identifier.split('@')[0],
          email: identifier,
          role: 'CORPORATE_ADMIN',
          title: 'Corporate Super Admin'
        };
        loginWithProfile(profile, data.accessToken);
        return { success: true };
      }
      return { success: false, message: data.message || 'Invalid OTP' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Verification failed' };
    }
  };

  // 3. Branch Admin Password Login
  const loginAdmin = async (identifier: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });
      const data = await res.json();
      if (res.ok) {
        const token = data.accessToken || data.token;
        if (token) setAuthToken(token);
        const role = (data.user?.role || 'BRANCH_ADMIN') as UserRole;
        const profile: UserProfile = {
          id: data.user?.id || 'admin-01',
          name: data.user?.name || data.user?.admin_name || identifier.split('@')[0],
          email: identifier,
          role: role,
          title: `${role.replace(/_/g, ' ')} (Branch Admin)`
        };
        loginWithProfile(profile, token);
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
        const token = data.accessToken || data.token;
        if (token) setAuthToken(token);
        const profile: UserProfile = {
          id: data.user?.id || 'teacher-01',
          name: data.user?.name || identifier.split('@')[0],
          email: identifier,
          role: 'TEACHER',
          title: 'Faculty / Subject Teacher'
        };
        loginWithProfile(profile, token);
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
        const token = data.accessToken || data.token;
        if (token) setAuthToken(token);
        const profile: UserProfile = {
          id: data.user?.id || 'student-01',
          name: data.user?.name || admission_no,
          email: data.user?.email || `${admission_no.toLowerCase()}@student.paatam.edu`,
          admission_no: admission_no,
          role: 'STUDENT',
          title: `Student (${admission_no})`
        };
        loginWithProfile(profile, token);
        return { success: true };
      }
      return { success: false, message: data.message || 'Invalid Admission Number or password' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Login failed' };
    }
  };

  // Forgot password OTP request
  const forgotPassword = async (role: 'admin' | 'teacher' | 'student', identifier: string, corporateId?: string) => {
    try {
      const endpoint = `${API_BASE_URL}/api/auth/${role}/forgot-password`;
      const body = role === 'admin' ? { identifier, corporateId } : { identifier };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      return { success: res.ok, message: data.message };
    } catch (err: any) {
      return { success: false, message: err.message || 'Request failed' };
    }
  };

  // Reset password with OTP
  const resetPassword = async (role: 'admin' | 'teacher' | 'student', payload: any) => {
    try {
      const endpoint = `${API_BASE_URL}/api/auth/${role}/reset-password`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      return { success: res.ok, message: data.message };
    } catch (err: any) {
      return { success: false, message: err.message || 'Reset failed' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role: currentUser ? currentUser.role : 'GUEST',
        isAuthenticated: currentUser !== null,
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

