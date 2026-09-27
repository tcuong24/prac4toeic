import { create } from 'zustand';

interface TestState {
  attemptId: number | null;
  testId: number | null;
  currentQuestionIndex: number;
  answers: Record<number, string>;
  flaggedQuestions: Set<number>;
  timeRemaining: number | null; // in seconds
  
  // Actions
  setAttemptId: (id: number) => void;
  setTestId: (id: number) => void;
  setCurrentQuestionIndex: (index: number) => void;
  setAnswer: (questionId: number, answer: string) => void;
  toggleFlag: (questionId: number) => void;
  setTimeRemaining: (seconds: number) => void;
  reset: () => void;
  initFromAttempt: (attemptId: number, testId: number, index: number, answers: Record<number, string>, startedAt: string, durationMinutes: number) => void;
}

export const useTestStore = create<TestState>((set) => ({
  attemptId: null,
  testId: null,
  currentQuestionIndex: 0,
  answers: {},
  flaggedQuestions: new Set(),
  timeRemaining: null,

  setAttemptId: (id) => set({ attemptId: id }),
  setTestId: (id) => set({ testId: id }),
  setCurrentQuestionIndex: (index) => set({ currentQuestionIndex: index }),
  
  setAnswer: (questionId, answer) => set((state) => ({
    answers: { ...state.answers, [questionId]: answer }
  })),
  
  toggleFlag: (questionId) => set((state) => {
    const newFlags = new Set(state.flaggedQuestions);
    if (newFlags.has(questionId)) {
      newFlags.delete(questionId);
    } else {
      newFlags.add(questionId);
    }
    return { flaggedQuestions: newFlags };
  }),
  
  setTimeRemaining: (seconds) => set({ timeRemaining: seconds }),
  
  reset: () => set({
    attemptId: null,
    testId: null,
    currentQuestionIndex: 0,
    answers: {},
    flaggedQuestions: new Set(),
    timeRemaining: null,
  }),

  initFromAttempt: (attemptId, testId, index, answers, startedAt, durationMinutes) => {
    // Calculate remaining time
    const start = new Date(startedAt).getTime();
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - start) / 1000);
    const totalSeconds = durationMinutes * 60;
    const remaining = Math.max(0, totalSeconds - elapsedSeconds);

    set({
      attemptId,
      testId,
      currentQuestionIndex: index,
      answers,
      timeRemaining: remaining,
    });
  }
}));
