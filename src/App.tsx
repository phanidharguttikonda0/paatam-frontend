import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
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
import ParentPortal from './pages/ParentPortal';
import Classes from './pages/Classes';
import ClassDetail from './pages/ClassDetail';
import SubjectWorkspace from './pages/SubjectWorkspace';
import PaperDetail from './pages/PaperDetail';
import Analytics from './pages/Analytics';
import Teachers from './pages/Teachers';
import StudentsRoster from './pages/StudentsRoster';
import Campuses from './pages/Campuses';
import { AuthProvider, useAuth } from './context/AuthContext';

// Route dispatcher that handles both path routing (/upload, /submissions) and legacy search params (?tab=scan)
function MainRouteDispatcher() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const tab = searchParams.get('tab');

  if (location.pathname === '/') {
    if (tab === 'scan') return <ScanGrade />;
    if (tab === 'queue') return <ReviewQueue />;
    if (tab === 'knowledge') return <KnowledgeBase />;
    if (tab === 'generator' || tab === 'exam-generator') return <ExamGenerator />;
    if (tab === 'analytics') return <Analytics />;
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

  // If unauthenticated, always start at the Login Page
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // If already authenticated and visiting /login, redirect to role dashboard
  if (location.pathname === '/login') {
    if (currentUser?.role === 'STUDENT') {
      return <Navigate to="/student" replace />;
    }
    if (currentUser?.role === 'CORPORATE_ADMIN') {
      return <Navigate to="/campuses" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return (
    <div className="app-shell-container">
      {/* PAATAM.AI Left Navigation Sidebar */}
      <Sidebar />

      {/* Main Workspace Area with Global TopBar */}
      <div className="app-main-content">
        <TopBar />
        <Routes>
          <Route path="/" element={<MainRouteDispatcher />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/classes" element={<Classes />} />
          <Route path="/classes/:classId" element={<ClassDetail />} />
          <Route path="/classes/:classId/:classSubjectId" element={<SubjectWorkspace />} />
          <Route path="/teachers" element={<Teachers />} />
          <Route path="/students" element={<StudentsRoster />} />
          <Route path="/campuses" element={<Campuses />} />
          <Route path="/papers/:assignmentId" element={<PaperDetail />} />
          <Route path="/upload" element={<ScanGrade />} />
          <Route path="/submissions" element={<ReviewQueue />} />
          <Route path="/knowledge" element={<KnowledgeBase />} />
          <Route path="/generator" element={<ExamGenerator />} />
          <Route path="/review/:id" element={<ReviewSubmission />} />
          <Route path="/verify/:id" element={<ReviewSubmission />} />
          <Route path="/student" element={<StudentPortal />} />
          <Route path="/parent" element={<ParentPortal />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
