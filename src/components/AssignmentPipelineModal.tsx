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
  Trash2
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';

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
  sectionId = '601',
  classSubjectId = '801',
  defaultTitle = '',
  onSuccess
}: AssignmentPipelineModalProps) {
  const [activeMode, setActiveMode] = useState<'async_s3' | 'sync_manual'>('async_s3');

  // Common Form Fields
  const [title, setTitle] = useState(defaultTitle || 'Midterm Assessment 2026');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [durationMinutes, setDurationMinutes] = useState(60);

  // S3 Async Pipeline State
  const [qpFile, setQpFile] = useState<File | null>(null);
  const [akFile, setAkFile] = useState<File | null>(null);
  const [pipelineStage, setPipelineStage] = useState<'idle' | 'uploading_s3' | 'ocr_processing' | 'reasoning_model_selected' | 'ready' | 'failed'>('idle');
  const [currentAssignmentId, setCurrentAssignmentId] = useState<string | null>(null);
  const [pipelineLog, setPipelineLog] = useState<string>('');

  // Sync Manual Creation State
  const [manualQuestions, setManualQuestions] = useState<Array<{ question_number: number; question_text: string; max_marks: number }>>([
    { question_number: 1, question_text: 'Define Newton’s Second Law of Motion with mathematical derivation.', max_marks: 5 },
    { question_number: 2, question_text: 'Calculate the acceleration of a 1200 kg car with 3600 N applied force.', max_marks: 5 }
  ]);
  const [isSubmittingSync, setIsSubmittingSync] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Polling for async pipeline status
  useEffect(() => {
    let interval: any = null;
    if (pipelineStage === 'ocr_processing' && currentAssignmentId) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/assignments/${currentAssignmentId}/pipeline-status`);
          if (res.ok) {
            const data = await res.json();
            const status = data.status || data.data?.status;
            if (status === 'ready') {
              setPipelineStage('ready');
              setPipelineLog('✅ OCR question extraction & model reasoning complete! Paper deployed.');
              clearInterval(interval);
              if (onSuccess) onSuccess(currentAssignmentId);
            } else if (status === 'reasoning_model_selected') {
              setPipelineStage('reasoning_model_selected');
              setPipelineLog('🧠 Dynamic LLM reasoning model assigned. Finalizing rubric parsing...');
            } else if (status === 'failed') {
              setPipelineStage('failed');
              setErrorMsg(data.message || 'Pipeline processing failed.');
              clearInterval(interval);
            }
          } else {
            setPipelineStage('failed');
            setErrorMsg('Unable to retrieve assignment OCR status from backend.');
            clearInterval(interval);
          }
        } catch {
          setPipelineStage('failed');
          setErrorMsg('Error communicating with assignment OCR pipeline.');
          clearInterval(interval);
        }
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pipelineStage, currentAssignmentId]);

  if (!isOpen) return null;

  // 1. S3 Presigned URL + Process Async Execution
  const handleStartAsyncPipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please specify an assignment title.');
      return;
    }
    setErrorMsg('');
    setPipelineStage('uploading_s3');
    setPipelineLog('1/3: Generating pre-signed S3 URLs via POST /api/assignments/upload-urls...');

    try {
      // Step A: Request S3 pre-signed upload URLs (POST /api/assignments/upload-urls)
      const qpFilename = qpFile ? qpFile.name : 'question_paper.pdf';
      const akFilename = akFile ? akFile.name : 'answer_key.pdf';

      let s3PaperUrl = `https://paatam-uploads.s3.ap-south-2.amazonaws.com/papers/${Date.now()}_${qpFilename}`;
      let s3KeyUrl = `https://paatam-uploads.s3.ap-south-2.amazonaws.com/keys/${Date.now()}_${akFilename}`;

      try {
        const uploadUrlRes = await fetch(`${API_BASE_URL}/api/assignments/upload-urls`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question_paper_filename: qpFilename,
            answer_key_filename: akFilename
          })
        });
        if (uploadUrlRes.ok) {
          const uploadData = await uploadUrlRes.json();
          if (uploadData.data?.question_paper_s3_url) {
            s3PaperUrl = uploadData.data.question_paper_s3_url;
          }
          if (uploadData.data?.answer_key_s3_url) {
            s3KeyUrl = uploadData.data.answer_key_s3_url;
          }
        }
      } catch {
        // Continue with S3 location
      }

      setPipelineLog('2/3: Enqueuing into async OCR pipeline via POST /api/assignments/process-async...');

      // Step B: Enqueue async pipeline (POST /api/assignments/process-async)
      const asyncRes = await fetch(`${API_BASE_URL}/api/assignments/process-async`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section_id: sectionId,
          class_subject_id: classSubjectId,
          title: title.trim(),
          difficulty,
          duration_minutes: durationMinutes,
          question_paper_url: s3PaperUrl,
          answer_key_url: s3KeyUrl
        })
      });

      const asyncData = await asyncRes.json().catch(() => ({}));
      const newAssId = asyncData.data?.assignment_id || `asg-${Date.now()}`;
      setCurrentAssignmentId(String(newAssId));
      setPipelineStage('ocr_processing');
      setPipelineLog('3/3: Paper enqueued. Polling OCR pipeline status (GET /api/assignments/:id/pipeline-status)...');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with Paatam S3 pipeline.');
      setPipelineStage('idle');
    }
  };

  // 2. Synchronous Create (POST /api/assignments/create-sync)
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
          questions: manualQuestions
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok || data.status === 'success' || data.success) {
        setSuccessMsg(`✅ "${title}" deployed synchronously (${manualQuestions.length} questions).`);
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

  const addManualQuestion = () => {
    setManualQuestions(prev => [
      ...prev,
      {
        question_number: prev.length + 1,
        question_text: '',
        max_marks: 5
      }
    ]);
  };

  const removeManualQuestion = (idx: number) => {
    setManualQuestions(prev => prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, question_number: i + 1 })));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <CloudUpload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Deploy Test Assignment</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">AWS S3 Pre-signed Pipeline or Instant Sync Creation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 pt-3 shrink-0 bg-slate-50/30 dark:bg-slate-900/30">
          <button
            type="button"
            onClick={() => { setActiveMode('async_s3'); setErrorMsg(''); }}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeMode === 'async_s3'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>S3 Async OCR Pipeline</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveMode('sync_manual'); setErrorMsg(''); }}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeMode === 'sync_manual'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Instant Sync Creation</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-4">
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

          {activeMode === 'async_s3' ? (
            /* Mode 1: S3 Async Pipeline */
            <form onSubmit={handleStartAsyncPipeline} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 text-center">
                  <FileText className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Question Paper File
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {qpFile ? qpFile.name : 'Upload PDF / Scanned Image'}
                  </div>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => e.target.files && setQpFile(e.target.files[0])}
                    className="mt-3 text-xs w-full text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                <div className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 text-center">
                  <Sparkles className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Answer Key / Rubric (Optional)
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {akFile ? akFile.name : 'Teacher marking scheme PDF'}
                  </div>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => e.target.files && setAkFile(e.target.files[0])}
                    className="mt-3 text-xs w-full text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                  />
                </div>
              </div>

              {/* Real-time Status Card */}
              {pipelineStage !== 'idle' && (
                <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3 font-mono text-xs border border-slate-800 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-400 flex items-center gap-2">
                      <Cpu className="w-4 h-4 animate-spin text-blue-400" />
                      PIPELINE PROGRESS
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] uppercase text-slate-300">
                      {pipelineStage}
                    </span>
                  </div>
                  <p className="text-slate-300">{pipelineLog}</p>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                    <div className={`p-2 rounded bg-slate-800/80 border ${['uploading_s3', 'ocr_processing', 'reasoning_model_selected', 'ready'].includes(pipelineStage) ? 'border-blue-500 text-blue-300' : 'border-slate-700 text-slate-500'}`}>
                      1. S3 Presigned PUT
                    </div>
                    <div className={`p-2 rounded bg-slate-800/80 border ${['ocr_processing', 'reasoning_model_selected', 'ready'].includes(pipelineStage) ? 'border-amber-500 text-amber-300 animate-pulse' : 'border-slate-700 text-slate-500'}`}>
                      2. Async OCR Queue
                    </div>
                    <div className={`p-2 rounded bg-slate-800/80 border ${pipelineStage === 'ready' ? 'border-emerald-500 text-emerald-300' : 'border-slate-700 text-slate-500'}`}>
                      3. Ready for Review
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={pipelineStage !== 'idle' && pipelineStage !== 'ready' && pipelineStage !== 'failed'}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm text-sm transition-all disabled:opacity-50"
              >
                {pipelineStage === 'uploading_s3' || pipelineStage === 'ocr_processing' ? (
                  <span>Processing Cloud Pipeline...</span>
                ) : (
                  <>
                    <span>Deploy via Async S3 Pipeline</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Mode 2: Instant Sync Creation (POST /api/assignments/create-sync) */
            <form onSubmit={handleCreateSync} className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Questions ({manualQuestions.length})
                </span>
                <button
                  type="button"
                  onClick={addManualQuestion}
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
                    <div className="flex-1 space-y-1.5">
                      <input
                        type="text"
                        value={q.question_text}
                        onChange={(e) => {
                          const val = e.target.value;
                          setManualQuestions(prev => prev.map((item, i) => i === idx ? { ...item, question_text: val } : item));
                        }}
                        placeholder="Enter question text..."
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        required
                      />
                    </div>
                    <div className="w-20">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={q.max_marks}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setManualQuestions(prev => prev.map((item, i) => i === idx ? { ...item, max_marks: val } : item));
                        }}
                        className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-center"
                        title="Maximum marks"
                      />
                    </div>
                    {manualQuestions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeManualQuestion(idx)}
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
                    <span>Deploy Synchronously (Instant)</span>
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
