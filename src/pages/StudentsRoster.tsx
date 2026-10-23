import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  Plus,
  Upload,
  Search,
  MessageSquare,
  Download,
  X,
  KeyRound,
  FileText,
  Trash2,
  Edit2,
  Phone,
  Mail
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';

interface Student {
  id: string;
  name: string;
  roll_no?: string;
  roll_number?: string;
  admission_no?: string;
  contact_email?: string;
  contact_mobile?: string;
  parent_name?: string;
  parent_contact?: string;
  class_id?: string;
  section_id?: string;
  parent_id?: string;
  classes?: { id: string; name: string };
  section?: { id: string; section_name: string };
  parents?: { id: string; name: string; phone_number: string; preferred_channel?: string };
}

interface ClassItem {
  id: string;
  name: string;
  section?: string;
  sections?: { id: string; section_name: string }[];
}

interface SectionOption {
  id: string;
  section_name: string;
  strength?: number;
}

interface StudentSubmission {
  id: string;
  assignment_id: string;
  assignment_title?: string;
  assignment?: { id: string; title: string; total_marks?: number };
  score?: number;
  total_score?: number;
  percentage?: number;
  status: string;
  submitted_at?: string;
  created_at?: string;
}

export default function StudentsRoster() {
  const [searchParams] = useSearchParams();
  const initialSectionId = searchParams.get('sectionId') || '';

  const { currentBranchId, branches } = useAuth();
  const branchId = currentBranchId || (branches.length > 0 ? branches[0].id : '');

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [availableSections, setAvailableSections] = useState<SectionOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('ALL');
  const [selectedSectionId, setSelectedSectionId] = useState(initialSectionId || 'ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Password Reset Modal
  const [passwordModalStudent, setPasswordModalStudent] = useState<Student | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('StudentPassword123!');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Submissions Modal
  const [viewSubmissionsStudent, setViewSubmissionsStudent] = useState<Student | null>(null);
  const [submissionsList, setSubmissionsList] = useState<StudentSubmission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);

  // Add / Edit Form State
  const [formName, setFormName] = useState('');
  const [formRoll, setFormRoll] = useState('');
  const [formAdm, setFormAdm] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formParentName, setFormParentName] = useState('');
  const [formParentPhone, setFormParentPhone] = useState('');
  const [formPassword, setFormPassword] = useState('StudentPassword123!');
  const [formSectionId, setFormSectionId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk CSV
  const [csvContent, setCsvContent] = useState('');
  const [bulkStatus, setBulkStatus] = useState<string | null>(null);
  const [bulkSectionId, setBulkSectionId] = useState('');

  // 1. Fetch Classes
  const fetchClasses = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/classes`);
      const data = await res.json();
      if (data.success && Array.isArray(data.classes)) {
        setClasses(data.classes);
      } else if (Array.isArray(data)) {
        setClasses(data);
      }
    } catch {}
  };

  // 2. Fetch Sections when Class changes
  const fetchSectionsForClass = async (cId: string) => {
    if (!cId || cId === 'ALL') {
      setAvailableSections([]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/classes/${cId}/sections`);
      const data = await res.json();
      if (data.success && Array.isArray(data.sections)) {
        setAvailableSections(data.sections);
      } else if (Array.isArray(data)) {
        setAvailableSections(data);
      } else {
        setAvailableSections([]);
      }
    } catch {
      setAvailableSections([]);
    }
  };

  // 3. Fetch Students based on Section or Branch
  const fetchStudents = async () => {
    setIsLoading(true);

    if (selectedSectionId && selectedSectionId !== 'ALL') {
      // Documented API: GET /api/sections/:sectionId/students
      try {
        const res = await fetch(`${API_BASE_URL}/api/sections/${selectedSectionId}/students`);
        const data = await res.json();
        const list = data.students || (Array.isArray(data) ? data : []);
        setStudents(list);
        setIsLoading(false);
        return;
      } catch {}
    }

    // Fallback: Global search or legacy /api/students
    try {
      const url = branchId
        ? `${API_BASE_URL}/api/branch/${branchId}/students/search?q=`
        : `${API_BASE_URL}/api/students`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.students)) {
        setStudents(data.students);
      } else if (Array.isArray(data)) {
        setStudents(data);
      } else {
        // Final fallback
        const fbRes = await fetch(`${API_BASE_URL}/api/students`);
        const fbData = await fbRes.json();
        setStudents(fbData.students || (Array.isArray(fbData) ? fbData : []));
      }
    } catch {
      fetch(`${API_BASE_URL}/api/students`)
        .then((r) => r.json())
        .then((d) => setStudents(d.students || []))
        .catch(() => {});
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (initialSectionId) {
      setSelectedSectionId(initialSectionId);
      setBulkSectionId(initialSectionId);
      setFormSectionId(initialSectionId);
    }
  }, [initialSectionId]);

  useEffect(() => {
    fetchStudents();
  }, [selectedSectionId, branchId]);

  const handleClassFilterChange = (cId: string) => {
    setSelectedClassId(cId);
    setSelectedSectionId('ALL');
    fetchSectionsForClass(cId);
  };

  // Live Search with GET /api/branch/:branchId/students/search?q=...
  const handleSearchChange = async (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      fetchStudents();
      return;
    }
    if (branchId) {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/branch/${branchId}/students/search?q=${encodeURIComponent(val)}`
        );
        const data = await res.json();
        if (data.success && Array.isArray(data.students)) {
          setStudents(data.students);
          return;
        } else if (Array.isArray(data)) {
          setStudents(data);
          return;
        }
      } catch {}
    }
  };

  // Filtered Students
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter((s) => {
      const roll = s.roll_no || s.roll_number || '';
      const adm = s.admission_no || '';
      const name = s.name || '';
      return (
        name.toLowerCase().includes(q) ||
        roll.toLowerCase().includes(q) ||
        adm.toLowerCase().includes(q)
      );
    });
  }, [students, searchQuery]);

  // Create or Update Student
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setIsSubmitting(true);

    try {
      if (editingStudent) {
        // Documented API: PUT /api/students/:studentId
        const res = await fetch(`${API_BASE_URL}/api/students/${editingStudent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName.trim(),
            contact_mobile: formMobile.trim() || undefined,
            parent_contact: formParentPhone.trim() || undefined
          })
        });
        const data = await res.json();
        if (res.ok && (data.success || data.message)) {
          setIsAddModalOpen(false);
          setEditingStudent(null);
          resetForm();
          fetchStudents();
        } else {
          alert(data.message || 'Error updating student.');
        }
      } else {
        // Enrollment requires a target section
        const targetSection = formSectionId || selectedSectionId;
        if (!targetSection || targetSection === 'ALL') {
          // Fallback legacy endpoint
          const res = await fetch(`${API_BASE_URL}/api/students`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: formName.trim(),
              rollNumber: formRoll.trim(),
              admissionNo: formAdm.trim(),
              classId: selectedClassId !== 'ALL' ? selectedClassId : null,
              parentName: formParentName.trim(),
              parentPhone: formParentPhone.trim()
            })
          });
          const data = await res.json();
          if (data.success) {
            setIsAddModalOpen(false);
            resetForm();
            fetchStudents();
            return;
          }
          alert(data.message || 'Please select a specific section to enroll this student.');
          setIsSubmitting(false);
          return;
        }

        // Documented API: POST /api/sections/:sectionId/students
        const res = await fetch(`${API_BASE_URL}/api/sections/${targetSection}/students`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            admission_no: formAdm.trim() || `ADM-${Date.now().toString().slice(-5)}`,
            roll_no: formRoll.trim() || '1',
            name: formName.trim(),
            contact_email: formEmail.trim() || undefined,
            contact_mobile: formMobile.trim() || undefined,
            parent_name: formParentName.trim() || undefined,
            parent_contact: formParentPhone.trim() || undefined,
            password: formPassword.trim() || 'StudentPassword123!'
          })
        });
        const data = await res.json();
        if (res.ok && (data.success || data.student || data.id)) {
          setIsAddModalOpen(false);
          resetForm();
          fetchStudents();
        } else {
          alert(data.message || 'Unable to enroll student.');
        }
      }
    } catch {
      alert('Error connecting to server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormRoll('');
    setFormAdm('');
    setFormEmail('');
    setFormMobile('');
    setFormParentName('');
    setFormParentPhone('');
    setFormPassword('StudentPassword123!');
  };

  const handleOpenEdit = (s: Student) => {
    setEditingStudent(s);
    setFormName(s.name);
    setFormRoll(s.roll_no || s.roll_number || '');
    setFormAdm(s.admission_no || '');
    setFormEmail(s.contact_email || '');
    setFormMobile(s.contact_mobile || '');
    setFormParentName(s.parent_name || s.parents?.name || '');
    setFormParentPhone(s.parent_contact || s.parents?.phone_number || '');
    setIsAddModalOpen(true);
  };

  // Delete Student: DELETE /api/students/:studentId
  const handleDeleteStudent = async (studentId: string, sName: string) => {
    if (!window.confirm(`Delete student record for "${sName}"? This will detach all submissions.`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/students/${studentId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchStudents();
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.message || 'Unable to delete student.');
      }
    } catch {
      alert('Error deleting student.');
    }
  };

  // Reset Student Password: PUT /api/students/:studentId/password
  const handleConfirmPasswordReset = async () => {
    if (!passwordModalStudent || !newPasswordVal.trim()) return;
    setIsResettingPassword(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/students/${passwordModalStudent.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: newPasswordVal.trim() })
      });
      const data = await res.json();
      if (res.ok && (data.success || data.message)) {
        alert(`✅ Password updated successfully for ${passwordModalStudent.name}!`);
        setPasswordModalStudent(null);
        setNewPasswordVal('StudentPassword123!');
      } else {
        alert(data.message || 'Unable to reset student password.');
      }
    } catch {
      alert('Server communication error.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // View Student Submissions: GET /api/students/:studentId/submissions
  const handleOpenSubmissions = async (s: Student) => {
    setViewSubmissionsStudent(s);
    setIsLoadingSubmissions(true);
    setSubmissionsList([]);
    try {
      const res = await fetch(`${API_BASE_URL}/api/students/${s.id}/submissions`);
      const data = await res.json();
      const list = data.submissions || (Array.isArray(data) ? data : []);
      setSubmissionsList(list);
    } catch {
      setSubmissionsList([]);
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  // Bulk Upload: POST /api/sections/:sectionId/students/bulk or fallback /api/students/bulk
  const handleBulkUpload = async () => {
    if (!csvContent.trim()) return;
    setIsSubmitting(true);
    setBulkStatus(null);

    const targetSection = bulkSectionId || selectedSectionId;

    // Parse CSV lines to structured objects
    const lines = csvContent.trim().split(/\r?\n/).filter(Boolean);
    const studentObjects = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim());
      if (cols.length >= 2) {
        studentObjects.push({
          name: cols[0] || 'Student',
          roll_no: cols[1] || `${i}`,
          admission_no: cols[2] || `ADM-${Date.now().toString().slice(-4)}-${i}`,
          parent_name: cols[3] || undefined,
          parent_contact: cols[4] || undefined,
          contact_email: cols[5] || undefined,
          contact_mobile: cols[4] || undefined,
          password: 'Password123!'
        });
      }
    }

    try {
      if (targetSection && targetSection !== 'ALL') {
        // Documented API: POST /api/sections/:sectionId/students/bulk
        const res = await fetch(`${API_BASE_URL}/api/sections/${targetSection}/students/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ students: studentObjects })
        });
        const data = await res.json();
        if (res.ok && (data.success || data.count || data.created)) {
          setBulkStatus(`✅ Successfully enrolled ${studentObjects.length} student(s) into Section!`);
          fetchStudents();
          setTimeout(() => {
            setIsBulkModalOpen(false);
            setCsvContent('');
            setBulkStatus(null);
          }, 1800);
          return;
        }
      }

      // Legacy fallback
      const fbRes = await fetch(`${API_BASE_URL}/api/students/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: csvContent })
      });
      const fbData = await fbRes.json();
      if (fbData.success) {
        setBulkStatus(`✅ Successfully enrolled ${fbData.successful || studentObjects.length} student(s)!`);
        fetchStudents();
        setTimeout(() => {
          setIsBulkModalOpen(false);
          setCsvContent('');
          setBulkStatus(null);
        }, 1800);
      } else {
        setBulkStatus(`❌ Error: ${fbData.message || 'Unable to parse batch.'}`);
      }
    } catch {
      setBulkStatus('❌ Server communication error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadSampleCsv = () => {
    const sample = `name,roll_no,admission_no,parent_name,parent_phone,contact_email\nAarav Patel,101,ADM-2026-001,Vikram Patel,+919876543210,aarav@school.edu\nDiya Sharma,102,ADM-2026-002,Sunita Sharma,+919876543211,diya@school.edu\nRohan Verma,103,ADM-2026-003,Amit Verma,+919876543212,rohan@school.edu`;
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'PAATAM_Students_Roster_Template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvContent(String(event.target?.result || ''));
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Header */}
      <header className="page-top-bar no-print">
        <div className="page-top-bar-text">
          <h1>Student Roster & Student Portal Directory</h1>
          <p>Section-level cohorts, admission credentials, password resets, and exam performance histories</p>
        </div>
      </header>

      <div className="page-container">
        {/* Action Header Card */}
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
            {/* Search & Dropdown Filters */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', flex: 1 }}>
              <div style={{ position: 'relative', minWidth: '220px', flex: 1, maxWidth: '320px' }}>
                <Search
                  className="size-4 text-slate-400"
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  placeholder="Search name, roll, admission no..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '2rem' }}
                />
              </div>

              {/* Class Filter */}
              <select
                value={selectedClassId}
                onChange={(e) => handleClassFilterChange(e.target.value)}
                className="form-input"
                style={{ maxWidth: '180px' }}
              >
                <option value="ALL">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Section Filter */}
              {availableSections.length > 0 && (
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  className="form-input"
                  style={{ maxWidth: '160px' }}
                >
                  <option value="ALL">All Sections</option>
                  {availableSections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      Section {sec.section_name} ({sec.strength || 0})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setBulkSectionId(selectedSectionId !== 'ALL' ? selectedSectionId : '');
                  setIsBulkModalOpen(true);
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Upload className="size-4" />
                <span>Bulk CSV Import</span>
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setEditingStudent(null);
                  resetForm();
                  setFormSectionId(selectedSectionId !== 'ALL' ? selectedSectionId : '');
                  setIsAddModalOpen(true);
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Plus className="size-4" />
                <span>Enroll Student</span>
              </button>
            </div>
          </div>
        </div>

        {/* Table of Students */}
        <div className="m-card">
          {isLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
              Loading student roster...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#64748B' }}>
              <Users className="size-10 text-slate-300 mx-auto" style={{ margin: '0 auto 0.75rem auto' }} />
              <p style={{ fontWeight: 600, color: '#334155', margin: 0 }}>No students enrolled in this view.</p>
              <p style={{ fontSize: '0.8125rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                Select a class section above or click "Enroll Student" to register learners.
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
                    <th style={{ padding: '0.875rem 1rem' }}>Student Profile</th>
                    <th style={{ padding: '0.875rem 1rem' }}>Admission No</th>
                    <th style={{ padding: '0.875rem 1rem' }}>Roll No</th>
                    <th style={{ padding: '0.875rem 1rem' }}>Class & Section</th>
                    <th style={{ padding: '0.875rem 1rem' }}>Contact & Parent</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => {
                    const roll = student.roll_no || student.roll_number || '—';
                    const adm = student.admission_no || '—';
                    const parentName = student.parent_name || student.parents?.name;
                    const parentPhone = student.parent_contact || student.parents?.phone_number;

                    return (
                      <tr key={student.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <div style={{ fontWeight: 700, color: '#0F172A' }}>{student.name}</div>
                          {student.contact_email && (
                            <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Mail className="size-3 text-slate-400" />
                              <span>{student.contact_email}</span>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.875rem 1rem', fontFamily: 'monospace', color: '#475569', fontWeight: 600 }}>
                          {adm}
                        </td>
                        <td style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>{roll}</td>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.5rem',
                              background: '#EFF6FF',
                              color: '#1E40AF',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600
                            }}
                          >
                            {student.classes?.name || 'Class'} {student.section?.section_name ? `- ${student.section.section_name}` : ''}
                          </span>
                        </td>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <div style={{ fontWeight: 600, color: '#1E293B', fontSize: '0.8125rem' }}>
                            {parentName || 'Parent not linked'}
                          </div>
                          {parentPhone ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#059669', fontSize: '0.75rem', fontWeight: 600, marginTop: '0.15rem' }}>
                              <MessageSquare className="size-3" />
                              <span>{parentPhone}</span>
                            </div>
                          ) : student.contact_mobile ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#64748B', fontSize: '0.75rem' }}>
                              <Phone className="size-3" />
                              <span>{student.contact_mobile}</span>
                            </div>
                          ) : null}
                        </td>
                        <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenSubmissions(student)}
                              title="Exam Submissions"
                              style={{ padding: '0.3rem 0.5rem' }}
                            >
                              <FileText className="size-3.5 text-blue-600" />
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setPasswordModalStudent(student);
                                setNewPasswordVal('StudentPassword123!');
                              }}
                              title="Reset Password"
                              style={{ padding: '0.3rem 0.5rem' }}
                            >
                              <KeyRound className="size-3.5 text-amber-600" />
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenEdit(student)}
                              title="Edit Student"
                              style={{ padding: '0.3rem 0.5rem' }}
                            >
                              <Edit2 className="size-3.5 text-slate-600" />
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleDeleteStudent(student.id, student.name)}
                              title="Delete Student"
                              style={{ padding: '0.3rem 0.5rem', color: '#EF4444' }}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Enroll / Edit Student Modal */}
      {isAddModalOpen && (
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
          <div className="m-card" style={{ width: '100%', maxWidth: '520px' }}>
            <div className="m-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="m-card-title">
                {editingStudent ? 'Edit Student Profile' : 'Enroll Student into Cohort'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  Student Full Name *
                </label>
                <input
                  required
                  type="text"
                  className="form-input"
                  placeholder="e.g. Aarav Sharma"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              {!editingStudent && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                      Admission No *
                    </label>
                    <input
                      required
                      type="text"
                      className="form-input"
                      placeholder="ADM-2026-001"
                      value={formAdm}
                      onChange={(e) => setFormAdm(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                      Roll No *
                    </label>
                    <input
                      required
                      type="text"
                      className="form-input"
                      placeholder="101"
                      value={formRoll}
                      onChange={(e) => setFormRoll(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                    Student Email
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="aarav@school.edu"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                    Student Mobile
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="9876543250"
                    value={formMobile}
                    onChange={(e) => setFormMobile(e.target.value)}
                  />
                </div>
              </div>

              {/* Section Target */}
              {!editingStudent && availableSections.length > 0 && (
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                    Target Section *
                  </label>
                  <select
                    required
                    className="form-input"
                    value={formSectionId}
                    onChange={(e) => setFormSectionId(e.target.value)}
                  >
                    <option value="">-- Choose Section --</option>
                    {availableSections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        Section {sec.section_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Parent Details */}
              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '0.75rem' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.4rem' }}>
                  Parent / Guardian Contact
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Parent Name (Rajesh Sharma)"
                    value={formParentName}
                    onChange={(e) => setFormParentName(e.target.value)}
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="WhatsApp Phone (9876543251)"
                    value={formParentPhone}
                    onChange={(e) => setFormParentPhone(e.target.value)}
                  />
                </div>
              </div>

              {!editingStudent && (
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                    Initial Password
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                >
                  {isSubmitting ? 'Saving...' : editingStudent ? 'Save Changes' : 'Confirm Enrollment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Dialog (PUT /api/students/:studentId/password) */}
      {passwordModalStudent && (
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
          <div className="m-card" style={{ width: '100%', maxWidth: '420px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <KeyRound className="size-5 text-amber-600" />
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0F172A' }}>
                  Reset Student Password
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalStudent(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X className="size-5" />
              </button>
            </div>

            <p style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: 0, marginBottom: '1rem' }}>
              Update student login credentials for <strong>{passwordModalStudent.name}</strong> ({passwordModalStudent.admission_no}).
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                New Password *
              </label>
              <input
                type="text"
                className="form-input"
                value={newPasswordVal}
                onChange={(e) => setNewPasswordVal(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPasswordModalStudent(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isResettingPassword || !newPasswordVal.trim()}
                onClick={handleConfirmPasswordReset}
                className="btn btn-primary"
              >
                {isResettingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submissions History Modal (GET /api/students/:studentId/submissions) */}
      {viewSubmissionsStudent && (
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
          <div className="m-card" style={{ width: '100%', maxWidth: '620px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FileText className="size-5 text-blue-600" />
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0F172A' }}>
                  Exam Submissions - {viewSubmissionsStudent.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewSubmissionsStudent(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X className="size-5" />
              </button>
            </div>

            <p style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: 0, marginBottom: '1rem' }}>
              Historical papers submitted by this student across all academic cycles.
            </p>

            {isLoadingSubmissions ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
                Fetching submission records...
              </div>
            ) : submissionsList.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8', fontStyle: 'italic' }}>
                No exam submissions recorded for this student yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                {submissionsList.map((sub) => {
                  const title = sub.assignment_title || sub.assignment?.title || 'Exam Assignment';
                  const score = sub.score ?? sub.total_score ?? '—';
                  const total = sub.assignment?.total_marks || 100;

                  return (
                    <div
                      key={sub.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem 1rem',
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '6px'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0F172A' }}>{title}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                          Status: <strong>{sub.status}</strong>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1D4ED8' }}>
                          {score} / {total}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem', borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setViewSubmissionsStudent(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk CSV Modal */}
      {isBulkModalOpen && (
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
          <div className="m-card" style={{ width: '100%', maxWidth: '580px' }}>
            <div className="m-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 className="m-card-title">Bulk Student CSV Onboarding</h3>
                <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '0.1rem 0 0 0' }}>
                  Upload a spreadsheet of 50 to 500 students with parent WhatsApp details
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <X className="size-5" />
              </button>
            </div>

            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {availableSections.length > 0 && (
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                    Enroll into Section
                  </label>
                  <select
                    className="form-input"
                    value={bulkSectionId}
                    onChange={(e) => setBulkSectionId(e.target.value)}
                  >
                    <option value="">-- Choose Target Section --</option>
                    {availableSections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        Section {sec.section_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem',
                  background: '#F8FAFC',
                  borderRadius: '0.5rem',
                  border: '1px solid #E2E8F0'
                }}
              >
                <div style={{ fontSize: '0.8125rem', color: '#475569' }}>
                  Need the standard column layout?
                </div>
                <button
                  type="button"
                  onClick={downloadSampleCsv}
                  className="btn btn-secondary btn-sm"
                  style={{ gap: '0.3rem', display: 'inline-flex', alignItems: 'center' }}
                >
                  <Download className="size-3.5" />
                  <span>Download Sample CSV</span>
                </button>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.4rem' }}>
                  Select CSV File
                </label>
                <input type="file" accept=".csv,text/csv" onChange={handleCsvFilePick} className="form-input" />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.4rem' }}>
                  Or Paste Raw CSV Data Below
                </label>
                <textarea
                  rows={5}
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  placeholder={`name,roll_no,admission_no,parent_name,parent_phone,contact_email\nAarav Patel,101,ADM-001,Vikram Patel,+919876543210,parent@gmail.com`}
                  className="form-input"
                  style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                />
              </div>

              {bulkStatus && (
                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.8125rem',
                    background: bulkStatus.includes('✅') ? '#ECFDF5' : '#FEF2F2',
                    color: bulkStatus.includes('✅') ? '#065F46' : '#991B1B'
                  }}
                >
                  {bulkStatus}
                </div>
              )}

              <button
                type="button"
                onClick={handleBulkUpload}
                disabled={isSubmitting || !csvContent.trim()}
                className="btn btn-primary"
                style={{ justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Upload className="size-4" />
                <span>{isSubmitting ? 'Enrolling Batch...' : 'Upload & Enroll Cohort'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
