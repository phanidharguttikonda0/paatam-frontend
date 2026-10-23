import React, { useEffect, useState, useMemo } from 'react';
import {
  Users,
  Plus,
  BookOpen,
  Trash2,
  Mail,
  Phone,
  X,
  Search,
  Edit2,
  GraduationCap,
  KeyRound
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';

interface TeacherItem {
  id: string;
  name: string;
  teacher_id: string;
  contact_email: string;
  contact_mobile: string;
  branches?: { id: string; name: string };
  teacher_subject?: { id: string; subject_id: string; subjects?: { id: string; name: string } }[];
}

interface MasterSubjectItem {
  id: string;
  name: string;
  code?: string;
  classes?: any[];
}

export default function Teachers() {
  const { currentBranchId, branches } = useAuth();
  const branchId = currentBranchId || (branches.length > 0 ? branches[0].id : '');

  const [activeTab, setActiveTab] = useState<'teachers' | 'subjects'>('teachers');

  // Teachers State
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(true);

  // Add/Edit Teacher Modal
  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherItem | null>(null);
  const [teacherName, setTeacherName] = useState('');
  const [teacherStaffId, setTeacherStaffId] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherMobile, setTeacherMobile] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('Teacher123!');
  const [isSubmittingTeacher, setIsSubmittingTeacher] = useState(false);

  // Master Subjects State
  const [subjects, setSubjects] = useState<MasterSubjectItem[]>([]);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);

  // Add/Edit Subject Modal
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<MasterSubjectItem | null>(null);
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [isSubmittingSubject, setIsSubmittingSubject] = useState(false);

  // 1. Fetch Teachers (using documented /api/branch/:branchId/teachers or fallback)
  const fetchTeachers = async () => {
    setIsLoadingTeachers(true);
    const url = branchId
      ? `${API_BASE_URL}/api/branch/${branchId}/teachers`
      : `${API_BASE_URL}/api/teachers`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.teachers)) {
        setTeachers(data.teachers);
      } else if (Array.isArray(data)) {
        setTeachers(data);
      } else if (data.teachers && Array.isArray(data.teachers)) {
        setTeachers(data.teachers);
      } else {
        // Fallback
        const fbRes = await fetch(`${API_BASE_URL}/api/teachers`);
        const fbData = await fbRes.json();
        setTeachers(fbData.teachers || (Array.isArray(fbData) ? fbData : []));
      }
    } catch {
      fetch(`${API_BASE_URL}/api/teachers`)
        .then((r) => r.json())
        .then((d) => setTeachers(d.teachers || []))
        .catch(() => {});
    } finally {
      setIsLoadingTeachers(false);
    }
  };

  // 2. Fetch Master Subjects (/api/branch/:branchId/subjects or fallback /api/subjects)
  const fetchSubjects = async () => {
    setIsLoadingSubjects(true);
    const url = branchId
      ? `${API_BASE_URL}/api/branch/${branchId}/subjects`
      : `${API_BASE_URL}/api/subjects`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.subjects)) {
        setSubjects(data.subjects);
      } else if (Array.isArray(data)) {
        setSubjects(data);
      } else {
        const fbRes = await fetch(`${API_BASE_URL}/api/subjects`);
        const fbData = await fbRes.json();
        setSubjects(fbData.subjects || (Array.isArray(fbData) ? fbData : []));
      }
    } catch {
      fetch(`${API_BASE_URL}/api/subjects`)
        .then((r) => r.json())
        .then((d) => setSubjects(d.subjects || []))
        .catch(() => {});
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
    fetchSubjects();
  }, [branchId]);

  // Handle Search using GET /api/branch/:branchId/teachers/search?q=...
  const handleTeacherSearch = async (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      fetchTeachers();
      return;
    }
    if (branchId) {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/branch/${branchId}/teachers/search?q=${encodeURIComponent(val)}`
        );
        const data = await res.json();
        if (data.success && Array.isArray(data.teachers)) {
          setTeachers(data.teachers);
          return;
        } else if (Array.isArray(data)) {
          setTeachers(data);
          return;
        }
      } catch {
        // Local filtering fallback will apply
      }
    }
  };

  // Filtered lists for instant responsiveness
  const filteredTeachers = useMemo(() => {
    if (!searchQuery.trim()) return teachers;
    const q = searchQuery.toLowerCase();
    return teachers.filter(
      (t) =>
        t.name?.toLowerCase().includes(q) ||
        t.teacher_id?.toLowerCase().includes(q) ||
        t.contact_email?.toLowerCase().includes(q)
    );
  }, [teachers, searchQuery]);

  const filteredSubjects = useMemo(() => {
    if (!subjectSearch.trim()) return subjects;
    const q = subjectSearch.toLowerCase();
    return subjects.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.code?.toLowerCase().includes(q)
    );
  }, [subjects, subjectSearch]);

  // Create or Update Teacher
  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName.trim() || !teacherStaffId.trim() || !teacherEmail.trim()) return;
    setIsSubmittingTeacher(true);

    try {
      if (editingTeacher) {
        // Documented API: PUT /api/teachers/:teacherId
        const res = await fetch(`${API_BASE_URL}/api/teachers/${editingTeacher.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: teacherName.trim(),
            contact_mobile: teacherMobile.trim()
          })
        });
        const data = await res.json();
        if (res.ok && (data.success || data.message)) {
          setIsAddTeacherOpen(false);
          setEditingTeacher(null);
          resetTeacherForm();
          fetchTeachers();
        } else {
          alert(data.message || 'Error updating teacher details.');
        }
      } else {
        // Documented API: POST /api/branch/:branchId/teachers
        const url = branchId
          ? `${API_BASE_URL}/api/branch/${branchId}/teachers`
          : `${API_BASE_URL}/api/teachers`;

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teacher_id: teacherStaffId.trim(),
            name: teacherName.trim(),
            contact_email: teacherEmail.trim(),
            contact_mobile: teacherMobile.trim(),
            password: teacherPassword.trim() || 'TeacherPassword123!'
          })
        });
        const data = await res.json();
        if (res.ok && (data.success || data.teacher || data.id)) {
          setIsAddTeacherOpen(false);
          resetTeacherForm();
          fetchTeachers();
        } else {
          // Fallback legacy
          const fbRes = await fetch(`${API_BASE_URL}/api/teachers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: teacherName.trim(),
              teacherId: teacherStaffId.trim(),
              contactEmail: teacherEmail.trim(),
              contactMobile: teacherMobile.trim()
            })
          });
          const fbData = await fbRes.json();
          if (fbData.success) {
            setIsAddTeacherOpen(false);
            resetTeacherForm();
            fetchTeachers();
            return;
          }
          alert(data.message || 'Error registering faculty member.');
        }
      }
    } catch {
      alert('Error connecting to server.');
    } finally {
      setIsSubmittingTeacher(false);
    }
  };

  const resetTeacherForm = () => {
    setTeacherName('');
    setTeacherStaffId('');
    setTeacherEmail('');
    setTeacherMobile('');
    setTeacherPassword('Teacher123!');
  };

  const handleOpenEditTeacher = (t: TeacherItem) => {
    setEditingTeacher(t);
    setTeacherName(t.name);
    setTeacherStaffId(t.teacher_id);
    setTeacherEmail(t.contact_email);
    setTeacherMobile(t.contact_mobile || '');
    setIsAddTeacherOpen(true);
  };

  // Delete Teacher: DELETE /api/teachers/:teacherId
  const handleDeleteTeacher = async (teacherIdVal: string, nameVal: string) => {
    if (!window.confirm(`Delete faculty member "${nameVal}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/teachers/${teacherIdVal}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchTeachers();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || 'Failed to delete teacher.');
      }
    } catch {
      alert('Error deleting teacher.');
    }
  };

  // Create or Update Master Subject
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim()) return;
    setIsSubmittingSubject(true);

    try {
      if (editingSubject) {
        // Documented API: PUT /api/subjects/:id
        const res = await fetch(`${API_BASE_URL}/api/subjects/${editingSubject.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: subjectName.trim(),
            code: subjectCode.trim() || undefined
          })
        });
        const data = await res.json();
        if (res.ok && (data.success || data.message)) {
          setIsSubjectModalOpen(false);
          setEditingSubject(null);
          setSubjectName('');
          setSubjectCode('');
          fetchSubjects();
        } else {
          alert(data.message || 'Failed to update subject.');
        }
      } else {
        // Documented API: POST /api/branch/:branchId/subjects
        const url = branchId
          ? `${API_BASE_URL}/api/branch/${branchId}/subjects`
          : `${API_BASE_URL}/api/subjects`;

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: subjectName.trim(),
            code: subjectCode.trim() || undefined
          })
        });
        const data = await res.json();
        if (res.ok && (data.success || data.subject || data.id)) {
          setIsSubjectModalOpen(false);
          setSubjectName('');
          setSubjectCode('');
          fetchSubjects();
        } else {
          alert(data.message || 'Failed to create subject.');
        }
      }
    } catch {
      alert('Error connecting to server.');
    } finally {
      setIsSubmittingSubject(false);
    }
  };

  // Delete Subject: DELETE /api/subjects/:id
  const handleDeleteSubject = async (subId: string, subName: string) => {
    if (!window.confirm(`Delete master subject "${subName}" from catalog?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/subjects/${subId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchSubjects();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || 'Unable to delete subject.');
      }
    } catch {
      alert('Error deleting subject.');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Top Bar */}
      <header className="page-top-bar no-print">
        <div className="page-top-bar-text">
          <h1>Faculty & Subject Catalog</h1>
          <p>Institutional staff directory, teacher credentials, and master curriculum subject catalog</p>
        </div>
      </header>

      <div className="page-container">
        {/* Tab Navigation */}
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
            onClick={() => setActiveTab('teachers')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: activeTab === 'teachers' ? '#EFF6FF' : 'transparent',
              color: activeTab === 'teachers' ? '#1D4ED8' : '#64748B',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Users className="size-4" />
            <span>Faculty Directory ({teachers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('subjects')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: activeTab === 'subjects' ? '#EFF6FF' : 'transparent',
              color: activeTab === 'subjects' ? '#1D4ED8' : '#64748B',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <BookOpen className="size-4" />
            <span>Master Subject Catalog ({subjects.length})</span>
          </button>
        </div>

        {/* 1. TEACHERS TAB */}
        {activeTab === 'teachers' && (
          <div>
            {/* Actions Bar */}
            <div className="m-card" style={{ marginBottom: '1.25rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}
              >
                <div style={{ flex: 1, minWidth: '260px', maxWidth: '400px', position: 'relative' }}>
                  <Search
                    className="size-4"
                    style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search by faculty name or staff ID..."
                    value={searchQuery}
                    onChange={(e) => handleTeacherSearch(e.target.value)}
                    style={{ paddingLeft: '2.25rem' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setEditingTeacher(null);
                      resetTeacherForm();
                      setIsAddTeacherOpen(true);
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Plus className="size-4" />
                    <span>Onboard Faculty</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Teachers Table */}
            <div className="m-card">
              {isLoadingTeachers ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                  Loading faculty directory...
                </div>
              ) : filteredTeachers.length === 0 ? (
                <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#64748B' }}>
                  <Users className="size-10 text-slate-300 mx-auto" style={{ margin: '0 auto 0.75rem auto' }} />
                  <p style={{ fontWeight: 600, color: '#334155', margin: 0 }}>No faculty members found.</p>
                  <p style={{ fontSize: '0.8125rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                    Click "Onboard Faculty" above to register school educators.
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                    <thead>
                      <tr
                        style={{
                          background: '#F8FAFC',
                          borderBottom: '1px solid #E2E8F0',
                          color: '#475569',
                          fontSize: '0.75rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}
                      >
                        <th style={{ padding: '0.875rem 1rem' }}>Faculty Name</th>
                        <th style={{ padding: '0.875rem 1rem' }}>Staff ID</th>
                        <th style={{ padding: '0.875rem 1rem' }}>Official Email</th>
                        <th style={{ padding: '0.875rem 1rem' }}>Mobile</th>
                        <th style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTeachers.map((t) => (
                        <tr key={t.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '0.875rem 1rem' }}>
                            <div style={{ fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <GraduationCap className="size-4 text-blue-600" />
                              <span>{t.name}</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.15rem' }}>
                              {t.branches?.name || 'Active Faculty'}
                            </div>
                          </td>
                          <td style={{ padding: '0.875rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: '#1E293B' }}>
                            {t.teacher_id}
                          </td>
                          <td style={{ padding: '0.875rem 1rem', color: '#475569' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Mail className="size-3.5 text-slate-400" />
                              <span>{t.contact_email}</span>
                            </div>
                          </td>
                          <td style={{ padding: '0.875rem 1rem', color: '#475569' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Phone className="size-3.5 text-slate-400" />
                              <span>{t.contact_mobile || '—'}</span>
                            </div>
                          </td>
                          <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleOpenEditTeacher(t)}
                                title="Edit Faculty"
                                style={{ padding: '0.3rem 0.5rem' }}
                              >
                                <Edit2 className="size-3.5 text-slate-600" />
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleDeleteTeacher(t.id, t.name)}
                                title="Delete Faculty"
                                style={{ padding: '0.3rem 0.5rem', color: '#EF4444' }}
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. MASTER SUBJECTS TAB */}
        {activeTab === 'subjects' && (
          <div>
            <div className="m-card" style={{ marginBottom: '1.25rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}
              >
                <div style={{ flex: 1, minWidth: '260px', maxWidth: '400px', position: 'relative' }}>
                  <Search
                    className="size-4"
                    style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search subject catalog or code..."
                    value={subjectSearch}
                    onChange={(e) => setSubjectSearch(e.target.value)}
                    style={{ paddingLeft: '2.25rem' }}
                  />
                </div>

                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setEditingSubject(null);
                    setSubjectName('');
                    setSubjectCode('');
                    setIsSubjectModalOpen(true);
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Plus className="size-4" />
                  <span>New Master Subject</span>
                </button>
              </div>
            </div>

            {/* Subjects Table */}
            <div className="m-card">
              {isLoadingSubjects ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                  Loading curriculum catalog...
                </div>
              ) : filteredSubjects.length === 0 ? (
                <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#64748B' }}>
                  <BookOpen className="size-10 text-slate-300 mx-auto" style={{ margin: '0 auto 0.75rem auto' }} />
                  <p style={{ fontWeight: 600, color: '#334155', margin: 0 }}>No master subjects found.</p>
                  <p style={{ fontSize: '0.8125rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                    Click "New Master Subject" to define institutional curriculum courses.
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                    <thead>
                      <tr
                        style={{
                          background: '#F8FAFC',
                          borderBottom: '1px solid #E2E8F0',
                          color: '#475569',
                          fontSize: '0.75rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}
                      >
                        <th style={{ padding: '0.875rem 1rem' }}>Subject Name</th>
                        <th style={{ padding: '0.875rem 1rem' }}>Course Code</th>
                        <th style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubjects.map((s) => (
                        <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '0.875rem 1rem' }}>
                            <div style={{ fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <BookOpen className="size-4 text-blue-600" />
                              <span>{s.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: '0.875rem 1rem' }}>
                            {s.code ? (
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '0.2rem 0.5rem',
                                  background: '#EFF6FF',
                                  color: '#1E40AF',
                                  borderRadius: '4px',
                                  fontFamily: 'monospace',
                                  fontWeight: 600
                                }}
                              >
                                {s.code}
                              </span>
                            ) : (
                              <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>Standard Course</span>
                            )}
                          </td>
                          <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setEditingSubject(s);
                                  setSubjectName(s.name);
                                  setSubjectCode(s.code || '');
                                  setIsSubjectModalOpen(true);
                                }}
                                title="Edit Subject"
                                style={{ padding: '0.3rem 0.5rem' }}
                              >
                                <Edit2 className="size-3.5 text-slate-600" />
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleDeleteSubject(s.id, s.name)}
                                title="Delete Subject"
                                style={{ padding: '0.3rem 0.5rem', color: '#EF4444' }}
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Onboard / Edit Teacher Modal */}
      {isAddTeacherOpen && (
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
          <div className="m-card" style={{ width: '100%', maxWidth: '460px' }}>
            <div className="m-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <GraduationCap className="size-5 text-blue-600" />
                <h3 className="m-card-title">
                  {editingTeacher ? 'Update Faculty Details' : 'Onboard Faculty Member'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddTeacherOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  Full Name *
                </label>
                <input
                  required
                  type="text"
                  className="form-input"
                  placeholder="e.g. Dr. Suresh Raina"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                />
              </div>

              {!editingTeacher && (
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                    Staff / Teacher ID *
                  </label>
                  <input
                    required
                    type="text"
                    className="form-input"
                    placeholder="e.g. TCH-001"
                    value={teacherStaffId}
                    onChange={(e) => setTeacherStaffId(e.target.value)}
                  />
                </div>
              )}

              {!editingTeacher && (
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                    Official Email *
                  </label>
                  <input
                    required
                    type="email"
                    className="form-input"
                    placeholder="raina@school.edu"
                    value={teacherEmail}
                    onChange={(e) => setTeacherEmail(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  Mobile Number
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="+91 9876543240"
                  value={teacherMobile}
                  onChange={(e) => setTeacherMobile(e.target.value)}
                />
              </div>

              {!editingTeacher && (
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                    Initial Portal Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <KeyRound
                      className="size-4"
                      style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      style={{ paddingLeft: '2.25rem' }}
                      value={teacherPassword}
                      onChange={(e) => setTeacherPassword(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAddTeacherOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTeacher}
                  className="btn btn-primary"
                >
                  {isSubmittingTeacher ? 'Saving...' : editingTeacher ? 'Save Changes' : 'Complete Onboarding'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / Edit Master Subject Modal */}
      {isSubjectModalOpen && (
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
          <div className="m-card" style={{ width: '100%', maxWidth: '440px' }}>
            <div className="m-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <BookOpen className="size-5 text-blue-600" />
                <h3 className="m-card-title">
                  {editingSubject ? 'Edit Master Subject' : 'Add Master Subject'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSubjectModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubject} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  Subject Name *
                </label>
                <input
                  required
                  type="text"
                  className="form-input"
                  placeholder="e.g. Physics & Applied Mechanics"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  Subject Code (Optional)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. PHY-10A"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsSubjectModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSubject}
                  className="btn btn-primary"
                >
                  {isSubmittingSubject ? 'Saving...' : editingSubject ? 'Save Changes' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
