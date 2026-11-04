
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from 'react-router-dom';

import { useState } from 'react';

import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import LoginPage from './pages/LoginPage';
import Overview from './pages/Overview';
import ScanGrade from './pages/ScanGrade';
import ReviewQueue from './pages/ReviewQueue';
import ReviewSubmission from './pages/ReviewSubmission';
import KnowledgeBase from './pages/KnowledgeBase';
import ExamGenerator from './pages/ExamGenerator';
import StudentPortal from './pages/StudentPortal';
import Classes from './pages/Classes';
import ClassDetail from './pages/ClassDetail';
import SubjectWorkspace from './pages/SubjectWorkspace';
import PaperDetail from './pages/PaperDetail';
import Analytics from './pages/Analytics';
import Teachers from './pages/Teachers';
import StudentsRoster from './pages/StudentsRoster';
import Campuses from './pages/Campuses';
import TeacherDashboard from './pages/TeacherDashboard';

import CampusOverview from './pages/principal/Overview';
import ClassesSections from './pages/principal/ClassesSections';
import TeacherPerformance from './pages/principal/TeacherPerformance';

import { AuthProvider, useAuth } from './context/AuthContext';

// Route dispatcher that handles both path routing and legacy search params
function MainRouteDispatcher() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const tab = searchParams.get('tab');

  const { currentUser } = useAuth();
  const role = currentUser?.role?.toUpperCase();

  // Student should only land on the student portal
  if (role === 'STUDENT') {
    return <Navigate to="/student" replace />;
  }

  // Corporate Admin should land on Campuses & Branches
  if (role === 'CORPORATE_ADMIN' || role === 'SUPER_ADMIN') {
    return <Navigate to="/campuses" replace />;
  }

  if (location.pathname === '/') {
    if (tab === 'scan') return <ScanGrade />;
    if (tab === 'queue') return <ReviewQueue />;
    if (tab === 'knowledge') return <KnowledgeBase />;

    if (tab === 'generator' || tab === 'exam-generator') {
      return <ExamGenerator />;
    }

    if (tab === 'analytics') return <Analytics />;

    if (role === 'TEACHER') {
      return <TeacherDashboard />;
    }

    return <Overview />;
  }

  return null;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppLayout />
      </Router>
    </AuthProvider>
  );
}

function AppLayout() {
  const { currentUser, isAuthenticated } = useAuth();
  const location = useLocation();

  const role = currentUser?.role?.toUpperCase();

  const isCorporateAdmin =
    role === 'CORPORATE_ADMIN' || role === 'SUPER_ADMIN';

  const isTeacher = role === 'TEACHER';
  const isStudent = role === 'STUDENT';
  const isPrincipal = role === 'PRINCIPAL';

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // If unauthenticated, always start at Login Page
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // If already authenticated and visiting /login, redirect to role dashboard
  if (location.pathname === '/login') {
    if (isStudent) {
      return <Navigate to="/student" replace />;
    }

    if (isCorporateAdmin) {
      return <Navigate to="/campuses" replace />;
    }

    return <Navigate to="/" replace />;
  }

  return (
    <div
      className={`app-shell-container ${
        sidebarCollapsed ? 'sidebar-collapsed' : ''
      }`}
    >
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() =>
          setSidebarCollapsed((previous) => !previous)
        }
      />

      <div className="app-main-content">
        <TopBar />

        <Routes>
          {/* Main Dashboard */}
          <Route
            path="/"
            element={<MainRouteDispatcher />}
          />

          {/* Institutional / Student Analytics */}
          <Route
            path="/analytics"
            element={
              isStudent ? (
                <Navigate to="/student" replace />
              ) : (
                <Analytics />
              )
            }
          />

          {/* Principal Campus Overview */}
          <Route
            path="/principal/overview"
            element={
              isPrincipal ? (
                <CampusOverview />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* Principal Classes & Sections Performance */}
          <Route
            path="/principal/classes"
            element={
              isPrincipal ? (
                <ClassesSections />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* Classes & Sections */}
          <Route
            path="/classes"
            element={
              isStudent ? (
                <Navigate to="/student" replace />
              ) : (
                <Classes />
              )
            }
          />

          <Route
            path="/classes/:classId"
            element={
              isStudent ? (
                <Navigate to="/student" replace />
              ) : (
                <ClassDetail />
              )
            }
          />

          <Route
            path="/classes/:classId/:classSubjectId"
            element={
              isStudent ? (
                <Navigate to="/student" replace />
              ) : (
                <SubjectWorkspace />
              )
            }
          />

          {/* Faculty Directory */}
          <Route
            path="/teachers"
            element={
              isTeacher || isStudent ? (
                <Navigate
                  to={isStudent ? '/student' : '/'}
                  replace
                />
              ) : (
                <Teachers />
              )
            }
          />

          {/* Students & Parents Roster */}
          <Route
            path="/students"
            element={
              isCorporateAdmin ? (
                <Navigate to="/campuses" replace />
              ) : isStudent ? (
                <Navigate to="/student" replace />
              ) : (
                <StudentsRoster />
              )
            }
          />

          {/* Campuses & Branches */}
          <Route
            path="/campuses"
            element={
              isTeacher ? (
                <Navigate to="/" replace />
              ) : isStudent ? (
                <Navigate to="/student" replace />
              ) : (
                <Campuses />
              )
            }
          />

          {/* Paper Details */}
          <Route
            path="/papers/:assignmentId"
            element={<PaperDetail />}
          />

          {/* Scan & Grade */}
          <Route
            path="/upload"
            element={
              isCorporateAdmin ? (
                <Navigate to="/campuses" replace />
              ) : isStudent ? (
                <Navigate to="/student" replace />
              ) : (
                <ScanGrade />
              )
            }
          />

          {/* Submissions & Review Queue */}
          <Route
            path="/submissions"
            element={
              isStudent ? (
                <Navigate to="/student" replace />
              ) : (
                <ReviewQueue />
              )
            }
          />

          <Route
            path="/review/:id"
            element={
              isStudent ? (
                <Navigate to="/student" replace />
              ) : (
                <ReviewSubmission />
              )
            }
          />

          <Route
            path="/verify/:id"
            element={
              isStudent ? (
                <Navigate to="/student" replace />
              ) : (
                <ReviewSubmission />
              )
            }
          />

          {/* Knowledge Base */}
          <Route
            path="/knowledge"
            element={
              isCorporateAdmin ? (
                <Navigate to="/campuses" replace />
              ) : isStudent ? (
                <Navigate to="/student" replace />
              ) : (
                <KnowledgeBase />
              )
            }
          />

          {/* Exam Generator */}
          <Route
            path="/generator"
            element={
              isCorporateAdmin ? (
                <Navigate to="/campuses" replace />
              ) : isStudent ? (
                <Navigate to="/student" replace />
              ) : (
                <ExamGenerator />
              )
            }
          />

          {/* Teacher Dedicated Dashboard */}
          <Route
            path="/teacher"
            element={
              isCorporateAdmin ? (
                <Navigate to="/campuses" replace />
              ) : isStudent ? (
                <Navigate to="/student" replace />
              ) : (
                <TeacherDashboard />
              )
            }
          />

          {/* Student Dedicated Portal */}
          <Route
            path="/student"
            element={
              !isStudent ? (
                <Navigate
                  to={isCorporateAdmin ? '/campuses' : '/'}
                  replace
                />
              ) : (
                <StudentPortal />
              )
            }
          />

          {/* Catch-all redirect - ALWAYS KEEP LAST */}
          <Route
            path="*"
            element={
              <Navigate
                to={
                  isStudent
                    ? '/student'
                    : isCorporateAdmin
                    ? '/campuses'
                    : '/'
                }
                replace
              />
            }
          />

          {/* Principal Teacher Performance */}
          <Route
            path="/principal/teachers"
            element={
              isPrincipal ? (
                <TeacherPerformance />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Routes>
      </div>
    </div>
  );
}

export default App;
