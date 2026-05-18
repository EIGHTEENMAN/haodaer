import { reactive } from "vue"

export interface WordRecord {
  wordId: number
  word: string
  meaning: string
  correct: number
  total: number
  lastReview: number // timestamp
  mastered: boolean
}

export const wordStore = reactive({
  records: new Map<number, WordRecord>(),
  todayStudyTime: 0, // seconds
  todayWords: new Set<number>(),
  lastStudyDate: "",
})

export function recordAnswer(wordId: number, word: string, meaning: string, correct: boolean) {
  const r = wordStore.records.get(wordId) || { wordId, word, meaning, correct: 0, total: 0, lastReview: 0, mastered: false }
  r.total++
  if (correct) r.correct++
  r.lastReview = Date.now()
  const ratio = r.correct / r.total
  r.mastered = r.total >= 3 && ratio >= 0.8
  wordStore.records.set(wordId, r)
  wordStore.todayWords.add(wordId)
  wordStore.lastStudyDate = new Date().toDateString()
}

export function getMasteredCount(): number {
  let count = 0
  wordStore.records.forEach(r => { if (r.mastered) count++ })
  return count
}

export function getAccuracy(): number {
  let correct = 0, total = 0
  wordStore.records.forEach(r => { correct += r.correct; total += r.total })
  return total > 0 ? Math.round(correct / total * 100) : 0
}

export function getCorrectCount(): number {
  let count = 0
  wordStore.records.forEach(r => { count += r.correct })
  return count
}

export function getWrongCount(): number {
  let count = 0
  wordStore.records.forEach(r => { count += r.total - r.correct })
  return count
}
