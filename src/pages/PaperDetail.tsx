import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ScanLine, FileStack, ChevronRight, FileText, Trash2 } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import ScanGrade from './ScanGrade';

type Tab = 'results' | 'scan';

export default function PaperDetail() {
  const { assignmentId } = useParams();
  const [searchParams] = useSearchParams();
  const classId = searchParams.get('classId') || '';
  const classSubjectId = searchParams.get('classSubjectId') || '';
  const sectionId = searchParams.get('sectionId') || searchParams.get('section_id') || '';
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<Tab>('results');
  const [assignment, setAssignment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!assignmentId) return;

    const matchesAssignmentId = (a: any) => String(a?.id ?? a?.assignment_id ?? a?.assignmentId ?? '') === String(assignmentId);

    const normalizePaper = (item: any) => {
      if (!item) return null;
      const rawQuestions = item.questions || item.questions_json || [];
      const questions = Array.isArray(rawQuestions) ? rawQuestions : [];
      const subjectName = (
        item.subject ||
        item.class_subject?.subject_name ||
        item.class_subject?.name ||
        item.subject_name ||
        searchParams.get('subject') ||
        ''
      ).trim();
      const className = (
        item.className ||
        item.class_name ||
        item.class_subject?.class_name ||
        item.grade ||
        ''
      ).trim();
      const akUrl = String(item.answer_key_url || item.answerKeyUrl || '').trim();
      const akText = String(item.answer_key_text || item.answerKeyText || '').trim();
      const isPlaceholderAk = /^marking scheme and rubric for/i.test(akText);

      return {
        ...item,
        id: String(item.id ?? item.assignment_id ?? item.assignmentId ?? ''),
        sectionId: String(item.sectionId ?? item.section_id ?? item.section?.id ?? ''),
        title: item.title || item.exam_title || 'Question paper',
        subject: subjectName,
        className,
        questions,
        answer_key_url: akUrl,
        answerKeyUrl: akUrl,
        answer_key_text: akText,
        answerKeyText: isPlaceholderAk ? '' : akText,
        isPlaceholderAnswerKey: isPlaceholderAk,
        hasAnswerKey: Boolean(akUrl || (akText && !isPlaceholderAk))
      };
    };

    const fetchAssignment = async () => {
      try {
        // Preferred path: fetch the paper directly by ID.
        const directRes = await fetch(`${API_BASE_URL}/api/assignments/${encodeURIComponent(assignmentId)}`);
        const directData = await directRes.json().catch(() => ({}));
        const direct = directData?.assignment || directData?.data || (directData?.id || directData?.assignment_id ? directData : null);
        if (direct && (direct.id || direct.assignment_id || direct.assignmentId)) {
          setAssignment(normalizePaper(direct));
          return;
        }
      } catch {}

      // Fallback path: scan assignment list for legacy backend responses.
      fetch(`${API_BASE_URL}/api/assignments`)
        .then((res) => res.json())
        .then((data) => {
          const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.assignments) ? data.assignments : []);
          if (list.length > 0) {
            const match = list.find((a: any) => matchesAssignmentId(a));
            if (match) setAssignment(normalizePaper(match));
          }
        })
        .catch(() => {});
    };

    fetchAssignment();
  }, [assignmentId]);

  useEffect(() => {
    if (!assignmentId) return;
    const fetchSubmissions = () => {
      // Use the documented endpoint: GET /api/assignments/:id/submissions
      fetch(`${API_BASE_URL}/api/assignments/${encodeURIComponent(assignmentId)}/submissions?limit=10`)
        .then((res) => res.json())
        .then((data) => {
          const list = Array.isArray(data?.data)
            ? data.data
            : (Array.isArray(data?.submissions) ? data.submissions : []);

          const normalized = list.map((s: any) => ({
            ...s,
            id: String(s.id || s.submission_id || ''),
            assignmentId: String(s.assignmentId || s.assignment_id || assignmentId),
            studentName: s.studentName || s.student_name || 'Unnamed student',
            submittedAt: s.submittedAt || s.submitted_at || '',
            score: s.score ?? s.finalScore ?? s.aiEvaluation?.score ?? null,
            maxScore: s.maxScore ?? s.max_score ?? s.aiEvaluation?.maxScore ?? 0,
            status: s.status || s.evaluation_status || 'pending'
          })).filter((s: any) => s.id);

          if (normalized.length > 0) {
            setSubmissions(normalized);
            return;
          }

          // Fallback: global submissions list filtered by assignment_id
          return fetch(`${API_BASE_URL}/api/submissions?assignment_id=${encodeURIComponent(assignmentId)}&limit=10`)
            .then((r) => r.json())
            .then((d) => {
              const fallbackList = Array.isArray(d?.data)
                ? d.data
                : (Array.isArray(d?.submissions) ? d.submissions : []);

              const fallbackNormalized = fallbackList
                .filter((s: any) => !s.assignment_id || String(s.assignment_id) === String(assignmentId))
                .map((s: any) => ({
                  ...s,
                  id: String(s.id || s.submission_id || ''),
                  assignmentId: String(s.assignmentId || s.assignment_id || assignmentId),
                  studentName: s.studentName || s.student_name || 'Unnamed student',
                  submittedAt: s.submittedAt || s.submitted_at || '',
                  score: s.score ?? s.finalScore ?? s.aiEvaluation?.score ?? null,
                  maxScore: s.maxScore ?? s.max_score ?? s.aiEvaluation?.maxScore ?? 0,
                  status: s.status || s.evaluation_status || 'pending'
                })).filter((s: any) => s.id);

              setSubmissions(fallbackNormalized);
            });
        })
        .catch(() => {});
    };
    fetchSubmissions();
    const interval = setInterval(fetchSubmissions, 4000);
    return () => clearInterval(interval);
  }, [assignmentId]);

  const backUrl = classId && classSubjectId
    ? `/classes/${classId}/${classSubjectId}${sectionId ? `?sectionId=${encodeURIComponent(sectionId)}` : ''}`
    : '/classes';

  const handleDelete = async () => {
    const title = assignment?.title || 'this question paper';
    if (!window.confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }
    setIsDeleting(true);
    try {
      try {
        const existingRaw = localStorage.getItem('smartstudy_saved_exam_papers');
        if (existingRaw) {
          const existing = JSON.parse(existingRaw);
          const updated = existing.filter((p: any) => p.id !== assignmentId);
          localStorage.setItem('smartstudy_saved_exam_papers', JSON.stringify(updated));
        }
      } catch (e) {}

      const res = await fetch(`${API_BASE_URL}/api/assignments/${assignmentId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        navigate(backUrl);
      } else {
        alert(data.message || 'Failed to delete paper.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error deleting paper: ' + (err.message || 'Network error'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSubmission = async (e: React.MouseEvent, subId: string, studentName?: string) => {
    e.stopPropagation();
    const name = studentName || 'this student submission';
    if (!window.confirm(`Are you sure you want to permanently delete the submission for "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/submissions/${subId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        setSubmissions((prev) => prev.filter((s) => s.id !== subId));
      } else {
        alert(data.message || 'Failed to delete submission.');
      }
    } catch (err: any) {
      alert('Error deleting submission: ' + (err.message || 'Network error'));
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <header className="page-top-bar no-print">
        <div className="page-top-bar-text">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(backUrl)} style={{ marginBottom: '0.5rem' }}>
            <ArrowLeft className="size-4" />
            <span>Back to subject</span>
          </button>
          <h1>{assignment?.title || 'Question paper'}</h1>
          <p>
            {assignment ? (
              `${(assignment.questions || []).length} question(s) · ${
                assignment.hasAnswerKey || assignment.answerKeyUrl || (assignment.answerKeyText && !assignment.isPlaceholderAnswerKey)
                  ? 'Answer key attached'
                  : 'No answer key'
              }${assignment.subject ? ` · ${assignment.subject}` : ''}`
            ) : 'Loading paper details…'}
          </p>
        </div>
        <div className="page-top-bar-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {assignment?.answerKeyUrl && (
            <a
              href={assignment.answerKeyUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#166534', borderColor: '#BBF7D0', background: '#F0FDF4' }}
            >
              <FileText className="size-4 text-emerald-600" />
              <span>View Answer Key PDF</span>
            </a>
          )}
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleDelete}
            disabled={isDeleting}
            style={{
              borderColor: '#FECDD3',
              color: '#E11D48',
              background: '#FFF1F2',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <Trash2 className="size-4 text-rose-600" />
            <span>{isDeleting ? 'Deleting…' : 'Delete Paper'}</span>
          </button>
        </div>
      </header>

      <div className="page-container">
        <div style={{ display: 'flex', gap: '0.35rem', background: '#F1F5F9', padding: '0.25rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', marginBottom: '1.25rem', width: 'fit-content' }}>
          <button
            onClick={() => setActiveTab('results')}
            className={`btn btn-sm ${activeTab === 'results' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <FileStack className="size-4" />
            <span>Student results</span>
          </button>
          <button
            onClick={() => setActiveTab('scan')}
            className={`btn btn-sm ${activeTab === 'scan' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <ScanLine className="size-4" />
            <span>Scan again</span>
          </button>
        </div>

        {activeTab === 'results' && (
          <div className="m-card">
            <div className="m-card-header">
              <h3 className="m-card-title">Student results</h3>
            </div>
            {submissions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748B' }}>
                <FileText className="size-8 text-slate-300 mx-auto" style={{ margin: '0 auto 0.5rem auto' }} />
                <p style={{ fontWeight: 600, color: '#334155', margin: 0 }}>No scripts scanned yet for this paper.</p>
                <p style={{ fontSize: '0.8125rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                  Switch to "Scan again" to upload student answer sheets.
                </p>
                <button className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }} onClick={() => setActiveTab('scan')}>
                  Scan again
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {submissions.map((sub) => {
                  const scoreVal = sub.score;
                  const maxScore = Number(sub.maxScore || 0);
                  const isApproved = sub.status === 'approved';
                  const isCompleted = sub.status === 'graded' || sub.status === 'approved' || sub.evaluation_status === 'completed';
                  return (
                    <div
                      key={sub.id}
                      onClick={() => navigate(`/review/${sub.id}`)}
                      className="submission-row-card"
                      style={{
                        width: '100%',
                        border: '1px solid #E2E8F0',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1rem',
                        borderRadius: '0.625rem',
                        background: '#FFFFFF'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>
                          {sub.studentName || sub.student_name || 'Unnamed student'}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: '0.15rem' }}>
                          Submitted {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : 'recently'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#111827' }}>
                          {isCompleted && scoreVal !== null && scoreVal !== undefined
                            ? `${scoreVal}/${maxScore} marks`
                            : 'Processing...'}
                        </div>
                        {isApproved ? (
                          <span className="badge badge-green">Approved</span>
                        ) : isCompleted ? (
                          <span className="badge badge-blue">Graded</span>
                        ) : (
                          <span className="badge badge-amber">Needs review</span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSubmission(e, sub.id, sub.studentName || sub.student_name)}
                          title="Delete submission"
                          style={{
                            border: '1px solid #FECDD3',
                            background: '#FFF1F2',
                            color: '#E11D48',
                            borderRadius: '0.375rem',
                            padding: '0.35rem 0.5rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Trash2 className="size-3.5" />
                          <span>Delete</span>
                        </button>
                        <ChevronRight className="size-4 text-slate-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'scan' && (
          <div style={{ margin: '-1.5rem -2rem' }}>
            <ScanGrade 
              lockAssignmentId={assignmentId} 
              preloadedAssignment={assignment}
              onBatchComplete={() => setActiveTab('results')} 
            />
          </div>
        )}
      </div>
    </div>
  );
}
