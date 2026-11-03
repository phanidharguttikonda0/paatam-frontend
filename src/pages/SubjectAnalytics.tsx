
import { useMemo, useState } from 'react';
import {
  Users,
  FileText,
  CheckCircle2,
  BarChart3,
  BookOpen,
  Settings,
  ChevronRight,
  ChevronDown,
  Search,
  Info,
  UserRound,
  ArrowRight,
} from 'lucide-react';
import CohortClustering, {
  type CohortStudent,
} from './CohortClustering';

type Props = {
  subject: string;
  students: CohortStudent[];
  onViewLearningGaps: () => void;
  onSelectStudent: (student: CohortStudent) => void;
  onViewAllStudents: () => void;
};

const assessmentTrend = [
  { label: 'Unit Test 1', score: 65 },
  { label: 'Unit Test 2', score: 72 },
  { label: 'Worksheet 1', score: 68 },
  { label: 'Worksheet 2', score: 60 },
  { label: 'Midterm', score: 78 },
];

const scoreRanges = [
  { label: '0 – 20%', count: 2, color: '#f87171' },
  { label: '21 – 40%', count: 6, color: '#fbad72' },
  { label: '41 – 60%', count: 12, color: '#ffd166' },
  { label: '61 – 80%', count: 14, color: '#319d96' },
  { label: '81 – 100%', count: 6, color: '#a8dfbd' },
];

const topics = [
  { name: 'Adding unlike fractions', count: 18, color: '#fa514d' },
  { name: 'Equivalent fractions', count: 12, color: '#ff9a32' },
  { name: 'Simplifying fractions', count: 10, color: '#ffc95b' },
  { name: 'Decimals', count: 8, color: '#3695fa' },
  { name: 'Algebra', count: 6, color: '#b276f5' },
];

const cohorts = [
  {
    name: 'Group 1 – Fractions Focus',
    count: 10,
    status: 'Needs Intensive Support',
    type: 'red',
  },
  {
    name: 'Group 2 – Decimals & Place Value',
    count: 8,
    status: 'Needs Targeted Practice',
    type: 'orange',
  },
  {
    name: 'Group 3 – Algebra Basics',
    count: 6,
    status: 'Needs Concept Reinforcement',
    type: 'blue',
  },
  {
    name: 'Group 4 – Strong in Mathematics',
    count: 16,
    status: 'Performing Well',
    type: 'green',
  },
];

function makeChartPoints(values: number[]) {
  const width = 560;
  const height = 150;
  const left = 24;
  const right = 18;
  const top = 18;
  const bottom = 12;

  const points = values.map((score, index) => ({
    x:
      left +
      (index / Math.max(values.length - 1, 1)) *
        (width - left - right),
    y: top + ((100 - score) / 100) * (height - top - bottom),
    score,
  }));

  return {
    points,
    line: points.map((point) => `${point.x},${point.y}`).join(' '),
    area: `${left},${height - bottom} ${points
      .map((point) => `${point.x},${point.y}`)
      .join(' ')} ${width - right},${height - bottom}`,
  };
}

export default function SubjectAnalytics({
  subject,
  students,
  onViewLearningGaps,
  onSelectStudent,
  onViewAllStudents,
}: Props) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCohortDetails, setShowCohortDetails] = useState(false);

  const pageSize = 5;

  const chart = useMemo(
    () => makeChartPoints(assessmentTrend.map((item) => item.score)),
    [],
  );

  const subjectStudents = useMemo(
    () =>
      students.filter((student) =>
        student.recentSubmissions?.some(
          (submission) => submission.subject === subject,
        ),
      ),
    [students, subject],
  );

  const visibleStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return subjectStudents.filter(
      (student) =>
        !query ||
        student.name?.toLowerCase().includes(query) ||
        student.rollNumber?.toLowerCase().includes(query) ||
        student.admissionNo?.toLowerCase().includes(query),
    );
  }, [subjectStudents, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(visibleStudents.length / pageSize),
  );

  const safePage = Math.min(page, totalPages);

  const pageStudents = visibleStudents.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const subjectScores = subjectStudents.map(
    (student) => student.avgPercentage,
  );

  const average = subjectScores.length
    ? Math.round(
        subjectScores.reduce((sum, score) => sum + score, 0) /
          subjectScores.length,
      )
    : 72;

  function toggleStudent(studentId: string) {
    setSelectedIds((previous) =>
      previous.includes(studentId)
        ? previous.filter((id) => id !== studentId)
        : [...previous, studentId],
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

  if (showCohortDetails) {
    return (
      <CohortClustering
        subject={subject}
        students={subjectStudents}
        onBack={() => setShowCohortDetails(false)}
      />
    );
  }

  return (
    <div className="subject-analytics">
      <section className="subject-kpis" aria-label="Subject key performance indicators">
        {/* Card 1: Total Students */}
        <article className="subject-kpi subject-kpi-green">
          <div className="subject-kpi-top">
            <div className="subject-kpi-icon">
              <Users size={18} />
            </div>
            <span className="subject-kpi-tag subject-kpi-tag-green">
              Enrollment
            </span>
          </div>

          <div className="subject-kpi-label subject-kpi-label-green">
            Total Students
          </div>

          <div className="subject-kpi-value subject-kpi-value-green">
            {subjectStudents.length || 40}
          </div>

          <div className="subject-kpi-caption subject-kpi-caption-green">
            Selected class and section
          </div>
        </article>

        {/* Card 2: Assessments Assigned */}
        <article className="subject-kpi subject-kpi-blue">
          <div className="subject-kpi-top">
            <div className="subject-kpi-icon">
              <FileText size={18} />
            </div>
            <span className="subject-kpi-tag subject-kpi-tag-blue">
              Assessments
            </span>
          </div>

          <div className="subject-kpi-label subject-kpi-label-blue">
            Assessments Assigned
          </div>

          <div className="subject-kpi-value subject-kpi-value-blue">
            6
          </div>

          <div className="subject-kpi-caption subject-kpi-caption-blue">
            {subject}
          </div>
        </article>

        {/* Card 3: Submitted Assessments */}
        <article className="subject-kpi subject-kpi-orange">
          <div className="subject-kpi-top">
            <div className="subject-kpi-icon">
              <CheckCircle2 size={18} />
            </div>
            <span className="subject-kpi-tag subject-kpi-tag-orange">
              Submissions
            </span>
          </div>

          <div className="subject-kpi-label subject-kpi-label-orange">
            Submitted Assessments
          </div>

          <div className="subject-kpi-value subject-kpi-value-orange">
            5 / 6
          </div>

          <div className="subject-submission-track">
            <i style={{ width: '83%' }} />
          </div>

          <div className="subject-kpi-caption subject-kpi-caption-orange">
            83% submitted
          </div>
        </article>

        {/* Card 4: Subject Average Score */}
        <article className="subject-kpi subject-kpi-purple">
          <div className="subject-kpi-top">
            <div className="subject-kpi-icon">
              <BarChart3 size={18} />
            </div>
            <span className="subject-kpi-tag subject-kpi-tag-purple">
              Performance
            </span>
          </div>

          <div className="subject-kpi-label subject-kpi-label-purple">
            Subject Average Score
          </div>

          <div className="subject-kpi-value subject-kpi-value-purple">
            {average}%
          </div>

          <div className="subject-kpi-caption subject-kpi-caption-purple">
            {subject}
          </div>
        </article>
      </section>

      <section className="subject-chart-grid">
        <article className="subject-panel">
          <div className="subject-panel-heading">
            <BookOpen size={27} />
            <div>
              <h2>Assessment-wise Average Score</h2>
              <p>
                Average score of students for each assessment in {subject}.
              </p>
            </div>
          </div>

          <div className="subject-line-chart">
            <div className="subject-chart-y-labels">
              <span>100%</span>
              <span>75%</span>
              <span>50%</span>
              <span>25%</span>
              <span>0%</span>
            </div>

            <svg
              viewBox="0 0 560 150"
              preserveAspectRatio="none"
              role="img"
              aria-label={`${subject} assessment score trend`}
            >
              <defs>
                <linearGradient
                  id="subjectChartFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="#38b98d"
                    stopOpacity=".38"
                  />
                  <stop
                    offset="100%"
                    stopColor="#38b98d"
                    stopOpacity=".08"
                  />
                </linearGradient>
              </defs>

              {[18, 48, 78, 108, 138].map((y) => (
                <line
                  key={y}
                  x1="24"
                  y1={y}
                  x2="542"
                  y2={y}
                  stroke="#e7edf2"
                />
              ))}

              <polygon
                points={chart.area}
                fill="url(#subjectChartFill)"
              />

              <polyline
                points={chart.line}
                fill="none"
                stroke="#087d72"
                strokeWidth="3"
                strokeLinejoin="round"
              />

              {chart.points.map((point, index) => (
                <g key={index}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="4.5"
                    fill="#087d72"
                    stroke="#fff"
                    strokeWidth="2"
                  />
                  <text
                    x={point.x}
                    y={point.y - 11}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="700"
                    fill="#075d56"
                  >
                    {point.score}%
                  </text>
                </g>
              ))}
            </svg>

            <div className="subject-chart-x-labels">
              {assessmentTrend.map((item) => (
                <span key={item.label}>{item.label}</span>
              ))}
            </div>
          </div>
        </article>

        <article className="subject-panel">
          <div className="subject-panel-heading">
            <BookOpen size={27} />
            <div>
              <h2>Score Distribution (Latest Assessment)</h2>
              <p>
                Distribution of student scores for the latest {subject} assessment.
              </p>
            </div>
          </div>

          <div className="subject-distribution-chart">
            <div className="subject-distribution-y">
              <span>20</span>
              <span>15</span>
              <span>10</span>
              <span>5</span>
              <span>0</span>
            </div>

            <div className="subject-bars">
              {scoreRanges.map((range) => (
                <div className="subject-bar-column" key={range.label}>
                  <strong>{range.count}</strong>
                  <div className="subject-bar-track">
                    <i
                      style={{
                        height: `${(range.count / 20) * 100}%`,
                        background: range.color,
                      }}
                    />
                  </div>
                  <span>{range.label}</span>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="subject-detail-grid">
        <article className="subject-panel">
          <div className="subject-panel-heading subject-heading-with-link">
            <Settings size={26} />
            <div>
              <h2>Topic-wise Learning Gaps ({subject})</h2>
              <p>Number of students struggling in each topic.</p>
            </div>
            <button type="button" onClick={onViewLearningGaps}>
              View all topics <ArrowRight size={15} />
            </button>
          </div>

          <div className="subject-topic-list">
            {topics.map((topic, index) => (
              <div className="subject-topic-row" key={topic.name}>
                <span
                  className="subject-topic-rank"
                  style={{
                    color: topic.color,
                    background: `${topic.color}20`,
                  }}
                >
                  {index + 1}
                </span>

                <span className="subject-topic-name">{topic.name}</span>

                <div className="subject-topic-track">
                  <i
                    style={{
                      width: `${(topic.count / 18) * 100}%`,
                      background: topic.color,
                    }}
                  />
                </div>

                <strong>{topic.count} students</strong>
                <ChevronRight size={16} />
              </div>
            ))}
          </div>
        </article>

        <article className="subject-panel">
          <div className="subject-panel-heading subject-heading-with-link">
            <Users size={27} />
            <div>
              <h2>Cohort Clustering ({subject})</h2>
              <p>
                Students grouped based on performance and learning needs.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCohortDetails(true)}
            >
              View details <ArrowRight size={15} />
            </button>
          </div>

          <div className="subject-cohort-list">
            {cohorts.map((cohort) => (
              <div className="subject-cohort-row" key={cohort.name}>
                <span
                  className={`subject-cohort-icon subject-cohort-${cohort.type}`}
                >
                  <UserRound size={19} />
                </span>
                <div>
                  <strong>{cohort.name}</strong>
                  <small>{cohort.count} students</small>
                </div>
                <span
                  className={`subject-cohort-status subject-status-${cohort.type}`}
                >
                  {cohort.status}
                </span>
                <ChevronRight size={16} />
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="subject-panel subject-student-panel">
        <div
          className="subject-student-heading"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div className="subject-panel-heading" style={{ margin: 0 }}>
            <UserRound size={28} />
            <div>
              <h2>Students in Class 8 - Section A</h2>
              <p>
                List of all students with their performance and latest assessment status.
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <button
              type="button"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#0f766e',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
              onClick={onViewAllStudents}
            >
              View all students <ArrowRight size={15} />
            </button>

            <label
              className="subject-student-search"
              style={{ margin: 0 }}
            >
              <Search size={16} />
              <input
                value={search}
                placeholder="Search by student name, roll no. or admission no..."
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </label>
          </div>
        </div>

        <div
          className="subject-table-wrap"
          style={{ marginTop: '16px' }}
        >
          <table className="subject-student-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
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
                <th>Overall Score</th>
                <th>Latest Assessment</th>
                <th>Last Score</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {pageStudents.map((student, index) => {
                const submission =
                  student.recentSubmissions?.find(
                    (item) => item.subject === subject,
                  ) || student.recentSubmissions?.[0];

                const lastScore = submission
                  ? Math.round(
                      (submission.score /
                        Math.max(submission.maxScore, 1)) *
                        100,
                    )
                  : null;

                const score = Math.round(student.avgPercentage || 0);

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
                    <td>
                      <strong
                        style={{
                          cursor: 'pointer',
                          color: '#0f766e',
                        }}
                        onClick={() => onSelectStudent(student)}
                      >
                        {student.name}
                      </strong>
                    </td>
                    <td>{student.rollNumber || '—'}</td>
                    <td>{student.admissionNo || '—'}</td>
                    <td>
                      <span
                        className={`subject-score-pill ${
                          score >= 70
                            ? 'good'
                            : score >= 40
                              ? 'medium'
                              : 'low'
                        }`}
                      >
                        {score}%
                      </span>
                    </td>
                    <td>
                      {submission
                        ? `${submission.subject} Test`
                        : 'No assessment'}
                    </td>
                    <td>
                      {lastScore === null ? '—' : `${lastScore}%`}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => onSelectStudent(student)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 12px',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#0f766e',
                          cursor: 'pointer',
                        }}
                      >
                        View <ChevronDown size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {pageStudents.length === 0 && (
          <div className="subject-empty-state">
            <Info size={20} />
            <span>
              No student records are available for {subject} yet.
            </span>
          </div>
        )}

        <div className="subject-table-footer">
          <span>
            Showing{' '}
            {visibleStudents.length
              ? (safePage - 1) * pageSize + 1
              : 0}
            {' - '}
            {Math.min(safePage * pageSize, visibleStudents.length)}
            {' of '}
            {visibleStudents.length} students
          </span>

          <div className="subject-pagination">
            <button
              disabled={safePage <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              ‹
            </button>

            {Array.from({ length: totalPages }, (_, index) => index + 1)
              .slice(0, 5)
              .map((number) => (
                <button
                  key={number}
                  className={safePage === number ? 'active' : ''}
                  onClick={() => setPage(number)}
                >
                  {number}
                </button>
              ))}

            <button
              disabled={safePage >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              ›
            </button>
          </div>
        </div>
      </section>

      <p className="subject-data-note">
        <Info size={14} />
        Charts, score distribution, topic gaps, and cohort summaries
        still use illustrative UI data until connected to live analytics.
      </p>
    </div>
  );
}
