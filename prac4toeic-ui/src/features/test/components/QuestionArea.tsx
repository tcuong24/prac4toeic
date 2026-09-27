import { useParams } from 'react-router-dom';
import { useTestStore } from '../store/useTestStore';
import { useTestQuery, useAnswerMutation } from '../api/testApi';
import { Flag } from 'lucide-react';
import type { TestQuestion } from '../types';
import { Button } from '@/components/ui/button';

// Reusable answer option component
function AnswerOptions({
  question,
  answers,
  onSelect,
  timeRemaining,
}: {
  question: TestQuestion;
  answers: Record<number, string>;
  onSelect: (qId: number, optId: string) => void;
  timeRemaining: number | null;
}) {
  return (
    <div className="grid gap-4">
      {question.options.map(opt => {
        const isSelected = answers[question.id] === opt.id;
        return (
          <Button
            disabled={timeRemaining === 0}
            key={opt.id}
            type="button"
            onClick={() => onSelect(question.id, opt.id)}
            className={`
              w-full text-left flex border items-center gap-4 p-2.5 rounded-lg cursor-pointer transition-all hover:bg-blue-50 select-none
              ${isSelected
                ? 'border-slate-600 bg-blue-50/50'
                : 'border-slate-200 text-slate-500 bg-white'
              }
            `}
          >
            <div className={`
              flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shrink-0 border transition-colors
              ${isSelected
                ? 'bg-blue-500 text-white border-blue-500'
                : 'border-slate-200 text-slate-500 bg-white'
              }
            `}>
              {opt.id}
            </div>
            <div className="font-medium text-slate-900 flex-1">{opt.text}</div>
          </Button>
        );
      })}
    </div>
  );
}

export function QuestionArea() {
  const { testId } = useParams();
  const {
    currentQuestionIndex,
    setCurrentQuestionIndex,
    attemptId,
    answers,
    setAnswer,
    flaggedQuestions,
    toggleFlag,
    timeRemaining
  } = useTestStore();
  const { data: testData } = useTestQuery(Number(testId));
  const answerMutation = useAnswerMutation();

  if (!testData || !testData.questions || testData.questions.length === 0) {
    return <div className="flex-1 flex items-center justify-center">Không có dữ liệu câu hỏi.</div>;
  }

  const question = testData.questions[currentQuestionIndex];
  if (!question) return null;

  const handleSelectAnswer = (qId: number, optionId: string) => {
    if (!attemptId) return;
    setAnswer(qId, optionId);
    answerMutation.mutate({ attemptId, questionId: qId, selectedAnswer: optionId });
  };


  // For Part 6 & 7: find all questions that share the same passage (image_url)
  const isPassagePart = question.part === 6 || question.part === 7;
  const passageGroupKey = question.image_url || null;
  const groupQuestions: TestQuestion[] = isPassagePart && passageGroupKey
    ? testData.questions.filter(q => q.image_url === passageGroupKey)
    : [question];

  // For Part 3 & 4: find all questions sharing the same audio  
  const isAudioPart = question.part === 3 || question.part === 4;
  const audioGroupKey = question.audio_url || null;
  const audioGroupQuestions: TestQuestion[] = isAudioPart && audioGroupKey
    ? testData.questions.filter(q => q.audio_url === audioGroupKey)
    : [];

  const isGrouped = isPassagePart && groupQuestions.length > 1;
  const isAudioGrouped = isAudioPart && audioGroupQuestions.length > 1;

  // Top bar label
  const topBarLabel = isGrouped
    ? `Part ${question.part} | Câu ${groupQuestions[0].question_number}–${groupQuestions[groupQuestions.length - 1].question_number}`
    : isAudioGrouped
      ? `Part ${question.part} | Câu ${audioGroupQuestions[0].question_number}–${audioGroupQuestions[audioGroupQuestions.length - 1].question_number}`
      : `Part ${question.part} | Câu ${question.question_number}`;

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
      {/* Top Navigation Bar */}
      <div className="h-14 border-b border-slate-100 flex items-center justify-between px-6 shrink-0">
        <div className="font-semibold text-slate-800">{topBarLabel}</div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">

        {/* ===== Part 6 & 7: Two-column layout with ALL group questions ===== */}
        {isGrouped ? (
          <div className="h-full flex flex-col md:flex-row min-h-0">
            {/* Left: Scrollable passage / image */}
            <div className="w-full md:w-1/2 h-64 md:h-full overflow-y-auto p-6 md:p-10 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50 min-h-0">
              {question.image_url && (
                <div className="flex justify-center mb-6">
                  <img
                    src={question.image_url}
                    alt="Reading Passage"
                    className="max-w-full rounded-lg  border border-slate-200"
                  />
                </div>
              )}
              {question.passage && (
                <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {question.passage}
                </div>
              )}
            </div>

            {/* Right: Questions column — ALL questions in this group */}
            <div className="w-full md:w-1/2 h-full overflow-y-auto p-6 md:p-8 space-y-8 bg-white min-h-0">
              {groupQuestions.map(q => {
                const isCurrent = q.question_number === question.question_number;
                return (
                  <div
                    key={q.id}
                    id={`question-${q.question_number}`}
                    className="scroll-mt-4 rounded-2xl"
                  >
                    {/* Question number badge + text */}
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 mt-0.5 ${isCurrent ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                        {q.question_number}
                      </span>
                      {q.text && (
                        <h3 className="text-base font-medium text-slate-900 leading-snug">{q.text}</h3>
                      )}
                      <Button
                        onClick={() => toggleFlag(question.id)}
                        disabled={timeRemaining === 0}
                        variant='ghost'
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${flaggedQuestions.has(question.id)
                          ? 'bg-amber-50! text-amber-50! hover:bg-amber-100!'
                          : 'text-slate-500! hover:bg-slate-100!'
                          }`}
                      >
                        <Flag className={`w-4 h-4 ${flaggedQuestions.has(question.id) ? 'fill-amber-500' : ''}`} />

                      </Button>
                    </div>

                    <AnswerOptions
                      question={q}
                      answers={answers}
                      timeRemaining={timeRemaining}
                      onSelect={(qId, optId) => {
                        handleSelectAnswer(qId, optId);
                        // Navigate to this question in the store
                        const idx = testData.questions.findIndex(tq => tq.id === qId);
                        if (idx !== -1) setCurrentQuestionIndex(idx);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

        ) : (
          /* ===== All other parts: Single scrollable column ===== */
          <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-10 md:pt-4">
            <div className="max-w-3xl mx-auto space-y-4">

              {/* Audio Player (Part 3, 4 — show once for the group) */}
              {question.audio_url && (
                <div className=" p-4  flex items-center justify-center">
                  <audio controls src={question.audio_url} className="w-full max-w-md" />
                </div>
              )}

              {/* Image (Part 1, Part 6 single, etc.) */}
              {question.image_url && (
                <div className="flex justify-center">
                  <img
                    src={question.image_url}
                    alt="Question Context"
                    className="max-w-full rounded-lg  border border-slate-200"
                  />
                </div>
              )}

              {/* Passage text */}
              {question.passage && (
                <div className="prose prose-slate max-w-none bg-slate-50 p-6 rounded-2xl border border-slate-100 text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {question.passage}
                </div>
              )}

              {/* For Part 3 & 4: show all group questions together */}
              {isAudioGrouped ? (
                <div className="space-y-4">
                  {audioGroupQuestions.map(q => {
                    const isCurrent = q.question_number === question.question_number;
                    return (
                      <div
                        key={q.id}
                        className="rounded-2xl"
                      >
                        <div className="flex items-start gap-3 mb-4">
                          <span className={`inline-flex border  border-slate-300 items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 mt-0.5 ${isCurrent ? 'bg-blue-400 text-white' : ' text-slate-600'
                            }`}>
                            {q.question_number}
                          </span>
                          {q.text && (
                            <h3 className="text-base font-medium text-slate-900 leading-snug">{q.text}</h3>
                          )}
                        </div>
                        <AnswerOptions
                          question={q}
                          answers={answers}
                          timeRemaining={timeRemaining}
                          onSelect={(qId, optId) => {
                            handleSelectAnswer(qId, optId);
                            const idx = testData.questions.findIndex(tq => tq.id === qId);
                            if (idx !== -1) setCurrentQuestionIndex(idx);
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Single question (Part 1, 2, 5 or ungrouped) */
                <>
                  {question.text && (
                    <h3 className="text-lg font-medium text-slate-900">
                      {question.question_number}. {question.text}
                    </h3>
                  )}
                  <AnswerOptions question={question} answers={answers} timeRemaining={timeRemaining} onSelect={handleSelectAnswer} />
                </>
              )}

            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
    </div>
  );
}
