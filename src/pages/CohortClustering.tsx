
import { useMemo, useState } from 'react';
import {
  Users,
  BookOpen,
  ChevronRight,
  Search,
  Info,
  BrainCircuit,
  Target,
  TrendingDown,
  CircleCheck,
} from 'lucide-react';
import './CohortClustering.css';

export type CohortStudent = {
  id: string;
  name: string;
  rollNumber: string;
  admissionNo: string;
  className: string;
  sectionName: string;
  avgPercentage: number;
  recentSubmissions: Array<{
    id: string;
    subject: string;
    score: number;
    maxScore: number;
    submittedAt: string;
  }>;
};

type Props = {
  subject: string;
  students: CohortStudent[];
  onBack: () => void;
};

type CohortDefinition = {
  id: string;
  name: string;
  status: string;
  type: 'red' | 'orange' | 'blue' | 'green';
  range: string;
  topics: string[];
  pattern: string;
  action: string;
};

const cohortDefinitions: CohortDefinition[] = [
  {
    id: 'intensive',
    name: 'Group 1 – Intensive Support',
    status: 'Needs intensive support',
    type: 'red',
    range: '0–40%',
    topics: ['Adding unlike fractions', 'Equivalent fractions'],
    pattern:
      'Students in this score band may need support with foundational steps. Review their answers to identify difficulties with common denominators, equivalent forms, and calculation steps.',
    action:
      'Provide teacher-led reteaching in a small group, worked examples, and short practice questions with immediate feedback.',
  },
  {
    id: 'targeted',
    name: 'Group 2 – Targeted Practice',
    status: 'Needs targeted practice',
    type: 'orange',
    range: '41–60%',
    topics: ['Simplifying fractions', 'Decimals'],
    pattern:
      'Students may understand parts of a method but apply rules inconsistently. Review incorrect responses to confirm the exact misconception.',
    action:
      'Use guided practice, step-by-step examples, and a short follow-up assessment.',
  },
  {
    id: 'reinforce',
    name: 'Group 3 – Concept Reinforcement',
    status: 'Needs concept reinforcement',
    type: 'blue',
    range: '61–75%',
    topics: ['Equivalent fractions', 'Algebra'],
    pattern:
      'Students may understand basic concepts but struggle when question wording, representations, or examples change.',
    action:
      'Assign mixed practice questions, explanation-based tasks, and misconception checks.',
  },
  {
    id: 'advanced',
    name: 'Group 4 – On Track / Advanced',
    status: 'Performing well',
    type: 'green',
    range: '76–100%',
    topics: ['Extension and application'],
    pattern:
      'Students are scoring strongly in the available subject assessment. Their understanding can be checked with multi-step and application-based questions.',
    action:
      'Provide extension activities, challenge questions, and opportunities to explain solutions to peers.',
  },
];

function getSubjectScore(
  student: CohortStudent,
  subject: string,
): number | null {
  const submission = [...(student.recentSubmissions || [])]
    .filter((item) => item.subject === subject && item.maxScore > 0)
    .sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() -
        new Date(a.submittedAt).getTime(),
    )[0];

  if (!submission) return null;

  return Math.round((submission.score / submission.maxScore) * 100);
}

export default function CohortClustering({
  subject,
  students,
  onBack,
}: Props) {
  const [search, setSearch] = useState('');

  const groupedStudents = useMemo(
    () =>
      cohortDefinitions.map((cohort) => {
        const members = students.filter((student) => {
          const score = getSubjectScore(student, subject);

          if (score === null) return false;
          if (cohort.id === 'intensive') return score <= 40;
          if (cohort.id === 'targeted') return score > 40 && score <= 60;
          if (cohort.id === 'reinforce') return score > 60 && score <= 75;

          return score > 75;
        });

        return { ...cohort, members };
      }),
    [students, subject],
  );

  const query = search.trim().toLowerCase();

  const studentsWithScores = students.filter(
    (student) => getSubjectScore(student, subject) !== null,
  );

  const studentsWithoutScores = students.filter(
    (student) => getSubjectScore(student, subject) === null,
  );

  const focusedSupportCount =
    groupedStudents[0].members.length +
    groupedStudents[1].members.length;

  return (
    <div className="cohort-page">
      <nav className="cohort-breadcrumb" aria-label="Breadcrumb">
        <button
            type="button"
            onClick={() => {
            window.location.href = '/?tab=analytics';
            }}
        >
            Student Analytics
        </button>

        <ChevronRight size={14} />

        <button type="button" onClick={onBack}>
            Subject-wise Analytics
        </button>

        <ChevronRight size={14} />

        <strong>Cohort Clustering</strong>
      </nav>


      <header className="cohort-page-header">
        <div>
          <span className="cohort-eyebrow">
            {subject} · Learning support
          </span>

          <h1>Cohort Clustering</h1>

          <p>
            Review student groups, learning needs, learning patterns,
            and suggested teaching actions for {subject}.
          </p>
        </div>
      </header>

      <section className="cohort-summary-grid">
        <article className="cohort-summary-card">
          <span className="cohort-summary-icon">
            <Users size={20} />
          </span>
          <div>
            <small>Students in subject view</small>
            <strong>{students.length}</strong>
          </div>
        </article>

        <article className="cohort-summary-card">
          <span className="cohort-summary-icon blue">
            <Target size={20} />
          </span>
          <div>
            <small>Students with subject scores</small>
            <strong>{studentsWithScores.length}</strong>
          </div>
        </article>

        <article className="cohort-summary-card">
          <span className="cohort-summary-icon amber">
            <TrendingDown size={20} />
          </span>
          <div>
            <small>Need focused support</small>
            <strong>{focusedSupportCount}</strong>
          </div>
        </article>

        <article className="cohort-summary-card">
          <span className="cohort-summary-icon purple">
            <BrainCircuit size={20} />
          </span>
          <div>
            <small>Support groups</small>
            <strong>{cohortDefinitions.length}</strong>
          </div>
        </article>
      </section>

      <div className="cohort-data-notice">
        <Info size={17} />
        <p>
          <strong>Data note:</strong> groups are currently formed using
          each student's latest available {subject} submission score.
          Topic suggestions and learning-pattern descriptions are
          illustrative, not verified AI findings. Actual topic-level
          grouping requires question-level results and learning-gap data.
        </p>
      </div>

      <section className="cohort-groups-section">
        <div className="cohort-section-heading">
          <div>
            <h2>Learning support groups</h2>
            <p>
              Explore each group's students, suggested topics, possible
              learning patterns, and recommended teaching actions.
            </p>
          </div>

          <label className="cohort-search">
            <Search size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search student name or admission no."
            />
          </label>
        </div>

        <div className="cohort-groups-grid">
          {groupedStudents.map((cohort) => {
            const filteredMembers = cohort.members.filter((student) =>
              `${student.name} ${student.rollNumber} ${student.admissionNo}`
                .toLowerCase()
                .includes(query),
            );

            return (
              <article
                className={`cohort-detail-card cohort-${cohort.type}`}
                key={cohort.id}
              >
                <div className="cohort-card-topline">
                  <span className="cohort-group-icon">
                    <Users size={20} />
                  </span>

                  <span
                    className={`cohort-status cohort-status-${cohort.type}`}
                  >
                    {cohort.status}
                  </span>
                </div>

                <h3>{cohort.name}</h3>

                <div className="cohort-card-metrics">
                  <strong>{cohort.members.length}</strong>
                  <span>students in this score band</span>
                  <span className="cohort-score-range">
                    {cohort.range}
                  </span>
                </div>

                <div className="cohort-detail-block">
                  <h4>
                    <BookOpen size={15} />
                    Suggested focus topics
                  </h4>

                  <div className="cohort-topic-chips">
                    {cohort.topics.map((topic) => (
                      <span key={topic}>{topic}</span>
                    ))}
                  </div>
                </div>

                <div className="cohort-detail-block">
                  <h4>
                    <BrainCircuit size={15} />
                    Pattern to investigate
                  </h4>
                  <p>{cohort.pattern}</p>
                </div>

                <div className="cohort-detail-block cohort-action-block">
                  <h4>
                    <CircleCheck size={15} />
                    Suggested teaching action
                  </h4>
                  <p>{cohort.action}</p>
                </div>

                <div className="cohort-members">
                  <h4>
                    Students in this group
                    <span>{filteredMembers.length}</span>
                  </h4>

                  {filteredMembers.length > 0 ? (
                    <ul>
                      {filteredMembers.map((student) => (
                        <li key={student.id}>
                          <span className="cohort-member-avatar">
                            {student.name
                              .trim()
                              .split(/\s+/)
                              .map((part) => part[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </span>

                          <span className="cohort-member-info">
                            <strong>{student.name}</strong>
                            <small>
                              Enrollment: {student.rollNumber || '—'}
                              {' · '}
                              Admission: {student.admissionNo || '—'}
                            </small>
                          </span>

                          <span className="cohort-member-score">
                            {getSubjectScore(student, subject)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="cohort-no-members">
                      {query
                        ? 'No students in this group match your search.'
                        : 'No students currently fall in this score band.'}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {studentsWithoutScores.length > 0 && (
        <section className="cohort-unscored-panel">
          <h2>Students awaiting subject assessment data</h2>
          <p>
            These students do not have a usable recorded submission for
            {` ${subject}`}, so they have not been assigned to a score-based
            group.
          </p>

          <div className="cohort-unscored-list">
            {studentsWithoutScores.map((student) => (
              <span key={student.id}>{student.name}</span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
