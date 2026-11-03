import { useEffect, useMemo, useState } from 'react';
import {
  Users,
  FileCheck2,
  CheckCircle2,
  TrendingUp,
  BookOpen,
  Search,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Info,
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import './Analytics.css';
import SubjectAnalytics from './SubjectAnalytics';
import './SubjectAnalytics.css';
import StudentsList from './StudentsList';
import LearningGapDetails from './LearningGapDetails';
import StudentPerformanceDetails from './StudentPerformanceDetails';

type GradeDistribution = {
  A: number;
  B: number;
  C: number;
  D: number;
};

type SubjectPerformance = {
  subject: string;
  papersEvaluated: number;
  avgPercentage: number;
};

type AnalyticsOverview = {
  totalStudents: number;
  totalClasses: number;
  totalAssignments: number;
  totalSubmissions: number;
  avgScore: number;
  aiAccuracy: number;
  gradeDistribution: GradeDistribution;
  subjectPerformance: SubjectPerformance[];
};

type RecentSubmission = {
  id: string;
  subject: string;
  score: number;
  maxScore: number;
  submittedAt: string;
};

type StudentAnalyticsItem = {
  id: string;
  name: string;
  rollNumber: string;
  admissionNo: string;
  className: string;
  sectionName: string;
  parentName: string;
  parentPhone: string;
  testsTaken: number;
  avgPercentage: number;
  status: 'Excelling' | 'Average' | 'Needs Support' | 'No Tests';
  knowledgeGaps: string[];
  excelledAreas: string[];
  recentSubmissions: RecentSubmission[];
};

const DEMO_STUDENTS: StudentAnalyticsItem[] = [
  {
    id: 'demo-student-1',
    name: 'Aarav Sharma',
    rollNumber: '101',
    admissionNo: 'PA-DEMO-001',
    className: 'Class 8',
    sectionName: 'A',
    parentName: 'Rajesh Sharma',
    parentPhone: 'Demo contact',
    testsTaken: 5,
    avgPercentage: 88,
    status: 'Excelling',
    knowledgeGaps: ['Fractions and decimals'],
    excelledAreas: ['Science', 'Mathematics'],
    recentSubmissions: [
      {
        id: 'demo-sub-1',
        subject: 'Mathematics',
        score: 45,
        maxScore: 50,
        submittedAt: '2026-10-20',
      },
      {
        id: 'demo-sub-2',
        subject: 'Science',
        score: 44,
        maxScore: 50,
        submittedAt: '2026-10-17',
      },
    ],
  },
  {
    id: 'demo-student-2',
    name: 'Ananya Reddy',
    rollNumber: '102',
    admissionNo: 'PA-DEMO-002',
    className: 'Class 8',
    sectionName: 'A',
    parentName: 'Suresh Reddy',
    parentPhone: 'Demo contact',
    testsTaken: 4,
    avgPercentage: 72,
    status: 'Average',
    knowledgeGaps: ['Algebraic expressions', 'Grammar'],
    excelledAreas: ['Social Studies'],
    recentSubmissions: [
      {
        id: 'demo-sub-3',
        subject: 'Mathematics',
        score: 34,
        maxScore: 50,
        submittedAt: '2026-10-21',
      },
      {
        id: 'demo-sub-4',
        subject: 'English',
        score: 38,
        maxScore: 50,
        submittedAt: '2026-10-18',
      },
    ],
  },
  {
    id: 'demo-student-3',
    name: 'Vihaan Kumar',
    rollNumber: '103',
    admissionNo: 'PA-DEMO-003',
    className: 'Class 8',
    sectionName: 'B',
    parentName: 'Ramesh Kumar',
    parentPhone: 'Demo contact',
    testsTaken: 6,
    avgPercentage: 94,
    status: 'Excelling',
    knowledgeGaps: [],
    excelledAreas: ['Mathematics', 'Science', 'Computer'],
    recentSubmissions: [
      { id: 'demo-sub-5', subject: 'Computer', score: 48, maxScore: 50, submittedAt: '2026-10-24' },
      { id: 'demo-sub-6', subject: 'Mathematics', score: 47, maxScore: 50, submittedAt: '2026-10-22' },
    ],
  },
  {
    id: 'demo-student-4',
    name: 'Saanvi Reddy',
    rollNumber: '104',
    admissionNo: 'PA-DEMO-004',
    className: 'Class 8',
    sectionName: 'B',
    parentName: 'Prakash Reddy',
    parentPhone: 'Demo contact',
    testsTaken: 5,
    avgPercentage: 81,
    status: 'Excelling',
    knowledgeGaps: ['Geometry'],
    excelledAreas: ['English', 'Science'],
    recentSubmissions: [
      { id: 'demo-sub-7', subject: 'English', score: 43, maxScore: 50, submittedAt: '2026-10-25' },
      { id: 'demo-sub-8', subject: 'Science', score: 40, maxScore: 50, submittedAt: '2026-10-19' },
    ],
  },
  {
    id: 'demo-student-5',
    name: 'Arjun Varma',
    rollNumber: '105',
    admissionNo: 'PA-DEMO-005',
    className: 'Class 9',
    sectionName: 'A',
    parentName: 'Srinivas Varma',
    parentPhone: 'Demo contact',
    testsTaken: 4,
    avgPercentage: 64,
    status: 'Average',
    knowledgeGaps: ['Algebra', 'Physics fundamentals'],
    excelledAreas: ['Social Studies'],
    recentSubmissions: [
      { id: 'demo-sub-9', subject: 'Mathematics', score: 29, maxScore: 50, submittedAt: '2026-10-23' },
      { id: 'demo-sub-10', subject: 'Social Studies', score: 36, maxScore: 50, submittedAt: '2026-10-20' },
    ],
  },
  {
    id: 'demo-student-6',
    name: 'Diya Sharma',
    rollNumber: '106',
    admissionNo: 'PA-DEMO-006',
    className: 'Class 9',
    sectionName: 'A',
    parentName: 'Amit Sharma',
    parentPhone: 'Demo contact',
    testsTaken: 3,
    avgPercentage: 48,
    status: 'Needs Support',
    knowledgeGaps: ['Fractions', 'Grammar', 'Basic science concepts'],
    excelledAreas: ['Art'],
    recentSubmissions: [
      { id: 'demo-sub-11', subject: 'English', score: 22, maxScore: 50, submittedAt: '2026-10-21' },
      { id: 'demo-sub-12', subject: 'Mathematics', score: 24, maxScore: 50, submittedAt: '2026-10-16' },
    ],
  },
  {
    id: 'demo-student-7',
    name: 'Ishaan Patel',
    rollNumber: '107',
    admissionNo: 'PA-DEMO-007',
    className: 'Class 10',
    sectionName: 'A',
    parentName: 'Kiran Patel',
    parentPhone: 'Demo contact',
    testsTaken: 0,
    avgPercentage: 0,
    status: 'No Tests',
    knowledgeGaps: [],
    excelledAreas: [],
    recentSubmissions: [],
  },
  {
    id: 'demo-student-8',
    name: 'Mira Nair',
    rollNumber: '108',
    admissionNo: 'PA-DEMO-008',
    className: 'Class 10',
    sectionName: 'B',
    parentName: 'Deepak Nair',
    parentPhone: 'Demo contact',
    testsTaken: 5,
    avgPercentage: 57,
    status: 'Average',
    knowledgeGaps: ['Chemical equations', 'Reading comprehension'],
    excelledAreas: ['Computer'],
    recentSubmissions: [
      { id: 'demo-sub-13', subject: 'Computer', score: 41, maxScore: 50, submittedAt: '2026-10-26' },
      { id: 'demo-sub-14', subject: 'Science', score: 27, maxScore: 50, submittedAt: '2026-10-18' },
    ],
  },
];

const DEFAULT_OVERVIEW: AnalyticsOverview = {
  totalStudents: 0,
  totalClasses: 0,
  totalAssignments: 0,
  totalSubmissions: 0,
  avgScore: 0,
  aiAccuracy: 0,
  gradeDistribution: { A: 0, B: 0, C: 0, D: 0 },
  subjectPerformance: [],
};

// Clearly illustrative fallback values used only when the analytics API has no student data.
const DEMO_OVERVIEW: AnalyticsOverview = {
  totalStudents: 8,
  totalClasses: 3,
  totalAssignments: 12,
  totalSubmissions: 30,
  avgScore: 72,
  aiAccuracy: 96,
  gradeDistribution: { A: 2, B: 3, C: 2, D: 1 },
  subjectPerformance: [
    { subject: 'Mathematics', papersEvaluated: 12, avgPercentage: 76 },
    { subject: 'Science', papersEvaluated: 10, avgPercentage: 81 },
    { subject: 'English', papersEvaluated: 9, avgPercentage: 74 },
    { subject: 'Social Studies', papersEvaluated: 8, avgPercentage: 69 },
    { subject: 'Computer', papersEvaluated: 7, avgPercentage: 88 },
  ],
};

const SAMPLE_SUBJECTS = [
  { subject: 'Mathematics', score: 82, color: 'purple' },
  { subject: 'Science', score: 76, color: 'green' },
  { subject: 'English', score: 88, color: 'orange' },
  { subject: 'Social Studies', score: 71, color: 'blue' },
  { subject: 'Computer', score: 91, color: 'pink' },
];

const TREND_VALUES = [58, 62, 68, 72];
const TREND_LABELS = ['Unit Test 1', 'Unit Test 2', 'Unit Test 3', 'Midterm'];

const COHORTS = [
  {
    title: 'High Performers',
    students: 32,
    percentage: 26,
    average: 89,
    description: 'Consistently scoring above 85%',
    color: 'purple',
  },
  {
    title: 'Steady Learners',
    students: 48,
    percentage: 40,
    average: 74,
    description: 'Performing within expected range',
    color: 'green',
  },
  {
    title: 'Needs Attention',
    students: 28,
    percentage: 23,
    average: 58,
    description: 'May benefit from extra support',
    color: 'orange',
  },
  {
    title: 'At Risk',
    students: 13,
    percentage: 11,
    average: 42,
    description: 'Requires targeted intervention',
    color: 'red',
  },
];

const formatScore = (score: number) =>
  `${Math.round(Number.isFinite(score) ? score : 0)}%`;

function createTrendPoints(values: number[]) {
  const width = 600;
  const height = 190;
  const left = 36;
  const right = 12;
  const top = 14;
  const bottom = 20;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;

  const points = values.map((value, index) => ({
    x: left + (index / Math.max(values.length - 1, 1)) * chartWidth,
    y: top + ((100 - value) / 100) * chartHeight,
    value,
  }));

  return {
    points,
    line: points.map((point) => `${point.x},${point.y}`).join(' '),
    area: `${left},${height - bottom} ${points
      .map((point) => `${point.x},${point.y}`)
      .join(' ')} ${width - right},${height - bottom}`,
  };
}

interface AnalyticsProps {
  initialView?: 'analytics' | 'studentsList';
}

export default function Analytics({ initialView = 'analytics' }: AnalyticsProps) {
  const [currentView, setCurrentView] = useState<'analytics' | 'studentsList' | 'learningGaps'>(initialView);

  const [overview, setOverview] = useState<AnalyticsOverview>(DEFAULT_OVERVIEW);
  const [students, setStudents] = useState<StudentAnalyticsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('All Classes');
  const [selectedSection, setSelectedSection] = useState('All Sections');
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');
  const [selectedAssessment, setSelectedAssessment] = useState('All Assessments');
  const [selectedPeriod, setSelectedPeriod] = useState('This Term');
  const [academicYear, setAcademicYear] = useState('2025–2026');


  type SelectedStudent = {
    id?: string;
    name?: string;
    rollNumber?: string;
    admissionNo?: string;
    className?: string;
    sectionName?: string;
    avgPercentage?: number;
    recentSubmissions?: Array<{
      id: string;
      subject: string;
      score: number;
      maxScore: number;
      submittedAt: string;
    }>;
  };

  const [selectedStudent, setSelectedStudent] =
    useState<SelectedStudent | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const pageSize = 5;

  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      setIsLoading(true);
      setApiError(false);

      try {
        const queryParams = new URLSearchParams({
          year: academicYear,
          ...(selectedClass !== 'All Classes' && { class: selectedClass }),
          ...(selectedSection !== 'All Sections' && { section: selectedSection }),
          period: selectedPeriod,
        });

        const [overviewResponse, studentsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/analytics/overview?${queryParams.toString()}`),
          fetch(`${API_BASE_URL}/api/analytics/students?${queryParams.toString()}`),
        ]);

        let overviewData: any = null;
        let studentsData: any = null;

        try {
          overviewData = await overviewResponse.json();
        } catch {
          overviewData = null;
        }

        try {
          studentsData = await studentsResponse.json();
        } catch {
          studentsData = null;
        }

        if (cancelled) return;

        if (
          overviewResponse.ok &&
          overviewData?.success &&
          overviewData?.stats
        ) {
          setOverview({
            ...DEFAULT_OVERVIEW,
            ...overviewData.stats,
            gradeDistribution: {
              ...DEFAULT_OVERVIEW.gradeDistribution,
              ...overviewData.stats.gradeDistribution,
            },
            subjectPerformance: Array.isArray(
              overviewData.stats.subjectPerformance,
            )
              ? overviewData.stats.subjectPerformance
              : [],
          });
        } else {
          setApiError(true);
        }

        if (
          studentsResponse.ok &&
          studentsData?.success &&
          Array.isArray(studentsData.students)
        ) {
          setStudents(studentsData.students);
        } else {
          setStudents([]);
          setApiError(true);
        }
      } catch {
        if (!cancelled) {
          setApiError(true);
          setStudents([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [academicYear, selectedClass, selectedSection, selectedPeriod]);

  const isUsingDemoData = students.length === 0;
  const displayedStudents = isUsingDemoData ? DEMO_STUDENTS : students;
  const displayedOverview = isUsingDemoData ? DEMO_OVERVIEW : overview;

  const classOptions = useMemo(
    () =>
      Array.from(
        new Set(
          displayedStudents
            .map((student) => student.className)
            .filter(Boolean),
        ),
      ).sort(),
    [displayedStudents],
  );

  const sectionOptions = useMemo(
    () =>
      Array.from(
        new Set(
          displayedStudents
            .filter(
              (student) =>
                selectedClass === 'All Classes' ||
                student.className === selectedClass,
            )
            .map((student) => student.sectionName)
            .filter(Boolean),
        ),
      ).sort(),
    [displayedStudents, selectedClass],
  );

  const subjectOptions = useMemo(() => {
    const liveSubjects = displayedOverview.subjectPerformance
      .map((subject) => subject.subject)
      .filter(Boolean);

    return liveSubjects.length
      ? liveSubjects
      : SAMPLE_SUBJECTS.map((subject) => subject.subject);
  }, [displayedOverview.subjectPerformance]);

  const filteredStudents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return displayedStudents.filter((student) => {
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
        student.recentSubmissions.some(
          (submission) => submission.subject === selectedSubject,
        );

      const matchesAssessment =
        selectedAssessment === 'All Assessments' ||
        student.recentSubmissions.length > 0;

      return (
        matchesSearch &&
        matchesClass &&
        matchesSection &&
        matchesSubject &&
        matchesAssessment
      );
    });
  }, [
    displayedStudents,
    searchTerm,
    selectedClass,
    selectedSection,
    selectedSubject,
    selectedAssessment,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredStudents.length / pageSize),
  );
  const safePage = Math.min(currentPage, totalPages);

  const paginatedStudents = filteredStudents.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    selectedClass,
    selectedSection,
    selectedSubject,
    selectedAssessment,
    selectedPeriod,
    academicYear,
  ]);

  const trend = useMemo(() => createTrendPoints(TREND_VALUES), []);

  const subjectChartData = useMemo(() => {
    if (displayedOverview.subjectPerformance.length > 0) {
      return displayedOverview.subjectPerformance.map((subject, index) => ({
        subject: subject.subject,
        score: Math.round(subject.avgPercentage || 0),
        color: SAMPLE_SUBJECTS[index % SAMPLE_SUBJECTS.length].color,
      }));
    }

    return SAMPLE_SUBJECTS;
  }, [displayedOverview.subjectPerformance]);

  const totalStudents = displayedOverview.totalStudents || displayedStudents.length;
  const totalAssignments = displayedOverview.totalAssignments;
  const totalSubmissions = displayedOverview.totalSubmissions;
  const averageScore = displayedOverview.avgScore;

  function toggleStudent(studentId: string) {
    setSelectedIds((previous) =>
      previous.includes(studentId)
        ? previous.filter((id) => id !== studentId)
        : [...previous, studentId],
    );
  }

  function toggleAllVisible() {
    const visibleIds = paginatedStudents.map((student) => student.id);
    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedIds.includes(id));

    setSelectedIds((previous) =>
      allSelected
        ? previous.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...previous, ...visibleIds])),
    );
  }

  if (currentView === 'studentsList') {
    return (
      <StudentsList
        students={displayedStudents}
        onBack={() => setCurrentView('analytics')}
        onSelectStudent={(student) => setSelectedStudent(student)}
      />
    );
  }

  if (selectedStudent) {
    return (
      <StudentPerformanceDetails
        student={selectedStudent}
        subject={selectedSubject}
        isClassTeacher={false}
        onNavigateToAnalytics={() => {
          setSelectedStudent(null);
          setSelectedSubject('All Subjects');
          setCurrentView('analytics');
        }}
        onNavigateToSubjectAnalytics={() => {
          setSelectedStudent(null);
          setCurrentView('analytics');
        }}
      />
    );
  }

  if (currentView === 'learningGaps') {
    return (
      <LearningGapDetails
        subject={selectedSubject === 'All Subjects' ? 'Mathematics' : selectedSubject}
        onBack={() => setCurrentView('analytics')}
      />
    );
  }

  return (
    <div className="analytics-page">
      {/* Renders header and filters on both main analytics and subject analytics views */}
      {currentView === 'analytics' && (
        <header className="analytics-page-header">
          <div className="analytics-page-heading">
            <h1>Student Analytics</h1>
            <p>
              Overview of student performance for your classes and subjects.
            </p>
          </div>

          <section
            className="analytics-filters"
            aria-label="Analytics filters"
          >
            <label className="analytics-filter">
              <span>Academic Year</span>
              <div className="analytics-select-wrap">
                <select
                  value={academicYear}
                  onChange={(event) => setAcademicYear(event.target.value)}
                >
                  <option>2025–2026</option>
                  <option>2026–2027</option>
                  <option>2024–2025</option>
                </select>
                <ChevronDown size={15} />
              </div>
            </label>

            <label className="analytics-filter">
              <span>Class</span>
              <div className="analytics-select-wrap">
                <select
                  value={selectedClass}
                  onChange={(event) => {
                    setSelectedClass(event.target.value);
                    setSelectedSection('All Sections');
                  }}
                >
                  <option>All Classes</option>
                  {classOptions.map((className) => (
                    <option key={className}>{className}</option>
                  ))}
                </select>
                <ChevronDown size={15} />
              </div>
            </label>

            <label className="analytics-filter">
              <span>Section</span>
              <div className="analytics-select-wrap">
                <select
                  value={selectedSection}
                  onChange={(event) => setSelectedSection(event.target.value)}
                >
                  <option>All Sections</option>
                  {sectionOptions.map((section) => (
                    <option key={section}>{section}</option>
                  ))}
                </select>
                <ChevronDown size={15} />
              </div>
            </label>

            <label className="analytics-filter">
              <span>Subject</span>
              <div className="analytics-select-wrap">
                <select
                  value={selectedSubject}
                  onChange={(event) => setSelectedSubject(event.target.value)}
                >
                  <option>All Subjects</option>
                  {subjectOptions.map((subject) => (
                    <option key={subject}>{subject}</option>
                  ))}
                </select>
                <ChevronDown size={15} />
              </div>
            </label>

            <label className="analytics-filter">
              <span>Assessment</span>
              <div className="analytics-select-wrap">
                <select
                  value={selectedAssessment}
                  onChange={(event) => setSelectedAssessment(event.target.value)}
                >
                  <option>All Assessments</option>
                  <option>Completed Assessments</option>
                </select>
                <ChevronDown size={15} />
              </div>
            </label>

            <label className="analytics-filter">
              <span>Period</span>
              <div className="analytics-select-wrap">
                <select
                  value={selectedPeriod}
                  onChange={(event) => setSelectedPeriod(event.target.value)}
                >
                  <option>This Term</option>
                  <option>This Month</option>
                  <option>Last 30 Days</option>
                  <option>This Year</option>
                </select>
                <ChevronDown size={15} />
              </div>
            </label>
          </section>
        </header>
      )}

      {isLoading && (
        <div className="analytics-loading">
          <span className="analytics-spinner" />
          Loading student analytics…
        </div>
      )}
      {!isLoading && apiError && (
        <div className="analytics-error" role="alert">
          Unable to load some live analytics data. Please check the connection.
          Demo records may be displayed where live data is unavailable.
        </div>
      )}

      {selectedSubject === 'All Subjects' ? (
        <>
          <section
            className="analytics-kpis"
            aria-label="Key performance indicators"
          >
            <article className="analytics-kpi analytics-kpi-green">
              <div className="analytics-kpi-top">
                <div className="analytics-kpi-icon">
                  <Users size={18} />
                </div>
                <span className="analytics-kpi-tag">Enrollment</span>
              </div>
              <div className="analytics-kpi-label">Total Students</div>
              <div className="analytics-kpi-value">
                {isLoading ? '—' : totalStudents.toLocaleString()}
              </div>
              <div className="analytics-kpi-caption">
                Students in roster
              </div>
            </article>

            <article className="analytics-kpi analytics-kpi-blue">
              <div className="analytics-kpi-top">
                <div className="analytics-kpi-icon">
                  <FileCheck2 size={18} />
                </div>
                <span className="analytics-kpi-tag">Assessments</span>
              </div>
              <div className="analytics-kpi-label">Assessments Assigned</div>
              <div className="analytics-kpi-value">
                {isLoading
                  ? '—'
                  : totalAssignments > 0
                    ? totalAssignments.toLocaleString()
                    : '—'}
              </div>
              <div className="analytics-kpi-caption">
                {totalAssignments > 0 ? 'Reported by API' : 'Awaiting live data'}
              </div>
            </article>

            <article className="analytics-kpi analytics-kpi-orange">
              <div className="analytics-kpi-top">
                <div className="analytics-kpi-icon">
                  <CheckCircle2 size={18} />
                </div>
                <span className="analytics-kpi-tag">Submissions</span>
              </div>
              <div className="analytics-kpi-label">Submitted Assessments</div>
              <div className="analytics-kpi-value">
                {isLoading ? '—' : totalSubmissions.toLocaleString()}
              </div>
              <div className="analytics-kpi-caption">
                Total recorded submissions
              </div>
            </article>

            <article className="analytics-kpi analytics-kpi-purple">
              <div className="analytics-kpi-top">
                <div className="analytics-kpi-icon">
                  <TrendingUp size={18} />
                </div>
                <span className="analytics-kpi-tag">Performance</span>
              </div>
              <div className="analytics-kpi-label">Class Average Score</div>
              <div className="analytics-kpi-value">
                {isLoading ? '—' : formatScore(averageScore)}
              </div>
              <div className="analytics-kpi-caption">
                {isUsingDemoData ? 'Illustrative demo average' : 'Reported average'}
              </div>
            </article>
          </section>

          <section className="analytics-chart-grid">
            <article className="analytics-panel analytics-trend-panel">
              <div className="analytics-panel-heading">
                <div>
                  <h2>Class Performance Trend</h2>
                  <p>Average score across completed assessments</p>
                </div>
                <span className="analytics-icon-button" title="Illustrative trend">
                  <TrendingUp size={18} />
                </span>
              </div>

              <div className="analytics-trend-summary">
                <strong>Assessment performance</strong>
                <span className="analytics-illustrative-label">
                  <Info size={14} />
                  Illustrative data
                </span>
              </div>

              <div className="analytics-line-chart">
                <div className="analytics-y-axis">
                  <span>100%</span>
                  <span>75%</span>
                  <span>50%</span>
                  <span>25%</span>
                  <span>0%</span>
                </div>

                <svg
                  className="analytics-trend-svg"
                  viewBox="0 0 600 190"
                  preserveAspectRatio="none"
                  role="img"
                  aria-label="Illustrative assessment averages"
                >
                  <defs>
                    <linearGradient
                      id="analyticsTrendFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#36b98b" stopOpacity="0.32" />
                      <stop offset="100%" stopColor="#36b98b" stopOpacity="0.06" />
                    </linearGradient>
                  </defs>

                  {[14, 53, 92, 131, 170].map((y) => (
                    <line
                      key={y}
                      x1="36"
                      y1={y}
                      x2="588"
                      y2={y}
                      className="analytics-grid-line"
                    />
                  ))}

                  <polygon points={trend.area} fill="url(#analyticsTrendFill)" />

                  <polyline
                    points={trend.line}
                    fill="none"
                    stroke="#159b78"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {trend.points.map((point, index) => (
                    <g key={`${point.x}-${index}`}>
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="4.5"
                        fill="#159b78"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      <text
                        x={point.x}
                        y={point.y - 12}
                        textAnchor="middle"
                        fill="#14785f"
                        fontSize="11"
                        fontWeight="700"
                      >
                        {point.value}%
                      </text>
                    </g>
                  ))}
                </svg>

                <div className="analytics-x-axis">
                  {TREND_LABELS.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
              </div>
            </article>

            <article className="analytics-panel analytics-subject-panel">
              <div className="analytics-panel-heading">
                <div>
                  <h2>Subject-wise Average Score</h2>
                  <p>Performance comparison by subject</p>
                </div>
                <span className="analytics-sample-badge">
                  {isUsingDemoData ? 'Demo data' : 'Live data'}
                </span>
              </div>

              <div className="analytics-subject-bars">
                {subjectChartData.map((subject) => (
                  <div className="analytics-subject-row" key={subject.subject}>
                    <span className="analytics-subject-name">{subject.subject}</span>
                    <div className="analytics-bar-track">
                      <div
                        className={`analytics-bar-fill analytics-bar-${subject.color}`}
                        style={{
                          width: `${Math.max(0, Math.min(100, subject.score))}%`,
                        }}
                      />
                    </div>
                    <strong>{subject.score}%</strong>
                  </div>
                ))}
              </div>

              <div className="analytics-subject-footer">
                <BookOpen size={17} />
                <span>Subject performance</span>
                <strong>
                  {Math.round(
                    subjectChartData.reduce(
                      (sum, subject) => sum + subject.score,
                      0,
                    ) / Math.max(subjectChartData.length, 1),
                  )}%
                </strong>
              </div>
            </article>
          </section>

          <section className="analytics-panel analytics-cohort-panel">
            <div className="analytics-panel-heading">
              <div>
                <h2>Cohort Clustering</h2>
                <p>Student groups based on performance patterns</p>
              </div>
              <span className="analytics-sample-badge">Illustrative data</span>
            </div>

            <div className="analytics-cohort-grid">
              {COHORTS.map((cohort) => (
                <article
                  className={`analytics-cohort-card analytics-cohort-${cohort.color}`}
                  key={cohort.title}
                >
                  <div className="analytics-cohort-top">
                    <span className="analytics-cohort-icon">
                      <GraduationCap size={20} />
                    </span>
                    <strong>{cohort.percentage}%</strong>
                  </div>
                  <h3>{cohort.title}</h3>
                  <div className="analytics-cohort-count">
                    <strong>{cohort.students}</strong>
                    <span>students</span>
                  </div>
                  <p>{cohort.description}</p>
                  <div className="analytics-cohort-progress">
                    <span style={{ width: `${cohort.average}%` }} />
                  </div>
                  <div className="analytics-cohort-average">
                    <span>Illustrative average</span>
                    <strong>{cohort.average}%</strong>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="analytics-panel analytics-students-panel">
            <div className="analytics-student-list-header">
              <div className="analytics-student-list-title">
                <Users size={24} />
                <div>
                  <h2>
                    Students in{' '}
                    {selectedClass === 'All Classes' ? 'Class 8' : selectedClass}
                    {' - '}
                    {selectedSection === 'All Sections'
                      ? 'Section A'
                      : `Section ${selectedSection}`}
                  </h2>
                  <p>
                    List of all students with their performance and latest
                    assessment status.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="analytics-view-all"
                onClick={() => setCurrentView('studentsList')}
              >
                View all students <ChevronRight size={15} />
              </button>

              <label className="analytics-student-list-search">
                <Search size={15} />
                <input
                  type="search"
                  placeholder="Search by student name, enrollment no. or admission no..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </label>
            </div>

            <div className="analytics-table-wrap">
              <table className="analytics-student-table analytics-compact-table">
                <thead>
                  <tr>
                    <th className="analytics-checkbox-cell">
                      <input
                        type="checkbox"
                        aria-label="Select all students on this page"
                        checked={
                          paginatedStudents.length > 0 &&
                          paginatedStudents.every((student) =>
                            selectedIds.includes(student.id),
                          )
                        }
                        onChange={toggleAllVisible}
                      />
                    </th>
                    <th>#</th>
                    <th>Student Name</th>
                    <th>Enrollment No.</th>
                    <th>Admission No.</th>
                    <th>Overall Score</th>
                    <th>Latest Assessment</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedStudents.map((student, index) => {
                    const latestSubmission = student.recentSubmissions?.[0];
                    const score = Math.round(student.avgPercentage || 0);

                    return (
                      <tr key={student.id}>
                        <td className="analytics-checkbox-cell">
                          <input
                            type="checkbox"
                            aria-label={`Select ${student.name}`}
                            checked={selectedIds.includes(student.id)}
                            onChange={() => toggleStudent(student.id)}
                          />
                        </td>

                        <td>
                          {(safePage - 1) * pageSize + index + 1}
                        </td>

                        <td>
                          <strong
                            className="analytics-student-name-link"
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedStudent(student)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                setSelectedStudent(student);
                              }
                            }}
                          >
                            {student.name}
                          </strong>
                        </td>

                        <td>{student.rollNumber || '—'}</td>
                        <td>{student.admissionNo || '—'}</td>

                        <td>
                          <span
                            className={`analytics-score-pill ${
                              score >= 75
                                ? 'high'
                                : score >= 50
                                  ? 'medium'
                                  : 'low'
                            }`}
                          >
                            {score}%
                          </span>
                        </td>

                        <td>
                          {latestSubmission ? latestSubmission.subject : '—'}
                        </td>

                        <td>
                          <button
                            type="button"
                            className="analytics-row-action"
                            onClick={() => setSelectedStudent(student)}
                            aria-label={`View individual performance for ${student.name}`}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {paginatedStudents.length === 0 && (
                    <tr>
                      <td colSpan={8} className="analytics-empty-row">
                        No students match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="analytics-table-footer">
              <div className="analytics-pagination">
                <span>
                  Showing{' '}
                  {filteredStudents.length === 0
                    ? 0
                    : (safePage - 1) * pageSize + 1}
                  {' - '}
                  {Math.min(safePage * pageSize, filteredStudents.length)}{' '}
                  of {filteredStudents.length} students
                </span>

                <div className="analytics-pagination-controls">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage(1)}
                    aria-label="First page"
                  >
                    1
                  </button>

                  {Array.from({ length: totalPages }, (_, index) => index + 1)
                    .filter(
                      (page) =>
                        page !== 1 &&
                        (page === safePage ||
                          page === safePage - 1 ||
                          page === safePage + 1),
                    )
                    .map((page) => (
                      <button
                        key={page}
                        type="button"
                        className={safePage === page ? 'active' : ''}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    ))}

                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() =>
                      setCurrentPage((page) => Math.min(page + 1, totalPages))
                    }
                    aria-label="Next page"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </>
      ) : (
        <SubjectAnalytics
          subject={selectedSubject}
          students={filteredStudents}
          onViewLearningGaps={() => setCurrentView('learningGaps')}
          onSelectStudent={(student) => setSelectedStudent(student)}
          onViewAllStudents={() => setCurrentView('studentsList')}
        />
      )}
    </div>
  );
}
