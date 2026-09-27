import { useQuery } from '@tanstack/react-query';
import type { ApiResponse } from '../types';

export interface ResultSummary {
  id: number;
  attemptId: number;
  testId: number;
  listeningScore: number;
  readingScore: number;
  totalScore: number;
  totalCorrect: number;
  totalQuestions: number;
  completedAt: string;
}

const API_BASE = import.meta.env.VITE_API_URL || '';

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(url, { ...options, headers });
};

export async function fetchMyResults(): Promise<ResultSummary[]> {
  const res = await fetchWithAuth(`${API_BASE}/api/results/my-results`);
  if (res.status === 429) {
    throw new Error('Bạn đang gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.');
  }
  if (!res.ok) throw new Error('Không thể tải lịch sử kết quả bài thi');
  const json: ApiResponse<ResultSummary[]> = await res.json();
  return json.data;
}

export async function fetchAttemptResultSummary(attemptId: number): Promise<ResultSummary> {
  const res = await fetchWithAuth(`${API_BASE}/api/results/attempts/${attemptId}`);
  if (res.status === 429) {
    throw new Error('Bạn đang gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.');
  }
  if (!res.ok) throw new Error('Không thể tải chi tiết kết quả');
  const json: ApiResponse<ResultSummary> = await res.json();
  return json.data;
}

export interface UserScoreStats {
  totalTests: number;
  highestScore: number;
  averageScore: number;
  latestScore: number;
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
}

export function computeUserScoreStats(results: ResultSummary[] = []): UserScoreStats {
  if (!results || results.length === 0) {
    return {
      totalTests: 0,
      highestScore: 0,
      averageScore: 0,
      latestScore: 0,
      totalQuestionsAnswered: 0,
      totalCorrectAnswers: 0,
    };
  }

  const totalTests = results.length;
  const highestScore = Math.max(...results.map(r => r.totalScore || 0));
  const latestScore = results[0]?.totalScore || 0;
  const totalScoreSum = results.reduce((acc, r) => acc + (r.totalScore || 0), 0);
  const averageScore = Math.round(totalScoreSum / totalTests);
  const totalQuestionsAnswered = results.reduce((acc, r) => acc + (r.totalQuestions || 0), 0);
  const totalCorrectAnswers = results.reduce((acc, r) => acc + (r.totalCorrect || 0), 0);

  return {
    totalTests,
    highestScore,
    averageScore,
    latestScore,
    totalQuestionsAnswered,
    totalCorrectAnswers,
  };
}

// React Query Hooks

export function useMyResultsQuery() {
  return useQuery({
    queryKey: ['my-results'],
    queryFn: fetchMyResults,
  });
}

export function useAttemptResultSummaryQuery(attemptId: number) {
  return useQuery({
    queryKey: ['result-summary', attemptId],
    queryFn: () => fetchAttemptResultSummary(attemptId),
    enabled: !!attemptId,
  });
}

export function useUserResultStatsQuery() {
  const { data: results, ...rest } = useMyResultsQuery();
  const stats = computeUserScoreStats(results || []);
  return { data: stats, rawResults: results, ...rest };
}
