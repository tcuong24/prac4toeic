import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import VocabApp from './VocabApp';
import { TestRunner } from './features/test/pages/TestRunner';
import { TestResult } from './features/test/pages/TestResult';
import { TestList } from './features/test/pages/TestList';
import { SpeakingPage } from './features/speaking/pages/SpeakingPage';
import { LoginPage } from './features/auth';
import { RootLayout } from './components/RootLayout';

import { ResultHistoryPage } from './features/test/pages/ResultHistoryPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Main layout routes wrapped with AppNav */}
          <Route element={<RootLayout />}>
            <Route path="/" element={<VocabApp />} />
            <Route path="/vocab" element={<VocabApp />} />
            <Route path="/flashcards" element={<VocabApp />} />
            <Route path="/quiz" element={<VocabApp />} />
            <Route path="/saved" element={<VocabApp />} />
            <Route path="/tests" element={<TestList />} />
            <Route path="/results" element={<ResultHistoryPage />} />
            <Route path="/speaking" element={<SpeakingPage />} />
            <Route path="/test/attempts/:attemptId/result" element={<TestResult />} />
          </Route>

          {/* Fullscreen / Special layout routes */}
          <Route path="/test/:testId" element={<TestRunner />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<LoginPage initialMode="register" />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
