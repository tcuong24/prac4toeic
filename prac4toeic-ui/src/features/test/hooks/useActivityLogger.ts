import { useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { logActivity } from '../api/testApi';

export function useActivityLogger(attemptId: number | null) {
  const mutation = useMutation({
    mutationFn: (data: { attemptId: number; eventType: string; metadata?: unknown }) =>
      logActivity(data.attemptId, data.eventType, data.metadata)
  });

  const isLeavingRef = useRef(false);

  useEffect(() => {
    if (!attemptId) return;

    const handleVisibilityChange = () => {
      const eventType = document.visibilityState === 'hidden' ? 'tab_blur' : 'tab_focus';
      mutation.mutate({ attemptId, eventType });
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isLeavingRef.current) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome
        return '';
      }
    };

    const handleUnload = () => {
      // Use sendBeacon or sync fetch if needed for perfect reliability, 
      // but a standard mutation is often enough for non-critical logs.
      mutation.mutate({ attemptId, eventType: 'tab_closed' });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, [attemptId, mutation]);

  const allowLeave = () => {
    isLeavingRef.current = true;
  };

  return { allowLeave };
}
