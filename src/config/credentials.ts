/**
 * Pre-configured Test & Demo Credentials for Paatam AI School Management
 * Used to auto-fill login forms for testing across all 4 institutional roles.
 */

export interface RoleCredential {
  role: 'CORPORATE_ADMIN' | 'BRANCH_ADMIN' | 'TEACHER' | 'STUDENT';
  roleName: string;
  badge: string;
  identifier: string;
  password?: string;
  otp?: string;
  description: string;
  endpoint: string;
  targetRoute: string;
}

export const TEST_CREDENTIALS: Record<string, RoleCredential> = {
  BRANCH_ADMIN: {
    role: 'BRANCH_ADMIN',
    roleName: 'Dean & Principal (Branch Admin)',
    badge: 'Campus Leadership',
    identifier: 'dean.ramesh@paatam.edu',
    password: 'Admin@123',
    description: 'Executive oversight, campus branches, faculty directory, classes & sections',
    endpoint: 'POST /api/auth/admin/login',
    targetRoute: '/'
  },
  TEACHER: {
    role: 'TEACHER',
    roleName: 'Faculty / Subject Teacher',
    badge: 'Teacher Desk',
    identifier: 'raina@school.edu',
    password: 'Teacher@123',
    description: 'AI exam generation, handwritten script OCR grading, score overrides',
    endpoint: 'POST /api/auth/teacher/login',
    targetRoute: '/'
  },
  STUDENT: {
    role: 'STUDENT',
    roleName: 'Student Learner',
    badge: 'Student Desk',
    identifier: 'ADM-2026-001',
    password: 'Student@123',
    description: 'Student portal, online exam submission, AI Socratic hints, evaluated scorecards',
    endpoint: 'POST /api/auth/student/login',
    targetRoute: '/student'
  },
  CORPORATE_ADMIN: {
    role: 'CORPORATE_ADMIN',
    roleName: 'Corporate Super Admin',
    badge: 'Enterprise Head',
    identifier: 'corp.admin@paatam.edu',
    otp: '123456',
    description: 'Multi-campus network governance, leadership onboarding, corporate settings',
    endpoint: 'POST /api/auth/corporate/login + verify',
    targetRoute: '/campuses'
  }
};
