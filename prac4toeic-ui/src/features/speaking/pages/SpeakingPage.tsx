import { useState } from 'react';
import { useSpeakingSession } from '../hooks/useSpeakingSession';
import { SpeakingTopicSelect } from '../components/SpeakingTopicSelect';
import { SpeakingConversation } from '../components/SpeakingConversation';
import { SpeakingFeedback } from '../components/SpeakingFeedback';

export function SpeakingPage() {
  const [topic, setTopic] = useState<string | null>(null);

  const {
    state,
    transcript,
    feedback,
    isMicActive,
    isSpeaking,
    error,
    startSession,
    endSession,
    toggleMic,
    sendMessage,
    resetSession,
  } = useSpeakingSession();

  const handleTopicSelect = (selectedTopic: string) => {
    setTopic(selectedTopic);
    startSession(selectedTopic);
  };

  const handleTryAgain = () => {
    resetSession();
    if (topic) startSession(topic);
  };

  const handleNewTopic = () => {
    resetSession();
    setTopic(null);
  };

  // Render current active step/phase view
  const renderView = () => {
    // Error state
    if (error) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center z-10 my-auto">
          <div className="w-16 h-16 rounded-full bg-amber-100 border border-amber-200 text-amber-600 flex items-center justify-center text-3xl mb-4 shadow-sm">
            ⚠️
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Thông báo</h3>
          <p className="text-xs text-slate-600 mb-6 leading-relaxed max-w-sm">{error}</p>
          <button
            onClick={handleNewTopic}
            className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md hover:bg-slate-800 transition-all"
          >
            Quay lại chọn chủ đề
          </button>
        </div>
      );
    }

    // Phase 1: Topic selection
    if (state === 'idle' && !topic) {
      return <SpeakingTopicSelect onTopicSelect={handleTopicSelect} />;
    }

    // Phase 3: Feedback Report
    if (state === 'feedback' && feedback) {
      return (
        <SpeakingFeedback
          feedback={feedback}
          transcript={transcript}
          topic={topic ?? ''}
          onTryAgain={handleTryAgain}
          onNewTopic={handleNewTopic}
        />
      );
    }

    // Phase 2: Live Conversation (connecting → ready → ended)
    if (topic && (state === 'connecting' || state === 'ready' || state === 'ended')) {
      return (
        <SpeakingConversation
          topic={topic}
          state={state as 'connecting' | 'ready' | 'ended'}
          transcript={transcript}
          isMicActive={isMicActive}
          isSpeaking={isSpeaking}
          onToggleMic={toggleMic}
          onSendMessage={sendMessage}
          onEndSession={endSession}
        />
      );
    }

    return <SpeakingTopicSelect onTopicSelect={handleTopicSelect} />;
  };

  return (
    <div className="min-h-full flex-1  flex flex-col relative overflow-x-hidden font-sans">
      {/* Ambient Pastel Background Glow Orbs */}
      

      {/* Main Full-Bleed Desktop App Workspace */}
      <div className="w-full flex-1 flex flex-col relative z-10 w-full">
        {renderView()}
      </div>
    </div>
  );
}
