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
  sections?: { id: string; section_name: string; strength?: number }[];
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

const cleanSecName = (raw: string) => {
  if (!raw) return 'A';
  return String(raw).replace(/^Section\s+/i, '').trim() || 'A';
};

export default function StudentsRoster() {
  const [searchParams] = useSearchParams();
  const initialSectionId = searchParams.get('sectionId') || '';

  const { currentBranchId, branches, role } = useAuth();
  const isBranchAdmin = ['ADMIN', 'BRANCH_ADMIN', 'DEAN', 'PRINCIPAL', 'VICE_PRINCIPAL'].includes(role?.toUpperCase());
  const isTeacher = role?.toUpperCase() === 'TEACHER';
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
  const [formClassId, setFormClassId] = useState('');
  const [formSectionId, setFormSectionId] = useState('');
  const [modalSections, setModalSections] = useState<SectionOption[]>([]);
  const [isLoadingModalSections, setIsLoadingModalSections] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk CSV
  const [csvContent, setCsvContent] = useState('');
  const [bulkStatus, setBulkStatus] = useState<string | null>(null);
  const [bulkClassId, setBulkClassId] = useState('');
  const [bulkSectionId, setBulkSectionId] = useState('');
  const [bulkModalSections, setBulkModalSections] = useState<SectionOption[]>([]);
  const [isLoadingBulkSections, setIsLoadingBulkSections] = useState(false);

  // 1. Fetch Classes from documented academic-year flow
  const fetchClasses = async (): Promise<ClassItem[]> => {
    let loadedClasses: ClassItem[] = [];

    // Strategy A: Academic Years -> Classes (Classes tied to session)
    if (loadedClasses.length === 0) {
      try {
        let ayList: any[] = [];
        if (branchId) {
          const ayRes = await fetch(`${API_BASE_URL}/api/branch/${branchId}/academic-years`);
          if (ayRes.ok) {
            const ayData = await ayRes.json();
            ayList = Array.isArray(ayData.data)
              ? ayData.data
              : Array.isArray(ayData.academicYears)
              ? ayData.academicYears
              : [];
          }
        }
        const activeAy = ayList.find((ay: any) => ay.is_active) || ayList[0];
        if (activeAy?.id) {
          const cRes = await fetch(`${API_BASE_URL}/api/academic-years/${activeAy.id}/classes`);
          if (cRes.ok) {
            const cData = await cRes.json();
            const list = Array.isArray(cData.data)
              ? cData.data
              : Array.isArray(cData.classes)
              ? cData.classes
              : Array.isArray(cData)
              ? cData
              : [];
            if (list.length > 0) {
              loadedClasses = list;
            }
          }
        }
      } catch {}
    }

    // Strategy B: Teacher Dashboard (if logged in as Teacher/Class Incharge)
    if (loadedClasses.length === 0) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/teacher/dashboard`);
        if (res.ok) {
          const data = await res.json();
          let allocations = Array.isArray(data?.data?.teaching_allocations)
            ? data.data.teaching_allocations
            : (Array.isArray(data?.data?.assigned_sections) ? data.data.assigned_sections : []);
          const classTeacherSecs = Array.isArray(data?.data?.class_teacher_sections)
            ? data.data.class_teacher_sections
            : [];

          const resolvedTeacherId = String(data?.data?.teacher_id || '').trim();
          const resolvedTeacherName = String(data?.data?.teacher_name || '').toLowerCase().trim();

          let allocationsValidated = false;
          try {
            const uniqueSectionIds = Array.from(new Set(allocations.map((a: any) => String(a.section_id)).filter(Boolean)));
            const sectionRows = await Promise.all(uniqueSectionIds.map(async (sectionId) => {
              try {
                const sr = await fetch(`${API_BASE_URL}/api/sections/${sectionId}/subjects-teachers`);
                if (!sr.ok) return { sectionId, rows: [] as any[] };
                const sj = await sr.json().catch(() => ({}));
                const rows = Array.isArray(sj.data)
                  ? sj.data
                  : (Array.isArray(sj.subjectsTeachers) ? sj.subjectsTeachers : []);
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

          const classMap = new Map<string, ClassItem>();
          if (classTeacherSecs.length > 0) {
            allocations = allocations.filter((a: any) =>
              classTeacherSecs.some((ct: any) =>
                String(ct.section_id) === String(a.section_id) ||
                cleanSecName(ct.section_name) === cleanSecName(a.section_name)
              )
            );
          }

          for (const alloc of allocations) {
            const cId = String(alloc.class_id || alloc.class_name || 'cls_1');
            if (!classMap.has(cId)) {
              classMap.set(cId, {
                id: cId,
                name: alloc.class_name || 'Grade 10',
                sections: []
              });
            }
            const entry = classMap.get(cId)!;
            if (!entry.sections) entry.sections = [];
            if (!entry.sections.some((s) => String(s.id) === String(alloc.section_id))) {
              entry.sections.push({
                id: String(alloc.section_id),
                section_name: cleanSecName(alloc.section_name),
                strength: alloc.students_count || 0
              });
            }
          }

          for (const ct of classTeacherSecs) {
            const cName = ct.class_name || 'Grade 10';
            let entry = Array.from(classMap.values()).find((c) => c.name === cName);
            if (!entry) {
              const cId = `cls_${ct.section_id}`;
              entry = {
                id: cId,
                name: cName,
                sections: [
                  {
                    id: String(ct.section_id),
                    section_name: ct.section_name || 'A',
                    strength: ct.students_count || 0
                  }
                ]
              };
              classMap.set(cId, entry);
            } else {
              if (!entry.sections) entry.sections = [];
              if (!entry.sections.some((s) => String(s.id) === String(ct.section_id))) {
                entry.sections.push({
                  id: String(ct.section_id),
                  section_name: ct.section_name || 'A',
                  strength: ct.students_count || 0
                });
              }
            }
          }

          loadedClasses = Array.from(classMap.values());
        }
      } catch {}
    }

    // Strategy C: Cached school classes in localStorage
    if (loadedClasses.length === 0) {
      try {
        const cached = localStorage.getItem('paatam_school_classes');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            loadedClasses = parsed;
          }
        }
      } catch {}
    }

    if (loadedClasses.length > 0) {
      setClasses(loadedClasses);
    }
    return loadedClasses;
  };

  // Helper to fetch sections for a given class ID
  const getSectionsForClass = async (cId: string, currentClassesList?: ClassItem[]): Promise<SectionOption[]> => {
    if (!cId || cId === 'ALL') return [];

    // For Teachers: strictly respect assigned sections in memory rather than all class sections
    if (isTeacher) {
      const sourceClasses = currentClassesList && currentClassesList.length > 0 ? currentClassesList : classes;
      const foundClass = sourceClasses.find((c) => String(c.id) === String(cId) || c.name === cId);
      if (foundClass?.sections && Array.isArray(foundClass.sections) && foundClass.sections.length > 0) {
        return foundClass.sections;
      }
    }

    // 1. Check API: GET /api/classes/:classId/sections (handles data.data, data.sections, array)
    try {
      const res = await fetch(`${API_BASE_URL}/api/classes/${cId}/sections`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.data)
          ? data.data
          : Array.isArray(data.sections)
          ? data.sections
          : Array.isArray(data)
          ? data
          : [];
        if (list.length > 0) {
          return list;
        }
      }
    } catch {}

    // 2. Check if class object in memory already has sections
    const sourceClasses = currentClassesList && currentClassesList.length > 0 ? currentClassesList : classes;
    const foundClass = sourceClasses.find((c) => String(c.id) === String(cId));
    if (foundClass?.sections && Array.isArray(foundClass.sections) && foundClass.sections.length > 0) {
      return foundClass.sections;
    }

    // 3. Fallback from localStorage or section allocation keys
    try {
      const cached = localStorage.getItem(`paatam_sections_${cId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    return [];
  };

  // 2. Fetch Sections when Class changes
  const fetchSectionsForClass = async (cId: string) => {
    const secs = await getSectionsForClass(cId);
    setAvailableSections(secs);
  };

  // 3. Fetch Students based on Section or Branch
  const fetchStudents = async () => {
    setIsLoading(true);

    if (selectedSectionId && selectedSectionId !== 'ALL') {
      // Documented API: GET /api/sections/:sectionId/students
      try {
        const res = await fetch(`${API_BASE_URL}/api/sections/${selectedSectionId}/students`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data.data)
            ? data.data
            : (Array.isArray(data.students) ? data.students : (Array.isArray(data) ? data : []));
          setStudents(list);
          setIsLoading(false);
          return;
        }
      } catch {}
    }

    // If a class is selected, fetch students from its sections
    if (selectedClassId && selectedClassId !== 'ALL' && availableSections.length > 0) {
      try {
        const allSecStudents: Student[] = [];
        for (const sec of availableSections) {
          const sRes = await fetch(`${API_BASE_URL}/api/sections/${sec.id}/students`);
          if (sRes.ok) {
            const sData = await sRes.json();
              const list = Array.isArray(sData.data)
                ? sData.data
                : (Array.isArray(sData.students) ? sData.students : (Array.isArray(sData) ? sData : []));
            allSecStudents.push(...list);
          }
        }
        setStudents(allSecStudents);
      } catch {}
    } else {
      setStudents([]);
    }

    setIsLoading(false);
  };

  const handleOpenAddModal = async () => {
    setEditingStudent(null);
    resetForm();

    let currentClasses = classes;
    if (currentClasses.length === 0) {
      currentClasses = await fetchClasses();
    }

    const targetClass = selectedClassId !== 'ALL' ? selectedClassId : (currentClasses[0]?.id || '');
    setFormClassId(targetClass);

    if (targetClass) {
      setIsLoadingModalSections(true);
      const secs = await getSectionsForClass(targetClass, currentClasses);
      setModalSections(secs);
      setIsLoadingModalSections(false);
      if (selectedSectionId && selectedSectionId !== 'ALL' && secs.some((s) => s.id === selectedSectionId)) {
        setFormSectionId(selectedSectionId);
      } else if (secs.length > 0) {
        setFormSectionId(secs[0].id);
      } else {
        setFormSectionId('');
      }
    } else {
      setModalSections([]);
      setFormSectionId('');
    }

    setIsAddModalOpen(true);
  };

  const handleFormClassChange = async (cId: string) => {
    setFormClassId(cId);
    setFormSectionId('');
    if (cId) {
      setIsLoadingModalSections(true);
      const secs = await getSectionsForClass(cId);
      setModalSections(secs);
      setIsLoadingModalSections(false);
      if (secs.length > 0) {
        setFormSectionId(secs[0].id);
      }
    } else {
      setModalSections([]);
    }
  };

  const handleOpenBulkModal = async () => {
    setBulkStatus(null);
    let currentClasses = classes;
    if (currentClasses.length === 0) {
      currentClasses = await fetchClasses();
    }

    const targetClass = selectedClassId !== 'ALL' ? selectedClassId : (currentClasses[0]?.id || '');
    setBulkClassId(targetClass);

    if (targetClass) {
      setIsLoadingBulkSections(true);
      const secs = await getSectionsForClass(targetClass, currentClasses);
      setBulkModalSections(secs);
      setIsLoadingBulkSections(false);
      if (selectedSectionId && selectedSectionId !== 'ALL' && secs.some((s) => s.id === selectedSectionId)) {
        setBulkSectionId(selectedSectionId);
      } else if (secs.length > 0) {
        setBulkSectionId(secs[0].id);
      } else {
        setBulkSectionId('');
      }
    } else {
      setBulkModalSections([]);
      setBulkSectionId('');
    }

    setIsBulkModalOpen(true);
  };

  const handleBulkClassChange = async (cId: string) => {
    setBulkClassId(cId);
    setBulkSectionId('');
    if (cId) {
      setIsLoadingBulkSections(true);
      const secs = await getSectionsForClass(cId);
      setBulkModalSections(secs);
      setIsLoadingBulkSections(false);
      if (secs.length > 0) {
        setBulkSectionId(secs[0].id);
      }
    } else {
      setBulkModalSections([]);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [branchId]);

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
        if (Array.isArray(data.data)) {
          setStudents(data.data);
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
        let data: any = {};
        try {
          data = await res.json();
        } catch {
          data = {};
        }
        if (res.ok && (data.success || data.message)) {
          setIsAddModalOpen(false);
          setEditingStudent(null);
          resetForm();
          fetchStudents();
        } else {
          alert(data.message || data.error || 'Error updating student.');
        }
      } else {
        // Enrollment requires a target section
        const targetSection = formSectionId || (selectedSectionId !== 'ALL' ? selectedSectionId : '');
        if (!targetSection) {
          alert('Please select both a Class and a Section to enroll this student.');
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
        let data: any = {};
        try {
          data = await res.json();
        } catch {
          data = {};
        }
        if (res.ok && (data.success || data.student || data.id)) {
          setIsAddModalOpen(false);
          resetForm();
          fetchStudents();
        } else {
          alert(data.message || data.error || `Unable to enroll student (HTTP ${res.status}).`);
        }
      }
    } catch (err: any) {
      alert(err?.message || 'Error connecting to server.');
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
      const list = Array.isArray(data.data)
        ? data.data
        : (Array.isArray(data.submissions) ? data.submissions : (Array.isArray(data) ? data : []));
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

    const targetSection = bulkSectionId || (selectedSectionId !== 'ALL' ? selectedSectionId : '');
    if (!targetSection) {
      setBulkStatus('❌ Please select a Target Class and Section first.');
      setIsSubmitting(false);
      return;
    }

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
      // Documented API: POST /api/sections/:sectionId/students/bulk
      const res = await fetch(`${API_BASE_URL}/api/sections/${targetSection}/students/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: studentObjects })
      });
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      if (res.ok && (data.success || data.count || data.created)) {
        setBulkStatus(`✅ Successfully enrolled ${studentObjects.length} student(s) into Section!`);
        fetchStudents();
        setTimeout(() => {
          setIsBulkModalOpen(false);
          setCsvContent('');
          setBulkStatus(null);
        }, 1800);
      } else {
        setBulkStatus(`❌ Error: ${data.message || data.error || `Failed (HTTP ${res.status})`}`);
      }
    } catch (err: any) {
      setBulkStatus(`❌ ${err?.message || 'Server communication error.'}`);
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
                onClick={handleOpenBulkModal}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Upload className="size-4" />
                <span>Bulk CSV Import</span>
              </button>
              <button
                className="btn btn-primary"
                onClick={handleOpenAddModal}
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
                            {isBranchAdmin && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleDeleteStudent(student.id, student.name)}
                                title="Delete Student (DELETE /api/students/:studentId)"
                                style={{ padding: '0.3rem 0.5rem', color: '#EF4444' }}
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            )}
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
                  placeholder="e.g. Student Full Name"
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

              {/* Class & Section Selection */}
              {!editingStudent && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                      Class / Cohort *
                    </label>
                    <select
                      required
                      className="form-input"
                      value={formClassId}
                      onChange={(e) => handleFormClassChange(e.target.value)}
                    >
                      <option value="">-- Choose Class --</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                      Section *
                    </label>
                    <select
                      required
                      disabled={!formClassId || isLoadingModalSections}
                      className="form-input"
                      value={formSectionId}
                      onChange={(e) => setFormSectionId(e.target.value)}
                    >
                      <option value="">
                        {isLoadingModalSections
                          ? 'Loading sections...'
                          : modalSections.length === 0
                          ? 'No sections available'
                          : '-- Choose Section --'}
                      </option>
                      {modalSections.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          Section {sec.section_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {!editingStudent && formClassId && !isLoadingModalSections && modalSections.length === 0 && (
                <div style={{ fontSize: '0.75rem', color: '#DC2626', background: '#FEF2F2', padding: '0.5rem 0.75rem', borderRadius: '4px' }}>
                  ⚠️ This class has no sections yet. Please create a section (e.g. Section A) in <strong>Classes</strong> first.
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                    Target Class *
                  </label>
                  <select
                    className="form-input"
                    value={bulkClassId}
                    onChange={(e) => handleBulkClassChange(e.target.value)}
                  >
                    <option value="">-- Choose Class --</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                    Target Section *
                  </label>
                  <select
                    className="form-input"
                    disabled={!bulkClassId || isLoadingBulkSections}
                    value={bulkSectionId}
                    onChange={(e) => setBulkSectionId(e.target.value)}
                  >
                    <option value="">
                      {isLoadingBulkSections
                        ? 'Loading sections...'
                        : bulkModalSections.length === 0
                        ? 'No sections available'
                        : '-- Choose Section --'}
                    </option>
                    {bulkModalSections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        Section {sec.section_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {bulkClassId && !isLoadingBulkSections && bulkModalSections.length === 0 && (
                <div style={{ fontSize: '0.75rem', color: '#DC2626', background: '#FEF2F2', padding: '0.5rem 0.75rem', borderRadius: '4px' }}>
                  ⚠️ This class has no sections yet. Please create a section in <strong>Classes</strong> first.
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
