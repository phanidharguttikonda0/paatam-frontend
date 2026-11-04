import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Plus,
  ChevronRight,
  Layers,
  Users,
  UserCheck,
  Trash2,
  GraduationCap,
  X,
  ExternalLink,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';

type ClassSubject = {
  id: string;
  class_subject_id?: string;
  subject_id?: string;
  classId?: string;
  subjectName?: string;
  name?: string;
  code?: string;
  createdAt?: string;
};

type MasterSubject = {
  id: string;
  name: string;
  code?: string;
};

type SectionItem = {
  id: string;
  section_name: string;
  strength: number;
  class_teacher_id?: string;
  teacher?: { id: string; name: string };
};

type TeacherOption = {
  id: string;
  name: string;
  teacher_id: string;
  contact_email?: string;
};

type SectionTeacherAllocation = {
  id: string;
  teacher_id: string;
  subject_id: string;
  teacher?: { id: string; name: string; teacher_id: string };
  subject?: { id: string; name: string };
  teacher_name?: string;
  subject_name?: string;
  class_name?: string;
  section_name?: string;
};

const cleanSecName = (raw: string) => {
  if (!raw) return 'A';
  return String(raw).replace(/^Section\s+/i, '').trim() || 'A';
};

export default function ClassDetail() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { currentUser, currentBranchId, branches } = useAuth();
  const role = currentUser?.role?.toUpperCase();
  const isCorporateAdmin = role === 'CORPORATE_ADMIN' || role === 'SUPER_ADMIN';
  const isTeacher = role === 'TEACHER';

  const [className, setClassName] = useState('');
  const [classBranchId, setClassBranchId] = useState('');
  const [activeTab, setActiveTab] = useState<'subjects' | 'sections'>('subjects');

  // Subjects
  const [subjects, setSubjects] = useState<ClassSubject[]>([]);
  const [masterCatalog, setMasterCatalog] = useState<MasterSubject[]>([]);
  const [selectedMasterSubjectId, setSelectedMasterSubjectId] = useState('');
  const [showNewMasterModal, setShowNewMasterModal] = useState(false);
  const [newMasterName, setNewMasterName] = useState('');
  const [newMasterCode, setNewMasterCode] = useState('');
  const [isAssigningSubject, setIsAssigningSubject] = useState(false);

  // Sections
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionStrength, setNewSectionStrength] = useState<number | ''>(35);
  const [newClassTeacherId, setNewClassTeacherId] = useState('');
  const [isCreatingSection, setIsCreatingSection] = useState(false);
  const [availableTeachers, setAvailableTeachers] = useState<TeacherOption[]>(() => {
    try {
      const stored = localStorage.getItem('paatam_onboarded_teachers');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  // Edit Section Modal
  const [editingSection, setEditingSection] = useState<SectionItem | null>(null);
  const [editSecName, setEditSecName] = useState('');
  const [editSecStrength, setEditSecStrength] = useState<number | ''>(35);
  const [isUpdatingSection, setIsUpdatingSection] = useState(false);

  // Section Faculty Allocation Modal
  const [allocatingSection, setAllocatingSection] = useState<SectionItem | null>(null);
  const [sectionTeachers, setSectionTeachers] = useState<SectionTeacherAllocation[]>([]);
  const [allocTeacherId, setAllocTeacherId] = useState('');
  const [allocSubjectId, setAllocSubjectId] = useState('');
  const [isAllocating, setIsAllocating] = useState(false);

  const branchId = currentBranchId || (branches.length > 0 ? branches[0].id : '');
  const activeBranchId = classBranchId || branchId;

  const fetchClassDetails = async () => {
    if (!classId) return;
    // 1. Try documented GET /api/classes/:classId
    try {
      const res = await fetch(`${API_BASE_URL}/api/classes/${classId}`);
      if (res.ok) {
        const data = await res.json();
        const cls = data.data || data.class || data;
        if (cls) {
          if (cls.name || cls.class_name) {
            setClassName(cls.name || cls.class_name);
          }
          if (cls.branch_id) {
            setClassBranchId(cls.branch_id);
          }
          return;
        }
      }
    } catch {}

  };

  const fetchSubjects = () => {
    if (!classId) return;
    fetch(`${API_BASE_URL}/api/classes/${classId}/subjects`)
      .then((res) => res.json())
      .then((data) => {
        const rawList = Array.isArray(data.data)
          ? data.data
          : Array.isArray(data.subjects)
          ? data.subjects
          : Array.isArray(data)
          ? data
          : [];
        const normalized = rawList.map((item: any) => ({
          ...item,
          id: item.class_subject_id || item.id,
          class_subject_id: item.class_subject_id || item.id,
          subject_id: item.subject_id || item.id,
          name: item.name || item.subjectName || item.subject_name
        }));
        setSubjects(normalized);
      })
      .catch((err) => console.error('Unable to load class subjects:', err));
  };

  const fetchMasterCatalog = async () => {
    if (!activeBranchId) {
      setMasterCatalog([]);
      return;
    }

    const url = `${API_BASE_URL}/api/branch/${activeBranchId}/subjects`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      const list = Array.isArray(data.data)
        ? data.data
        : Array.isArray(data.subjects)
        ? data.subjects
        : Array.isArray(data)
        ? data
        : null;

      if (list && Array.isArray(list)) {
        setMasterCatalog(list);
      } else {
        setMasterCatalog([]);
      }
    } catch {
      setMasterCatalog([]);
    }
  };

  const fetchSections = () => {
    if (!classId) return;
    fetch(`${API_BASE_URL}/api/classes/${classId}/sections`)
      .then((res) => res.json())
      .then((data) => {
        let list: SectionItem[] = Array.isArray(data.data)
          ? data.data
          : Array.isArray(data.sections)
          ? data.sections
          : Array.isArray(data)
          ? data
          : [];

        if (isTeacher) {
          const teacherId = String(currentUser?.id || (currentUser as any)?.teacher_id || (currentUser as any)?.staff_id || '');
          const allowedSectionIds = new Set<string>();
          const allowedSectionNames = new Set<string>();

          try {
            // Source of truth for teacher access scope
            // comes from /api/teacher/dashboard.
            fetch(`${API_BASE_URL}/api/teacher/dashboard`)
              .then((res) => res.ok ? res.json() : null)
              .then((dashData) => {
                const allocations = Array.isArray(dashData?.data?.teaching_allocations)
                  ? dashData.data.teaching_allocations
                  : (Array.isArray(dashData?.data?.assigned_sections) ? dashData.data.assigned_sections : []);
                const classTeacherSecs = Array.isArray(dashData?.data?.class_teacher_sections)
                  ? dashData.data.class_teacher_sections
                  : [];

                for (const a of allocations) {
                  if (String(a.class_id || '') === String(classId || '') || (className && String(a.class_name || '') === String(className))) {
                    if (a.section_id) allowedSectionIds.add(String(a.section_id));
                    if (a.section_name) allowedSectionNames.add(cleanSecName(a.section_name));
                  }
                }

                for (const ct of classTeacherSecs) {
                  if (String(ct.class_id || '') === String(classId || '') || (className && String(ct.class_name || '') === String(className))) {
                    if (ct.section_id) allowedSectionIds.add(String(ct.section_id));
                    if (ct.section_name) allowedSectionNames.add(cleanSecName(ct.section_name));
                  }
                }

                if (allowedSectionIds.size > 0 || allowedSectionNames.size > 0) {
                  setSections(list.filter((sec) =>
                    allowedSectionIds.has(String(sec.id)) ||
                    allowedSectionNames.has(cleanSecName(sec.section_name)) ||
                    String(sec.class_teacher_id) === teacherId
                  ));
                } else {
                  setSections(list.filter((sec) => String(sec.class_teacher_id) === teacherId));
                }
              })
              .catch(() => {
                setSections(list.filter((sec) => String(sec.class_teacher_id) === teacherId));
              });
            return;
          } catch {
            list = list.filter((sec) => String(sec.class_teacher_id) === teacherId);
          }
        }

        setSections(list);
      })
      .catch((err) => console.error('Unable to load sections:', err));
  };

  const fetchTeachers = async () => {
    const cachedTeachers: TeacherOption[] = (() => {
      try {
        const stored = localStorage.getItem('paatam_onboarded_teachers');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
      return [];
    })();

    let fetchedList: any[] = [];
    const targetBranchIds = activeBranchId
      ? [activeBranchId]
      : (branches && branches.length > 0 ? branches.map((b) => b.id) : []);

    for (const bId of targetBranchIds) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/branch/${bId}/teachers`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data.data)
            ? data.data
            : Array.isArray(data.teachers)
            ? data.teachers
            : Array.isArray(data)
            ? data
            : [];
          fetchedList = [...fetchedList, ...list];
        }
      } catch {}
    }

    const combined = [...fetchedList, ...cachedTeachers];
    const seen = new Set();
    const deduplicated: TeacherOption[] = combined.filter((t: any) => {
      const key = t.id || t.teacher_id;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (deduplicated.length > 0) {
      setAvailableTeachers(deduplicated);
    }
  };

  useEffect(() => {
    fetchClassDetails();
    fetchSubjects();
    fetchSections();
    if (!isTeacher) {
      fetchMasterCatalog();
      fetchTeachers();
    }
  }, [classId, isTeacher]);

  useEffect(() => {
    if (activeBranchId && !isTeacher) {
      fetchMasterCatalog();
      fetchTeachers();
    }
  }, [activeBranchId, isTeacher]);

  // Assign Subject from Master Catalog or name
  const handleAssignSubject = async () => {
    if (!classId) return;
    if (!selectedMasterSubjectId) {
      alert('Please select a subject from the catalog.');
      return;
    }

    setIsAssigningSubject(true);
    try {
      // Documented API: POST /api/classes/:classId/subjects with { subject_id: string }
      let res = await fetch(`${API_BASE_URL}/api/classes/${classId}/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject_id: String(selectedMasterSubjectId) })
      });
      let data = await res.json().catch(() => ({}));

      if (res.ok || data.status === 'success' || data.success || data.data) {
        setSelectedMasterSubjectId('');
        fetchSubjects();
      } else {
        alert(data.message || 'Unable to assign subject to class.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to connect to server.');
    } finally {
      setIsAssigningSubject(false);
    }
  };

  // Create new subject in branch master catalog and attach
  const handleCreateNewMasterSubject = async () => {
    if (!newMasterName.trim() || !activeBranchId || !classId) return;
    setIsAssigningSubject(true);
    try {
      // 1. Create in Master Catalog: POST /api/branch/:branchId/subjects
      const createRes = await fetch(`${API_BASE_URL}/api/branch/${activeBranchId}/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMasterName.trim(),
          code: newMasterCode.trim() || undefined
        })
      });
      const createData = await createRes.json();
      const newSubjectId = createData?.data?.id || createData?.subject?.id || createData?.id;

      if (newSubjectId) {
        // 2. Assign to class: POST /api/classes/:classId/subjects with { subject_id }
        const assignRes = await fetch(`${API_BASE_URL}/api/classes/${classId}/subjects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject_id: String(newSubjectId) })
        });
        if (!assignRes.ok) {
          const assignData = await assignRes.json().catch(() => ({}));
          throw new Error(assignData.message || 'Failed to attach subject to class.');
        }
      } else {
        throw new Error('Failed to create subject in branch catalog.');
      }

      setNewMasterName('');
      setNewMasterCode('');
      setShowNewMasterModal(false);
      fetchMasterCatalog();
      fetchSubjects();
    } catch (err) {
      console.error(err);
      alert('Error creating master subject.');
    } finally {
      setIsAssigningSubject(false);
    }
  };

  // Unassign subject: DELETE /api/classes/:classId/subjects/:classSubjectId
  const handleRemoveSubject = async (subjectId: string, subjectName: string) => {
    if (!window.confirm(`Unassign "${subjectName}" from this class?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/classes/${classId}/subjects/${subjectId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchSubjects();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || 'Unable to remove subject.');
      }
    } catch (err) {
      console.error(err);
      alert('Error removing subject.');
    }
  };

  // Add section: POST /api/classes/:classId/sections
  const handleAddSection = async () => {
    const sectionName = newSectionName.trim().toUpperCase();
    if (!sectionName || !classId) return;
    setIsCreatingSection(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/classes/${classId}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section_name: sectionName,
          strength: Number(newSectionStrength) || 0
        })
      });
      const data = await res.json().catch(() => ({}));
      const createdSectionId = data?.data?.id || data?.section?.id || data?.id;

      if (res.ok || data.status === 'success' || data.success || createdSectionId) {
        // If class teacher was selected, assign: PUT /api/sections/:sectionId/class-teacher
        if (newClassTeacherId && createdSectionId) {
          await fetch(`${API_BASE_URL}/api/sections/${createdSectionId}/class-teacher`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teacher_id: newClassTeacherId })
          }).catch(() => {});
        }

        setNewSectionName('');
        setNewSectionStrength(35);
        setNewClassTeacherId('');
        fetchSections();
      } else {
        alert(data.message || 'Unable to create section.');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to server.');
    } finally {
      setIsCreatingSection(false);
    }
  };

  // Assign or remove class teacher
  const handleUpdateClassTeacher = async (sectionId: string, teacherId: string) => {
    try {
      if (teacherId) {
        await fetch(`${API_BASE_URL}/api/sections/${sectionId}/class-teacher`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teacher_id: teacherId })
        });
      } else {
        await fetch(`${API_BASE_URL}/api/sections/${sectionId}/class-teacher`, {
          method: 'DELETE'
        });
      }
      fetchSections();
    } catch (err) {
      console.error(err);
      alert('Failed to update class teacher.');
    }
  };

  // Update section: PUT /api/sections/:sectionId
  const handleSaveEditSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection || !editSecName.trim()) return;
    setIsUpdatingSection(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/sections/${editingSection.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section_name: editSecName.trim().toUpperCase(),
          strength: Number(editSecStrength) || 0
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok || data.success) {
        setEditingSection(null);
        fetchSections();
      } else {
        alert(data.message || 'Failed to update section.');
      }
    } catch {
      alert('Error updating section.');
    } finally {
      setIsUpdatingSection(false);
    }
  };

  // Delete section: DELETE /api/sections/:sectionId
  const handleDeleteSection = async (sectionId: string, name: string) => {
    if (!window.confirm(`Delete Section "${name}"? This will detach its student roster.`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/sections/${sectionId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchSections();
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.message || 'Unable to delete section.');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting section.');
    }
  };

  const isValidAllocation = (a: any) => {
    const hasTeacherId = Boolean(a.teacher_id && a.teacher_id !== 'undefined');
    const hasTeacherObjId = Boolean(a.teacher?.id && a.teacher?.id !== 'undefined');
    const hasTeacherName = Boolean(a.teacher?.name && a.teacher?.name !== 'Faculty Member');
    const hasTeacherIdProp = Boolean(a.teacherId && a.teacherId !== 'undefined');
    const hasAssignedTeacher = Boolean(a.assigned_teacher && (a.assigned_teacher.id || a.assigned_teacher.name || a.assigned_teacher.teacher_id));
    return hasTeacherId || hasTeacherObjId || hasTeacherName || hasTeacherIdProp || hasAssignedTeacher;
  };

  // Open faculty allocations modal for section: load backend authoritative allocations first
  const handleOpenAllocations = async (sec: SectionItem) => {
    setAllocatingSection(sec);
    setAllocTeacherId('');
    setAllocSubjectId('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/sections/${sec.id}/subjects-teachers`);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const list = Array.isArray(data.data)
          ? data.data
          : (Array.isArray(data.subjectsTeachers) ? data.subjectsTeachers : []);

        const mapped: SectionTeacherAllocation[] = list
          .filter((row: any) => row?.assigned_teacher)
          .map((row: any) => ({
            id: String(row.id || `${row.class_subject_id}_${row.assigned_teacher?.id || row.assigned_teacher?.teacher_id || 'teacher'}`),
            teacher_id: String(row.assigned_teacher?.id || row.assigned_teacher?.teacher_id || ''),
            subject_id: String(row.class_subject_id || row.subject_id || ''),
            teacher: {
              id: String(row.assigned_teacher?.id || row.assigned_teacher?.teacher_id || ''),
              name: row.assigned_teacher?.name || 'Faculty Member',
              teacher_id: String(row.assigned_teacher?.teacher_id || row.assigned_teacher?.id || '')
            },
            subject: {
              id: String(row.class_subject_id || row.subject_id || ''),
              name: row.subject_name || 'Subject'
            },
            teacher_name: row.assigned_teacher?.name || '',
            subject_name: row.subject_name || 'Subject',
            class_name: className || '',
            section_name: sec.section_name || ''
          }));

        setSectionTeachers(mapped);
        try {
          localStorage.setItem(`paatam_section_allocations_${sec.id}`, JSON.stringify(mapped));
          localStorage.setItem(`paatam_section_allocations_name_${cleanSecName(sec.section_name)}`, JSON.stringify(mapped));
        } catch {}
        return;
      }

      // Backend explicitly returned no section allocation matrix endpoint/data for this section.
      // Fail closed and clear stale local cache instead of showing ghost rows.
      setSectionTeachers([]);
      try {
        localStorage.removeItem(`paatam_section_allocations_${sec.id}`);
        localStorage.removeItem(`paatam_section_allocations_name_${cleanSecName(sec.section_name)}`);
      } catch {}
      return;
    } catch {}

    // Check deleted allocations tombstone
    let deletedKeys = new Set<string>();
    try {
      const delStored = localStorage.getItem(`paatam_deleted_allocations_${sec.id}`);
      if (delStored) {
        const parsedDel = JSON.parse(delStored);
        if (Array.isArray(parsedDel)) {
          deletedKeys = new Set(parsedDel.map((k: string) => String(k).toLowerCase().trim()));
        }
      }
    } catch {}

    const isTombstoned = (a: any) => {
      const curId = String(a.teacher_id || a.teacher?.id || (a as any).teacherId || a.id || '').toLowerCase().trim();
      const curName = String(a.teacher?.name || (a as any).teacher_name || (a as any).name || '').toLowerCase().trim();
      const curCode = String(a.teacher?.teacher_id || (a as any).teacher_code || '').toLowerCase().trim();
      const curSubId = String(a.subject_id || a.subject?.id || (a as any).subjectId || '').toLowerCase().trim();
      const curSubName = String(a.subject?.name || (a as any).subject_name || (a as any).subjectName || '').toLowerCase().trim();

      if (deletedKeys.has(curId) || (curName && deletedKeys.has(curName)) || (curCode && deletedKeys.has(curCode))) return true;
      if (deletedKeys.has(`${curId}__${curSubId}`)) return true;
      if (deletedKeys.has(`${curName}__${curSubName}`)) return true;
      if (deletedKeys.has(`${curCode}__${curSubName}`)) return true;
      return false;
    };

    const deduplicateAllocations = (list: SectionTeacherAllocation[]) => {
      const seen = new Set<string>();
      return list.filter((a: any) => {
        if (isTombstoned(a)) return false;
        const tIdentifier = (a.teacher?.teacher_id || a.teacher?.name || (a as any).teacher_name || a.teacher_id || (a.teacher?.id) || '').toLowerCase().trim();
        const sIdentifier = (a.subject?.name || (a as any).subject_name || a.subject?.id || a.subject_id || '').toLowerCase().trim();
        const normKey = `${tIdentifier}__${sIdentifier}`;
        if (seen.has(normKey)) return false;
        seen.add(normKey);
        return true;
      });
    };

    // Network error fallback only: show cached entries if available.
    let cached: SectionTeacherAllocation[] = [];
    try {
      const stored = localStorage.getItem(`paatam_section_allocations_${sec.id}`) ||
                     localStorage.getItem(`paatam_section_allocations_name_${cleanSecName(sec.section_name)}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) cached = parsed.filter(isValidAllocation);
      }
    } catch {}

    setSectionTeachers(deduplicateAllocations(cached));
  };

  // Allocate faculty to section
  const handleAllocateFaculty = async () => {
    if (!allocatingSection || !allocTeacherId || !allocSubjectId) {
      alert('Please select both a faculty member and a subject.');
      return;
    }
    setIsAllocating(true);

    const selectedSub = subjects.find(s => s.id === allocSubjectId);
    try {
      const classSubjectId = selectedSub?.class_subject_id || selectedSub?.id || allocSubjectId;
      let assigned = false;

      const putRes = await fetch(`${API_BASE_URL}/api/sections/${allocatingSection.id}/subjects-teachers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_subject_id: String(classSubjectId),
          teacher_id: String(allocTeacherId)
        })
      });

      if (putRes.ok) {
        assigned = true;
      } else {
        const postRes = await fetch(`${API_BASE_URL}/api/sections/${allocatingSection.id}/subjects-teachers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            class_subject_id: String(classSubjectId),
            teacher_id: String(allocTeacherId)
          })
        });
        assigned = postRes.ok;
      }

      if (!assigned) {
        throw new Error('Section-level faculty allocation endpoint is unavailable. Please verify backend support for section subject-teacher assignment.');
      }

      await handleOpenAllocations(allocatingSection);
      setAllocTeacherId('');
      setAllocSubjectId('');
    } catch (err: any) {
      alert(err?.message || 'Failed to allocate teacher for this section.');
    } finally {
      setIsAllocating(false);
    }
  };

  // Deallocate faculty: DELETE /api/sections/:sectionId/teachers/:teacherId or /subjects-teachers
  const handleDeallocateFaculty = async (alloc: SectionTeacherAllocation) => {
    if (!allocatingSection) return;
    const targetId = alloc.teacher_id || alloc.teacher?.id || (alloc as any).teacherId || alloc.id;
    const tName = alloc.teacher?.name || (alloc as any).teacher_name || (alloc as any).name || '';
    const tCode = alloc.teacher?.teacher_id || (alloc as any).teacher_code || '';
    const sId = alloc.subject_id || alloc.subject?.id || '';
    const sName = alloc.subject?.name || (alloc as any).subject_name || (alloc as any).subjectName || '';

    // Record tombstone keys for this section so it never resurrects on refresh
    const tombstoneKeys = [
      String(targetId).toLowerCase().trim(),
      tCode.toLowerCase().trim(),
      tName.toLowerCase().trim(),
      `${String(targetId).toLowerCase().trim()}__${String(sId).toLowerCase().trim()}`,
      `${tName.toLowerCase().trim()}__${sName.toLowerCase().trim()}`,
      `${tCode.toLowerCase().trim()}__${sName.toLowerCase().trim()}`
    ].filter(Boolean);

    try {
      const existingDel = JSON.parse(localStorage.getItem(`paatam_deleted_allocations_${allocatingSection.id}`) || '[]');
      const newDel = Array.from(new Set([...existingDel, ...tombstoneKeys]));
      localStorage.setItem(`paatam_deleted_allocations_${allocatingSection.id}`, JSON.stringify(newDel));
    } catch {}

    let unassigned = false;

    if (targetId && targetId !== 'undefined' && !String(targetId).startsWith('alloc_')) {
      try {
        const putRes = await fetch(`${API_BASE_URL}/api/sections/${allocatingSection.id}/subjects-teachers`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            class_subject_id: String(sId),
            teacher_id: null
          })
        });
        if (putRes.ok) {
          unassigned = true;
        } else {
          const delRes = await fetch(`${API_BASE_URL}/api/sections/${allocatingSection.id}/subjects-teachers/${sId}`, {
            method: 'DELETE'
          });
          unassigned = delRes.ok;
        }
      } catch {}
    }

    if (!unassigned) {
      // Soft-delete fallback for stale/ghost UI rows when backend section-level
      // deallocation endpoint is unavailable.
      console.warn('Section deallocation API unavailable; applying local soft delete fallback.');
    }

    setSectionTeachers(prev => {
      const updated = prev.filter(a => {
        if (a === alloc) return false;
        const curId = String(a.teacher_id || a.teacher?.id || (a as any).teacherId || a.id || '').toLowerCase().trim();
        const curName = String(a.teacher?.name || (a as any).teacher_name || (a as any).name || '').toLowerCase().trim();
        const curCode = String(a.teacher?.teacher_id || (a as any).teacher_code || '').toLowerCase().trim();
        if (targetId && curId === String(targetId).toLowerCase().trim()) return false;
        if (tCode && curCode === tCode.toLowerCase().trim()) return false;
        if (tName && curName === tName.toLowerCase().trim()) return false;
        return true;
      });
      try {
        localStorage.setItem(`paatam_section_allocations_${allocatingSection.id}`, JSON.stringify(updated));
        localStorage.setItem(`paatam_section_allocations_name_${cleanSecName(allocatingSection.section_name)}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (!unassigned) {
      alert('Removed locally. Backend did not confirm section deallocation for this record, but this ghost assignment will stay hidden in UI.');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <header className="page-top-bar no-print">
        <div className="page-top-bar-text">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/classes')}
            style={{ marginBottom: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <ArrowLeft className="size-4" />
            <span>All Classes</span>
          </button>
          <h1>{className || 'Class Management'}</h1>
          <p>{isTeacher ? 'View assigned classroom sections, subject workspaces, and grade student submissions.' : 'Configure curriculum subjects, physical classroom sections, and faculty room allocations'}</p>
        </div>
      </header>

      <div className="page-container">
        {/* Tab Switcher */}
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
            <span>Curriculum Subjects ({subjects.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sections')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: activeTab === 'sections' ? '#EFF6FF' : 'transparent',
              color: activeTab === 'sections' ? '#1D4ED8' : '#64748B',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Layers className="size-4" />
            <span>{isTeacher ? 'My Assigned Sections' : 'Class Sections & Rooms'} ({sections.length})</span>
          </button>
        </div>

        {/* 1. Subjects Tab */}
        {activeTab === 'subjects' && (
          <div>
            {!isTeacher && (
              <div className="m-card" style={{ marginBottom: '1.25rem' }}>
                <div
                  className="m-card-header"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div>
                    <h3 className="m-card-title">Assign Subject to Class</h3>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748B' }}>
                      Select from branch master subjects or create a new curriculum syllabus
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowNewMasterModal(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <Plus className="size-3.5" />
                    <span>New Master Subject</span>
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <select
                    className="form-input"
                    style={{ flex: 1 }}
                    value={selectedMasterSubjectId}
                    onChange={(e) => setSelectedMasterSubjectId(e.target.value)}
                  >
                    <option value="">-- Choose Master Subject from Catalog --</option>
                    {masterCatalog.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.code ? `(${s.code})` : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn btn-primary"
                    onClick={handleAssignSubject}
                    disabled={isAssigningSubject || !selectedMasterSubjectId}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
                  >
                    <Plus className="size-4" />
                    <span>Assign to Class</span>
                  </button>
                </div>
              </div>
            )}

            {subjects.length === 0 ? (
              <div className="m-card" style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748B' }}>
                <BookOpen className="size-10 text-slate-300 mx-auto" style={{ margin: '0 auto 0.75rem auto' }} />
                <p style={{ fontWeight: 600, color: '#334155', margin: 0 }}>No subjects assigned yet.</p>
                <p style={{ fontSize: '0.8125rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                  Assign a master subject above to deploy exam papers and scan student answer sheets.
                </p>
              </div>
            ) : (
              <div className="entity-cards-grid">
                {subjects.map((s) => {
                  const sName = s.subjectName || s.name || 'Subject';
                  return (
                    <div
                      key={s.id}
                      className="entity-card entity-card-subject"
                      style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}
                    >
                      <div className="entity-card-head">
                        <div className="entity-card-icon entity-card-icon-subject">
                          <BookOpen className="size-5" />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          {s.code && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                padding: '0.15rem 0.4rem',
                                background: '#F1F5F9',
                                borderRadius: '4px',
                                fontWeight: 700,
                                color: '#475569'
                              }}
                            >
                              {s.code}
                            </span>
                          )}
                          {!isTeacher && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveSubject(s.id, sName);
                              }}
                              title="Unassign Subject"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#94A3B8',
                                cursor: 'pointer',
                                padding: '0.25rem',
                                borderRadius: '4px'
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <h3 className="entity-card-title">{sName}</h3>
                      <p className="entity-card-subtitle">AI paper generator, syllabus & scan grading</p>

                      {!isTeacher ? (
                        <div
                          className="entity-card-footer"
                          onClick={() => navigate(`/classes/${classId}/${s.id}`)}
                          style={{ cursor: 'pointer' }}
                        >
                          <span className="entity-card-action">Manage Syllabus & Papers</span>
                          <ChevronRight className="size-4" />
                        </div>
                      ) : (
                        <div
                          className="entity-card-footer"
                          style={{ background: '#F8FAFC', cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 1rem' }}
                        >
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>
                            Class Curriculum Subject
                          </span>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#ECFDF5', color: '#065F46' }}>
                            Enrolled
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 2. Sections Tab */}
        {activeTab === 'sections' && (
          <div>
            {!isTeacher && (
              <div className="m-card" style={{ marginBottom: '1.25rem' }}>
                <div className="m-card-header">
                  <h3 className="m-card-title">Add a Section (e.g. Section B)</h3>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748B' }}>
                    Create physical sections and designate the Class Teacher
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 1.5fr auto', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Section letter (e.g. B)"
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                  />
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Strength (35)"
                    value={newSectionStrength}
                    onChange={(e) => setNewSectionStrength(e.target.value ? Number(e.target.value) : '')}
                  />
                  <select
                    className="form-input"
                    value={newClassTeacherId}
                    onChange={(e) => setNewClassTeacherId(e.target.value)}
                  >
                    <option value="">Designate Class Teacher (Optional)</option>
                    {availableTeachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.teacher_id})
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn btn-primary"
                    onClick={handleAddSection}
                    disabled={isCreatingSection || !newSectionName.trim()}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
                  >
                    <Plus className="size-4" />
                    <span>Create Section</span>
                  </button>
                </div>
              </div>
            )}

            {sections.length === 0 ? (
              <div className="m-card" style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748B' }}>
                <Layers className="size-10 text-slate-300 mx-auto" style={{ margin: '0 auto 0.75rem auto' }} />
                <p style={{ fontWeight: 600, color: '#334155', margin: 0 }}>No sections created yet.</p>
                <p style={{ fontSize: '0.8125rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                  Create Section A or B above to start enrolling students and assigning subject faculty.
                </p>
              </div>
            ) : (
              <div className="entity-cards-grid">
                {sections.map((sec) => (
                  <div
                    key={sec.id}
                    className="m-card"
                    style={{
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative'
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.75rem'
                        }}
                      >
                        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
                          Section {sec.section_name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.2rem 0.5rem',
                              background: '#ECFDF5',
                              color: '#065F46',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}
                          >
                            <Users className="size-3.5" />
                            <span>{sec.strength || 0} Students</span>
                          </span>
                          {!isTeacher && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSection(sec);
                                  setEditSecName(sec.section_name);
                                  setEditSecStrength(sec.strength || 35);
                                }}
                                title="Edit Section Name & Strength (PUT /api/sections/:sectionId)"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#94A3B8',
                                  cursor: 'pointer',
                                  padding: '0.25rem'
                                }}
                              >
                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#2563EB' }}>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSection(sec.id, sec.section_name)}
                                title="Delete Section"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#94A3B8',
                                  cursor: 'pointer',
                                  padding: '0.25rem'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Class Teacher Allocation */}
                      <div style={{ marginBottom: '1rem' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            fontSize: '0.8125rem',
                            color: '#475569',
                            marginBottom: '0.35rem'
                          }}
                        >
                          <UserCheck className="size-4 text-blue-600" />
                          <span>Class Teacher:</span>
                        </div>
                        {isTeacher ? (
                          <div style={{ fontSize: '0.8125rem', color: '#475569', fontWeight: 600, padding: '0.2rem 0' }}>
                            {availableTeachers.find((t) => t.id === (sec.class_teacher_id || sec.teacher?.id))?.name || (sec.class_teacher_id ? 'Assigned' : 'None Assigned')}
                          </div>
                        ) : (
                          <select
                            className="form-input"
                            style={{ fontSize: '0.8125rem', padding: '0.35rem 0.6rem' }}
                            value={sec.class_teacher_id || sec.teacher?.id || ''}
                            onChange={(e) => handleUpdateClassTeacher(sec.id, e.target.value)}
                          >
                            <option value="">-- No Class Teacher Assigned --</option>
                            {availableTeachers.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name} ({t.teacher_id})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    {isTeacher && (
                      <div style={{ marginBottom: '0.75rem', padding: '0.35rem 0.6rem', borderRadius: '6px', background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#166534' }}>
                          Assigned Faculty Schedule • {subjects[0]?.name || 'Physics'}
                        </span>
                      </div>
                    )}

                    <div
                      style={{
                        borderTop: '1px solid #F1F5F9',
                        paddingTop: '0.75rem',
                        marginTop: '0.5rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      {!isTeacher ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenAllocations(sec)}
                          style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <GraduationCap className="size-3.5 text-blue-600" />
                          <span>Subject Faculty</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            const targetSubId = subjects[0]?.id || '4265262194928642';
                            navigate(`/classes/${classId}/${targetSubId}?sectionId=${sec.id}`);
                          }}
                          style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <FileText className="size-3.5" />
                          <span>Grade Papers</span>
                        </button>
                      )}

                      {!isCorporateAdmin && (
                        <button
                          type="button"
                          className={isTeacher ? "btn btn-secondary btn-sm" : "btn btn-primary btn-sm"}
                          onClick={() => navigate(`/students?sectionId=${sec.id}`)}
                          style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Users className="size-3.5" />
                          <span>Roster</span>
                          <ExternalLink className="size-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: New Master Subject in Branch Catalog */}
      {showNewMasterModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
        >
          <div
            className="m-card"
            style={{
              width: '100%',
              maxWidth: '480px',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen className="size-5 text-blue-600" />
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0F172A' }}>
                  Create Master Subject
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewMasterModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X className="size-5" />
              </button>
            </div>

            <p style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: 0, marginBottom: '1.25rem' }}>
              This subject will be added to the Branch Master Catalog and automatically linked to this class.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Subject Name *
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Mathematics & Calculus"
                  value={newMasterName}
                  onChange={(e) => setNewMasterName(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Subject Code (Optional)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. MATH-101"
                  value={newMasterCode}
                  onChange={(e) => setNewMasterCode(e.target.value)}
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.5rem',
                marginTop: '1.5rem',
                borderTop: '1px solid #E2E8F0',
                paddingTop: '1rem'
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowNewMasterModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreateNewMasterSubject}
                disabled={isAssigningSubject || !newMasterName.trim()}
              >
                Create & Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Subject Faculty Allocation for Section */}
      {allocatingSection && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
        >
          <div
            className="m-card"
            style={{
              width: '100%',
              maxWidth: '620px',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck className="size-5 text-blue-600" />
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0F172A' }}>
                  Section {allocatingSection.section_name} - Faculty Allocations
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAllocatingSection(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X className="size-5" />
              </button>
            </div>

            <p style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: 0, marginBottom: '1.25rem' }}>
              Assign specific teachers to instruct subjects in this section.
            </p>

            {/* Allocate new faculty form */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.25rem'
              }}
            >
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 700, color: '#334155' }}>
                Allocate Subject Teacher
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem' }}>
                <select
                  className="form-input"
                  value={allocTeacherId}
                  onChange={(e) => setAllocTeacherId(e.target.value)}
                >
                  <option value="">-- Choose Teacher --</option>
                  {availableTeachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.teacher_id})
                    </option>
                  ))}
                </select>

                <select
                  className="form-input"
                  value={allocSubjectId}
                  onChange={(e) => setAllocSubjectId(e.target.value)}
                >
                  <option value="">-- Choose Class Subject --</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.subjectName || s.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAllocateFaculty}
                  disabled={isAllocating || !allocTeacherId || !allocSubjectId}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}
                >
                  <Plus className="size-4" />
                  <span>Allocate</span>
                </button>
              </div>
            </div>

            {/* Current Allocations Table */}
            <div>
              {(() => {
                const validList = sectionTeachers.filter(isValidAllocation);
                return (
                  <>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 700, color: '#334155' }}>
                      Current Allocations ({validList.length})
                    </h4>
                    {validList.length === 0 ? (
                      <p style={{ fontSize: '0.8125rem', color: '#94A3B8', fontStyle: 'italic', margin: '0.5rem 0' }}>
                        No subject teachers allocated yet to this section.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '240px', overflowY: 'auto' }}>
                        {validList.map((alloc) => {
                          const teacherMatch = availableTeachers.find(
                            (t) =>
                              String(t.id) === String(alloc.teacher_id || alloc.teacher?.id || (alloc as any).id) ||
                              String(t.teacher_id) === String(alloc.teacher_id || (alloc as any).teacherId)
                          );
                          const subjectMatch =
                            subjects.find(
                              (s) =>
                                String(s.id) === String(alloc.subject_id || alloc.subject?.id || (alloc as any).subjectId) ||
                                String((s as any).master_subject_id) === String(alloc.subject_id || alloc.subject?.id)
                            ) ||
                            masterCatalog.find(
                              (m) => String(m.id) === String(alloc.subject_id || alloc.subject?.id || (alloc as any).subjectId)
                            );

                          const tName =
                            alloc.teacher?.name ||
                            (alloc as any).teacher_name ||
                            (alloc as any).name ||
                            teacherMatch?.name ||
                            'Faculty Member';
                          const tCode =
                            alloc.teacher?.teacher_id ||
                            (alloc as any).teacher_code ||
                            teacherMatch?.teacher_id ||
                            '';
                          const sName =
                            alloc.subject?.name ||
                            (alloc as any).subject_name ||
                            (alloc as any).subjectName ||
                            subjectMatch?.name ||
                            (subjectMatch as any)?.subjectName ||
                            'Subject';
                          return (
                            <div
                              key={alloc.id || alloc.teacher_id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0.6rem 0.8rem',
                                background: '#FFFFFF',
                                border: '1px solid #E2E8F0',
                                borderRadius: '6px'
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0F172A' }}>
                                  {tName} {tCode ? <span style={{ color: '#64748B', fontWeight: 400 }}>({tCode})</span> : null}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#2563EB', fontWeight: 500 }}>
                                  Subject: {sName}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeallocateFaculty(alloc)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#94A3B8',
                                  cursor: 'pointer',
                                  padding: '0.25rem'
                                }}
                                title="Deallocate faculty"
                                onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: '1.5rem',
                borderTop: '1px solid #E2E8F0',
                paddingTop: '1rem'
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setAllocatingSection(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Section Modal (PUT /api/sections/:sectionId) */}
      {editingSection && (
        <div className="modal-backdrop animate-fade-in" style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div className="m-card" style={{ width: '100%', maxWidth: '380px' }}>
            <div className="m-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="m-card-title">Edit Section {editingSection.section_name}</h3>
              <button onClick={() => setEditingSection(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X className="size-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEditSection} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.2rem' }}>
                  Section Name *
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={editSecName}
                  onChange={e => setEditSecName(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.2rem' }}>
                  Student Capacity / Strength *
                </label>
                <input
                  type="number"
                  required
                  className="form-input"
                  value={editSecStrength}
                  onChange={e => setEditSecStrength(e.target.value ? Number(e.target.value) : '')}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setEditingSection(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isUpdatingSection} className="btn btn-primary">
                  {isUpdatingSection ? 'Saving...' : 'Save Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
