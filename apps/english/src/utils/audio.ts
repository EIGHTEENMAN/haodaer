// Audio manager: word pronunciation + Bruce Lee sound effects

let audioCtx: AudioContext | null = null
const audioCache = new Map<string, HTMLAudioElement>()

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  return audioCtx
}

// Play word pronunciation from file or TTS fallback
export function playWordAudio(word: string, onEnd?: () => void) {
  if (audioCache.has(word)) {
    const audio = audioCache.get(word)!
    audio.currentTime = 0
    audio.play().then(() => {
      audio.onended = () => { onEnd?.() }
    }).catch(() => {
      audioCache.delete(word)
      playWordAudio(word, onEnd)
    })
    return
  }
  if ("speechSynthesis" in window) {
    const u = new SpeechSynthesisUtterance(word)
    u.lang = "en-US"
    u.rate = 0.8
    u.onend = () => { onEnd?.() }
    speechSynthesis.speak(u)
  } else {
    onEnd?.()
  }
}

// Register an audio element for a word (from preloaded files)
export function registerWordAudio(word: string, url: string) {
  const audio = new Audio(url)
  audio.preload = "auto"
  audioCache.set(word, audio)
}

// 朗读英文例句（浏览器内置 TTS，零成本、即时）
// 注意：2026-06-30 起，例句优先播放预生成的 Edge TTS mp3（en-US-JennyNeural + friendly）
// 这里只是 mp3 缺失时的兜底。pitch 调高会让机器人感加重，去掉改用默认音色。
let cachedEnVoice: SpeechSynthesisVoice | null = null
function pickEnVoice(): SpeechSynthesisVoice | null {
  if (cachedEnVoice) return cachedEnVoice
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null
  // 优先级：英文女声（柔和） → 任意英文
  cachedEnVoice =
    voices.find(v => /^en/i.test(v.lang) && /female|samantha|victoria|karen|tessa|moira|fiona|aria|jenny/i.test(v.name)) ||
    voices.find(v => /^en/i.test(v.lang)) ||
    null
  return cachedEnVoice
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    pickEnVoice()
  }
}

export function speakSentence(text: string) {
  if (!("speechSynthesis" in window)) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = "en-US"
  u.rate = 0.9
  // 不再设 pitch，让系统默认（pitch=1）最自然
  const voice = pickEnVoice()
  if (voice) u.voice = voice
  speechSynthesis.speak(u)
}

// === Bruce Lee "阿达!" Sound (Web Audio API synthesis) ===

export function playBruceLeeShout(pitch = 1.0) {
  try {
    const ctx = getCtx()
    const now = ctx.currentTime

    // Main oscillator - rising frequency for "阿达!" effect
    const osc = ctx.createOscillator()
    osc.type = "sawtooth"
    osc.frequency.setValueAtTime(500 * pitch, now)
    osc.frequency.linearRampToValueAtTime(1200 * pitch, now + 0.15)
    osc.frequency.linearRampToValueAtTime(800 * pitch, now + 0.3)

    // Gain envelope - quick attack, quick decay
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.5, now)
    gain.gain.linearRampToValueAtTime(0.3, now + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.4)

    // Extra harmonics for SpecialMove (pitch > 1.3)
    if (pitch > 1.3) {
      const osc2 = ctx.createOscillator()
      osc2.type = "square"
      osc2.frequency.setValueAtTime(1000 * pitch, now)
      osc2.frequency.linearRampToValueAtTime(1800 * pitch, now + 0.15)
      const gain2 = ctx.createGain()
      gain2.gain.setValueAtTime(0.2, now)
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.3)
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(now)
      osc2.stop(now + 0.35)
    }
  } catch { /* audio not available */ }
}

export function getSkillPitch(skillIndex: number): number {
  return [1.0, 1.2, 1.3, 1.4, 1.5][skillIndex] || 1.0
}
