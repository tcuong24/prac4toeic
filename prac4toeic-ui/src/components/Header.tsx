import { BookOpen, Layers, CheckSquare, Bookmark, Sparkles } from "lucide-react"

export type TabType = 'cards' | 'flashcard' | 'quiz' | 'saved'

interface HeaderProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  totalCount: number
  savedCount: number
}

export function Header({
  activeTab,
  onTabChange,
  totalCount,
  savedCount,
}: HeaderProps) {
  const navItems = [
    { id: 'cards' as TabType, label: 'Từ vựng', icon: BookOpen },
    { id: 'flashcard' as TabType, label: 'Flashcards', icon: Layers },
    { id: 'quiz' as TabType, label: 'Trắc nghiệm', icon: CheckSquare },
    { id: 'saved' as TabType, label: `Đã lưu (${savedCount})`, icon: Bookmark },
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-md shadow-blue-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-900">
                  Prac4TOEIC
                </h1>
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200/50">
                  Vocab
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Luyện từ vựng TOEIC với API thực tế ({totalCount} từ)
              </p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            {navItems.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? "bg-white text-blue-600 shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>
    </header>
  )
}
