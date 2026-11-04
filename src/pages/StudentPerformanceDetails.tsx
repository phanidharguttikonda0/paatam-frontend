
import { useMemo, useState } from 'react';
import {
  ChevronRight,
  TrendingUp,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  FileText,
  X,
  ClipboardList,
} from 'lucide-react';
import './StudentPerformanceDetails.css';

type Assessment = {
  id: string;
  title: string;
  subject: string;
  subjectId: string;
  type: string;
  dueDate: string;
  submissionDate: string;
  score: number;
  maxScore: number;
  topic: string;
};


type AnswerAnalysisQuestion = {
  questionNo: number;
  topic: string;
  question: string;
  studentAnswer: string;
  correctAnswer: string;
  missed: string;
  marksObtained: number;
  maxMarks: number;
  status: 'Correct' | 'Partially Correct' | 'Incorrect' | 'Unattempted';
};

const answerTemplates: Record<string, Array<{
  topic: string;
  question: string;
  studentAnswer: string;
  correctAnswer: string;
  missed: string;
}>> = {
  Mathematics: [
    { topic: 'Fractions', question: 'Add 2/3 and 1/6.', studentAnswer: '2/3 + 1/6 = 3/9 = 1/3', correctAnswer: '2/3 = 4/6; 4/6 + 1/6 = 5/6.', missed: 'The denominators must be made equal before adding. The numerator and denominator should not both be added directly.' },
    { topic: 'Fractions', question: 'Find 3/4 of 28.', studentAnswer: '28 ÷ 4 = 7; 7 × 3 = 21.', correctAnswer: '3/4 × 28 = 84/4 = 21.', missed: 'The method is correct. Show the multiplication as a fraction to make the working clearer.' },
    { topic: 'Decimals', question: 'Write 0.75 as a fraction in simplest form.', studentAnswer: '75/100', correctAnswer: '75/100 = 3/4.', missed: 'The fraction is equivalent, but it has not been simplified using the common factor 25.' },
    { topic: 'Algebra', question: 'Solve: 3x + 5 = 20.', studentAnswer: '3x = 20 + 5; x = 25/3', correctAnswer: '3x = 20 - 5 = 15; x = 5.', missed: 'When moving +5 to the other side, subtract 5 rather than add it.' },
  ],
  Science: [
    { topic: 'Force and Motion', question: 'Define force and mention its SI unit.', studentAnswer: 'A push or pull.', correctAnswer: 'Force is a push or pull that can change an object’s state of motion or shape. Its SI unit is the newton (N).', missed: 'The definition is present, but the effect of force and its SI unit are missing.' },
    { topic: 'Electricity', question: 'What is an electric circuit?', studentAnswer: 'A path for electricity.', correctAnswer: 'A closed conducting path through which electric current flows.', missed: 'Mention that the path must be closed for current to flow.' },
    { topic: 'Light', question: 'State the law of reflection.', studentAnswer: 'Light bounces back from a surface.', correctAnswer: 'The angle of incidence equals the angle of reflection; the incident ray, reflected ray and normal lie in the same plane.', missed: 'The response gives the general idea but omits the equality of the two angles.' },
    { topic: 'Scientific reasoning', question: 'Why should an experiment be repeated?', studentAnswer: 'To check the result again.', correctAnswer: 'Repeating an experiment helps verify results, identify anomalies and improve reliability.', missed: 'Explain reliability and how repeated trials help identify unusual results.' },
  ],
  English: [
    { topic: 'Grammar', question: 'Change to past tense: “She writes a letter.”', studentAnswer: 'She write a letter yesterday.', correctAnswer: 'She wrote a letter.', missed: 'Use the irregular past-tense form “wrote”; do not use “write” with a past-time reference.' },
    { topic: 'Reading comprehension', question: 'State the main idea of the passage.', studentAnswer: 'It is about trees.', correctAnswer: 'A concise sentence explaining the passage’s central message about the importance of trees.', missed: 'The answer identifies the topic but does not explain the central message.' },
    { topic: 'Sentence construction', question: 'Write a sentence using “although”.', studentAnswer: 'Although it was raining.', correctAnswer: 'Although it was raining, we went to school.', missed: 'The response is a dependent clause. Add a main clause to make it a complete sentence.' },
    { topic: 'Vocabulary', question: 'Give a synonym for “rapid”.', studentAnswer: 'Fast', correctAnswer: 'Fast / quick / swift.', missed: 'No major gap. The synonym is correct.' },
  ],
  'Social Studies': [
    { topic: 'Maps', question: 'What is the purpose of a map scale?', studentAnswer: 'It shows the size of a map.', correctAnswer: 'A map scale represents the relationship between a distance on the map and the corresponding real-world distance.', missed: 'Explain the relationship between map distance and actual ground distance.' },
    { topic: 'Geography', question: 'Differentiate weather and climate.', studentAnswer: 'Both tell about temperature.', correctAnswer: 'Weather is the short-term condition of the atmosphere; climate is the long-term average pattern of weather in a region.', missed: 'The answer needs the time-scale distinction: short-term conditions versus long-term patterns.' },
    { topic: 'Civics', question: 'Why are rules important in a democracy?', studentAnswer: 'They control people.', correctAnswer: 'Rules and laws protect rights, maintain order and ensure fair treatment under established procedures.', missed: 'Include fairness, protection of rights and maintenance of order.' },
    { topic: 'History', question: 'What is a historical source?', studentAnswer: 'Something from history.', correctAnswer: 'A document, object, image or oral account that provides evidence about the past.', missed: 'Give examples and explain that sources provide evidence about the past.' },
  ],
  'Computer Science': [
    { topic: 'Programming fundamentals', question: 'What is an algorithm?', studentAnswer: 'A computer program.', correctAnswer: 'A finite, ordered set of clear steps used to solve a problem or perform a task.', missed: 'An algorithm is a step-by-step method, not necessarily a computer program.' },
    { topic: 'Conditional statements', question: 'When is an if statement used?', studentAnswer: 'To repeat code.', correctAnswer: 'An if statement executes a block of code when a specified condition is true.', missed: 'The response confuses selection with repetition. Explain condition-based execution.' },
    { topic: 'Debugging', question: 'What is debugging?', studentAnswer: 'Writing code.', correctAnswer: 'The process of finding, analysing and fixing errors in a program.', missed: 'Mention identifying and correcting errors rather than writing code.' },
    { topic: 'Data', question: 'What is a variable?', studentAnswer: 'A value.', correctAnswer: 'A named storage location used to hold a value that can change during program execution.', missed: 'Explain that a variable is a named storage location.' },
  ],
};

function buildMockAnswerAnalysis(assessment: Assessment): AnswerAnalysisQuestion[] {
  const templates = answerTemplates[assessment.subject] || answerTemplates.Mathematics;
  const targetMarks = Math.max(0, Math.min(100, Math.round((assessment.score / Math.max(assessment.maxScore, 1)) * 100)));
  let remainingMarks = targetMarks;

  return Array.from({ length: 20 }, (_, index) => {
    const template = templates[index % templates.length];
    const marksObtained = Math.min(5, remainingMarks);
    remainingMarks -= marksObtained;
    const status: AnswerAnalysisQuestion['status'] = marksObtained === 5
      ? 'Correct'
      : marksObtained > 0
        ? 'Partially Correct'
        : index % 5 === 4
          ? 'Unattempted'
          : 'Incorrect';

    return {
      questionNo: index + 1,
      ...template,
      studentAnswer: status === 'Correct' ? template.correctAnswer : status === 'Unattempted' ? '' : template.studentAnswer,
      missed: status === 'Correct' ? 'No major concept was missed. The response includes the expected key points.' : template.missed,
      marksObtained,
      maxMarks: 5,
      status,
    };
  });
}

type RemedialPlan = {
  id: string;
  topic: string;
  subject: string;
  generatedOn: string;
  content: string;
  format: string;
  questions: number;
  status: 'Generated' | 'Assigned';
};

type Props = {
  subject?: string;
  isClassTeacher?: boolean;
  student?: {
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
  onNavigateToAnalytics: () => void;
  onNavigateToSubjectAnalytics: () => void;
};

const sampleAssessments: Assessment[] = [
  {
    id: '1',
    title: 'Unit Test 1',
    subject: 'Mathematics',
    subjectId: 'MATH-08',
    type: 'Test',
    dueDate: '01 Aug 2025',
    submissionDate: '01 Aug 2025',
    score: 90,
    maxScore: 100,
    topic: 'Fractions',
  },
  {
    id: '2',
    title: 'Unit Test 2',
    subject: 'Science',
    subjectId: 'SCI-08',
    type: 'Test',
    dueDate: '16 Aug 2025',
    submissionDate: '16 Aug 2025',
    score: 88,
    maxScore: 100,
    topic: 'Force and Motion',
  },
  {
    id: '3',
    title: 'Worksheet 1',
    subject: 'English',
    subjectId: 'ENG-08',
    type: 'Worksheet',
    dueDate: '01 Sep 2025',
    submissionDate: '01 Sep 2025',
    score: 38,
    maxScore: 100,
    topic: 'Grammar',
  },
  {
    id: '4',
    title: 'Worksheet 2',
    subject: 'Social Studies',
    subjectId: 'SST-08',
    type: 'Worksheet',
    dueDate: '10 Sep 2025',
    submissionDate: '10 Sep 2025',
    score: 28,
    maxScore: 100,
    topic: 'Maps',
  },
  {
    id: '5',
    title: 'Midterm',
    subject: 'Mathematics',
    subjectId: 'MATH-08',
    type: 'Test',
    dueDate: '20 Sep 2025',
    submissionDate: '20 Sep 2025',
    score: 18,
    maxScore: 100,
    topic: 'Adding unlike fractions',
  },
  {
    id: '6',
    title: 'Science Assessment',
    subject: 'Science',
    subjectId: 'SCI-08',
    type: 'Assessment',
    dueDate: '25 Sep 2025',
    submissionDate: '25 Sep 2025',
    score: 76,
    maxScore: 100,
    topic: 'Electricity',
  },
];

const sampleSubjectScores = [
  { subject: 'Mathematics', score: 45, color: '#f87171' },
  { subject: 'Science', score: 82, color: '#34d399' },
  { subject: 'English', score: 68, color: '#fbbf24' },
  { subject: 'Social Studies', score: 72, color: '#60a5fa' },
  { subject: 'Computer Science', score: 88, color: '#34d399' },
];

const sampleTopicGaps: Record<string, string[]> = {
  Mathematics: [
    'Adding unlike fractions',
    'Equivalent fractions',
    'Fraction word problems',
    'Basic algebra',
  ],
  Science: [
    'Force and Motion',
    'Electricity',
    'Scientific reasoning',
    'Interpreting experiments',
  ],
  English: [
    'Grammar',
    'Reading comprehension',
    'Sentence construction',
    'Vocabulary',
  ],
  'Social Studies': [
    'Maps',
    'Geography concepts',
    'Historical timelines',
    'Civics',
  ],
  'Computer Science': [
    'Programming fundamentals',
    'Conditional statements',
    'Algorithms',
    'Debugging',
  ],
};

const initialPlans: RemedialPlan[] = [
  {
    id: 'plan-1',
    topic: 'Adding unlike fractions',
    subject: 'Mathematics',
    generatedOn: '18 Oct 2026',
    content: 'Practice Worksheet (10 questions)',
    format: 'Short Answer',
    questions: 10,
    status: 'Generated',
  },
  {
    id: 'plan-2',
    topic: 'Equivalent fractions',
    subject: 'Mathematics',
    generatedOn: '18 Oct 2026',
    content: 'Concept Practice (5 questions)',
    format: 'MCQ',
    questions: 5,
    status: 'Generated',
  },
  {
    id: 'plan-3',
    topic: 'Force and Motion',
    subject: 'Science',
    generatedOn: '19 Oct 2026',
    content: 'Science Practice (8 questions)',
    format: 'Short Answer',
    questions: 8,
    status: 'Generated',
  },
];

const questionFormats = [
  'MCQ',
  'One-word Answer',
  'Short Answer',
  'Long Answer',
];

function getGrade(score: number) {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 50) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

function getScoreClass(score: number) {
  if (score >= 70) return 'green';
  if (score >= 40) return 'orange';
  return 'red';
}

export default function StudentPerformanceDetails({
  student,
  subject = 'All Subjects',
  isClassTeacher = false,
  onNavigateToAnalytics,
  onNavigateToSubjectAnalytics,
}: Props) {
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'assessments'
    | 'topicPerformance'
    | 'answerAnalysis'
    | 'learningGaps'
    | 'remedialPlan'
  >('overview');

  const [plans, setPlans] = useState<RemedialPlan[]>(initialPlans);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('MCQ');
  const [questionCount, setQuestionCount] = useState(10);
  const [planError, setPlanError] = useState('');
  const [viewPlan, setViewPlan] = useState<RemedialPlan | null>(null);

  // Determine the teacher's subject scope before using it in state initializers.
  const subjectSpecific = subject !== 'All Subjects';

  const [selectedAnalysisSubject, setSelectedAnalysisSubject] = useState(
    subjectSpecific ? subject : 'Mathematics'
  );
  const [selectedAnalysisAssessmentId, setSelectedAnalysisAssessmentId] = useState('');

  const studentName = student?.name || 'R. Sharma';
  const rollNo = student?.rollNumber || '001';
  const admissionNo = student?.admissionNo || 'ADM001';
  const className = student?.className || 'Class 8';
  const sectionName = student?.sectionName || 'Section A';

  const availableTopics = useMemo(() => {
    if (subjectSpecific) {
      return sampleTopicGaps[subject] || [
        `Concepts requiring improvement in ${subject}`,
        `${subject} practice`,
      ];
    }

    return Object.values(sampleTopicGaps).flat();
  }, [subject, subjectSpecific]);

  const assessments = useMemo(() => {
    const actualStudentAssessments =
      student?.recentSubmissions?.map((submission, index) => ({
        id: submission.id || `student-${index}`,
        title: `${submission.subject} Assessment`,
        subject: submission.subject,
        subjectId: submission.subject
          .toUpperCase()
          .replace(/\s+/g, '-'),
        type: 'Assessment',
        dueDate: '—',
        submissionDate: submission.submittedAt
          ? new Date(submission.submittedAt).toLocaleDateString()
          : '—',
        score: submission.score,
        maxScore: submission.maxScore || 100,
        topic: submission.subject,
      })) || [];

    const source =
      actualStudentAssessments.length > 0
        ? actualStudentAssessments
        : sampleAssessments;

    return subjectSpecific
      ? source.filter((item) => item.subject === subject)
      : source;
  }, [student?.recentSubmissions, subject, subjectSpecific]);

  const normalizedAssessments = assessments.map((assessment) => ({
    ...assessment,
    percentage: Math.round(
      (assessment.score / Math.max(assessment.maxScore, 1)) * 100,
    ),
  }));

  const subjectAverage =
    normalizedAssessments.length > 0
      ? Math.round(
          normalizedAssessments.reduce(
            (total, assessment) => total + assessment.percentage,
            0,
          ) / normalizedAssessments.length,
        )
      : null;

  const overallAverage =
    student?.avgPercentage != null
      ? Math.round(student.avgPercentage)
      : 45;

  const displayAverage =
    subjectSpecific ? subjectAverage : overallAverage;

  const latestAssessment = normalizedAssessments.length
    ? [...normalizedAssessments].sort(
        (a, b) =>
          new Date(b.submissionDate).getTime() -
          new Date(a.submissionDate).getTime(),
      )[0]
    : null;

  const currentPlans = plans.filter(
    (plan) => !subjectSpecific || plan.subject === subject,
  );

  const analysisSubject = subjectSpecific ? subject : selectedAnalysisSubject;
  const analysisAssessments = assessments.filter(
    (assessment) => assessment.subject === analysisSubject,
  );
  const selectedAnalysisAssessment =
    analysisAssessments.find((assessment) => assessment.id === selectedAnalysisAssessmentId) ||
    analysisAssessments[0] || null;
  const answerAnalysisQuestions = selectedAnalysisAssessment
    ? buildMockAnswerAnalysis(selectedAnalysisAssessment)
    : [];
  const answerAnalysisSummary = answerAnalysisQuestions.reduce(
    (summary, question) => {
      summary.marksObtained += question.marksObtained;
      summary.maxMarks += question.maxMarks;
      summary[question.status] += 1;
      return summary;
    },
    { marksObtained: 0, maxMarks: 0, Correct: 0, 'Partially Correct': 0, Incorrect: 0, Unattempted: 0 },
  );

  // Show only answers that require teacher attention; fully correct answers stay in the KPIs.
  const answerAnalysisExceptions = answerAnalysisQuestions.filter(
    (question) => question.status !== 'Correct',
  );
  const learningGapTopics = Array.from(
    new Set(answerAnalysisExceptions.map((question) => question.topic)),
  );

  const openPlanModal = () => {
    setSelectedTopic(availableTopics[0] || '');
    setSelectedFormat('MCQ');
    setQuestionCount(10);
    setPlanError('');
    setShowPlanModal(true);
  };

  const generatePlan = () => {
    if (!selectedTopic) {
      setPlanError('Please select a topic gap.');
      return;
    }

    if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 100) {
      setPlanError('Choose between 1 and 100 questions.');
      return;
    }

    const newPlan: RemedialPlan = {
      id: `plan-${Date.now()}`,
      topic: selectedTopic,
      subject: subjectSpecific ? subject : 'All Subjects',
      generatedOn: new Date().toLocaleDateString(),
      content: `${selectedFormat} Assessment (${questionCount} questions)`,
      format: selectedFormat,
      questions: questionCount,
      status: 'Generated',
    };

    setPlans((previousPlans) => [newPlan, ...previousPlans]);
    setActiveTab('remedialPlan');
    setShowPlanModal(false);
    setPlanError('');
  };

  const assignPlan = (planId: string) => {
    setPlans((previousPlans) =>
      previousPlans.map((plan) =>
        plan.id === planId
          ? { ...plan, status: 'Assigned' }
          : plan,
      ),
    );
  };

  return (
    <div className="spd-main-container">
      <div className="spd-header-section">
        <nav className="spd-breadcrumb" aria-label="Breadcrumb">
          <button
            type="button"
            className="spd-breadcrumb-link"
            onClick={onNavigateToAnalytics}
          >
            Student Analytics
          </button>

          <ChevronRight size={14} />

          <button
            type="button"
            className="spd-breadcrumb-link"
            onClick={onNavigateToSubjectAnalytics}
          >
            Subject-wise Analytics
          </button>

          <ChevronRight size={14} />

          <span className="spd-current" aria-current="page">
            Individual Student Performance
          </span>
        </nav>

        <div className="spd-title-row">
          <div>
            <h1>Individual Student Performance</h1>
            <p>
              {subjectSpecific
                ? `${subject} performance and learning insights for ${studentName}.`
                : `Detailed performance and learning insights for ${studentName} across all subjects.`}
            </p>
          </div>

          <div className="spd-actions-row">
            <button
              type="button"
              className="spd-btn-primary"
              onClick={() => window.print()}
            >
              <Sparkles size={15} />
              Send Report
            </button>
          </div>
        </div>
      </div>

      {/* Student Profile */}
      <div className="spd-profile-banner">
        <div className="spd-profile-info">
          <div className="spd-avatar">
            {studentName
              .split(' ')
              .map((part) => part[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>

          <div>
            <h2>{studentName}</h2>
            <p>
              {className} - {sectionName} | Roll No: {rollNo} |
              Admission No: {admissionNo}
            </p>
          </div>
        </div>

        <div className="spd-quick-metrics">
          <div className="spd-metric-card">
            <span className="spd-metric-label">
              {subjectSpecific ? `${subject} Average` : 'Overall Average'}
            </span>
            <div className="spd-metric-val-row">
              <strong className="spd-text-orange">
                {displayAverage == null ? '—' : `${displayAverage}%`}
              </strong>
              {displayAverage != null && (
                <span className={`spd-grade-badge ${getGrade(displayAverage).toLowerCase()}`}>
                  {getGrade(displayAverage)}
                </span>
              )}
            </div>
          </div>

          <div className="spd-metric-card">
            <span className="spd-metric-label">Latest Assessment</span>
            <strong>{latestAssessment?.title || 'No assessment'}</strong>
          </div>

          <div className="spd-metric-card">
            <span className="spd-metric-label">Latest Score</span>
            <strong
              className={
                latestAssessment && latestAssessment.percentage < 40
                  ? 'spd-text-red'
                  : 'spd-text-orange'
              }
            >
              {latestAssessment
                ? `${latestAssessment.percentage}%`
                : '—'}
            </strong>
          </div>

          <div className="spd-metric-card alert">
            <span className="spd-metric-label">Performance Status</span>
            <strong className="spd-status-risk">
              <AlertTriangle size={15} />
              {displayAverage == null
                ? 'No Data'
                : displayAverage >= 85
                  ? 'Excelling'
                  : displayAverage >= 60
                    ? 'Average'
                    : 'At Risk'}
            </strong>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="spd-tabs-nav">
        <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={activeTab === 'assessments' ? 'active' : ''} onClick={() => setActiveTab('assessments')}>Assessments</button>
        <button className={activeTab === 'topicPerformance' ? 'active' : ''} onClick={() => setActiveTab('topicPerformance')}>Topic-wise Performance</button>
        <button className={activeTab === 'answerAnalysis' ? 'active' : ''} onClick={() => setActiveTab('answerAnalysis')}>Answer Analysis</button>
        <button className={activeTab === 'learningGaps' ? 'active' : ''} onClick={() => setActiveTab('learningGaps')}>Learning Gaps</button>
        <button className={activeTab === 'remedialPlan' ? 'active' : ''} onClick={() => setActiveTab('remedialPlan')}>Remedial Plan</button>
      </div>

      {activeTab === 'overview' && (
        <>
          <div className={`spd-overview-grid ${!isClassTeacher || subjectSpecific ? 'spd-subject-teacher-grid' : ''}`}>
            {/* Assessment Performance */}
            <div className="spd-panel">
              <div className="spd-panel-header">
                <div className="spd-panel-icon teal"><TrendingUp size={18} /></div>
                <div>
                  <h3>
                    {subjectSpecific
                      ? `${subject} Assessment Performance`
                      : 'Performance Across Assessments'}
                  </h3>
                  <p>Scores in completed assessments.</p>
                </div>
              </div>

              {normalizedAssessments.length ? (
                <div className="spd-bar-chart-container">
                  <div className="spd-chart-y">
                    <span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span>
                  </div>

                  <div className="spd-bars-row">
                    {normalizedAssessments.map((item) => (
                      <div className="spd-bar-col" key={item.id}>
                        <span className="spd-bar-score">{item.percentage}%</span>
                        <div
                          className={`spd-bar-fill ${getScoreClass(item.percentage)}`}
                          style={{ height: `${item.percentage}%` }}
                          title={`${item.title}: ${item.percentage}%`}
                        />
                        <span>{item.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="spd-empty-state">
                  No assessment data is available for {subject}.
                </p>
              )}
            </div>

            {/* Class teachers can compare every subject.
                Subject teachers see only the selected subject. */}
            {isClassTeacher && !subjectSpecific && (
              <div className="spd-panel">
                <div className="spd-panel-header">
                  <div className="spd-panel-icon blue"><BookOpen size={18} /></div>
                  <div>
                    <h3>Subject-wise Average Score</h3>
                    <p>{studentName}'s average across subjects.</p>
                  </div>
                </div>

                <div className="spd-subject-list">
                  <div className="spd-subject-table-header">
                    <span>Subject</span><span>Average Score</span>
                  </div>
                  {sampleSubjectScores.map((item) => (
                    <div className="spd-subject-row" key={item.subject}>
                      <span>{item.subject}</span>
                      <div className="spd-subject-progress-wrap">
                        <div className="spd-subject-track">
                          <div
                            className="spd-subject-fill"
                            style={{ width: `${item.score}%`, background: item.color }}
                          />
                        </div>
                        <strong>{item.score}%</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Learning Insights */}
            <div className="spd-panel spd-insights-panel">
              <div className="spd-panel-header">
                <div className="spd-panel-icon yellow"><Sparkles size={18} /></div>
                <div>
                  <h3>Paatam.ai Insights</h3>
                  <p>{subjectSpecific ? subject : 'All subjects'}</p>
                </div>
              </div>

              <div className="spd-insights-section">
                <h4 className="spd-green-title"><CheckCircle2 size={15} /> Strengths</h4>
                <ul>
                  <li>Completed assessment attempts are available for review.</li>
                  <li>Review successful answers to reinforce understanding.</li>
                </ul>
              </div>

              <div className="spd-insights-section">
                <h4 className="spd-red-title"><AlertTriangle size={15} /> Topics to Review</h4>
                <ul>
                  {availableTopics.slice(0, 4).map((topic) => (
                    <li key={topic}>{topic}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Recent Assessments */}
          <div className="spd-panel spd-table-panel">
            <div className="spd-panel-header space-between">
              <div>
                <h3>{subjectSpecific ? `${subject} Assessments` : 'Recent Assessments'}</h3>
                <p>Assessments attempted by this student.</p>
              </div>
              <button type="button" className="spd-text-link" onClick={() => setActiveTab('assessments')}>
                View all assessments <ArrowRight size={14} />
              </button>
            </div>

            <div className="spd-table-wrap">
              <table className="spd-table">
                <thead>
                  <tr>
                    <th>#</th><th>Assessment Title</th><th>Subject</th><th>Subject ID</th>
                    <th>Type</th><th>Due Date</th><th>Submission Date</th><th>Score</th><th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {normalizedAssessments.map((item, index) => (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td><strong>{item.title}</strong></td>
                      <td>{item.subject}</td>
                      <td>{item.subjectId}</td>
                      <td>{item.type}</td>
                      <td>{item.dueDate}</td>
                      <td>{item.submissionDate}</td>
                      <td><span className="spd-table-score">{item.percentage}%</span></td>
                      <td><span className={`spd-grade-badge ${getGrade(item.percentage).toLowerCase()}`}>{getGrade(item.percentage)}</span></td>
                    </tr>
                  ))}
                  {!normalizedAssessments.length && (
                    <tr><td colSpan={9}>No assessments found for this subject.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Feedback and Remedial Plan */}
          <div className="spd-bottom-grid">
            <div className="spd-panel">
              <div className="spd-panel-header">
                <div className="spd-panel-icon blue"><Sparkles size={18} /></div>
                <div><h3>Feedback & Learning Support</h3></div>
              </div>

              <div className="spd-feedback-box">
                <div className="spd-feedback-row">
                  <span className="spd-fb-label">Feedback</span>
                  <p>
                    Review the student's answers and identify the steps or concepts
                    that need additional practice.
                  </p>
                </div>
                <div className="spd-feedback-row">
                  <span className="spd-fb-label">Teaching Hint</span>
                  <p>
                    Choose a topic gap and generate a focused practice assessment
                    for the student.
                  </p>
                </div>
              </div>

              <button type="button" className="spd-panel-footer-link" onClick={() => setActiveTab('learningGaps')}>
                View learning gaps <ArrowRight size={14} />
              </button>
            </div>

            <div className="spd-panel">
              <div className="spd-panel-header space-between">
                <div className="spd-flex-group">
                  <div className="spd-panel-icon orange"><FileText size={18} /></div>
                  <div>
                    <h3>Remedial Plan & Practice</h3>
                    <p>
                      {subjectSpecific
                        ? `Practice plans for ${subject} learning gaps.`
                        : 'Practice plans for the selected student.'}
                    </p>
                  </div>
                </div>
                <button type="button" className="spd-btn-primary sm" onClick={openPlanModal}>
                  <Sparkles size={14} /> Generate New Plan
                </button>
              </div>

              <div className="spd-table-wrap">
                <table className="spd-remedial-table">
                  <thead>
                    <tr><th>Topic / Gap</th><th>Generated On</th><th>Content</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {currentPlans.map((plan) => (
                      <tr key={plan.id}>
                        <td><strong>{plan.topic}</strong><small className="spd-plan-subject">{plan.subject}</small></td>
                        <td>{plan.generatedOn}</td>
                        <td>{plan.content}</td>
                        <td>
                          <div className="spd-action-btns">
                            <button type="button" className="spd-sm-btn" onClick={() => setViewPlan(plan)}>View</button>
                            <button
                              type="button"
                              className="spd-sm-btn primary"
                              onClick={() => assignPlan(plan.id)}
                              disabled={plan.status === 'Assigned'}
                            >
                              {plan.status === 'Assigned' ? 'Assigned' : 'Assign'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!currentPlans.length && (
                      <tr><td colSpan={4}>No remedial plans have been generated for this subject.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="spd-note-box">
                <span>
                  Plans generated here are currently held in page state. Backend persistence
                  and assessment generation require the corresponding API integration.
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Other Tabs */}
      {activeTab === 'assessments' && (
        <div className="spd-panel spd-table-panel">
          <h3>{subjectSpecific ? `${subject} Assessments` : 'All Assessments'}</h3>
          <div className="spd-table-wrap">
            <table className="spd-table">
              <thead><tr><th>Assessment</th><th>Subject</th><th>Topic</th><th>Score</th><th>Grade</th></tr></thead>
              <tbody>
                {normalizedAssessments.map((item) => (
                  <tr key={item.id}>
                    <td>{item.title}</td><td>{item.subject}</td><td>{item.topic}</td>
                    <td>{item.percentage}%</td><td>{getGrade(item.percentage)}</td>
                  </tr>
                ))}
                {!normalizedAssessments.length && <tr><td colSpan={5}>No assessment data available.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'topicPerformance' && (
        <div className="spd-panel">
          <h3>{subjectSpecific ? `${subject} Topic-wise Performance` : 'Topic-wise Performance'}</h3>
          <div className="spd-topic-list">
            {availableTopics.map((topic) => (
              <div className="spd-topic-row" key={topic}>
                <span>{topic}</span>
                <span className="spd-topic-gap">Needs review</span>
                <button
                  type="button"
                  className="spd-sm-btn primary"
                  onClick={() => {
                    setSelectedTopic(topic);
                    setShowPlanModal(true);
                  }}
                >
                  Create practice
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'answerAnalysis' && (
        <div className="spd-answer-analysis">
          <div className="spd-panel spd-answer-filter-panel">
            <div className="spd-panel-header space-between">
              <div>
                <h3>Answer Analysis</h3>
                <p>Review the student's responses, marks and areas that need improvement.</p>
              </div>
              <span className="spd-mock-label">Demo data</span>
            </div>
            <div className="spd-answer-filters">
              <div className="spd-answer-filter-field">
                <label htmlFor="spd-analysis-subject">Subject</label>
                <select
                  id="spd-analysis-subject"
                  value={analysisSubject}
                  disabled={subjectSpecific}
                  onChange={(event) => {
                    setSelectedAnalysisSubject(event.target.value);
                    setSelectedAnalysisAssessmentId('');
                  }}
                >
                  {Array.from(new Set(assessments.map((item) => item.subject))).map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
              <div className="spd-answer-filter-field">
                <label htmlFor="spd-analysis-assessment">Assessment</label>
                <select
                  id="spd-analysis-assessment"
                  value={selectedAnalysisAssessment?.id || ''}
                  onChange={(event) => setSelectedAnalysisAssessmentId(event.target.value)}
                  disabled={!analysisAssessments.length}
                >
                  {analysisAssessments.map((item) => (
                    <option key={item.id} value={item.id}>{item.title}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {selectedAnalysisAssessment ? (
            <>
              <div className="spd-answer-summary-grid">
                <div className="spd-answer-summary-card spd-answer-summary-primary">
                  <span>Marks Obtained</span>
                  <strong>{answerAnalysisSummary.marksObtained} / {answerAnalysisSummary.maxMarks}</strong>
                  <small>{Math.round((answerAnalysisSummary.marksObtained / Math.max(answerAnalysisSummary.maxMarks, 1)) * 100)}% score</small>
                </div>
                <div className="spd-answer-summary-card">
                  <span>Total Questions</span>
                  <strong>{answerAnalysisQuestions.length}</strong>
                  <small>In this assessment</small>
                </div>
                <div className="spd-answer-summary-card">
                  <span>Correct</span>
                  <strong className="spd-answer-green">{answerAnalysisSummary.Correct}</strong>
                  <small>Fully answered</small>
                </div>
                <div className="spd-answer-summary-card">
                  <span>Partially Correct</span>
                  <strong className="spd-answer-orange">{answerAnalysisSummary['Partially Correct']}</strong>
                  <small>Some key points missing</small>
                </div>
                <div className="spd-answer-summary-card">
                  <span>Incorrect / Unattempted</span>
                  <strong className="spd-answer-red">{answerAnalysisSummary.Incorrect + answerAnalysisSummary.Unattempted}</strong>
                  <small>{answerAnalysisSummary.Incorrect} incorrect · {answerAnalysisSummary.Unattempted} unattempted</small>
                </div>
              </div>

              <div className="spd-panel spd-answer-question-panel">
                <div className="spd-panel-header space-between">
                  <div>
                    <h3>Questions Needing Attention</h3>
                    <p>{selectedAnalysisAssessment.title} · {selectedAnalysisAssessment.subject} · {answerAnalysisQuestions.length} questions assessed · {answerAnalysisExceptions.length} need attention</p>
                  </div>
                  <span className="spd-answer-total-marks">{answerAnalysisSummary.marksObtained}/{answerAnalysisSummary.maxMarks} marks</span>
                </div>
                {answerAnalysisExceptions.length > 0 ? (
                  <div className="spd-answer-question-list">
                    {answerAnalysisExceptions.map((item) => (
                      <article className="spd-answer-question-card" key={`${selectedAnalysisAssessment.id}-${item.questionNo}`}>
                        <div className="spd-answer-question-heading">
                          <div>
                            <span className="spd-answer-q-number">Q{item.questionNo}</span>
                            <span className="spd-answer-topic">{item.topic}</span>
                          </div>
                          <div className="spd-answer-result-group">
                            <span className={`spd-answer-status ${item.status.toLowerCase().replace(/\s+/g, '-')}`}>{item.status}</span>
                            <strong>{item.marksObtained}/{item.maxMarks} marks</strong>
                          </div>
                        </div>
                        <p className="spd-answer-question-text">{item.question}</p>
                        <div className="spd-answer-detail-grid">
                          <div className="spd-answer-detail student">
                            <span>Student's Answer</span>
                            <p>{item.status === 'Unattempted' ? 'No answer submitted.' : item.studentAnswer}</p>
                          </div>
                          <div className="spd-answer-detail missed">
                            <span>What was missed</span>
                            <p>{item.missed}</p>
                          </div>
                          <div className="spd-answer-detail expected">
                            <span>Expected Answer</span>
                            <p>{item.correctAnswer}</p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="spd-answer-all-correct">
                    <CheckCircle2 size={18} />
                    <span>All answers were fully correct. No question-level improvement notes are needed for this assessment.</span>
                  </div>
                )}
              </div>

              <div className="spd-paatam-insight-panel">
                <div className="spd-paatam-insight-heading">
                  <div className="spd-paatam-insight-icon"><Sparkles size={18} /></div>
                  <div>
                    <h3>Paatam.ai Insight</h3>
                    <p>Learning observations for the selected assessment</p>
                  </div>
                </div>
                <div className="spd-paatam-insight-content">
                  {answerAnalysisExceptions.length > 0 ? (
                    <>
                      <p>
                        In {selectedAnalysisAssessment.title}, the student needs attention on {answerAnalysisExceptions.length} of {answerAnalysisQuestions.length} questions. The main learning gaps are {learningGapTopics.join(', ')}. Focus the next revision session on understanding these concepts and applying the correct method independently.
                      </p>
                      <ul>
                        <li>{answerAnalysisSummary.Incorrect} incorrect and {answerAnalysisSummary.Unattempted} unattempted response(s) need concept review and guided practice.</li>
                        <li>{answerAnalysisSummary['Partially Correct']} partially correct response(s) need more complete reasoning, steps or key points.</li>
                        <li>After revision, give a short practice check on {learningGapTopics.slice(0, 2).join(' and ')} to confirm improvement.</li>
                      </ul>
                    </>
                  ) : (
                    <p>All responses in this assessment were fully correct. No specific learning gap was identified from this assessment.</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="spd-panel spd-empty-state">No assessments are available for the selected subject.</div>
          )}
        </div>
      )}

      {activeTab === 'learningGaps' && (
        <div className="spd-panel">
          <div className="spd-panel-header space-between">
            <div>
              <h3>{subjectSpecific ? `${subject} Learning Gaps` : 'Learning Gaps'}</h3>
              <p>Select a topic to prepare a focused remedial assessment.</p>
            </div>
          </div>
          <div className="spd-topic-list">
            {availableTopics.map((topic) => (
              <div className="spd-topic-row" key={topic}>
                <span>{topic}</span>
                <button
                  type="button"
                  className="spd-sm-btn primary"
                  onClick={() => {
                    setSelectedTopic(topic);
                    setShowPlanModal(true);
                  }}
                >
                  Generate plan
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'remedialPlan' && (
        <div className="spd-panel spd-table-panel">
          <div className="spd-panel-header space-between">
            <div>
              <h3>{subjectSpecific ? `${subject} Remedial Plans` : 'Remedial Plans'}</h3>
              <p>Generated practice assessments for learning gaps.</p>
            </div>
            <button type="button" className="spd-btn-primary sm" onClick={openPlanModal}>
              <Sparkles size={14} /> Generate New Plan
            </button>
          </div>
          <div className="spd-table-wrap">
            <table className="spd-remedial-table">
              <thead><tr><th>Topic / Gap</th><th>Generated On</th><th>Content</th><th>Actions</th></tr></thead>
              <tbody>
                {currentPlans.map((plan) => (
                  <tr key={plan.id}>
                    <td>{plan.topic}<small className="spd-plan-subject">{plan.subject}</small></td>
                    <td>{plan.generatedOn}</td><td>{plan.content}</td>
                    <td>
                      <div className="spd-action-btns">
                        <button className="spd-sm-btn" type="button" onClick={() => setViewPlan(plan)}>View</button>
                        <button className="spd-sm-btn primary" type="button" disabled={plan.status === 'Assigned'} onClick={() => assignPlan(plan.id)}>
                          {plan.status === 'Assigned' ? 'Assigned' : 'Assign'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!currentPlans.length && <tr><td colSpan={4}>No remedial plans available.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Generate Plan Modal */}
      {showPlanModal && (
        <div
          className="spd-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowPlanModal(false);
          }}
        >
          <section
            className="spd-plan-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="spd-plan-modal-title"
          >
            <div className="spd-modal-header">
              <div className="spd-modal-title-icon"><ClipboardList size={20} /></div>
              <div>
                <h2 id="spd-plan-modal-title">Generate Remedial Plan</h2>
                <p>Create a practice assessment for this student's learning gap.</p>
              </div>
              <button className="spd-modal-close" type="button" onClick={() => setShowPlanModal(false)} aria-label="Close modal">
                <X size={20} />
              </button>
            </div>

            <div className="spd-modal-body">
              <div className="spd-form-field">
                <label htmlFor="spd-plan-subject">Subject</label>
                <input
                  id="spd-plan-subject"
                  value={subjectSpecific ? subject : 'Select a subject in Subject-wise Analytics'}
                  readOnly
                />
                {!subjectSpecific && (
                  <small>For a subject-specific plan, open this student from a subject dashboard.</small>
                )}
              </div>

              <div className="spd-form-field">
                <label htmlFor="spd-plan-topic">Topic gap</label>
                <select
                  id="spd-plan-topic"
                  value={selectedTopic}
                  onChange={(event) => setSelectedTopic(event.target.value)}
                >
                  <option value="">Select a topic gap</option>
                  {availableTopics.map((topic) => (
                    <option key={topic} value={topic}>{topic}</option>
                  ))}
                </select>
              </div>

              <div className="spd-form-field">
                <label htmlFor="spd-plan-format">Assessment format</label>
                <select
                  id="spd-plan-format"
                  value={selectedFormat}
                  onChange={(event) => setSelectedFormat(event.target.value)}
                >
                  {questionFormats.map((format) => (
                    <option key={format} value={format}>{format}</option>
                  ))}
                </select>
              </div>

              <div className="spd-form-field">
                <label htmlFor="spd-plan-count">Number of questions</label>
                <input
                  id="spd-plan-count"
                  type="number"
                  min={1}
                  max={100}
                  value={questionCount}
                  onChange={(event) => setQuestionCount(Number(event.target.value))}
                />
                <small>Choose between 1 and 100 questions.</small>
              </div>

              {planError && <p className="spd-form-error">{planError}</p>}
            </div>

            <div className="spd-modal-footer">
              <button type="button" className="spd-btn-outline" onClick={() => setShowPlanModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="spd-btn-primary"
                onClick={generatePlan}
                disabled={!subjectSpecific}
              >
                <Sparkles size={15} /> Generate
              </button>
            </div>
          </section>
        </div>
      )}

      {/* View Plan Modal */}
      {viewPlan && (
        <div className="spd-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setViewPlan(null);
        }}>
          <section className="spd-plan-modal" role="dialog" aria-modal="true" aria-labelledby="spd-view-plan-title">
            <div className="spd-modal-header">
              <div className="spd-modal-title-icon"><FileText size={20} /></div>
              <div>
                <h2 id="spd-view-plan-title">Remedial Plan Details</h2>
                <p>{viewPlan.subject}</p>
              </div>
              <button className="spd-modal-close" type="button" onClick={() => setViewPlan(null)} aria-label="Close modal">
                <X size={20} />
              </button>
            </div>
            <div className="spd-modal-body">
              <p><strong>Topic gap:</strong> {viewPlan.topic}</p>
              <p><strong>Assessment format:</strong> {viewPlan.format}</p>
              <p><strong>Number of questions:</strong> {viewPlan.questions}</p>
              <p><strong>Generated on:</strong> {viewPlan.generatedOn}</p>
              <p><strong>Status:</strong> {viewPlan.status}</p>
              <div className="spd-note-box">
                This entry represents the generated plan configuration. Actual question content will be provided when the exam-generation API is connected.
              </div>
            </div>
            <div className="spd-modal-footer">
              <button type="button" className="spd-btn-outline" onClick={() => setViewPlan(null)}>Close</button>
              <button
                type="button"
                className="spd-btn-primary"
                disabled={viewPlan.status === 'Assigned'}
                onClick={() => {
                  assignPlan(viewPlan.id);
                  setViewPlan({ ...viewPlan, status: 'Assigned' });
                }}
              >
                {viewPlan.status === 'Assigned' ? 'Assigned' : 'Assign Plan'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
