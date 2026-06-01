import { reactive } from "vue"
import type { WordData } from "./gameStore"

export interface MonsterEntry {
  wordId: number
  word: string
  meaning: string
  captured: boolean
  capturedAt: number
  focusCorrect: number  // times answered correctly in FOCUS
  evolutionStage: number // 0=base, 1=evolved, 2=ultimate
  totalBattles: number
}

export const pokedexStore = reactive({
  entries: new Map<number, MonsterEntry>(),
  lastWorld: "",
})

export function getOrCreateEntry(wordData: WordData): MonsterEntry {
  let entry = pokedexStore.entries.get(wordData.id)
  if (!entry) {
    entry = {
      wordId: wordData.id,
      word: wordData.word,
      meaning: wordData.meaning,
      captured: false,
      capturedAt: 0,
      focusCorrect: 0,
      evolutionStage: 0,
      totalBattles: 0,
    }
    pokedexStore.entries.set(wordData.id, entry)
  }
  return entry
}

export function captureMonster(wordData: WordData) {
  const entry = getOrCreateEntry(wordData)
  if (!entry.captured) {
    entry.captured = true
    entry.capturedAt = Date.now()
  }
  savePokedex()
}

export function recordFocusCorrect(wordId: number) {
  const entry = pokedexStore.entries.get(wordId)
  if (!entry) return
  entry.focusCorrect++
  // Evolution check
  if (entry.focusCorrect >= 15) entry.evolutionStage = 2
  else if (entry.focusCorrect >= 5) entry.evolutionStage = 1
  savePokedex()
}

export function recordBattle(wordId: number) {
  const entry = pokedexStore.entries.get(wordId)
  if (entry) entry.totalBattles++
}

export function getWorldProgress(theme: string): { captured: number; total: number } {
  let captured = 0, total = 0
  pokedexStore.entries.forEach(e => {
    // We count entries that match the theme
    total++
    if (e.captured) captured++
  })
  return { captured, total }
}

export function getCaptureCount(): number {
  let count = 0
  pokedexStore.entries.forEach(e => { if (e.captured) count++ })
  return count
}

const STORAGE_KEY = "haodaer_pokedex"

export function savePokedex() {
  try {
    const data: Record<string, MonsterEntry> = {}
    pokedexStore.entries.forEach((e, id) => { data[String(id)] = e })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {}
}

export function loadPokedex() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const data = JSON.parse(raw) as Record<string, MonsterEntry>
    pokedexStore.entries.clear()
    for (const [id, entry] of Object.entries(data)) {
      pokedexStore.entries.set(Number(id), entry)
    }
  } catch {}
}
