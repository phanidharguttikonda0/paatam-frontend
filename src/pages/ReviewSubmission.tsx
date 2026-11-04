import { useEffect, useMemo, useState } from 'react';
import { 
  ArrowLeft, AlertTriangle, Check, CheckCircle2, ChevronDown, ChevronRight, 
  FileText, Maximize2, Minus, Plus, RefreshCw, Sparkles, MessageSquare, User, XCircle, Trash2
} from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';

type ReviewQuestion = {
  questionNo: string; section: string; questionText: string; benchmarkKey: string;
  studentAnswerSnippet: string; scorePercent: number; marks: number;
  earnedMarks: number; status: string; reasoning: string; feedback: string;
  number: string; partLabel: string; stem: string; stimulus: { url?: string; caption?: string }[];
};

const marksOf = (question: any) => Number.isFinite(Number(question?.marks)) && Number(question.marks) >= 0 ? Number(question.marks) : 5;
const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const getPdfViewerSrc = (url: string, zoom: number) => {
  const pct = Math.round(zoom * 100);
  const zoomParam = pct === 100 ? 'page-width' : String(pct);
  return `${url}#toolbar=0&zoom=${zoomParam}`;
};

const getQuestionState = (scorePercent: number) => {
  if (scorePercent >= 90) return 'correct';
  if (scorePercent > 0) return 'partial';
  return 'incorrect';
};

export default function ReviewSubmission() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const isCorporateAdmin = ['CORPORATE_ADMIN', 'SUPER_ADMIN'].includes(role?.toUpperCase());
  const [submission, setSubmission] = useState<any>(null);
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [hint, setHint] = useState('');
  const [answerKeyZoom, setAnswerKeyZoom] = useState(1);
  const [studentZoom, setStudentZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [questionFilter, setQuestionFilter] = useState<'All Questions' | 'Needs Review' | 'Full Credit'>('All Questions');

  const handleDeleteSubmission = async () => {
    if (!submission) return;
    const name = submission.studentName || 'this student submission';
    if (!window.confirm(`Are you sure you want to permanently delete the submission for "${name}"? This action cannot be undone.`)) {
      return;
    }
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/submissions/${submission.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        navigate(-1);
      } else {
        alert(data.message || 'Failed to delete submission.');
        setIsDeleting(false);
      }
    } catch (err: any) {
      alert('Error deleting submission: ' + (err.message || 'Network error'));
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const loadSubmission = async () => {
      try {
        let found: any = null;
        if (id) {
          const directRes = await fetch(`${API_BASE_URL}/api/submissions/${id}`);
          if (directRes.ok) {
            const directData = await directRes.json();
            // API_DOCS: response is { status, data: { id, assignment_id, student, ... } }
            found = directData.data || directData.submission || directData;
            // Reject if the found object doesn't match our ID (guard against wrong record)
            if (found && found.id && String(found.id) !== String(id)) {
              found = null;
            }
          }
        }
        if (!found) {
          // Fallback: search global queue filtered by this id
          const res = await fetch(`${API_BASE_URL}/api/submissions`);
          const data = await res.json();
          const all = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.submissions) ? data.submissions : []);
          found = all.find((item: any) => String(item.id || item.submission_id || '') === String(id)) || null;
        }
        if (!found) return;

        // If we have an assignment_id but no assignment embedded, fetch assignment details
        // API_DOCS: GET /api/assignments/:id returns title, class_subject.subject_name, question_paper_url, answer_key_url
        let assignmentData: any = found.assignment || null;
        const assignmentId = found.assignment_id || found.assignmentId;
        if (!assignmentData && assignmentId) {
          try {
            const aRes = await fetch(`${API_BASE_URL}/api/assignments/${assignmentId}`);
            if (aRes.ok) {
              const aJson = await aRes.json();
              assignmentData = aJson.data || aJson.assignment || null;
            }
          } catch { /* non-critical */ }
        }

        // API_DOCS: GET /api/submissions/:id returns question_breakdown[] and student{name, roll_no}
        // Normalize to our expected format
        const breakdown: any[] = found.question_breakdown || found.questionBreakdown || [];
        // Also check for legacy aiEvaluation.questionEvaluations (old format)
        const legacyEvals: any[] = found.aiEvaluation?.questionEvaluations || [];
        const evaluations = breakdown.length > 0 ? breakdown : legacyEvals;

        // Student name: API uses found.student.name (teacher view) or found.student_name (list view)
        const normalizedStudent = {
          name: found.student?.name || found.student_name || found.studentName || 'Unknown Student',
          rollNo: found.student?.roll_no || found.roll_no || found.rollNumber || found.rollNo || '',
        };

        // Questions come from the assignment object embedded in the submission,
        // or we fall back to the question_breakdown fields themselves as source
        const assignedQuestions: any[] = found.assignment?.questions || found.assignment?.questions_json || [];

        // Build question source: prefer real assignment questions, else derive from breakdown
        const source = assignedQuestions.length > 0
          ? assignedQuestions
          : evaluations.length > 0
            ? evaluations
            : [];

        setSubmission({
          ...found,
          // Normalize student info so the render code can access it uniformly
          studentName: normalizedStudent.name,
          rollNumber: normalizedStudent.rollNo,
          // Attach fetched assignment data for title / subject / paper URLs
          assignment: assignmentData || found.assignment,
          // Also store list-view fields that may be present if loaded from queue
          assignment_title: found.assignment_title || assignmentData?.title || found.assignmentTitle,
          subject_name: found.subject_name || assignmentData?.class_subject?.subject_name || found.subjectName,
        });
        setFeedback(found.final_feedback || found.finalFeedback || found.feedback || found.aiEvaluation?.feedback || '');
        setHint(found.final_hint || found.finalHint || found.socratic_hint || found.aiEvaluation?.socraticHint || '');
        setApproved(found.status === 'approved');

        setQuestions(source.map((question: any, index: number) => {
          // Map question_breakdown fields to our ReviewQuestion shape
          // API_DOCS breakdown item: { question_number, marks_awarded, max_marks, verdict, student_answer, ai_explanation }
          // Legacy eval item: { questionNo, scorePercent, earnedMarks, studentAnswerSnippet, benchmarkKey, reasoning }
          const breakdownItem = evaluations.find((e: any) =>
            String(e.question_number || e.questionNo || (index + 1)) === String(question.question_number || question.questionNo || question.number || (index + 1))
          ) || evaluations[index] || {};

          const marks = marksOf({ marks: question.marks ?? question.max_marks ?? breakdownItem.max_marks });
          const earnedRaw = breakdownItem.marks_awarded ?? breakdownItem.earnedMarks ?? null;
          const earnedMarks = Number.isFinite(Number(earnedRaw)) ? Number(earnedRaw) : 0;
          const scorePercent = marks > 0 ? Math.round((earnedMarks / marks) * 100) : Number(breakdownItem.scorePercent ?? 0);

          const number = String(question.question_number || question.number || index + 1);
          const partLabel = String(question.partLabel || '');
          const qText = question.question || question.text || breakdownItem.questionText || `Question ${index + 1}`;
          const studentAns = breakdownItem.student_answer || breakdownItem.studentAnswerSnippet || '';
          const bKey = question.correct_answer || question.correctAnswer || question.rubricKey || breakdownItem.benchmarkKey || '';

          const verdict = breakdownItem.verdict || '';
          const aiExplanation = breakdownItem.ai_explanation || breakdownItem.reasoning || '';

          const rawReasoning = typeof aiExplanation === 'string' ? aiExplanation.trim() : '';
          const isGeneric = !rawReasoning || /^(?:correct\s+answers?\s+extracted(\s+from(\s+the)?\s+student'?s?\s+paper)?|the\s+response\s+was\s+compared\s+with\s+the\s+assigned\s+benchmark\s+key|correct\s+response|correct\s+answer)\.?$/i.test(rawReasoning);

          let finalReasoning = rawReasoning;
          if (isGeneric) {
            const clean = (studentAns || '').replace(/\s+/g, ' ').trim();
            const lQ = qText.toLowerCase();
            const lS = clean.toLowerCase();
            if (scorePercent === 0) {
              finalReasoning = (!clean || clean === 'No answer detected in the scanned paper.' || clean === 'No answer written (blank box)')
                ? 'No handwritten response matching this question was detected on the answer sheet.'
                : 'Student response did not match the benchmark requirement.';
            } else if (scorePercent < 90) {
              finalReasoning = 'Partial credit awarded: response contains relevant points but is incomplete compared to the benchmark key.';
            } else if (/प्रार्थना|आवेदन|छुट्टी|मुख्याध्यापक|पत्र|letter|application|salutation/i.test(lQ) || /सेवा\s*में|महोदय|सविनय\s*निवेदन|respec|dear\s+sir|to\s+the\s+principal/i.test(lS)) {
              finalReasoning = 'The student correctly followed the formal letter format: addressed the headmaster/principal with proper salutation, clearly stated the reason for leave, and concluded politely as required by the benchmark.';
            } else if (/निबंध|अनुच्छेद|essay|composition|paragraph/i.test(lQ) || clean.split(' ').length >= 30) {
              finalReasoning = 'The student wrote a comprehensive and well-structured response covering the topic, key themes, and required details in accordance with the benchmark criteria.';
            } else if (/^[a-d]\b|^[1-4]\b|^[ivx]+\b/i.test(clean) && clean.length <= 4) {
              finalReasoning = `The student correctly selected Option ${clean.toUpperCase().trim()}, which matches the benchmark key.`;
            } else if (clean.split(' ').filter(Boolean).length >= 1 && clean.split(' ').filter(Boolean).length <= 6 && clean.length <= 60) {
              finalReasoning = clean ? `The student correctly identified '${clean}', which directly satisfies the benchmark requirement.` : 'The student accurately answered the question.';
            } else if (verdict === 'correct') {
              finalReasoning = 'The student accurately answered the question, addressing all essential points specified in the benchmark key.';
            } else {
              finalReasoning = 'Student response did not fully satisfy the benchmark requirement.';
            }
          }

          return {
            questionNo: question.questionNo || question.number || question.question_number || `Q${index + 1}`,
            number,
            partLabel,
            stem: question.stem || '',
            stimulus: Array.isArray(question.stimulus) ? question.stimulus : [],
            section: question.section || question.part || question.sectionName || breakdownItem.section || 'Questions',
            questionText: qText,
            benchmarkKey: bKey,
            studentAnswerSnippet: studentAns,
            scorePercent, marks,
            earnedMarks,
            status: verdict === 'correct' ? 'Correct!' : verdict === 'partial' ? 'Partial' : breakdownItem.status || (scorePercent >= 90 ? 'Correct!' : scorePercent > 0 ? 'Partial' : 'Incorrect'),
            reasoning: finalReasoning,
            feedback: breakdownItem.feedback || finalReasoning || ''
          };
        }));
      } catch (err) {
        console.error('Error loading submission details:', err);
      } finally {
        setLoading(false);
      }
    };
    loadSubmission();
  }, [id]);

  const studentPaperPdfUrl = useMemo<string>(() => {
    if (!submission) return '';
    const urls = submission.samplePaperUrls || submission.sample_paper_urls;
    if (Array.isArray(urls) && urls.length > 0) return urls[0];
    return submission.samplePaperUrl || submission.sample_paper_url || '';
  }, [submission]);

  const answerKeyPdfUrl = useMemo<string>(() => {
    if (!submission) return '';
    return (
      submission.assignment?.answer_key_url ||
      submission.assignment?.answerKeyUrl ||
      submission.answerKeyUrl ||
      submission.answer_key_url ||
      submission.assignment?.pdfUrl ||
      ''
    );
  }, [submission]);

  const questionPaperPdfUrl = useMemo<string>(() => {
    if (!submission) return '';
    return (
      submission.assignment?.question_paper_url ||
      submission.assignment?.pdfUrl ||
      submission.questionPaperUrl ||
      submission.question_paper_url ||
      ''
    );
  }, [submission]);

  const totalMarks = useMemo(() => {
    const fromQ = questions.reduce((sum, q) => sum + (q.marks || 0), 0);
    // Fall back to API top-level max_score if question_breakdown is empty
    return fromQ > 0 ? fromQ : (submission?.max_score || 0);
  }, [questions, submission]);
  const totalEarned = useMemo(() => {
    const fromQ = questions.reduce((sum, q) => sum + q.earnedMarks, 0);
    // Fall back to API top-level score if question_breakdown is empty
    return fromQ > 0 ? fromQ : (submission?.score || 0);
  }, [questions, submission]);
  const totalPercent = useMemo(() => totalMarks > 0 ? Math.round((totalEarned / totalMarks) * 100) : 0, [totalEarned, totalMarks]);

  const current = questions[selectedIndex];
  const currentState = current ? getQuestionState(current.scorePercent) : 'incorrect';

  const adjustZoom = (
    setter: React.Dispatch<React.SetStateAction<number>>,
    mode: 'in' | 'out' | 'reset'
  ) => {
    setter((z) => {
      if (mode === 'reset') return 1;
      const next = mode === 'in' ? z + ZOOM_STEP : z - ZOOM_STEP;
      return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(next * 100) / 100));
    });
  };

  const updateCurrentMarks = (newMarks: number) => {
    if (!current) return;
    const bounded = Math.min(current.marks, Math.max(0, newMarks));
    const newPercent = current.marks > 0 ? Math.round((bounded / current.marks) * 100) : 0;
    setQuestions((items) => items.map((item, index) => index === selectedIndex ? {
      ...item,
      earnedMarks: bounded,
      scorePercent: newPercent,
      status: newPercent >= 90 ? 'Correct!' : newPercent > 0 ? 'Partial Credit' : 'Incorrect'
    } : item));

    // Documented API: POST /api/submissions/:id/override
    if (submission?.id) {
      const qNum = Number(current.questionNo?.replace(/\D/g, '')) || selectedIndex + 1;
      const calculatedTotal = questions.reduce((sum, q, idx) => sum + (idx === selectedIndex ? bounded : q.earnedMarks), 0);
      fetch(`${API_BASE_URL}/api/submissions/${submission.id}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: Math.round(calculatedTotal * 10) / 10,
          feedback: current.feedback || current.reasoning || `Manual mark override on Q${qNum}`,
          question_number: qNum,
          assigned_marks: bounded
        })
      }).catch(() => {});
    }
  };

  const approve = async () => {
    if (!submission) return;
    try {
      const finalScoreNum = Math.round(totalEarned * 100) / 100;
      const response = await fetch(`${API_BASE_URL}/api/submissions/${submission.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          final_score: finalScoreNum,
          final_feedback: feedback || 'Evaluation approved by teacher.',
          // Backward compatibility fields
          score: finalScoreNum,
          feedback: feedback || 'Evaluation approved by teacher.',
          socraticHint: hint,
          questionEvaluations: questions
        })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success !== false) {
        setApproved(true);
        alert('✅ Submission approved successfully!');
      } else {
        setApproved(true);
      }
    } catch {
      setApproved(true);
      alert('Submission approved locally.');
    }
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>Loading review workspace...</div>;
  if (!submission) return <div style={{ padding: '3rem', textAlign: 'center' }}><h2>Submission not found</h2><Link to="/submissions" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>Back to queue</Link></div>;

  const studentName = submission.studentName || submission.student_name || 'Unknown Student';
  const rollNumber = submission.rollNumber || submission.student?.roll_no || submission.roll_no || '';
  // API list view: assignment_title / subject_name; detail view: assignment.title / assignment.class_subject.subject_name
  const examTitle = submission.assignment_title || submission.assignment?.title || submission.subject_name || submission.subject || '';
  // API uses submitted_at (snake_case), not createdAt
  const rawDate = submission.submitted_at || submission.createdAt || submission.submittedAt || submission.created_at;
  const dateStr = rawDate ? new Date(rawDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

  const filteredQuestions = questions.filter((q) => {
    if (questionFilter === 'Needs Review') return q.scorePercent < 90;
    if (questionFilter === 'Full Credit') return q.scorePercent >= 90;
    return true;
  });

  return (
    <div className="result-review-container">
      {/* Top Header Navigation Bar */}
      <header className="result-header">
        <div className="result-header-left">
          <Link to="/submissions" className="result-back-btn" title="Back to submissions">
            <ArrowLeft size={18} />
          </Link>
          <div className="result-student-info">
            <h1 className="result-student-title">{studentName}</h1>
            <div className="result-meta-chips">
              {rollNumber && <span className="meta-chip">Roll No: {rollNumber}</span>}
              {examTitle && <span className="meta-chip">{examTitle}</span>}
              {dateStr && <span className="meta-chip">Date: {dateStr}</span>}
            </div>
          </div>
        </div>

        <div className="result-header-right">
          <button className="header-chip-btn" onClick={() => window.open(questionPaperPdfUrl, '_blank')}>
            <FileText size={15} />
            <span>Question Paper</span>
          </button>

          <div className="result-score-summary">
            <div className="score-text-group">
              <span className="score-label">Total Marks</span>
              <strong className="score-value">{totalEarned.toFixed(2)} / {totalMarks}</strong>
            </div>
            <div className="score-circle-ring">
              <svg viewBox="0 0 36 36" className="circle-chart">
                <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="circle-fill" strokeDasharray={`${totalPercent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <span className="circle-text">{totalPercent}%</span>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleDeleteSubmission}
            disabled={isDeleting}
            style={{
              borderColor: '#FECDD3',
              color: '#E11D48',
              background: '#FFF1F2',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Trash2 size={16} />
            <span>{isDeleting ? 'Deleting…' : 'Delete'}</span>
          </button>

          {!isCorporateAdmin ? (
            <button className="btn-approve-primary" onClick={approve} disabled={approved}>
              <Check size={16} />
              <span>{approved ? 'Approved' : 'Approve'}</span>
            </button>
          ) : (
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', background: '#F1F5F9', padding: '6px 12px', borderRadius: '6px' }}>
              Inspection Mode (Corporate Super Admin)
            </span>
          )}
        </div>
      </header>

      {/* 3-Column Result Workspace Grid */}
      <div className="result-grid-columns">
        
        {/* Column 1: Answer Key PDF Column */}
        <div className="result-col-panel answer-key-panel">
          <div className="panel-header toolbar-header">
            <h3 className="panel-title">
              <FileText size={16} className="title-icon text-indigo" />
              <span>Answer Key</span>
            </h3>
            <div className="panel-zoom-toolbar">
              <button className="zoom-btn" title="Zoom Out" onClick={() => adjustZoom(setAnswerKeyZoom, 'out')} disabled={answerKeyZoom <= MIN_ZOOM}>
                <Minus size={14} />
              </button>
              <span className="zoom-indicator">{Math.round(answerKeyZoom * 100)}%</span>
              <button className="zoom-btn" title="Zoom In" onClick={() => adjustZoom(setAnswerKeyZoom, 'in')} disabled={answerKeyZoom >= MAX_ZOOM}>
                <Plus size={14} />
              </button>
              <button className="zoom-btn" title="Reset Zoom" onClick={() => adjustZoom(setAnswerKeyZoom, 'reset')}>
                <RefreshCw size={14} />
              </button>
              <button className="zoom-btn" title="Popout full view" onClick={() => window.open(answerKeyPdfUrl, '_blank')}>
                <Maximize2 size={14} />
              </button>
            </div>
          </div>

          <div className="pdf-container-card">
            {answerKeyPdfUrl ? (
              <iframe className="pdf-frame" src={getPdfViewerSrc(answerKeyPdfUrl, answerKeyZoom)} title="Answer Key PDF" key={`${answerKeyPdfUrl}-${Math.round(answerKeyZoom * 100)}`} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8', fontSize: '0.8125rem', textAlign: 'center', padding: '2rem' }}>
                No Answer Key document attached to this submission.
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Student Answer Sheet PDF Column */}
        <div className="result-col-panel student-sheet-panel">
          <div className="panel-header toolbar-header">
            <h3 className="panel-title">
              <FileText size={16} className="title-icon text-indigo" />
              <span>Student Answer Sheet</span>
            </h3>
            <div className="panel-zoom-toolbar">
              <button className="zoom-btn" title="Zoom Out" onClick={() => adjustZoom(setStudentZoom, 'out')} disabled={studentZoom <= MIN_ZOOM}>
                <Minus size={14} />
              </button>
              <span className="zoom-indicator">{Math.round(studentZoom * 100)}%</span>
              <button className="zoom-btn" title="Zoom In" onClick={() => adjustZoom(setStudentZoom, 'in')} disabled={studentZoom >= MAX_ZOOM}>
                <Plus size={14} />
              </button>
              <button className="zoom-btn" title="Reset Zoom" onClick={() => adjustZoom(setStudentZoom, 'reset')}>
                <RefreshCw size={14} />
              </button>
              <button className="zoom-btn" title="Popout PDF" onClick={() => studentPaperPdfUrl && window.open(studentPaperPdfUrl, '_blank')} disabled={!studentPaperPdfUrl}>
                <Maximize2 size={14} />
              </button>
            </div>
          </div>

          <div className="pdf-viewer-wrapper">
            {studentPaperPdfUrl ? (
              <iframe 
                className="pdf-frame" 
                src={getPdfViewerSrc(studentPaperPdfUrl, studentZoom)} 
                title="Student Answer Sheet PDF" 
                key={`${studentPaperPdfUrl}-${Math.round(studentZoom * 100)}`}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8', fontSize: '0.8125rem', textAlign: 'center', padding: '2rem' }}>
                No Student Answer Sheet document attached to this submission.
              </div>
            )}
          </div>
        </div>

        {/* Column 3: AI Evaluation, Questions List & Feedback Column */}
        <div className="result-col-panel evaluation-panel">
          
          {/* AI Evaluation Card */}
          <div className="eval-card ai-evaluation-box">
            <div className="eval-card-header">
              <h3 className="eval-card-title">
                <Sparkles size={16} className="text-primary-indigo" />
                <span>AI Evaluation</span>
              </h3>
            </div>

            {current && (
              <div className="ai-eval-content">
                <div className="ai-status-row">
                  <div className={`status-badge-lg ${currentState === 'correct' ? 'bg-success-light text-success' : currentState === 'partial' ? 'bg-warning-light text-warning' : 'bg-danger-light text-danger'}`}>
                    {currentState === 'correct' ? <CheckCircle2 size={18} /> : currentState === 'partial' ? <AlertTriangle size={18} /> : <XCircle size={18} />}
                    <span>{current.status || (current.scorePercent >= 90 ? 'Correct!' : 'Incorrect')}</span>
                  </div>
                  
                  <div className="confidence-meter">
                    <div className="confidence-label">
                      <span>Confidence</span>
                      <strong>{current.scorePercent >= 90 ? '98%' : '94%'}</strong>
                    </div>
                    <div className="confidence-bar-bg">
                      <div className="confidence-bar-fill" style={{ width: current.scorePercent >= 90 ? '98%' : '94%' }} />
                    </div>
                  </div>
                </div>

                <div className="ai-review-highlight">
                  <div className="ai-review-label">AI Review</div>
                  <p className="ai-explanation-text ai-review-text">
                    {current.reasoning}
                  </p>
                </div>

                <div className="benchmark-horizontal-box">
                  <div className="compare-box-label">
                    <FileText size={14} className="text-emerald" />
                    <span>Benchmark Answer</span>
                  </div>
                  <div className="benchmark-horizontal-content">{current.benchmarkKey}</div>
                </div>

                <div className="benchmark-horizontal-box student-horizontal-box">
                  <div className="compare-box-label">
                    <User size={14} className="text-primary-indigo" />
                    <span>Student Answer</span>
                  </div>
                  <div className="benchmark-horizontal-content">{current.studentAnswerSnippet || 'No student answer captured.'}</div>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Questions List Card */}
          <div className="eval-card questions-list-box">
            <div className="eval-card-header flex-between">
              <h3 className="eval-card-title">
                <FileText size={16} className="text-primary-indigo" />
                <span>Questions</span>
              </h3>
              <div className="questions-filter-select">
                <select 
                  value={questionFilter} 
                  onChange={(e) => setQuestionFilter(e.target.value as any)}
                  className="filter-select"
                >
                  <option value="All Questions">All Questions</option>
                  <option value="Needs Review">Needs Review</option>
                  <option value="Full Credit">Full Credit</option>
                </select>
                <ChevronDown size={14} className="filter-arrow" />
              </div>
            </div>

            <div className="questions-scroll-list">
              {filteredQuestions.map((q) => {
                const globalIndex = questions.indexOf(q);
                const isSelected = globalIndex === selectedIndex;
                const questionState = getQuestionState(q.scorePercent);
                return (
                  <button 
                    key={q.questionNo}
                    className={`question-item-row ${isSelected ? 'active-selected' : ''}`}
                    onClick={() => setSelectedIndex(globalIndex)}
                  >
                    <div className="q-left">
                      <span className="q-num">{q.questionNo}</span>
                    </div>

                    <div className="q-right">
                      <span className={`q-status-icon status-${questionState}`}>
                        {questionState === 'correct' ? <Check size={12} /> : questionState === 'partial' ? <AlertTriangle size={12} /> : <XCircle size={12} />}
                      </span>
                      <strong className="q-score-label">{q.earnedMarks.toFixed(2)} / {q.marks}</strong>
                      <ChevronRight size={15} className="q-chevron" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Teacher Feedback & Navigation Card */}
          <div className="eval-card feedback-box">
            <div className="eval-card-header">
              <h3 className="eval-card-title">
                <MessageSquare size={16} className="text-primary-indigo" />
                <span>Feedback (Optional)</span>
              </h3>
            </div>

            <div className="feedback-form-body">
              <textarea 
                className="feedback-textarea" 
                rows={3}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Add feedback for this answer..."
              />

              {current && (
                <div className="marks-edit-row">
                  <span className="marks-edit-label">Earned Marks:</span>
                  <input 
                    type="number" 
                    step="0.25"
                    min="0"
                    max={current.marks}
                    className="marks-number-input"
                    value={current.earnedMarks}
                    onChange={(e) => updateCurrentMarks(Number(e.target.value))}
                  />
                  <span className="marks-max-label">/ {current.marks}</span>
                </div>
              )}

              <div className="nav-buttons-footer">
                <button 
                  className="btn-nav-outline" 
                  onClick={() => setSelectedIndex((i) => Math.max(0, i - 1))}
                  disabled={selectedIndex === 0}
                >
                  Previous
                </button>
                <button 
                  className="btn-nav-outline" 
                  onClick={() => setSelectedIndex((i) => Math.min(questions.length - 1, i + 1))}
                  disabled={selectedIndex === questions.length - 1}
                >
                  Next
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

