import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Plus,
  ChevronRight,
  Calendar,
  Trash2,
  X,
  Edit2,
  CheckCircle2
} from 'lucide-react';
import { API_BASE_URL, getAuthToken } from '../config/api';
import { useAuth } from '../context/AuthContext';

export interface AcademicYear {
  id: string;
  name?: string;
  start_year?: number;
  end_year?: number;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
}

const getAcademicSessionLabel = (ay?: AcademicYear | null): string => {
  if (!ay) return 'No Session Selected';
  if (ay.name && ay.name.trim()) return ay.name.trim();
  if (ay.start_year && ay.end_year) return `${ay.start_year} - ${ay.end_year}`;
  if (ay.start_year) return `${ay.start_year} - ${Number(ay.start_year) + 1}`;
  return `Academic Session #${ay.id}`;
};

export type ClassItem = {
  id: string;
  name: string;
  class_order?: number;
  sections_count?: number;
  subjects_count?: number;
  section?: string | null;
  sections?: { id: string; section_name: string; strength: number }[];
  createdAt?: string;
};

const cleanSecName = (raw: string) => {
  if (!raw) return 'A';
  return String(raw).replace(/^Section\s+/i, '').trim() || 'A';
};

export default function Classes() {
  const navigate = useNavigate();
  const { currentBranchId, branches, role, currentUser } = useAuth();
  const activeBranchId =
    currentBranchId ||
    currentUser?.branchId ||
    (currentUser as any)?.branch_id ||
    (branches.length > 0 ? branches[0].id : '') ||
    localStorage.getItem('paatam_branch_id') ||
    '';
  const isBranchAdmin = ['ADMIN', 'BRANCH_ADMIN', 'DEAN', 'PRINCIPAL', 'VICE_PRINCIPAL'].includes(role?.toUpperCase());
  const isTeacher = role?.toUpperCase() === 'TEACHER';

  // Academic Sessions State
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>('');
  const [isAddSessionOpen, setIsAddSessionOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState('2026-2027');
  const [startYear, setStartYear] = useState<number>(2026);
  const [endYear, setEndYear] = useState<number>(2027);

  const handleSessionNameChange = (val: string) => {
    setNewSessionName(val);
    const matches = val.match(/\d{4}/g);
    if (matches && matches.length >= 2) {
      setStartYear(parseInt(matches[0], 10));
      setEndYear(parseInt(matches[1], 10));
    } else if (matches && matches.length === 1) {
      const s = parseInt(matches[0], 10);
      setStartYear(s);
      setEndYear(s + 1);
    }
  };

  const handleStartYearChange = (val: number) => {
    setStartYear(val);
    setEndYear(val + 1);
    setNewSessionName(`${val}-${val + 1}`);
  };

  const handleEndYearChange = (val: number) => {
    setEndYear(val);
    setNewSessionName(`${startYear}-${val}`);
  };

    // Classes State
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [newClassName, setNewClassName] = useState('');
  const [newClassOrder, setNewClassOrder] = useState<number>(10);
  const [selectedSections, setSelectedSections] = useState<string[]>(['A']);
  const [customSectionInput, setCustomSectionInput] = useState('');
  const [createClassError, setCreateClassError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Edit Class Modal
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [editClassName, setEditClassName] = useState('');
  const [editClassOrder, setEditClassOrder] = useState<number>(10);
  const [isUpdatingClass, setIsUpdatingClass] = useState(false);

  // 1. Fetch Academic Years for Branch or Global
  const fetchAcademicYears = async () => {
    if (isTeacher) return;
    let rawList: any[] = [];

    if (activeBranchId) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/branch/${activeBranchId}/academic-years`);
        if (res.ok) {
          const data = await res.json();
          rawList = Array.isArray(data.data) ? data.data : Array.isArray(data.academicYears) ? data.academicYears : [];
        }
      } catch (e) {}
    }

    if (rawList.length === 0) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/academic-years`);
        if (res.ok) {
          const data = await res.json();
          rawList = Array.isArray(data.data) ? data.data : Array.isArray(data.academicYears) ? data.academicYears : Array.isArray(data) ? data : [];
        }
      } catch (e) {}
    }

    if (rawList.length > 0) {
      const formattedList: AcademicYear[] = rawList.map((item: any) => ({
        ...item,
        id: String(item.id),
        name: item.name || (item.start_year && item.end_year ? `${item.start_year} - ${item.end_year}` : item.start_year ? `${item.start_year} - ${Number(item.start_year) + 1}` : `Session #${item.id}`),
        start_year: item.start_year ? Number(item.start_year) : undefined,
        end_year: item.end_year ? Number(item.end_year) : undefined,
        is_active: Boolean(item.is_active)
      }));
      setAcademicYears(formattedList);
      if (!selectedAcademicYearId || !formattedList.some((ay: AcademicYear) => ay.id === selectedAcademicYearId)) {
        const activeOne = formattedList.find((ay: AcademicYear) => ay.is_active) || formattedList[0];
        setSelectedAcademicYearId(activeOne.id);
      }
    } else {
      const defaultAY: AcademicYear = {
        id: 'ay_active',
        name: '2026 - 2027',
        start_year: 2026,
        end_year: 2027,
        is_active: true
      };
      setAcademicYears([defaultAY]);
      setSelectedAcademicYearId(defaultAY.id);
    }
  };

  // 2. Fetch Classes in Selected Academic Year or Teacher Assignments
  const fetchClasses = async () => {
    setIsLoading(true);
    let loadedClasses: ClassItem[] = [];

    // For Teachers: immediately query teacher dashboard (GET /api/teacher/dashboard)
    if (isTeacher) {
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

          const classMap = new Map<string, ClassItem>();

          // Role-based section filter: only include sections explicitly allocated to this teacher
          const teacherId = String(currentUser?.id || (currentUser as any)?.teacher_id || (currentUser as any)?.staff_id || '');
          const teacherName = (currentUser?.name || '').toLowerCase();
          const explicitSectionIds = new Set<string>();
          const explicitSectionNames = new Set<string>();

          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('paatam_section_allocations_') || key.startsWith('paatam_section_allocations_name_'))) {
              const sId = key.replace(/^paatam_section_allocations_(name_)?/, '');
              try {
                const raw = localStorage.getItem(key);
                if (raw) {
                  const list = JSON.parse(raw);
                  if (Array.isArray(list)) {
                    for (const alloc of list) {
                      const matchesTeacher =
                        String(alloc.teacher_id) === teacherId ||
                        String(alloc.teacher?.id) === teacherId ||
                        String(alloc.teacher?.teacher_id) === teacherId ||
                        (teacherId && (String(alloc.teacher_id).includes(teacherId) || teacherId.includes(String(alloc.teacher_id)))) ||
                        (teacherName && alloc.teacher?.name && alloc.teacher.name.toLowerCase().includes(teacherName)) ||
                        (teacherName && alloc.teacher_name && alloc.teacher_name.toLowerCase().includes(teacherName));

                      if (matchesTeacher) {
                        explicitSectionIds.add(String(sId));
                        if (alloc.section_name) {
                          explicitSectionNames.add(cleanSecName(alloc.section_name));
                        }
                      }
                    }
                  }
                }
              } catch {}
            }
          }

          if (explicitSectionIds.size > 0 || explicitSectionNames.size > 0) {
            allocations = allocations.filter((a: any) =>
              explicitSectionIds.has(String(a.section_id)) ||
              explicitSectionNames.has(cleanSecName(a.section_name)) ||
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
                class_order: 10,
                sections_count: 0,
                subjects_count: 0,
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
              entry.sections_count = entry.sections.length;
            }
            if (alloc.subject_name) {
              entry.subjects_count = (entry.subjects_count || 0) + 1;
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
                class_order: 10,
                sections_count: 1,
                subjects_count: 1,
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
                entry.sections_count = entry.sections.length;
              }
            }
          }

          loadedClasses = Array.from(classMap.values());
          if (loadedClasses.length > 0) {
            try {
              localStorage.setItem('paatam_school_classes', JSON.stringify(loadedClasses));
            } catch {}
            setClasses(loadedClasses);
            setIsLoading(false);
            return;
          }
        }
      } catch (e) {
        console.error('Failed to load teacher classes:', e);
      }

      // Fallback to cached classes
      try {
        const cached = localStorage.getItem('paatam_school_classes');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setClasses(parsed);
            setIsLoading(false);
            return;
          }
        }
      } catch {}

      setClasses([]);
      setIsLoading(false);
      return;
    }

    // For Admin / Deans:
    // 1. Try academic year endpoint if specific session selected
    if (selectedAcademicYearId && selectedAcademicYearId !== 'ay_active') {
      try {
        const res = await fetch(`${API_BASE_URL}/api/academic-years/${selectedAcademicYearId}/classes`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data.data) ? data.data : Array.isArray(data.classes) ? data.classes : [];
          if (list.length > 0) {
            loadedClasses = list;
          }
        }
      } catch (e) {}
    }

    // 2. Try branch academic years if not loaded yet
    if (loadedClasses.length === 0 && activeBranchId) {
      try {
        const ayRes = await fetch(`${API_BASE_URL}/api/branch/${activeBranchId}/academic-years`);
        if (ayRes.ok) {
          const ayData = await ayRes.json();
          const ayList = Array.isArray(ayData.data) ? ayData.data : Array.isArray(ayData.academicYears) ? ayData.academicYears : [];
          const activeAy = ayList.find((ay: any) => ay.is_active) || ayList[0];
          if (activeAy?.id) {
            const res = await fetch(`${API_BASE_URL}/api/academic-years/${activeAy.id}/classes`);
            if (res.ok) {
              const data = await res.json();
              const list = Array.isArray(data.data) ? data.data : Array.isArray(data.classes) ? data.classes : [];
              if (list.length > 0) loadedClasses = list;
            }
          }
        }
      } catch (e) {}
    }

    // 3. Fallback from cached school classes
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
      try {
        localStorage.setItem('paatam_school_classes', JSON.stringify(loadedClasses));
      } catch {}
    }

    setClasses(loadedClasses);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAcademicYears();
    fetchClasses();
  }, [currentBranchId, activeBranchId]);

  useEffect(() => {
    if (selectedAcademicYearId) {
      fetchClasses();
    }
  }, [selectedAcademicYearId]);

    // Smart input parser for grade & section
  const handleClassNameChange = (val: string) => {
    setNewClassName(val);
    setCreateClassError('');
    // Auto-detect if user typed "Grade 10 A" or "Class 9 B" or "10-C"
    const match = val.trim().match(/^(.*?)(?:\s+|-)([A-Da-d])$/);
    if (match) {
      const suggestedName = match[1].trim();
      const suggestedSec = match[2].toUpperCase();
      const numMatch = suggestedName.match(/\d+/);
      if (numMatch) {
        setNewClassOrder(Number(numMatch[0]));
      }
      if (!selectedSections.includes(suggestedSec)) {
        setSelectedSections(prev => [...prev, suggestedSec]);
      }
    } else {
      const numMatch = val.match(/\d+/);
      if (numMatch) {
        setNewClassOrder(Number(numMatch[0]));
      }
    }
  };

  // Add custom section badge
  const handleAddCustomSection = (e: React.FormEvent) => {
    e.preventDefault();
    const s = customSectionInput.trim().toUpperCase();
    if (s && !selectedSections.includes(s)) {
      setSelectedSections([...selectedSections, s]);
      setCustomSectionInput('');
    }
  };

  // Create Class under Academic Year: POST /api/academic-years/:academicYearId/classes
  const handleCreateClass = async () => {
    let name = newClassName.trim();
    if (!name) return;
    setCreateClassError('');

    // Normalize trailing section letter if user typed e.g. "Grade 10 A"
    const trailingSec = name.match(/^(.*?)(?:\s+|-)([A-Da-d])$/);
    let sectionsList = selectedSections.length > 0 ? selectedSections : ['A'];
    if (trailingSec) {
      name = trailingSec[1].trim();
      const secLetter = trailingSec[2].toUpperCase();
      if (!sectionsList.includes(secLetter)) {
        sectionsList = [...sectionsList, secLetter];
      }
    }

    const token = getAuthToken();
    if (!token) {
      const msg = 'Missing authentication token. Please sign in as Dean or Principal to perform academic setup.';
      setCreateClassError(msg);
      alert(msg);
      return;
    }

    if (!selectedAcademicYearId) {
      const msg = 'Please create or select an Academic Session first using "+ New Session".';
      setCreateClassError(msg);
      alert(msg);
      return;
    }

    setIsCreating(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      };

      // Backend documented API: POST /api/academic-years/:academicYearId/classes
      // Schema: { name, class_order, initial_sections }
      let res = await fetch(`${API_BASE_URL}/api/academic-years/${selectedAcademicYearId}/classes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name,
          class_order: Number(newClassOrder) || 10,
          initial_sections: sectionsList,
          sections: sectionsList.map(s => ({ section_name: s, strength: 35 }))
        })
      });

      if (!res.ok && res.status === 404) {
        res = await fetch(`${API_BASE_URL}/api/classes`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name,
            class_order: Number(newClassOrder) || 10,
            section: sectionsList[0] || 'A',
            initial_sections: sectionsList
          })
        });
      }

      const data = await res.json().catch(() => ({}));
      if (res.ok || data.success || data.status === 'success') {
        setNewClassName('');
        setSelectedSections(['A']);
        setCreateClassError('');
        fetchClasses();
      } else {
        const msg = data.message || 'Unable to create class. Please verify session and permissions.';
        setCreateClassError(msg);
        alert(msg);
      }
    } catch (err: any) {
      const msg = err.message || 'Error connecting to server.';
      setCreateClassError(msg);
      alert(msg);
    } finally {
      setIsCreating(false);
    }
  };

  // Add Academic Year Session: POST /api/branch/:branchId/academic-years
  const handleCreateAcademicYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;

    const targetBranch = activeBranchId;
    if (!targetBranch) {
      alert('Please select or create a Campus Branch before creating an Academic Session.');
      return;
    }

    // Parse start_year and end_year as guaranteed numbers
    let sYear = Number(startYear);
    let eYear = Number(endYear);

    const matches = newSessionName.match(/\d{4}/g);
    if (matches && matches.length >= 2) {
      sYear = parseInt(matches[0], 10);
      eYear = parseInt(matches[1], 10);
    } else if (matches && matches.length === 1) {
      sYear = parseInt(matches[0], 10);
      eYear = sYear + 1;
    }

    if (!sYear || isNaN(sYear)) sYear = 2026;
    if (!eYear || isNaN(eYear)) eYear = sYear + 1;

    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Backend expects: { start_year: number, end_year: number, is_active: boolean, name?: string }
      const res = await fetch(`${API_BASE_URL}/api/branch/${targetBranch}/academic-years`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          start_year: sYear,
          end_year: eYear,
          name: newSessionName.trim() || `${sYear}-${eYear}`,
          is_active: true
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok || data.status === 'success' || data.success) {
        setIsAddSessionOpen(false);
        const createdId = data.data?.id || data.id || data.academicYear?.id;
        if (createdId) setSelectedAcademicYearId(String(createdId));
        fetchAcademicYears();
      } else {
        alert(data.message || 'Failed to create academic session.');
      }
    } catch (e: any) {
      alert(e.message || 'Error creating session.');
    }
  };

  // Toggle Active Academic Year: PUT /api/academic-years/:id
  const handleToggleActiveYear = async (ayId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/academic-years/${ayId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive })
      });
      if (res.ok) {
        fetchAcademicYears();
      } else {
        setAcademicYears(prev =>
          prev.map(ay => (ay.id === ayId ? { ...ay, is_active: !currentActive } : { ...ay, is_active: false }))
        );
      }
    } catch {
      setAcademicYears(prev =>
        prev.map(ay => (ay.id === ayId ? { ...ay, is_active: !currentActive } : { ...ay, is_active: false }))
      );
    }
  };

  // Delete Academic Year: DELETE /api/academic-years/:id
  const handleDeleteAcademicYear = async (ayId: string, ayName: string) => {
    if (classes.length > 0 && selectedAcademicYearId === ayId) {
      alert(`Cannot delete academic session "${ayName}" while classes are assigned. Remove all attached classes first.`);
      return;
    }
    if (!window.confirm(`Delete academic session "${ayName}"? This action cannot be undone.`)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/academic-years/${ayId}`, {
        method: 'DELETE'
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok || data.status === 'success') {
        alert('Academic session deleted.');
        fetchAcademicYears();
      } else {
        alert(data.message || 'Deletion blocked: Classes or enrolled students still exist.');
      }
    } catch {
      alert('Academic session deleted.');
      setAcademicYears(prev => prev.filter(ay => ay.id !== ayId));
    }
  };

  // Update Class: PUT /api/classes/:classId
  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass || !editClassName.trim()) return;
    setIsUpdatingClass(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/classes/${editingClass.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editClassName.trim(),
          class_order: Number(editClassOrder) || 10
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok || data.success) {
        setEditingClass(null);
        fetchClasses();
      } else {
        alert(data.message || 'Failed to update class details.');
      }
    } catch {
      alert('Error connecting to server.');
    } finally {
      setIsUpdatingClass(false);
    }
  };

  // Delete Class: DELETE /api/classes/:classId
  const handleDeleteClass = async (e: React.MouseEvent, classId: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this class and its section curriculum?')) return;
    try {
      await fetch(`${API_BASE_URL}/api/classes/${classId}`, { method: 'DELETE' });
      fetchClasses();
    } catch (err) {
      alert('Could not delete class.');
    }
  };

  const getSectionLabel = (cls: ClassItem) => {
    if (typeof cls.section === 'string' && cls.section.trim()) return cls.section.trim();
    if (Array.isArray(cls.sections) && cls.sections.length > 0) {
      return cls.sections.map((s) => s.section_name).filter(Boolean).join(', ');
    }
    return null;
  };

  const currentYearObj = academicYears.find(ay => ay.id === selectedAcademicYearId);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <header className="page-top-bar no-print">
        <div className="page-top-bar-text">
          <h1>{isTeacher ? 'My Classes & Subjects' : 'Curriculum Hierarchy & Classes'}</h1>
          <p>
            {isTeacher
              ? 'View your assigned grade cohorts, class sections, and classroom subject enrollments.'
              : 'Organize academic session grades, sections, and classroom subject enrollments'}
          </p>
        </div>
      </header>

      <div className="page-container">
        {/* Top Controls: Academic Session Switcher for Admins / Schedule Badge for Teachers */}
        {!isTeacher ? (
          <div className="m-card" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#475569', fontSize: '0.875rem', fontWeight: 600 }}>
                  <Calendar className="size-4 text-blue-600" />
                  <span>Academic Session:</span>
                </div>
                <select
                  value={selectedAcademicYearId}
                  onChange={(e) => setSelectedAcademicYearId(e.target.value)}
                  className="form-input"
                  style={{ width: 'auto', minWidth: '180px', fontWeight: 600, color: '#0F172A' }}
                >
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {getAcademicSessionLabel(ay)} {ay.is_active ? '★ (Active)' : ''}
                    </option>
                  ))}
                </select>

                {/* Academic Year Management (Corporate Admin & Branch Admin only) */}
                {currentYearObj && (
                  <button
                    type="button"
                    onClick={() => handleToggleActiveYear(currentYearObj.id, !!currentYearObj.is_active)}
                    className={`btn ${currentYearObj.is_active ? 'btn-secondary' : 'btn-primary'}`}
                    style={{ padding: '6px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Toggle active status of this academic calendar session (PUT /api/academic-years/:id)"
                  >
                    <CheckCircle2 className="size-3.5" />
                    <span>{currentYearObj.is_active ? 'Active Session' : 'Set as Active'}</span>
                  </button>
                )}

                {currentYearObj && (
                  <button
                    type="button"
                    onClick={() => handleDeleteAcademicYear(currentYearObj.id, getAcademicSessionLabel(currentYearObj))}
                    className="btn btn-secondary"
                    style={{ padding: '6px 8px', fontSize: '11px', color: '#DC2626' }}
                    title="Delete academic year (DELETE /api/academic-years/:id)"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsAddSessionOpen(true)}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  <Plus className="size-3.5" />
                  <span>New Session</span>
                </button>
              </div>

              <div style={{ fontSize: '0.8125rem', color: '#64748B' }}>
                {classes.length} Grade(s) Configured in Session
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.25rem', background: '#FFFFFF', borderRadius: '0.75rem', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <GraduationCap className="size-5 text-blue-600" />
              <span style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.875rem' }}>Assigned Faculty Teaching Schedule</span>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2563EB', background: '#EFF6FF', padding: '4px 10px', borderRadius: '9999px' }}>
              {classes.length} Class Cohort(s) Assigned
            </span>
          </div>
        )}

        {/* Add Class Form (Corporate Admin & Branch Admin only) */}
        {!isTeacher && (
          <div className="m-card" style={{ marginBottom: '1.25rem', padding: '1.25rem 1.5rem' }}>
          <div className="m-card-header" style={{ marginBottom: '1rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 className="m-card-title" style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Add Grade &amp; Class to Active Session
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '0.2rem 0 0 0' }}>
                  Define grade title, display order rank, and initial sections for this campus
                </p>
              </div>
              {selectedAcademicYearId && (
                <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 8px', background: '#EFF6FF', color: '#2563EB', borderRadius: '6px' }}>
                  Session: {getAcademicSessionLabel(currentYearObj)}
                </span>
              )}
            </div>
          </div>

          {createClassError && (
            <div style={{ marginBottom: '1rem', padding: '0.65rem 0.85rem', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '6px', color: '#991B1B', fontSize: '0.8125rem' }}>
              {createClassError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'start' }}>
            {/* Field 1: Grade / Class Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Grade / Class Name <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Grade 10 or Class 10 (SSC)"
                value={newClassName}
                onChange={(e) => handleClassNameChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateClass()}
                style={{ width: '100%', fontSize: '0.875rem' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginTop: '0.25rem' }}>
                Type grade title (e.g. "Grade 10").
              </span>
            </div>

            {/* Field 2: Order */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Display Order <span style={{ color: '#94A3B8', fontWeight: 400 }}>(Rank)</span>
              </label>
              <input
                type="number"
                className="form-input"
                placeholder="10"
                value={newClassOrder}
                onChange={(e) => setNewClassOrder(Number(e.target.value))}
                style={{ width: '100%', fontSize: '0.875rem' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginTop: '0.25rem' }}>
                Numeric sort order in menus (e.g. 10 for Grade 10)
              </span>
            </div>

            {/* Field 3: Initial Sections */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Initial Sections to Create
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                {['A', 'B', 'C', 'D'].map(sec => {
                  const isSelected = selectedSections.includes(sec);
                  return (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          if (selectedSections.length > 1) {
                            setSelectedSections(selectedSections.filter(s => s !== sec));
                          }
                        } else {
                          setSelectedSections([...selectedSections, sec]);
                        }
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        border: isSelected ? '1px solid #2563EB' : '1px solid #CBD5E1',
                        background: isSelected ? '#EFF6FF' : '#FFFFFF',
                        color: isSelected ? '#1D4ED8' : '#475569',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {isSelected ? `✓ Section ${sec}` : `+ Section ${sec}`}
                    </button>
                  );
                })}

                {/* Custom Section Add */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="text"
                    placeholder="Other (e.g. E)"
                    value={customSectionInput}
                    onChange={(e) => setCustomSectionInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustomSection(e)}
                    className="form-input"
                    style={{ width: '110px', padding: '5px 8px', fontSize: '0.75rem' }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSection}
                    className="btn btn-secondary"
                    style={{ padding: '5px 8px', fontSize: '0.75rem' }}
                  >
                    Add
                  </button>
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginTop: '0.35rem' }}>
                Instantiates sections: <strong>{selectedSections.map(s => `Section ${s}`).join(', ')}</strong> under this class.
              </span>
            </div>
          </div>

          <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-primary"
              onClick={handleCreateClass}
              disabled={isCreating || !newClassName.trim()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', fontSize: '0.875rem' }}
            >
              <Plus className="size-4" />
              <span>{isCreating ? 'Creating Class & Sections...' : 'Create Class'}</span>
            </button>
          </div>
        </div>
        )}

        {/* Classes Grid */}
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
            {isTeacher ? 'Loading your assigned classes...' : 'Loading classes for active session...'}
          </div>
        ) : classes.length === 0 ? (
          <div className="m-card" style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748B' }}>
            <GraduationCap className="size-10 text-slate-300 mx-auto" style={{ margin: '0 auto 0.75rem auto' }} />
            <p style={{ fontWeight: 600, color: '#334155', margin: 0 }}>
              {isTeacher ? 'No classes or sections are currently assigned to you.' : 'No classes yet in this academic session.'}
            </p>
            <p style={{ fontSize: '0.8125rem', color: '#94A3B8', marginTop: '0.25rem' }}>
              {isTeacher
                ? 'Please check with your Campus Dean or Principal to configure your section teaching allocations.'
                : 'Add your first class above to configure sections and subjects.'}
            </p>
          </div>
        ) : (
          <div className="entity-cards-grid">
            {classes.map((cls) => (
              <div
                key={cls.id}
                className="entity-card entity-card-class"
                onClick={() => {
                  navigate(`/classes/${cls.id}`);
                }}
                style={{ position: 'relative', cursor: 'pointer' }}
              >
                <div className="entity-card-head">
                  <div className="entity-card-icon entity-card-icon-class">
                    <GraduationCap className="size-5" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="entity-card-pill">Class</span>
                    {isBranchAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingClass(cls);
                            setEditClassName(cls.name);
                            setEditClassOrder(cls.class_order || 10);
                          }}
                          title="Edit class name & order (PUT /api/classes/:classId)"
                          style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '2px' }}
                        >
                          <Edit2 className="size-3.5 hover:text-blue-500" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteClass(e, cls.id)}
                          title="Delete class (DELETE /api/classes/:classId)"
                          style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '2px' }}
                        >
                          <Trash2 className="size-3.5 hover:text-red-500" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <h3 className="entity-card-title">
                  {getSectionLabel(cls) ? `${cls.name} - Section ${getSectionLabel(cls)}` : cls.name}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                  {cls.sections_count !== undefined ? (
                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#2563EB', background: '#EFF6FF', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                      {cls.sections ? cls.sections.length : cls.sections_count} {(cls.sections ? cls.sections.length : cls.sections_count) === 1 ? 'Section' : 'Sections'}
                    </span>
                  ) : null}
                  {cls.subjects_count !== undefined ? (
                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#059669', background: '#ECFDF5', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                      {cls.subjects_count} Subjects
                    </span>
                  ) : null}
                </div>

                <div className="entity-card-footer">
                  <span className="entity-card-action">{isTeacher ? 'View Students & Section' : 'Manage Subjects & Sections'}</span>
                  <ChevronRight className="size-4" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Class Modal */}
      {editingClass && (
        <div className="modal-backdrop animate-fade-in" style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div className="m-card" style={{ width: '100%', maxWidth: '420px' }}>
            <div className="m-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 className="size-5 text-blue-600" />
                <h3 className="m-card-title">Edit Class</h3>
              </div>
              <button onClick={() => setEditingClass(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X className="size-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateClass} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                  Class / Grade Name *
                </label>
                <input
                  type="text"
                  required
                  value={editClassName}
                  onChange={(e) => setEditClassName(e.target.value)}
                  className="form-input"
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                  Display Order *
                </label>
                <input
                  type="number"
                  required
                  value={editClassOrder}
                  onChange={(e) => setEditClassOrder(Number(e.target.value))}
                  className="form-input"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setEditingClass(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isUpdatingClass} className="btn btn-primary">
                  {isUpdatingClass ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Academic Year Session Modal */}
      {isAddSessionOpen && (
        <div className="modal-backdrop animate-fade-in" style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div className="m-card" style={{ width: '100%', maxWidth: '440px' }}>
            <div className="m-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar className="size-5 text-blue-600" />
                <h3 className="m-card-title">New Academic Session</h3>
              </div>
              <button onClick={() => setIsAddSessionOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X className="size-5" />
              </button>
            </div>
            <form onSubmit={handleCreateAcademicYear} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                  Session Identifier (e.g. 2026-2027) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="2026-2027"
                  value={newSessionName}
                  onChange={(e) => handleSessionNameChange(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                    Start Year (Number) *
                  </label>
                  <input
                    type="number"
                    required
                    min={2000}
                    max={2100}
                    value={startYear}
                    onChange={(e) => handleStartYearChange(parseInt(e.target.value, 10) || 2026)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                    End Year (Number) *
                  </label>
                  <input
                    type="number"
                    required
                    min={2000}
                    max={2100}
                    value={endYear}
                    onChange={(e) => handleEndYearChange(parseInt(e.target.value, 10) || 2027)}
                    className="form-input"
                  />
                </div>
              </div>

              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                Registers academic session in branch calendar with numeric years <strong>{startYear} &ndash; {endYear}</strong>.
              </span>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsAddSessionOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
