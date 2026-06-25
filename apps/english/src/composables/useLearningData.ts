import { computed } from 'vue'
import { wordStore, getStreak } from '../stores/wordStore'
import { studyStore } from '../stores/studyStore'

/**
 * 把 wordStore.dailyStats 转成 StudyCalendar 期望的格式
 */
export function useLearningData() {
  const dailyLogs = computed(() => {
    const logs: { date: string; subjects: Record<string, { items: number; minutes: number }> }[] = []
    for (const [date, stat] of Object.entries(wordStore.dailyStats)) {
      if (stat.words > 0) {
        logs.push({
          date,
          subjects: {
            english: { items: stat.words, minutes: 0 }
          }
        })
      }
    }
    return logs.sort((a, b) => a.date.localeCompare(b.date))
  })

  const streak = computed(() => getStreak())

  const overview = computed(() => ({
    totalLearned: wordStore.records.size,
    mastered: wordStore.getMasteredCount(),
    correct: wordStore.getCorrectCount(),
    wrong: wordStore.getWrongCount(),
    accuracy: wordStore.getAccuracy(),
    sessionsCompleted: studyStore.sessionsCompleted
  }))

  return { dailyLogs, streak, overview }
}