import { useState, useEffect } from "react"
import { motion } from "motion/react"
import { Volume2, RotateCw, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Shuffle } from "lucide-react"
import type { VocabularyItem } from "@/types/vocabulary"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { playPronunciation } from "@/services/vocabApi"

interface FlashcardViewerProps {
  items: VocabularyItem[]
}

export function FlashcardViewer({ items }: FlashcardViewerProps) {
  const [deck, setDeck] = useState<VocabularyItem[]>(items)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [masteredIds, setMasteredIds] = useState<Set<number>>(new Set())
  const [reviewIds, setReviewIds] = useState<Set<number>>(new Set())
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDeck(items)
    setCurrentIndex(0)
    setIsFlipped(false)
  }, [items])

  const current = deck[currentIndex]

  const handleNext = () => {
    if (currentIndex < deck.length - 1) {
      setIsFlipped(false)
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false)
      setCurrentIndex((prev) => prev - 1)
    }
  }

  const handleShuffle = () => {
    setIsFlipped(false)
    const shuffled = [...deck].sort(() => Math.random() - 0.5)
    setDeck(shuffled)
    setCurrentIndex(0)
  }

  const markMastered = () => {
    if (!current) return
    setMasteredIds((prev) => new Set(prev).add(current.id))
    setReviewIds((prev) => {
      const next = new Set(prev)
      next.delete(current.id)
      return next
    })
    handleNext()
  }

  const markReview = () => {
    if (!current) return
    setReviewIds((prev) => new Set(prev).add(current.id))
    setMasteredIds((prev) => {
      const next = new Set(prev)
      next.delete(current.id)
      return next
    })
    handleNext()
  }

  const handlePlayAudio = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (current) {
      playPronunciation(current.audioUrl, current.word)
    }
  }

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        setIsFlipped((f) => !f)
      } else if (e.code === 'ArrowRight') {
        handleNext()
      } else if (e.code === 'ArrowLeft') {
        handlePrev()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, deck.length])

  if (!items || items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
        Không có từ vựng nào để hiển thị trong bộ Flashcard.
      </div>
    )
  }

  const progressPercent = Math.round(((currentIndex + 1) / deck.length) * 100)

  return (
    <div className="mx-auto max-w-xl flex flex-col items-center">
      {/* Top Controls & Status */}
      <div className="w-full flex items-center justify-between mb-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">
            Thẻ {currentIndex + 1} / {deck.length}
          </span>
          <span className="text-xs text-slate-400">({progressPercent}%)</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> {masteredIds.size}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5" /> {reviewIds.size}
          </div>
          <button
            onClick={handleShuffle}
            title="Trộn ngẫu nhiên"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Shuffle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-6">
        <motion.div
          className="h-full bg-blue-600"
          animate={{ width: `${progressPercent}%` }}
          transition={{ ease: "easeOut", duration: 0.3 }}
        />
      </div>

      {/* Flashcard 3D Container */}
      <div
        className="w-full h-80 [perspective:1000px] cursor-pointer select-none"
        onClick={() => setIsFlipped((f) => !f)}
      >
        <motion.div
          className="relative w-full h-full rounded-3xl transition-all duration-500 [transform-style:preserve-3d]"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {/* Front Face */}
          <div className="absolute inset-0 w-full h-full rounded-3xl border border-slate-200 bg-white p-8 shadow-lg flex flex-col justify-between [backface-visibility:hidden]">
            <div className="flex items-center justify-between">
              <Badge variant="topic">{current?.topicName || "TOEIC"}</Badge>
              {current?.partOfSpeech && (
                <Badge variant="secondary">{current?.partOfSpeech}</Badge>
              )}
            </div>

            <div className="text-center my-auto">
              <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                {current?.word}
              </h2>
              {current?.phonetic && (
                <p className="font-mono text-lg text-blue-600 mt-2 font-medium">
                  {current?.phonetic}
                </p>
              )}

              <div className="mt-4 flex justify-center">
                <button
                  onClick={handlePlayAudio}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold transition-colors shadow-xs"
                >
                  <Volume2 className="w-4 h-4" /> Nghe phát âm
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Nhấn vào thẻ hoặc phím Space để lật</span>
              <RotateCw className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Back Face */}
          <div className="absolute inset-0 w-full h-full rounded-3xl border border-blue-200 bg-gradient-to-b from-blue-50/40 to-white p-8 shadow-lg flex flex-col justify-between [transform:rotateY(180deg)] [backface-visibility:hidden]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Nghĩa & Ví dụ
              </span>
              <Badge variant="outline">{current?.partOfSpeech}</Badge>
            </div>

            <div className="my-auto space-y-4 text-center">
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {current?.meaningVi}
                </p>
              </div>

              {current?.exampleEn && (
                <div className="bg-white/80 rounded-xl p-3 border border-slate-100 text-left text-xs text-slate-700">
                  <p className="font-medium text-slate-800">"{current?.exampleEn}"</p>
                  {current?.exampleVi && (
                    <p className="text-slate-500 mt-1">→ {current?.exampleVi}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Lật lại mặt trước</span>
              <RotateCw className="w-3.5 h-3.5" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Action Rating Buttons */}
      <div className="w-full flex items-center justify-between gap-3 mt-6">
        <Button
          variant="outline"
          className="flex-1 border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 gap-2 h-11"
          onClick={markReview}
        >
          <AlertCircle className="w-4 h-4" />
          Cần ôn tập
        </Button>

        <Button
          variant="outline"
          className="flex-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 gap-2 h-11"
          onClick={markMastered}
        >
          <CheckCircle2 className="w-4 h-4" />
          Đã thuộc từ này
        </Button>
      </div>

      {/* Previous / Next Controls */}
      <div className="flex items-center gap-4 mt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="gap-1"
        >
          <ChevronLeft className="w-4 h-4" /> Thẻ trước
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleNext}
          disabled={currentIndex === deck.length - 1}
          className="gap-1"
        >
          Thẻ sau <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
