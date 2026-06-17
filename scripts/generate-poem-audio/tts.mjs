/**
 * 诗词听书 — MiniMax TTS 批量生成朗诵音频
 *
 * 为 905+ 首诗生成朗诵 mp3：
 *   - original.mp3  : 原文朗诵（按诗人性别选音色）
 *   - translation.mp3: 译文+讲解词 朗诵
 *
 * 用法：
 *   node tts.mjs                  # 批量生成所有诗的朗诵
 *   node tts.mjs --poc 1004       # PoC 验证，只处理 ID=1004
 *   node tts.mjs --ids 1,2,3      # 指定 ID
 *   node tts.mjs --concurrency 4 # 并发数（默认 2）
 *   node tts.mjs --type original  # 只生成原文 / translation
 *   node tts.mjs --status         # 查看进度
 *
 * 输出：
 *   ../../apps/xueshici/public/audio/poems/{id}_{type}.mp3
 *
 * 音色策略：
 *   - 男诗人 (李白/杜甫/苏轼/王维/...) → male-qn-jingying (精英青年)
 *   - 女诗人 (李清照/薛涛/鱼玄机/...) → female-chengshu (成熟女性)
 *   - 佚名/未识别 → male-qn-jingying (默认稳健男声)
 *
 * 成本估算：
 *   - 906 段 × 2 (原文+译文) = 1812 段 mp3
 *   - 每段 ~100KB，1812 × 100KB = ~180MB
 *   - MiniMax 月度套餐 ¥29 覆盖
 */

import { readFileSync, existsSync, mkdirSync, statSync, writeFileSync, readdirSync } from 'fs'
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
  // MiniMax API
  apiUrl: process.env.ANTHROPIC_BASE_URL || 'https://api.minimaxi.com/anthropic',
  apiKey: process.env.ANTHROPIC_AUTH_TOKEN || '',
  // TTS 端点（与 t2a_pro 文档一致）
  ttsEndpoint: 'https://api.minimaxi.com/v1/t2a_pro',
  // 音色映射
  voices: {
    male: 'male-qn-jingying',     // 精英青年 - 沉稳儒雅
    female: 'female-chengshu',    // 成熟女性 - 端庄大方
  },
  // 女诗人列表
  femaleAuthors: [
    '李清照', '薛涛', '鱼玄机', '上官婉儿', '班婕妤', '蔡文姬',
    '管道升', '朱淑真', '吴藻', '顾太清', '柳如是',
  ],
  // 状态文件
  statusFile: resolve(__dirname, 'tts-status.json'),
  // 并发
  concurrency: 4,
  // 重试
  maxRetries: 5,
  retryDelay: 3000,
  // 速率限制
  requestDelay: 1000,
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
  _save() { writeFileSync(CONFIG.statusFile, JSON.stringify(this.data, null, 2)) }
  printStats() {
    log(C.cyan, '状态', `已完成 ${Object.keys(this.data.done).length} 段，失败 ${Object.keys(this.data.failed).length} 段，文本总 ${this.data.totalChars} 字`)
  }
}

// ===== TTS API 调用 =====
async function callTTS(text, voiceId) {
  if (!CONFIG.apiKey) throw new Error('ANTHROPIC_AUTH_TOKEN not set')
  if (!text || !text.trim()) throw new Error('Empty text')

  const resp = await fetch(CONFIG.ttsEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CONFIG.apiKey}`,
    },
    body: JSON.stringify({
      model: 'speech-02',
      text: text.slice(0, 5000),  // 限制单次长度
      voice_id: voiceId,
      audio_setting: {
        sample_rate: 32000,
        bitrate: 128000,
        format: 'mp3',
      },
    }),
  })

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`HTTP ${resp.status}: ${text.slice(0, 200)}`)
  }
  const data = await resp.json()
  if (data.base_resp?.status_code !== 0) {
    throw new Error(`API error: ${data.base_resp?.status_msg}`)
  }
  if (!data.audio_file) {
    throw new Error('No audio_file in response')
  }
  return data.audio_file
}

// ===== 下载远程 mp3 =====
async function downloadMp3(url, destPath) {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Download failed: HTTP ${resp.status}`)
  const buffer = Buffer.from(await resp.arrayBuffer())
  // 复制到所有输出目录
  const { copyFileSync } = await import('fs')
  writeFileSync(destPath, buffer)
  for (let i = 1; i < CONFIG.outputDirs.length; i++) {
    try {
      const altDest = join(CONFIG.outputDirs[i], destPath.split('/').pop())
      if (!existsSync(altDest)) copyFileSync(destPath, altDest)
    } catch (e) { /* 忽略 */ }
  }
  return buffer.length
}

// ===== 生成单段音频 =====
async function generateOne(poem, type, status) {
  const sec = poem.sections[0]
  if (!sec) return { ok: false, reason: 'no_section' }

  // 准备文本
  let text
  if (type === 'original') {
    text = `《${poem.title}》${poem.author}，${poem.dynasty}。\n${sec.original.replace(/\n/g, '，')}`
  } else if (type === 'translation') {
    // 译文 = 译文 + 赏析（朗读页面"解读"区完整内容）
    text = (sec.translation || '') + '\n\n' + (sec.interpretation || '')
    text = text.trim()
  } else if (type === 'interpretation') {
    // 赏析 = 仅赏析
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
      const audioUrl = await callTTS(text, voiceId)
      const size = await downloadMp3(audioUrl, outputPath)
      status.markDone(key, size, text.length)
      return { ok: true, size, voiceId, chars: text.length }
    } catch (err) {
      lastErr = err
      const isRateLimit = String(err).includes('rate limit')
      const delay = CONFIG.retryDelay * attempt + (isRateLimit ? 8000 : 0)
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

  // 检查
  if (!CONFIG.apiKey) {
    log(C.red, '错误', 'ANTHROPIC_AUTH_TOKEN 未设置')
    process.exit(1)
  }
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

  if (tasks.length === 0) {
    log(C.yellow, '提示', '没有任务')
    return
  }

  // 并发执行
  const startTime = Date.now()
  let success = 0, failed = 0, skipped = 0
  const failures = []
  let lastProgressLog = 0

  const queue = [...tasks]
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
        // 速率限制
        await new Promise(r => setTimeout(r, CONFIG.requestDelay))

        // 进度日志
        const done = success + failed + skipped
        if (tasks.length > 20 && done - lastProgressLog >= Math.max(20, Math.floor(tasks.length / 20))) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
          const speed = (success / Math.max(1, elapsed) * 60).toFixed(1)
          log(C.cyan, '进度', `[${done}/${tasks.length}] 成功:${success} 跳过:${skipped} 失败:${failed} 速度:${speed}段/分钟 耗时:${elapsed}s`)
          lastProgressLog = done
        }
      }
    })())
  }
  await Promise.all(workers)

  // 汇总
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  const speed = success > 0 ? (success / parseFloat(elapsed) * 60).toFixed(1) : '0'
  console.log('\n' + '='.repeat(60))
  log(C.green, '汇总', `完成 ${success} 段，跳过 ${skipped} 段，失败 ${failed} 段（耗时 ${elapsed}s，速度 ${speed}段/分钟）`)
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
