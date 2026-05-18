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
