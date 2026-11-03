import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Sparkles,
  GraduationCap,
  CheckCircle2,
  Layers,
  BarChart3,
  Users,
  Building2,
  UserCheck,
  FileCheck2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const location = useLocation();
  const { role } = useAuth();

  const isCorporateAdmin = ['CORPORATE_ADMIN', 'SUPER_ADMIN'].includes(role?.toUpperCase());
  const isBranchAdmin = ['ADMIN', 'BRANCH_ADMIN', 'DEAN', 'PRINCIPAL', 'VICE_PRINCIPAL'].includes(role?.toUpperCase());
  const isTeacher = role?.toUpperCase() === 'TEACHER';
  const isStudent = role?.toUpperCase() === 'STUDENT';

  const isActive = (path: string, tab?: string) => {
    if (tab) {
      const searchParams = new URLSearchParams(location.search);
      return location.pathname === '/' && searchParams.get('tab') === tab;
    }
    if (path === '/' && (location.pathname === '/' && !location.search)) {
      return true;
    }
    return location.pathname === path || (location.pathname.startsWith(path) && path !== '/');
  };

  return (
    <>
      <aside className="app-sidebar no-print">
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div className="sidebar-logo-icon">
            <img src="/logo.jpg" alt="Paatam AI logo" className="sidebar-logo-image" />
          </div>
          <div>
            <p className="sidebar-brand-name">PAATAM.AI</p>
            <p className="sidebar-brand-tagline">AI SCHOOL MANAGEMENT</p>
          </div>
        </div>

        {/* Main Navigation (Strictly Role-Based to Allotted APIs) */}
        <nav className="sidebar-nav">
          {/* ========================================================================= */}
          {/* 1. CORPORATE ADMIN NAVIGATION (Super Admin Operations)                    */}
          {/* ========================================================================= */}
          {isCorporateAdmin && (
            <>
              {/* Campuses & Branches (Primary Workplace: GET /api/branch/corporate/all) */}
              <NavLink
                to="/campuses"
                className={({ isActive: isNavActive }) => `sidebar-nav-link ${isNavActive ? 'active' : ''}`}
              >
                <Building2 className="size-4 sidebar-nav-icon shrink-0" />
                <span>Campuses & Branches</span>
              </NavLink>

              {/* Classes & Sections (GET /api/academic-years/:id/classes) */}
              <NavLink
                to="/classes"
                className={({ isActive: isNavActive }) => `sidebar-nav-link ${isNavActive ? 'active' : ''}`}
              >
                <Layers className="size-4 sidebar-nav-icon shrink-0" />
                <span>Classes & Academic Years</span>
              </NavLink>

              {/* Faculty Directory (GET /api/branch/:branchId/teachers) */}
              <NavLink
                to="/teachers"
                className={({ isActive: isNavActive }) => `sidebar-nav-link ${isNavActive ? 'active' : ''}`}
              >
                <UserCheck className="size-4 sidebar-nav-icon shrink-0" />
                <span>Faculty Directory</span>
              </NavLink>

              {/* Global Review Feed & Submissions (GET /api/submissions) */}
              <NavLink
                to="/submissions"
                className={({ isActive: isNavActive }) => `sidebar-nav-link ${isNavActive || isActive('/', 'queue') ? 'active' : ''}`}
              >
                <FileCheck2 className="size-4 sidebar-nav-icon shrink-0" />
                <span>Submissions Feed</span>
              </NavLink>

              {/* Macro Analytics (GET /api/analytics/overview) */}
              <NavLink
                to="/analytics"
                className={({ isActive: isNavActive }) => `sidebar-nav-link ${isNavActive ? 'active' : ''}`}
              >
                <BarChart3 className="size-4 sidebar-nav-icon shrink-0" />
                <span>Institutional Analytics</span>
              </NavLink>
            </>
          )}

          {/* ========================================================================= */}
          {/* 2. BRANCH ADMIN / LEADERSHIP (Dean, Principal, Vice Principal)            */}
          {/* ========================================================================= */}
          {isBranchAdmin && (
            <>
              {/* Overview (Command Center) */}
              <NavLink
                to="/"
                end
                className={({ isActive: isNavActive }) => `sidebar-nav-link ${isNavActive || isActive('/', 'overview') ? 'active' : ''}`}
              >
                <LayoutDashboard className="size-4 sidebar-nav-icon shrink-0" />
                <span>Overview</span>
              </NavLink>

              {/* My Campus & Leadership (GET /api/branch-admin/my-branches) */}
              <NavLink
                to="/campuses"
                className={({ isActive: isNavActive }) => `sidebar-nav-link ${isNavActive ? 'active' : ''}`}
              >
                <Building2 className="size-4 sidebar-nav-icon shrink-0" />
                <span>Campus & Leadership</span>
              </NavLink>

              {/* Classes & Sections (Full Academic Management) */}
              <NavLink
                to="/classes"
                className={({ isActive: isNavActive }) => `sidebar-nav-link ${isNavActive ? 'active' : ''}`}
              >
                <Layers className="size-4 sidebar-nav-icon shrink-0" />
                <span>Classes & Sections</span>
              </NavLink>

              {/* Faculty & Staff (Hiring & Allocations) */}
              <NavLink
                to="/teachers"
                className={({ isActive: isNavActive }) => `sidebar-nav-link ${isNavActive ? 'active' : ''}`}
              >
                <UserCheck className="size-4 sidebar-nav-icon shrink-0" />
                <span>Faculty Directory</span>
              </NavLink>

              {/* Students & Parents Roster */}
              <NavLink
                to="/students"
                className={({ isActive: isNavActive }) => `sidebar-nav-link ${isNavActive ? 'active' : ''}`}
              >
                <Users className="size-4 sidebar-nav-icon shrink-0" />
                <span>Students & Parents</span>
              </NavLink>

              {/* Exam Question Generator (POST /api/assignments/generate) */}
              <NavLink
                to="/generator"
                className={({ isActive: isNavActive }) => `sidebar-nav-link ${isNavActive || isActive('/', 'generator') ? 'active' : ''}`}
              >
                <Sparkles className="size-4 sidebar-nav-icon shrink-0" />
                <span>Exam Generator</span>
              </NavLink>

              {/* Knowledge Base (POST /api/curriculum/chapters/ingest) */}
              <NavLink
                to="/knowledge"
                className={({ isActive: isNavActive }) => `sidebar-nav-link ${isNavActive || isActive('/', 'knowledge') ? 'active' : ''}`}
              >
                <BookOpen className="size-4 sidebar-nav-icon shrink-0" />
                <span>Knowledge Base</span>
              </NavLink>

              {/* Student Analytics */}
              <NavLink
                to="/analytics"
                className={({ isActive: isNavActive }) => `sidebar-nav-link ${isNavActive ? 'active' : ''}`}
              >
                <BarChart3 className="size-4 sidebar-nav-icon shrink-0" />
                <span>Student Analytics</span>
              </NavLink>
            </>
          )}

          {/* ========================================================================= */}
          {/* 3. TEACHER (Subject & Class Faculty)                                     */}
          {/* ========================================================================= */}
          {isTeacher && (
            <>
              {/* Teacher Home Dashboard (GET /api/teacher/dashboard) */}
              <NavLink
                to="/"
                end
                className={({ isActive: isNavActive }) => `sidebar-nav-link ${isNavActive || isActive('/', 'overview') ? 'active' : ''}`}
              >
                <LayoutDashboard className="size-4 sidebar-nav-icon shrink-0" />
                <span>Dashboard</span>
              </NavLink>

              {/* Classes & Sections (Assigned Sections: GET /api/teacher/sections/:id/subjects) */}
              <NavLink
                to="/classes"
                className={({ isActive: isNavActive }) => `sidebar-nav-link ${isNavActive ? 'active' : ''}`}
              >
                <Layers className="size-4 sidebar-nav-icon shrink-0" />
                <span>My Classes & Subjects</span>
              </NavLink>

              {/* Students Roster (GET /api/sections/:sectionId/students) */}
              <NavLink
                to="/students"
                className={({ isActive: isNavActive }) => `sidebar-nav-link ${isNavActive ? 'active' : ''}`}
              >
                <Users className="size-4 sidebar-nav-icon shrink-0" />
                <span>Student Roster</span>
              </NavLink>

              {/* AI Question Paper Generator */}
              <NavLink
                to="/generator"
                className={({ isActive: isNavActive }) => `sidebar-nav-link ${isNavActive || isActive('/', 'generator') ? 'active' : ''}`}
              >
                <Sparkles className="size-4 sidebar-nav-icon shrink-0" />
                <span>Exam Generator</span>
              </NavLink>

              {/* Knowledge Base (Curriculum RAG) */}
              <NavLink
                to="/knowledge"
                className={({ isActive: isNavActive }) => `sidebar-nav-link ${isNavActive || isActive('/', 'knowledge') ? 'active' : ''}`}
              >
                <BookOpen className="size-4 sidebar-nav-icon shrink-0" />
                <span>Knowledge Base</span>
              </NavLink>

              {/* Class Analytics */}
              <NavLink
                to="/analytics"
                className={({ isActive: isNavActive }) => `sidebar-nav-link ${isNavActive ? 'active' : ''}`}
              >
                <BarChart3 className="size-4 sidebar-nav-icon shrink-0" />
                <span>Class Analytics</span>
              </NavLink>
            </>
          )}

          {/* ========================================================================= */}
          {/* 4. STUDENT (Learner Portal: ONLY dedicated learner tools)                */}
          {/* ========================================================================= */}
          {isStudent && (
            <>
              <div className="sidebar-section-title">Learner Portal</div>
              <NavLink
                to="/student"
                className={({ isActive: isNavActive }) => `sidebar-nav-link ${isNavActive ? 'active' : ''}`}
              >
                <GraduationCap className="size-4 sidebar-nav-icon shrink-0" />
                <span>My Dashboard & Tests</span>
              </NavLink>
            </>
          )}
        </nav>

        {/* Footer info (Branch & Leadership only) */}
        {(isCorporateAdmin || isBranchAdmin) && (
          <div className="sidebar-footer">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#94A3B8' }}>
              <CheckCircle2 className="size-3.5 text-emerald-400" />
              <span>{isCorporateAdmin ? 'Corporate Network Live' : 'AI Grading Engine Online'}</span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
