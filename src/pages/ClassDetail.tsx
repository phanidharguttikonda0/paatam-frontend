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
  ShieldCheck
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';

type ClassSubject = {
  id: string;
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
};

export default function ClassDetail() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { currentBranchId, branches } = useAuth();

  const [className, setClassName] = useState('');
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
  const [availableTeachers, setAvailableTeachers] = useState<TeacherOption[]>([]);

  // Section Faculty Allocation Modal
  const [allocatingSection, setAllocatingSection] = useState<SectionItem | null>(null);
  const [sectionTeachers, setSectionTeachers] = useState<SectionTeacherAllocation[]>([]);
  const [allocTeacherId, setAllocTeacherId] = useState('');
  const [allocSubjectId, setAllocSubjectId] = useState('');
  const [isAllocating, setIsAllocating] = useState(false);

  const branchId = currentBranchId || (branches.length > 0 ? branches[0].id : '');

  const fetchClassDetails = () => {
    if (!classId) return;
    fetch(`${API_BASE_URL}/api/classes`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.classes)) {
          const match = data.classes.find((c: any) => c.id === classId);
          if (match) {
            setClassName(match.name);
          }
        }
      })
      .catch(() => {});
  };

  const fetchSubjects = () => {
    if (!classId) return;
    fetch(`${API_BASE_URL}/api/classes/${classId}/subjects`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.subjects)) {
          setSubjects(data.subjects);
        } else if (Array.isArray(data)) {
          setSubjects(data);
        }
      })
      .catch((err) => console.error('Unable to load class subjects:', err));
  };

  const fetchMasterCatalog = () => {
    if (!branchId) return;
    fetch(`${API_BASE_URL}/api/branch/${branchId}/subjects`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.subjects)) {
          setMasterCatalog(data.subjects);
        } else if (Array.isArray(data)) {
          setMasterCatalog(data);
        }
      })
      .catch(() => {});
  };

  const fetchSections = () => {
    if (!classId) return;
    fetch(`${API_BASE_URL}/api/classes/${classId}/sections`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.sections)) {
          setSections(data.sections);
        } else if (Array.isArray(data)) {
          setSections(data);
        }
      })
      .catch((err) => console.error('Unable to load sections:', err));
  };

  const fetchTeachers = () => {
    const url = branchId
      ? `${API_BASE_URL}/api/branch/${branchId}/teachers`
      : `${API_BASE_URL}/api/teachers`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const list = data.teachers || (Array.isArray(data) ? data : []);
        setAvailableTeachers(list);
      })
      .catch(() => {
        // Fallback
        fetch(`${API_BASE_URL}/api/teachers`)
          .then((r) => r.json())
          .then((d) => setAvailableTeachers(d.teachers || []))
          .catch(() => {});
      });
  };

  useEffect(() => {
    fetchClassDetails();
    fetchSubjects();
    fetchSections();
  }, [classId]);

  useEffect(() => {
    if (branchId) {
      fetchMasterCatalog();
      fetchTeachers();
    } else {
      fetchTeachers();
    }
  }, [branchId]);

  // Assign Subject from Master Catalog or name
  const handleAssignSubject = async () => {
    if (!classId) return;
    if (!selectedMasterSubjectId) {
      alert('Please select a subject from the catalog.');
      return;
    }

    setIsAssigningSubject(true);
    try {
      // Documented API: POST /api/classes/:classId/subjects with { subject_ids: [id] }
      const res = await fetch(`${API_BASE_URL}/api/classes/${classId}/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject_ids: [selectedMasterSubjectId] })
      });
      const data = await res.json();
      if (res.ok && (data.success || data.message)) {
        setSelectedMasterSubjectId('');
        fetchSubjects();
      } else {
        // Fallback: maybe backend expects legacy format { subjectName }
        const matched = masterCatalog.find((m) => m.id === selectedMasterSubjectId);
        if (matched) {
          const fbRes = await fetch(`${API_BASE_URL}/api/classes/${classId}/subjects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subjectName: matched.name })
          });
          const fbData = await fbRes.json();
          if (fbData.success) {
            setSelectedMasterSubjectId('');
            fetchSubjects();
            return;
          }
        }
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
    if (!newMasterName.trim() || !branchId || !classId) return;
    setIsAssigningSubject(true);
    try {
      // 1. Create in Master Catalog: POST /api/branch/:branchId/subjects
      const createRes = await fetch(`${API_BASE_URL}/api/branch/${branchId}/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMasterName.trim(),
          code: newMasterCode.trim() || undefined
        })
      });
      const createData = await createRes.json();
      const newSubjectId = createData?.subject?.id || createData?.id;

      if (newSubjectId) {
        // 2. Assign to class
        await fetch(`${API_BASE_URL}/api/classes/${classId}/subjects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject_ids: [newSubjectId] })
        });
      } else {
        // Legacy fallback
        await fetch(`${API_BASE_URL}/api/classes/${classId}/subjects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subjectName: newMasterName.trim() })
        });
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

  // Unassign subject: DELETE /api/classes/:classId/subjects/:subjectId
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
      const data = await res.json();
      const createdSectionId = data?.section?.id || data?.id;

      if (res.ok && (data.success || createdSectionId)) {
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
        // Fallback to legacy structure
        const fbRes = await fetch(`${API_BASE_URL}/api/classes/${classId}/sections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sectionName,
            classTeacherId: newClassTeacherId || null,
            strength: Number(newSectionStrength) || 0
          })
        });
        const fbData = await fbRes.json();
        if (fbData.success) {
          setNewSectionName('');
          setNewSectionStrength(35);
          setNewClassTeacherId('');
          fetchSections();
          return;
        }
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

  // Open faculty allocations modal for section: GET /api/sections/:sectionId/teachers
  const handleOpenAllocations = async (sec: SectionItem) => {
    setAllocatingSection(sec);
    setAllocTeacherId('');
    setAllocSubjectId('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/sections/${sec.id}/teachers`);
      const data = await res.json();
      if (data.success && Array.isArray(data.teachers)) {
        setSectionTeachers(data.teachers);
      } else if (Array.isArray(data)) {
        setSectionTeachers(data);
      } else {
        setSectionTeachers([]);
      }
    } catch (err) {
      console.error(err);
      setSectionTeachers([]);
    }
  };

  // Allocate faculty: POST /api/sections/:sectionId/teachers
  const handleAllocateFaculty = async () => {
    if (!allocatingSection || !allocTeacherId || !allocSubjectId) {
      alert('Please select both a faculty member and a subject.');
      return;
    }
    setIsAllocating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/sections/${allocatingSection.id}/teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: allocTeacherId,
          subject_id: allocSubjectId
        })
      });
      const data = await res.json();
      if (res.ok && (data.success || data.message)) {
        setAllocTeacherId('');
        setAllocSubjectId('');
        // Refresh section teachers
        const r = await fetch(`${API_BASE_URL}/api/sections/${allocatingSection.id}/teachers`);
        const d = await r.json();
        setSectionTeachers(d.teachers || (Array.isArray(d) ? d : []));
      } else {
        alert(data.message || 'Unable to allocate faculty.');
      }
    } catch (err) {
      console.error(err);
      alert('Error allocating faculty.');
    } finally {
      setIsAllocating(false);
    }
  };

  // Deallocate faculty: DELETE /api/sections/:sectionId/teachers/:teacherId
  const handleDeallocateFaculty = async (teacherId: string) => {
    if (!allocatingSection) return;
    try {
      await fetch(`${API_BASE_URL}/api/sections/${allocatingSection.id}/teachers/${teacherId}`, {
        method: 'DELETE'
      });
      // Refresh
      const r = await fetch(`${API_BASE_URL}/api/sections/${allocatingSection.id}/teachers`);
      const d = await r.json();
      setSectionTeachers(d.teachers || (Array.isArray(d) ? d : []));
    } catch (err) {
      console.error(err);
      alert('Error deallocating faculty.');
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
          <p>Configure curriculum subjects, physical classroom sections, and faculty room allocations</p>
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
            <span>Class Sections & Rooms ({sections.length})</span>
          </button>
        </div>

        {/* 1. Subjects Tab */}
        {activeTab === 'subjects' && (
          <div>
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
                        </div>
                      </div>

                      <h3 className="entity-card-title">{sName}</h3>
                      <p className="entity-card-subtitle">AI paper generator, syllabus & scan grading</p>

                      <div
                        className="entity-card-footer"
                        onClick={() => navigate(`/classes/${classId}/${s.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <span className="entity-card-action">Open Workspace</span>
                        <ChevronRight className="size-4" />
                      </div>
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
                      </div>
                    </div>

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
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenAllocations(sec)}
                        style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <GraduationCap className="size-3.5 text-blue-600" />
                        <span>Subject Faculty</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate(`/students?sectionId=${sec.id}`)}
                        style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <Users className="size-3.5" />
                        <span>Roster</span>
                        <ExternalLink className="size-3" />
                      </button>
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
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 700, color: '#334155' }}>
                Current Allocations ({sectionTeachers.length})
              </h4>
              {sectionTeachers.length === 0 ? (
                <p style={{ fontSize: '0.8125rem', color: '#94A3B8', fontStyle: 'italic', margin: '0.5rem 0' }}>
                  No subject teachers allocated yet to this section.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '240px', overflowY: 'auto' }}>
                  {sectionTeachers.map((alloc) => {
                    const tName = alloc.teacher?.name || 'Faculty Member';
                    const tCode = alloc.teacher?.teacher_id || '';
                    const sName = alloc.subject?.name || 'Subject';
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
                          onClick={() => handleDeallocateFaculty(alloc.teacher_id || alloc.id)}
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
    </div>
  );
}
