/**
 * 诗词朗读 — 使用预生成的 MiniMax TTS mp3 真人朗诵 + 背景音乐
 *
 * 优势：
 *   - 真人音色，发音自然有感情（vs Web Speech 机械）
 *   - 已按诗人生平选音色（李白/苏轼用男声，李清照用女声）
 *   - 朗读时自动循环背景音乐（按诗体选曲）
 *
 * 资源路径：
 *   - 朗诵：/audio/poems/{id}_original.mp3 / {id}_translation.mp3 / {id}_interpretation.mp3
 *   - BGM：  /audio/bgm/{heroic|lyric|pastoral|frontier|narrative|graceful}.mp3
 */

// 当前正在朗读的 audio 元素（用于停止）
let currentAudio: HTMLAudioElement | null = null
let currentBgm: HTMLAudioElement | null = null

// ===== 朗诵 =====

export interface PlayOptions {
  src: string             // mp3 URL
  onEnd?: () => void
  bgmSrc?: string         // 背景音乐 URL（可选）
  bgmVolume?: number      // 0-1，默认 0.3
  playbackRate?: number   // 播放速率，默认 0.85（更慢适合儿童）
}

export function playMp3(opts: PlayOptions): void {
  stopAll()

  const audio = new Audio(opts.src)
  audio.preload = 'auto'
  // 慢速播放 + 保持音调自然（避免变成花栗鼠声）
  audio.playbackRate = opts.playbackRate ?? 0.85
  // @ts-ignore preservesPitch 是标准属性但 TS 旧版可能没声明
  if ('preservesPitch' in audio) audio.preservesPitch = true
  // @ts-ignore 同上 moz/webkit 前缀
  ;(audio as any).mozPreservesPitch = true
  ;(audio as any).webkitPreservesPitch = true
  currentAudio = audio

  audio.onended = () => {
    opts.onEnd?.()
    // 朗诵结束，停 BGM（也可选保留淡出）
    stopBgm()
  }
  audio.onerror = () => {
    console.warn('[audio] mp3 load failed, falling back to Web Speech:', opts.src)
    opts.onEnd?.()
    stopBgm()
  }
  audio.play().catch(err => {
    console.warn('[audio] mp3 play failed:', err)
    opts.onEnd?.()
  })

  // 启动背景音乐
  if (opts.bgmSrc) {
    playBgm(opts.bgmSrc, opts.bgmVolume ?? 0.3)
  }
}

export function stopAll(): void {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.src = ''
    currentAudio = null
  }
  stopBgm()
}

/** @deprecated 兼容旧 API，等价于 stopAll() */
export function stopSpeaking(): void {
  stopAll()
}

// ===== 背景音乐 =====

export function playBgm(src: string, volume: number = 0.3): void {
  stopBgm()
  const bgm = new Audio(src)
  bgm.loop = true
  bgm.volume = volume
  bgm.preload = 'auto'
  currentBgm = bgm
  bgm.play().catch(err => {
    console.warn('[audio] bgm play failed:', err)
  })
}

export function stopBgm(): void {
  if (currentBgm) {
    currentBgm.pause()
    currentBgm.src = ''
    currentBgm = null
  }
}

export function setBgmVolume(v: number): void {
  if (currentBgm) currentBgm.volume = Math.max(0, Math.min(1, v))
}

// ===== Web Speech 兜底（mp3 加载失败时） =====

let synth = typeof window !== 'undefined' ? window.speechSynthesis : null

export function speakWithFallback(text: string, onEnd?: () => void): void {
  if (!synth) {
    onEnd?.()
    return
  }
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'zh-CN'
  u.rate = 0.8
  u.onend = () => onEnd?.()
  synth.speak(u)
}

export { synth as speechSynth }

// ===== BGM 选曲（按诗体） =====

/**
 * 根据诗的风格选 BGM
 * - 诗经 / 楚辞 / 春秋战国 → pastoral（田园古朴）
 * - 边塞诗 / 战争 → frontier（边塞苍凉）
 * - 豪放（李白/苏轼/辛弃疾）→ heroic
 * - 婉约（李清照/柳永/秦观）→ lyric
 * - 田园（王维/陶渊明）→ pastoral
 * - 咏史/叙事 → narrative
 * - 默认 → graceful
 */
export type PoemMood = 'heroic' | 'lyric' | 'pastoral' | 'frontier' | 'narrative' | 'graceful'

export function selectBgm(poem: { author?: string; tags?: string; title?: string } | null): string {
  const mood = detectMood(poem)
  return `/audio/bgm/${mood}.mp3`
}

export function detectMood(poem: { author?: string; tags?: string; title?: string } | null): PoemMood {
  if (!poem) return 'graceful'
  const text = `${poem.author || ''} ${poem.tags || ''} ${poem.title || ''}`.toLowerCase()

  // 边塞
  if (/边塞|战争|从军|塞下|凉州|出塞|战|戍/.test(text)) return 'frontier'
  // 楚辞 / 诗经 / 春秋战国 → 田园古朴
  if (/楚辞|诗经|春秋战国/.test(text)) return 'pastoral'
  // 豪放派
  if (/李白|苏轼|辛弃疾|陆游|岳飞|豪放|豪迈|壮观|雄/.test(text)) return 'heroic'
  // 婉约派
  if (/李清照|柳永|秦观|晏殊|婉约|闺怨|相思|愁|离情/.test(text)) return 'lyric'
  // 田园
  if (/王维|陶渊明|孟浩然|田园|山水|隐逸/.test(text)) return 'pastoral'
  // 咏史叙事
  if (/杜甫|白居易|叙事|咏史|怀古|史记/.test(text)) return 'narrative'

  return 'graceful'
}
