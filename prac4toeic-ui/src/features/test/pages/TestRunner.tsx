import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PanelRightOpen, LogOut } from 'lucide-react';
import { useTestQuery, useCurrentAttemptQuery, createAttempt } from '../api/testApi';
import { useTestStore } from '../store/useTestStore';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useActivityLogger } from '../hooks/useActivityLogger';
import { TestHeader } from '../components/TestHeader';
import { QuestionNavigator } from '../components/QuestionNavigator';
import { QuestionArea } from '../components/QuestionArea';
import { ConfirmModal } from '../../../components/ConfirmModal';

export function TestRunner() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [pendingNavTarget, setPendingNavTarget] = useState<string | null>(null);
  const isCreatingRef = useRef(false);
  const [createAttemptError, setCreateAttemptError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/test/${testId}` } });
    }
  }, [isAuthenticated, navigate, testId]);

  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });
  const [showNavigator, setShowNavigator] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { data: testData, isLoading: isLoadingTest, error: testError } = useTestQuery(Number(testId));
  const { data: currentAttempt, isLoading: isLoadingAttempt } = useCurrentAttemptQuery();
  const { attemptId, initFromAttempt } = useTestStore();

  useActivityLogger(attemptId);

  // ── Confirm leave helper ───────────────────────────────────────────────────
  const confirmLeave = useCallback((destination: string) => {
    setPendingNavTarget(destination);
    setLeaveConfirmOpen(true);
  }, []);

  // ── Intercept browser back/forward (popstate) ─────────────────────────────
  useEffect(() => {
    if (!attemptId) return;
    // Push a sentinel entry so we can catch the back-press
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      // Re-push sentinel to prevent actual navigation
      window.history.pushState(null, '', window.location.href);
      confirmLeave('back');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [attemptId, confirmLeave]);

  // ── Warn on browser close / refresh / external navigation ─────────────────
  useEffect(() => {
    if (!attemptId) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [attemptId]);

  // ── Handle confirmed leave ─────────────────────────────────────────────────
  const handleConfirmLeave = useCallback(() => {
    setLeaveConfirmOpen(false);
    if (pendingNavTarget && pendingNavTarget !== 'back') {
      navigate(pendingNavTarget);
    } else {
      // For back: go back 2 steps (undo our sentinel + the original back)
      navigate(-2);
    }
    setPendingNavTarget(null);
  }, [pendingNavTarget, navigate]);

  const handleCancelLeave = useCallback(() => {
    setLeaveConfirmOpen(false);
    setPendingNavTarget(null);
  }, []);

  // ── Init / resume attempt ──────────────────────────────────────────────────
  useEffect(() => {
    if (isLoadingTest || isLoadingAttempt) return;
    if (!testData) return;

    const numericTestId = Number(testId);
    const attemptTestId = currentAttempt?.test_id ?? currentAttempt?.testId;

    if (currentAttempt && attemptTestId === numericTestId) {
      // Auto-resume existing attempt for this test
      if (currentAttempt.id !== attemptId) {
        initFromAttempt(
          currentAttempt.id,
          attemptTestId,
          currentAttempt.current_question_index ?? currentAttempt.currentQuestionIndex ?? 0,
          currentAttempt.answers || {},
          currentAttempt.started_at ?? currentAttempt.startedAt ?? new Date().toISOString(),
          testData.duration_minutes ?? testData.durationMinutes ?? 120
        );
      }
    } else if (!attemptId && !isCreatingRef.current && !createAttemptError) {
      // Create new attempt
      isCreatingRef.current = true;
      createAttempt(numericTestId)
        .then(newAttemptId => {
          initFromAttempt(
            newAttemptId,
            numericTestId,
            0,
            {},
            new Date().toISOString(),
            testData.duration_minutes ?? testData.durationMinutes ?? 120
          );
        })
        .catch(err => {
          console.error("Failed to create attempt", err);
          setCreateAttemptError("Không thể tạo lượt thi mới.");
        })
        .finally(() => {
          isCreatingRef.current = false;
        });
    }
  }, [testData, currentAttempt, isLoadingTest, isLoadingAttempt, testId, attemptId, initFromAttempt, createAttemptError]);

  const isInitializing = isLoadingTest || isLoadingAttempt || (!attemptId && !testError && !createAttemptError);

  if (isInitializing) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Đang tải bài thi...</div>;
  }

  if (testError || createAttemptError) {
    return <div className="min-h-screen flex items-center justify-center text-rose-500">{createAttemptError || "Lỗi tải bài thi."}</div>;
  }

  return (
    <>
      {/* ── Leave-test confirmation ── */}
      <ConfirmModal
        open={leaveConfirmOpen}
        onClose={handleCancelLeave}
        onConfirm={handleConfirmLeave}
        title="Thoát bài thi?"
        description="Bài thi đang diễn ra. Nếu thoát, tiến độ của bạn sẽ được lưu lại và bạn có thể tiếp tục sau."
        confirmText="Thoát"
        cancelText="Ở lại"
        variant="warning"
        icon={<LogOut className="w-6 h-6 text-amber-600" />}
      />

      <div className="h-screen overflow-hidden bg-slate-50 flex flex-col font-sans ">
        <TestHeader
          showNavigator={showNavigator}
          onToggleNavigator={() => setShowNavigator(prev => !prev)}
          onOpenSidebar={() => setShowNavigator(true)}
        />

        <div
          className="flex-1 min-h-0 grid overflow-hidden transition-[grid-template-columns]
            duration-300 ease-in-out relative"
          style={{
            gridTemplateColumns: isDesktop
              ? (showNavigator ? 'minmax(0, 1fr) 320px' : 'minmax(0, 1fr) 0px')
              : 'minmax(0, 1fr)'
          }}
        >
          {/* Left column: Main question area */}
          <main className="min-w-0 h-full min-h-0 overflow-hidden flex flex-col bg-white">
            <QuestionArea />
          </main>

          {/* Right column: QuestionNavigator (Push layout on desktop) */}
          {isDesktop ? (
            <aside
              className={`h-full border-l border-slate-200 bg-white transition-all duration-300 ease-in-out overflow-hidden flex flex-col min-h-0 ${showNavigator
                  ? 'w-80 opacity-100'
                  : 'w-0 opacity-0 pointer-events-none border-l-0'
                }`}
            >
              <div className="w-80 h-full flex flex-col shrink-0 min-w-[320px] min-h-0">
                <QuestionNavigator onClose={() => setShowNavigator(false)} />
              </div>
            </aside>
          ) : (
            <>
              {showNavigator && (
                <div
                  className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-xs transition-opacity"
                  onClick={() => setShowNavigator(false)}
                />
              )}
              <aside
                className={`
                  fixed inset-x-0 bottom-0 h-[80vh] rounded-t-3xl z-50 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out md:hidden
                  ${showNavigator ? 'translate-y-0' : 'translate-y-full pointer-events-none'}
                `}
              >
                <QuestionNavigator onClose={() => setShowNavigator(false)} />
              </aside>
            </>
          )}

          {/* Floating edge tab to reopen QuestionNavigator when collapsed on desktop */}
          {isDesktop && !showNavigator && (
            <button
              onClick={() => setShowNavigator(true)}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-30 bg-white border border-slate-200 border-r-0 rounded-l-xl py-3 px-2 shadow-md hover:bg-slate-50 hover:pl-2.5 transition-all flex flex-col items-center gap-2 text-xs font-semibold text-slate-700 group cursor-pointer"
              title="Mở danh sách câu hỏi"
            >
              <PanelRightOpen className="w-4 h-4 text-slate-500 group-hover:text-blue-600 transition-colors" />
              <span className="[writing-mode:vertical-rl] tracking-wider text-[11px] text-slate-600 group-hover:text-slate-900">
                Danh sách câu
              </span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
