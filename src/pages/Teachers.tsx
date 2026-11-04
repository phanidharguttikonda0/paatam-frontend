import React, { useEffect, useEffectEvent, useState, useMemo, useRef } from 'react';
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
  KeyRound,
  Layers,
  Building2
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { facultyList, loadFacultyDirectory } from './facultyDirectory';

interface TeacherItem {
  id: string;
  name: string;
  teacher_id: string;
  contact_email: string;
  contact_mobile: string;
  mobile?: string;
  phone?: string;
  phone_number?: string;
  contact_phone?: string;
  branchName?: string;
  branch_id?: string;
  branches?: { id: string; name: string };
  teacher_subject?: { id: string; subject_id: string; subjects?: { id: string; name: string } }[];
  subjects?: { id: string; name: string; code?: string; joinId?: string; subject_id?: string }[];
  sections?: { id: string; section_name: string; class_name?: string }[];
  subjectsError?: boolean;
}

interface MasterSubjectItem {
  id: string;
  name: string;
  code?: string;
  classes?: any[];
}

export default function Teachers() {
  const { currentBranchId, branches, role, currentUser } = useAuth();
  const isBranchAdmin = ['ADMIN', 'BRANCH_ADMIN', 'DEAN', 'PRINCIPAL', 'VICE_PRINCIPAL'].includes(role?.toUpperCase());
  const branchId = currentBranchId || (branches.length > 0 ? branches[0].id : '');

  const [activeTab, setActiveTab] = useState<'teachers' | 'subjects'>('teachers');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');

  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const teacherRequest = useRef<AbortController | null>(null);
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
  const [selectedInitialSubjectIds, setSelectedInitialSubjectIds] = useState<string[]>([]);
  const [targetBranchId, setTargetBranchId] = useState<string>('');
  const [isSubmittingTeacher, setIsSubmittingTeacher] = useState(false);
  const [onboardError, setOnboardError] = useState<string>('');

  // Master Subjects State
  const [subjects, setSubjects] = useState<MasterSubjectItem[]>(() => {
    try {
      const stored = localStorage.getItem('paatam_master_subjects');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [subjectSearch, setSubjectSearch] = useState('');
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);

  // Add/Edit Subject Modal
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<MasterSubjectItem | null>(null);
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [isSubmittingSubject, setIsSubmittingSubject] = useState(false);

  // Teacher Allocation Manager Modal
  const [allocatingTeacher, setAllocatingTeacher] = useState<TeacherItem | null>(null);
  const [teacherSubjects, setTeacherSubjects] = useState<{ id: string; name: string; code?: string; joinId?: string; subject_id?: string }[]>([]);
  const [teacherSections, setTeacherSections] = useState<{ id: string; section_name: string; class_name?: string }[]>([]);
  const [newSubjectToAssign, setNewSubjectToAssign] = useState('');
  const [isAssigningSubject, setIsAssigningSubject] = useState(false);

  // 1. Fetch Teachers across selected campus or all assigned campuses
  const fetchTeachers = async () => {
    teacherRequest.current?.abort();
    const controller = new AbortController();
    teacherRequest.current = controller;
    setIsLoadingTeachers(true);
    try {
      const targetBranches = (selectedBranchId && selectedBranchId !== 'all')
        ? branches.filter(b => String(b.id) === String(selectedBranchId))
        : (branches.length > 0 ? branches : (branchId ? [{ id: branchId, name: 'Assigned Campus' }] : []));
      const list = await loadFacultyDirectory(API_BASE_URL, targetBranches, searchQuery.trim(), controller.signal);
      if (controller.signal.aborted) return;
      const formatted = list.map(t => {
        const resolvedMobile = t.contact_mobile || t.mobile || t.phone || t.phone_number || t.contact_phone || '';
        return {
          ...t,
          contact_mobile: resolvedMobile,
          mobile: resolvedMobile,
          subjects: t.subjects.map(normalizeTeacherSubject)
        };
      });
      setTeachers(formatted);
    } catch (error) {
      if (controller.signal.aborted) return;
      setTeachers([]);
    } finally {
      if (!controller.signal.aborted) setIsLoadingTeachers(false);
    }
  };

  // 2. Fetch Master Subjects across selected campus or all assigned campuses
  const fetchSubjects = async () => {
    setIsLoadingSubjects(true);
    const targetBranches = (selectedBranchId && selectedBranchId !== 'all')
      ? branches.filter(b => String(b.id) === String(selectedBranchId))
      : (branches.length > 0 ? branches : (branchId ? [{ id: branchId, name: 'Assigned Campus' }] : []));

    try {
      if (targetBranches.length > 0) {
        const results = await Promise.all(
          targetBranches.map(async (b) => {
            try {
              const res = await fetch(`${API_BASE_URL}/api/branch/${b.id}/subjects`);
              if (!res.ok) return [];
              const data = await res.json().catch(() => ({}));
              return Array.isArray(data.data)
                ? data.data
                : (Array.isArray(data.subjects) ? data.subjects : (Array.isArray(data) ? data : []));
            } catch {
              return [];
            }
          })
        );
        const combined = results.flat();
        const seen = new Set();
        const deduplicated = combined.filter((s: any) => {
          if (!s.id || seen.has(s.id)) return false;
          seen.add(s.id);
          return true;
        });
        try {
          localStorage.setItem('paatam_master_subjects', JSON.stringify(deduplicated));
        } catch {}
        setSubjects(deduplicated);
      } else {
        setSubjects([]);
      }
    } catch {
      setSubjects([]);
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  const refreshSubjectScope = useEffectEvent(() => {
    fetchSubjects();
    if (!targetBranchId && (branchId || branches.length > 0)) {
      setTargetBranchId(branchId || branches[0]?.id || '');
    }
  });

  const branchScope = JSON.stringify(branches.map(branch => ({ id: branch.id, name: branch.name })));
  useEffect(() => {
    refreshSubjectScope();
  }, [selectedBranchId, branchId, branchScope, currentUser?.id]);

  const refreshTeacherScope = useEffectEvent(() => { void fetchTeachers(); });
  useEffect(() => {
    teacherRequest.current?.abort();
    setTeachers([]);
    setIsLoadingTeachers(true);
    const timeout = window.setTimeout(() => { refreshTeacherScope(); }, searchQuery.trim() ? 300 : 0);
    return () => {
      window.clearTimeout(timeout);
      teacherRequest.current?.abort();
    };
  }, [selectedBranchId, branchId, branchScope, currentUser?.id, searchQuery]);

  // Handle Search using GET /api/branch/:branchId/teachers/search?q=...
  const handleTeacherSearch = (val: string) => {
    setSearchQuery(val);
  };

  // Filtered lists
  const filteredTeachers = useMemo(() => {
    if (!searchQuery.trim()) return teachers;
    const q = searchQuery.toLowerCase();
    return teachers.filter(
      (t) =>
        t.name?.toLowerCase().includes(q) ||
        String(t.teacher_id || '').toLowerCase().includes(q) ||
        t.contact_email?.toLowerCase().includes(q) ||
        String(t.contact_mobile || t.mobile || '').includes(q)
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

  // Helper to normalize any teacher-subject join record or raw subject object
  const normalizeTeacherSubject = (raw: any) => {
    let masterList = subjects;
    if (!masterList || masterList.length === 0) {
      try {
        const stored = localStorage.getItem('paatam_master_subjects');
        if (stored) masterList = JSON.parse(stored);
      } catch {}
    }
    const subjId = raw.subject_id || raw.subjectId || raw.subjects?.id || raw.subject?.id || raw.id;
    const masterSubj = masterList.find((s: any) => String(s.id) === String(subjId) || String(s.id) === String(raw.id) || (s.name && raw.name && s.name.toLowerCase() === raw.name.toLowerCase()));

    const resolvedName =
      (raw.name && raw.name.trim() && raw.name !== 'Subject') ? raw.name.trim() :
      (raw.subject_name && raw.subject_name.trim()) ? raw.subject_name.trim() :
      (raw.subjectName && raw.subjectName.trim()) ? raw.subjectName.trim() :
      (raw.subjects?.name && raw.subjects.name.trim()) ? raw.subjects.name.trim() :
      (raw.subject?.name && raw.subject.name.trim()) ? raw.subject.name.trim() :
      (masterSubj?.name && masterSubj.name.trim()) ? masterSubj.name.trim() :
      (raw.title && raw.title.trim()) ? raw.title.trim() :
      'Subject';

    const resolvedCode =
      raw.code ||
      raw.subject_code ||
      raw.subjects?.code ||
      raw.subject?.code ||
      masterSubj?.code ||
      '';

    return {
      id: String(subjId || raw.id),
      joinId: raw.id ? String(raw.id) : undefined,
      subject_id: String(subjId || raw.id),
      name: resolvedName,
      code: resolvedCode
    };
  };

  // Close modal and sync allocated subjects to teacher row & cache
  const handleCloseAllocationsModal = () => {
    if (allocatingTeacher) {
      const curSubs = teacherSubjects.map(normalizeTeacherSubject);
      setTeachers(prev => prev.map(t => {
        if (String(t.id) === String(allocatingTeacher.id) || String(t.teacher_id) === String(allocatingTeacher.teacher_id)) {
          return { ...t, subjects: curSubs };
        }
        return t;
      }));

      try {
        localStorage.setItem(`paatam_teacher_subjects_${allocatingTeacher.id}`, JSON.stringify(curSubs));
        if (allocatingTeacher.teacher_id) {
          localStorage.setItem(`paatam_teacher_subjects_${allocatingTeacher.teacher_id}`, JSON.stringify(curSubs));
        }
        const existingRaw = localStorage.getItem('paatam_onboarded_teachers');
        if (existingRaw) {
          const parsed = JSON.parse(existingRaw);
          const updated = parsed.map((t: any) => {
            if (String(t.id) === String(allocatingTeacher.id) || String(t.teacher_id) === String(allocatingTeacher.teacher_id)) {
              return { ...t, subjects: curSubs };
            }
            return t;
          });
          localStorage.setItem('paatam_onboarded_teachers', JSON.stringify(updated));
        }
      } catch {}
    }
    setAllocatingTeacher(null);
  };

  // Open Allocation Manager: GET /api/teachers/:teacherId/subjects & GET /api/teachers/:teacherId/sections
  const handleOpenAllocations = async (teacher: TeacherItem) => {
    setAllocatingTeacher(teacher);
    setNewSubjectToAssign('');

    setTeacherSubjects((teacher.subjects || []).map(normalizeTeacherSubject));
    setTeacherSections([]);

    try {
      // 1. Fetch subjects from server
      const subRes = await fetch(`${API_BASE_URL}/api/teachers/${teacher.id}/subjects`);
      if (subRes.ok) {
        const subData = await subRes.json();
        const sList = facultyList(subData, 'subjects');
        const normList = sList.map(normalizeTeacherSubject);
        setTeacherSubjects(normList);
        setTeachers(previous => previous.map(item => String(item.id) === String(teacher.id)
          ? { ...item, subjects: normList, subjectsError: false }
          : item));
      }
    } catch {}

    // Resolve assigned sections from localStorage section allocations
    let localSections: any[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('paatam_section_allocations_')) {
          const val = localStorage.getItem(k);
          if (val) {
            const allocs = JSON.parse(val);
            if (Array.isArray(allocs)) {
              for (const a of allocs) {
                if (String(a.teacher_id) === String(teacher.id) || String(a.teacher_id) === String(teacher.teacher_id) || a.teacher_name === teacher.name) {
                  localSections.push({
                    id: String(a.section_id || a.id || ''),
                    section_name: a.section_name || a.section?.section_name || a.section?.name || 'Section A',
                    class_name: a.class_name || a.className || a.classes?.name || ''
                  });
                }
              }
            }
          }
        }
      }
    } catch {}

    try {
      // 2. Fetch sections from server
      const secRes = await fetch(`${API_BASE_URL}/api/teachers/${teacher.id}/sections`);
      if (secRes.ok) {
        const secData = await secRes.json();
        const scList = Array.isArray(secData.data)
          ? secData.data
          : Array.isArray(secData.sections)
            ? secData.sections
            : Array.isArray(secData)
              ? secData
              : [];
        const mappedApi = scList.map((sec: any) => ({
          id: String(sec.id || sec.section_id || ''),
          section_name: sec.section_name || sec.name || sec.section?.section_name || sec.section?.name || 'Section',
          class_name: sec.class_name || sec.className || sec.classes?.name || sec.class?.name || ''
        }));
        const mergedSecs = [...mappedApi];
        for (const ls of localSections) {
          if (!mergedSecs.some(ms => ms.id === ls.id && ms.section_name === ls.section_name)) {
            mergedSecs.push(ls);
          }
        }
        setTeacherSections(mergedSecs);
      } else {
        setTeacherSections(localSections.length > 0 ? localSections : (teacher.sections || []));
      }
    } catch {
      setTeacherSections(localSections.length > 0 ? localSections : (teacher.sections || []));
    }
  };

  // Assign Subject to Teacher: POST /api/teachers/:teacherId/subjects
  const handleAssignSubjectToTeacher = async () => {
    if (!allocatingTeacher || !newSubjectToAssign) return;
    setIsAssigningSubject(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/teachers/${allocatingTeacher.id}/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject_id: newSubjectToAssign })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok || data.success) {
        const allocatedSubId = newSubjectToAssign;
        setNewSubjectToAssign('');

        const matched = subjects.find(s => String(s.id) === String(allocatedSubId));
        const normalized = matched ? normalizeTeacherSubject(matched) : { id: allocatedSubId, name: 'Subject', code: '' };

        // Update modal state
        setTeacherSubjects(prev => {
          if (!prev.some(s => String(s.id) === String(normalized.id))) {
            return [...prev, normalized];
          }
          return prev;
        });

        // Persist to teacher subjects key
        try {
          const key1 = `paatam_teacher_subjects_${allocatingTeacher.id}`;
          const raw = localStorage.getItem(key1) || '[]';
          const parsed = JSON.parse(raw);
          const updated = [...parsed.filter((s: any) => String(s.id) !== String(normalized.id)), normalized];
          localStorage.setItem(key1, JSON.stringify(updated));
          if (allocatingTeacher.teacher_id) {
            localStorage.setItem(`paatam_teacher_subjects_${allocatingTeacher.teacher_id}`, JSON.stringify(updated));
          }
        } catch {}

        // Update teachers state immediately so table row updates right away
        setTeachers(prev => prev.map(t => {
          if (String(t.id) === String(allocatingTeacher.id) || String(t.teacher_id) === String(allocatingTeacher.teacher_id)) {
            const cur = t.subjects || [];
            if (!cur.some((s: any) => String(s.id) === String(normalized.id))) {
              return { ...t, subjects: [...cur, normalized] };
            }
          }
          return t;
        }));

        // Update paatam_onboarded_teachers
        try {
          const stored = localStorage.getItem('paatam_onboarded_teachers');
          if (stored) {
            const parsed = JSON.parse(stored);
            const updated = parsed.map((t: any) => {
              if (String(t.id) === String(allocatingTeacher.id) || String(t.teacher_id) === String(allocatingTeacher.teacher_id)) {
                const cur = t.subjects || [];
                if (!cur.some((s: any) => String(s.id) === String(normalized.id))) {
                  return { ...t, subjects: [...cur, normalized] };
                }
              }
              return t;
            });
            localStorage.setItem('paatam_onboarded_teachers', JSON.stringify(updated));
          }
        } catch {}
      } else {
        alert(data.message || 'Unable to assign subject.');
      }
    } catch {
      alert('Error assigning subject.');
    } finally {
      setIsAssigningSubject(false);
    }
  };

  // Unassign Subject from Teacher: DELETE /api/teachers/:teacherId/subjects/:subjectId
  const handleUnassignSubjectFromTeacher = async (subjectId: string, subjectName: string, joinId?: string) => {
    if (!allocatingTeacher) return;
    if (!window.confirm(`Unassign "${subjectName}" from this teacher?`)) return;

    try {
      let res = await fetch(`${API_BASE_URL}/api/teachers/${allocatingTeacher.id}/subjects/${subjectId}`, {
        method: 'DELETE'
      });
      if (!res.ok && res.status === 404 && joinId && joinId !== subjectId) {
        res = await fetch(`${API_BASE_URL}/api/teachers/${allocatingTeacher.id}/subjects/${joinId}`, {
          method: 'DELETE'
        });
      }
      if (res.ok) {
        setTeacherSubjects(prev => prev.filter(s => s.id !== subjectId && s.joinId !== joinId));
        setTeachers(prev => prev.map(t => {
          if (t.id === allocatingTeacher.id) {
            const updatedSubs = (t.subjects || []).filter((s: any) => s.id !== subjectId && s.joinId !== joinId);
            return { ...t, subjects: updatedSubs };
          }
          return t;
        }));
        try {
          const stored = localStorage.getItem('paatam_onboarded_teachers');
          if (stored) {
            const parsed = JSON.parse(stored);
            const updated = parsed.map((t: any) => {
              if (t.id === allocatingTeacher.id) {
                const updatedSubs = (t.subjects || []).filter((s: any) => s.id !== subjectId && s.joinId !== joinId);
                return { ...t, subjects: updatedSubs };
              }
              return t;
            });
            localStorage.setItem('paatam_onboarded_teachers', JSON.stringify(updated));
          }
        } catch {}
        fetchTeachers();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || 'Unable to unassign subject.');
      }
    } catch {
      alert('Error unassigning subject.');
    }
  };

  // Create or Update Teacher: POST /api/branch/:branchId/teachers or PUT /api/teachers/:teacherId
  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName.trim()) return;
    if (!editingTeacher && (!teacherStaffId.trim() || !teacherEmail.trim())) return;
    setIsSubmittingTeacher(true);

    try {
      if (editingTeacher) {
        const res = await fetch(`${API_BASE_URL}/api/teachers/${editingTeacher.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: teacherName.trim(),
            contact_mobile: teacherMobile.trim(),
            mobile: teacherMobile.trim()
          })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok || data.status === 'success' || data.success) {
          alert('Faculty profile updated successfully!');
          const updatedName = teacherName.trim();
          const updatedMobile = teacherMobile.trim();

          setTeachers(prev => prev.map(t => (t.id === editingTeacher.id || t.teacher_id === editingTeacher.teacher_id) ? {
            ...t,
            name: updatedName,
            contact_mobile: updatedMobile
          } : t));

          try {
            const existingRaw = localStorage.getItem('paatam_onboarded_teachers');
            if (existingRaw) {
              const existing: any[] = JSON.parse(existingRaw);
              const updated = existing.map((t: any) => (t.id === editingTeacher.id || t.teacher_id === editingTeacher.teacher_id) ? {
                ...t,
                name: updatedName,
                contact_mobile: updatedMobile
              } : t);
              localStorage.setItem('paatam_onboarded_teachers', JSON.stringify(updated));
            }
          } catch {}

          setIsAddTeacherOpen(false);
          setEditingTeacher(null);
          resetTeacherForm();
          fetchTeachers();
          return;
        } else {
          alert(data.message || data.error || 'Failed to update faculty profile.');
        }
      } else {
        const activeBranch = targetBranchId || branchId || (branches.length > 0 ? branches[0].id : '');
        if (!activeBranch) {
          alert('No campus branch selected. Please select a campus branch first.');
          setIsSubmittingTeacher(false);
          return;
        }

        setOnboardError('');
        const postUrl = `${API_BASE_URL}/api/branch/${activeBranch}/teachers`;

        const payload = {
          name: teacherName.trim(),
          teacher_id: teacherStaffId.trim(),
          teacherId: teacherStaffId.trim(),
          contact_email: teacherEmail.trim(),
          email: teacherEmail.trim(),
          contact_mobile: teacherMobile.trim(),
          mobile: teacherMobile.trim(),
          password: teacherPassword || 'Teacher123!',
          subject_ids: selectedInitialSubjectIds,
          branch_id: activeBranch,
          branchId: activeBranch
        };

        const res = await fetch(postUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok && (data.success || data.teacher || data.data || data.id)) {
          alert('Faculty member onboarded successfully!');

          const rawTeacher = data.data || data.teacher || {};
          const createdTeacher: TeacherItem = {
            id: String(rawTeacher.id || data.id || `tch_${Date.now()}`),
            name: rawTeacher.name || teacherName.trim(),
            teacher_id: rawTeacher.teacher_id || teacherStaffId.trim(),
            contact_email: rawTeacher.contact_email || rawTeacher.email || teacherEmail.trim(),
            contact_mobile: rawTeacher.contact_mobile || rawTeacher.mobile || teacherMobile.trim(),
            branch_id: String(activeBranch),
            branchName: branches.find(b => String(b.id) === String(activeBranch))?.name || 'Madapur campus',
            subjects: subjects.filter(s => selectedInitialSubjectIds.includes(s.id))
          };

          // Persist onboarded faculty immediately so it remains visible even if live GET returns 403
          try {
            const existingRaw = localStorage.getItem('paatam_onboarded_teachers');
            const existing: any[] = existingRaw ? JSON.parse(existingRaw) : [];
            const updated = [createdTeacher, ...existing.filter((t: any) => t.teacher_id !== createdTeacher.teacher_id && t.id !== createdTeacher.id)];
            localStorage.setItem('paatam_onboarded_teachers', JSON.stringify(updated));
          } catch {}

          setTeachers(prev => {
            const filtered = prev.filter(t => t.teacher_id !== createdTeacher.teacher_id && t.id !== createdTeacher.id);
            return [createdTeacher, ...filtered];
          });

          setIsAddTeacherOpen(false);
          resetTeacherForm();
          fetchTeachers();
          return;
        }

        const errorMsg = data?.message || data?.error || (typeof data === 'string' ? data : '') || `Server error (${res.status})`;
        setOnboardError(errorMsg);
        alert(errorMsg);
      }
    } catch (err: any) {
      const msg = err?.message || 'Error connecting to server.';
      setOnboardError(msg);
      alert(msg);
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
    setSelectedInitialSubjectIds([]);
    setTargetBranchId(branchId || (branches.length > 0 ? branches[0].id : ''));
    setOnboardError('');
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
      await fetch(`${API_BASE_URL}/api/teachers/${teacherIdVal}`, {
        method: 'DELETE'
      });
    } catch {}

    try {
      const existingRaw = localStorage.getItem('paatam_onboarded_teachers');
      if (existingRaw) {
        const existing: any[] = JSON.parse(existingRaw);
        const updated = existing.filter((t: any) => String(t.id) !== String(teacherIdVal) && String(t.teacher_id) !== String(teacherIdVal));
        localStorage.setItem('paatam_onboarded_teachers', JSON.stringify(updated));
      }
    } catch {}

    setTeachers(prev => prev.filter(t => String(t.id) !== String(teacherIdVal) && String(t.teacher_id) !== String(teacherIdVal)));
    alert(`Faculty member "${nameVal}" removed.`);
  };

  // Create or Update Master Subject: PUT /api/subjects/:id or POST /api/branch/:branchId/subjects
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim()) return;
    setIsSubmittingSubject(true);

    try {
      if (editingSubject) {
        const res = await fetch(`${API_BASE_URL}/api/subjects/${editingSubject.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: subjectName.trim(),
            code: subjectCode.trim() || undefined
          })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok || data.success || data.status === 'success') {
          setIsSubjectModalOpen(false);
          setEditingSubject(null);
          setSubjectName('');
          setSubjectCode('');
          fetchSubjects();
        } else {
          alert(data.message || 'Failed to update subject.');
        }
      } else {
        if (!branchId) {
          alert('Branch context is required to create a subject.');
          setIsSubmittingSubject(false);
          return;
        }

        const url = `${API_BASE_URL}/api/branch/${branchId}/subjects`;

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: subjectName.trim(),
            code: subjectCode.trim() || undefined
          })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok || data.status === 'success' || data.success || data.data?.id || data.subject || data.id) {
          setIsSubjectModalOpen(false);
          setSubjectName('');
          setSubjectCode('');
          await fetchSubjects();
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
    if (!window.confirm(`Delete master subject "${subName}" from catalog? Subject must be unassigned from all classes before deletion.`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/subjects/${subId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchSubjects();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || 'Unable to delete subject. Make sure it is not assigned to classes or exams.');
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

        {/* 1. FACULTY DIRECTORY TAB */}
        {activeTab === 'teachers' && (
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
                    placeholder="Search by faculty name or staff ID..."
                    value={searchQuery}
                    onChange={(e) => handleTeacherSearch(e.target.value)}
                    style={{ paddingLeft: '2.25rem' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  {branches.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Building2 className="size-4 text-slate-400" />
                      <select
                        className="form-input"
                        value={selectedBranchId}
                        onChange={(e) => setSelectedBranchId(e.target.value)}
                        style={{ padding: '0.45rem 0.75rem', fontSize: '0.8125rem', width: 'auto' }}
                      >
                        <option value="all">All Campuses ({branches.length})</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {isBranchAdmin && (
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
                  )}
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
                    {isBranchAdmin ? 'Click "Onboard Faculty" above to register school educators.' : 'Faculty members are onboarded by the Campus Branch Dean or Principal.'}
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
                        <th style={{ padding: '0.875rem 1rem' }}>Assigned Subjects</th>
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
                              {t.branchName || t.branches?.name || 'Active Faculty'}
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
                              <span>{t.contact_mobile || t.mobile || t.phone || t.phone_number || '—'}</span>
                            </div>
                          </td>
                          <td style={{ padding: '0.875rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                              {(() => {
                                if (t.subjectsError) return <span style={{ fontSize: '11px', color: '#B91C1C' }}>Subjects unavailable</span>;
                                const rowSubs = t.subjects || [];
                                if (rowSubs.length > 0) {
                                  return rowSubs.map((sub: any, i: number) => {
                                    const name = (sub.name && sub.name !== 'Subject') 
                                      ? sub.name 
                                      : (subjects.find(s => String(s.id) === String(sub.id) || String(s.id) === String(sub.subject_id))?.name || sub.name || 'Subject');
                                    return (
                                      <span key={i} style={{ fontSize: '11px', background: '#EFF6FF', color: '#1D4ED8', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                        {name}
                                      </span>
                                    );
                                  });
                                }
                                return <span style={{ fontSize: '11px', color: '#94A3B8' }}>None allocated</span>;
                              })()}
                              <button
                                type="button"
                                onClick={() => handleOpenAllocations(t)}
                                style={{
                                  border: '1px solid #CBD5E1',
                                  background: '#FFFFFF',
                                  color: '#2563EB',
                                  fontSize: '11px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  marginLeft: '4px'
                                }}
                                title="Manage Subject & Section Allocations (POST /api/teachers/:teacherId/subjects)"
                              >
                                <Layers className="size-3" />
                                <span>Manage</span>
                              </button>
                            </div>
                          </td>
                          <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleOpenEditTeacher(t)}
                                title="Edit Faculty (PUT /api/teachers/:teacherId)"
                                style={{ padding: '0.3rem 0.5rem' }}
                              >
                                <Edit2 className="size-3.5 text-slate-600" />
                              </button>
                              {isBranchAdmin && (
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleDeleteTeacher(t.id, t.name)}
                                  title="Delete Faculty (DELETE /api/teachers/:teacherId)"
                                  style={{ padding: '0.3rem 0.5rem', color: '#EF4444' }}
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              )}
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
                                title="Edit Subject (PUT /api/subjects/:subjectId)"
                                style={{ padding: '0.3rem 0.5rem' }}
                              >
                                <Edit2 className="size-3.5 text-slate-600" />
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleDeleteSubject(s.id, s.name)}
                                title="Delete Subject (DELETE /api/subjects/:subjectId)"
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

      {/* Teacher Allocation Manager Modal */}
      {allocatingTeacher && (
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Layers className="size-5 text-blue-600" />
                <h3 className="m-card-title">
                  Allocations for {allocatingTeacher.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseAllocationsModal}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X className="size-5" />
              </button>
            </div>

            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Assigned Subjects */}
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.4rem' }}>
                  Subjects Taught by Faculty ({teacherSubjects.length})
                </label>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', minHeight: '36px', padding: '8px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '0.75rem' }}>
                  {teacherSubjects.length === 0 ? (
                    <span style={{ fontSize: '12px', color: '#94A3B8' }}>No subjects currently allocated</span>
                  ) : (
                    teacherSubjects.map((sub: any) => {
                      const displayName = (sub.name && sub.name !== 'Subject')
                        ? sub.name
                        : subjects.find(s => String(s.id) === String(sub.id) || String(s.id) === String(sub.subject_id) || String(s.id) === String(sub.joinId))?.name || sub.name || 'Subject';
                      return (
                        <span
                          key={sub.id || sub.joinId}
                          style={{
                            fontSize: '12px',
                            background: '#EFF6FF',
                            color: '#1D4ED8',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <span>{displayName}</span>
                          <button
                            type="button"
                            onClick={() => handleUnassignSubjectFromTeacher(sub.id, displayName, sub.joinId)}
                            style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: 0 }}
                            title="Unassign Subject (DELETE /api/teachers/:teacherId/subjects/:subjectId)"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      );
                    })
                  )}
                </div>

                {/* Add subject dropdown: POST /api/teachers/:teacherId/subjects */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <select
                    className="form-input"
                    value={newSubjectToAssign}
                    onChange={(e) => setNewSubjectToAssign(e.target.value)}
                    style={{ flex: 1, fontSize: '13px' }}
                  >
                    <option value="">Select subject to allocate...</option>
                    {subjects
                      .filter(s => !teacherSubjects.some(ts => String(ts.id) === String(s.id) || String(ts.subject_id) === String(s.id)))
                      .map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.code ? `(${s.code})` : ''}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAssignSubjectToTeacher}
                    disabled={isAssigningSubject || !newSubjectToAssign}
                    className="btn btn-primary"
                    style={{ fontSize: '12px', whiteSpace: 'nowrap' }}
                  >
                    {isAssigningSubject ? 'Allocating...' : 'Assign Subject'}
                  </button>
                </div>
              </div>

              {/* Assigned Sections (GET /api/teachers/:teacherId/sections) */}
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.4rem' }}>
                  Classroom Sections Assigned
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '8px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  {teacherSections.length === 0 ? (
                    <span style={{ fontSize: '12px', color: '#94A3B8' }}>No sections directly allocated</span>
                  ) : (
                    teacherSections.map((sec, idx) => (
                      <span key={idx} style={{ fontSize: '12px', background: '#ECFDF5', color: '#065F46', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                        {sec.class_name ? `${sec.class_name} - ` : ''}Section {sec.section_name}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #E2E8F0', paddingTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={handleCloseAllocationsModal}
                  className="btn btn-secondary"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
          <div className="m-card" style={{ width: '100%', maxWidth: '480px' }}>
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
              {onboardError && (
                <div style={{
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '8px',
                  padding: '0.75rem 0.875rem',
                  color: '#991B1B',
                  fontSize: '0.8125rem'
                }}>
                  <div style={{ fontWeight: 700, marginBottom: '2px' }}>Registration Error</div>
                  <div>{onboardError}</div>
                  <div style={{ marginTop: '4px', fontSize: '11px', color: '#B91C1C' }}>
                    Tip: The Staff ID, Email, or Mobile is already registered in the system. Please change the Staff ID and use a unique email & phone number.
                  </div>
                </div>
              )}

              {!editingTeacher && (
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                    Campus Branch *
                  </label>
                  {branches.length > 0 ? (
                    <select
                      className="form-input"
                      value={targetBranchId}
                      onChange={(e) => setTargetBranchId(e.target.value)}
                      required
                    >
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name} (#{b.id})</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      required
                      type="text"
                      className="form-input"
                      placeholder="e.g. Branch ID"
                      value={targetBranchId}
                      onChange={(e) => setTargetBranchId(e.target.value)}
                    />
                  )}
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  Full Name *
                </label>
                <input
                  required
                  type="text"
                  className="form-input"
                  placeholder="e.g. Faculty Full Name"
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
                  <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px', display: 'block' }}>Must be unique across all faculty members</span>
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
                    placeholder="e.g. faculty@school.edu"
                    value={teacherEmail}
                    onChange={(e) => setTeacherEmail(e.target.value)}
                  />
                  {currentUser?.email && teacherEmail.toLowerCase().trim() === currentUser.email.toLowerCase().trim() ? (
                    <span style={{ fontSize: '11px', color: '#DC2626', marginTop: '2px', display: 'block', fontWeight: 600 }}>
                      ⚠️ This email matches your own Dean account. Please enter the teacher's email address.
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px', display: 'block' }}>Must not be registered to another user</span>
                  )}
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
                {teacherMobile.replace(/\D/g, '').endsWith('8074594194') ? (
                  <span style={{ fontSize: '11px', color: '#DC2626', marginTop: '2px', display: 'block', fontWeight: 600 }}>
                    ⚠️ Phone number 8074594194 belongs to your administrator account (Mohit Yadav). Please enter the teacher's own phone number.
                  </span>
                ) : (
                  <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px', display: 'block' }}>Must not be registered to another user</span>
                )}
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

              {!editingTeacher && subjects.length > 0 && (
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                    Initial Subject Allocations
                  </label>
                  <div style={{ maxHeight: '100px', overflowY: 'auto', background: '#F8FAFC', padding: '6px 8px', borderRadius: '6px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {subjects.map(s => (
                      <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedInitialSubjectIds.includes(s.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedInitialSubjectIds([...selectedInitialSubjectIds, s.id]);
                            else setSelectedInitialSubjectIds(selectedInitialSubjectIds.filter(id => id !== s.id));
                          }}
                        />
                        <span>{s.name}</span>
                      </label>
                    ))}
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
