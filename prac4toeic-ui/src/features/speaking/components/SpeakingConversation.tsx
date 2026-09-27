import { useEffect, useRef, useState } from 'react';
import type { TranscriptEntry } from '../hooks/useSpeakingSession';

interface SpeakingConversationProps {
  topic: string;
  state: 'connecting' | 'ready' | 'ended';
  transcript: TranscriptEntry[];
  isMicActive: boolean;
  isSpeaking?: boolean;
  onToggleMic: () => void;
  onSendMessage?: (text: string) => void;
  onEndSession: () => void;
}

const HELPER_PROMPTS = [
  "Can you ask me another question about this?",
  "Could you give me an example response?",
  "How can I express this idea in formal TOEIC English?",
  "Please repeat the previous question slowly.",
];

export function SpeakingConversation({
  topic,
  state,
  transcript,
  isMicActive,
  isSpeaking = false,
  onToggleMic,
  onSendMessage,
  onEndSession,
}: SpeakingConversationProps) {
  const [inputText, setInputText] = useState('');
  const [duration, setDuration] = useState(0);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Session duration timer
  useEffect(() => {
    if (state === 'ready') {
      timerRef.current = window.setInterval(() => setDuration(d => d + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (text.trim() && onSendMessage) {
      onSendMessage(text.trim());
      setInputText('');
    }
  };

  const lastAiMessage = [...transcript].reverse().find(t => t.role === 'assistant')?.text;

  return (
    <div className="flex-1 flex flex-col justify-between p-4 lg:p-6 z-10 max-w-5xl mx-auto w-full min-h-[85vh]">
      {/* Top Header Bar */}
      <header className="flex items-center justify-between border-b border-slate-200/60 pb-3 mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onEndSession}
            title="Quay lại danh sách chủ đề"
            className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all font-bold text-base cursor-pointer"
          >
            ‹
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm lg:text-base font-bold text-slate-900 tracking-tight">{topic}</h2>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-200/60 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>LIVE</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Phiên luyện nói 1:1 với AI • {transcript.length} lượt thoại</p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5">
          <div className="bg-white px-3 py-1 rounded-full border border-slate-200 shadow-xs text-xs font-mono font-bold text-slate-700">
            ⏱ {formatDuration(duration)}
          </div>

          <button
            onClick={onEndSession}
            className="px-3.5 py-1.5 rounded-full bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
          >
            <span>⏹</span>
            <span>Kết thúc</span>
          </button>
        </div>
      </header>

      {/* Main Conversation Container */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden mb-4">
        {/* Top AI Subtitle Banner + Integrated Mic Status (Combined block) */}
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
              <span>🤖 AI Assistant</span>
            </span>

            {/* Integrated Mic Status & Equalizer */}
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200/60">
              <span className="text-[11px]">{isSpeaking ? '🤖 AI đang nói...' : isMicActive ? '🎙️ Micro bật' : '🔇 Micro tắt'}</span>
              <div className="flex items-end gap-0.5 h-2.5">
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className={`w-0.5 rounded-full ${isSpeaking ? 'bg-pink-500' : isMicActive ? 'bg-indigo-500' : 'bg-slate-300'}`}
                    style={{
                      height: (isSpeaking || isMicActive) ? `${[40, 85, 60, 95][i - 1]}%` : '30%',
                      animation: (isSpeaking || isMicActive) ? `wave 0.4s ease-in-out infinite alternate` : 'none',
                      animationDelay: `${i * 0.08}s`
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Subtitle text */}
          <p className="text-xs lg:text-sm text-slate-800 font-medium leading-relaxed italic">
            {lastAiMessage ? `"${lastAiMessage}"` : "Đang chờ bắt đầu câu thoại từ AI..."}
          </p>
        </div>

        {/* Real-time Transcript Stream (Main Panel) */}
        <div className="flex-1 bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-2xl p-4 shadow-sm overflow-y-auto space-y-3 min-h-[320px] max-h-[500px]">
          {transcript.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <span className="text-3xl mb-2">💬</span>
              <p className="text-xs font-medium max-w-sm">
                Bắt đầu nói qua micro hoặc chọn gợi ý bên dưới để cuộc hội thoại hiển thị tại đây.
              </p>
            </div>
          ) : (
            transcript.map((entry, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {entry.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-xs mt-0.5">
                    🤖
                  </div>
                )}

                <div
                  className={`max-w-[82%] rounded-2xl p-3 text-xs leading-relaxed shadow-xs ${
                    entry.role === 'user'
                      ? 'bg-slate-900 text-white rounded-tr-xs'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                  }`}
                >
                  <div className="text-[10px] font-bold opacity-60 mb-0.5">
                    {entry.role === 'user' ? 'Bạn' : 'AI Coach'}
                  </div>
                  {entry.text}
                </div>

                {entry.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-xs mt-0.5">
                    👤
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={transcriptEndRef} />
        </div>

        {/* Horizontal Quick Helper Prompts */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {HELPER_PROMPTS.map((promptText, i) => (
            <button
              key={i}
              onClick={() => handleSend(promptText)}
              className="flex-shrink-0 text-[11px] bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-full shadow-xs transition-all hover:border-indigo-300 font-medium cursor-pointer"
            >
              💬 {promptText}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Command Input Bar */}
      <footer className="z-10">
        <div className="bg-white border border-slate-200 shadow-md rounded-2xl p-2.5 px-4 flex items-center gap-2.5">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Nói qua micro hoặc gõ câu trả lời của bạn..."
            className="flex-1 bg-transparent text-xs lg:text-sm text-slate-800 placeholder-slate-400 focus:outline-none font-medium"
          />

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Mic Toggle Button */}
            <button
              onClick={onToggleMic}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                isMicActive
                  ? 'bg-indigo-600 text-white shadow-indigo-500/20'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80'
              }`}
            >
              <span>{isMicActive ? '🎙️ Bật' : '🔇 Tắt'}</span>
            </button>

            {/* Send Button */}
            <button
              onClick={() => handleSend()}
              disabled={!inputText.trim()}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <span>Gửi</span>
              <span>↑</span>
            </button>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes wave {
          from { height: 20%; }
          to { height: 100%; }
        }
      `}</style>
    </div>
  );
}
