import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  BookOpen,
  Users,
  Sparkles,
  ArrowRight,
  Upload,
  FileCheck2,
  Clock,
  FileText
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';

interface AssignedSection {
  section_id: string;
  class_name: string;
  section_name: string;
  subject_name: string;
  subject_code?: string;
  class_id?: string;
  class_subject_id?: string;
}

interface ClassTeacherSection {
  section_id: string;
  class_name: string;
  section_name: string;
}

interface TeacherDashboardData {
  teacher_id: string;
  teacher_name: string;
  assigned_sections: AssignedSection[];
  class_teacher_sections?: ClassTeacherSection[];
  pending_grading_count?: number;
  completed_evaluations_count?: number;
}

const cleanSecName = (rawName: string) => {
  if (!rawName) return 'A';
  return String(rawName).replace(/^Section\s+/i, '').trim() || 'A';
};

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [dashboardData, setDashboardData] = useState<TeacherDashboardData | null>(null);
  const [submissionsCount, setSubmissionsCount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [evaluatedCount, setEvaluatedCount] = useState<number>(0);
  const [assignedSections, setAssignedSections] = useState<AssignedSection[]>([]);
  const [classTeacherSections, setClassTeacherSections] = useState<ClassTeacherSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadTeacherData = async () => {
      let allocations: any[] = [];
      let classTeacherSecs: any[] = [];
      let resolvedTeacherId = String(currentUser?.id || (currentUser as any)?.teacher_id || (currentUser as any)?.staff_id || '').trim();
      let resolvedTeacherName = String(currentUser?.name || '').toLowerCase().trim();
      
      // 1. Fetch teacher dashboard endpoint to get teacher details and allocations

      try {
        const res = await fetch(`${API_BASE_URL}/api/teacher/dashboard`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.data) {
            setDashboardData(json.data);
            if (json.data.teacher_id) resolvedTeacherId = String(json.data.teacher_id).trim();
            if (json.data.teacher_name) resolvedTeacherName = String(json.data.teacher_name).toLowerCase().trim();

            allocations = Array.isArray(json.data.teaching_allocations)
              ? json.data.teaching_allocations
              : (Array.isArray(json.data.assigned_sections) ? json.data.assigned_sections : []);

            if (Array.isArray(json.data.class_teacher_sections)) {
              classTeacherSecs = json.data.class_teacher_sections;
              setClassTeacherSections(
                classTeacherSecs.map((c: any) => ({
                  section_id: String(c.section_id),
                  class_name: c.class_name || 'Grade 10',
                  section_name: cleanSecName(c.section_name)
                }))
              );
            }

            if (typeof json.data.pending_grading_count === 'number') {
              setPendingCount(json.data.pending_grading_count);
            }
            if (typeof json.data.completed_evaluations_count === 'number') {
              setEvaluatedCount(json.data.completed_evaluations_count);
            }
          }
        }
      } catch (e) {
        console.warn('Teacher dashboard fetch fallback:', e);
      }

      // Validate each allocation against section-level assigned_teacher matrix.
      // This avoids over-broad allocations caused by global teacher-subject mappings.
      let allocationsValidated = false;
      try {
        const uniqueSectionIds = Array.from(new Set(allocations.map((a: any) => String(a.section_id)).filter(Boolean)));
        const sectionRows = await Promise.all(uniqueSectionIds.map(async (sectionId) => {
          try {
            const res = await fetch(`${API_BASE_URL}/api/sections/${sectionId}/subjects-teachers`);
            if (!res.ok) return { sectionId, rows: [] as any[] };
            const data = await res.json().catch(() => ({}));
            const rows = Array.isArray(data.data)
              ? data.data
              : (Array.isArray(data.subjectsTeachers) ? data.subjectsTeachers : []);
            return { sectionId, rows };
          } catch {
            return { sectionId, rows: [] as any[] };
          }
        }));

        const bySection = new Map<string, any[]>();
        sectionRows.forEach((x) => bySection.set(String(x.sectionId), x.rows));

        allocations = allocations.filter((a: any) => {
          const rows = bySection.get(String(a.section_id)) || [];
          return rows.some((row: any) => {
            const teacher = row?.assigned_teacher;
            if (!teacher) return false;

            const teacherMatches =
              (resolvedTeacherId && (String(teacher.id || '') === resolvedTeacherId || String(teacher.teacher_id || '') === resolvedTeacherId)) ||
              (resolvedTeacherName && String(teacher.name || '').toLowerCase().trim() === resolvedTeacherName);

            if (!teacherMatches) return false;

            if (a.class_subject_id && row.class_subject_id) {
              return String(row.class_subject_id) === String(a.class_subject_id);
            }

            return cleanSecName(row.section_name || a.section_name) === cleanSecName(a.section_name);
          });
        });
        allocationsValidated = true;
      } catch {
        allocationsValidated = false;
      }

      if (!allocationsValidated) {
        allocations = [];
      }

      if (allocations.length > 0 && isMounted) {
        setAssignedSections(
          allocations.map((a: any) => ({
            section_id: String(a.section_id),
            class_name: a.class_name || 'Grade 10',
            section_name: cleanSecName(a.section_name),
            subject_name: a.subject_name || 'Physics',
            subject_code: a.subject_code || (a.class_subject_id ? `SUB-${a.class_subject_id}` : undefined),
            class_id: a.class_id ? String(a.class_id) : '4259669056990210',
            class_subject_id: a.class_subject_id ? String(a.class_subject_id) : (a.subject_id ? String(a.subject_id) : '4265262194928642')
          }))
        );
      } else if (isMounted) {
        setAssignedSections([]);
      }

      // 2. Fetch live submissions for real queue counts
      try {
        const subRes = await fetch(`${API_BASE_URL}/api/submissions`);
        if (subRes.ok) {
          const subData = await subRes.json();
          const subs = Array.isArray(subData.data) ? subData.data : (Array.isArray(subData.submissions) ? subData.submissions : []);
          if (isMounted) {
            setSubmissionsCount(subs.length);
            const pending = subs.filter((s: any) => s.status === 'pending_review' || s.status === 'PENDING').length;
            const completed = subs.filter((s: any) => typeof (s.finalScore ?? s.aiEvaluation?.score) === 'number').length;
            setPendingCount(pending);
            setEvaluatedCount(completed);
          }
        }
      } catch {}

      if (isMounted) setIsLoading(false);
    };

    loadTeacherData();
    return () => { isMounted = false; };
  }, [currentUser]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <div className="spinner" style={{ width: '2rem', height: '2rem', border: '3px solid #2563EB', borderTopColor: 'transparent', borderRadius: '50%' }} />
          <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#64748B' }}>Loading Faculty Desk...</p>
        </div>
      </div>
    );
  }

  const teacherName = dashboardData?.teacher_name || currentUser?.name || 'Phani';
  const staffId = dashboardData?.teacher_id || (currentUser as any)?.teacher_id || (currentUser as any)?.staff_id || '1234';

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Top Banner Header */}
      <header className="page-top-bar no-print">
        <div className="page-top-bar-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '9999px',
                background: '#ECFDF5',
                color: '#065F46',
                border: '1px solid #A7F3D0'
              }}
            >
              Faculty Workspace
            </span>
            <span style={{ fontSize: '12px', color: '#64748B', fontFamily: 'monospace', fontWeight: 600 }}>
              Staff ID: {staffId}
            </span>
          </div>
          <h1>Welcome, {teacherName}</h1>
          <p>Manage assigned subject curricula, review AI-graded test papers, and monitor handwritten answer sheets.</p>
        </div>
      </header>

      <div className="page-container">
        {/* Class Teacher Banner if assigned */}
        {classTeacherSections.length > 0 && (
          <div
            style={{
              padding: '0.875rem 1.25rem',
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.25rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.4rem', borderRadius: '6px', background: '#059669', color: '#FFFFFF' }}>
                <GraduationCap className="size-4" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#065F46' }}>
                  Designated Class Teacher Responsibilities
                </div>
                <div style={{ fontSize: '0.75rem', color: '#047857' }}>
                  You are the official incharge for {classTeacherSections.map(c => `${c.class_name} - Section ${c.section_name}`).join(', ')}.
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate('/students')}
              className="btn btn-primary btn-sm"
              style={{ fontSize: '12px' }}
            >
              <span>View Roster</span>
              <ArrowRight className="size-3" />
            </button>
          </div>
        )}

        {/* Metric Stats Cards */}
        <div className="metrics-stat-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-box">
            <div className="stat-box-header">
              <span className="stat-box-title">Awaiting Review</span>
              <div className="stat-box-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
                <Clock className="size-4" />
              </div>
            </div>
            <div className="stat-box-value" style={{ color: pendingCount > 0 ? '#D97706' : '#059669' }}>
              {pendingCount}
            </div>
            <div className="stat-box-footer">
              {pendingCount > 0 ? 'Pending teacher sign-off' : 'All caught up'}
            </div>
          </div>

          <div className="stat-box">
            <div className="stat-box-header">
              <span className="stat-box-title">Scripts Evaluated</span>
              <div className="stat-box-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
                <FileCheck2 className="size-4" />
              </div>
            </div>
            <div className="stat-box-value">{evaluatedCount}</div>
            <div className="stat-box-footer">Handwritten papers verified</div>
          </div>

          <div className="stat-box">
            <div className="stat-box-header">
              <span className="stat-box-title">Assigned Sections</span>
              <div className="stat-box-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                <BookOpen className="size-4" />
              </div>
            </div>
            <div className="stat-box-value">{assignedSections.length}</div>
            <div className="stat-box-footer">Active classroom schedules</div>
          </div>

          <div className="stat-box">
            <div className="stat-box-header">
              <span className="stat-box-title">Total Papers Scanned</span>
              <div className="stat-box-icon" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
                <FileText className="size-4" />
              </div>
            </div>
            <div className="stat-box-value">{submissionsCount}</div>
            <div className="stat-box-footer">Classroom test sheets</div>
          </div>
        </div>

        {/* Quick Action Shortcuts Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div
            className="m-card"
            onClick={() => navigate('/submissions')}
            style={{
              padding: '1.25rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              transition: 'all 0.15s ease'
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: '#FEF3C7',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <FileCheck2 className="size-5" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0F172A' }}>
                Review Submissions Queue
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: '0.15rem' }}>
                Verify AI score overrides ({pendingCount} waiting)
              </div>
            </div>
          </div>

          <div
            className="m-card"
            onClick={() => navigate('/upload')}
            style={{
              padding: '1.25rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              transition: 'all 0.15s ease'
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: '#EFF6FF',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Upload className="size-5" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0F172A' }}>
                Scan & Grade Papers
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: '0.15rem' }}>
                Batch OCR handwritten test sheets
              </div>
            </div>
          </div>

          <div
            className="m-card"
            onClick={() => navigate('/generator')}
            style={{
              padding: '1.25rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              transition: 'all 0.15s ease'
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: '#FDF4FF',
                color: '#A855F7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Sparkles className="size-5" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0F172A' }}>
                AI Exam Generator
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: '0.15rem' }}>
                Curriculum RAG blueprint & test questions
              </div>
            </div>
          </div>
        </div>

        {/* Assigned Teaching Sections */}
        <div className="m-card">
          <div className="m-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="m-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <BookOpen className="size-4 text-blue-600" />
                <span>Assigned Teaching Sections ({assignedSections.length})</span>
              </h3>
              <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '0.2rem 0 0 0' }}>
                Classes where you are registered as the active subject instructor
              </p>
            </div>
            <button
              onClick={() => navigate('/classes')}
              className="btn btn-outline btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <span>All Classes</span>
              <ArrowRight className="size-3.5" />
            </button>
          </div>

          <div style={{ padding: '1.25rem' }}>
            {assignedSections.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748B' }}>
                <BookOpen className="size-8 text-slate-300 mx-auto" style={{ margin: '0 auto 0.5rem auto' }} />
                <p style={{ fontWeight: 600, color: '#334155', margin: 0 }}>No teaching sections assigned yet</p>
                <p style={{ fontSize: '0.8125rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                  Teaching sections assigned by your school administrator will appear here.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {assignedSections.map((sec, idx) => (
                  <div
                    key={sec.section_id || idx}
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '1.25rem',
                      background: '#F8FAFC',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: '#EFF6FF',
                            color: '#1D4ED8',
                            fontFamily: 'monospace'
                          }}
                        >
                          {sec.subject_code || 'PHY-101'}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Users className="size-3" />
                          Section {cleanSecName(sec.section_name)}
                        </span>
                      </div>

                      <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>
                        {sec.subject_name}
                      </h4>
                      <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: 0 }}>
                        Class: <strong style={{ color: '#334155' }}>{sec.class_name}</strong> • Section {cleanSecName(sec.section_name)}
                      </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #E2E8F0' }}>
                      <button
                        onClick={() => {
                          const targetClassId = sec.class_id || '4259669056990210';
                          const targetSubId = sec.class_subject_id || '4265262194928642';
                          navigate(`/classes/${targetClassId}/${targetSubId}?sectionId=${sec.section_id}`);
                        }}
                        className="btn btn-primary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '12px' }}
                      >
                        <FileText className="size-3" />
                        <span>Grade Papers</span>
                      </button>
                      <button
                        onClick={() => navigate('/classes')}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '12px' }}
                      >
                        Class Desk
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
