import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUserResultStatsQuery } from '../api/resultApi';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { Trophy, Calendar, Award, ChevronRight, AlertTriangle, RefreshCw, BarChart2, Target, CheckCircle2 } from 'lucide-react';

export function ResultHistoryPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { data: stats, rawResults: results, isLoading, error, refetch } = useUserResultStatsQuery();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/results' } });
    }
  }, [isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="text-slate-600 font-medium text-sm">Đang tải lịch sử kết quả bài thi...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Không thể tải dữ liệu</h3>
        <p className="text-sm text-slate-500 max-w-md">{(error as Error).message || 'Đã có lỗi xảy ra.'}</p>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-full flex-1 bg-slate-50/50 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 text-white shadow-xs">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Lịch Sử Làm Bài Thi</h1>
              <p className="text-xs text-slate-500 mt-0.5">Theo dõi tiến trình tăng điểm TOEIC qua các lượt làm bài</p>
            </div>
          </div>
          <Link
            to="/tests"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-semibold transition-all shadow-xs"
          >
            Luyện đề mới
          </Link>
        </div>

        {/* Overview Stats Bar */}
        {results && results.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>Điểm cao nhất</span>
              </div>
              <div className="text-2xl font-black text-slate-900">{stats.highestScore} <span className="text-xs font-normal text-slate-400">/ 990</span></div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
                <BarChart2 className="w-4 h-4 text-blue-500" />
                <span>Điểm trung bình</span>
              </div>
              <div className="text-2xl font-black text-slate-900">{stats.averageScore} <span className="text-xs font-normal text-slate-400">/ 990</span></div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
                <Target className="w-4 h-4 text-indigo-500" />
                <span>Bài thi hoàn thành</span>
              </div>
              <div className="text-2xl font-black text-slate-900">{stats.totalTests} <span className="text-xs font-normal text-slate-400">đề</span></div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Tổng câu trả lời đúng</span>
              </div>
              <div className="text-2xl font-black text-slate-900">{stats.totalCorrectAnswers} <span className="text-xs font-normal text-slate-400">/ {stats.totalQuestionsAnswered}</span></div>
            </div>
          </div>
        )}

        {/* Results List */}
        {!results || results.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
            <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">Chưa có lượt làm bài nào</h3>
            <p className="text-xs text-slate-500 mt-1 mb-6">Hãy hoàn thành một đề thi để xem kết quả và phân tích chi tiết tại đây.</p>
            <Link
              to="/tests"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs"
            >
              Xem danh sách đề thi
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {results.map((res) => {
              const formattedDate = new Date(res.completedAt).toLocaleDateString('vi-VN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={res.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 hover:border-blue-200 transition-all shadow-xs hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                        Đề #{res.testId}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formattedDate}
                      </span>
                    </div>

                    <div className="flex items-center gap-6 pt-1">
                      <div>
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tổng điểm</div>
                        <div className="text-2xl font-black text-blue-600">{res.totalScore} <span className="text-xs font-normal text-slate-400">/ 990</span></div>
                      </div>

                      <div className="h-8 w-px bg-slate-100" />

                      <div className="flex items-center gap-4 text-xs text-slate-600">
                        <div>
                          <span className="text-slate-400 font-medium">Listening:</span>{' '}
                          <strong className="text-slate-800">{res.listeningScore}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium">Reading:</span>{' '}
                          <strong className="text-slate-800">{res.readingScore}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium">Số câu đúng:</span>{' '}
                          <strong className="text-emerald-600">{res.totalCorrect} / {res.totalQuestions}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Link
                    to={`/test/attempts/${res.attemptId}/result`}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-xs font-semibold text-slate-700 hover:text-blue-700 transition-all shrink-0 cursor-pointer"
                  >
                    <span>Xem kết quả chi tiết</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
