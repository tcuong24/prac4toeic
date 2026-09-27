import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, LayoutGrid, X } from 'lucide-react';
import { useTestStore } from '../store/useTestStore';
import { useTestQuery } from '../api/testApi';
import { useParams } from 'react-router-dom';

const PARTS = [
  { id: 1, title: 'Part 1', start: 1, end: 6 },
  { id: 2, title: 'Part 2', start: 7, end: 31 },
  { id: 3, title: 'Part 3', start: 32, end: 70 },
  { id: 4, title: 'Part 4', start: 71, end: 100 },
  { id: 5, title: 'Part 5', start: 101, end: 130 },
  { id: 6, title: 'Part 6', start: 131, end: 146 },
  { id: 7, title: 'Part 7', start: 147, end: 200 },
];

export interface QuestionNavigatorProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function QuestionNavigator({ onClose }: QuestionNavigatorProps) {
  const { testId } = useParams();
  const { currentQuestionIndex, setCurrentQuestionIndex, answers, flaggedQuestions } = useTestStore();
  const { data: testData } = useTestQuery(Number(testId));
  const [expandedParts, setExpandedParts] = useState<Set<number>>(new Set([1]));

  const togglePart = (partId: number) => {
    setExpandedParts(prev => {
      const next = new Set(prev);
      if (next.has(partId)) next.delete(partId);
      else next.add(partId);
      return next;
    });
  };

  // Build a map: question_number -> group key (audio_url or image_url or "solo-N")
  // This lets us highlight all questions in the same group as the current question
  const groupKeyByQNum = useMemo(() => {
    const map: Record<number, string> = {};
    if (!testData?.questions) return map;

    for (const q of testData.questions) {
      if (q.part === 3 || q.part === 4) {
        map[q.question_number] = q.audio_url || `solo-${q.question_number}`;
      } else if (q.part === 6 || q.part === 7) {
        map[q.question_number] = q.image_url || `solo-${q.question_number}`;
      } else {
        map[q.question_number] = `solo-${q.question_number}`;
      }
    }
    return map;
  }, [testData]);

  const currentQuestion = testData?.questions[currentQuestionIndex];
  const currentGroupKey = currentQuestion
    ? (groupKeyByQNum[currentQuestion.question_number] ?? null)
    : null;

  const navigateTo = (qNum: number) => {
    const index = testData?.questions.findIndex(q => q.question_number === qNum);
    if (index !== undefined && index !== -1) setCurrentQuestionIndex(index);
  };

  const getQuestionClasses = (qId?: number, qNum?: number) => {
    const isCurrent = qNum !== undefined && qNum === currentQuestion?.question_number;
    const isInCurrentGroup =
      !isCurrent &&
      qNum !== undefined &&
      currentGroupKey !== null &&
      !currentGroupKey.startsWith('solo-') &&
      groupKeyByQNum[qNum] === currentGroupKey;

    const isFlagged = qId !== undefined && flaggedQuestions.has(qId);
    const isAnswered = qId !== undefined && !!answers[qId];

    let colorClass = ' border-slate-200 text-slate-600 hover:border-slate-300';
    if (isFlagged) colorClass = 'bg-amber-100 border-amber-400 text-amber-700';
    else if (isAnswered) colorClass = 'bg-lime-100 ring-lime-400! border-lime-400 text-lime-700';
    else if (isInCurrentGroup) colorClass = 'bg-slate-100 border-slate-300 text-slate-700';

    const ringClass = isCurrent
      ? 'ring-1  ring-sky-400 ring-offset-2 scale-105 z-10 bg-blue-100 border-none'
      : isInCurrentGroup
      ? 'ring-1 border-none ring-sky-400 ring-offset-1'
      : '';

    return `relative h-8 rounded-md border text-sm font-medium flex items-center justify-center transition-all cursor-pointer ${colorClass} ${ringClass}`;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden select-none">
      {/* Navigator Header */}
      <div className="p-3.5 px-4 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-slate-500" />
          <h2 className="font-bold text-slate-800 text-sm">Danh sách câu hỏi</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            title="Thu gọn (Ẩn danh sách)"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 hidden md:block" />
            <X className="w-4 h-4 md:hidden" />
          </button>
        )}
      </div>

      {/* Questions list by parts */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {PARTS.map(part => {
          const isExpanded = expandedParts.has(part.id);

          return (
            <div key={part.id} className="space-y-2">
              <button
                onClick={() => togglePart(part.id)}
                className="w-full flex items-center justify-between text-sm font-semibold text-slate-700 p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                <span>{part.title}</span>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {isExpanded && (
                <div className="grid grid-cols-5 gap-2 px-2">
                  {Array.from({ length: part.end - part.start + 1 }).map((_, idx) => {
                    const qNum = part.start + idx;
                    const question = testData?.questions.find(q => q.question_number === qNum);

                    return (
                      <button
                        key={qNum}
                        onClick={() => navigateTo(qNum)}
                        className={getQuestionClasses(question?.id, qNum)}
                      >
                        {qNum}
                        {question?.id && flaggedQuestions.has(question.id) && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-white" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-xs flex flex-wrap gap-3 shrink-0">
        <div className="flex items-center gap-1.5 text-slate-600">
          <div className="w-3 h-3 rounded bg-lime-100 border border-lime-400" /> Đã làm
        </div>
        <div className="flex items-center gap-1.5 text-slate-600">
          <div className="w-3 h-3 rounded bg-amber-100 border border-amber-400" /> Đánh dấu
        </div>
        <div className="flex items-center gap-1.5 text-slate-600">
          <div className="w-3 h-3 rounded bg-slate-100 border border-slate-300" /> Cùng nhóm
        </div>
        <div className="flex items-center gap-1.5 text-slate-600">
          <div className="w-3 h-3 rounded bg-white border border-slate-300" /> Chưa làm
        </div>
      </div>
    </div>
  );
}

// Re-export as TestSidebar for backwards compatibility
export const TestSidebar = QuestionNavigator;
