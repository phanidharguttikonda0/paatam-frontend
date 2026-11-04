import React, { useState, useEffect } from 'react';
import {
  X,
  CloudUpload,
  Sparkles,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Layers,
  Cpu,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  Users,
  Printer
} from 'lucide-react';
import { API_BASE_URL, getPresignedUploadUrls, uploadBinaryToS3 } from '../config/api';

export interface ExtractedQuestion {
  question_number: number;
  question: string;
  type: 'mcq' | 'subjective';
  marks: number;
  options?: string[];
}

interface AssignmentPipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionId?: string;
  classSubjectId?: string;
  defaultTitle?: string;
  onSuccess?: (assignmentId: string) => void;
}

export default function AssignmentPipelineModal({
  isOpen,
  onClose,
  sectionId = '701',
  classSubjectId = '1101',
  defaultTitle = '',
  onSuccess
}: AssignmentPipelineModalProps) {
  const [activeTab, setActiveTab] = useState<'async_s3' | 'sync_manual'>('async_s3');

  // Common Form Fields
  const [title, setTitle] = useState(defaultTitle || 'Grade 10 Physics Midterm');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [durationMinutes, setDurationMinutes] = useState(60);

  // Phase Tracking for Async Flow:
  // 'phase1_upload' -> 'phase1_extracting' -> 'phase2_review' -> 'published'
  const [phase, setPhase] = useState<'phase1_upload' | 'phase1_extracting' | 'phase2_review' | 'published'>('phase1_upload');

  // Phase 1: Question Paper S3 Upload & Async Extraction
  const [qpFile, setQpFile] = useState<File | null>(null);
  const [qpFileUrl, setQpFileUrl] = useState<string>('');
  const [assignmentId, setAssignmentId] = useState<string>('');
  const [pipelineStatus, setPipelineStatus] = useState<string>('idle');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [reasoningModel, setReasoningModel] = useState<string>('gemini-2.5-flash');

  // Phase 2: Review, Submission Mode, Answer Key & Publish
  const [questions, setQuestions] = useState<ExtractedQuestion[]>([]);
  const [submissionMode, setSubmissionMode] = useState<'STUDENT_UPLOAD' | 'TEACHER_UPLOAD'>('TEACHER_UPLOAD');
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 16);
  });
  const [answerKeyMode, setAnswerKeyMode] = useState<'text' | 'file' | 'none'>('text');
  const [akText, setAkText] = useState<string>('');
  const [akFile, setAkFile] = useState<File | null>(null);
  const [akFileUrl, setAkFileUrl] = useState<string>('');
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  // Sync Manual Creation State
  const [manualQuestions, setManualQuestions] = useState<Array<{ question_number: number; question_text: string; max_marks: number }>>([
    { question_number: 1, question_text: 'Define Newton’s Second Law of Motion with mathematical derivation.', max_marks: 5 },
    { question_number: 2, question_text: 'Calculate the acceleration of a 1200 kg car with 3600 N applied force.', max_marks: 5 }
  ]);
  const [isSubmittingSync, setIsSubmittingSync] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      if (defaultTitle) setTitle(defaultTitle);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, defaultTitle]);

  // Phase 1.4: Polling Question Paper Extraction Pipeline
  useEffect(() => {
    let interval: any = null;
    if (phase === 'phase1_extracting' && assignmentId) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/assignments/${assignmentId}/pipeline-status`);
          if (res.ok) {
            const result = await res.json();
            const data = result.data || result;
            const currentStatus = data.pipeline_status || data.status;

            if (data.progress_percent !== undefined) {
              setProgressPercent(data.progress_percent);
            }
            if (data.message) {
              setStatusMessage(data.message);
            }

            if (currentStatus === 'ready') {
              clearInterval(interval);
              setPipelineStatus('ready');
              setProgressPercent(100);
              setStatusMessage('Extraction completed successfully!');
              if (data.reasoning_model_selected) {
                setReasoningModel(data.reasoning_model_selected);
              }
              const extracted: ExtractedQuestion[] = data.questions_json || [];
              if (extracted.length > 0) {
                setQuestions(extracted);
              } else {
                setQuestions([
                  {
                    question_number: 1,
                    question: 'State and explain the fundamental law described in the paper.',
                    type: 'subjective',
                    marks: 5,
                    options: []
                  }
                ]);
              }
              // Move to Phase 2: Review and Answer Key binding
              setPhase('phase2_review');
            } else if (currentStatus === 'failed') {
              clearInterval(interval);
              setPipelineStatus('failed');
              setErrorMsg(data.message || 'Question paper extraction failed. Please retry.');
              setPhase('phase1_upload');
            } else {
              setPipelineStatus(currentStatus || 'ocr_processing');
            }
          }
        } catch {
          // Keep polling on transient network drops
        }
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [phase, assignmentId]);

  if (!isOpen) return null;

  // -------------------------------------------------------------
  // PHASE 1: S3 Upload & Async Vision AI Extraction
  // -------------------------------------------------------------
  const handleStartExtraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please specify an assignment title.');
      return;
    }
    if (!qpFile) {
      setErrorMsg('Please select a Question Paper file (PDF or image).');
      return;
    }

    setErrorMsg('');
    setPhase('phase1_extracting');
    setPipelineStatus('requesting_s3_url');
    setProgressPercent(10);
    setStatusMessage('Step 1.1: Requesting pre-signed S3 URL for Question Paper...');

    try {
      // Step 1.1: Request Pre-signed S3 URL for Question Paper
      const uploads = await getPresignedUploadUrls(sectionId, [
        {
          file_name: qpFile.name,
          file_type: qpFile.type || 'application/pdf',
          purpose: 'question_paper'
        }
      ]);

      const qpUpload = uploads.find((u) => u.purpose === 'question_paper') || uploads[0];
      if (!qpUpload || !qpUpload.upload_url) {
        throw new Error('Failed to obtain S3 pre-signed upload URL for question paper.');
      }

      // Step 1.2: Direct Browser Binary Upload to S3 (No Authorization header)
      setStatusMessage('Step 1.2: Uploading question paper binary directly to S3...');
      setProgressPercent(25);
      await uploadBinaryToS3(qpUpload.upload_url, qpFile);

      const uploadedUrl = qpUpload.file_url || qpUpload.upload_url.split('?')[0];
      setQpFileUrl(uploadedUrl);

      // Step 1.3: Start Async Vision AI Extraction (NO Answer Key at this phase)
      setStatusMessage('Step 1.3: Queuing async Vision AI OCR and dynamic model routing...');
      setProgressPercent(40);

      const processRes = await fetch(`${API_BASE_URL}/api/assignments/process-async`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section_id: String(sectionId),
          class_subject_id: String(classSubjectId),
          title: title.trim(),
          difficulty,
          duration_minutes: durationMinutes,
          question_paper_url: uploadedUrl
        })
      });

      const processData = await processRes.json().catch(() => ({}));
      if (!processRes.ok || processData.status === 'error') {
        throw new Error(processData.message || 'Failed to initialize OCR extraction pipeline.');
      }

      const assignedId = processData.data?.assignment_id || processData.assignment_id;
      if (!assignedId) {
        throw new Error('Backend did not return an assignment_id.');
      }

      setAssignmentId(String(assignedId));
      setPipelineStatus('ocr_processing');
      setStatusMessage('Step 1.4: Extracting questions from uploaded PDF...');
      setProgressPercent(45);
    } catch (err: any) {
      console.error('Extraction flow error:', err);
      setErrorMsg(err.message || 'Failed to start question paper extraction.');
      setPhase('phase1_upload');
    }
  };

  // -------------------------------------------------------------
  // PHASE 2: Final Publish (Answer Key Binding + Submission Mode)
  // -------------------------------------------------------------
  const handleFinalPublish = async () => {
    if (questions.length === 0) {
      setErrorMsg('Assignment must have at least 1 question.');
      return;
    }

    setIsPublishing(true);
    setErrorMsg('');

    try {
      let finalAkUrl = akFileUrl;

      // If teacher attached an Answer Key file and hasn't uploaded it yet
      if (answerKeyMode === 'file' && akFile && !finalAkUrl) {
        setStatusMessage('Uploading Answer Key to S3...');
        const akUploads = await getPresignedUploadUrls(sectionId, [
          {
            file_name: akFile.name,
            file_type: akFile.type || 'application/pdf',
            purpose: 'answer_key'
          }
        ]);
        const akUpload = akUploads.find((u) => u.purpose === 'answer_key') || akUploads[0];
        if (akUpload && akUpload.upload_url) {
          await uploadBinaryToS3(akUpload.upload_url, akFile);
          finalAkUrl = akUpload.file_url || akUpload.upload_url.split('?')[0];
          setAkFileUrl(finalAkUrl);
        }
      }

      // Step 2.1: Final Publish
      const publishPayload: any = {
        assignment_id: assignmentId,
        section_id: String(sectionId),
        class_subject_id: String(classSubjectId),
        title: title.trim(),
        difficulty,
        duration_minutes: durationMinutes,
        due_date: new Date(dueDate).toISOString(),
        submission_mode: submissionMode,
        status: 'published',
        reasoning_model: reasoningModel,
        question_paper_url: qpFileUrl,
        questions_json: questions
      };

      if (finalAkUrl) {
        publishPayload.answer_key_url = finalAkUrl;
      }
      if (akText.trim()) {
        publishPayload.answer_key_text = akText.trim();
      }

      const publishRes = await fetch(`${API_BASE_URL}/api/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(publishPayload)
      });

      const publishData = await publishRes.json().catch(() => ({}));
      if (!publishRes.ok || publishData.status === 'error') {
        throw new Error(publishData.message || 'Failed to publish assignment.');
      }

      setPhase('published');
      setSuccessMsg(`Assignment "${title}" published successfully! Mode: ${submissionMode}`);
      if (onSuccess) {
        onSuccess(assignmentId);
      }
      setTimeout(() => {
        onClose();
      }, 1600);
    } catch (err: any) {
      console.error('Publish error:', err);
      setErrorMsg(err.message || 'Failed to publish assignment.');
    } finally {
      setIsPublishing(false);
    }
  };

  // -------------------------------------------------------------
  // Question Manipulation Helpers
  // -------------------------------------------------------------
  const handleUpdateQuestion = (index: number, updated: Partial<ExtractedQuestion>) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...updated } : q))
    );
  };

  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        question_number: prev.length + 1,
        question: '',
        type: 'subjective',
        marks: 5,
        options: []
      }
    ]);
  };

  const handleDeleteQuestion = (index: number) => {
    setQuestions((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((q, i) => ({ ...q, question_number: i + 1 }))
    );
  };

  const handleAddOption = (qIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        const currentOptions = q.options || [];
        return {
          ...q,
          options: [...currentOptions, `Option ${currentOptions.length + 1}`]
        };
      })
    );
  };

  const handleUpdateOption = (qIndex: number, optIndex: number, text: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        const opts = [...(q.options || [])];
        opts[optIndex] = text;
        return { ...q, options: opts };
      })
    );
  };

  const handleDeleteOption = (qIndex: number, optIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        return {
          ...q,
          options: (q.options || []).filter((_, oi) => oi !== optIndex)
        };
      })
    );
  };

  // -------------------------------------------------------------
  // Sync Manual Alternative
  // -------------------------------------------------------------
  const handleCreateSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please specify an assignment title.');
      return;
    }
    if (manualQuestions.length === 0) {
      setErrorMsg('Please add at least one question.');
      return;
    }

    setIsSubmittingSync(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/assignments/create-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section_id: sectionId,
          class_subject_id: classSubjectId,
          title: title.trim(),
          difficulty,
          duration_minutes: durationMinutes,
          submission_mode: submissionMode,
          questions: manualQuestions
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok || data.status === 'success' || data.success) {
        setSuccessMsg(`"${title}" created synchronously (${manualQuestions.length} questions).`);
        setTimeout(() => {
          onClose();
          if (onSuccess) onSuccess(data.data?.id || data.id);
        }, 1500);
      } else {
        setErrorMsg(data.message || 'Error deploying assignment synchronously.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating synchronous assignment.');
    } finally {
      setIsSubmittingSync(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <CloudUpload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {phase === 'phase2_review' ? 'Phase 2: Review Questions & Publish' : 'Phase 1: Question Paper AI Extraction'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {phase === 'phase2_review'
                  ? 'Verify extracted questions, bind answer key, and select exam mode.'
                  : 'Async Vision AI extracts questions from your QP booklet without an answer key upfront.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Phase Stepper (when using Async S3) */}
        {activeTab === 'async_s3' && (
          <div className="px-6 py-2.5 bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-semibold">
            <div className={`flex items-center gap-2 ${phase === 'phase1_upload' || phase === 'phase1_extracting' ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-emerald-600'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${phase === 'phase2_review' || phase === 'published' ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'}`}>
                1
              </span>
              <span>Question Paper Extraction (No Answer Key)</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            <div className={`flex items-center gap-2 ${phase === 'phase2_review' ? 'text-blue-600 dark:text-blue-400 font-bold' : phase === 'published' ? 'text-emerald-600' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${phase === 'phase2_review' ? 'bg-blue-600 text-white' : phase === 'published' ? 'bg-emerald-500 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                2
              </span>
              <span>Review, Answer Key & Publish</span>
            </div>
          </div>
        )}

        {/* Mode Selector Tabs (only during initial setup) */}
        {phase === 'phase1_upload' && (
          <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 pt-2 shrink-0 bg-slate-50/30 dark:bg-slate-900/30">
            <button
              type="button"
              onClick={() => { setActiveTab('async_s3'); setErrorMsg(''); }}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'async_s3'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Vision AI Extraction (Recommended)</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('sync_manual'); setErrorMsg(''); }}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'sync_manual'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Manual Entry</span>
            </button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-900">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3 text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-900">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* PHASE 1: UPLOAD QUESTION PAPER ONLY                      */}
          {/* ========================================================= */}
          {activeTab === 'async_s3' && phase === 'phase1_upload' && (
            <form onSubmit={handleStartExtraction} className="space-y-4">
              {/* Common Meta Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assignment Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Grade 10 Physics Midterm"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Duration (Min)
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      min={10}
                      max={240}
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Single Question Paper Dropzone (Architectural Rule: No Answer Key at this phase) */}
              <div className="p-6 border-2 border-dashed border-blue-300 dark:border-blue-900/60 rounded-2xl bg-blue-50/30 dark:bg-blue-950/20 text-center">
                <FileText className="w-10 h-10 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Attach Question Paper (PDF / Image)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  Only the question paper is needed now. The AI Vision model will extract questions and marks first so you can inspect them before adding an Answer Key.
                </p>
                <div className="mt-4 flex flex-col items-center">
                  <label className="cursor-pointer px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all">
                    <span>{qpFile ? `Selected: ${qpFile.name}` : 'Browse Question Paper File'}</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => e.target.files && setQpFile(e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                  {qpFile && (
                    <span className="text-[11px] text-blue-600 font-semibold mt-2">
                      Ready to upload: {(qpFile.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={!qpFile}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow text-sm transition-all disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>Start Async Vision AI Extraction</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* ========================================================= */}
          {/* PHASE 1: EXTRACTING / POLLING SCREEN                      */}
          {/* ========================================================= */}
          {activeTab === 'async_s3' && phase === 'phase1_extracting' && (
            <div className="py-8 px-4 text-center space-y-4">
              <div className="relative w-16 h-16 mx-auto">
                <Cpu className="w-16 h-16 text-blue-600 animate-spin" />
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Extracting Question Paper
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  {statusMessage || 'Analyzing paper layout, question boundaries, and sub-parts...'}
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full max-w-md mx-auto bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-center gap-4 text-xs text-slate-500 font-mono">
                <span>Progress: {progressPercent}%</span>
                <span>•</span>
                <span className="uppercase">{pipelineStatus}</span>
                {assignmentId && (
                  <>
                    <span>•</span>
                    <span>ID: {assignmentId}</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PHASE 2: REVIEW QUESTIONS, CHOOSE MODE & BIND ANSWER KEY */}
          {/* ========================================================= */}
          {activeTab === 'async_s3' && phase === 'phase2_review' && (
            <div className="space-y-6">
              {/* Info banner */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>{questions.length} Questions Extracted</strong> with model <code>{reasoningModel}</code>. Review and customize before publishing.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-semibold flex items-center gap-1 hover:bg-emerald-700"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Question</span>
                </button>
              </div>

              {/* SECTION 1: QUESTION EDITOR */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Questions ({questions.length})</span>
                  </h4>
                  <span className="text-xs text-slate-500">
                    Total Marks: {questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0)}
                  </span>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {questions.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold font-mono px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-slate-800 dark:text-slate-200">
                          Q{q.question_number}
                        </span>

                        <div className="flex items-center gap-2">
                          <select
                            value={q.type}
                            onChange={(e) => handleUpdateQuestion(idx, { type: e.target.value as any })}
                            className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-medium"
                          >
                            <option value="subjective">Subjective</option>
                            <option value="mcq">MCQ</option>
                          </select>

                          <div className="flex items-center gap-1">
                            <span className="text-slate-500">Marks:</span>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={q.marks}
                              onChange={(e) => handleUpdateQuestion(idx, { marks: Number(e.target.value) })}
                              className="w-14 px-1.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-center font-bold"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Delete question"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <textarea
                        rows={2}
                        value={q.question}
                        onChange={(e) => handleUpdateQuestion(idx, { question: e.target.value })}
                        placeholder="Enter question text..."
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />

                      {/* Options for MCQ */}
                      {q.type === 'mcq' && (
                        <div className="pl-3 border-l-2 border-blue-400 space-y-1.5 pt-1">
                          <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                            <span>MCQ Options:</span>
                            <button
                              type="button"
                              onClick={() => handleAddOption(idx)}
                              className="text-blue-600 hover:underline flex items-center gap-0.5"
                            >
                              <Plus className="w-3 h-3" /> Add Option
                            </button>
                          </div>
                          {(q.options || []).map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] text-slate-400">
                                {String.fromCharCode(65 + optIdx)}.
                              </span>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => handleUpdateOption(idx, optIdx, e.target.value)}
                                className="flex-1 px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                              />
                              <button
                                type="button"
                                onClick={() => handleDeleteOption(idx, optIdx)}
                                className="text-slate-400 hover:text-rose-600 p-0.5"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 2: SUBMISSION MODE (CRITICAL FOR GRADING FLOW) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Exam Submission Mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Mode 1: TEACHER_UPLOAD */}
                  <div
                    onClick={() => setSubmissionMode('TEACHER_UPLOAD')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      submissionMode === 'TEACHER_UPLOAD'
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Printer className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          TEACHER_UPLOAD
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                        Physical Exam
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Students write on physical paper booklets. The teacher scans the full class stack into a combined PDF and runs bulk grading.
                    </p>
                  </div>

                  {/* Mode 2: STUDENT_UPLOAD */}
                  <div
                    onClick={() => setSubmissionMode('STUDENT_UPLOAD')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      submissionMode === 'STUDENT_UPLOAD'
                        ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/40 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-600" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          STUDENT_UPLOAD
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                        Digital / Remote
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Students take the test remotely and upload photos of their own answer sheets via the Student Portal.
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 3: ANSWER KEY BINDING & DUE DATE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Due Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Due Date & Time
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="datetime-local"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Answer Key Format Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Answer Key Method
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAnswerKeyMode('text')}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
                        answerKeyMode === 'text'
                          ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 border-blue-300 dark:border-blue-800'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600'
                      }`}
                    >
                      Type Text
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnswerKeyMode('file')}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
                        answerKeyMode === 'file'
                          ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 border-purple-300 dark:border-purple-800'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600'
                      }`}
                    >
                      Upload PDF
                    </button>
                  </div>
                </div>
              </div>

              {/* Answer Key Content */}
              {answerKeyMode === 'text' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Answer Key / Rubric Text
                  </label>
                  <textarea
                    rows={3}
                    value={akText}
                    onChange={(e) => setAkText(e.target.value)}
                    placeholder="Q1: Option B (Volt)&#10;Q2: V = IR where V=voltage, I=current, R=resistance..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ) : (
                <div className="p-4 border-2 border-dashed border-purple-200 dark:border-purple-900/60 rounded-xl bg-purple-50/20 text-center">
                  <label className="cursor-pointer">
                    <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                      {akFile ? `Selected: ${akFile.name}` : 'Click to select Answer Key PDF / Image'}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => e.target.files && setAkFile(e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* Final Publish Button */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPhase('phase1_upload')}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Back to Paper Upload
                </button>

                <button
                  type="button"
                  onClick={handleFinalPublish}
                  disabled={isPublishing}
                  className="flex items-center gap-2 py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow text-sm transition-all disabled:opacity-50"
                >
                  {isPublishing ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" />
                      <span>Publishing Assignment...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Publish Assignment ({submissionMode})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SYNC MANUAL CREATION ALTERNATIVE                          */}
          {/* ========================================================= */}
          {activeTab === 'sync_manual' && (
            <form onSubmit={handleCreateSync} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assignment Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Physics Mid-Term Examination"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Duration (Min)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={240}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Questions ({manualQuestions.length})
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setManualQuestions((prev) => [
                      ...prev,
                      {
                        question_number: prev.length + 1,
                        question_text: '',
                        max_marks: 5
                      }
                    ])
                  }
                  className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 hover:bg-emerald-100"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Question</span>
                </button>
              </div>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {manualQuestions.map((q, idx) => (
                  <div key={idx} className="flex gap-2 items-start p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-bold px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-slate-700 dark:text-slate-300 font-mono mt-1">
                      Q{q.question_number}
                    </span>
                    <input
                      type="text"
                      value={q.question_text}
                      onChange={(e) => {
                        const val = e.target.value;
                        setManualQuestions((prev) => prev.map((item, i) => i === idx ? { ...item, question_text: val } : item));
                      }}
                      placeholder="Enter question text..."
                      className="flex-1 px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      required
                    />
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={q.max_marks}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setManualQuestions((prev) => prev.map((item, i) => i === idx ? { ...item, max_marks: val } : item));
                      }}
                      className="w-16 px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-bold"
                    />
                    {manualQuestions.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setManualQuestions((prev) =>
                            prev.filter((_, i) => i !== idx).map((item, i) => ({ ...item, question_number: i + 1 }))
                          )
                        }
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={isSubmittingSync}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm text-sm transition-all disabled:opacity-50"
              >
                {isSubmittingSync ? (
                  <span>Deploying Test...</span>
                ) : (
                  <>
                    <span>Deploy Synchronously</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
