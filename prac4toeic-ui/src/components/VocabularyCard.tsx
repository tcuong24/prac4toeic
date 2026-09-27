import { useState } from "react"
import { motion } from "motion/react"
import { Volume2, Bookmark, ExternalLink } from "lucide-react"
import type { VocabularyItem } from "@/types/vocabulary"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { playPronunciation } from "@/services/vocabApi"

interface VocabularyCardProps {
  item: VocabularyItem
  isBookmarked: boolean
  onToggleBookmark: (id: number) => void
  onSelect: (item: VocabularyItem) => void
}

export function VocabularyCard({
  item,
  isBookmarked,
  onToggleBookmark,
  onSelect,
}: VocabularyCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)

  const handlePlayAudio = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsPlaying(true)
    playPronunciation(item.audioUrl, item.word)
    setTimeout(() => setIsPlaying(false), 1200)
  }

  const getPosVariant = (pos: string) => {
    const lower = pos?.toLowerCase() || ''
    if (lower.includes('noun') || lower === 'n') return 'noun'
    if (lower.includes('verb') || lower === 'v') return 'verb'
    if (lower.includes('adj')) return 'adjective'
    if (lower.includes('adv')) return 'adverb'
    return 'secondary'
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25 }}
      onClick={() => onSelect(item)}
      className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5  transition-all duration-200 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/5 cursor-pointer"
    >
      <div>
        {/* Top bar: Topic & Bookmark */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <Badge variant="topic" className="truncate max-w-[170px]">
            {item.topicName || "Chủ đề TOEIC"}
          </Badge>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleBookmark(item.id)
              }}
              aria-label="Lưu từ vựng"
              className={`rounded-lg p-1.5 transition-colors ${isBookmarked
                  ? "text-amber-500 bg-amber-50 hover:bg-amber-100"
                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                }`}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-amber-500" : ""}`} />
            </button>
          </div>
        </div>

        {/* Word + IPA + Audio */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
              {item.word}
            </h3>
            {item.phonetic && (
              <p className="text-sm font-mono text-slate-500 mt-0.5">
                {item.phonetic}
              </p>
            )}
          </div>

          <Button
            type="button"
            size="icon"
            variant="subtle"
            className={`h-9 w-9 shrink-0 rounded-full transition-all ${isPlaying ? "scale-110 bg-blue-600 text-white" : ""
              }`}
            onClick={handlePlayAudio}
            title="Phát âm"
          >
            <Volume2 className={`w-4 h-4 ${isPlaying ? "animate-pulse" : ""}`} />
          </Button>
        </div>

        {/* Part of Speech & Meaning */}
        <div className="mb-3 flex items-center gap-2">
          {item.partOfSpeech && (
            <Badge variant={getPosVariant(item.partOfSpeech)}>
              {item.partOfSpeech}
            </Badge>
          )}
        </div>

        <p className="text-base font-medium text-slate-800 line-clamp-2 mb-3">
          {item.meaningVi}
        </p>

        {/* Example if exists */}
        {item.exampleEn && (
          <div className="rounded-xl bg-slate-50/80 p-3 text-xs text-slate-600 border border-slate-100 space-y-1">
            <p className="italic text-slate-700 font-medium">"{item.exampleEn}"</p>
            {item.exampleVi && (
              <p className="text-slate-500">→ {item.exampleVi}</p>
            )}
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
        <span>#{item.id}</span>
        <span className="inline-flex items-center gap-1 group-hover:text-blue-600 font-medium transition-colors">
          Xem chi tiết <ExternalLink className="w-3 h-3" />
        </span>
      </div>
    </motion.div>
  )
}
