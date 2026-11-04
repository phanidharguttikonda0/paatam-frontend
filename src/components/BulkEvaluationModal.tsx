import React, { useState, useEffect } from 'react';
import { Layers, Upload, X, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { API_BASE_URL, getPresignedUploadUrls, uploadBinaryToS3 } from '../config/api';
import LanguageSelect from './LanguageSelect';

interface BulkEvaluationModalProps {
  isOpen: boolean;
  assignmentId?: string;
  sectionId?: string;
  onClose: () => void;
  onRefreshDashboard: () => void;
}

export default function BulkEvaluationModal({
  isOpen,
  assignmentId = '',
  sectionId = '701',
  onClose,
  onRefreshDashboard
}: BulkEvaluationModalProps) {
  const [className, setClassName] = useState('Grade 10');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [bulkMode, setBulkMode] = useState<'combined_pdf' | 'single_per_student'>('combined_pdf');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgressMsg, setUploadProgressMsg] = useState<string>('');
  const [activeAssignmentId, setActiveAssignmentId] = useState(assignmentId || '');
  const [availableAssignments, setAvailableAssignments] = useState<Array<{ id: string; title: string }>>([]);

  useEffect(() => {
    if (assignmentId) {
      setActiveAssignmentId(assignmentId);
    } else {
      fetch(`${API_BASE_URL}/api/assignments`)
        .then((res) => res.json())
        .then((d) => {
          const list = d.data?.assignments || d.assignments || [];
          if (Array.isArray(list) && list.length > 0) {
            setAvailableAssignments(list);
            setActiveAssignmentId((prev) => prev || String(list[0].id));
          }
        })
        .catch(() => {});
    }
  }, [assignmentId]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [batchData, setBatchData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Poll batch status: GET /api/submissions/batch/:jobId
  useEffect(() => {
    if (!jobId) return;

    let timer: any = null;
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/submissions/batch/${jobId}`);
        if (!res.ok) return;
        const result = await res.json();
        const data = result.data || result;
        setBatchData(data);

        const currentStatus = data.status;
        if (currentStatus === 'completed' || currentStatus === 'failed') {
          setIsSubmitting(false);
          if (currentStatus === 'completed') {
            onRefreshDashboard();
          }
          if (timer) clearInterval(timer);
        }
      } catch (err) {
        console.error('Batch status polling error:', err);
      }
    };

    fetchStatus();
    timer = setInterval(fetchStatus, 2000);
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [jobId, onRefreshDashboard]);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(filesArray);
      if (filesArray.length > 1) {
        setBulkMode('single_per_student');
      }
    }
  };

  const handleStartBulkEvaluation = async () => {
    if (selectedFiles.length === 0) {
      setErrorMsg('Please select at least 1 master scanned stack or student booklet to evaluate.');
      return;
    }
    if (!activeAssignmentId.trim()) {
      setErrorMsg('Please select or specify the assignment ID before starting bulk evaluation.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setJobId(null);
    setBatchData(null);
    setUploadProgressMsg('Step 3.1: Requesting pre-signed S3 upload URLs...');

    try {
      // Step 3.1: Request Pre-signed S3 URLs for the files with purpose: "answer_sheets_bulk"
      const fileDescriptors = selectedFiles.map((file) => ({
        file_name: file.name,
        file_type: file.type || 'application/pdf',
        purpose: 'answer_sheets_bulk'
      }));

      const presignedItems = await getPresignedUploadUrls(sectionId, fileDescriptors);

      // Upload files directly to S3 via PUT (CRITICAL: No Authorization headers)
      const uploadedFileUrls: string[] = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const item = presignedItems[i] || presignedItems.find((p) => p.purpose === 'answer_sheets_bulk');
        if (!item || !item.upload_url) {
          throw new Error(`Failed to obtain pre-signed upload URL for file: ${file.name}`);
        }

        setUploadProgressMsg(`Uploading file ${i + 1} of ${selectedFiles.length} to S3 (${file.name})...`);
        await uploadBinaryToS3(item.upload_url, file);

        const finalUrl = item.file_url || item.upload_url.split('?')[0];
        uploadedFileUrls.push(finalUrl);
      }

      setUploadProgressMsg('Step 3.2: Enqueuing batch job for AI slicing and parallel evaluation...');

      // Step 3.2: Trigger Batch Paper Splitting & Evaluation (POST /api/submissions/bulk)
      const bulkRes = await fetch(`${API_BASE_URL}/api/submissions/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment_id: String(activeAssignmentId.trim()),
          bulk_mode: bulkMode,
          file_urls: uploadedFileUrls,
          total_files: selectedFiles.length
        })
      });

      const bulkData = await bulkRes.json().catch(() => ({}));
      if (!bulkRes.ok || bulkData.status === 'error') {
        throw new Error(bulkData.message || 'Failed to initialize bulk batch evaluation job.');
      }

      const assignedJobId = bulkData.data?.job_id || bulkData.job_id || bulkData.jobId;
      if (!assignedJobId) {
        throw new Error('Backend did not return a job_id for bulk evaluation.');
      }

      setJobId(String(assignedJobId));
      setBatchData(bulkData.data || bulkData);
      setUploadProgressMsg('');
    } catch (err: any) {
      console.error('Bulk submission error:', err);
      setErrorMsg(err.message || 'Error executing bulk evaluation pipeline.');
      setIsSubmitting(false);
      setUploadProgressMsg('');
    }
  };

  const processedCount = batchData?.processed_count ?? batchData?.processed ?? 0;
  const totalCount = batchData?.total_files ?? batchData?.total ?? selectedFiles.length ?? 1;
  const progressPercent = totalCount > 0 ? Math.min(100, Math.round((processedCount / totalCount) * 100)) : 0;
  const stage = batchData?.stage || 'splitting';
  const status = batchData?.status || 'queued';
  const createdSubmissions: any[] = batchData?.created_submissions || batchData?.submissions || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers className="size-5 text-blue-600" />
              <span>Teacher Bulk Grading (Physical Exam Scan Stack)</span>
            </h2>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8125rem', color: '#64748B' }}>
              Upload master scanned answer booklet PDFs. AI slices student booklets and evaluates all scripts in parallel.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B'
            }}
          >
            <X className="size-5" />
          </button>
        </div>

        {errorMsg && (
          <div style={{ padding: '0.75rem 1rem', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {!jobId ? (
          /* Form Controls */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Target Class / Section</label>
                <input
                  type="text"
                  className="form-input"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="e.g. Grade 10 - Section A"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Evaluation Language</label>
                <LanguageSelect value={selectedLanguage} onChange={setSelectedLanguage} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Assignment ID</label>
              {availableAssignments.length > 0 && !assignmentId ? (
                <select
                  className="form-input font-mono"
                  value={activeAssignmentId}
                  onChange={(e) => setActiveAssignmentId(e.target.value)}
                >
                  {availableAssignments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title} (ID: {a.id})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="form-input font-mono"
                  value={activeAssignmentId}
                  onChange={(e) => setActiveAssignmentId(e.target.value)}
                  placeholder="Enter or select Dispatched Assignment ID"
                />
              )}
            </div>

            {/* Bulk Mode Selector */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                Batch Scan Mode
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {/* Option 1: combined_pdf */}
                <div
                  onClick={() => setBulkMode('combined_pdf')}
                  style={{
                    border: bulkMode === 'combined_pdf' ? '2px solid #2563EB' : '1px solid #E2E8F0',
                    background: bulkMode === 'combined_pdf' ? '#EFF6FF' : '#FFFFFF',
                    borderRadius: '0.625rem',
                    padding: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <input
                        type="radio"
                        name="bulkMode"
                        checked={bulkMode === 'combined_pdf'}
                        onChange={() => setBulkMode('combined_pdf')}
                        style={{ cursor: 'pointer', accentColor: '#2563EB' }}
                      />
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1E293B' }}>Master Combined PDF</span>
                    </div>
                    <span style={{ fontSize: '0.625rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '9999px', background: '#DBEAFE', color: '#1E40AF', textTransform: 'uppercase' }}>
                      Auto-Slice
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748B', lineHeight: 1.35 }}>
                    1 single master PDF scan of all 30–50 students. AI automatically detects student boundaries, roll numbers, and slices booklets.
                  </p>
                </div>

                {/* Option 2: single_per_student */}
                <div
                  onClick={() => setBulkMode('single_per_student')}
                  style={{
                    border: bulkMode === 'single_per_student' ? '2px solid #16A34A' : '1px solid #E2E8F0',
                    background: bulkMode === 'single_per_student' ? '#F0FDF4' : '#FFFFFF',
                    borderRadius: '0.625rem',
                    padding: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <input
                        type="radio"
                        name="bulkMode"
                        checked={bulkMode === 'single_per_student'}
                        onChange={() => setBulkMode('single_per_student')}
                        style={{ cursor: 'pointer', accentColor: '#16A34A' }}
                      />
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1E293B' }}>Separate Student Files</span>
                    </div>
                    <span style={{ fontSize: '0.625rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '9999px', background: '#DCFCE7', color: '#15803D', textTransform: 'uppercase' }}>
                      Direct Batch
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748B', lineHeight: 1.35 }}>
                    Each uploaded PDF or image is one individual student booklet. Directly enqueued for grading without splitting.
                  </p>
                </div>
              </div>
            </div>

            {/* Dropzone */}
            <div
              className="scan-dropzone"
              onClick={() => document.getElementById('bulk-file-input')?.click()}
            >
              <Upload className="size-6 text-blue-600" />
              <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#111827', margin: 0 }}>
                {selectedFiles.length > 0
                  ? `${selectedFiles.length} file(s) selected (${(selectedFiles.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(1)} MB)`
                  : 'Click to Attach Master Scanned PDF (Up to 50MB)'}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0 }}>
                Directly uploaded to high-speed AWS S3 storage before AI evaluation.
              </p>
              <input
                id="bulk-file-input"
                type="file"
                multiple={bulkMode === 'single_per_student'}
                accept="application/pdf,image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>

            {uploadProgressMsg && (
              <div style={{ padding: '0.6rem 0.8rem', background: '#EFF6FF', borderRadius: '0.5rem', fontSize: '0.75rem', color: '#1D4ED8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock className="size-4 animate-spin shrink-0" />
                <span>{uploadProgressMsg}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button
                onClick={handleStartBulkEvaluation}
                disabled={isSubmitting || selectedFiles.length === 0}
                className="btn btn-primary"
              >
                {isSubmitting ? (
                  <>
                    <Clock className="size-4 animate-spin" />
                    <span>Processing Cloud Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Layers className="size-4" />
                    <span>Start Bulk Evaluation ({selectedFiles.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Live Progress Monitor (STEP 3.3) */
          <div>
            <div style={{ background: '#F8FAFC', borderRadius: '0.5rem', padding: '1rem', border: '1px solid #E2E8F0', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1E293B' }}>
                  {stage === 'splitting' ? (
                    'Stage 1: Lambda Slicing & Boundary Detection'
                  ) : status === 'completed' ? (
                    `Evaluation Complete (${batchData?.successful_count ?? processedCount} / ${totalCount} Evaluated)`
                  ) : (
                    `Stage 2: Parallel AI Evaluation (${processedCount} / ${totalCount} Students)`
                  )}
                </span>
                <span className={`badge ${status === 'completed' ? 'badge-green' : 'badge-blue'}`}>
                  {status === 'completed' ? '● Completed' : stage === 'splitting' ? '● Slicing Document' : '● Processing'}
                </span>
              </div>

              {/* Progress Bar */}
              <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '9999px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                <div
                  style={{
                    width: `${status === 'completed' ? 100 : progressPercent}%`,
                    height: '100%',
                    background: status === 'completed' ? '#16A34A' : '#2563EB',
                    borderRadius: '9999px',
                    transition: 'width 0.4s ease'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748B' }}>
                <span>Job ID: {jobId}</span>
                <span>
                  Successful: {batchData?.successful_count ?? processedCount} | Failed: {batchData?.failed_count ?? 0}
                </span>
              </div>
            </div>

            {/* Submissions Created Feed */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.875rem', color: '#334155', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Created Submissions ({createdSubmissions.length}):</span>
                {status === 'processing' && (
                  <span style={{ fontSize: '0.75rem', color: '#2563EB', fontWeight: 500 }}>
                    ⚡ Updating live...
                  </span>
                )}
              </h4>

              <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {createdSubmissions.length === 0 ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.8125rem', background: '#F8FAFC', borderRadius: '0.375rem', border: '1px dashed #CBD5E1' }}>
                    {stage === 'splitting'
                      ? 'Lambda is slicing pages by student roll numbers and barcodes...'
                      : 'Creating student submissions in database and triggering parallel evaluation...'}
                  </div>
                ) : (
                  createdSubmissions.map((sub: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.5rem 0.75rem',
                        background: '#F8FAFC',
                        borderRadius: '0.375rem',
                        border: '1px solid #E2E8F0'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CheckCircle2 className="size-4 text-green-600" />
                        <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#111827' }}>
                          {sub.student_name || sub.studentName || `Student ${sub.student_id || idx + 1}`}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#2563EB', fontWeight: 600 }}>
                        ID: #{sub.submission_id || sub.id}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {status === 'completed' && (
              <button
                onClick={onClose}
                className="btn btn-success"
                style={{ width: '100%', padding: '0.65rem' }}
              >
                <CheckCircle2 className="size-4" />
                <span>Finished! View in Submissions Review Queue</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
