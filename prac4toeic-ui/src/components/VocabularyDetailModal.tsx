import { useState } from "react"
import { Volume2, Bookmark, ArrowLeft, ArrowRight } from "lucide-react"
import type { VocabularyItem } from "@/types/vocabulary"
import { Dialog } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { playPronunciation } from "@/services/vocabApi"

interface VocabularyDetailModalProps {
  item: VocabularyItem | null
  isOpen: boolean
  onClose: () => void
  isBookmarked: boolean
  onToggleBookmark: (id: number) => void
  onPrev?: () => void
  onNext?: () => void
}

export function VocabularyDetailModal({
  item,
  isOpen,
  onClose,
  isBookmarked,
  onToggleBookmark,
  onPrev,
  onNext,
}: VocabularyDetailModalProps) {
  const [isPlaying, setIsPlaying] = useState(false)

  if (!item) return null

  const handlePlay = () => {
    setIsPlaying(true)
    playPronunciation(item.audioUrl, item.word)
    setTimeout(() => setIsPlaying(false), 1200)
  }

  const handlePlayExample = () => {
    if (item.exampleEn && 'speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(item.exampleEn)
      u.lang = 'en-US'
      window.speechSynthesis.speak(u)
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} title="Chi tiết từ vựng">
      <div className="space-y-6">
        {/* Header with badges */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="topic">{item.topicName || "Chủ đề TOEIC"}</Badge>
            {item.partOfSpeech && (
              <Badge variant="secondary">{item.partOfSpeech}</Badge>
            )}
          </div>
          <button
            onClick={() => onToggleBookmark(item.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isBookmarked
                ? "bg-amber-50 text-amber-600 border border-amber-200"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? "fill-amber-500 text-amber-500" : ""}`} />
            {isBookmarked ? "Đã lưu" : "Lưu từ"}
          </button>
        </div>

        {/* Word + Pronunciation */}
        <div className="rounded-2xl bg-gradient-to-br from-blue-50/70 to-indigo-50/50 p-6 border border-blue-100/60 text-center">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {item.word}
          </h2>
          {item.phonetic && (
            <p className="font-mono text-base text-blue-600 mt-1 font-medium">
              {item.phonetic}
            </p>
          )}

          <div className="mt-4 flex justify-center">
            <Button
              onClick={handlePlay}
              className={`rounded-full gap-2 px-5 py-2.5 transition-all ${
                isPlaying ? "scale-105 bg-blue-700" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              <Volume2 className={`w-4 h-4 ${isPlaying ? "animate-bounce" : ""}`} />
              Nghe phát âm
            </Button>
          </div>
        </div>

        {/* Meaning section */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Định nghĩa tiếng Việt
          </h4>
          <p className="text-lg font-semibold text-slate-900 leading-snug">
            {item.meaningVi}
          </p>
        </div>

        {/* Example section */}
        {item.exampleEn && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Ví dụ ngữ cảnh TOEIC
              </h4>
              <button
                onClick={handlePlayExample}
                title="Đọc câu ví dụ"
                className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
              >
                <Volume2 className="w-3.5 h-3.5" /> Đọc câu
              </button>
            </div>
            <p className="text-sm font-medium text-slate-800 leading-relaxed">
              "{item.exampleEn}"
            </p>
            {item.exampleVi && (
              <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-200/60 pt-2 mt-2">
                → {item.exampleVi}
              </p>
            )}
          </div>
        )}

        {/* Navigation bottom */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrev}
            disabled={!onPrev}
            className="gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Từ trước
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onNext}
            disabled={!onNext}
            className="gap-1.5"
          >
            Từ tiếp theo <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
