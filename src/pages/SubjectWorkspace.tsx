import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FileText, FileStack, Send, Plus, Upload, X, CheckCircle2, ChevronRight, Sparkles, Edit3, Trash2, CloudUpload } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';

const cleanSecName = (raw: string) => {
  if (!raw) return 'A';
  return String(raw).replace(/^Section\s+/i, '').trim() || 'A';
};
import ReviewQueue from './ReviewQueue';
import AssignmentPipelineModal from '../components/AssignmentPipelineModal';

type Tab = 'papers' | 'queue';

type Assignment = {
  id: string;
  title: string;
  className: string;
  subject?: string;
  status?: string;
  createdAt?: string;
  answerKeyText?: string;
  answerKeyUrl?: string;
  questions?: any[];
};

export default function SubjectWorkspace() {
  const { classId, classSubjectId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { role } = useAuth();
  const isTeacher = role?.toUpperCase() === 'TEACHER';
  const sectionIdFromUrl = searchParams.get('sectionId') || '';
  const [activeTab, setActiveTab] = useState<Tab>('papers');

  const [className, setClassName] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState(false);

  const [paperTitle, setPaperTitle] = useState('');
  const [questionPaperFiles, setQuestionPaperFiles] = useState<File[]>([]);
  const [answerKeyFiles, setAnswerKeyFiles] = useState<File[]>([]);
  const [deployStep, setDeployStep] = useState<1 | 2 | 3>(1);
  const [extractedQuestions, setExtractedQuestions] = useState<any[]>([]);
  const [extractedAnswerKeyText, setExtractedAnswerKeyText] = useState('');
  const [questionPaperUrl, setQuestionPaperUrl] = useState('');
  const [answerKeyUrl, setAnswerKeyUrl] = useState('');
  const [answerKeyFileName, setAnswerKeyFileName] = useState('');
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [isUploadingStep, setIsUploadingStep] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [questionUploadPct, setQuestionUploadPct] = useState<number | null>(null);
  const [answerKeyUploadPct, setAnswerKeyUploadPct] = useState<number | null>(null);

  const fetchAssignments = () => {
    if (!classSubjectId) return;
    const qParams = new URLSearchParams({
      class_subject_id: classSubjectId,
      ...(sectionIdFromUrl ? { section_id: sectionIdFromUrl } : {})
    });
    fetch(`${API_BASE_URL}/api/assignments?${qParams.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data.data)
          ? data.data
          : (Array.isArray(data.assignments) ? data.assignments : []);
        const normalized: Assignment[] = list.map((item: any) => ({
          id: String(item.id || item.assignment_id || ''),
          title: item.title || item.exam_title || 'Question paper',
          className: item.className || item.class_name || '',
          subject: item.subject || item.subject_name,
          status: item.status,
          createdAt: item.createdAt || item.created_at,
          answerKeyText: item.answerKeyText || item.answer_key_text || '',
          answerKeyUrl: item.answerKeyUrl || item.answer_key_url || '',
          questions: Array.isArray(item.questions)
            ? item.questions
            : (Array.isArray(item.questions_json) ? item.questions_json : [])
        }));
        setAssignments(normalized.filter((a) => a.id));
      })
      .catch((err) => console.error('Unable to load question papers:', err));
  };

  useEffect(() => {
    if (!classId || !classSubjectId) return;

    fetch(`${API_BASE_URL}/api/classes/${classId}`)
      .then((res) => res.json())
      .then((data) => {
        const match = data.data || data.class || (Array.isArray(data.classes) ? data.classes.find((c: any) => c.id === classId) : data);
        if (match && match.name) {
          let secStr = '';
          if (sectionIdFromUrl) {
            const foundSec = Array.isArray(match.sections) ? match.sections.find((s: any) => String(s.id) === String(sectionIdFromUrl)) : null;
            secStr = foundSec ? `Section ${cleanSecName(foundSec.section_name)}` : `Section ${cleanSecName(sectionIdFromUrl)}`;
          } else if (isTeacher) {
            secStr = 'Section A';
          } else {
            secStr = Array.isArray(match.sections) && match.sections.length > 0
              ? match.sections.map((s: any) => s.section_name).filter(Boolean).join(', ')
              : '';
          }
          setClassName(secStr ? `${match.name} - ${secStr}` : match.name);
        }
      })
      .catch(() => {});

    fetch(`${API_BASE_URL}/api/classes/${classId}/subjects`)
      .then((res) => res.json())
      .then((data) => {
        const subjects = Array.isArray(data.data)
          ? data.data
          : (Array.isArray(data.subjects) ? data.subjects : []);
        if (subjects.length > 0) {
          const match = subjects.find((s: any) => s.id === classSubjectId || s.class_subject_id === classSubjectId);
          if (match) {
            setSubjectName(match.subject_name || match.name || match.subjectName || 'Subject');
            // Embedded ScanGrade/ReviewQueue read the scope from the shared URL query string.
            setSearchParams(
              (prev) => {
                prev.set('classSubjectId', classSubjectId as string);
                prev.set('subject', match.subject_name || match.name || match.subjectName || 'Subject');
                prev.set('subjectFilter', match.subject_name || match.name || match.subjectName || 'Subject');
                return prev;
              },
              { replace: true }
            );
          }
        }
      })
      .catch(() => {});

    // Documented API: GET /api/teacher/sections/:sectionId/subjects
    const targetSectionId = sectionIdFromUrl;
    if (targetSectionId) {
      fetch(`${API_BASE_URL}/api/teacher/sections/${targetSectionId}/subjects`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === 'success' && Array.isArray(data.data) && data.data.length > 0) {
            const match = data.data.find((s: any) => s.id === classSubjectId || s.class_subject_id === classSubjectId);
            if (match && match.subject_name) {
              setSubjectName(match.subject_name);
            }
          }
        })
        .catch(() => {});
    }

    fetchAssignments();
  }, [classId, classSubjectId, sectionIdFromUrl, isTeacher]);

  // Review queue requires a deployed paper to match against — fall back if none exist.
  useEffect(() => {
    if (assignments.length === 0 && activeTab !== 'papers') setActiveTab('papers');
  }, [assignments.length, activeTab]);



  const resetDeployFlow = () => {
    setDeployStep(1);
    setPaperTitle('');
    setQuestionPaperFiles([]);
    setAnswerKeyFiles([]);
    setAnswerKeyFileName('');
    setExtractedQuestions([]);
    setExtractedAnswerKeyText('');
    setQuestionPaperUrl('');
    setAnswerKeyUrl('');
    setAssignmentId(null);
    setUploadStatusText('');
    setQuestionUploadPct(null);
    setAnswerKeyUploadPct(null);
  };

  const resolveTeacherSubjectId = async (): Promise<string | null> => {
    const localTs = localStorage.getItem('paatam_active_teacher_subject_id');
    if (localTs) return localTs;

    try {
      const res = await fetch(`${API_BASE_URL}/api/teacher/dashboard`);
      if (!res.ok) return null;
      const data = await res.json().catch(() => ({}));
      const allocations = Array.isArray(data.data?.teaching_allocations) ? data.data.teaching_allocations : [];

      const exact = allocations.find(
        (a: any) =>
          String(a.section_id || '') === String(sectionIdFromUrl || '') &&
          String(a.class_subject_id || '') === String(classSubjectId || '')
      );
      if (exact?.teacher_subject_id) return String(exact.teacher_subject_id);

      const byClassSubject = allocations.find(
        (a: any) => String(a.class_subject_id || '') === String(classSubjectId || '')
      );
      if (byClassSubject?.teacher_subject_id) return String(byClassSubject.teacher_subject_id);
    } catch {
      return null;
    }

    return null;
  };

  // Step 1: Upload question paper to S3 and trigger async AI OCR pipeline
  const handleUploadQuestionPaper = async () => {
    if (!sectionIdFromUrl) {
      alert('A sectionId is required to upload question papers. Open this subject from a section context and retry.');
      return;
    }
    if (!paperTitle.trim()) {
      alert('Enter a title for this question paper.');
      return;
    }
    if (questionPaperFiles.length === 0) {
      alert('Attach the question paper (PDF or image).');
      return;
    }

    setIsUploadingStep(true);
    setQuestionUploadPct(15);
    setUploadStatusText('Requesting secure upload URL...');

    try {
      const qpFile = questionPaperFiles[0];
      let paperUrl = '';

      // 1. Request pre-signed S3 upload URL (POST /api/assignments/upload-urls)
      const urlRes = await fetch(`${API_BASE_URL}/api/assignments/upload-urls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section_id: sectionIdFromUrl,
          files: [
            {
              file_name: qpFile.name,
              file_type: qpFile.type || 'application/pdf',
              purpose: 'question_paper'
            }
          ]
        })
      });

      if (!urlRes.ok) {
        throw new Error(`Failed to get pre-signed upload URL (HTTP ${urlRes.status})`);
      }

      const urlData = await urlRes.json().catch(() => ({}));
      const targetUpload = urlData.data?.uploads?.find((u: any) => u.purpose === 'question_paper') || urlData.data?.uploads?.[0];

      if (!targetUpload?.upload_url || !targetUpload?.file_url) {
        throw new Error('Unable to obtain a valid upload URL for the question paper.');
      }

      // 2. Direct binary upload to S3 (No Bearer authorization header)
      setQuestionUploadPct(40);
      setUploadStatusText('Uploading question paper binary...');

      const putRes = await fetch(targetUpload.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': qpFile.type || 'application/pdf' },
        body: qpFile
      });

      if (!putRes.ok) {
        throw new Error(`Cloud storage upload failed with status ${putRes.status}`);
      }

      paperUrl = targetUpload.file_url;
      setQuestionPaperUrl(paperUrl);
      setQuestionUploadPct(60);
      setUploadStatusText('Queuing async Vision AI OCR extraction...');

      // 3. Trigger Async OCR Pipeline (POST /api/assignments/process-async)
      const teacherSubjectId = await resolveTeacherSubjectId();
      const processRes = await fetch(`${API_BASE_URL}/api/assignments/process-async`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section_id: sectionIdFromUrl,
          class_subject_id: classSubjectId,
          ...(teacherSubjectId ? { teacher_subject_id: teacherSubjectId } : {}),
          title: paperTitle.trim(),
          difficulty: 'Medium',
          duration_minutes: 60,
          submission_mode: 'TEACHER_UPLOAD',
          question_paper_url: paperUrl
        })
      });

      const processData = await processRes.json().catch(() => ({}));
      if (!processRes.ok || processData.status === 'error') {
        throw new Error(processData.message || 'Failed to initialize AI question extraction pipeline.');
      }

      const newAssignmentId = String(processData.data?.assignment_id || processData.assignment_id || '');
      if (!newAssignmentId) {
        throw new Error('Backend did not return an assignment_id.');
      }
      setAssignmentId(newAssignmentId);

      // 4. Poll for AI OCR extraction status (GET /api/assignments/:id/pipeline-status)
      setUploadStatusText('AI is analyzing and extracting questions...');
      let isReady = false;
      let pollAttempts = 0;
      const maxAttempts = 40; // 40 * 3s = 120s timeout

      while (!isReady && pollAttempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        pollAttempts++;

        const statusRes = await fetch(`${API_BASE_URL}/api/assignments/${newAssignmentId}/pipeline-status`);
        if (statusRes.ok) {
          const statusJson = await statusRes.json().catch(() => ({}));
          const pipelineData = statusJson.data || statusJson;
          const currentStatus = pipelineData.pipeline_status || pipelineData.status;

          if (currentStatus === 'ready') {
            isReady = true;
            const questions = Array.isArray(pipelineData.questions_json) ? pipelineData.questions_json : [];
            setExtractedQuestions(questions);
            setQuestionUploadPct(100);
            setDeployStep(2);
          } else if (currentStatus === 'failed') {
            throw new Error(pipelineData.message || 'AI question extraction failed. Please ensure the PDF or image is clear and readable.');
          } else {
            // Still processing: incrementally increase progress between 60% and 95%
            setQuestionUploadPct(Math.min(60 + pollAttempts * 2, 95));
            if (pipelineData.message) {
              setUploadStatusText(pipelineData.message);
            }
          }
        }
      }

      if (!isReady) {
        throw new Error('Question paper extraction timed out. Please check the review queue.');
      }
    } catch (err: any) {
      console.error('Question paper upload/OCR error:', err);
      alert(err.message || 'Error processing question paper.');
    } finally {
      setIsUploadingStep(false);
      setQuestionUploadPct(null);
      setUploadStatusText('');
    }
  };

  // Step 2: Upload answer key (or skip it), then unlock the review/deploy step.
  const handleUploadAnswerKey = async () => {
    if (!sectionIdFromUrl) {
      alert('A sectionId is required to upload answer keys. Open this subject from a section context and retry.');
      return;
    }
    if (answerKeyFiles.length === 0) {
      if (answerKeyUrl) {
        setDeployStep(3);
        return;
      }
      alert('Attach the answer key, or use Skip.');
      return;
    }
    setIsUploadingStep(true);
    setAnswerKeyUploadPct(25);
    setUploadStatusText('Requesting upload URL for answer key...');
    try {
      const akFile = answerKeyFiles[0];
      setAnswerKeyFileName(akFile.name);
      let keyUrl = '';

      // Try documented S3 pre-signed upload URL (POST /api/assignments/upload-urls)
      try {
        const urlRes = await fetch(`${API_BASE_URL}/api/assignments/upload-urls`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            section_id: sectionIdFromUrl,
            files: [
              {
                file_name: akFile.name,
                file_type: akFile.type || 'application/pdf',
                purpose: 'answer_key'
              }
            ]
          })
        });

        if (urlRes.ok) {
          const urlData = await urlRes.json().catch(() => ({}));
          const targetUpload =
            urlData.data?.uploads?.find((u: any) => u.purpose === 'answer_key') ||
            urlData.data?.uploads?.[0] ||
            urlData.uploads?.[0];

          if (targetUpload?.upload_url) {
            const fileUrl =
              targetUpload.file_url ||
              targetUpload.fileUrl ||
              targetUpload.upload_url.split('?')[0];

            setAnswerKeyUploadPct(65);
            setUploadStatusText('Uploading answer key to cloud storage...');
            const putRes = await fetch(targetUpload.upload_url, {
              method: 'PUT',
              headers: { 'Content-Type': akFile.type || 'application/pdf' },
              body: akFile
            });
            if (!putRes.ok) {
              throw new Error(`Answer key upload failed with status ${putRes.status}`);
            }
            keyUrl = fileUrl;
          }
        }
      } catch (e: any) {
        console.warn('S3 answer key upload failed:', e);
        throw e;
      }

      if (!keyUrl) {
        throw new Error('Unable to get valid upload URL for answer key.');
      }

      setAnswerKeyUploadPct(100);
      setAnswerKeyUrl(keyUrl);
      setExtractedAnswerKeyText('');
      setDeployStep(3);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error processing answer key.');
    } finally {
      setIsUploadingStep(false);
      setAnswerKeyUploadPct(null);
      setUploadStatusText('');
    }
  };

  const handleSkipAnswerKey = () => {
    const proceed = window.confirm('No answer key will be attached. Grading accuracy will rely only on the subject knowledge base. Continue?');
    if (!proceed) return;
    setAnswerKeyFiles([]);
    setAnswerKeyFileName('');
    setExtractedAnswerKeyText('');
    setAnswerKeyUrl('');
    setDeployStep(3);
  };

  // Step 3: Enqueue or create assignment via documented endpoints
  const handleFinalizeDeploy = async () => {
    if (!sectionIdFromUrl) {
      alert('A sectionId is required to deploy this paper. Open the subject from a section context and retry.');
      return;
    }
    if (!classSubjectId) {
      alert('A classSubjectId is required to deploy this paper. Please reopen this subject and try again.');
      return;
    }
    if (!questionPaperUrl) {
      alert('Question paper upload URL is missing. Please re-upload the question paper.');
      return;
    }

    setIsFinalizing(true);
    try {
      const teacherSubjectId = await resolveTeacherSubjectId();
      const basePayload = {
        ...(assignmentId ? { assignment_id: assignmentId } : {}),
        section_id: sectionIdFromUrl,
        class_subject_id: classSubjectId,
        ...(teacherSubjectId ? { teacher_subject_id: teacherSubjectId } : {}),
        title: paperTitle.trim(),
        difficulty: 'Medium',
        duration_minutes: 60,
        question_paper_url: questionPaperUrl,
        ...(answerKeyUrl ? { answer_key_url: answerKeyUrl } : {}),
        ...(extractedAnswerKeyText ? { answer_key_text: extractedAnswerKeyText } : {}),
        questions_json: extractedQuestions,
        submission_mode: 'TEACHER_UPLOAD',
        status: 'published'
      };

      // 1. Direct publish (documented POST /api/assignments) for immediate paper availability
      let success = false;
      let errorMessage = '';
      let createdAssignmentId: string | null = null;
      try {
        const publishRes = await fetch(`${API_BASE_URL}/api/assignments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(basePayload)
        });
        const publishData = await publishRes.json().catch(() => ({}));
        if (publishRes.ok) {
          if (publishData.status === 'success' || publishData.success) {
            success = true;
            createdAssignmentId = String(publishData.data?.id || publishData.data?.assignment_id || publishData.id || '');
          }
        } else {
          errorMessage = publishData.message || `Assignment publish failed (HTTP ${publishRes.status}).`;
        }
      } catch (err: any) {
        errorMessage = err?.message || 'Assignment publish request failed.';
      }

      // 2. Fallback: create-sync then publish
      if (!success) {
        const syncRes = await fetch(`${API_BASE_URL}/api/assignments/create-sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(basePayload)
        });
        const syncData = await syncRes.json().catch(() => ({}));
        if (syncRes.ok && (syncData.status === 'success' || syncData.success)) {
          createdAssignmentId = String(syncData.data?.id || syncData.data?.assignment_id || '');
          const publishRes = await fetch(`${API_BASE_URL}/api/assignments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              assignment_id: createdAssignmentId || assignmentId,
              ...basePayload,
              due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
            })
          });
          const publishData = await publishRes.json().catch(() => ({}));
          if (publishRes.ok && (publishData.status === 'success' || publishData.success)) {
            success = true;
          } else {
            errorMessage = publishData.message || `Assignment publish failed (HTTP ${publishRes.status}).`;
          }
        } else {
          errorMessage = syncData.message || `Assignment sync create failed (HTTP ${syncRes.status}).`;
        }
      }

      if (!success) {
        throw new Error(errorMessage || 'Could not deploy question paper.');
      }

      const finalAssignmentId = assignmentId || createdAssignmentId;
      if (finalAssignmentId) {
        setAssignments((prev) => {
          const exists = prev.some((a) => String(a.id) === String(finalAssignmentId));
          if (exists) return prev;
          return [
            {
              id: finalAssignmentId,
              title: paperTitle.trim(),
              className: className || '',
              subject: subjectName || '',
              status: 'published',
              questions: extractedQuestions,
              answerKeyUrl: answerKeyUrl,
              answerKeyText: extractedAnswerKeyText
            },
            ...prev
          ];
        });
      }

      fetchAssignments();
      alert(`✅ Question paper "${paperTitle}" deployed successfully.`);
      resetDeployFlow();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error deploying question paper.');
    } finally {
      setIsFinalizing(false);
    }
  };

  const [deletingPaperId, setDeletingPaperId] = useState<string | null>(null);

  const handleDeletePaper = async (paperId: string, paperTitle: string) => {
    const displayTitle = (paperTitle || '').trim() || 'this question paper';
    if (!window.confirm(`Are you sure you want to delete "${displayTitle}"? This will remove the question paper.`)) {
      return;
    }

    setDeletingPaperId(paperId);
    try {
      try {
        const existingRaw = localStorage.getItem('smartstudy_saved_exam_papers');
        if (existingRaw) {
          const existing = JSON.parse(existingRaw);
          const updated = existing.filter((p: any) => p.id !== paperId);
          localStorage.setItem('smartstudy_saved_exam_papers', JSON.stringify(updated));
        }
      } catch (e) {}

      const res = await fetch(`${API_BASE_URL}/api/assignments/${paperId}`, {
        method: 'DELETE'
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data.success !== false)) {
        setAssignments((prev) => prev.filter((a) => a.id !== paperId));
      } else {
        alert(data.message || 'Failed to delete question paper.');
      }
    } catch (err: any) {
      console.error('Delete paper error:', err);
      alert('Error deleting question paper: ' + (err.message || 'Network error'));
    } finally {
      setDeletingPaperId(null);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <header className="page-top-bar no-print">
        <div className="page-top-bar-text">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/classes/${classId}`)} style={{ marginBottom: '0.5rem' }}>
            <ArrowLeft className="size-4" />
            <span>{className || 'Back to class'}</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
            <h1 style={{ margin: 0 }}>{subjectName || 'Subject'}</h1>
            {className && (
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '2px 10px',
                  borderRadius: '9999px',
                  background: '#EFF6FF',
                  color: '#1D4ED8',
                  border: '1px solid #BFDBFE'
                }}
              >
                {className}
              </span>
            )}
          </div>
          <p>Deploy question papers with an answer key, then scan and grade student scripts against them</p>
        </div>
        <div className="page-top-bar-actions" style={{ display: 'flex', gap: '8px' }}>
          <button 
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsPipelineModalOpen(true)}
            title="Deploy Question Paper via 2-Phase Vision AI Pipeline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <CloudUpload className="size-4 text-blue-600" />
            <span>Deploy via Vision AI</span>
          </button>
          <button 
            type="button"
            className="btn btn-primary"
            onClick={() => navigate(`/generator?classId=${classId}&classSubjectId=${classSubjectId}&subject=${encodeURIComponent(subjectName)}&className=${encodeURIComponent(className)}`)}
            title="Generate question paper for this subject"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Sparkles className="size-4" />
            <span>Generate Paper with AI</span>
          </button>
        </div>
      </header>

      <div className="page-container">
        {/* Sub-navigation tabs, scoped to this class + subject */}
        <div style={{ display: 'flex', gap: '0.35rem', background: '#F1F5F9', padding: '0.25rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', marginBottom: '1.25rem', width: 'fit-content' }}>
          <button
            onClick={() => setActiveTab('papers')}
            className={`btn btn-sm ${activeTab === 'papers' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <FileText className="size-4" />
            <span>Question papers</span>
          </button>
          <button
            onClick={() => assignments.length > 0 && setActiveTab('queue')}
            className={`btn btn-sm ${activeTab === 'queue' ? 'btn-primary' : 'btn-secondary'}`}
            disabled={assignments.length === 0}
            title={assignments.length === 0 ? 'Deploy a question paper first' : undefined}
            style={assignments.length === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
          >
            <FileStack className="size-4" />
            <span>Review queue</span>
          </button>
        </div>

        {activeTab === 'papers' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
            <div className="m-card">
              <div className="m-card-header">
                <h3 className="m-card-title">Deploy a question paper</h3>
              </div>

              <DeployStepper step={deployStep} />

              {deployStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Paper title</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Physics Mid-term 2026"
                      value={paperTitle}
                      onChange={(e) => setPaperTitle(e.target.value)}
                      disabled={isUploadingStep}
                    />
                  </div>

                  <FileDropField
                    label="Question paper (PDF or image)"
                    files={questionPaperFiles}
                    onChange={setQuestionPaperFiles}
                    inputId="question-paper-input"
                    disabled={isUploadingStep}
                  />
                  {questionUploadPct !== null && <UploadProgressBar label={uploadStatusText || "Question paper"} pct={questionUploadPct} />}

                  <button className="btn btn-primary" onClick={handleUploadQuestionPaper} disabled={isUploadingStep} style={{ width: '100%', padding: '0.75rem' }}>
                    <Send className="size-4" />
                    <span>
                      {isUploadingStep
                        ? (uploadStatusText
                            ? `${uploadStatusText} (${questionUploadPct ?? 0}%)`
                            : (questionUploadPct !== null && questionUploadPct < 100
                                ? `Uploading… ${questionUploadPct}%`
                                : 'Processing…'))
                        : 'Upload & continue'}
                    </span>
                  </button>
                </div>
              )}

              {deployStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ padding: '0.6rem 0.85rem', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '0.5rem', fontSize: '0.8125rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CheckCircle2 className="size-4 shrink-0" />
                    <span>Question paper uploaded — {extractedQuestions.length} question(s) detected.</span>
                  </div>

                  {answerKeyUrl && (
                    <div style={{ padding: '0.6rem 0.85rem', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '0.5rem', fontSize: '0.8125rem', color: '#1E40AF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
                        <CheckCircle2 className="size-4 shrink-0 text-blue-600" />
                        <span style={{ fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          Answer key attached: {answerKeyFileName || 'Answer Key PDF'}
                        </span>
                      </div>
                      <a href={answerKeyUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: '#2563EB', textDecoration: 'underline', whiteSpace: 'nowrap', fontWeight: 600 }}>
                        View PDF
                      </a>
                    </div>
                  )}

                  <FileDropField
                    label={answerKeyUrl ? "Replace answer key / marking scheme (PDF or image)" : "Answer key / marking scheme (PDF or image)"}
                    files={answerKeyFiles}
                    onChange={(files) => {
                      setAnswerKeyFiles(files);
                      if (files.length > 0) setAnswerKeyFileName(files[0].name);
                    }}
                    inputId="answer-key-input"
                    disabled={isUploadingStep}
                  />
                  {answerKeyUploadPct !== null && <UploadProgressBar label={uploadStatusText || "Answer key"} pct={answerKeyUploadPct} />}
                  <p style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '-0.5rem' }}>
                    Used only to grade scanned answer sheets against this paper — never shown to students or teachers.
                  </p>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" onClick={() => setDeployStep(1)} disabled={isUploadingStep}>
                      <span>← Back</span>
                    </button>
                    <button className="btn btn-secondary" onClick={handleSkipAnswerKey} disabled={isUploadingStep}>
                      <span>Skip</span>
                    </button>
                    <button className="btn btn-primary" onClick={handleUploadAnswerKey} disabled={isUploadingStep} style={{ flex: 1 }}>
                      <Send className="size-4" />
                      <span>
                        {isUploadingStep
                          ? (answerKeyUploadPct !== null && answerKeyUploadPct < 100
                              ? `Uploading… ${answerKeyUploadPct}%`
                              : 'Processing…')
                          : (answerKeyUrl && answerKeyFiles.length === 0 ? 'Continue with attached key' : 'Upload & continue')}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {deployStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ padding: '0.85rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '0.5rem' }}>
                    <div style={{ fontWeight: 700, color: '#111827', marginBottom: '0.5rem', fontSize: '1rem' }}>{paperTitle}</div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      <div style={{ fontSize: '0.8125rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                        <span><strong>{extractedQuestions.length}</strong> question(s) extracted from question paper booklet</span>
                      </div>

                      {(answerKeyUrl || extractedAnswerKeyText) ? (
                        <div style={{ fontSize: '0.8125rem', color: '#1E40AF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '0.375rem', padding: '0.45rem 0.65rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflow: 'hidden' }}>
                            <CheckCircle2 className="size-4 text-blue-600 shrink-0" />
                            <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              Answer key attached{answerKeyFileName ? `: ${answerKeyFileName}` : ''}
                            </span>
                          </div>
                          {answerKeyUrl && (
                            <a href={answerKeyUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: '#2563EB', textDecoration: 'underline', whiteSpace: 'nowrap', marginLeft: '0.5rem', fontWeight: 600 }}>
                              View Key PDF
                            </a>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.8125rem', color: '#92400E', display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '0.375rem', padding: '0.45rem 0.65rem' }}>
                          <span>⚠️ No answer key attached — standard rubric & subject knowledge base will be used.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" onClick={() => setDeployStep(2)} disabled={isFinalizing}>
                      <span>← Back</span>
                    </button>
                    <button className="btn btn-primary" onClick={handleFinalizeDeploy} disabled={isFinalizing} style={{ flex: 1, padding: '0.75rem' }}>
                      <Send className="size-4" />
                      <span>{isFinalizing ? 'Deploying…' : 'Deploy paper to this class'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="m-card">
              <div className="m-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="m-card-title">Subject Question Papers ({assignments.length})</h3>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => navigate(`/generator?classId=${classId}&classSubjectId=${classSubjectId}&subject=${encodeURIComponent(subjectName)}&className=${encodeURIComponent(className)}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}
                >
                  <Plus className="size-3.5" />
                  <span>New Paper</span>
                </button>
              </div>
              {assignments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748B' }}>
                  <FileText className="size-8 text-slate-300 mx-auto" style={{ margin: '0 auto 0.5rem auto' }} />
                  <p style={{ fontWeight: 600, color: '#334155', margin: 0 }}>No question papers created or deployed yet.</p>
                  <p style={{ fontSize: '0.8125rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                    Generate an aligned board paper using AI, or deploy your scanned question paper on the left.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate(`/generator?classId=${classId}&classSubjectId=${classSubjectId}&subject=${encodeURIComponent(subjectName)}&className=${encodeURIComponent(className)}`)}
                    style={{ marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Sparkles className="size-3.5" />
                    <span>Generate Question Paper with AI</span>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {assignments.map((a) => {
                    const qCount = (a.questions || []).length;
                    const marks = (a.questions || []).reduce((s: number, q: any) => s + (Number(q.marks) || 1), 0);
                    const isDispatched = a.status === 'dispatched';

                    return (
                      <div
                        key={a.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                          padding: '0.75rem 1rem',
                          background: '#FFFFFF',
                          borderRadius: '0.5rem',
                          border: '1px solid #E2E8F0',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.925rem', color: '#111827' }}>{a.title}</div>
                            <span style={{ 
                              fontSize: '0.68rem', 
                              fontWeight: 700, 
                              padding: '0.1rem 0.45rem', 
                              borderRadius: '0.25rem',
                              background: isDispatched ? '#DCFCE7' : '#FEF3C7',
                              color: isDispatched ? '#166534' : '#92400E',
                              border: isDispatched ? '1px solid #BBF7D0' : '1px solid #FDE68A'
                            }}>
                              {isDispatched ? 'Dispatched' : 'Saved Draft'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>
                            {qCount} question(s) • {marks} Total Marks • {(a.answerKeyText || a.answerKeyUrl) ? 'Answer key attached' : 'Standard rubric'}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            title="Edit or review in Question Paper Generator"
                            onClick={() => navigate(`/generator?classId=${classId}&classSubjectId=${classSubjectId}&subject=${encodeURIComponent(subjectName)}&paperId=${a.id}`)}
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            <Edit3 className="size-3 text-blue-600" />
                            <span>Edit Paper</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            title="Open paper details and grading queue"
                            onClick={() => navigate(`/papers/${a.id}?classId=${classId}&classSubjectId=${classSubjectId}&sectionId=${encodeURIComponent(sectionIdFromUrl)}&subject=${encodeURIComponent(subjectName)}`)}
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            <span>Open & Grade</span>
                            <ChevronRight className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            title="Delete question paper"
                            onClick={() => handleDeletePaper(a.id, a.title)}
                            disabled={deletingPaperId === a.id}
                            style={{
                              padding: '0.35rem 0.55rem',
                              fontSize: '0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              borderColor: '#FECDD3',
                              color: '#E11D48',
                              background: '#FFF1F2'
                            }}
                          >
                            <Trash2 className="size-3 text-rose-600" />
                            <span>{deletingPaperId === a.id ? 'Deleting…' : 'Delete'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'queue' && (
          <div style={{ margin: '-1.5rem -2rem' }}>
            <ReviewQueue onScanScript={() => setActiveTab('papers')} />
          </div>
        )}
      </div>

      <AssignmentPipelineModal
        isOpen={isPipelineModalOpen}
        onClose={() => setIsPipelineModalOpen(false)}
        sectionId={sectionIdFromUrl || '601'}
        classSubjectId={classSubjectId || '801'}
        defaultTitle={`${subjectName || 'Subject'} Unit Assessment`}
        onSuccess={() => {
          fetchAssignments();
        }}
      />
    </div>
  );
}

function DeployStepper({ step }: { step: 1 | 2 | 3 }) {
  const steps: Array<{ n: 1 | 2 | 3; label: string }> = [
    { n: 1, label: 'Question paper' },
    { n: 2, label: 'Answer key' },
    { n: 3, label: 'Review & deploy' }
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.25rem' }}>
      {steps.map((s, i) => (
        <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : '0 0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div
              style={{
                width: '1.6rem',
                height: '1.6rem',
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
                flexShrink: 0,
                background: step > s.n ? '#22C55E' : step === s.n ? '#2563EB' : '#E2E8F0',
                color: step >= s.n ? 'white' : '#64748B'
              }}
            >
              {step > s.n ? '✓' : s.n}
            </div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: step === s.n ? '#111827' : '#94A3B8', whiteSpace: 'nowrap' }}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: '2px', background: step > s.n ? '#22C55E' : '#E2E8F0', margin: '0 0.75rem' }} />
          )}
        </div>
      ))}
    </div>
  );
}

function UploadProgressBar({ label, pct }: { label: string; pct: number }) {
  const isProcessing = pct >= 100;
  return (
    <div style={{ marginTop: '-0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748B', marginBottom: '0.25rem' }}>
        <span>{label} {isProcessing ? '— processing on server…' : 'upload'}</span>
        <span>{isProcessing ? '' : `${pct}%`}</span>
      </div>
      <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '9999px', overflow: 'hidden' }}>
        <div
          className={isProcessing ? 'upload-bar-processing' : undefined}
          style={{ width: `${pct}%`, height: '100%', background: '#2563EB', borderRadius: '9999px', transition: 'width 0.2s ease' }}
        />
      </div>
    </div>
  );
}

function FileDropField({
  label,
  files,
  onChange,
  inputId,
  disabled
}: {
  label: string;
  files: File[];
  onChange: (files: File[]) => void;
  inputId: string;
  disabled?: boolean;
}) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div
        className="scan-dropzone"
        style={{ padding: '1rem', cursor: disabled ? 'wait' : 'pointer' }}
        onClick={() => !disabled && document.getElementById(inputId)?.click()}
      >
        <input
          id={inputId}
          type="file"
          accept="image/*,.pdf,application/pdf"
          multiple
          style={{ display: 'none' }}
          disabled={disabled}
          onChange={(e) => e.target.files && onChange(Array.from(e.target.files))}
        />
        {files.length === 0 ? (
          <>
            <Upload className="size-5 text-blue-600" />
            <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: 0 }}>Click to attach (JPG, PNG, WEBP or PDF)</p>
          </>
        ) : (
          <>
            <CheckCircle2 className="size-5 text-emerald-500" />
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#111827', margin: 0 }}>
              {files.length} file{files.length > 1 ? 's' : ''} attached
            </p>
          </>
        )}
      </div>
      {files.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.5rem' }}>
          {files.map((f, i) => (
            <span key={i} className="badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              {f.name}
              <X
                className="size-3"
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(files.filter((_, idx) => idx !== i));
                }}
              />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
