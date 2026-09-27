import { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTestResultQuery } from '../api/testApi';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { ChevronLeft } from 'lucide-react';

export function TestResult() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/test/attempts/${attemptId}/result` } });
    }
  }, [isAuthenticated, navigate, attemptId]);

  const { data: result, isLoading, error } = useTestResultQuery(Number(attemptId));

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Đang phân tích kết quả...</div>;
  if (error || !result) return <div className="min-h-screen flex items-center justify-center text-rose-500">Lỗi tải kết quả thi.</div>;

  const totalScore = result.total_score ?? ((result.toeicScoreListening ?? 0) + (result.toeicScoreReading ?? 0));
  const listeningScore = result.listening_score ?? result.toeicScoreListening ?? 0;
  const readingScore = result.reading_score ?? result.toeicScoreReading ?? 0;
  const correctAnswers = result.correct_answers ?? result.totalCorrect ?? (result.details ? result.details.filter(d => (d.correct ?? d.is_correct)).length : 0);
  const wrongAnswers = result.wrong_answers ?? (result.details ? result.details.filter(d => {
    const isCorr = d.correct ?? d.is_correct;
    const selected = d.selected_answer ?? d.selectedAnswer;
    return !isCorr && Boolean(selected);
  }).length : 0);
  const unanswered = result.unanswered ?? (result.details ? result.details.filter(d => {
    const selected = d.selected_answer ?? d.selectedAnswer;
    return !selected;
  }).length : 0);

  return (
    <div className="min-h-full flex-1 bg-slate-50 p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link to="/" className="inline-flex items-center text-slate-500 hover:text-slate-900 font-medium transition-colors">
          <ChevronLeft className="w-5 h-5 mr-1" />
          Quay lại trang chủ
        </Link>

        <div className="bg-white rounded-2xl  border border-slate-200 p-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Kết Quả Bài Thi</h1>
          <div className="text-6xl font-black text-blue-600 mb-6">{totalScore}</div>

          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="text-sm text-slate-500 font-medium mb-1">Listening</div>
              <div className="text-2xl font-bold text-slate-800">{listeningScore}</div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="text-sm text-slate-500 font-medium mb-1">Reading</div>
              <div className="text-2xl font-bold text-slate-800">{readingScore}</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 mt-8 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span className="text-slate-600">Đúng: {correctAnswers}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500"></span>
              <span className="text-slate-600">Sai: {wrongAnswers}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-300"></span>
              <span className="text-slate-600">Bỏ qua: {unanswered}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl  border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-bold text-slate-800">Chi tiết đáp án</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {result.details?.map((detail, index) => {
              const qId = detail.question_id ?? detail.questionId ?? (index + 1);
              const isCorrect = detail.is_correct ?? detail.correct ?? false;
              const selectedAnswer = detail.selected_answer ?? detail.selectedAnswer;
              const correctAnswer = detail.correct_answer ?? detail.correctAnswer;

              return (
                <div key={qId} className="p-6 flex flex-col md:flex-row gap-6 hover:bg-slate-50/50 transition-colors">
                  <div className="w-16 shrink-0">
                    <div className="text-sm font-medium text-slate-400 mb-1">Câu</div>
                    <div className={`text-xl font-bold ${isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {qId}
                    </div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-4 text-sm">
                      {detail.part ? <span className="font-medium text-slate-600">Part {detail.part}</span> : null}
                      <div className="flex gap-4">
                        <span className="text-slate-500">Chọn: <strong className={selectedAnswer === correctAnswer ? "text-emerald-600" : "text-rose-600"}>{selectedAnswer || '-'}</strong></span>
                        <span className="text-slate-500">Đáp án: <strong className="text-emerald-600">{correctAnswer}</strong></span>
                      </div>
                    </div>
                    {detail.explanation && (
                      <div className="text-sm text-slate-600 bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
                        {detail.explanation}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
