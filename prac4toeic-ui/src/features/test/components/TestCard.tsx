import React from 'react';
import { Clock, BookOpen, PlayCircle, CheckCircle2, RotateCcw, Loader } from 'lucide-react';
import type { TestSummary } from '../types';

export interface TestCardProps {
  test: TestSummary;
  isCompleted: boolean;
  isInProgress?: boolean;
  completedAttemptId?: number;
  onStartTest: (testId: number) => void;
  onViewResult: (attemptId: number, testId: number) => void;
}

export const TestCard: React.FC<TestCardProps> = ({
  test,
  isCompleted,
  isInProgress = false,
  completedAttemptId,
  onStartTest,
  onViewResult,
}) => {
  const duration = test.duration_minutes ?? test.durationMinutes ?? 120;
  const questionCount = test.total_questions ?? test.totalQuestions ?? 200;

  const handleButtonClick = () => {
    if (isCompleted && completedAttemptId) {
      onViewResult(completedAttemptId, test.id);
    } else {
      onStartTest(test.id);
    }
  };

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm">
      {/* In-progress ring accent */}
      {isInProgress && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-blue-400/60 ring-offset-0" />
      )}

      <div>
        {/* Top Header: Badge Test #N & Status Badge */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
            Test #{test.id}
          </span>

          {/* Priority: in-progress > completed */}
          {isInProgress ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60">
              <Loader className="h-3 w-3 text-blue-500 dark:text-blue-400 animate-spin" />
              Đang làm
            </span>
          ) : isCompleted ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60">
              <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              Đã làm
            </span>
          ) : null}
        </div>

        {/* Test Title (14px, weight 500) */}
        <h3 className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2 mb-2">
          {test.title}
        </h3>

        {/* Duration & Questions (12px, single row, secondary color) */}
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>{duration} phút</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <div className="flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5 text-slate-400" />
            <span>{questionCount} câu</span>
          </div>
        </div>
      </div>

      {/* Main Full-width Action Button */}
      <button
        onClick={handleButtonClick}
        className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
          isInProgress
            ? 'bg-green-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-xs'
            : isCompleted
            ? 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-750'
            : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-xs'
        }`}
      >
        {isInProgress ? (
          <>
            <PlayCircle className="h-4 w-4" />
            <span>Tiếp tục làm bài</span>
          </>
        ) : isCompleted ? (
          <>
            <RotateCcw className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <span>Xem lại kết quả</span>
          </>
        ) : (
          <>
            <PlayCircle className="h-4 w-4" />
            <span>Vào làm bài</span>
          </>
        )}
      </button>
    </div>
  );
};
