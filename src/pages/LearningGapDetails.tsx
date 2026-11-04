import { useState } from 'react';
import {
  Users,
  BarChart3,
  BookOpen,
  ChevronRight,
  ChevronDown,
  Search,
  Info,
  UserRound,
  AlertTriangle,
  Star,
} from 'lucide-react';

type Props = {
  subject: string;
  onBack: () => void;
};

export default function LearningGapDetails({ subject, onBack }: Props) {
  const [academicYear, setAcademicYear] = useState('2025–2026');
  const [selectedClass, setSelectedClass] = useState('Class 8');
  const [selectedSection, setSelectedSection] = useState('Section A');
  const [selectedAssessment, setSelectedAssessment] = useState('Midterm (20 Sep 2025)');
  const [scoreRangeFilter, setScoreRangeFilter] = useState('Below 40% (0 – 40%)');
  const [searchQuery, setSearchQuery] = useState('');

  const topicsData = [
    { id: 1, chapter: 'Rational Numbers', avgScore: '45%', belowCount: '5 students', coverage: '80%', coverageWidth: '80%', scoreColor: '#fa514d', barColor: '#22c55e' },
    { id: 2, chapter: 'Algebraic Expressions', avgScore: '32%', belowCount: '7 students', coverage: '50%', coverageWidth: '50%', scoreColor: '#fa514d', barColor: '#f59e0b' },
    { id: 3, chapter: 'Linear Equations', avgScore: '38%', belowCount: '6 students', coverage: '40%', coverageWidth: '40%', scoreColor: '#fa514d', barColor: '#ef4444' },
    { id: 4, chapter: 'Understanding Quadrilaterals', avgScore: '58%', belowCount: '3 students', coverage: '75%', coverageWidth: '75%', scoreColor: '#319d96', barColor: '#22c55e' },
    { id: 5, chapter: 'Data Handling', avgScore: '62%', belowCount: '2 students', coverage: '25%', coverageWidth: '25%', scoreColor: '#319d96', barColor: '#ef4444' },
  ];

  const topicSupportData = [
    { id: 1, topic: 'Algebraic Expressions', count: '7 students' },
    { id: 2, topic: 'Linear Equations', count: '6 students' },
    { id: 3, topic: 'Rational Numbers', count: '5 students' },
    { id: 4, topic: 'Understanding Quadrilaterals', count: '3 students' },
    { id: 5, topic: 'Data Handling', count: '2 students' },
  ];

  const lowPerformanceStudents = [
    { id: '1', name: 'Aarav S.', rollNumber: '001', admissionNo: 'ADM001', score: '18%', range: '0 – 20%', rangeColor: '#f87171', weakTopics: 'Algebraic Expressions, Linear Equations' },
    { id: '2', name: 'Meera K.', rollNumber: '002', admissionNo: 'ADM002', score: '22%', range: '21 – 40%', rangeColor: '#fbad72', weakTopics: 'Rational numbers, Data handling' },
    { id: '3', name: 'Rohan P.', rollNumber: '003', admissionNo: 'ADM003', score: '28%', range: '21 – 40%', rangeColor: '#fbad72', weakTopics: 'Linear equations, Quadrilaterals' },
    { id: '4', name: 'Neha T.', rollNumber: '006', admissionNo: 'ADM006', score: '32%', range: '21 – 40%', rangeColor: '#fbad72', weakTopics: 'Algebraic expressions' },
    { id: '5', name: 'Vikram J.', rollNumber: '008', admissionNo: 'ADM008', score: '35%', range: '21 – 40%', rangeColor: '#fbad72', weakTopics: 'Data handling, Rational numbers' },
    { id: '6', name: 'Pooja R.', rollNumber: '010', admissionNo: 'ADM010', score: '38%', range: '21 – 40%', rangeColor: '#fbad72', weakTopics: 'Linear equations' },
    { id: '7', name: 'Karan M.', rollNumber: '011', admissionNo: 'ADM011', score: '20%', range: '21 – 40%', rangeColor: '#fbad72', weakTopics: 'Algebraic expressions, Quadrilaterals' },
    { id: '8', name: 'Divya L.', rollNumber: '015', admissionNo: 'ADM015', score: '12%', range: '0 – 20%', rangeColor: '#f87171', weakTopics: 'Rational numbers, Linear equations' },
  ];

  const filteredStudents = lowPerformanceStudents.filter(s =>
    !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.admissionNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="subject-analytics learning-gap-page">
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
        <span
          onClick={onBack}
          style={{ cursor: 'pointer', color: '#0f766e', fontWeight: 500 }}
        >
          Student Analytics
        </span>
        <ChevronRight size={14} />
        <span
          onClick={onBack}
          style={{ cursor: 'pointer', color: '#0f766e', fontWeight: 500 }}
        >
          Subject-wise Analytics
        </span>
        <ChevronRight size={14} />
        <span style={{ color: '#0f172a', fontWeight: 600 }}>Learning Gap Details</span>
      </div>

      {/* Header Container holding Title and Filters nearby with flex-wrap and gap */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px', marginBottom: '20px' }}>
        <div style={{ flexShrink: 0 }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Learning Gap Details</h1>
          <p style={{ color: '#475569', fontSize: '13px', margin: '4px 0 0 0' }}>
            {subject} - Class 8, Section A | Midterm (20 Sep 2025)
          </p>
        </div>

        {/* Filters Group placed nearby */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginLeft: 'auto' }}>
          <label className="analytics-filter" style={{ margin: 0 }}>
            <span>Academic Year</span>
            <div className="analytics-select-wrap">
              <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
                <option>2025–2026</option>
                <option>2026–2027</option>
              </select>
              <ChevronDown size={15} />
            </div>
          </label>

          <label className="analytics-filter" style={{ margin: 0 }}>
            <span>Class</span>
            <div className="analytics-select-wrap">
              <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                <option>Class 8</option>
                <option>Class 9</option>
              </select>
              <ChevronDown size={15} />
            </div>
          </label>

          <label className="analytics-filter" style={{ margin: 0 }}>
            <span>Section</span>
            <div className="analytics-select-wrap">
              <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)}>
                <option>Section A</option>
                <option>Section B</option>
              </select>
              <ChevronDown size={15} />
            </div>
          </label>

          <label className="analytics-filter" style={{ margin: 0 }}>
            <span>Subject</span>
            <div className="analytics-select-wrap">
              <select value={subject} disabled>
                <option>{subject}</option>
              </select>
              <ChevronDown size={15} />
            </div>
          </label>

          <label className="analytics-filter" style={{ margin: 0 }}>
            <span>Assessment</span>
            <div className="analytics-select-wrap">
              <select value={selectedAssessment} onChange={(e) => setSelectedAssessment(e.target.value)}>
                <option>Midterm (20 Sep 2025)</option>
                <option>Unit Test 1</option>
              </select>
              <ChevronDown size={15} />
            </div>
          </label>
        </div>
      </div>

      {/* 5 KPI Cards in a Single Horizontal Row */}
      <section className="subject-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '10px' }}>
        <article className="subject-kpi subject-kpi-red" style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px' }}>
          <div className="subject-kpi-icon" style={{ background: '#fee2e2', color: '#dc2626', padding: '8px', borderRadius: '6px' }}><AlertTriangle size={18} /></div>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: '11px', color: '#991b1b', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Students Below 20%</span>
            <strong style={{ fontSize: '18px', color: '#7f1d1d', display: 'block' }}>2</strong>
            <small style={{ fontSize: '10px', color: '#b91c1c', whiteSpace: 'nowrap' }}>Immediate support</small>
          </div>
        </article>

        <article className="subject-kpi subject-kpi-orange" style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '10px', background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '8px' }}>
          <div className="subject-kpi-icon" style={{ background: '#ffedd5', color: '#ea580c', padding: '8px', borderRadius: '6px' }}><UserRound size={18} /></div>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: '11px', color: '#9a3412', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Students 21% - 40%</span>
            <strong style={{ fontSize: '18px', color: '#7c2d12', display: 'block' }}>6</strong>
            <small style={{ fontSize: '10px', color: '#c2410c', whiteSpace: 'nowrap' }}>Focused practice</small>
          </div>
        </article>

        <article className="subject-kpi subject-kpi-yellow" style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '10px', background: '#fefce8', border: '1px solid #fef08a', borderRadius: '8px' }}>
          <div className="subject-kpi-icon" style={{ background: '#fef08a', color: '#ca8a04', padding: '8px', borderRadius: '6px' }}><Info size={18} /></div>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: '11px', color: '#854d0e', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Students 41% - 60%</span>
            <strong style={{ fontSize: '18px', color: '#713f12', display: 'block' }}>12</strong>
            <small style={{ fontSize: '10px', color: '#a16207', whiteSpace: 'nowrap' }}>Moderate support</small>
          </div>
        </article>

        <article className="subject-kpi subject-kpi-purple" style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '10px', background: '#faf5ff', border: '1px solid #f3e8ff', borderRadius: '8px' }}>
          <div className="subject-kpi-icon" style={{ background: '#f3e8ff', color: '#9333ea', padding: '8px', borderRadius: '6px' }}><BarChart3 size={18} /></div>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: '11px', color: '#6b21a8', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Students 61% - 80%</span>
            <strong style={{ fontSize: '18px', color: '#581c87', display: 'block' }}>14</strong>
            <small style={{ fontSize: '10px', color: '#9333ea', whiteSpace: 'nowrap' }}>Performing well</small>
          </div>
        </article>

        <article className="subject-kpi subject-kpi-blue" style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '10px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px' }}>
          <div className="subject-kpi-icon" style={{ background: '#dbeafe', color: '#2563eb', padding: '8px', borderRadius: '6px' }}><Star size={18} /></div>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: '11px', color: '#1e40af', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Students 81% - 100%</span>
            <strong style={{ fontSize: '18px', color: '#1e3a8a', display: 'block' }}>6</strong>
            <small style={{ fontSize: '10px', color: '#2563eb', whiteSpace: 'nowrap' }}>Strong performance</small>
          </div>
        </article>
      </section>

      {/* Two Side-by-Side Panels cleanly fitted without horizontal scroll */}
      <section className="subject-chart-grid" style={{ marginTop: '20px' }}>
        <article className="subject-panel" style={{ overflowX: 'hidden' }}>
          <div className="subject-panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <BookOpen size={20} />
              <div>
                <h2>Topic-wise Learning Gaps</h2>
                <p>Average score and number of students below 40% for each topic.</p>
              </div>
            </div>
            <span style={{ color: '#0f766e', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
              View all topics <ChevronRight size={14} />
            </span>
          </div>

          <div style={{ marginTop: '12px', width: '100%', overflowX: 'hidden' }}>
            <table className="subject-student-table" style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px 6px', fontSize: '11px', width: '30px' }}>#</th>
                  <th style={{ padding: '8px 8px', fontSize: '11px' }}>Chapter / Topic</th>
                  <th style={{ padding: '8px 6px', fontSize: '11px', textAlign: 'center' }}>Average Score</th>
                  <th style={{ padding: '8px 6px', fontSize: '11px', textAlign: 'center' }}>Students Below 40%</th>
                  <th style={{ padding: '8px 8px', fontSize: '11px' }}>Topic Coverage</th>
                  <th style={{ padding: '8px 4px', fontSize: '11px', width: '30px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {topicsData.map((t) => (
                  <tr key={t.id}>
                    <td style={{ padding: '10px 6px', fontSize: '12px' }}>{t.id}</td>
                    <td style={{ padding: '10px 8px', fontSize: '12px', whiteSpace: 'nowrap' }}><strong>{t.chapter}</strong></td>
                    <td style={{ padding: '10px 6px', textAlign: 'center' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '4px', background: `${t.scoreColor}15`, color: t.scoreColor, fontWeight: 700, fontSize: '11px', display: 'inline-block' }}>
                        {t.avgScore}
                      </span>
                    </td>
                    <td style={{ padding: '10px 6px', fontSize: '12px', textAlign: 'center', whiteSpace: 'nowrap' }}>{t.belowCount}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '70px', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden', flexShrink: 0 }}>
                          <div style={{ width: t.coverageWidth, height: '100%', background: t.barColor }} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155', minWidth: '32px' }}>{t.coverage}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 4px', textAlign: 'center' }}><ChevronRight size={16} color="#94a3b8" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="subject-panel" style={{ overflowX: 'hidden' }}>
          <div className="subject-panel-heading">
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Users size={20} />
              <div>
                <h2>Students Needing Support by Topic</h2>
                <p>Top topics with highest number of students below 40%.</p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '12px', width: '100%', overflowX: 'hidden' }}>
            <table className="subject-student-table" style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px 8px', fontSize: '11px', width: '30px' }}>#</th>
                  <th style={{ padding: '8px 12px', fontSize: '11px' }}>Topic</th>
                  <th style={{ padding: '8px 12px', fontSize: '11px' }}>Number of Students</th>
                  <th style={{ padding: '8px 6px', fontSize: '11px', width: '30px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {topicSupportData.map((ts) => (
                  <tr key={ts.id}>
                    <td style={{ padding: '12px 8px', fontSize: '12px' }}>{ts.id}</td>
                    <td style={{ padding: '12px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}><strong>{ts.topic}</strong></td>
                    <td style={{ padding: '12px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}>{ts.count}</td>
                    <td style={{ padding: '12px 6px', textAlign: 'center' }}><ChevronRight size={16} color="#94a3b8" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {/* Bottom Panel: Students with Low Performance */}
      <section className="subject-panel subject-student-panel" style={{ marginTop: '20px' }}>
        <div className="subject-student-heading" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div className="subject-panel-heading">
            <UserRound size={24} />
            <div>
              <h2>Students with Low Performance (Below 40%)</h2>
              <p>List of students who scored below 40% in this assessment.</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Score Range</span>
              <select value={scoreRangeFilter} onChange={(e) => setScoreRangeFilter(e.target.value)} style={{ border: 'none', background: 'transparent', fontWeight: 600, fontSize: '13px', outline: 'none' }}>
                <option>Below 40% (0 – 40%)</option>
                <option>0 – 20%</option>
                <option>21 – 40%</option>
              </select>
            </div>

            <label className="subject-student-search">
              <Search size={16} />
              <input
                value={searchQuery}
                placeholder="Search by student name, roll no. or admission no..."
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="subject-table-wrap">
          <table className="subject-student-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Student Name</th>
                <th>Roll No.</th>
                <th>Admission No.</th>
                <th>Latest Score</th>
                <th>Score Range</th>
                <th>Major Weak Topics (from submission analysis)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((st, idx) => (
                <tr key={st.id}>
                  <td>{idx + 1}</td>
                  <td><strong>{st.name}</strong></td>
                  <td>{st.rollNumber}</td>
                  <td>{st.admissionNo}</td>
                  <td>
                    <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#fee2e2', color: '#dc2626', fontWeight: 700, fontSize: '12px' }}>
                      {st.score}
                    </span>
                  </td>
                  <td>
                    <span style={{ padding: '3px 8px', borderRadius: '4px', background: `${st.rangeColor}20`, color: st.rangeColor, fontWeight: 600, fontSize: '12px' }}>
                      {st.range}
                    </span>
                  </td>
                  <td>{st.weakTopics}</td>
                  <td>
                    <button type="button" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                      View <ChevronDown size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="subject-table-footer" style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            Showing 1 - {filteredStudents.length} of {filteredStudents.length} students (Below 40%)
          </span>
          <div className="subject-pagination">
            <button className="active">1</button>
          </div>
        </div>
      </section>
    </div>
  );
}
