export interface VocabularyItem {
  id: number
  topicId: number
  topicName: string
  word: string
  phonetic: string
  partOfSpeech: string
  meaningVi: string
  exampleEn: string
  exampleVi: string
  audioUrl?: string
}

export interface PageResponse<T> {
  content: T[]
  pageable: {
    pageNumber: number
    pageSize: number
  }
  totalElements: number
  totalPages: number
  last: boolean
  first: boolean
  size: number
  number: number
  numberOfElements: number
}

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
  timestamp: string
}
