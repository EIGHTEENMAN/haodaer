// Achievement data model and sharing system
// Designed for external system integration (Xiaotiancai watch, WeChat, etc.)

export interface GameSessionSummary {
  player: {
    nickname: string
    level: number
  }
  session: {
    score: number
    duration: number
    monstersKilled: number
    wordsLearned: number
    correctCount: number
    wrongCount: number
    maxCombo: number
    accuracy: number
  }
  total: {
    wordsLearned: number
    wordsMastered: number
    totalScore: number
    studyDays: number
  }
  timestamp: number
}

export type ShareChannel = "xiaotiancai" | "wechat" | "qzone" | "copy"

// Generate share text for a session
export function generateShareText(summary: GameSessionSummary): string {
  const s = summary.session
  const p = summary.player
  return [
    `🏆 我在【好大儿·学英语】打败了 ${s.monstersKilled} 只怪物！`,
    `📚 学会了 ${s.wordsLearned} 个新单词 · 准确率 ${s.accuracy}%`,
    `💪 当前等级 Lv.${p.level} · 最高 ${s.maxCombo} 连击！`,
    `来挑战我吧 → english.grandand.com`,
  ].join("\n")
}

// Generate share URL with encoded data
export function generateShareUrl(summary: GameSessionSummary): string {
  const params = new URLSearchParams({
    s: String(summary.session.score),
    w: String(summary.session.wordsLearned),
    a: String(summary.session.accuracy),
    c: String(summary.session.maxCombo),
    l: String(summary.player.level),
    m: String(summary.session.monstersKilled),
    t: String(summary.timestamp),
  })
  return `https://english.grandand.com/share?${params.toString()}`
}

// Share via Web Share API (mobile-friendly)
export async function shareToSystem(summary: GameSessionSummary): Promise<boolean> {
  const text = generateShareText(summary)
  const url = generateShareUrl(summary)

  if (navigator.share) {
    try {
      await navigator.share({ title: "好大儿·学英语", text, url })
      return true
    } catch {
      // User cancelled or API not available
      return false
    }
  }

  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`)
    return true
  } catch {
    return false
  }
}

// Reserved for future external system integration
export function shareToExternal(_summary: GameSessionSummary, _channel: ShareChannel) {
  // Interface placeholder for:
  // - Xiaotiancai watch API
  // - WeChat Mini Program
  // - QQ share
  // - Custom webhook
  console.log(`[achievement] share to ${_channel} not yet implemented`)
}

// Leaderboard entry (reserved)
export interface LeaderboardEntry {
  nickname: string
  level: number
  score: number
  wordsMastered: number
  timestamp: number
}
