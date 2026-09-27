import { useState, useEffect } from "react"
import { motion } from "motion/react"
import { CheckCircle, XCircle, RotateCcw, Award, Volume2, ArrowRight } from "lucide-react"
import type { VocabularyItem } from "@/types/vocabulary"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { playPronunciation } from "@/services/vocabApi"

interface VocabularyQuizProps {
  items: VocabularyItem[]
}

interface Question {
  target: VocabularyItem
  options: string[]
  correctIndex: number
}

export function VocabularyQuiz({ items }: VocabularyQuizProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [isFinished, setIsFinished] = useState(false)

  // Generate quiz questions
  useEffect(() => {
    if (items.length < 4) return

    const pool = [...items].sort(() => Math.random() - 0.5).slice(0, Math.min(10, items.length))
    const generated: Question[] = pool.map((item) => {
      // Find 3 other random distractors
      const distractors = items
        .filter((other) => other.id !== item.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((d) => d.meaningVi)

      const options = [...distractors, item.meaningVi].sort(() => Math.random() - 0.5)
      const correctIndex = options.indexOf(item.meaningVi)

      return {
        target: item,
        options,
        correctIndex,
      }
    })

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuestions(generated)
    setCurrentQuestionIdx(0)
    setSelectedOption(null)
    setScore(0)
    setStreak(0)
    setIsFinished(false)
  }, [items])

  if (items.length < 4) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
        Cần ít nhất 4 từ vựng để tạo bài kiểm tra trắc nghiệm.
      </div>
    )
  }

  const currentQ = questions[currentQuestionIdx]

  const handleSelect = (index: number) => {
    if (selectedOption !== null || !currentQ) return

    setSelectedOption(index)
    if (index === currentQ.correctIndex) {
      setScore((s) => s + 1)
      setStreak((st) => st + 1)
    } else {
      setStreak(0)
    }
  }

  const handleNext = () => {
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx((prev) => prev + 1)
      setSelectedOption(null)
    } else {
      setIsFinished(true)
    }
  }

  const handleRestart = () => {
    const pool = [...items].sort(() => Math.random() - 0.5).slice(0, Math.min(10, items.length))
    const generated: Question[] = pool.map((item) => {
      const distractors = items
        .filter((other) => other.id !== item.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((d) => d.meaningVi)

      const options = [...distractors, item.meaningVi].sort(() => Math.random() - 0.5)
      const correctIndex = options.indexOf(item.meaningVi)

      return {
        target: item,
        options,
        correctIndex,
      }
    })
    setQuestions(generated)
    setCurrentQuestionIdx(0)
    setSelectedOption(null)
    setScore(0)
    setStreak(0)
    setIsFinished(false)
  }

  if (isFinished) {
    const percent = Math.round((score / questions.length) * 100)
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg"
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <Award className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Hoàn thành bài luyện tập!</h2>
        <p className="text-slate-500 text-sm mb-6">
          Bạn đã trả lời chính xác <span className="font-bold text-slate-800">{score}/{questions.length}</span> câu hỏi ({percent}%).
        </p>

        <div className="flex justify-center gap-3">
          <Button onClick={handleRestart} className="gap-2">
            <RotateCcw className="w-4 h-4" /> Luyện tập lại
          </Button>
        </div>
      </motion.div>
    )
  }

  if (!currentQ) return null

  return (
    <div className="mx-auto max-w-xl">
      {/* Header & Stats */}
      <div className="flex items-center justify-between mb-4 text-sm">
        <span className="font-semibold text-slate-700">
          Câu {currentQuestionIdx + 1} / {questions.length}
        </span>
        <div className="flex items-center gap-3">
          {streak > 1 && (
            <span className="text-xs font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
              🔥 Chuỗi {streak}
            </span>
          )}
          <span className="text-xs font-medium text-slate-500">
            Điểm: {score}
          </span>
        </div>
      </div>

      {/* Target Word Box */}
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center  mb-6 relative">
        <div className="absolute top-4 left-4">
          <Badge variant="topic">{currentQ.target.topicName}</Badge>
        </div>
        {currentQ.target.partOfSpeech && (
          <div className="absolute top-4 right-4">
            <Badge variant="secondary">{currentQ.target.partOfSpeech}</Badge>
          </div>
        )}

        <div className="mt-4">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {currentQ.target.word}
          </h2>
          {currentQ.target.phonetic && (
            <p className="font-mono text-base text-blue-600 mt-1 font-medium">
              {currentQ.target.phonetic}
            </p>
          )}

          <div className="mt-3 flex justify-center">
            <button
              onClick={() => playPronunciation(currentQ.target.audioUrl, currentQ.target.word)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 transition-colors"
            >
              <Volume2 className="w-3.5 h-3.5" /> Phát âm
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-4">
          Chọn định nghĩa tiếng Việt chính xác của từ trên:
        </p>
      </div>

      {/* Options */}
      <div className="space-y-3 mb-6">
        {currentQ.options.map((option, idx) => {
          const isSelected = selectedOption === idx
          const isCorrect = idx === currentQ.correctIndex
          let stateStyle = "border-slate-200 bg-white text-slate-800 hover:border-blue-400 hover:bg-blue-50/30"

          if (selectedOption !== null) {
            if (isCorrect) {
              stateStyle = "border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold"
            } else if (isSelected) {
              stateStyle = "border-rose-500 bg-rose-50 text-rose-900 font-semibold"
            } else {
              stateStyle = "border-slate-100 bg-slate-50/50 text-slate-400 opacity-60"
            }
          }

          return (
            <motion.button
              key={idx}
              whileTap={{ scale: selectedOption === null ? 0.98 : 1 }}
              disabled={selectedOption !== null}
              onClick={() => handleSelect(idx)}
              className={`w-full rounded-2xl border p-4 text-left transition-all flex items-center justify-between text-sm shadow-xs ${stateStyle}`}
            >
              <span>{option}</span>
              {selectedOption !== null && isCorrect && (
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 ml-2" />
              )}
              {selectedOption !== null && isSelected && !isCorrect && (
                <XCircle className="w-5 h-5 text-rose-600 shrink-0 ml-2" />
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Bottom Button */}
      {selectedOption !== null && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-end"
        >
          <Button onClick={handleNext} className="gap-2 px-6">
            {currentQuestionIdx < questions.length - 1 ? (
              <>
                Câu tiếp theo <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                Xem kết quả <Award className="w-4 h-4" />
              </>
            )}
          </Button>
        </motion.div>
      )}
    </div>
  )
}
