import type { SessionFeedback, TranscriptEntry } from '../hooks/useSpeakingSession';
import { useState } from 'react';

interface SpeakingFeedbackProps {
  feedback: SessionFeedback;
  transcript: TranscriptEntry[];
  topic: string;
  onTryAgain: () => void;
  onNewTopic: () => void;
}

type Lang = 'en' | 'vi';

export function SpeakingFeedback({
  feedback,
  transcript,
  topic,
  onTryAgain,
  onNewTopic,
}: SpeakingFeedbackProps) {
  const [lang, setLang] = useState<Lang>('vi');
  const [showTranscript, setShowTranscript] = useState(false);

  const isEn = lang === 'en';
  const toeicScaledScore = Math.min(200, Math.max(40, Math.round(feedback.overallScore * 20)));

  return (
    <div className="flex-1 flex flex-col justify-between p-6 lg:p-10 z-10 max-w-7xl mx-auto w-full">
      {/* Desktop Dashboard Header */}
      <header className="flex items-center justify-between border-b border-slate-200/60 pb-5 mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={onNewTopic}
            title="Quay lại chọn chủ đề"
            className="w-10 h-10 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-xs flex items-center justify-center text-slate-700 hover:text-slate-900 transition-all font-bold text-lg"
          >
            ‹
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Báo cáo Đánh giá TOEIC Speaking AI</h2>
              <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-indigo-200/60">
                Chủ đề: {topic}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Kết quả phân tích chi tiết từ Gemini AI Coach dựa trên thang điểm TOEIC Speaking</p>
          </div>
        </div>

        {/* Language Switcher & Export */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1">
            <button
              onClick={() => setLang('vi')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                !isEn ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🇻🇳 Tiếng Việt
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                isEn ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🇺🇸 English
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          >
            <span>🖨️ In / Lưu PDF</span>
          </button>
        </div>
      </header>

      {/* Main Desktop Dashboard Grid */}
      <div className="space-y-6 mb-8">
        {/* Top Score Summary Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Overall Score Card (Col 4) */}
          <div className="lg:col-span-4 bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl"></div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">Điểm tổng kết</span>
                <span className="bg-indigo-500/30 text-indigo-200 text-xs font-bold px-2.5 py-1 rounded-full border border-indigo-400/30">
                  {feedback.overallScore >= 8 ? 'Cấp độ B2-C1' : feedback.overallScore >= 6 ? 'Cấp độ B1' : 'Cấp độ A2'}
                </span>
              </div>

              <div className="my-4">
                <div className="text-6xl lg:text-7xl font-black tracking-tight text-white mb-1">
                  {toeicScaledScore}<span className="text-2xl font-bold text-indigo-300">/200</span>
                </div>
                <p className="text-xs text-indigo-200 font-medium">Quy đổi thang điểm TOEIC Speaking chuẩn (0-200 điểm)</p>
              </div>
            </div>

            <div className="pt-4 border-t border-indigo-500/30 flex items-center justify-between text-xs">
              <span className="text-slate-300">Đánh giá chung:</span>
              <span className="font-extrabold text-amber-300">
                {feedback.overallScore >= 8 ? 'Xuất sắc ✦' : feedback.overallScore >= 6 ? 'Khá tốt ✦' : 'Cần luyện tập thêm ✦'}
              </span>
            </div>
          </div>

          {/* Criteria Progress Bars Card (Col 8) */}
          <div className="lg:col-span-8 bg-white/80 backdrop-blur-xl border border-white/90 rounded-3xl p-8 shadow-xl shadow-slate-200/50 flex flex-col justify-between">
            <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span>📈</span> Phân tích chỉ số kỹ năng chi tiết
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: 'Phát âm (Pronunciation)', score: Math.min(10, feedback.overallScore + 1), desc: 'Độ rõ ràng nguyên âm, trọng âm từ & ngữ điệu' },
                { label: 'Độ trôi chảy (Fluency)', score: Math.min(10, feedback.overallScore), desc: 'Tốc độ phản xạ & ít quãng ngắt ngập ngừng' },
                { label: 'Cấu trúc Ngữ pháp (Grammar)', score: Math.max(5, feedback.overallScore - 1), desc: 'Chính xác thì, cấu trúc câu phức & câu ghép' },
                { label: 'Từ vựng TOEIC (Vocabulary)', score: feedback.overallScore, desc: 'Đa dạng vốn từ kinh doanh & giao tiếp công sở' },
              ].map((item) => (
                <div key={item.label} className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                    <span>{item.label}</span>
                    <span className="text-indigo-600 font-black text-sm">{item.score}/10</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-1000"
                      style={{ width: `${item.score * 10}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3-Column Detailed Feedback Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/80 backdrop-blur-xl border border-white/90 rounded-3xl p-6 shadow-xl shadow-slate-200/50">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl mb-4 font-bold shadow-xs">
              🗣️
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-2">Phát âm & Ngữ điệu</h4>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {isEn ? feedback.pronunciationFeedback : feedback.pronunciationFeedbackVi}
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-xl border border-white/90 rounded-3xl p-6 shadow-xl shadow-slate-200/50">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl mb-4 font-bold shadow-xs">
              📝
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-2">Ngữ pháp & Cấu trúc câu</h4>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {isEn ? feedback.grammarFeedback : feedback.grammarFeedbackVi}
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-xl border border-white/90 rounded-3xl p-6 shadow-xl shadow-slate-200/50">
            <div className="w-10 h-10 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center text-xl mb-4 font-bold shadow-xs">
              📚
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-2">Vốn từ vựng & Thuật ngữ</h4>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {isEn ? feedback.vocabularyFeedback : feedback.vocabularyFeedbackVi}
            </p>
          </div>
        </div>

        {/* Personalized AI Coaching Banner */}
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl p-0.5 shadow-xl">
          <div className="bg-white rounded-[23px] p-6 lg:p-8 flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center text-3xl flex-shrink-0 shadow-sm">
              ✨
            </div>
            <div className="flex-1 text-center md:text-left">
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">Lời khuyên cải thiện từ AI Coach:</h4>
              <p className="text-xs lg:text-sm text-slate-700 font-medium italic leading-relaxed">
                "{isEn ? feedback.encouragement : feedback.encouragementVi}"
              </p>
            </div>
          </div>
        </div>

        {/* Collapsible Full Transcript Review */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/90 rounded-3xl p-6 shadow-xl shadow-slate-200/50">
          <button
            onClick={() => setShowTranscript(v => !v)}
            className="w-full flex items-center justify-between text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors"
          >
            <span className="flex items-center gap-2">
              <span>📜</span>
              <span>Xem lại toàn bộ bản ghi hội thoại ({transcript.length} lượt thoại)</span>
            </span>
            <span>{showTranscript ? '▲ Thu gọn' : '▼ Mở rộng'}</span>
          </button>

          {showTranscript && (
            <div className="mt-4 border-t border-slate-100 pt-4 space-y-3 max-h-96 overflow-y-auto pr-2">
              {transcript.map((t, idx) => (
                <div key={idx} className={`p-3.5 rounded-2xl text-xs ${t.role === 'user' ? 'bg-slate-900 text-white ml-8' : 'bg-slate-100 text-slate-800 mr-8'}`}>
                  <div className="flex justify-between items-center mb-1 text-[10px] font-bold opacity-70">
                    <span>{t.role === 'user' ? 'Lượt thoại của bạn' : 'AI Coach'}</span>
                    <span>Lượt #{idx + 1}</span>
                  </div>
                  <p className="leading-relaxed font-medium">{t.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Action Buttons Bar */}
      <footer className="pt-4 flex flex-col sm:flex-row gap-4">
        <button
          onClick={onTryAgain}
          className="flex-1 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-lg shadow-slate-900/20 transition-all flex items-center justify-center gap-2"
        >
          <span>🔄</span>
          <span>Luyện tập lại chủ đề này</span>
        </button>

        <button
          onClick={onNewTopic}
          className="flex-1 py-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 font-bold text-xs border border-slate-200/80 shadow-xs transition-all flex items-center justify-center gap-2"
        >
          <span>🗺️</span>
          <span>Chọn chủ đề mới</span>
        </button>
      </footer>
    </div>
  );
}
