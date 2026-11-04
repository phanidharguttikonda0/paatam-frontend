
import { useMemo, useState } from 'react';
import {
  School,
  BookOpen,
  Users,
  GraduationCap,
  Trophy,
  AlertTriangle,
  RefreshCw,
  Search,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react';
import './ClassesSections.css';
import { Link } from 'react-router-dom';

type SectionRecord = {
  id: number;
  className: string;
  section: string;
  students: number;
  score: number;
  change: number;
  high: number;
  moderate: number;
  support: number;
  risk: number;
};

const records: SectionRecord[] = [
  { id: 1, className: 'Class 6', section: 'A', students: 40, score: 78, change: 6, high: 18, moderate: 16, support: 4, risk: 2 },
  { id: 2, className: 'Class 6', section: 'B', students: 38, score: 74, change: 5, high: 16, moderate: 14, support: 5, risk: 3 },
  { id: 3, className: 'Class 7', section: 'A', students: 40, score: 72, change: 4, high: 14, moderate: 18, support: 5, risk: 3 },
  { id: 4, className: 'Class 7', section: 'B', students: 42, score: 72, change: 6, high: 15, moderate: 19, support: 6, risk: 2 },
  { id: 5, className: 'Class 8', section: 'A', students: 41, score: 68, change: 3, high: 12, moderate: 18, support: 7, risk: 4 },
  { id: 6, className: 'Class 9', section: 'A', students: 40, score: 64, change: 0, high: 10, moderate: 17, support: 8, risk: 5 },
  { id: 7, className: 'Class 10', section: 'A', students: 41, score: 62, change: -3, high: 9, moderate: 17, support: 9, risk: 6 },
  { id: 8, className: 'Class 11', section: 'A', students: 39, score: 58, change: -4, high: 8, moderate: 15, support: 9, risk: 7 },
  { id: 9, className: 'Class 12', section: 'A', students: 40, score: 60, change: 2, high: 9, moderate: 17, support: 8, risk: 6 },
  { id: 10, className: 'Class 8', section: 'B', students: 39, score: 69, change: 2, high: 13, moderate: 17, support: 6, risk: 3 },
  { id: 11, className: 'Class 9', section: 'B', students: 40, score: 65, change: 1, high: 11, moderate: 17, support: 8, risk: 4 },
  { id: 12, className: 'Class 10', section: 'B', students: 40, score: 63, change: -1, high: 10, moderate: 16, support: 8, risk: 6 },
];

const classPerformance = [
  { name: 'Class 6', score: 76 },
  { name: 'Class 7', score: 72 },
  { name: 'Class 8', score: 68 },
  { name: 'Class 9', score: 64 },
  { name: 'Class 10', score: 62 },
  { name: 'Class 11', score: 58 },
  { name: 'Class 12', score: 60 },
];

const classNames = classPerformance.map((item) => item.name);

function Filter({
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
    <label className="cs-filter">
      <span>{label}</span>
      <div className="cs-filter-control">
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <ChevronDown size={15} />
      </div>
    </label>
  );
}

function Metric({
  title,
  value,
  icon: Icon,
  color,
  background,
  note,
}: {
  title: string;
  value: string;
  icon: typeof School;
  color: string;
  background: string;
  note?: string;
}) {
  return (
    <article className="cs-metric">
      <div className="cs-metric-icon" style={{ color, background }}>
        <Icon size={27} strokeWidth={1.9} />
      </div>
      <div className="cs-metric-info">
        <span>{title}</span>
        <strong>{value}</strong>
        {note && <small>{note}</small>}
      </div>
    </article>
  );
}

function ClassComparisonChart() {
  return (
    <div className="cs-comparison-chart">
      <div className="cs-chart-y-axis">
        {[100, 90, 80, 70, 60, 50].map((value) => (
          <span key={value}>{value}%</span>
        ))}
      </div>
      <div className="cs-comparison-plot">
        {classPerformance.map((item) => (
          <div className="cs-comparison-column" key={item.name}>
            <strong>{item.score}%</strong>
            <div className="cs-comparison-track">
              <div
                className={`cs-comparison-bar ${item.score < 60 ? 'low' : ''}`}
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

function DistributionChart() {
  return (
    <div className="cs-distribution">
      <div className="cs-donut">
        <div className="cs-donut-center">
          <strong>820</strong>
          <span>Students</span>
        </div>
      </div>
      <div className="cs-distribution-legend">
        <div><i className="high" /><span>≥ 80% (High Performing)</span><strong>320 (39%)</strong></div>
        <div><i className="moderate" /><span>60% – 79% (Moderate)</span><strong>340 (41%)</strong></div>
        <div><i className="support" /><span>50% – 59% (Needs Support)</span><strong>110 (13%)</strong></div>
        <div><i className="risk" /><span>Below 50% (At Risk)</span><strong>50 (6%)</strong></div>
      </div>
    </div>
  );
}

export default function ClassesSections() {
  const [academicYear, setAcademicYear] = useState('2025 – 2026');
  const [curriculum, setCurriculum] = useState('CBSE');
  const [term, setTerm] = useState('This Term');
  const [selectedClass, setSelectedClass] = useState('All Classes');
  const [selectedSection, setSelectedSection] = useState('All Sections');
  const [activeTab, setActiveTab] = useState<'section' | 'class'>('section');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const pageSize = 8;

  const filteredRecords = useMemo(() => {
    let result = [...records];

    if (selectedClass !== 'All Classes') {
      result = result.filter((row) => row.className === selectedClass);
    }

    if (selectedSection !== 'All Sections') {
      result = result.filter((row) => row.section === selectedSection);
    }

    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (row) =>
          row.className.toLowerCase().includes(query) ||
          row.section.toLowerCase().includes(query)
      );
    }

    if (activeTab === 'class') {
      const grouped = new Map<string, SectionRecord[]>();
      result.forEach((row) => {
        const current = grouped.get(row.className) || [];
        current.push(row);
        grouped.set(row.className, current);
      });

      return Array.from(grouped.entries()).map(([name, rows], index) => {
        const totalStudents = rows.reduce((sum, row) => sum + row.students, 0);
        const average = Math.round(
          rows.reduce((sum, row) => sum + row.score * row.students, 0) /
            Math.max(totalStudents, 1)
        );

        return {
          id: index + 1,
          className: name,
          section: 'All',
          students: totalStudents,
          score: average,
          change: Math.round(rows.reduce((sum, row) => sum + row.change, 0) / rows.length),
          high: rows.reduce((sum, row) => sum + row.high, 0),
          moderate: rows.reduce((sum, row) => sum + row.moderate, 0),
          support: rows.reduce((sum, row) => sum + row.support, 0),
          risk: rows.reduce((sum, row) => sum + row.risk, 0),
        };
      });
    }

    return result;
  }, [selectedClass, selectedSection, search, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleRecords = filteredRecords.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleExport = () => {
    const headers = [
      'Class',
      'Section',
      'Students',
      'Average Score',
      'Change vs Last Term',
      'High',
      'Moderate',
      'Needs Support',
      'At Risk',
    ];

    const rows = filteredRecords.map((row) => [
      row.className,
      row.section,
      row.students,
      `${row.score}%`,
      `${row.change}%`,
      row.high,
      row.moderate,
      row.support,
      row.risk,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'classes-sections-performance.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const refresh = () => {
    setSearch('');
    setPage(1);
  };

  return (
    <main className="cs-page">
      <header className="cs-heading">
        <div>
          <div className="classes-page-breadcrumb">
            <Link to="/principal/overview">
                Principal Dashboard
            </Link>

            <span className="breadcrumb-separator">›</span>

            <span className="breadcrumb-current">
                Classes & Sections
            </span>
            </div>
          <h1>Classes &amp; Sections Performance</h1>
          <p>Performance analysis across all classes and sections in North Campus.</p>
        </div>
        <div className="cs-campus-badge">
          <School size={22} />
          <strong>North Campus</strong>
        </div>
      </header>

      <section className="cs-filter-panel">
        <Filter label="Academic Year" value={academicYear} options={['2025 – 2026', '2024 – 2025', '2023 – 2024']} onChange={setAcademicYear} />
        <Filter label="Curriculum" value={curriculum} options={['CBSE', 'ICSE', 'State Board']} onChange={setCurriculum} />
        <Filter label="Term / Period" value={term} options={['This Term', 'Term 1', 'Term 2', 'Term 3']} onChange={setTerm} />
        <Filter label="Class" value={selectedClass} options={['All Classes', ...classNames]} onChange={(value) => { setSelectedClass(value); setPage(1); }} />
        <Filter label="Section" value={selectedSection} options={['All Sections', 'A', 'B', 'C']} onChange={(value) => { setSelectedSection(value); setPage(1); }} />
        <button className="cs-refresh-button" onClick={refresh}>
          <RefreshCw size={15} /> Refresh
        </button>
      </section>

      <section className="cs-metrics-grid">
        <Metric title="Total Classes" value="24" icon={GraduationCap} color="#20b96c" background="#e8faef" />
        <Metric title="Total Sections" value="72" icon={BookOpen} color="#963ce0" background="#f3eaff" />
        <Metric title="Total Students" value="820" icon={Users} color="#2778d7" background="#e8f3ff" />
        <Metric title="Campus Avg. Score" value="68%" icon={Trophy} color="#e99b25" background="#fff4df" note="↑ +6% vs Last Term" />
        <Metric title="Top Performing Class" value="Class 6 (76%)" icon={TrendingUp} color="#933be0" background="#f4eaff" />
        <Metric title="Classes < 60%" value="3" icon={AlertTriangle} color="#ed6262" background="#fff0f2" />
      </section>

      <section className="cs-charts-grid">
        <article className="cs-panel">
          <div className="cs-panel-heading">
            <TrendingUp size={27} color="#15976b" />
            <div>
              <h2>Class Performance Comparison</h2>
              <p>Average score by class (all sections).</p>
            </div>
          </div>
          <ClassComparisonChart />
        </article>

        <article className="cs-panel">
          <div className="cs-panel-heading">
            <GraduationCap size={27} color="#15976b" />
            <div>
              <h2>Performance Distribution (All Students)</h2>
              <p>Students by score range in this term.</p>
            </div>
          </div>
          <DistributionChart />
        </article>
      </section>

      <section className="cs-table-panel">
        <div className="cs-table-toolbar">
          <div className="cs-tabs">
            <button className={activeTab === 'section' ? 'active' : ''} onClick={() => { setActiveTab('section'); setPage(1); }}>
              By Class &amp; Section
            </button>
            <button className={activeTab === 'class' ? 'active' : ''} onClick={() => { setActiveTab('class'); setPage(1); }}>
              By Class (Overall)
            </button>
          </div>

          <div className="cs-table-actions">
            <label className="cs-search">
              <Search size={15} />
              <input
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                placeholder="Search class or section..."
              />
            </label>
            <button className="cs-export-button" onClick={handleExport}>
              <Download size={15} /> Export
            </button>
          </div>
        </div>

        <div className="cs-table-scroll">
          <table className="cs-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Class</th>
                <th>Section</th>
                <th>Students</th>
                <th>Avg. Score</th>
                <th>vs Last Term</th>
                <th>High (≥80%)</th>
                <th>Moderate (60–79%)</th>
                <th>Needs Support (50–59%)</th>
                <th>At Risk (&lt;50%)</th>
                <th>Performance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRecords.map((row, index) => (
                <tr key={row.id}>
                  <td>{(currentPage - 1) * pageSize + index + 1}</td>
                  <td><strong>{row.className}</strong></td>
                  <td>{row.section}</td>
                  <td>{row.students}</td>
                  <td><strong>{row.score}%</strong></td>
                  <td>
                    <span className={`cs-change ${row.change > 0 ? 'positive' : row.change < 0 ? 'negative' : ''}`}>
                      {row.change > 0 ? '↑' : row.change < 0 ? '↓' : '→'} {row.change > 0 ? '+' : ''}{row.change}%
                    </span>
                  </td>
                  <td>{row.high} ({Math.round((row.high / row.students) * 100)}%)</td>
                  <td>{row.moderate} ({Math.round((row.moderate / row.students) * 100)}%)</td>
                  <td>{row.support} ({Math.round((row.support / row.students) * 100)}%)</td>
                  <td>{row.risk} ({Math.round((row.risk / row.students) * 100)}%)</td>
                  <td>
                    <div className="cs-performance-track">
                      <div
                        className={row.score < 60 ? 'low' : row.score < 65 ? 'medium' : ''}
                        style={{ width: `${row.score}%` }}
                      />
                    </div>
                  </td>
                  <td>
                    <button className="cs-row-action" onClick={() => setSelectedClass(row.className)}>
                      View Details <ArrowUpRight size={13} />
                    </button>
                  </td>
                </tr>
              ))}
              {visibleRecords.length === 0 && (
                <tr><td colSpan={12} className="cs-empty">No matching class or section found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="cs-table-footer">
          <span>
            Showing {filteredRecords.length ? (currentPage - 1) * pageSize + 1 : 0} – {Math.min(currentPage * pageSize, filteredRecords.length)} of {filteredRecords.length} records
          </span>
          <div className="cs-pagination">
            <button disabled={currentPage === 1} onClick={() => setPage((value) => value - 1)} aria-label="Previous page">
              <ChevronLeft size={17} />
            </button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
              <button key={number} className={currentPage === number ? 'active' : ''} onClick={() => setPage(number)}>
                {number}
              </button>
            ))}
            <button disabled={currentPage === totalPages} onClick={() => setPage((value) => value + 1)} aria-label="Next page">
              <ChevronRight size={17} />
            </button>
          </div>
        </footer>
      </section>
    </main>
  );
}
