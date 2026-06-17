/**
 * 诗词听书 — Edge TTS 批量生成朗诵音频
 *
 * 为 2028+ 首诗生成朗诵 mp3：
 *   - original.mp3  : 原文朗诵（按诗人性别选音色）
 *   - translation.mp3: 译文+赏析 朗诵
 *
 * 用法：
 *   node tts.mjs                  # 批量生成所有诗的朗诵
 *   node tts.mjs --poc 1004       # PoC 验证，只处理 ID=1004
 *   node tts.mjs --ids 1,2,3      # 指定 ID
 *   node tts.mjs --concurrency 2  # 并发数（默认 2）
 *   node tts.mjs --type original  # 只生成原文 / translation
 *   node tts.mjs --status         # 查看进度
 *   node tts.mjs --reset          # 重置状态（重跑所有）
 *
 * 输出：
 *   apps/xueshici/public/audio/poems/{id}_{type}.mp3
 *
 * 音色策略（Edge TTS 中文语音）：
 *   - 男诗人 (李白/杜甫/苏轼/王维/...) → zh-CN-YunxiNeural（阳光活泼，叙事感强）
 *   - 女诗人 (李清照/薛涛/鱼玄机/...) → zh-CN-XiaoxiaoNeural（温暖柔和）
 *   - 佚名/未识别 → zh-CN-YunxiNeural（默认）
 *
 * 优势：
 *   - 免费，无需 API Key
 *   - 中文神经语音，质量堪比真人
 *   - 支持多音色、语速控制
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync, unlinkSync, copyFileSync, statSync, renameSync as fsRenameSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ===== 颜色日志 =====
const C = {
  reset: '\x1b[0m', green: '\x1b[32m', yellow: '\x1b[33m',
  red: '\x1b[31m', blue: '\x1b[34m', cyan: '\x1b[36m', dim: '\x1b[2m',
}
const log = (color, tag, msg) => console.log(`${color}[${tag}]${C.reset} ${msg}`)

// ===== 配置 =====
const CONFIG = {
  // 输入：诗词数据
  poemsFile: resolve(__dirname, '../../apps/xueshici/public/images/poems/poems-data.json'),
  // 输出：朗诵音频
  outputDirs: [
    resolve(__dirname, '../../apps/xueshici/public/audio/poems'),
    resolve(__dirname, '../../apps/xueshici/dist/audio/poems'),
    resolve(__dirname, '../../apps/xueshici/public/images/poems'),  // 兼容旧路径
  ],
  // Edge TTS 音色映射
  voices: {
    male: 'zh-CN-YunxiNeural',       // 阳光叙事男声
    female: 'zh-CN-XiaoxiaoNeural',  // 温暖柔和女声
  },
  // 女诗人列表
  femaleAuthors: [
    '李清照', '薛涛', '鱼玄机', '上官婉儿', '班婕妤', '蔡文姬',
    '管道升', '朱淑真', '吴藻', '顾太清', '柳如是',
  ],
  // 状态文件
  statusFile: resolve(__dirname, 'tts-status.json'),
  // 并发（edge-tts 是免费服务，并发太高可能被限流）
  concurrency: 2,
  // 重试
  maxRetries: 3,
  retryDelay: 2000,
  // 每段请求间隔（毫秒）
  requestDelay: 500,
  // 朗读语速（负值=慢，+0% 正常）
  rate: '-10%',
  // 日志
  logLevel: 'summary',  // all | summary | error
}

// ===== 工具：判断作者性别 =====
function getAuthorGender(author) {
  if (!author) return 'male'
  for (const f of CONFIG.femaleAuthors) {
    if (author.includes(f)) return 'female'
  }
  return 'male'
}

function getVoiceId(poem) {
  return CONFIG.voices[getAuthorGender(poem.author)]
}

// ===== 状态管理 =====
class Status {
  constructor() {
    this.data = existsSync(CONFIG.statusFile)
      ? JSON.parse(readFileSync(CONFIG.statusFile, 'utf-8'))
      : { done: {}, failed: {}, totalChars: 0 }
  }
  reset() {
    this.data = { done: {}, failed: {}, totalChars: 0 }
    this._save()
    log(C.yellow, '重置', '状态已清空')
  }
  markDone(key, size, chars) {
    this.data.done[key] = { size, chars, at: new Date().toISOString() }
    this.data.totalChars += chars
    this._save()
  }
  markFailed(key, error) {
    this.data.failed[key] = { error: String(error).slice(0, 200), at: new Date().toISOString() }
    this._save()
  }
  isDone(key) { return !!this.data.done[key] }
  isFailed(key) { return !!this.data.failed[key] }
  _save() { writeFileSync(CONFIG.statusFile, JSON.stringify(this.data, null, 2)) }
  printStats() {
    log(C.cyan, '状态', `已完成 ${Object.keys(this.data.done).length} 段，失败 ${Object.keys(this.data.failed).length} 段，文本总 ${this.data.totalChars} 字`)
  }
}

// ===== Edge TTS 调用（使用文本文件避免 shell 长度/转义问题） =====
async function callEdgeTTS(text, voiceId, outputPath) {
  if (!text || !text.trim()) throw new Error('Empty text')

  const tmpMp3 = outputPath + '.tmp.mp3'
  const tmpTxt = outputPath + '.tmp.txt'

  try {
    // 确保输出目录存在
    mkdirSync(dirname(outputPath), { recursive: true })

    // 写入文本到临时文件（避免 shell 参数过长/转义问题）
    writeFileSync(tmpTxt, text, 'utf-8')

    // 调用 edge-tts Python 模块生成音频
    const rate = CONFIG.rate ? `--rate=${CONFIG.rate}` : ''
    const cmd = `python3 -m edge_tts --voice ${voiceId} ${rate} --file ${JSON.stringify(tmpTxt)} --write-media ${JSON.stringify(tmpMp3)}`
    execSync(cmd, { timeout: 300000, stdio: 'pipe' })

    // 检查生成的文件
    if (!existsSync(tmpMp3)) throw new Error('No output file generated')

    const size = statSync(tmpMp3)?.size || 0
    if (size < 100) {
      try { unlinkSync(tmpMp3) } catch {}
      throw new Error('Output too small (' + size + 'B)')
    }

    // 清理临时文本文件
    try { unlinkSync(tmpTxt) } catch {}

    // 移到目标路径
    try { fsRenameSync(tmpMp3, outputPath) } catch (e) {
      copyFileSync(tmpMp3, outputPath)
      unlinkSync(tmpMp3)
    }
    return size
  } catch (err) {
    try { if (existsSync(tmpMp3)) unlinkSync(tmpMp3) } catch {}
    try { if (existsSync(tmpTxt)) unlinkSync(tmpTxt) } catch {}
    throw err
  }
}

// ===== 生成单段音频 =====
async function generateOne(poem, type, status) {
  const sec = poem.sections && poem.sections[0]
  if (!sec) return { ok: false, reason: 'no_section' }

  // 准备文本
  let text
  if (type === 'original') {
    text = `《${poem.title}》${poem.author}，${poem.dynasty}。\n${sec.original.replace(/\n/g, '，')}`
  } else if (type === 'translation') {
    // 译文 = 译文 + 赏析
    text = (sec.translation || '') + '\n\n' + (sec.interpretation || '')
    text = text.trim()
  } else if (type === 'interpretation') {
    text = sec.interpretation || sec.translation || ''
  } else {
    return { ok: false, reason: 'invalid_type' }
  }

  const key = `${poem.id}-${type}`
  if (status.isDone(key)) {
    return { ok: true, reason: 'already_exists', skipped: true }
  }

  const voiceId = getVoiceId(poem)
  const outputPath = join(CONFIG.outputDirs[0], `${poem.id}_${type}.mp3`)

  // 多次重试
  let lastErr = null
  for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      const size = await callEdgeTTS(text, voiceId, outputPath)
      // 复制到其他输出目录
      for (let i = 1; i < CONFIG.outputDirs.length; i++) {
        try {
          const altDest = join(CONFIG.outputDirs[i], `${poem.id}_${type}.mp3`)
          if (!existsSync(altDest)) {
            const { copyFileSync } = await import('fs')
            copyFileSync(outputPath, altDest)
          }
        } catch (e) { /* 忽略 */ }
      }
      status.markDone(key, size, text.length)
      return { ok: true, size, voiceId, chars: text.length }
    } catch (err) {
      lastErr = err
      const isRateLimit = String(err).includes('rate limit') || String(err).includes('429')
      const delay = CONFIG.retryDelay * attempt * (isRateLimit ? 5 : 1)
      if (attempt < CONFIG.maxRetries) {
        await new Promise(r => setTimeout(r, delay))
      }
    }
  }
  status.markFailed(key, lastErr)
  return { ok: false, reason: 'tts_failed', error: String(lastErr).slice(0, 100) }
}

// ===== 主流程 =====
async function main() {
  const args = process.argv.slice(2)
  const isPoc = args.includes('--poc')
  const pocId = isPoc ? parseInt(args[args.indexOf('--poc') + 1]) : null
  const idsIdx = args.indexOf('--ids')
  const specifiedIds = idsIdx >= 0 ? args[idsIdx + 1].split(',').map(s => parseInt(s.trim())) : null
  const concIdx = args.indexOf('--concurrency')
  if (concIdx >= 0) CONFIG.concurrency = parseInt(args[concIdx + 1])
  const typeIdx = args.indexOf('--type')
  const onlyType = typeIdx >= 0 ? args[typeIdx + 1] : null
  const isStatus = args.includes('--status')
  const isReset = args.includes('--reset')

  // 检查 poems-data.json
  if (!existsSync(CONFIG.poemsFile)) {
    log(C.red, '错误', `未找到 ${CONFIG.poemsFile}`)
    process.exit(1)
  }

  // 准备输出目录
  for (const dir of CONFIG.outputDirs) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  }

  // 加载
  const poems = JSON.parse(readFileSync(CONFIG.poemsFile, 'utf-8'))
  log(C.blue, '加载', `${poems.length} 首诗`)

  const status = new Status()
  if (isReset) {
    status.reset()
    return
  }
  if (isStatus) {
    status.printStats()
    return
  }

  // 筛选
  let target = poems
  if (pocId) {
    target = poems.filter(p => p.id === pocId)
    log(C.cyan, 'PoC', `处理 ID=${pocId}`)
  } else if (specifiedIds) {
    target = poems.filter(p => specifiedIds.includes(p.id))
    log(C.cyan, '指定', `处理 ${target.length} 首诗`)
  } else {
    log(C.cyan, '批量', `处理所有 ${target.length} 首诗 × 2 段`)
  }

  // 段类型
  const types = onlyType ? [onlyType] : ['original', 'translation']

  // 构建任务列表（诗 × 段类型）
  const tasks = []
  for (const p of target) {
    for (const t of types) {
      tasks.push({ poem: p, type: t })
    }
  }
  log(C.cyan, '任务', `共 ${tasks.length} 段待生成`)

  // 过滤已完成的
  const remaining = tasks.filter(t => !status.isDone(`${t.poem.id}-${t.type}`))
  if (remaining.length === 0) {
    log(C.yellow, '提示', '所有任务已完成！')
    return
  }
  if (remaining.length < tasks.length) {
    log(C.dim, '跳过', `${tasks.length - remaining.length} 段已存在`)
  }

  // 并发执行
  const startTime = Date.now()
  let success = 0, failed = 0, skipped = 0
  const failures = []
  let lastProgressLog = 0

  const queue = [...remaining]
  const workers = []
  for (let w = 0; w < CONFIG.concurrency; w++) {
    workers.push((async () => {
      while (queue.length > 0) {
        const task = queue.shift()
        if (!task) break
        const result = await generateOne(task.poem, task.type, status)
        if (result.ok && result.skipped) {
          skipped++
        } else if (result.ok) {
          success++
          if (CONFIG.logLevel === 'all') {
            log(C.green, '完成', `ID=${task.poem.id} ${task.type} ${result.size}B voice=${result.voiceId}`)
          }
        } else {
          failed++
          failures.push({ id: task.poem.id, type: task.type, error: result.error || result.reason })
          if (CONFIG.logLevel !== 'error') {
            log(C.red, '失败', `ID=${task.poem.id} ${task.type}: ${result.reason} ${result.error || ''}`)
          }
        }
        // 请求间隔
        await new Promise(r => setTimeout(r, CONFIG.requestDelay))

        // 进度日志
        const done = success + failed + skipped
        const total = remaining.length
        if (total > 10 && done - lastProgressLog >= Math.max(10, Math.floor(total / 20))) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
          const speed = (success / Math.max(1, elapsed) * 60).toFixed(1)
          log(C.cyan, '进度', `[${done}/${total}] 成功:${success} 跳过:${skipped} 失败:${failed} 速度:${speed}段/分钟 耗时:${elapsed}s`)
          lastProgressLog = done
        }
      }
    })())
  }
  await Promise.all(workers)

  // 汇总
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  const rate = success > 0 ? (success / parseFloat(elapsed) * 60).toFixed(1) : '0'
  console.log('\n' + '='.repeat(60))
  log(C.green, '汇总', `完成 ${success} 段，跳过 ${skipped} 段，失败 ${failed} 段（耗时 ${elapsed}s，速度 ${rate}段/分钟）`)
  if (failures.length > 0) {
    console.log('\n失败列表（前 10）：')
    for (const f of failures.slice(0, 10)) console.log(`  ID=${f.id} ${f.type}: ${f.error}`)
  }
  console.log('='.repeat(60))
}

main().catch(err => {
  console.error(`\n${C.red}❌ 异常:${C.reset}`, err)
  process.exit(1)
})
