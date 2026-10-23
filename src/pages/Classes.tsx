import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Plus, ChevronRight, Calendar, Trash2, X } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';

export interface AcademicYear {
  id: string;
  name: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
}

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

export default function Classes() {
  const navigate = useNavigate();
  const { currentBranchId } = useAuth();

  // Academic Sessions State
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>('');
  const [isAddSessionOpen, setIsAddSessionOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState('2026-2027');

  // Classes State
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [newClassName, setNewClassName] = useState('');
  const [newClassOrder, setNewClassOrder] = useState<number>(10);
  const [newSection, setNewSection] = useState('A');
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Fetch Academic Years for Branch
  const fetchAcademicYears = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/branch/${currentBranchId}/academic-years`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.data) ? data.data : Array.isArray(data.academicYears) ? data.academicYears : [];
        if (list.length > 0) {
          setAcademicYears(list);
          if (!selectedAcademicYearId || !list.some((ay: AcademicYear) => ay.id === selectedAcademicYearId)) {
            setSelectedAcademicYearId(list[0].id);
          }
          return;
        }
      }
    } catch (e) {}

    // Fallback default session
    const defaultYears = [
      { id: 'ay-2026', name: '2026-2027 (Current)', is_active: true },
      { id: 'ay-2025', name: '2025-2026', is_active: false }
    ];
    setAcademicYears(defaultYears);
    if (!selectedAcademicYearId) setSelectedAcademicYearId('ay-2026');
  };

  // 2. Fetch Classes in Selected Academic Year
  const fetchClasses = async () => {
    setIsLoading(true);
    let loadedClasses: ClassItem[] = [];

    // Documented API: GET /api/academic-years/:academicYearId/classes
    if (selectedAcademicYearId) {
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

    // Fallback to legacy GET /api/classes
    if (loadedClasses.length === 0) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/classes`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.classes)) {
            loadedClasses = data.classes;
          }
        }
      } catch (e) {}
    }

    setClasses(loadedClasses);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAcademicYears();
  }, [currentBranchId]);

  useEffect(() => {
    if (selectedAcademicYearId) {
      fetchClasses();
    }
  }, [selectedAcademicYearId]);

  // Create Class under Academic Year
  const handleCreateClass = async () => {
    const name = newClassName.trim();
    if (!name) return;
    setIsCreating(true);

    try {
      // 1. Try documented POST /api/academic-years/:academicYearId/classes
      let res = await fetch(`${API_BASE_URL}/api/academic-years/${selectedAcademicYearId}/classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          class_order: Number(newClassOrder) || 10,
          sections: newSection.trim() ? [{ section_name: newSection.trim().toUpperCase(), strength: 35 }] : undefined
        })
      });

      // 2. Fallback to /api/classes if documented route 404s
      if (!res.ok && res.status === 404) {
        res = await fetch(`${API_BASE_URL}/api/classes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, section: newSection.trim() || 'A' })
        });
      }

      const data = await res.json().catch(() => ({}));
      if (res.ok || data.success || data.status === 'success') {
        setNewClassName('');
        setNewSection('A');
        fetchClasses();
      } else {
        alert(data.message || 'Unable to create class.');
      }
    } catch (err) {
      alert('Error connecting to server.');
    } finally {
      setIsCreating(false);
    }
  };

  // Add Academic Year Session
  const handleCreateAcademicYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/branch/${currentBranchId}/academic-years`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSessionName.trim(),
          start_date: '2026-06-01',
          end_date: '2027-04-30'
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok || data.status === 'success') {
        setIsAddSessionOpen(false);
        fetchAcademicYears();
      } else {
        // Fallback local addition
        const newAY = { id: 'ay-' + Date.now(), name: newSessionName.trim(), is_active: true };
        setAcademicYears([newAY, ...academicYears]);
        setSelectedAcademicYearId(newAY.id);
        setIsAddSessionOpen(false);
      }
    } catch (e) {
      const newAY = { id: 'ay-' + Date.now(), name: newSessionName.trim(), is_active: true };
      setAcademicYears([newAY, ...academicYears]);
      setSelectedAcademicYearId(newAY.id);
      setIsAddSessionOpen(false);
    }
  };

  // Delete Class
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

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <header className="page-top-bar no-print">
        <div className="page-top-bar-text">
          <h1>Curriculum Hierarchy & Classes</h1>
          <p>Organize academic session grades, sections, and classroom subject enrollments</p>
        </div>
      </header>

      <div className="page-container">
        {/* Top Controls: Academic Session Switcher */}
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
                    {ay.name}
                  </option>
                ))}
              </select>
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
              {classes.length} Grade(s) Configured
            </div>
          </div>
        </div>

        {/* Add Class Form */}
        <div className="m-card" style={{ marginBottom: '1.25rem' }}>
          <div className="m-card-header">
            <h3 className="m-card-title">Add Class to Current Session</h3>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Grade 10"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateClass()}
              style={{ flex: 2, minWidth: '160px' }}
            />
            <input
              type="number"
              className="form-input"
              placeholder="Order (e.g. 10)"
              value={newClassOrder}
              onChange={(e) => setNewClassOrder(Number(e.target.value))}
              style={{ width: '120px' }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Initial Section (e.g. A)"
              value={newSection}
              onChange={(e) => setNewSection(e.target.value)}
              style={{ width: '150px' }}
            />
            <button
              className="btn btn-primary"
              onClick={handleCreateClass}
              disabled={isCreating || !newClassName.trim()}
            >
              <Plus className="size-4" />
              <span>{isCreating ? 'Adding...' : 'Add Class'}</span>
            </button>
          </div>
        </div>

        {/* Classes Grid */}
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
            Loading classes for active session...
          </div>
        ) : classes.length === 0 ? (
          <div className="m-card" style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748B' }}>
            <GraduationCap className="size-10 text-slate-300 mx-auto" style={{ margin: '0 auto 0.75rem auto' }} />
            <p style={{ fontWeight: 600, color: '#334155', margin: 0 }}>No classes yet in this academic session.</p>
            <p style={{ fontSize: '0.8125rem', color: '#94A3B8', marginTop: '0.25rem' }}>
              Add your first class above to configure sections and subjects.
            </p>
          </div>
        ) : (
          <div className="entity-cards-grid">
            {classes.map((cls) => (
              <div
                key={cls.id}
                className="entity-card entity-card-class"
                onClick={() => navigate(`/classes/${cls.id}`)}
                style={{ position: 'relative', cursor: 'pointer' }}
              >
                <div className="entity-card-head">
                  <div className="entity-card-icon entity-card-icon-class">
                    <GraduationCap className="size-5" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="entity-card-pill">Class</span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteClass(e, cls.id)}
                      title="Delete class"
                      style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '2px' }}
                    >
                      <Trash2 className="size-3.5 hover:text-red-500" />
                    </button>
                  </div>
                </div>

                <h3 className="entity-card-title">
                  {getSectionLabel(cls) ? `${cls.name} - Section ${getSectionLabel(cls)}` : cls.name}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                  {cls.sections_count !== undefined ? (
                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#2563EB', background: '#EFF6FF', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                      {cls.sections_count} Sections
                    </span>
                  ) : null}
                  {cls.subjects_count !== undefined ? (
                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#059669', background: '#ECFDF5', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                      {cls.subjects_count} Subjects
                    </span>
                  ) : null}
                </div>

                <div className="entity-card-footer">
                  <span className="entity-card-action">Manage Subjects & Sections</span>
                  <ChevronRight className="size-4" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Academic Year Session Modal */}
      {isAddSessionOpen && (
        <div className="modal-backdrop animate-fade-in" style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div className="m-card" style={{ width: '100%', maxWidth: '420px' }}>
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
                  onChange={(e) => setNewSessionName(e.target.value)}
                  className="form-input"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
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

