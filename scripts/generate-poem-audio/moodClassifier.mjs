/**
 * 诗词情绪分类器 + 音色矩阵
 *
 * 与前端 `apps/xueshici/src/lib/audio.ts::detectMood()` 保持 1:1 一致：
 *   - 同样的 6 种 mood（heroic/graceful/pastoral/frontier/lyric/narrative）
 *   - 同样的判断顺序（frontier → pastoral楚辞 → heroic → lyric → pastoral王维 → narrative → graceful）
 *   - 同样的 regex 链
 *
 * 不同之处：
 *   - 本文件是后端 Node ESM（无 TypeScript、无 Next.js 构建依赖）
 *   - 额外提供 6×2 音色矩阵（VOICE_MATRIX）
 *   - 提供 getAuthorGender / getVoiceProfile 工具
 *
 * 决策原则：
 *   - gender = getAuthorGender(poem.author)
 *   - mood = detectMood(poem)
 *   - profile = VOICE_MATRIX[mood][gender]
 *   - type === 'translation' / 'interpretation' 时强制 style = null（译文/赏析保持中性讲解，不上朗诵腔）
 */

// ===== 6 种 mood =====
export const MOODS = ['heroic', 'graceful', 'pastoral', 'frontier', 'lyric', 'narrative']

// ===== 情绪判断（与 audio.ts::detectMood 同步） =====
export function detectMood(poem) {
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

// ===== 作者性别 =====
const FEMALE_AUTHORS = [
  '李清照', '薛涛', '鱼玄机', '上官婉儿', '班婕妤', '蔡文姬',
  '管道升', '朱淑真', '吴藻', '顾太清', '柳如是',
]

export function getAuthorGender(author) {
  if (!author) return 'male'
  for (const f of FEMALE_AUTHORS) {
    if (author.includes(f)) return 'female'
  }
  return 'male'
}

// ===== 音色 × 情绪 × 性别 矩阵 =====
// style = null 时表示纯 voice + prosody rate（无情感样式）
// styleDegree 推荐 1.5（中等强度），过强会失真
const VOICE_MATRIX = {
  heroic: {
    male:   { voice: 'zh-CN-YunyangNeural',    style: 'assertive',   styleDegree: 1.5, rate: '-5%'  },
    female: { voice: 'zh-CN-XiaoxiaoNeural',   style: 'cheerful',    styleDegree: 1.5, rate: '-5%'  },
  },
  graceful: {
    male:   { voice: 'zh-CN-YunxiNeural',      style: 'gentle',      styleDegree: 1.5, rate: '-15%' },
    female: { voice: 'zh-CN-XiaoxiaoNeural',   style: 'gentle',      styleDegree: 1.5, rate: '-15%' },
  },
  pastoral: {
    male:   { voice: 'zh-CN-YunxiNeural',      style: 'calm',        styleDegree: 1.5, rate: '-20%' },
    female: { voice: 'zh-CN-XiaoxiaoNeural',   style: 'gentle',      styleDegree: 1.5, rate: '-20%' },
  },
  frontier: {
    male:   { voice: 'zh-CN-YunjianNeural',    style: 'serious',     styleDegree: 1.5, rate: '-5%'  },
    female: { voice: 'zh-CN-XiaoxiaoNeural',   style: 'serious',     styleDegree: 1.5, rate: '-5%'  },
  },
  lyric: {
    male:   { voice: 'zh-CN-YunxiNeural',      style: 'calm',        styleDegree: 1.5, rate: '-15%' },
    female: { voice: 'zh-CN-XiaoxiaoNeural',   style: 'affectionate',styleDegree: 1.5, rate: '-15%' },
  },
  narrative: {
    male:   { voice: 'zh-CN-YunxiNeural',      style: 'narration',   styleDegree: 1.5, rate: '-10%' },
    female: { voice: 'zh-CN-XiaoxiaoNeural',   style: 'calm',        styleDegree: 1.5, rate: '-10%' },
  },
}

// ===== 综合决策：诗 → 完整音色配置 =====
/**
 * @param {object} poem
 * @param {string} [type='original'] - 'original' 应用 mood×style，'translation' 强制 style=null
 * @returns {{ voice: string, style: string|null, styleDegree: number, rate: string, gender: 'male'|'female', mood: string }}
 */
export function getVoiceProfile(poem, type = 'original') {
  const gender = getAuthorGender(poem?.author)
  const mood = detectMood(poem)
  const profile = VOICE_MATRIX[mood][gender]

  // translation / interpretation 强制无 style，保持讲解中性
  const isTranslation = type === 'translation' || type === 'commentary' || type === 'interpretation'
  return {
    voice: profile.voice,
    style: isTranslation ? null : profile.style,
    styleDegree: profile.styleDegree,
    rate: profile.rate,
    gender,
    mood,
  }
}

// ===== 列出所有矩阵配置（用于调试/报告） =====
export function describeMatrix() {
  const lines = ['mood × gender → voice / style / rate:']
  for (const mood of MOODS) {
    for (const gender of ['male', 'female']) {
      const p = VOICE_MATRIX[mood][gender]
      lines.push(`  ${mood}/${gender.padEnd(6)}: ${p.voice.padEnd(25)} style=${(p.style || '(none)').padEnd(13)} rate=${p.rate}`)
    }
  }
  return lines.join('\n')
}
