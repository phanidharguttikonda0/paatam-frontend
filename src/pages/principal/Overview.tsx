import { useState } from 'react';
import {
  School,
  Users,
  GraduationCap,
  BookOpen,
  Trophy,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  ArrowUpRight,
  UserRound,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import './Overview.css';
import { useNavigate } from 'react-router-dom';

const subjects = [
  { name: 'Mathematics', score: 72, color: '#35d58a' },
  { name: 'Science', score: 68, color: '#51a9ed' },
  { name: 'English', score: 70, color: '#f5ca50' },
  { name: 'Social Studies', score: 64, color: '#f4a33f' },
  { name: 'Computer Science', score: 62, color: '#ed6262' },
];

const classes = [
  { name: 'Class 6', score: 76 },
  { name: 'Class 7', score: 72 },
  { name: 'Class 8', score: 68 },
  { name: 'Class 9', score: 64 },
  { name: 'Class 10', score: 62 },
  { name: 'Class 11', score: 58 },
  { name: 'Class 12', score: 60 },
];

const terms = [
  { name: 'Term 1', score: 62 },
  { name: 'Term 2', score: 65 },
  { name: 'Term 3', score: 67 },
  { name: 'This Term', score: 68 },
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
    <label className="campus-filter">
      <span>{label}</span>
      <div className="campus-filter-control">
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown size={15} />
      </div>
    </label>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  color,
  background,
  extra,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
  background: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="campus-metric-card">
      <div className="campus-metric-icon" style={{ color, background }}>
        <Icon size={29} strokeWidth={1.9} />
      </div>
      <div className="campus-metric-content">
        <span className="campus-metric-title">{title}</span>
        <strong>{value}</strong>
        {extra}
      </div>
    </div>
  );
}

function AcademicTrendChart() {
  const points = [62, 65, 67, 68];
  const xPositions = [70, 185, 300, 415];

  // Map 50%-100% into the visible SVG plotting area
  const yPosition = (value: number) => 160 - (value - 50) * 2.7;

  const coordinates = points
    .map((point, index) => `${xPositions[index]},${yPosition(point)}`)
    .join(' ');

  const areaPoints = [
    `${xPositions[0]},160`,
    ...coordinates.split(' '),
    `${xPositions[xPositions.length - 1]},160`,
  ].join(' ');

  return (
    <svg
      className="campus-chart-svg"
      viewBox="0 0 470 205"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Academic performance trend across four terms"
    >
      <defs>
        <linearGradient id="academicGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c58b" stopOpacity=".28" />
          <stop offset="100%" stopColor="#22c58b" stopOpacity=".02" />
        </linearGradient>
      </defs>

      {[50, 60, 70, 80, 90, 100].map((value) => {
        const y = yPosition(value);

        return (
          <g key={value}>
            <text x="5" y={y + 4} className="campus-axis-label">
              {value}%
            </text>
            <line
              x1="48"
              y1={y}
              x2="455"
              y2={y}
              className="campus-grid-line"
            />
          </g>
        );
      })}

      <polygon points={areaPoints} fill="url(#academicGradient)" />

      <polyline
        points={coordinates}
        className="campus-trend-line"
      />

      {points.map((point, index) => (
        <g key={terms[index].name}>
          <circle
            cx={xPositions[index]}
            cy={yPosition(point)}
            r="5"
            className="campus-trend-point"
          />

          <text
            x={xPositions[index]}
            y={yPosition(point) - 12}
            textAnchor="middle"
            className="campus-chart-value"
          >
            {point}%
          </text>

          <text
            x={xPositions[index]}
            y="187"
            textAnchor="middle"
            className="campus-axis-label campus-x-label"
          >
            {terms[index].name}
          </text>
        </g>
      ))}
    </svg>
  );
}

function SubjectChart() {
  return (
    <div className="campus-subject-chart">
      <div className="campus-chart-y-axis">
        {[100, 90, 80, 70, 60, 50].map((value) => (
          <span key={value}>{value}%</span>
        ))}
      </div>
      <div className="campus-subject-bars">
        {subjects.map((subject) => (
          <div className="campus-subject-bar-column" key={subject.name}>
            <strong>{subject.score}%</strong>
            <div className="campus-subject-bar-track">
              <div
                className="campus-subject-bar"
                style={{
                  height: `${(subject.score - 50) * 2}%`,
                  background: subject.color,
                }}
              />
            </div>
            <span>{subject.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClassChart() {
  return (
    <div className="campus-class-chart">
      <div className="campus-class-y-axis">
        {[100, 90, 80, 70, 60, 50].map((value) => (
          <span key={value}>{value}%</span>
        ))}
      </div>
      <div className="campus-class-bars">
        {classes.map((item) => (
          <div className="campus-class-bar-column" key={item.name}>
            <strong>{item.score}%</strong>
            <div className="campus-class-bar-track">
              <div
                className="campus-class-bar"
                style={{ height: `${(item.score - 50) * 2}%` }}
              />
            </div>
            <span>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeacherPerformance() {
  return (
    <div className="campus-teacher-performance">
      <div className="campus-donut-wrap">
        <div className="campus-donut">
          <div className="campus-donut-center">
            <strong>86%</strong>
            <span>Teacher<br />Performance</span>
          </div>
        </div>
      </div>

      <div className="campus-teacher-legend">
        <div>
          <Trophy size={17} color="#22b66e" />
          <span>High Performing (≥ 80%)</span>
          <strong>42 (72%)</strong>
        </div>
        <div>
          <CheckCircle2 size={17} color="#e6a52d" />
          <span>Moderate (60% – 79%)</span>
          <strong>12 (21%)</strong>
        </div>
        <div>
          <AlertTriangle size={17} color="#ed6262" />
          <span>Needs Support (&lt; 60%)</span>
          <strong>4 (7%)</strong>
        </div>
      </div>
    </div>
  );
}

export default function CampusOverview() {
  const navigate = useNavigate();
  const [academicYear, setAcademicYear] = useState('2025 – 2026');
  const [curriculum, setCurriculum] = useState('CBSE');
  const [term, setTerm] = useState('This Term');
  const [className, setClassName] = useState('All Classes');
  const [section, setSection] = useState('All Sections');

  const handleRefresh = () => {
    // Refresh action will be connected to the campus analytics API.
    setAcademicYear((current) => current);
  };

  return (
    <main className="campus-overview-page">
      <div className="campus-page-heading">
        <div>
          <span className="campus-breadcrumb">Principal Dashboard</span>
          <h1>Campus Overview</h1>
          <p>Academic performance and key insights for your campus.</p>
        </div>

        <div className="campus-selector">
          <School size={23} />
          <span>North Campus</span>
        </div>
      </div>

      <section className="campus-filter-panel">
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
          options={['All Classes', ...classes.map((item) => item.name)]}
          onChange={setClassName}
        />
        <FilterSelect
          label="Section"
          value={section}
          options={['All Sections', 'Section A', 'Section B', 'Section C']}
          onChange={setSection}
        />
        <button className="campus-refresh-button" onClick={handleRefresh}>
          <RefreshCw size={15} />
          Refresh
        </button>
      </section>

      <section className="campus-metrics-grid">
        <MetricCard
          title="Students"
          value="820"
          icon={Users}
          color="#20b96c"
          background="#e8faef"
        />
        <MetricCard
          title="Teachers"
          value="58"
          icon={UserRound}
          color="#933be0"
          background="#f2e9ff"
        />
        <MetricCard
          title="Classes"
          value="24"
          icon={GraduationCap}
          color="#2778d7"
          background="#e8f3ff"
        />
        <MetricCard
          title="Sections"
          value="72"
          icon={BookOpen}
          color="#e99b25"
          background="#fff4df"
        />
        <MetricCard
          title="Campus Avg. Score"
          value="68%"
          icon={Trophy}
          color="#df55a4"
          background="#fceafa"
          extra={
            <span className="campus-growth">
              <ArrowUpRight size={13} /> +6% vs Last Term
            </span>
          }
        />
      </section>

      <section className="campus-charts-grid">
        <article className="campus-panel campus-large-panel">
          <div className="campus-panel-heading">
            <TrendingUp size={27} color="#15976b" />
            <div>
              <h2>Academic Performance Trend</h2>
              <p>Average score across all classes (campus).</p>
            </div>
          </div>
          <AcademicTrendChart />
        </article>

        <article className="campus-panel campus-large-panel">
          <div className="campus-panel-heading">
            <BookOpen size={27} color="#15976b" />
            <div>
              <h2>Subject Performance (Campus Average)</h2>
              <p>Average score by subject for this term.</p>
            </div>
          </div>
          <SubjectChart />
        </article>
      </section>

      <section className="campus-bottom-grid">
        <article className="campus-panel campus-bottom-panel">
          <div className="campus-panel-heading">
            <GraduationCap size={27} color="#15976b" />
            <div>
              <h2>Class Performance</h2>
              <p>Average score by class (all sections).</p>
            </div>
          </div>
          <button
            className="campus-view-button"
            onClick={() => navigate('/principal/classes')}
           >
            View Details <ArrowUpRight size={14} />
          </button>
          <ClassChart />
        </article>

        <article className="campus-panel campus-bottom-panel">
          <div className="campus-panel-heading">
            <Users size={26} color="#15976b" />
            <div>
              <h2>Teacher Performance</h2>
              <p>Overall teacher effectiveness in this term.</p>
            </div>
          </div>
          <button
            className="campus-view-button"
            onClick={() => navigate('/principal/teachers')}
          >
            View All Teachers <ArrowUpRight size={14} />
          </button>
          <TeacherPerformance />
        </article>

        <article className="campus-panel campus-bottom-panel campus-attention-panel">
          <div className="campus-panel-heading">
            <AlertTriangle size={27} color="#ed6262" />
            <div>
              <h2>Needs Attention</h2>
              <p>Areas that may require your review.</p>
            </div>
          </div>

          <div className="campus-attention-list">
            <button>
              <Users size={17} />
              <span>3 Classes below 60% average</span>
              <ChevronDown size={16} />
            </button>
            <button>
              <TrendingUp size={17} />
              <span>4 Subjects with declining performance</span>
              <ChevronDown size={16} />
            </button>
            <button>
              <UserRound size={17} />
              <span>6 Teachers need academic support</span>
              <ChevronDown size={16} />
            </button>
          </div>
        </article>
      </section>
    </main>
  );
}