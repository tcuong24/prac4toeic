import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Clock, Send, Menu, PanelRightClose, PanelRightOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTestStore } from '../store/useTestStore';
import { useTestQuery, useSubmitMutation } from '../api/testApi';
import { ConfirmModal } from '@/components/ui/confirm-modal';

interface TestHeaderProps {
  onOpenSidebar?: () => void;
  showNavigator?: boolean;
  onToggleNavigator?: () => void;
}

export function TestHeader({ onOpenSidebar, showNavigator, onToggleNavigator }: TestHeaderProps) {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const { timeRemaining, setTimeRemaining, attemptId, answers, currentQuestionIndex,
    setCurrentQuestionIndex, } = useTestStore();
  const { data: testData } = useTestQuery(Number(testId));
  const submitMutation = useSubmitMutation();
  const handleNext = () => {
    if (testData?.questions && currentQuestionIndex < testData.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining(timeRemaining - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, setTimeRemaining]);

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isLowTime = timeRemaining !== null && timeRemaining < 300; // < 5 mins
  const totalQuestions = testData?.questions.length || 200;
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = totalQuestions - answeredCount;
  // Hàm thực hiện nộp bài
  const doSubmit = useCallback(() => {
    if (attemptId && !submitMutation.isPending) {
      submitMutation.mutate(attemptId, {
        onSuccess: () => {
          if (testId) {
            try {
              const mapStr = localStorage.getItem('completed_tests_map');
              const map = mapStr ? JSON.parse(mapStr) : {};
              map[testId] = attemptId;
              localStorage.setItem('completed_tests_map', JSON.stringify(map));
            } catch (e) {
              console.error('Failed to save completed test map:', e);
            }
          }
          setIsConfirmOpen(false);
          navigate(`/test/attempts/${attemptId}/result`);
        },
        onError: () => {
          alert('Có lỗi xảy ra khi nộp bài. Vui lòng thử lại.');
        }
      });
    }
  }, [attemptId, submitMutation, navigate]);

  // Tự động nộp bài khi đếm ngược về 0
  useEffect(() => {
    if (timeRemaining === 0 && attemptId) {
      alert('Đã hết thời gian làm bài! Hệ thống đang tự động nộp bài của bạn.');
      doSubmit();
    }
  }, [timeRemaining, attemptId, doSubmit]);

  const handleSubmit = () => {
    setIsConfirmOpen(true);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0  z-10 relative">
      <div className="flex items-center gap-3 md:gap-4">
        {(onToggleNavigator || onOpenSidebar) && (
          <button
            onClick={onToggleNavigator || onOpenSidebar}
            className="p-2 md:hidden text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            title="Danh sách câu hỏi"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h1 className="font-bold text-slate-800 text-lg hidden md:block">
          {testData?.title || 'TOEIC Test'}
        </h1>
        <div className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm font-medium">
          {answeredCount} / {totalQuestions} đã làm
        </div>
      </div>
      <div className='flex'>
        <button
          onClick={handlePrev}
          disabled={currentQuestionIndex === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Câu trước
        </button>
        <button
          onClick={handleNext}
          disabled={!testData?.questions || currentQuestionIndex >= testData.questions.length - 1}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full font-medium bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-colors "
        >
          Câu tiếp theo
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <div className="flex items-center gap-4 md:gap-5">
        <div className={`flex items-center gap-2 font-mono text-xl font-bold tracking-tight ${isLowTime ? 'text-rose-600' : 'text-slate-700'}`}>
          <Clock className={`w-5 h-5 ${isLowTime ? 'animate-pulse' : ''}`} />
          {formatTime(timeRemaining)}
        </div>

        {onToggleNavigator && (
          <button
            type="button"
            onClick={onToggleNavigator}
            className={`hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${showNavigator
              ? 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
            title={showNavigator ? 'Ẩn danh sách câu hỏi' : 'Hiện danh sách câu hỏi'}
          >
            {showNavigator ? (
              <PanelRightClose className="w-4 h-4 text-slate-500" />
            ) : (
              <PanelRightOpen className="w-4 h-4 text-slate-500" />
            )}
            <span>{showNavigator ? 'Ẩn danh sách' : 'Hiện danh sách'}</span>
          </button>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitMutation.isPending}
          className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2 rounded-full font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer "
        >
          {submitMutation.isPending ? 'Đang nộp...' : 'Nộp bài'}
          <Send className="w-4 h-4" />
        </button>
      </div>

      <ConfirmModal
        open={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={doSubmit}
        isLoading={submitMutation.isPending}
        loadingText="Đang nộp..."
        variant={unansweredCount > 0 ? "warning" : "default"}
        title={unansweredCount > 0 ? "Chưa hoàn thành tất cả câu hỏi" : "Xác nhận nộp bài thi"}
        description={
          unansweredCount > 0
            ? `Bạn vẫn còn ${unansweredCount} câu chưa trả lời. Bạn có chắc chắn muốn nộp bài bây giờ không?`
            : "Bạn đã trả lời tất cả các câu hỏi. Bạn có chắc chắn muốn kết thúc bài thi và nộp kết quả không?"
        }
        confirmText={unansweredCount > 0 ? "Vẫn nộp bài" : "Nộp bài ngay"}
        cancelText="Tiếp tục làm bài"
      >
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-100">
          <div className="flex-1 text-center border-r border-slate-200 pr-2">
            <span className="block font-semibold text-sm text-slate-800">{answeredCount}</span>
            <span>Đã làm</span>
          </div>
          <div className="flex-1 text-center">
            <span className={`block font-semibold text-sm ${unansweredCount > 0 ? 'text-amber-600 font-bold' : 'text-emerald-600'}`}>
              {unansweredCount}
            </span>
            <span>Chưa làm</span>
          </div>
        </div>
      </ConfirmModal>
    </header>
  );
}
