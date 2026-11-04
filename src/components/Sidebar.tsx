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
  FileCheck2,
  School,
  Menu,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { role } = useAuth();

  const currentRole = role?.toUpperCase();

  const isCorporateAdmin = ['CORPORATE_ADMIN', 'SUPER_ADMIN'].includes(currentRole || '');
  const isBranchAdmin = ['ADMIN', 'BRANCH_ADMIN', 'DEAN', 'PRINCIPAL', 'VICE_PRINCIPAL'].includes(currentRole || '');
  const isPrincipal = currentRole === 'PRINCIPAL';
  const isTeacher = currentRole === 'TEACHER';
  const isStudent = currentRole === 'STUDENT';

  const isActive = (path: string, tab?: string) => {
    if (tab) {
      const searchParams = new URLSearchParams(location.search);
      return location.pathname === '/' && searchParams.get('tab') === tab;
    }

    if (path === '/' && location.pathname === '/' && !location.search) {
      return true;
    }

    return location.pathname === path || (location.pathname.startsWith(path) && path !== '/');
  };

  const linkClass = (active: boolean) =>
    `sidebar-nav-link ${active ? 'active' : ''}`;

  return (
    <aside className={`app-sidebar no-print ${collapsed ? 'sidebar-is-collapsed' : ''}`}>
      <div className="sidebar-brand">
        <div className="sidebar-logo-icon">
          <img src="/logo.jpg" alt="Paatam AI logo" className="sidebar-logo-image" />
        </div>

        {!collapsed && (
          <div className="sidebar-brand-text">
            <p className="sidebar-brand-name">PAATAM.AI</p>
            <p className="sidebar-brand-tagline">AI SCHOOL MANAGEMENT</p>
          </div>
        )}

        <button
          type="button"
          className="sidebar-toggle-button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Menu size={21} />
        </button>
      </div>

      {!collapsed && (
        <>
          <nav className="sidebar-nav">
            {isCorporateAdmin && (
              <>
                <NavLink to="/campuses" className={({ isActive: active }) => linkClass(active)}>
                  <Building2 className="size-4 sidebar-nav-icon shrink-0" />
                  <span>Campuses & Branches</span>
                </NavLink>

                <NavLink to="/classes" className={({ isActive: active }) => linkClass(active)}>
                  <Layers className="size-4 sidebar-nav-icon shrink-0" />
                  <span>Classes & Academic Years</span>
                </NavLink>

                <NavLink to="/teachers" className={({ isActive: active }) => linkClass(active)}>
                  <UserCheck className="size-4 sidebar-nav-icon shrink-0" />
                  <span>Faculty Directory</span>
                </NavLink>

                <NavLink
                  to="/submissions"
                  className={({ isActive: active }) =>
                    linkClass(active || isActive('/', 'queue'))
                  }
                >
                  <FileCheck2 className="size-4 sidebar-nav-icon shrink-0" />
                  <span>Submissions Feed</span>
                </NavLink>

                <NavLink to="/analytics" className={({ isActive: active }) => linkClass(active)}>
                  <BarChart3 className="size-4 sidebar-nav-icon shrink-0" />
                  <span>Institutional Analytics</span>
                </NavLink>
              </>
            )}

            {isBranchAdmin && (
              <>
                <NavLink
                  to="/"
                  end
                  className={({ isActive: active }) =>
                    linkClass(active || isActive('/', 'overview'))
                  }
                >
                  <LayoutDashboard className="size-4 sidebar-nav-icon shrink-0" />
                  <span>Overview</span>
                </NavLink>

                <NavLink to="/campuses" className={({ isActive: active }) => linkClass(active)}>
                  <Building2 className="size-4 sidebar-nav-icon shrink-0" />
                  <span>Campus & Leadership</span>
                </NavLink>

                <NavLink to="/classes" className={({ isActive: active }) => linkClass(active)}>
                  <Layers className="size-4 sidebar-nav-icon shrink-0" />
                  <span>Classes & Sections</span>
                </NavLink>

                <NavLink to="/teachers" className={({ isActive: active }) => linkClass(active)}>
                  <UserCheck className="size-4 sidebar-nav-icon shrink-0" />
                  <span>Faculty Directory</span>
                </NavLink>

                <NavLink to="/students" className={({ isActive: active }) => linkClass(active)}>
                  <Users className="size-4 sidebar-nav-icon shrink-0" />
                  <span>Students & Parents</span>
                </NavLink>

                <NavLink
                  to="/generator"
                  className={({ isActive: active }) =>
                    linkClass(active || isActive('/', 'generator'))
                  }
                >
                  <Sparkles className="size-4 sidebar-nav-icon shrink-0" />
                  <span>Exam Generator</span>
                </NavLink>

                <NavLink
                  to="/knowledge"
                  className={({ isActive: active }) =>
                    linkClass(active || isActive('/', 'knowledge'))
                  }
                >
                  <BookOpen className="size-4 sidebar-nav-icon shrink-0" />
                  <span>Knowledge Base</span>
                </NavLink>

                <NavLink to="/analytics" className={({ isActive: active }) => linkClass(active)}>
                  <BarChart3 className="size-4 sidebar-nav-icon shrink-0" />
                  <span>Student Analytics</span>
                </NavLink>

                {isPrincipal && (
                  <NavLink
                    to="/principal/overview"
                    className={({ isActive: active }) => linkClass(active)}
                  >
                    <School className="size-4 sidebar-nav-icon shrink-0" />
                    <span>Campus Overview</span>
                  </NavLink>
                )}
              </>
            )}

            {isTeacher && (
              <>
                <NavLink to="/" end className={({ isActive: active }) => linkClass(active || isActive('/', 'overview'))}>
                  <LayoutDashboard className="size-4 sidebar-nav-icon shrink-0" />
                  <span>Dashboard</span>
                </NavLink>

                <NavLink to="/classes" className={({ isActive: active }) => linkClass(active)}>
                  <Layers className="size-4 sidebar-nav-icon shrink-0" />
                  <span>My Classes & Subjects</span>
                </NavLink>

                <NavLink to="/students" className={({ isActive: active }) => linkClass(active)}>
                  <Users className="size-4 sidebar-nav-icon shrink-0" />
                  <span>Student Roster</span>
                </NavLink>

                <NavLink to="/generator" className={({ isActive: active }) => linkClass(active || isActive('/', 'generator'))}>
                  <Sparkles className="size-4 sidebar-nav-icon shrink-0" />
                  <span>Exam Generator</span>
                </NavLink>

                <NavLink to="/knowledge" className={({ isActive: active }) => linkClass(active || isActive('/', 'knowledge'))}>
                  <BookOpen className="size-4 sidebar-nav-icon shrink-0" />
                  <span>Knowledge Base</span>
                </NavLink>

                <NavLink to="/analytics" className={({ isActive: active }) => linkClass(active)}>
                  <BarChart3 className="size-4 sidebar-nav-icon shrink-0" />
                  <span>Class Analytics</span>
                </NavLink>
              </>
            )}

            {isStudent && (
              <>
                <div className="sidebar-section-title">Learner Portal</div>
                <NavLink to="/student" className={({ isActive: active }) => linkClass(active)}>
                  <GraduationCap className="size-4 sidebar-nav-icon shrink-0" />
                  <span>My Dashboard & Tests</span>
                </NavLink>
              </>
            )}
          </nav>

          {(isCorporateAdmin || isBranchAdmin) && (
            <div className="sidebar-footer">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#94A3B8' }}>
                <CheckCircle2 className="size-3.5 text-emerald-400" />
                <span>{isCorporateAdmin ? 'Corporate Network Live' : 'AI Grading Engine Online'}</span>
              </div>
            </div>
          )}
        </>
      )}
    </aside>
  );
}