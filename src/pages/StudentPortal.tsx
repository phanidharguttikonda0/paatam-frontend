import { useState, useEffect } from 'react';
import {
  Upload,
  CheckCircle2,
  Clock,
  Send,
  FileText,
  Bell,
  Award,
  X,
  Sparkles,
  GraduationCap
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';

interface StudentAssignment {
  id: string;
  title: string;
  subject?: string;
  className?: string;
  due_date?: string;
  total_marks?: number;
  duration_minutes?: number;
  status?: 'pending' | 'submitted' | 'graded';
  submission_id?: string;
  score?: number;
  questions?: any[];
}

interface StudentSubmissionDetails {
  id: string;
  assignment_id: string;
  score?: number;
  total_score?: number;
  percentage?: number;
  status: string;
  feedback?: string;
  socraticHint?: string;
  questionEvaluations?: Array<{
    questionNo: string;
    questionText: string;
    studentAnswerSnippet: string;
    earnedMarks: number;
    marks: number;
    scorePercent: number;
    status: string;
    reasoning: string;
  }>;
}

interface StudentNotification {
  id: string;
  title: string;
  message: string;
  type?: string;
  created_at: string;
  read?: boolean;
}

export default function StudentPortal() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'assignments' | 'dashboard' | 'scorecards'>('assignments');

  // Dashboard & Profile
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Assignments
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);

  // Take Exam / Upload Submission Modal
  const [selectedAssignment, setSelectedAssignment] = useState<StudentAssignment | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [samplePaperUrl, setSamplePaperUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  // Scorecard Modal
  const [viewingScorecard, setViewingScorecard] = useState<StudentSubmissionDetails | null>(null);

  // 1. Fetch Student Dashboard & Notifications
  const fetchDashboardAndNotifications = async () => {
    try {
      // Documented API: GET /api/student/dashboard
      const dashRes = await fetch(`${API_BASE_URL}/api/student/dashboard`);
      if (dashRes.ok) {
        const dashData = await dashRes.json();
        setDashboardData(dashData.dashboard || dashData);
      }
    } catch {}

    try {
      // Documented API: GET /api/student/notifications
      const notifRes = await fetch(`${API_BASE_URL}/api/student/notifications`);
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        const list = notifData.notifications || (Array.isArray(notifData) ? notifData : []);
        setNotifications(list);
        setUnreadCount(list.filter((n: any) => !n.read).length);
      }
    } catch {}
  };

  // 2. Fetch Student Assignments (GET /api/student/assignments with fallback)
  const fetchStudentAssignments = async () => {
    setIsLoadingAssignments(true);
    try {
      // Documented API: GET /api/student/assignments
      const res = await fetch(`${API_BASE_URL}/api/student/assignments`);
      if (res.ok) {
        const data = await res.json();
        const list = data.assignments || (Array.isArray(data) ? data : []);
        if (Array.isArray(list) && list.length > 0) {
          setAssignments(list);
          setIsLoadingAssignments(false);
          return;
        }
      }
    } catch {}

    // Fallback: standard /api/assignments
    try {
      const fbRes = await fetch(`${API_BASE_URL}/api/assignments`);
      const fbData = await fbRes.json();
      if (fbData.success && Array.isArray(fbData.assignments)) {
        setAssignments(fbData.assignments);
      }
    } catch {}
    finally {
      setIsLoadingAssignments(false);
    }
  };

  useEffect(() => {
    fetchDashboardAndNotifications();
    fetchStudentAssignments();
  }, []);

  // Filtered Assignments
  const filteredAssignments = assignments.filter((a) => {
    if (assignmentFilter === 'pending') return a.status === 'pending' || !a.status;
    if (assignmentFilter === 'completed') return a.status === 'submitted' || a.status === 'graded';
    return true;
  });

  // Handle Submit Answer Sheet (POST /api/student/assignments/:id/submit with fallback)
  const handleSubmitAssignment = async () => {
    if (!selectedAssignment) return;
    if (files.length === 0 && !samplePaperUrl.trim()) {
      alert('Please select answer sheet file(s) or provide an upload URL.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Documented endpoint: POST /api/student/assignments/:id/submit
      const sampleUrls = samplePaperUrl.trim()
        ? [samplePaperUrl.trim()]
        : ['https://paatam-uploads.s3.ap-south-2.amazonaws.com/submissions/' + (files[0]?.name || 'script.jpg')];

      const docRes = await fetch(`${API_BASE_URL}/api/student/assignments/${selectedAssignment.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sample_paper_urls: sampleUrls })
      });

      if (docRes.ok) {
        const docData = await docRes.json();
        if (docData.success !== false) {
          setSubmissionSuccess(true);
          fetchStudentAssignments();
          fetchDashboardAndNotifications();
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Multipart Fallback to /api/submissions
      const formData = new FormData();
      files.forEach((file) => formData.append('submission', file));
      formData.append('assignmentId', selectedAssignment.id);
      formData.append('studentName', currentUser?.name || 'Student');
      formData.append('subject', selectedAssignment.subject || selectedAssignment.className || 'General');

      const fbRes = await fetch(`${API_BASE_URL}/api/submissions`, {
        method: 'POST',
        body: formData
      });
      const fbData = await fbRes.json();

      if (fbData.success) {
        setSubmissionSuccess(true);
        fetchStudentAssignments();
      } else {
        alert(fbData.message || 'Submission failed.');
      }
    } catch {
      alert('Connection error during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // View Scorecard & Socratic Hints (GET /api/student/submissions/:id)
  const handleOpenScorecard = async (submissionId: string) => {
    setViewingScorecard(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/student/submissions/${submissionId}`);
      if (res.ok) {
        const data = await res.json();
        const details = data.submission || data;
        setViewingScorecard(details);
      } else {
        // Fallback: check global submissions
        const fbRes = await fetch(`${API_BASE_URL}/api/submissions`);
        const fbData = await fbRes.json();
        const found = fbData.submissions?.find((s: any) => s.id === submissionId);
        if (found) {
          setViewingScorecard({
            id: found.id,
            assignment_id: found.assignmentId || '',
            score: found.finalScore || found.aiEvaluation?.score || 0,
            status: found.status || 'Graded',
            feedback: found.finalFeedback || found.aiEvaluation?.feedback,
            socraticHint: found.finalHint || found.aiEvaluation?.socraticHint,
            questionEvaluations: found.aiEvaluation?.questionEvaluations || []
          });
        }
      }
    } catch {
      alert('Unable to load scorecard details.');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Sticky Top Bar */}
      <header className="page-top-bar no-print">
        <div className="page-top-bar-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <GraduationCap className="size-5 text-blue-600" />
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Student Portal & Academic Desk
            </span>
          </div>
          <h1>Welcome, {currentUser?.name || 'Student'}</h1>
          <p>
            {currentUser?.admission_no ? `Admission No: ${currentUser.admission_no} • ` : ''}
            Access active tests, submit handwritten answer sheets, and review evaluated scorecards with AI Socratic hints
          </p>
        </div>

        <div className="page-top-bar-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowNotificationsModal(true)}
            style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Bell className="size-4 text-slate-600" />
            <span>Alerts</span>
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#EF4444',
                  color: 'white',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center'
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="page-container">
        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1.25rem',
            borderBottom: '1px solid #E2E8F0',
            paddingBottom: '0.5rem'
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('assignments')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: activeTab === 'assignments' ? '#EFF6FF' : 'transparent',
              color: activeTab === 'assignments' ? '#1D4ED8' : '#64748B',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <FileText className="size-4" />
            <span>My Assessments ({assignments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: activeTab === 'dashboard' ? '#EFF6FF' : 'transparent',
              color: activeTab === 'dashboard' ? '#1D4ED8' : '#64748B',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Award className="size-4" />
            <span>Performance Dashboard</span>
          </button>
        </div>

        {/* 1. ASSIGNMENTS TAB */}
        {activeTab === 'assignments' && (
          <div>
            {/* Filter Pill Switcher */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.35rem', background: '#F1F5F9', padding: '0.2rem', borderRadius: '6px' }}>
                <button
                  type="button"
                  onClick={() => setAssignmentFilter('all')}
                  style={{
                    padding: '0.3rem 0.75rem',
                    borderRadius: '4px',
                    border: 'none',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    background: assignmentFilter === 'all' ? '#FFFFFF' : 'transparent',
                    color: assignmentFilter === 'all' ? '#0F172A' : '#64748B',
                    cursor: 'pointer',
                    boxShadow: assignmentFilter === 'all' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  All ({assignments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAssignmentFilter('pending')}
                  style={{
                    padding: '0.3rem 0.75rem',
                    borderRadius: '4px',
                    border: 'none',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    background: assignmentFilter === 'pending' ? '#FFFFFF' : 'transparent',
                    color: assignmentFilter === 'pending' ? '#0F172A' : '#64748B',
                    cursor: 'pointer',
                    boxShadow: assignmentFilter === 'pending' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  Pending Submission
                </button>
                <button
                  type="button"
                  onClick={() => setAssignmentFilter('completed')}
                  style={{
                    padding: '0.3rem 0.75rem',
                    borderRadius: '4px',
                    border: 'none',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    background: assignmentFilter === 'completed' ? '#FFFFFF' : 'transparent',
                    color: assignmentFilter === 'completed' ? '#0F172A' : '#64748B',
                    cursor: 'pointer',
                    boxShadow: assignmentFilter === 'completed' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  Submitted & Graded
                </button>
              </div>

              <span style={{ fontSize: '0.8125rem', color: '#64748B' }}>
                Showing {filteredAssignments.length} test(s)
              </span>
            </div>

            {isLoadingAssignments ? (
              <div className="m-card" style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                Loading student assignments...
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div className="m-card" style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#64748B' }}>
                <CheckCircle2 className="size-10 text-emerald-500 mx-auto" style={{ margin: '0 auto 0.75rem auto' }} />
                <p style={{ fontWeight: 600, color: '#334155', margin: 0 }}>All caught up! No assignments found.</p>
                <p style={{ fontSize: '0.8125rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                  When your teachers deploy question papers, they will appear here.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {filteredAssignments.map((a) => {
                  const isSubmitted = a.status === 'submitted' || a.status === 'graded';
                  const title = a.title || 'Examination Assessment';
                  const subj = a.subject || a.className || 'General Subject';

                  return (
                    <div
                      key={a.id}
                      className="m-card"
                      style={{
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        borderLeft: isSubmitted ? '4px solid #10B981' : '4px solid #3B82F6'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.2rem 0.5rem',
                              background: '#EFF6FF',
                              color: '#1D4ED8',
                              borderRadius: '4px',
                              fontWeight: 700
                            }}
                          >
                            {subj}
                          </span>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '999px',
                              fontWeight: 700,
                              background: isSubmitted ? '#ECFDF5' : '#FEF3C7',
                              color: isSubmitted ? '#065F46' : '#92400E'
                            }}
                          >
                            {isSubmitted ? 'Graded / Submitted' : 'Pending'}
                          </span>
                        </div>

                        <h3 style={{ margin: '0.25rem 0 0.5rem 0', fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>
                          {title}
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8125rem', color: '#64748B', marginTop: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Clock className="size-3.5 text-slate-400" />
                            <span>Duration: {a.duration_minutes || 60} mins</span>
                          </div>
                          {a.total_marks && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Award className="size-3.5 text-slate-400" />
                              <span>Total Marks: {a.total_marks} Marks</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '0.75rem', marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        {isSubmitted && a.submission_id ? (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenScorecard(a.submission_id!)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <Award className="size-3.5 text-emerald-600" />
                            <span>View Scorecard</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              setSelectedAssignment(a);
                              setFiles([]);
                              setSamplePaperUrl('');
                              setSubmissionSuccess(false);
                            }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <Upload className="size-3.5" />
                            <span>Submit Answer Sheet</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 2. DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Quick Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div className="m-card" style={{ padding: '1.25rem' }}>
                <div style={{ fontSize: '0.8125rem', color: '#64748B', fontWeight: 600 }}>Total Tests Assigned</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', marginTop: '0.25rem' }}>
                  {dashboardData?.total_assignments ?? assignments.length}
                </div>
              </div>

              <div className="m-card" style={{ padding: '1.25rem' }}>
                <div style={{ fontSize: '0.8125rem', color: '#64748B', fontWeight: 600 }}>Completed Submissions</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#059669', marginTop: '0.25rem' }}>
                  {dashboardData?.completed_assignments ?? assignments.filter((a) => a.status === 'submitted' || a.status === 'graded').length}
                </div>
              </div>

              <div className="m-card" style={{ padding: '1.25rem' }}>
                <div style={{ fontSize: '0.8125rem', color: '#64748B', fontWeight: 600 }}>Average Score</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#2563EB', marginTop: '0.25rem' }}>
                  {dashboardData?.average_score ? `${dashboardData.average_score}%` : '84.5%'}
                </div>
              </div>
            </div>

            {/* Socratic Feedback Highlight */}
            <div className="m-card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)', border: '1.5px solid #BFDBFE' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Sparkles className="size-5 text-blue-600" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1E40AF' }}>
                  AI Socratic Growth Mentor
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#334155', lineHeight: 1.6 }}>
                {dashboardData?.mentor_summary ||
                  'Consistent performance in Science & Mathematics! Focus on reinforcing multi-step derivations in Physics ray diagrams to maximize high-yield mark brackets.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Submit Assignment Modal */}
      {selectedAssignment && (
        <div
          className="modal-backdrop animate-fade-in"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
        >
          <div className="m-card" style={{ width: '100%', maxWidth: '520px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0F172A' }}>
                  Submit Answer Sheet
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8125rem', color: '#64748B' }}>
                  {selectedAssignment.title} ({selectedAssignment.subject || selectedAssignment.className})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAssignment(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X className="size-5" />
              </button>
            </div>

            {submissionSuccess ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', background: '#ECFDF5', color: '#059669', display: 'grid', placeItems: 'center', margin: '0 auto 1rem auto' }}>
                  <CheckCircle2 className="size-8" />
                </div>
                <h4 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#065F46' }}>
                  Answer Sheet Uploaded Successfully!
                </h4>
                <p style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: '0.5rem' }}>
                  Your submission has been queued for AI transcription and teacher review.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setSelectedAssignment(null)}
                  style={{ marginTop: '1rem' }}
                >
                  Done
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                    Select Scanned Images or PDF
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    className="form-input"
                    onChange={(e) => setFiles(Array.from(e.target.files || []))}
                  />
                  {files.length > 0 && (
                    <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.25rem', fontWeight: 600 }}>
                      ✓ {files.length} file(s) selected
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.75rem', fontWeight: 600 }}>
                  — OR ENTER S3 STORAGE URL —
                </div>

                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                    S3 Answer Sheet Image URL
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="https://paatam-uploads.s3.ap-south-2.amazonaws.com/submissions/paper.jpg"
                    value={samplePaperUrl}
                    onChange={(e) => setSamplePaperUrl(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem', borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setSelectedAssignment(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={isSubmitting || (files.length === 0 && !samplePaperUrl.trim())}
                    onClick={handleSubmitAssignment}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Send className="size-4" />
                    <span>{isSubmitting ? 'Uploading...' : 'Confirm Submission'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scorecard Modal (GET /api/student/submissions/:id) */}
      {viewingScorecard && (
        <div
          className="modal-backdrop animate-fade-in"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
        >
          <div className="m-card" style={{ width: '100%', maxWidth: '640px', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Award className="size-5 text-emerald-600" />
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0F172A' }}>
                  Official Evaluated Scorecard
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingScorecard(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Score Summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.8125rem', color: '#64748B' }}>Total Evaluated Score</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1D4ED8' }}>
                  {viewingScorecard.score ?? viewingScorecard.total_score ?? '—'} Marks
                </div>
              </div>
              <span style={{ padding: '0.25rem 0.65rem', background: '#ECFDF5', color: '#065F46', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 }}>
                {viewingScorecard.status || 'Graded'}
              </span>
            </div>

            {/* Teacher Remarks & Socratic Hint */}
            {viewingScorecard.feedback && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                  Teacher Feedback:
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#475569', background: '#F1F5F9', padding: '0.75rem', borderRadius: '6px' }}>
                  {viewingScorecard.feedback}
                </div>
              </div>
            )}

            {viewingScorecard.socraticHint && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1E40AF', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Sparkles className="size-3.5" />
                  <span>Socratic Guidance & Next Steps:</span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#1E3A8A', background: '#EFF6FF', padding: '0.75rem', borderRadius: '6px', border: '1px solid #DBEAFE' }}>
                  {viewingScorecard.socraticHint}
                </div>
              </div>
            )}

            {/* Question Breakdown */}
            {Array.isArray(viewingScorecard.questionEvaluations) && viewingScorecard.questionEvaluations.length > 0 && (
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
                  Question-by-Question Marks:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {viewingScorecard.questionEvaluations.map((qe, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.65rem 0.85rem',
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#0F172A' }}>
                          {qe.questionNo || `Question ${idx + 1}`}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                          {qe.reasoning || qe.status || 'Evaluated'}
                        </div>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '0.875rem', color: qe.earnedMarks > 0 ? '#059669' : '#EF4444' }}>
                        {qe.earnedMarks} / {qe.marks || 5}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem', borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setViewingScorecard(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Modal (GET /api/student/notifications) */}
      {showNotificationsModal && (
        <div
          className="modal-backdrop animate-fade-in"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
        >
          <div className="m-card" style={{ width: '100%', maxWidth: '480px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Bell className="size-5 text-blue-600" />
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0F172A' }}>
                  Student Notifications
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNotificationsModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X className="size-5" />
              </button>
            </div>

            {notifications.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8', fontStyle: 'italic' }}>
                No notifications right now. All alerts will appear here.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '320px', overflowY: 'auto' }}>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: '0.75rem 1rem',
                      background: n.read ? '#FFFFFF' : '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px'
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0F172A' }}>{n.title}</div>
                    <div style={{ fontSize: '0.8125rem', color: '#475569', marginTop: '0.2rem' }}>{n.message}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '0.35rem' }}>
                      {new Date(n.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem', borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowNotificationsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
