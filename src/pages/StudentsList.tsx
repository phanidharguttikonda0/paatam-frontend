
import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Download,
  Filter,
  Search,
  Users,
  CheckCircle2,
  MinusCircle,
  UserRound,
  AlertTriangle,
} from 'lucide-react';
import type { ReactNode } from 'react';
import './StudentsList.css';

export interface StudentListStudent {
  id: string;
  name: string;
  rollNumber: string;
  admissionNo: string;
  className: string;
  sectionName: string;
  parentName?: string;
  parentPhone?: string;
  testsTaken?: number;
  avgPercentage: number;
  status: string;
  knowledgeGaps?: string[];
  excelledAreas?: string[];
  recentSubmissions: {
    id: string;
    subject: string;
    score: number;
    maxScore: number;
    submittedAt: string;
  }[];
}

interface StudentsListProps {
  students: StudentListStudent[];
  onBack: () => void;
  onSelectStudent?: (student: StudentListStudent) => void;
}

function getStatus(score: number) {
  if (score > 60) return 'Performing Well';
  if (score > 40) return 'Moderate';
  if (score > 20) return 'Needs Support';
  return 'At Risk';
}

function getLatestScore(student: StudentListStudent) {
  const latest = student.recentSubmissions?.[0];

  if (!latest || !latest.maxScore) return null;

  return Math.round((latest.score / latest.maxScore) * 100);
}

export default function StudentsList({
  students,
  onBack,
  onSelectStudent,
}: StudentsListProps) {
  const [search, setSearch] = useState('');
  const [academicYear, setAcademicYear] = useState('2025 - 2026');
  const [selectedClass, setSelectedClass] = useState('All Classes');
  const [selectedSection, setSelectedSection] = useState('All Sections');
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');
  const [selectedAssessment, setSelectedAssessment] = useState('All Assessments');
  const [selectedStatus, setSelectedStatus] = useState('All Students');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const pageSize = 10;

  const classOptions = useMemo(
    () => Array.from(new Set(students.map((student) => student.className).filter(Boolean))).sort(),
    [students],
  );

  const sectionOptions = useMemo(
    () =>
      Array.from(
        new Set(
          students
            .filter(
              (student) =>
                selectedClass === 'All Classes' ||
                student.className === selectedClass,
            )
            .map((student) => student.sectionName)
            .filter(Boolean),
        ),
      ).sort(),
    [students, selectedClass],
  );

  const subjectOptions = useMemo(
    () =>
      Array.from(
        new Set(
          students.flatMap((student) =>
            (student.recentSubmissions || []).map((submission) => submission.subject),
          ),
        ),
      ).sort(),
    [students],
  );

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return students.filter((student) => {
      const matchesSearch =
        !query ||
        student.name?.toLowerCase().includes(query) ||
        student.rollNumber?.toLowerCase().includes(query) ||
        student.admissionNo?.toLowerCase().includes(query);

      const matchesClass =
        selectedClass === 'All Classes' ||
        student.className === selectedClass;

      const matchesSection =
        selectedSection === 'All Sections' ||
        student.sectionName === selectedSection;

      const matchesSubject =
        selectedSubject === 'All Subjects' ||
        student.recentSubmissions?.some(
          (submission) => submission.subject === selectedSubject,
        );

      const matchesAssessment =
        selectedAssessment === 'All Assessments' ||
        (student.recentSubmissions?.length ?? 0) > 0;

      const matchesStatus =
        selectedStatus === 'All Students' ||
        getStatus(student.avgPercentage || 0) === selectedStatus;

      return (
        matchesSearch &&
        matchesClass &&
        matchesSection &&
        matchesSubject &&
        matchesAssessment &&
        matchesStatus
      );
    });
  }, [
    students,
    search,
    selectedClass,
    selectedSection,
    selectedSubject,
    selectedAssessment,
    selectedStatus,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStudents = filteredStudents.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const counts = useMemo(
    () => ({
      total: filteredStudents.length,
      performing: filteredStudents.filter(
        (student) => getStatus(student.avgPercentage || 0) === 'Performing Well',
      ).length,
      moderate: filteredStudents.filter(
        (student) => getStatus(student.avgPercentage || 0) === 'Moderate',
      ).length,
      support: filteredStudents.filter(
        (student) => getStatus(student.avgPercentage || 0) === 'Needs Support',
      ).length,
      risk: filteredStudents.filter(
        (student) => getStatus(student.avgPercentage || 0) === 'At Risk',
      ).length,
    }),
    [filteredStudents],
  );

  function updateFilter(callback: () => void) {
    callback();
    setCurrentPage(1);
  }

  function toggleStudent(id: string) {
    setSelectedIds((previous) =>
      previous.includes(id)
        ? previous.filter((selectedId) => selectedId !== id)
        : [...previous, id],
    );
  }

  function toggleAllVisible() {
    const visibleIds = pageStudents.map((student) => student.id);
    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedIds.includes(id));

    setSelectedIds((previous) =>
      allSelected
        ? previous.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...previous, ...visibleIds])),
    );
  }

  function exportStudents() {
    const rows = [
      [
        'Student Name',
        'Roll No.',
        'Admission No.',
        'Class',
        'Section',
        'Overall Average',
        'Latest Assessment',
        'Latest Score',
        'Performance Status',
      ],
      ...filteredStudents.map((student) => [
        student.name,
        student.rollNumber,
        student.admissionNo,
        student.className,
        student.sectionName,
        `${Math.round(student.avgPercentage || 0)}%`,
        student.recentSubmissions?.[0]?.subject || 'No assessment',
        getLatestScore(student) === null
          ? '—'
          : `${getLatestScore(student)}%`,
        getStatus(student.avgPercentage || 0),
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'students-list.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  const summaryCards: {
    label: string;
    count: number;
    description: string;
    type: string;
    icon: ReactNode;
  }[] = [
    {
      label: 'Total Students',
      count: counts.total,
      description: 'Selected class and section',
      type: 'total',
      icon: <Users size={29} />,
    },
    {
      label: 'Performing Well',
      count: counts.performing,
      description: '61% - 100%',
      type: 'good',
      icon: <CheckCircle2 size={29} />,
    },
    {
      label: 'Moderate',
      count: counts.moderate,
      description: '41% - 60%',
      type: 'moderate',
      icon: <MinusCircle size={29} />,
    },
    {
      label: 'Needs Support',
      count: counts.support,
      description: '21% - 40%',
      type: 'support',
      icon: <UserRound size={29} />,
    },
    {
      label: 'At Risk',
      count: counts.risk,
      description: '0% - 20%',
      type: 'risk',
      icon: <AlertTriangle size={29} />,
    },
  ];

  return (
    <div className="students-list-page">
      <nav className="students-list-breadcrumb" aria-label="Breadcrumb">
        <button type="button" onClick={onBack}>
          Student Analytics
        </button>
        <ChevronRight size={15} />
        <strong>Students List</strong>
      </nav>

      <header className="students-list-heading">
        <div>
          <h1>Students List</h1>
          <p>
            List of all students with their performance and latest assessment status.
          </p>
        </div>

        <button
          type="button"
          className="students-export-button"
          onClick={exportStudents}
        >
          <Download size={19} />
          Export
          <ChevronDown size={15} />
        </button>
      </header>

      <section className="students-list-filters" aria-label="Student filters">
        <label>
          <span>Academic Year</span>
          <select
            value={academicYear}
            onChange={(event) =>
              updateFilter(() => setAcademicYear(event.target.value))
            }
          >
            <option>2025 - 2026</option>
            <option>2026 - 2027</option>
            <option>2024 - 2025</option>
          </select>
        </label>

        <label>
          <span>Class</span>
          <select
            value={selectedClass}
            onChange={(event) => {
              updateFilter(() => {
                setSelectedClass(event.target.value);
                setSelectedSection('All Sections');
              });
            }}
          >
            <option>All Classes</option>
            {classOptions.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Section</span>
          <select
            value={selectedSection}
            onChange={(event) =>
              updateFilter(() => setSelectedSection(event.target.value))
            }
          >
            <option>All Sections</option>
            {sectionOptions.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Subject</span>
          <select
            value={selectedSubject}
            onChange={(event) =>
              updateFilter(() => setSelectedSubject(event.target.value))
            }
          >
            <option>All Subjects</option>
            {subjectOptions.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Assessment</span>
          <select
            value={selectedAssessment}
            onChange={(event) =>
              updateFilter(() => setSelectedAssessment(event.target.value))
            }
          >
            <option>All Assessments</option>
            <option>Completed Assessments</option>
          </select>
        </label>

        <label>
          <span>Performance Status</span>
          <select
            value={selectedStatus}
            onChange={(event) =>
              updateFilter(() => setSelectedStatus(event.target.value))
            }
          >
            <option>All Students</option>
            <option>Performing Well</option>
            <option>Moderate</option>
            <option>Needs Support</option>
            <option>At Risk</option>
          </select>
        </label>

        <button
          type="button"
          className="students-more-filters"
          onClick={() => setShowMoreFilters((previous) => !previous)}
          aria-expanded={showMoreFilters}
        >
          <Filter size={18} />
          More Filters
        </button>
      </section>

      {showMoreFilters && (
        <section className="students-extra-filters">
          <p>
            Use the Academic Year, Class, Section, Subject, Assessment, and
            Performance Status filters above to refine the student list.
          </p>
          <button
            type="button"
            onClick={() => {
              setAcademicYear('2025 - 2026');
              setSelectedClass('All Classes');
              setSelectedSection('All Sections');
              setSelectedSubject('All Subjects');
              setSelectedAssessment('All Assessments');
              setSelectedStatus('All Students');
              setSearch('');
              setCurrentPage(1);
            }}
          >
            Reset filters
          </button>
        </section>
      )}

      <section className="students-summary-grid">
        {summaryCards.map((card) => (
          <article
            key={card.type}
            className={`students-summary-card ${card.type}`}
          >
            <div className="students-summary-icon">{card.icon}</div>
            <div className="students-summary-info">
              <span>{card.label}</span>
              <strong>{card.count}</strong>
              <small>{card.description}</small>
            </div>
          </article>
        ))}
      </section>

      <section className="students-table-panel">
        <div className="students-table-heading">
          <div className="students-table-title">
            <Users size={35} />
            <div>
              <h2>
                Students
                {selectedClass !== 'All Classes' ? ` in ${selectedClass}` : ''}
                {selectedSection !== 'All Sections'
                  ? ` - Section ${selectedSection}`
                  : ''}
              </h2>
              <p>Student roster, performance, and latest assessment details.</p>
            </div>
          </div>

          <label className="students-table-search">
            <Search size={19} />
            <input
              type="search"
              placeholder="Search by student name, roll no. or admission no..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
            />
          </label>
        </div>

        <div className="students-table-scroll">
          <table className="students-directory-table">
            <thead>
              <tr>
                <th className="students-checkbox-column">
                  <input
                    type="checkbox"
                    aria-label="Select all students on this page"
                    checked={
                      pageStudents.length > 0 &&
                      pageStudents.every((student) =>
                        selectedIds.includes(student.id),
                      )
                    }
                    onChange={toggleAllVisible}
                  />
                </th>
                <th>#</th>
                <th>Student Name</th>
                <th>Roll No.</th>
                <th>Admission No.</th>
                <th>Overall Average</th>
                <th>Latest Assessment</th>
                <th>Latest Score</th>
                <th>Performance Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {pageStudents.map((student, index) => {
                const score = Math.round(student.avgPercentage || 0);
                const latest = student.recentSubmissions?.[0];
                const latestScore = getLatestScore(student);
                const status = getStatus(score);

                return (
                  <tr key={student.id}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Select ${student.name}`}
                        checked={selectedIds.includes(student.id)}
                        onChange={() => toggleStudent(student.id)}
                      />
                    </td>
                    <td>{(safePage - 1) * pageSize + index + 1}</td>
                    <td className="students-name-cell">{student.name}</td>
                    <td>{student.rollNumber || '—'}</td>
                    <td>{student.admissionNo || '—'}</td>
                    <td>
                      <span
                        className={`students-score-pill ${
                          score > 60 ? 'good' : score > 40 ? 'moderate' : 'low'
                        }`}
                      >
                        {score}%
                      </span>
                    </td>
                    <td>
                      {latest
                        ? `${latest.subject} (${latest.submittedAt || 'Assessment'})`
                        : 'No assessment'}
                    </td>
                    <td>
                      <span
                        className={`students-score-pill ${
                          latestScore === null
                            ? 'neutral'
                            : latestScore > 60
                              ? 'good'
                              : latestScore > 40
                                ? 'moderate'
                                : 'low'
                        }`}
                      >
                        {latestScore === null ? '—' : `${latestScore}%`}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`students-status-pill ${status
                          .toLowerCase()
                          .replaceAll(' ', '-')}`}
                      >
                        {status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="students-view-button"
                        onClick={() => onSelectStudent?.(student)}
                        disabled={!onSelectStudent}
                      >
                        View <ChevronDown size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {pageStudents.length === 0 && (
                <tr>
                  <td colSpan={10} className="students-empty-state">
                    No students match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="students-table-footer">
          <span>
            Showing{' '}
            {filteredStudents.length ? (safePage - 1) * pageSize + 1 : 0}
            {' - '}
            {Math.min(safePage * pageSize, filteredStudents.length)}
            {' of '}
            {filteredStudents.length} students
          </span>

          <div className="students-pagination">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((page) => page - 1)}
              aria-label="Previous page"
            >
              ‹
            </button>

            {Array.from({ length: totalPages }, (_, index) => index + 1)
              .slice(
                Math.max(0, Math.min(safePage - 3, totalPages - 5)),
                Math.max(0, Math.min(safePage - 3, totalPages - 5)) + 5,
              )
              .map((page) => (
                <button
                  type="button"
                  key={page}
                  className={safePage === page ? 'active' : ''}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}

            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((page) => page + 1)}
              aria-label="Next page"
            >
              ›
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
