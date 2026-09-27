import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search, Filter } from 'lucide-react';
import { useTestsQuery, useCurrentAttemptQuery, createAttempt, submitTest } from '../api/testApi';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { TestCard } from '../components/TestCard';
import { ConfirmModal } from '../../../components/ConfirmModal';

// ──────────────────────────────────────────────
// Popup state type
// ──────────────────────────────────────────────
interface SwitchTestPopup {
  open: boolean;
  targetTestId: number | null;
}

export const TestList: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { data: tests, isLoading, error } = useTestsQuery();
  const { data: currentAttempt } = useCurrentAttemptQuery();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'uncompleted'>('all');

  // Switch-test confirmation popup
  const [popup, setPopup] = useState<SwitchTestPopup>({ open: false, targetTestId: null });
  const [isSubmittingOld, setIsSubmittingOld] = useState(false);

  // Active in-progress attempt info
  const inProgressAttemptId =
    currentAttempt?.status === 'IN_PROGRESS'
      ? (currentAttempt.id ?? null)
      : null;
  const inProgressTestId =
    currentAttempt?.status === 'IN_PROGRESS'
      ? (currentAttempt.test_id ?? currentAttempt.testId ?? null)
      : null;

  // Load local completed map for completed status detection fallback
  const completedMap = useMemo(() => {
    try {
      const mapStr = localStorage.getItem('completed_tests_map');
      return mapStr ? (JSON.parse(mapStr) as Record<string | number, number>) : {};
    } catch {
      return {};
    }
  }, []);

  // ── Navigate to test (start or resume) ────────────────
  const goToTest = async (testId: number) => {
    try {
      await createAttempt(testId);
      navigate(`/test/${testId}`);
    } catch (err) {
      console.error('Failed to start test:', err);
      navigate(`/test/${testId}`);
    }
  };

  // ── Handle card "Vào làm bài" / "Tiếp tục làm bài" click ──
  const handleStartTest = async (testId: number) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/test/${testId}` } });
      return;
    }

    // If clicking the same in-progress test → just navigate
    if (inProgressTestId === testId) {
      navigate(`/test/${testId}`);
      return;
    }

    // If there's a different test in progress → show popup
    if (inProgressAttemptId !== null && inProgressTestId !== null) {
      setPopup({ open: true, targetTestId: testId });
      return;
    }

    // No conflict → start normally
    await goToTest(testId);
  };

  const handleViewResult = (attemptId: number, testId: number) => {
    if (!isAuthenticated) {
      navigate('/login', {
        state: { from: attemptId ? `/test/attempts/${attemptId}/result` : `/test/${testId}` },
      });
      return;
    }
    if (attemptId) {
      navigate(`/test/attempts/${attemptId}/result`);
    } else {
      navigate(`/test/${testId}`);
    }
  };

  // ── Popup: continue old test ────────────────────────────
  const handleContinueOld = () => {
    setPopup({ open: false, targetTestId: null });
    if (inProgressTestId !== null) {
      navigate(`/test/${inProgressTestId}`);
    }
  };

  // ── Popup: submit old test then start new ──────────────
  const handleEndOldAndStartNew = async () => {
    if (!popup.targetTestId) return;
    setIsSubmittingOld(true);
    try {
      if (inProgressAttemptId !== null) {
        await submitTest(inProgressAttemptId);
      }
    } catch (err) {
      console.error('Failed to submit old attempt:', err);
    } finally {
      setIsSubmittingOld(false);
      const targetId = popup.targetTestId;
      setPopup({ open: false, targetTestId: null });
      await goToTest(targetId);
    }
  };

  // ── Filter logic ────────────────────────────────────────
  const filteredTests = useMemo(() => {
    if (!tests) return [];
    return tests.filter((test) => {
      const matchesSearch = test.title.toLowerCase().includes(searchQuery.trim().toLowerCase());
      if (!matchesSearch) return false;

      const isDone = Boolean(
        test.completed ||
          test.is_completed ||
          completedMap[test.id] ||
          completedMap[String(test.id)]
      );

      if (statusFilter === 'completed') return isDone;
      if (statusFilter === 'uncompleted') return !isDone;
      return true;
    });
  }, [tests, searchQuery, statusFilter, completedMap]);

  // ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800 max-w-sm w-full">
          <h2 className="mb-2 text-xl font-bold text-rose-600">Đã xảy ra lỗi</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Không thể tải danh sách bài test. Vui lòng thử lại sau.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Switch-test Confirmation Popup ── */}
      <ConfirmModal
        open={popup.open}
        onClose={() => !isSubmittingOld && setPopup({ open: false, targetTestId: null })}
        onConfirm={handleEndOldAndStartNew}
        title="Bạn đang có bài thi dở"
        description={
          <>
            Bạn đang làm dở một bài thi khác. Bạn muốn làm gì với bài đó trước khi chuyển sang
            bài này?
          </>
        }
        confirmText="Kết thúc bài cũ & Làm bài mới"
        cancelText="Tiếp tục bài đang làm"
        variant="warning"
        isLoading={isSubmittingOld}
        loadingText="Đang nộp bài cũ..."
      >
        {/* Extra action: just cancel the popup and go back to old test */}
        <button
          type="button"
          onClick={handleContinueOld}
          disabled={isSubmittingOld}
          className="w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors dark:bg-blue-950/30 dark:border-blue-800/60 dark:text-blue-400 dark:hover:bg-blue-950/50 disabled:opacity-50"
        >
          Quay lại tiếp tục bài đang làm
        </button>
      </ConfirmModal>

      <div className="w-full flex-1 px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Main Content Area */}
        <div className="mx-auto max-w-7xl">
          {/* Compact Section Title & Description (18px, weight 500) */}
          <div className="mb-4">
            <h1 className="text-[18px] font-medium text-slate-900 dark:text-white">
              Danh sách đề thi TOEIC
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Chọn đề thi bên dưới để bắt đầu rèn luyện kỹ năng TOEIC chuẩn format quốc tế.
            </p>
          </div>

          {/* Search & Status Filter Controls */}
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm đề thi theo tên..."
                className="w-full rounded-xl border border-slate-200/80 bg-white pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-500"
              />
            </div>

            {/* Status Dropdown Filter */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as 'all' | 'completed' | 'uncompleted')
                  }
                  className="appearance-none rounded-xl border border-slate-200/80 bg-white pl-8 pr-8 py-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:focus:border-blue-500 cursor-pointer"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="completed">Đã làm</option>
                  <option value="uncompleted">Chưa làm</option>
                </select>
              </div>
            </div>
          </div>

          {/* Test Cards Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTests.map((test) => {
              const isInProgress = inProgressTestId === test.id;
              const isCompleted = Boolean(
                !isInProgress &&
                  (test.completed ||
                    test.is_completed ||
                    completedMap[test.id] ||
                    completedMap[String(test.id)])
              );
              const completedAttemptId =
                test.completed_attempt_id ??
                test.completedAttemptId ??
                test.attempt_id ??
                test.attemptId ??
                completedMap[test.id] ??
                completedMap[String(test.id)];

              return (
                <TestCard
                  key={test.id}
                  test={test}
                  isCompleted={isCompleted}
                  isInProgress={isInProgress}
                  completedAttemptId={completedAttemptId}
                  onStartTest={handleStartTest}
                  onViewResult={handleViewResult}
                />
              );
            })}

            {filteredTests.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 py-12 text-center bg-white/50 dark:bg-slate-900/50">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Không tìm thấy đề thi phù hợp.
                </p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
