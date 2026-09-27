import { useState, useEffect, useMemo, useCallback } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "motion/react"
import {
  Search,
  BookOpen,
  Filter,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Bookmark,
} from "lucide-react"

import type { VocabularyItem } from "@/types/vocabulary"
import { fetchVocabularies, searchVocabularies } from "@/services/vocabApi"
import { VocabularyCard } from "@/components/VocabularyCard"
import { VocabularyDetailModal } from "@/components/VocabularyDetailModal"
import { FlashcardViewer } from "@/components/FlashcardViewer"
import { VocabularyQuiz } from "@/components/VocabularyQuiz"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const KNOWN_TOPICS = [
  { id: 2, name: "Contracts (Hợp đồng)" },
  { id: 4, name: "Marketing (Tiếp thị)" },
  { id: 5, name: "Customer Service (CSKH)" },
  { id: 10, name: "Travel (Du lịch & Công tác)" },
]

export default function VocabApp() {
  const location = useLocation()
  const navigate = useNavigate()

  const activeTab = useMemo<'cards' | 'flashcard' | 'quiz' | 'saved'>(() => {
    const path = location.pathname.toLowerCase()
    if (path === '/flashcards') return 'flashcard'
    if (path === '/quiz') return 'quiz'
    if (path === '/saved') return 'saved'
    return 'cards'
  }, [location.pathname])

  const [items, setItems] = useState<VocabularyItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTopicId, setSelectedTopicId] = useState<number | undefined>(undefined)
  const [selectedPos, setSelectedPos] = useState<string>("all")

  // Pagination
  const [page, setPage] = useState(0)
  const [pageSize] = useState(18)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)

  // Bookmarks (persisted in localStorage)
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem("toeic_bookmarks")
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Selected item for modal
  const [selectedItem, setSelectedItem] = useState<VocabularyItem | null>(null)

  // Save bookmarks
  const toggleBookmark = (id: number) => {
    setBookmarkedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      try {
        localStorage.setItem("toeic_bookmarks", JSON.stringify(next))
      } catch (e) {
        console.error(e)
      }
      return next
    })
  }

  // Load vocabularies
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      if (searchQuery.trim()) {
        const results = await searchVocabularies(searchQuery)
        setItems(results)
        setTotalElements(results.length)
        setTotalPages(1)
        setPage(0)
      } else {
        const res = await fetchVocabularies(page, pageSize, selectedTopicId)
        setItems(res.content || [])
        setTotalPages(res.totalPages || 1)
        setTotalElements(res.totalElements || 0)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể kết nối đến API Vocabulary"
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, page, pageSize, selectedTopicId])

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData()
    }, 350)
    return () => clearTimeout(timer)
  }, [searchQuery, page, selectedTopicId, loadData])

  // Filter by Part of Speech on client
  const filteredItems = useMemo(() => {
    if (selectedPos === "all") return items
    return items.filter((item) =>
      item.partOfSpeech?.toLowerCase().includes(selectedPos.toLowerCase())
    )
  }, [items, selectedPos])

  // Items for Saved tab
  const savedItems = useMemo(() => {
    return items.filter((item) => bookmarkedIds.includes(item.id))
  }, [items, bookmarkedIds])

  // Current item modal index navigation
  const currentIndex = selectedItem ? items.findIndex((i) => i.id === selectedItem.id) : -1
  const prevModalItem = currentIndex > 0 ? items[currentIndex - 1] : undefined
  const nextModalItem = currentIndex >= 0 && currentIndex < items.length - 1 ? items[currentIndex + 1] : undefined

  return (
    <div className="w-full flex-1 flex flex-col font-sans">
      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl flex-1 px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Error notification banner */}
        {error && (
          <div className="mb-6 flex items-center justify-between rounded-2xl bg-rose-50 border border-rose-200 p-4 text-rose-800 text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{error}. Hãy chắc chắn API backend đang chạy tại cổng 4756.</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="border-rose-300 text-rose-800 hover:bg-rose-100"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Thử lại
            </Button>
          </div>
        )}

        {/* Tab 1: Cards View */}
        {activeTab === "cards" && (
          <div className="space-y-6">
            {/* Search and Filters Bar */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                {/* Search Box */}
                <div className="relative w-full md:max-w-md">
                  <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Tìm kiếm từ vựng (VD: contract, attract, ...)"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setPage(0)
                    }}
                    className="pl-10 h-11"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-3 text-xs text-slate-400 hover:text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded"
                    >
                      Xóa
                    </button>
                  )}
                </div>

                {/* Part of Speech Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                  <span className="text-xs text-slate-400 font-medium mr-1 flex items-center gap-1">
                    <Filter className="w-3 h-3" /> Loại từ:
                  </span>
                  {[
                    { id: "all", label: "Tất cả" },
                    { id: "noun", label: "Danh từ" },
                    { id: "verb", label: "Động từ" },
                    { id: "adj", label: "Tính từ" },
                  ].map((pos) => (
                    <button
                      key={pos.id}
                      onClick={() => setSelectedPos(pos.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedPos === pos.id
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Topics Pills */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 overflow-x-auto text-xs">
                <span className="text-slate-400 font-medium shrink-0">Chủ đề:</span>
                <button
                  onClick={() => {
                    setSelectedTopicId(undefined)
                    setPage(0)
                  }}
                  className={`px-3 py-1 rounded-lg shrink-0 transition-colors ${selectedTopicId === undefined
                    ? "bg-blue-600 text-white font-semibold"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                >
                  Tất cả ({totalElements})
                </button>
                {KNOWN_TOPICS.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => {
                      setSelectedTopicId(topic.id)
                      setPage(0)
                    }}
                    className={`px-3 py-1 rounded-lg shrink-0 transition-colors ${selectedTopicId === topic.id
                      ? "bg-blue-600 text-white font-semibold"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                  >
                    {topic.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Vocabularies Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-64 rounded-2xl bg-white border border-slate-200/60 p-5 animate-pulse flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="h-5 bg-slate-200 rounded-md w-1/3"></div>
                      <div className="h-8 bg-slate-200 rounded-md w-2/3"></div>
                      <div className="h-4 bg-slate-200 rounded-md w-1/2"></div>
                      <div className="h-12 bg-slate-100 rounded-xl"></div>
                    </div>
                    <div className="h-4 bg-slate-200 rounded-md w-1/4"></div>
                  </div>
                ))}
              </div>
            ) : filteredItems.length > 0 ? (
              <motion.div
                layout
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
              >
                <AnimatePresence mode="popLayout">
                  {filteredItems.map((item) => (
                    <VocabularyCard
                      key={item.id}
                      item={item}
                      isBookmarked={bookmarkedIds.includes(item.id)}
                      onToggleBookmark={toggleBookmark}
                      onSelect={setSelectedItem}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-800">Không tìm thấy từ vựng nào</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Thử đổi từ khóa tìm kiếm hoặc lọc theo chủ đề khác.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("")
                    setSelectedTopicId(undefined)
                    setSelectedPos("all")
                  }}
                  className="mt-4"
                >
                  Xóa bộ lọc
                </Button>
              </div>
            )}

            {/* Pagination Controls */}
            {!searchQuery && totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500">
                  Hiển thị trang <span className="font-semibold text-slate-700">{page + 1}</span> trên{" "}
                  <span className="font-semibold text-slate-700">{totalPages}</span> trang ({totalElements} từ)
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0 || loading}
                    className="gap-1 text-xs"
                  >
                    <ChevronLeft className="w-4 h-4" /> Trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1 || loading}
                    className="gap-1 text-xs"
                  >
                    Sau <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Flashcards */}
        {activeTab === "flashcard" && (
          <div className="py-4">
            <div className="text-center mb-8">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2 border border-blue-200/60">
                <Sparkles className="w-3.5 h-3.5" /> Chế độ ghi nhớ nhanh
              </span>
              <h2 className="text-2xl font-bold text-slate-900">Thẻ từ vựng Flashcard</h2>
              <p className="text-sm text-slate-500 mt-1">
                Lật mặt thẻ để xem nghĩa và ví dụ tiếng Việt. Sử dụng phím Space để lật.
              </p>
            </div>
            <FlashcardViewer items={filteredItems} />
          </div>
        )}

        {/* Tab 3: Multiple Choice Quiz */}
        {activeTab === "quiz" && (
          <div className="py-4">
            <div className="text-center mb-8">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2 border border-indigo-200/60">
                <Sparkles className="w-3.5 h-3.5" /> Luyện tập kiểm tra
              </span>
              <h2 className="text-2xl font-bold text-slate-900">Trắc nghiệm từ vựng</h2>
              <p className="text-sm text-slate-500 mt-1">
                Chọn câu trả lời chính xác để củng cố phản xạ từ vựng TOEIC.
              </p>
            </div>
            <VocabularyQuiz items={filteredItems} />
          </div>
        )}

        {/* Tab 4: Saved Bookmarks */}
        {activeTab === "saved" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Danh sách từ đã lưu</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Các từ bạn đã đánh dấu để tập trung ôn tập ({savedItems.length} từ)
                </p>
              </div>
            </div>

            {savedItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {savedItems.map((item) => (
                  <VocabularyCard
                    key={item.id}
                    item={item}
                    isBookmarked={true}
                    onToggleBookmark={toggleBookmark}
                    onSelect={setSelectedItem}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
                <Bookmark className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-800">Chưa có từ nào được lưu</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Nhấn vào biểu tượng Bookmark trên các thẻ từ để lưu vào danh sách này.
                </p>
                <Button
                  onClick={() => navigate("/")}
                  className="mt-4"
                  size="sm"
                >
                  Khám phá từ vựng ngay
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Vocabulary Detail Modal */}
      <VocabularyDetailModal
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        isBookmarked={selectedItem ? bookmarkedIds.includes(selectedItem.id) : false}
        onToggleBookmark={toggleBookmark}
        onPrev={prevModalItem ? () => setSelectedItem(prevModalItem) : undefined}
        onNext={nextModalItem ? () => setSelectedItem(nextModalItem) : undefined}
      />
    </div>
  )
}
