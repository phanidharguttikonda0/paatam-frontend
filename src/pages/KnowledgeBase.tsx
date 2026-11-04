import { useEffect, useState } from 'react';
import { 
  BookOpen, 
  Upload, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  Layers,
  Pencil,
  X
} from 'lucide-react';
import { API_BASE_URL, getPresignedUploadUrls, uploadBinaryToS3 } from '../config/api';
import { useAuth } from '../context/AuthContext';

interface SubjectRecord {
  id: string;
  name: string;
  displayName?: string;
  grade: string;
  sectionName?: string;
  sectionId?: string;
  board: string;
  className: string;
  lessonsCount: number;
  chunks: string;
  status: string;
}

export interface CurriculumChapter {
  id?: string;
  class_name: string;
  subject_name: string;
  chapter_number: number;
  chapter_title: string;
  subtopics: string[];
  chunk_count?: number;
  created_at?: string;
}

export default function KnowledgeBase() {
  const [activeSubject, setActiveSubject] = useState('All subjects');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [subjectsList, setSubjectsList] = useState<SubjectRecord[]>([]);

  // Chapter Ingestion State
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [chapterNumberInput, setChapterNumberInput] = useState<number>(1);
  const [chapterTitleInput, setChapterTitleInput] = useState<string>('');
  const [curriculumTab, setCurriculumTab] = useState<'chapters' | 'syllabus'>('chapters');
  const [chapterTextInput, setChapterTextInput] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestStatus, setIngestStatus] = useState<string | null>(null);

  // Syllabus Weightage State
  const [syllabusText, setSyllabusText] = useState('');
  const [isIngestingSyllabus, setIsIngestingSyllabus] = useState(false);
  const [syllabusTopics, setSyllabusTopics] = useState<any[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);

  // Chapter Library State
  const [chapters, setChapters] = useState<CurriculumChapter[]>([]);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);

  // User & Role State
  const { role, currentUser, currentBranchId, branches } = useAuth();
  const isTeacher = role?.toUpperCase() === 'TEACHER';
  const isDeanOrAbove = ['ADMIN', 'BRANCH_ADMIN', 'DEAN', 'PRINCIPAL', 'VICE_PRINCIPAL', 'CORPORATE_ADMIN', 'SUPER_ADMIN'].includes(role?.toUpperCase());
  const activeBranchId = currentBranchId || (branches.length > 0 ? branches[0].id : '');

  // Add Subject Modal
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [newSubjectTitle, setNewSubjectTitle] = useState('');
  const [newSubjectGrade, setNewSubjectGrade] = useState('');
  const [newSubjectBoard, setNewSubjectBoard] = useState('CBSE');
  const [newSubjectCode, setNewSubjectCode] = useState('');
  const [isSubmittingSubject, setIsSubmittingSubject] = useState(false);

  // 1. Fetch Subjects on Mount (Role-specific)
  useEffect(() => {
    let isMounted = true;

    const loadSubjects = async () => {
      try {
        if (isTeacher) {
          // --- TEACHER FLOW: ONLY show subjects and sections explicitly allocated to this teacher ---
          const teacherId = String(currentUser?.id || (currentUser as any)?.teacher_id || (currentUser as any)?.staff_id || '');
          const teacherName = (currentUser?.name || '').toLowerCase();
          const teacherSubjects: SubjectRecord[] = [];
          const seenKeys = new Set<string>();

          const cleanSec = (raw: string | undefined): string => {
            if (!raw) return 'Section A';
            const str = String(raw).trim();
            if (/^Section\s+/i.test(str)) return str;
            return `Section ${str}`;
          };

          const isSecTombstoned = (sectionId: string | undefined, subName: string) => {
            if (!sectionId) return false;
            try {
              const rawDel = localStorage.getItem(`paatam_deleted_allocations_${sectionId}`);
              if (!rawDel) return false;
              const delList = JSON.parse(rawDel);
              if (!Array.isArray(delList)) return false;
              const sDel = new Set(delList.map((k: string) => String(k).toLowerCase().trim()));
              if (sDel.has(teacherId.toLowerCase()) || sDel.has(teacherName) || sDel.has(`${teacherName}__${subName.toLowerCase()}`)) {
                return true;
              }
            } catch {}
            return false;
          };

          const addSubjectIfNew = (item: {
            id?: string;
            name?: string;
            grade?: string;
            className?: string;
            sectionName?: string;
            sectionId?: string;
            board?: string;
            class_subject_id?: string;
          }) => {
            const name = (item.name || '').trim();
            if (!name) return;
            if (isSecTombstoned(item.sectionId, name)) return;

            const grade = (item.grade || item.className || 'Grade 10').trim();
            const sec = cleanSec(item.sectionName);
            const key = `${name.toLowerCase()}__${grade.toLowerCase()}__${sec.toLowerCase()}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              const uniqueId = String(item.class_subject_id || (item.sectionId ? `${item.id || 'sub'}_${item.sectionId}` : item.id) || `subj_${seenKeys.size}`);
              const displayName = `${name} - ${grade} (${sec})`;
              teacherSubjects.push({
                id: uniqueId,
                name,
                displayName,
                grade,
                sectionName: sec,
                sectionId: item.sectionId ? String(item.sectionId) : undefined,
                board: item.board || 'CBSE',
                className: grade,
                lessonsCount: 0,
                chunks: 'Indexed',
                status: 'Configured'
              });
            }
          };

          // 1. Check documented Teacher Dashboard: GET /api/teacher/dashboard
          try {
            const dashRes = await fetch(`${API_BASE_URL}/api/teacher/dashboard`);
            if (dashRes.ok) {
              const dashData = await dashRes.json();
              const allocations = Array.isArray(dashData?.data?.teaching_allocations)
                ? dashData.data.teaching_allocations
                : (Array.isArray(dashData?.data?.assigned_sections) ? dashData.data.assigned_sections : []);
              for (const alloc of allocations) {
                if (alloc.subject_name) {
                  addSubjectIfNew({
                    id: alloc.subject_id,
                    class_subject_id: alloc.class_subject_id,
                    sectionId: alloc.section_id,
                    name: alloc.subject_name,
                    grade: alloc.class_name || 'Grade 10',
                    className: alloc.class_name || 'Grade 10',
                    sectionName: alloc.section_name,
                    board: alloc.board
                  });
                }
              }
            }
          } catch (e) {
            console.warn('Teacher dashboard fetch error:', e);
          }

          // Keep teacher knowledge-base scope strictly tied to backend allocations.

          if (isMounted) {
            setSubjectsList(teacherSubjects);
            if (teacherSubjects.length > 0) {
              setSelectedSubjectId((curr) => {
                if (!curr || !teacherSubjects.some((s) => s.id === curr)) {
                  return teacherSubjects[0].id;
                }
                return curr;
              });
              setActiveSubject(teacherSubjects[0].name);
            }
          }
        } else {
          // --- DEAN / ADMIN FLOW: show all curriculum subjects in catalog WITH their class/grade ---
          let adminSubjects: SubjectRecord[] = [];
          const seen = new Set<string>();

          // Build class lookup from paatam_school_classes
          const classSubjectMap = new Map<string, string>();
          try {
            const rawClasses = localStorage.getItem('paatam_school_classes');
            if (rawClasses) {
              const clsList = JSON.parse(rawClasses);
              if (Array.isArray(clsList)) {
                clsList.forEach((c: any) => {
                  const cName = c.name || `Grade ${c.class_order || 10}`;
                  if (Array.isArray(c.subjects)) {
                    c.subjects.forEach((s: any) => {
                      if (s.name) classSubjectMap.set(s.name.toLowerCase().trim(), cName);
                      if (s.id) classSubjectMap.set(String(s.id), cName);
                      if (s.class_subject_id) classSubjectMap.set(String(s.class_subject_id), cName);
                    });
                  }
                });
              }
            }
          } catch (e) {}

          const resolveClassName = (s: any): string => {
            if (s.className && s.className.toLowerCase() !== s.name?.toLowerCase()) return s.className;
            if (s.class_name && s.class_name.toLowerCase() !== s.name?.toLowerCase()) return s.class_name;
            if (s.grade && s.grade.toLowerCase() !== s.name?.toLowerCase()) {
              return String(s.grade).toLowerCase().startsWith('grade') ? s.grade : `Grade ${s.grade}`;
            }
            if (s.name && classSubjectMap.has(s.name.toLowerCase().trim())) {
              return classSubjectMap.get(s.name.toLowerCase().trim())!;
            }
            if (s.id && classSubjectMap.has(String(s.id))) {
              return classSubjectMap.get(String(s.id))!;
            }
            return 'Grade 10';
          };

          const addAdminSubj = (s: any) => {
            const name = (s.name || s.subjectName || '').trim();
            if (!name) return;
            const cls = resolveClassName(s);
            const key = `${name.toLowerCase()}__${cls.toLowerCase()}`;
            if (!seen.has(key)) {
              seen.add(key);
              adminSubjects.push({
                id: String(s.id || s.class_subject_id || `admin_sub_${seen.size}`),
                name,
                displayName: `${name} - ${cls}`,
                grade: cls,
                className: cls,
                board: s.board || 'CBSE',
                lessonsCount: 0,
                chunks: 'Indexed',
                status: 'Configured'
              });
            }
          };

          // 1. Check paatam_school_classes for all class-subject mappings
          try {
            const rawClasses = localStorage.getItem('paatam_school_classes');
            if (rawClasses) {
              const clsList = JSON.parse(rawClasses);
              if (Array.isArray(clsList)) {
                clsList.forEach((c: any) => {
                  const cName = c.name || `Grade ${c.class_order || 10}`;
                  if (Array.isArray(c.subjects)) {
                    c.subjects.forEach((s: any) => {
                      addAdminSubj({
                        ...s,
                        className: cName,
                        grade: cName
                      });
                    });
                  }
                });
              }
            }
          } catch (e) {}

          // 2. Try documented branch catalog subjects: GET /api/branch/:branchId/subjects
          if (activeBranchId) {
            try {
              const branchRes = await fetch(`${API_BASE_URL}/api/branch/${encodeURIComponent(activeBranchId)}/subjects`);
              if (branchRes.ok) {
                const bData = await branchRes.json();
                const list = Array.isArray(bData?.data) ? bData.data : (Array.isArray(bData?.subjects) ? bData.subjects : []);
                list.forEach((s: any) => addAdminSubj(s));
              }
            } catch (e) {}
          }

          // 3. Fallback to localStorage master subjects
          try {
            const rawMaster = localStorage.getItem('paatam_master_subjects');
            if (rawMaster) {
              const list = JSON.parse(rawMaster);
              if (Array.isArray(list)) {
                list.forEach((s: any) => addAdminSubj(s));
              }
            }
          } catch (e) {}

          // 4. Default guarantee
          if (adminSubjects.length === 0) {
            addAdminSubj({
              id: '4265262194928642',
              name: 'Physics',
              grade: 'Grade 10',
              className: 'Grade 10',
              board: 'CBSE'
            });
          }

          if (isMounted) {
            setSubjectsList(adminSubjects);
            if (adminSubjects.length > 0) {
              setSelectedSubjectId((curr) => {
                if (!curr || !adminSubjects.some((s) => s.id === curr)) {
                  return adminSubjects[0].id;
                }
                return curr;
              });
              setActiveSubject(adminSubjects[0].name);
            }
          }
        }
      } catch (err) {
        console.error('Error loading subjects in KnowledgeBase:', err);
      }
    };

    loadSubjects();

    return () => {
      isMounted = false;
    };
  }, [isTeacher, activeBranchId, currentUser?.id]);

  const activeSubjectObj = subjectsList.find((s) => s.id === selectedSubjectId) || subjectsList.find((s) => s.name === activeSubject) || subjectsList[0] || null;
  const activeClassName = activeSubjectObj?.className || activeSubjectObj?.grade || (activeSubject !== 'All subjects' ? activeSubject : '');
  const activeSectionName = activeSubjectObj?.sectionName || '';

  // 2. Fetch Chapters (Documented /api/curriculum/chapters)
  const fetchChaptersForSubject = async (clsName: string, subjName: string) => {
    if (!clsName || subjName === 'All subjects') {
      setChapters([]);
      return;
    }
    setIsLoadingChapters(true);
    try {
      // GET /api/curriculum/chapters?class_subject_id=...
      if (activeSubjectObj?.id) {
        const docRes = await fetch(`${API_BASE_URL}/api/curriculum/chapters?class_subject_id=${encodeURIComponent(activeSubjectObj.id)}`);
        if (docRes.ok) {
          const docData = await docRes.json();
          const list = Array.isArray(docData.data)
            ? docData.data
            : (Array.isArray(docData.chapters) ? docData.chapters : (Array.isArray(docData) ? docData : null));
          if (Array.isArray(list)) {
            setChapters(list);
            setChapterNumberInput(list.length + 1);
            setIsLoadingChapters(false);
            return;
          }
        }
      }
      setChapters([]);
      setChapterNumberInput(1);
    } catch (err) {
      console.warn('Could not fetch chapters:', err);
      setChapters([]);
    } finally {
      setIsLoadingChapters(false);
    }
  };

  // Fetch Syllabus Topics: GET /api/curriculum/topics?class_subject_id=...
  const fetchSyllabusTopics = async () => {
    if (!activeSubjectObj?.id) return;
    setIsLoadingTopics(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/curriculum/topics?class_subject_id=${encodeURIComponent(activeSubjectObj.id)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.topics)) {
        setSyllabusTopics(data.topics);
      } else if (Array.isArray(data)) {
        setSyllabusTopics(data);
      } else {
        setSyllabusTopics([]);
      }
    } catch {
      setSyllabusTopics([]);
    } finally {
      setIsLoadingTopics(false);
    }
  };

  useEffect(() => {
    if (activeClassName && activeSubject !== 'All subjects') {
      fetchChaptersForSubject(activeClassName, activeSubject);
      fetchSyllabusTopics();
    } else {
      setChapters([]);
      setSyllabusTopics([]);
    }
  }, [activeClassName, activeSubject]);

  // 3. Handle Add New Subject (Dean and above)
  const handleAddSubject = async () => {
    const name = newSubjectTitle.trim();
    if (!name) return;
    if (!newSubjectGrade.trim()) {
      alert('Please enter the grade/class for this subject.');
      return;
    }
    setIsSubmittingSubject(true);
    try {
      let createdSubject: any = null;

      // 1. Try documented branch catalog endpoint: POST /api/branch/:branchId/subjects
      if (activeBranchId) {
        try {
          const bRes = await fetch(`${API_BASE_URL}/api/branch/${encodeURIComponent(activeBranchId)}/subjects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name,
              code: newSubjectCode.trim() || `${name.slice(0, 3).toUpperCase()}-${newSubjectGrade.replace(/\D/g, '') || '10'}`,
              board: newSubjectBoard.trim() || 'CBSE',
              grade: newSubjectGrade.trim(),
              description: `Master curriculum subject for ${newSubjectGrade.trim()}`
            })
          });
          if (bRes.ok) {
            const bData = await bRes.json();
            createdSubject = bData.data || bData.subject;
          }
        } catch (e) {}
      }

      if (!createdSubject) {
        throw new Error('Unable to create subject via documented branch catalog endpoint.');
      }

      const newSubj: SubjectRecord = {
        id: String(createdSubject?.id || Date.now()),
        name: createdSubject?.name || name,
        displayName: `${name} (${newSubjectGrade.trim()})`,
        grade: createdSubject?.grade || newSubjectGrade.trim(),
        board: createdSubject?.board || newSubjectBoard.trim() || 'CBSE',
        className: createdSubject?.className || createdSubject?.class_name || `${newSubjectGrade.trim()} ${name}`,
        lessonsCount: 0,
        chunks: 'Indexed',
        status: 'Configured'
      };

      // Persist in localStorage master subjects
      try {
        const rawMaster = localStorage.getItem('paatam_master_subjects') || '[]';
        const parsed = JSON.parse(rawMaster);
        const updated = Array.isArray(parsed) ? [...parsed.filter((s: any) => s.name !== name), newSubj] : [newSubj];
        localStorage.setItem('paatam_master_subjects', JSON.stringify(updated));
      } catch (e) {}

      setSubjectsList((current) => [...current.filter((item) => item.name !== name), newSubj].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedSubjectId(newSubj.id);
      setActiveSubject(name);
      setNewSubjectTitle('');
      setNewSubjectGrade('');
      setNewSubjectBoard('CBSE');
      setNewSubjectCode('');
      setIsAddSubjectOpen(false);
      alert(`✅ Subject "${name}" added to curriculum!`);
    } catch (err: any) {
      console.error('Error creating subject:', err);
      alert('Error creating subject: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmittingSubject(false);
    }
  };

  // 4. Handle Chapter Ingestion (POST /api/curriculum/chapters/ingest)
  const handleIngestChapter = async () => {
    if (uploadedFiles.length === 0 && !chapterTextInput.trim()) {
      alert('⚠️ Please select a Chapter PDF document or provide chapter text.');
      return;
    }
    if (!activeSubjectObj) {
      alert('Please choose a specific subject before uploading.');
      return;
    }

    setIsIngesting(true);
    setIngestStatus('Extracting text and identifying subtopics with AI...');

    try {
      // POST /api/curriculum/chapters/ingest
      if (activeSubjectObj.id) {
        let uploadedPdfUrl: string | undefined = undefined;

        // If a file was selected, upload it to S3 first to obtain a valid file URL
        if (uploadedFiles.length > 0 && uploadedFiles[0]) {
          const file = uploadedFiles[0];
          try {
            setIngestStatus('Uploading chapter PDF to secure cloud storage...');
            const targetSectionId = activeSubjectObj.sectionId || localStorage.getItem('paatam_active_section_id') || 'default';
            const uploadItems = await getPresignedUploadUrls(targetSectionId, [
              {
                file_name: file.name,
                file_type: file.type || 'application/pdf',
                purpose: 'question_paper'
              }
            ]);
            const targetUpload = uploadItems?.[0];
            if (targetUpload?.upload_url) {
              await uploadBinaryToS3(targetUpload.upload_url, file);
              uploadedPdfUrl = targetUpload.file_url || targetUpload.upload_url.split('?')[0];
            }
          } catch (uploadErr) {
            console.warn('S3 direct upload for chapter PDF was bypassed or failed:', uploadErr);
          }
        }

        setIngestStatus('Extracting text and identifying subtopics with AI...');

        const resolvedTitle = chapterTitleInput.trim() || uploadedFiles[0]?.name?.replace(/\.pdf$/i, '') || `Chapter ${chapterNumberInput}`;
        const resolvedText = chapterTextInput.trim() || `Chapter ${chapterNumberInput}: ${resolvedTitle}`;

        const payload: Record<string, any> = {
          class_subject_id: activeSubjectObj.id,
          chapter_title: resolvedTitle,
          chapter_number: Number(chapterNumberInput) || 1,
          chapter_text: resolvedText,
          file_name: uploadedFiles[0]?.name || 'chapter.pdf'
        };

        // Only attach pdf_url if we obtained a valid URL; never send an empty string "" which fails backend URL validation
        if (uploadedPdfUrl && /^https?:\/\//i.test(uploadedPdfUrl)) {
          payload.pdf_url = uploadedPdfUrl;
        }

        const docRes = await fetch(`${API_BASE_URL}/api/curriculum/chapters/ingest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const docData = await docRes.json().catch(() => ({}));
        if (docRes.ok && (docData.success || docData.message)) {
          setIngestStatus(`✅ ${docData.message || 'Chapter indexed successfully!'}`);
          alert(`✅ ${docData.message || 'Chapter ingested successfully!'}`);
          setUploadedFiles([]);
          setChapterTitleInput('');
          setChapterTextInput('');
          await fetchChaptersForSubject(activeClassName, activeSubject);
          setIsIngesting(false);
          return;
        }
        alert(`⚠️ Ingestion note: ${docData.message || 'Failed to ingest chapter.'}`);
        setIngestStatus(`Error: ${docData.message || 'Failed to ingest chapter.'}`);
      }
    } catch (err: any) {
      console.error(err);
      alert('Failed to connect to chapter ingestion service.');
      setIngestStatus('Connection error during chapter ingestion.');
    } finally {
      setIsIngesting(false);
    }
  };

  // 4b. Ingest Syllabus Weightage (POST /api/curriculum/syllabus/ingest)
  const handleIngestSyllabus = async () => {
    if (!syllabusText.trim()) {
      alert('Please enter syllabus breakdown or weightage text.');
      return;
    }
    if (!activeSubjectObj?.id) {
      alert('Please select a subject first.');
      return;
    }

    setIsIngestingSyllabus(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/curriculum/syllabus/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_subject_id: activeSubjectObj.id,
          syllabus_text: syllabusText.trim()
        })
      });
      const data = await res.json();
      if (res.ok && (data.success || data.message || data.topics)) {
        alert('✅ Syllabus and topic weightages ingested successfully!');
        setSyllabusText('');
        fetchSyllabusTopics();
      } else {
        alert(data.message || 'Unable to parse syllabus.');
      }
    } catch {
      alert('Error connecting to syllabus ingestion service.');
    } finally {
      setIsIngestingSyllabus(false);
    }
  };

  // 5. Handle Delete Chapter
  const handleDeleteChapter = async (chapter: CurriculumChapter) => {
    const title = chapter.chapter_title;
    if (!window.confirm(`Are you sure you want to delete Chapter ${chapter.chapter_number}: "${title}"? This will only remove this chapter's vector chunks without affecting other chapters.`)) {
      return;
    }
    alert('Chapter delete API is not documented in API_DOCS and is disabled in strict mode.');
  };

  // 5b. Handle Rename / Edit Chapter
  const handleEditChapter = async (chapter: CurriculumChapter) => {
    const currentTitle = chapter.chapter_title;
    const newTitle = window.prompt(`Rename Chapter ${chapter.chapter_number} to actual title:`, currentTitle);
    if (!newTitle || !newTitle.trim() || newTitle.trim() === currentTitle) {
      return;
    }

    alert('Chapter rename API is not documented in API_DOCS and is disabled in strict mode.');
  };

  const totalChunks = chapters.reduce((acc, c) => acc + (c.chunk_count || 0), 0);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      
      {/* Top Banner Header */}
      <header className="page-top-bar no-print">
        <div className="page-top-bar-text">
          <h1>Knowledge Base & Chapter Library</h1>
          <p>Upload chapter-by-chapter PDFs. AI automatically extracts core subtopics and vectorizes content cumulatively for exam generation.</p>
        </div>
      </header>

      <div className="page-container">
        
        {/* Subject Filter & Quick Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.875rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <label htmlFor="kb-subject-filter" style={{ fontSize: '0.875rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>Target Subject:</span>
            </label>
            <select
              id="kb-subject-filter"
              value={selectedSubjectId || (activeSubjectObj ? activeSubjectObj.id : '')}
              onChange={(e) => {
                const chosenId = e.target.value;
                setSelectedSubjectId(chosenId);
                const match = subjectsList.find((s) => s.id === chosenId);
                if (match) {
                  setActiveSubject(match.name);
                }
              }}
              style={{
                padding: '0.45rem 1rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                borderRadius: '0.5rem',
                border: '1.5px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#0F172A',
                cursor: 'pointer',
                minWidth: '280px',
                outline: 'none',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
              }}
            >
              {subjectsList.length === 0 ? (
                <option value="">
                  {isTeacher ? 'No subjects assigned to you' : '-- No subjects in catalog --'}
                </option>
              ) : (
                <>
                  {!isTeacher && <option value="">-- Select a Subject --</option>}
                  {subjectsList.map((subj) => (
                    <option key={subj.id} value={subj.id}>
                      {subj.displayName || `${subj.name} ${subj.grade ? `(${subj.grade})` : ''}`}
                    </option>
                  ))}
                </>
              )}
            </select>

            {isDeanOrAbove && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                onClick={() => setIsAddSubjectOpen(true)}
              >
                <Plus className="size-4" />
                <span>Add Subject</span>
              </button>
            )}
          </div>

          {activeSubject !== 'All subjects' && activeSubjectObj && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#64748B' }}>
              <span>Class: <strong style={{ color: '#0F172A' }}>{activeClassName}{activeSectionName ? ` (${activeSectionName})` : ''}</strong></span>
              <span>•</span>
              <span>{chapters.length} Chapter(s) Indexed</span>
              <span>•</span>
              <span className="badge badge-success">{totalChunks} Vector Chunks</span>
            </div>
          )}
        </div>

        {activeSubject === 'All subjects' ? (
          <div className="m-card" style={{ padding: '3rem 2rem', textAlign: 'center', color: '#64748B' }}>
            <BookOpen className="size-12 mx-auto mb-3 text-blue-500 opacity-60" />
            <h3 style={{ fontSize: '1.15rem', color: '#1E293B', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Select a Subject to Begin</h3>
            <p style={{ maxWidth: '480px', margin: '0 auto', fontSize: '0.875rem' }}>
              Choose a subject from the dropdown above to view its chapters, extract subtopics from chapter PDFs, and prepare materials for question papers.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Tab Switcher */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setCurriculumTab('chapters')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: curriculumTab === 'chapters' ? '#EFF6FF' : 'transparent',
                  color: curriculumTab === 'chapters' ? '#1D4ED8' : '#64748B',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <BookOpen className="size-4" />
                <span>Chapter Textbooks & RAG ({chapters.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setCurriculumTab('syllabus')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: curriculumTab === 'syllabus' ? '#EFF6FF' : 'transparent',
                  color: curriculumTab === 'syllabus' ? '#1D4ED8' : '#64748B',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <Layers className="size-4" />
                <span>Syllabus & Weightage Ingestion ({syllabusTopics.length})</span>
              </button>
            </div>

            {curriculumTab === 'chapters' && (
              <>
            {/* CARD 1: CHAPTER-WISE PDF UPLOADER */}
            <div className="m-card">
              <div className="m-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 className="m-card-title" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Upload className="size-4 text-blue-600" />
                  <span>Upload Chapter PDF for {activeSubject} ({activeClassName})</span>
                </h3>
                <span style={{ fontSize: '0.75rem', background: '#EFF6FF', color: '#1D4ED8', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontWeight: 600 }}>
                  Cumulative Mode: Adds to library without deleting other chapters
                </span>
              </div>

              {/* Dropzone */}
              <div 
                className="scan-dropzone"
                onClick={() => document.getElementById('chapter-upload-input')?.click()}
                style={{ border: '2px dashed #93C5FD', background: '#F8FAFC', cursor: 'pointer', padding: '1.5rem', textAlign: 'center' }}
              >
                <input 
                  type="file" 
                  id="chapter-upload-input" 
                  accept=".pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      const file = e.target.files[0];
                      setUploadedFiles([file]);
                      // Only set chapter title if filename looks like a human-readable title (has spaces and > 5 chars), otherwise leave blank so AI extracts the real chapter title
                      if (!chapterTitleInput) {
                        const cleanName = file.name.replace(/\.pdf$/i, '').replace(/^[0-9\s_-]+/, '').replace(/[_-]/g, ' ').trim();
                        if (cleanName.includes(' ') && cleanName.length > 5) {
                          setChapterTitleInput(cleanName);
                        }
                      }
                    }
                  }}
                />
                <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: '#EFF6FF', display: 'grid', placeItems: 'center', color: '#2563EB', margin: '0 auto 0.75rem auto' }}>
                  <Upload className="size-6" />
                </div>
                <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827', margin: 0 }}>
                  {uploadedFiles.length > 0 ? uploadedFiles[0].name : 'Drop Chapter PDF here or Click to Browse'}
                </p>
                <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0.25rem 0 0 0' }}>
                  Upload each chapter PDF (e.g. Chapter 1, Chapter 2). AI extracts the subtopics and indexes the text into Supabase.
                </p>
              </div>

              {/* Chapter Metadata Form (Enabled once file chosen or manual) */}
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: '0.75rem', marginTop: '1rem', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Chapter No.</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    className="form-input"
                    value={chapterNumberInput}
                    onChange={(e) => setChapterNumberInput(Math.max(1, Number(e.target.value)))}
                    style={{ fontSize: '0.85rem', fontWeight: 700, textAlign: 'center' }}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                    Chapter Title <span style={{ color: '#64748B', fontWeight: 400 }}>(or leave blank to auto-detect with AI)</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Chemical Reactions and Equations"
                    value={chapterTitleInput}
                    onChange={(e) => setChapterTitleInput(e.target.value)}
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleIngestChapter}
                  disabled={isIngesting || uploadedFiles.length === 0}
                  style={{ height: '38px', padding: '0 1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
                >
                  {isIngesting ? (
                    <>
                      <Clock className="size-4 animate-spin" />
                      <span>Ingesting Chapter...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      <span>Ingest Chapter</span>
                    </>
                  )}
                </button>
              </div>

              {/* Status Note */}
              {ingestStatus && (
                <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.85rem', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '0.375rem', fontSize: '0.8rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 className="size-4 text-green-600 flex-shrink-0" />
                  <span>{ingestStatus}</span>
                </div>
              )}
            </div>

            {/* CARD 2: CHAPTER LIBRARY & SUBTOPICS REPOSITORY */}
            <div className="m-card">
              <div className="m-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 className="m-card-title" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Layers className="size-4 text-blue-600" />
                  <span>Chapter Library for {activeSubject} ({chapters.length} Chapters)</span>
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                  Chapters and subtopics are loaded directly in the <strong>Exam Generator</strong>
                </span>
              </div>

              {isLoadingChapters ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748B' }}>
                  <Clock className="size-6 animate-spin mx-auto mb-2 text-blue-600" />
                  <p style={{ margin: 0, fontSize: '0.875rem' }}>Loading chapters from knowledge base...</p>
                </div>
              ) : chapters.length === 0 ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', background: '#F8FAFC', borderRadius: '0.5rem', border: '1px dashed #CBD5E1' }}>
                  <BookOpen className="size-8 mx-auto mb-2 text-slate-400" />
                  <p style={{ margin: '0 0 0.25rem 0', fontWeight: 700, color: '#334155' }}>No chapters uploaded yet for this subject.</p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B' }}>
                    Upload your Chapter 1 PDF using the uploader above. You can upload as many chapters as you need!
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {chapters.map((ch, idx) => (
                    <div 
                      key={ch.id || idx}
                      style={{
                        padding: '1rem',
                        background: '#FFFFFF',
                        border: '1.5px solid #E2E8F0',
                        borderRadius: '0.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.6rem',
                        transition: 'all 0.15s ease',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <span style={{ 
                            background: '#EFF6FF', 
                            color: '#1D4ED8', 
                            fontSize: '0.75rem', 
                            fontWeight: 800, 
                            padding: '0.25rem 0.6rem', 
                            borderRadius: '0.375rem', 
                            border: '1px solid #BFDBFE' 
                          }}>
                            Chapter {ch.chapter_number}
                          </span>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>
                            {ch.chapter_title}
                          </h4>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {ch.chunk_count !== undefined && (
                            <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
                              {ch.chunk_count} vector chunks
                            </span>
                          )}
                          <button
                            type="button"
                            className="btn btn-outline btn-sm text-blue-600 hover:bg-blue-50"
                            style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem', borderColor: '#BFDBFE', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            onClick={() => handleEditChapter(ch)}
                            title="Rename this chapter"
                          >
                            <Pencil className="size-3.5" />
                            <span>Rename</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm text-red-600 hover:bg-red-50"
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderColor: '#FECACA', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            onClick={() => handleDeleteChapter(ch)}
                            title="Delete this chapter"
                          >
                            <Trash2 className="size-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>

                      {/* Subtopics pill chips */}
                      {Array.isArray(ch.subtopics) && ch.subtopics.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Extracted Subtopics & Concepts:
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                            {ch.subtopics.map((st, sIdx) => (
                              <span 
                                key={sIdx}
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 500,
                                  background: '#F1F5F9',
                                  color: '#334155',
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '0.25rem',
                                  border: '1px solid #E2E8F0'
                                }}
                              >
                                {st}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            </>
            )}

            {/* SYLLABUS & WEIGHTAGE TAB (POST /api/curriculum/syllabus/ingest & GET /api/curriculum/topics) */}
            {curriculumTab === 'syllabus' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="m-card">
                  <div className="m-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 className="m-card-title" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Layers className="size-4 text-blue-600" />
                        <span>Curriculum Syllabus & Marks Weightage Ingestion</span>
                      </h3>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8125rem', color: '#64748B' }}>
                        Paste official board syllabus text with marks weightages (e.g. CBSE / ICSE / State Board curriculum circular)
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setSyllabusText(
                          `Unit I: Chemical Substances - Nature and Behaviour (25 Marks)\n` +
                          `- Chemical Reactions & Equations: Types of chemical reactions, combination, decomposition, displacement, double displacement, precipitation, neutralization, oxidation and reduction.\n` +
                          `- Acids, Bases and Salts: Definitions in terms of furnishing of H+ and OH- ions, general properties, examples and uses, concept of pH scale, importance of pH in everyday life, preparation and uses of Sodium Hydroxide, Bleaching powder, Baking soda, Washing soda and Plaster of Paris.\n` +
                          `- Metals and Non-metals: Properties of metals and non-metals, reactivity series, formation and properties of ionic compounds, basic metallurgical processes, corrosion and its prevention.\n\n` +
                          `Unit II: World of Living (25 Marks)\n` +
                          `- Life Processes: Basic concept of nutrition, respiration, transport and excretion in plants and animals.\n` +
                          `- Control and Co-ordination: Tropic movements in plants, introduction to plant hormones, control and co-ordination in animals, nervous system, voluntary, involuntary and reflex action, chemical co-ordination, animal hormones.\n\n` +
                          `Unit III: Natural Phenomena (12 Marks)\n` +
                          `- Reflection and refraction of light, spherical mirrors, lenses, magnification, power of a lens, human eye and colorful world.\n\n` +
                          `Unit IV: Effects of Current (13 Marks)\n` +
                          `- Electric current, potential difference, Ohm's law, resistance, series and parallel combination, heating effect of electric current, magnetic effects of electric current.\n\n` +
                          `Unit V: Natural Resources (05 Marks)\n` +
                          `- Our Environment: Eco-system, environmental problems, ozone depletion, waste production and their solutions.`
                        );
                      }}
                      style={{ fontSize: '0.75rem' }}
                    >
                      Load Sample CBSE Syllabus
                    </button>
                  </div>

                  <div style={{ marginTop: '1rem' }}>
                    <textarea
                      rows={8}
                      className="form-input"
                      style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8125rem', lineHeight: '1.5' }}
                      placeholder="Paste curriculum syllabus outline with unit marks allocations..."
                      value={syllabusText}
                      onChange={(e) => setSyllabusText(e.target.value)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleIngestSyllabus}
                        disabled={isIngestingSyllabus || !syllabusText.trim()}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <Sparkles className="size-4" />
                        <span>{isIngestingSyllabus ? 'Extracting Blueprint...' : 'Ingest Syllabus Weightage'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Parsed Topics & Weightage Viewer */}
                <div className="m-card">
                  <div className="m-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="m-card-title" style={{ fontSize: '1rem' }}>
                      Extracted Units & Topics ({syllabusTopics.length})
                    </h3>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={fetchSyllabusTopics}
                    >
                      Refresh Topics
                    </button>
                  </div>

                  {isLoadingTopics ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
                      Loading curriculum topics...
                    </div>
                  ) : syllabusTopics.length === 0 ? (
                    <div style={{ padding: '2.5rem', textAlign: 'center', background: '#F8FAFC', borderRadius: '0.5rem', border: '1px dashed #CBD5E1' }}>
                      <Layers className="size-8 mx-auto mb-2 text-slate-400" />
                      <p style={{ margin: '0 0 0.25rem 0', fontWeight: 700, color: '#334155' }}>No syllabus weightages ingested yet.</p>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B' }}>
                        Paste your course syllabus above and click "Ingest Syllabus Weightage" to populate topic-level blueprint limits.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.85rem' }}>
                      {syllabusTopics.map((top, idx) => {
                        const title = top.unit_title || top.title || top.name || `Unit ${idx + 1}`;
                        const weight = top.marks || top.weightage || top.marks_weightage;
                        const sublist = Array.isArray(top.subtopics) ? top.subtopics : Array.isArray(top.topics) ? top.topics : [];

                        return (
                          <div
                            key={top.id || idx}
                            style={{
                              padding: '1rem',
                              background: '#FFFFFF',
                              border: '1.5px solid #E2E8F0',
                              borderRadius: '0.5rem',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between'
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>
                                  {title}
                                </h4>
                                {weight && (
                                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: '#ECFDF5', color: '#065F46', borderRadius: '4px', fontWeight: 700 }}>
                                    {weight} Marks
                                  </span>
                                )}
                              </div>
                              {sublist.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.5rem' }}>
                                  {sublist.slice(0, 5).map((st: any, i: number) => (
                                    <span key={i} style={{ fontSize: '0.7rem', padding: '0.15rem 0.35rem', background: '#F1F5F9', color: '#475569', borderRadius: '3px' }}>
                                      {typeof st === 'string' ? st : st.name}
                                    </span>
                                  ))}
                                  {sublist.length > 5 && (
                                    <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                                      +{sublist.length - 5} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Add Subject Modal (Dean & Above) */}
      {isAddSubjectOpen && isDeanOrAbove && (
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
            zIndex: 9999,
            padding: '1rem'
          }}
          onClick={() => setIsAddSubjectOpen(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E2E8F0',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #E2E8F0',
                background: '#F8FAFC'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <BookOpen className="size-5" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>
                    Add Curriculum Subject
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B' }}>
                    Create a new subject in the curriculum catalog
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddSubjectOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '8px',
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Close"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Subject Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Physics, Chemistry, Computer Science"
                  value={newSubjectTitle}
                  onChange={(e) => setNewSubjectTitle(e.target.value)}
                  style={{ width: '100%', fontSize: '0.875rem' }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Grade / Class <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Grade 10, Class 9"
                  value={newSubjectGrade}
                  onChange={(e) => setNewSubjectGrade(e.target.value)}
                  style={{ width: '100%', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Curriculum / Board <span style={{ color: '#94A3B8', fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. CBSE, ICSE"
                    value={newSubjectBoard}
                    onChange={(e) => setNewSubjectBoard(e.target.value)}
                    style={{ width: '100%', fontSize: '0.875rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Subject Code <span style={{ color: '#94A3B8', fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. PHY-10"
                    value={newSubjectCode}
                    onChange={(e) => setNewSubjectCode(e.target.value)}
                    style={{ width: '100%', fontSize: '0.875rem' }}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                padding: '1rem 1.5rem',
                background: '#F8FAFC',
                borderTop: '1px solid #E2E8F0'
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsAddSubjectOpen(false)}
                disabled={isSubmittingSubject}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAddSubject}
                disabled={!newSubjectTitle.trim() || !newSubjectGrade.trim() || isSubmittingSubject}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {isSubmittingSubject ? 'Creating...' : 'Save Subject'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
