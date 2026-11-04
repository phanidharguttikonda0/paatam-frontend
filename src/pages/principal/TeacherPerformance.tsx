
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  TrendingUp,
  Trophy,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  Download,
  Search,
  ArrowUpRight,
  X,
} from 'lucide-react';
import './TeacherPerformance.css';

type Teacher = {
  id: number;
  initials: string;
  name: string;
  subject: string;
  classes: string;
  students: number;
  score: number;
  growth: number;
  coverage: number;
  timeliness: number;
};

const teachers: Teacher[] = [
  { id: 1, initials: 'RS', name: 'Ravi Shankar', subject: 'Mathematics', classes: 'Class 8 (A, B), Class 9 (A)', students: 120, score: 92, growth: 6, coverage: 100, timeliness: 98 },
  { id: 2, initials: 'SP', name: 'Sneha Prasad', subject: 'Science', classes: 'Class 6 (A, B), Class 7 (A)', students: 118, score: 88, growth: 5, coverage: 100, timeliness: 95 },
  { id: 3, initials: 'AK', name: 'Anil Kumar', subject: 'English', classes: 'Class 8 (A), Class 10 (A, B)', students: 140, score: 87, growth: 4, coverage: 98, timeliness: 96 },
  { id: 4, initials: 'PD', name: 'Priya Devi', subject: 'Social Studies', classes: 'Class 7 (A, B)', students: 82, score: 84, growth: 3, coverage: 96, timeliness: 94 },
  { id: 5, initials: 'VM', name: 'Vijay Mohan', subject: 'Computer Science', classes: 'Class 9 (A), Class 11 (A)', students: 78, score: 82, growth: 2, coverage: 100, timeliness: 93 },
  { id: 6, initials: 'SK', name: 'Swathi K', subject: 'Mathematics', classes: 'Class 10 (A), Class 12 (A, B)', students: 110, score: 79, growth: 0, coverage: 95, timeliness: 92 },
  { id: 7, initials: 'MR', name: 'Manoj R', subject: 'Science', classes: 'Class 8 (B), Class 9 (B)', students: 85, score: 78, growth: -2, coverage: 94, timeliness: 90 },
  { id: 8, initials: 'ND', name: 'Niharika D', subject: 'English', classes: 'Class 6 (A), Class 7 (B)', students: 76, score: 76, growth: -3, coverage: 92, timeliness: 89 },
  { id: 9, initials: 'RK', name: 'Rajesh K', subject: 'Mathematics', classes: 'Class 11 (A), Class 12 (A)', students: 90, score: 55, growth: -4, coverage: 85, timeliness: 82 },
  { id: 10, initials: 'SM', name: 'Suma M', subject: 'Science', classes: 'Class 6 (A), Class 8 (B)', students: 95, score: 48, growth: -5, coverage: 80, timeliness: 78 },
];

const trend = [
  { label: 'Term 1', value: 81 },
  { label: 'Term 2', value: 83 },
  { label: 'Term 3', value: 85 },
  { label: 'This Term', value: 86 },
];

const categories = [
  'All Teachers',
  'High Performing',
  'Moderate',
  'Needs Support',
];

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="tp-filter">
      <span>{label}</span>
      <div className="tp-select-wrap">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <ChevronDown size={14} />
      </div>
    </label>
  );
}

function TrendChart() {
  const positions = trend.map((item, index) => ({
    x: 55 + index * 120,
    y: 150 - (item.value - 76) * 9,
    ...item,
  }));

  const line = positions
    .map((point) => `${point.x},${point.y}`)
    .join(' ');

  const area = `55,150 ${line} 415,150`;

  return (
    <svg
      className="tp-trend-svg"
      viewBox="0 0 460 190"
      role="img"
      aria-label="Teacher performance trend"
    >
      <defs>
        <linearGradient id="tpTrendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c58b" stopOpacity=".3" />
          <stop offset="100%" stopColor="#22c58b" stopOpacity=".03" />
        </linearGradient>
      </defs>

      {[76, 78, 80, 82, 84, 86, 88, 90].map((value) => {
        const y = 150 - (value - 76) * 9;

        return (
          <g key={value}>
            <text x="2" y={y + 4} className="tp-axis-label">
              {value}%
            </text>
            <line
              x1="42"
              y1={y}
              x2="445"
              y2={y}
              className="tp-grid-line"
            />
          </g>
        );
      })}

      <polygon points={area} fill="url(#tpTrendFill)" />
      <polyline points={line} className="tp-trend-line" />

      {positions.map((point) => (
        <g key={point.label}>
          <circle
            cx={point.x}
            cy={point.y}
            r="5"
            className="tp-trend-point"
          />

          <text
            x={point.x}
            y={point.y - 12}
            textAnchor="middle"
            className="tp-chart-value"
          >
            {point.value}%
          </text>

          <text
            x={point.x}
            y="178"
            textAnchor="middle"
            className="tp-axis-label"
          >
            {point.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function DistributionChart() {
  return (
    <div className="tp-distribution">
      <div className="tp-donut">
        <div className="tp-donut-center">
          <strong>58</strong>
          <span>Teachers</span>
        </div>
      </div>

      <div className="tp-distribution-legend">
        <div>
          <i className="tp-green" />
          <span>≥ 80% (High Performing)</span>
          <strong>42 (72%)</strong>
        </div>

        <div>
          <i className="tp-blue" />
          <span>60% – 79% (Moderate)</span>
          <strong>12 (21%)</strong>
        </div>

        <div>
          <i className="tp-yellow" />
          <span>50% – 59% (Needs Improvement)</span>
          <strong>3 (5%)</strong>
        </div>

        <div>
          <i className="tp-red" />
          <span>&lt; 50% (At Risk)</span>
          <strong>1 (2%)</strong>
        </div>
      </div>
    </div>
  );
}

function getCategory(score: number) {
  if (score >= 80) return 'High Performing';
  if (score >= 60) return 'Moderate';
  return 'Needs Support';
}

export default function TeacherPerformance() {
  const [academicYear, setAcademicYear] = useState('2025 – 2026');
  const [curriculum, setCurriculum] = useState('CBSE');
  const [term, setTerm] = useState('This Term');
  const [className, setClassName] = useState('All Classes');
  const [section, setSection] = useState('All Sections');
  const [subject, setSubject] = useState('All Subjects');

  const [activeTab, setActiveTab] = useState('All Teachers');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [selectedTeacher, setSelectedTeacher] =
    useState<Teacher | null>(null);

  const filteredTeachers = useMemo(() => {
    return teachers.filter((teacher) => {
      const matchesSearch =
        teacher.name.toLowerCase().includes(search.toLowerCase()) ||
        teacher.subject.toLowerCase().includes(search.toLowerCase());

      const matchesTab =
        activeTab === 'All Teachers' ||
        getCategory(teacher.score) === activeTab;

      const matchesSubject =
        subject === 'All Subjects' || teacher.subject === subject;

      const matchesClass =
        className === 'All Classes' ||
        teacher.classes.includes(className);

      const matchesSection =
        section === 'All Sections' ||
        teacher.classes.includes(section.replace('Section ', '('));

      return (
        matchesSearch &&
        matchesTab &&
        matchesSubject &&
        matchesClass &&
        matchesSection
      );
    });
  }, [search, activeTab, subject, className, section]);

  const pageSize = 8;

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTeachers.length / pageSize)
  );

  const visibleTeachers = filteredTeachers.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const refresh = () => {
    setAcademicYear('2025 – 2026');
    setCurriculum('CBSE');
    setTerm('This Term');
    setClassName('All Classes');
    setSection('All Sections');
    setSubject('All Subjects');
    setSearch('');
    setActiveTab('All Teachers');
    setPage(1);
  };

  const exportTeachers = () => {
    const headers = [
      'Teacher Name',
      'Subject',
      'Classes & Sections',
      'Students',
      'Average Score',
      'vs Last Term',
      'Assessment Coverage',
      'Grading Timeliness',
    ];

    const rows = filteredTeachers.map((teacher) => [
      teacher.name,
      teacher.subject,
      teacher.classes,
      teacher.students,
      `${teacher.score}%`,
      `${teacher.growth}%`,
      `${teacher.coverage}%`,
      `${teacher.timeliness}%`,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    );

    const link = document.createElement('a');
    link.href = url;
    link.download = 'teacher-performance.csv';
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <main className="tp-page">
      <header className="tp-heading">
        <div>
          <div className="tp-breadcrumb">
            <Link to="/principal/overview">Principal Dashboard</Link>
            <span>›</span>
            <span className="tp-current-crumb">Teacher Performance</span>
          </div>

          <h1>Teacher Performance</h1>

          <p>
            Track teacher effectiveness, class performance, and academic
            contributions.
          </p>
        </div>

        <div className="tp-campus-label">
          <span>♙</span>
          North Campus
        </div>
      </header>

      <section className="tp-filter-panel">
        <FilterSelect
          label="Academic Year"
          value={academicYear}
          options={['2025 – 2026', '2024 – 2025', '2023 – 2024']}
          onChange={setAcademicYear}
        />

        <FilterSelect
          label="Curriculum"
          value={curriculum}
          options={['CBSE', 'ICSE', 'State Board']}
          onChange={setCurriculum}
        />

        <FilterSelect
          label="Term / Period"
          value={term}
          options={['This Term', 'Term 1', 'Term 2', 'Term 3']}
          onChange={setTerm}
        />

        <FilterSelect
          label="Class"
          value={className}
          options={[
            'All Classes',
            'Class 6',
            'Class 7',
            'Class 8',
            'Class 9',
            'Class 10',
            'Class 11',
            'Class 12',
          ]}
          onChange={(value) => {
            setClassName(value);
            setPage(1);
          }}
        />

        <FilterSelect
          label="Section"
          value={section}
          options={[
            'All Sections',
            'Section A',
            'Section B',
            'Section C',
          ]}
          onChange={(value) => {
            setSection(value);
            setPage(1);
          }}
        />

        <FilterSelect
          label="Subject"
          value={subject}
          options={[
            'All Subjects',
            'Mathematics',
            'Science',
            'English',
            'Social Studies',
            'Computer Science',
          ]}
          onChange={(value) => {
            setSubject(value);
            setPage(1);
          }}
        />

        <button className="tp-refresh-button" onClick={refresh}>
          <RefreshCw size={15} />
          Refresh
        </button>
      </section>

      {/* Four academic performance metrics. No attendance metric. */}
      <section className="tp-metrics">
        <article className="tp-metric tp-metric-green">
          <Users />
          <div>
            <span>Total Teachers</span>
            <strong>58</strong>
          </div>
        </article>

        <article className="tp-metric tp-metric-yellow">
          <TrendingUp />
          <div>
            <span>Avg. Teacher Performance</span>
            <strong>
              86% <small>↑ +5% vs Last Term</small>
            </strong>
          </div>
        </article>

        <article className="tp-metric tp-metric-purple">
          <Trophy />
          <div>
            <span>High Performing (≥ 80%)</span>
            <strong>42 (72%)</strong>
          </div>
        </article>

        <article className="tp-metric tp-metric-pink">
          <AlertTriangle />
          <div>
            <span>Needs Support (&lt; 60%)</span>
            <strong>4 (7%)</strong>
          </div>
        </article>
      </section>

      <section className="tp-charts">
        <article className="tp-panel">
          <div className="tp-panel-heading">
            <TrendingUp />
            <div>
              <h2>Teacher Performance Trend</h2>
              <p>Average teacher performance across terms.</p>
            </div>
          </div>

          <TrendChart />
        </article>

        <article className="tp-panel">
          <div className="tp-panel-heading">
            <Users />
            <div>
              <h2>Teacher Performance Distribution</h2>
              <p>Teachers by performance range (this term).</p>
            </div>
          </div>

          <DistributionChart />
        </article>
      </section>

      <section className="tp-table-panel">
        <div className="tp-table-toolbar">
          <div className="tp-tabs">
            {categories.map((category) => (
              <button
                key={category}
                className={activeTab === category ? 'active' : ''}
                onClick={() => {
                  setActiveTab(category);
                  setPage(1);
                }}
              >
                {category} (
                {category === 'All Teachers'
                  ? 58
                  : category === 'High Performing'
                    ? 42
                    : category === 'Moderate'
                      ? 12
                      : 4}
                )
              </button>
            ))}
          </div>

          <div className="tp-table-actions">
            <label className="tp-search">
              <Search size={15} />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search teacher by name..."
              />
            </label>

            <button
              className="tp-export-button"
              onClick={exportTeachers}
            >
              <Download size={15} />
              Export
            </button>
          </div>
        </div>

        <div className="tp-table-scroll">
          <table className="tp-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Teacher Name</th>
                <th>Subjects</th>
                <th>Classes & Sections</th>
                <th>Students</th>
                <th>Avg. Score</th>
                <th>vs Last Term</th>
                <th>Assessment Coverage</th>
                <th>Grading Timeliness</th>
                <th>Performance</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {visibleTeachers.map((teacher, index) => (
                <tr key={teacher.id}>
                  <td>{(page - 1) * pageSize + index + 1}</td>

                  <td>
                    <div className="tp-teacher-name">
                      <span>{teacher.initials}</span>
                      <strong>{teacher.name}</strong>
                    </div>
                  </td>

                  <td>{teacher.subject}</td>
                  <td>{teacher.classes}</td>
                  <td>{teacher.students}</td>
                  <td>
                    <strong>{teacher.score}%</strong>
                  </td>

                  <td>
                    <span
                      className={`tp-growth ${
                        teacher.growth > 0
                          ? 'positive'
                          : teacher.growth < 0
                            ? 'negative'
                            : ''
                      }`}
                    >
                      {teacher.growth > 0
                        ? '↑'
                        : teacher.growth < 0
                          ? '↓'
                          : '→'}{' '}
                      {teacher.growth > 0 ? '+' : ''}
                      {teacher.growth}%
                    </span>
                  </td>

                  <td>{teacher.coverage}%</td>
                  <td>{teacher.timeliness}%</td>

                  <td>
                    <div className="tp-performance-track">
                      <span
                        className={
                          teacher.score >= 80
                            ? 'high'
                            : teacher.score >= 60
                              ? 'moderate'
                              : 'low'
                        }
                        style={{ width: `${teacher.score}%` }}
                      />
                    </div>
                  </td>

                  <td>
                    <button
                      className="tp-view-details"
                      onClick={() => setSelectedTeacher(teacher)}
                    >
                      View Details
                      <ArrowUpRight size={13} />
                    </button>
                  </td>
                </tr>
              ))}

              {visibleTeachers.length === 0 && (
                <tr>
                  <td colSpan={11} className="tp-empty">
                    No teachers match your search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="tp-pagination">
          <span>
            Showing{' '}
            {filteredTeachers.length
              ? (page - 1) * pageSize + 1
              : 0}{' '}
            – {Math.min(page * pageSize, filteredTeachers.length)} of{' '}
            {filteredTeachers.length} teachers
          </span>

          <div>
            <button
              disabled={page === 1}
              onClick={() => setPage((value) => value - 1)}
            >
              ‹
            </button>

            {Array.from(
              { length: totalPages },
              (_, index) => index + 1
            ).map((number) => (
              <button
                key={number}
                className={page === number ? 'active' : ''}
                onClick={() => setPage(number)}
              >
                {number}
              </button>
            ))}

            <button
              disabled={page === totalPages}
              onClick={() => setPage((value) => value + 1)}
            >
              ›
            </button>
          </div>
        </div>
      </section>

      {selectedTeacher && (
        <div
          className="tp-modal-backdrop"
          onClick={() => setSelectedTeacher(null)}
        >
          <section
            className="tp-teacher-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="tp-modal-close"
              onClick={() => setSelectedTeacher(null)}
              aria-label="Close"
            >
              <X size={19} />
            </button>

            <span className="tp-modal-avatar">
              {selectedTeacher.initials}
            </span>

            <h2>{selectedTeacher.name}</h2>
            <p>{selectedTeacher.subject}</p>

            <div className="tp-modal-stats">
              <div>
                <span>Average Score</span>
                <strong>{selectedTeacher.score}%</strong>
              </div>

              <div>
                <span>Students</span>
                <strong>{selectedTeacher.students}</strong>
              </div>

              <div>
                <span>Assessment Coverage</span>
                <strong>{selectedTeacher.coverage}%</strong>
              </div>

              <div>
                <span>Grading Timeliness</span>
                <strong>{selectedTeacher.timeliness}%</strong>
              </div>
            </div>

            <p className="tp-modal-classes">
              {selectedTeacher.classes}
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
