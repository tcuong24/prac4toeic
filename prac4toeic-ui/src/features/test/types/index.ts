export interface TestOption {
  id: string; // "A", "B", "C", "D"
  text: string;
}

export interface TestQuestion {
  id: number;
  part: number;
  question_number: number;
  audio_url?: string;
  image_url?: string;
  passage?: string;
  text?: string;
  options: TestOption[];
  group_id?: number;
}

export interface TestSummary {
  id: number;
  title: string;
  completed?: boolean;
  is_completed?: boolean;
  attemptId?: number;
  totalQuestions?: number;
  completedAttemptId?: number;
  attempt_id?: number;
  completed_attempt_id?: number;
  duration_minutes?: number;
  durationMinutes?: number;
  total_questions: number;
}

export interface TestData {
  id: number;
  title: string;
  duration_minutes?: number;
  durationMinutes?: number;
  questions: TestQuestion[];
}

export interface TestAttempt {
  id: number;
  test_id?: number;
  testId?: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  started_at?: string;
  startedAt?: string;
  current_question_index?: number;
  currentQuestionIndex?: number;
  duration_minutes?: number;
  durationMinutes?: number;
  remaining_seconds?: number;
  remainingSeconds?: number;
  answers?: Record<number, string>;
}

export interface TestResultDetail {
  question_id?: number;
  questionId?: number;
  part?: number;
  is_correct?: boolean;
  correct?: boolean;
  selected_answer?: string | null;
  selectedAnswer?: string | null;
  correct_answer?: string;
  correctAnswer?: string;
  explanation?: string | null;
}

export interface TestResult {
  attempt_id?: number;
  attemptId?: number;
  listening_score?: number;
  toeicScoreListening?: number;
  reading_score?: number;
  toeicScoreReading?: number;
  total_score?: number;
  totalCorrect?: number;
  totalQuestions?: number;
  correct_answers?: number;
  wrong_answers?: number;
  unanswered?: number;
  details: TestResultDetail[];
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}
