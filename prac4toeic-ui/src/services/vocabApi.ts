import type { ApiResponse, PageResponse, VocabularyItem } from '../types/vocabulary'

const API_BASE = import.meta.env.VITE_API_URL || ''

export async function fetchVocabularies(
  page = 0,
  size = 20,
  topicId?: number
): Promise<PageResponse<VocabularyItem>> {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  })
  if (topicId) {
    params.append('topicId', String(topicId))
  }

  const res = await fetch(`${API_BASE}/api/vocabulary?${params.toString()}`)
  if (!res.ok) {
    throw new Error(`Lỗi tải dữ liệu: ${res.statusText}`)
  }

  const json: ApiResponse<PageResponse<VocabularyItem>> = await res.json()
  return json.data
}

interface ElasticDoc {
  id?: string | number
  word?: string
  phonetic?: string
  meaningVi?: string
  wordClass?: string
  topic?: string
  exampleSentence?: string
}

export async function searchVocabularies(query: string): Promise<VocabularyItem[]> {
  if (!query.trim()) return []
  const keyword = query.trim()

  try {
    const res = await fetch(`${API_BASE}/api/vocabularies/search?keyword=${encodeURIComponent(keyword)}`)
    if (res.status === 429) {
      throw new Error('Bạn đang tìm kiếm quá nhanh. Vui lòng thử lại sau giây lát!')
    }

    if (res.ok) {
      const json = await res.json()
      const docs = (json.data || []) as ElasticDoc[]
      if (Array.isArray(docs) && docs.length > 0) {
        return docs.map((doc: ElasticDoc, index: number) => ({
          id: Number(doc.id) || index + 1,
          topicId: 1,
          topicName: doc.topic || 'General',
          word: doc.word || keyword,
          phonetic: doc.phonetic || '',
          partOfSpeech: doc.wordClass || '',
          meaningVi: doc.meaningVi || '',
          exampleEn: doc.exampleSentence || '',
          exampleVi: '',
        }))
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('quá nhanh')) {
      throw err
    }
    // Fallback sang API cu neu Elasticsearch endpoint bi ngat
  }

  // Fallback endpoint
  const res = await fetch(`${API_BASE}/api/vocabulary/search?q=${encodeURIComponent(keyword)}`)
  if (res.status === 429) {
    throw new Error('Bạn đang tìm kiếm quá nhanh. Vui lòng thử lại sau giây lát!')
  }
  if (!res.ok) {
    throw new Error(`Lỗi tìm kiếm: ${res.statusText}`)
  }

  const json: ApiResponse<VocabularyItem[]> = await res.json()
  return json.data || []
}

export async function fetchVocabularyById(id: number): Promise<VocabularyItem> {
  const res = await fetch(`${API_BASE}/api/vocabulary/${id}`)
  if (!res.ok) {
    throw new Error(`Không tìm thấy từ vựng #${id}`)
  }

  const json: ApiResponse<VocabularyItem> = await res.json()
  return json.data
}

export function playPronunciation(audioUrl?: string, word?: string) {
  if (audioUrl) {
    const fullAudioUrl = audioUrl.startsWith('http')
      ? audioUrl
      : `${API_BASE}${audioUrl}`
    const audio = new Audio(fullAudioUrl)
    audio.play().catch(() => {
      // Fallback to Web Speech API
      if (word && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(word)
        utterance.lang = 'en-US'
        window.speechSynthesis.speak(utterance)
      }
    })
    return
  }

  if (word && 'speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = 'en-US'
    window.speechSynthesis.speak(utterance)
  }
}
