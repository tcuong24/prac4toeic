import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TestAttempt, TestData, TestResult, ApiResponse, TestSummary } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';


const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(url, { ...options, headers });
};
export async function fetchTests(): Promise<TestSummary[]> {
  const res = await fetchWithAuth(`${API_BASE}/api/tests`);
  if (!res.ok) throw new Error('Failed to fetch tests');
  const json: ApiResponse<TestSummary[]> = await res.json();
  return json.data;
}

export async function fetchTest(testId: number): Promise<TestData> {
  const res = await fetchWithAuth(`${API_BASE}/api/tests/${testId}`);
  if (!res.ok) throw new Error('Failed to fetch test data');
  const json: ApiResponse<TestData> = await res.json();
  return json.data;
}

export async function createAttempt(testId: number): Promise<number> {
  const res = await fetchWithAuth(`${API_BASE}/api/tests/${testId}/attempts`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to create attempt');
  const json: ApiResponse<{ id?: number; attemptId?: number }> = await res.json();
  const attemptId = json.data?.id ?? json.data?.attemptId;
  if (typeof attemptId !== 'number') {
    throw new Error('Failed to parse attempt id');
  }
  return attemptId;
}

export async function fetchCurrentAttempt(): Promise<TestAttempt | null> {
  const res = await fetchWithAuth(`${API_BASE}/api/tests/attempts/current`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch current attempt');
  const json: ApiResponse<TestAttempt> = await res.json();
  return json.data;
}

export async function patchAnswer(attemptId: number, questionId: number, answerId: string): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/api/tests/attempts/${attemptId}/answers`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question_id: questionId, answer_id: answerId })
  });
  if (!res.ok) throw new Error('Failed to save answer');
}

export async function logActivity(attemptId: number, eventType: string, metadata?: unknown): Promise<void> {
  await fetchWithAuth(`${API_BASE}/api/tests/attempts/${attemptId}/activity-log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_type: eventType, metadata })
  });
}

export async function submitTest(attemptId: number): Promise<TestResult> {
  const res = await fetchWithAuth(`${API_BASE}/api/tests/attempts/${attemptId}/submit`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to submit test');
  const json: ApiResponse<TestResult> = await res.json();
  return json.data;
}

export async function fetchTestResult(attemptId: number): Promise<TestResult> {
  const res = await fetchWithAuth(`${API_BASE}/api/tests/attempts/${attemptId}/result`);
  if (!res.ok) throw new Error('Failed to fetch test result');
  const json: ApiResponse<TestResult> = await res.json();
  return json.data;
}

// React Query Hooks

export function useTestsQuery() {
  return useQuery({
    queryKey: ['tests'],
    queryFn: fetchTests,
  });
}

export function useTestQuery(testId: number) {
  return useQuery({
    queryKey: ['test', testId],
    queryFn: () => fetchTest(testId),
    enabled: !!testId,
  });
}

export function useCurrentAttemptQuery() {
  return useQuery({
    queryKey: ['attempt', 'current'],
    queryFn: fetchCurrentAttempt,
    retry: false,
  });
}

export function useAnswerMutation() {
  return useMutation({
    mutationFn: (data: { attemptId: number; questionId: number; selectedAnswer: string }) =>
      patchAnswer(data.attemptId, data.questionId, data.selectedAnswer),
    // Optimistic updates are handled in Zustand store before calling this
  });
}

export function useSubmitMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attemptId: number) => submitTest(attemptId),
    onSuccess: (_, attemptId) => {
      queryClient.invalidateQueries({ queryKey: ['attempt', attemptId, 'result'] });
      queryClient.invalidateQueries({ queryKey: ['attempt', 'current'] });
    }
  });
}

export function useTestResultQuery(attemptId: number) {
  return useQuery({
    queryKey: ['attempt', attemptId, 'result'],
    queryFn: () => fetchTestResult(attemptId),
    enabled: !!attemptId,
  });
}
