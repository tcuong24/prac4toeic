import { useState } from 'react';

const TOPIC_CATEGORIES = [
  {
    category: 'TOEIC Workplace & Business',
    topics: [
      { id: 'job-interview', label: 'Job Interview', emoji: '💼', desc: 'Practice answering common TOEIC interview & background questions', difficulty: 'Intermediate' },
      { id: 'office', label: 'Office & Business', emoji: '🏢', desc: 'Manage team meetings, presentations, and client discussions', difficulty: 'Advanced' },
      { id: 'technology', label: 'Technology & AI', emoji: '💻', desc: 'Discuss software development, digital tools, and IT trends', difficulty: 'Advanced' },
    ]
  },
  {
    category: 'Daily Communication & Travel',
    topics: [
      { id: 'travel', label: 'Travel & Tourism', emoji: '✈️', desc: 'Book flights, make hotel reservations, and navigate airports', difficulty: 'Beginner' },
      { id: 'shopping', label: 'Shopping & Customer Service', emoji: '🛍️', desc: 'Inquire prices, deal with returns, and negotiate service terms', difficulty: 'Beginner' },
      { id: 'restaurant', label: 'Dining & Hospitality', emoji: '🍽️', desc: 'Order meals, arrange business dinners, and give service reviews', difficulty: 'Intermediate' },
      { id: 'free-talk', label: 'Free Conversation', emoji: '💬', desc: 'Open-ended practice on any topic with flexible AI feedback', difficulty: 'All Levels' },
    ]
  }
];

interface SpeakingTopicSelectProps {
  onTopicSelect: (topic: string) => void;
}

export function SpeakingTopicSelect({ onTopicSelect }: SpeakingTopicSelectProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const handleStart = (topicToStart?: string) => {
    const topic = topicToStart || 'Free Conversation';
    if (topic) onTopicSelect(topic);
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-4 lg:p-8 z-10 max-w-7xl mx-auto w-full">

      {/* Hero Input Section */}
      <div className="mb-6 space-y-3">
        <div>
          <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
            Chọn chủ đề luyện nói
          </h2>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {[
          { id: 'All', label: 'Tất cả chủ đề' },
          { id: 'TOEIC Workplace & Business', label: 'Workplace & Business' },
          { id: 'Daily Communication & Travel', label: 'Daily & Travel' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-slate-900 text-white shadow-xs font-semibold'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Topics Grid */}
      <div className="space-y-6 mb-8 flex-1">
        {TOPIC_CATEGORIES.filter(c => selectedCategory === 'All' || c.category === selectedCategory).map((catGroup) => (
          <div key={catGroup.category} className="space-y-2.5">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-0.5">{catGroup.category}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {catGroup.topics.map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleStart(t.label)}
                  className="group relative p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-indigo-300 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2.5"
                >
                  {/* Topic Difficulty Badge at top right */}
                  <span className="absolute top-3 right-3 text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200/60">
                    {t.difficulty}
                  </span>

                  <div>
                    {/* Icon + Title */}
                    <div className="flex items-center gap-2 mb-1.5 pr-14">
                      <span className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200/60 flex items-center justify-center text-sm flex-shrink-0">
                        {t.emoji}
                      </span>
                      <h5 className="font-bold text-xs lg:text-sm text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                        {t.label}
                      </h5>
                    </div>

                    {/* 1 line description */}
                    <p className="text-xs text-slate-500 leading-snug line-clamp-1">
                      {t.desc}
                    </p>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
                    <span className="text-[11px] text-slate-400 font-normal">⏱ ~5 phút</span>
                    <span className="group-hover:translate-x-0.5 transition-transform text-indigo-600 text-xs font-bold flex items-center gap-1">
                      Bắt đầu ➔
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
