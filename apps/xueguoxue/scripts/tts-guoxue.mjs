/**
 * 国学 — Edge TTS 批量生成朗诵音频
 *
 * ⚠️ 适用：经部/子部/史部/医部（非蒙学）
 * 蒙学音频需要独立方案（更适合儿童的声音）
 *
 * 音色策略（2026-06-21 最终确认）：
 *   - 所有段落：YunyangNeural（磁性中年男声，沉稳厚重）
 *   - 语速：-35%（慢速，适合儿童跟读）
 *   - 原文：加 narration 情感（沉稳叙事）
 *   - 译文/解读：中性讲解
 *
 * 文件名：{书名}_{节名}_{类型}.mp3
 *   类型：原文 / 译文 / 解读
 *
 * 用法：
 *   node scripts/tts-guoxue.mjs                    # 全部书籍全部音频
 *   node scripts/tts-guoxue.mjs --book jing-1       # 指定某本书
 *   node scripts/tts-guoxue.mjs --poc               # 每个书只生成1节测试
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync, unlinkSync, renameSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_DIR = resolve(__dirname, '..')

const CONFIG = {
  outputDir: resolve(APP_DIR, 'public/audio/books'),
  // 要处理的书籍（空数组 = 扫描所有）
  bookIds: [],
  poc: process.argv.includes('--poc'),
  // ===== 最终确认配置 =====
  originalVoice: {
    voice: 'zh-CN-YunyangNeural',   // 磁性中年
    style: 'narration',              // 沉稳叙事
    styleDegree: '1.0',
    rate: '-35%',                    // 慢速
    pitch: '+0Hz',
  },
  translationVoice: {
    voice: 'zh-CN-YunyangNeural',   // 同音色
    style: null,                     // 中性讲解
    styleDegree: null,
    rate: '-35%',
    pitch: '+0Hz',
  },
  maxRetries: 3,
  retryDelay: 2000,
  requestDelay: 500,
}

// 解析命令行 --book jing-1,jing-2
if (process.argv.includes('--book')) {
  const idx = process.argv.indexOf('--book')
  CONFIG.bookIds = process.argv[idx + 1].split(',')
}

const C = { reset: '\x1b[0m', green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', blue: '\x1b[34m', cyan: '\x1b[36m' }
const log = (color, tag, msg) => console.log(`${color}[${tag}]${C.reset} ${msg}`)

function escapeXml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function buildSsml(text, voice, style, styleDegree, rate) {
  const body = escapeXml(text)
  if (style) {
    return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="zh-CN"><voice name="${voice}"><mstts:express-as style="${style}" styledegree="${styleDegree}">${body}</mstts:express-as></voice></speak>`
  }
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN"><voice name="${voice}"><prosody rate="${rate}">${body}</prosody></voice></speak>`
}

// ===== 解析 classics.ts 全部书籍 =====
function parseAllBooks(fileContent) {
  const books = []
  const bookRegex = /\{ id: '(jing|zi|shi|yi|meng)-\d+', title: '([^']+)',[\s\S]*?sections: \[/g
  let m
  while ((m = bookRegex.exec(fileContent)) !== null) {
    const id = m[1] + '-' + m[0].match(/'((?:jing|zi|shi|yi|meng)-\d+)'/)[1]
    const title = m[2]
    const startIdx = m.index + m[0].length
    books.push({ id: id.match(/'((?:jing|zi|shi|yi|meng)-\d+)'/)[1], title, startIdx })
  }
  return books
}

function parseSections(fileContent, classicId) {
  const re = new RegExp(`\\{ id: ['"]${classicId}['"]`)
  const startMatch = fileContent.match(re)
  if (!startMatch) return []

  const afterId = fileContent.slice(startMatch.index)
  const secArrStart = afterId.match(/sections:\s*\[/)
  if (!secArrStart) return []

  let pos = startMatch.index + secArrStart.index + secArrStart[0].length
  const text = fileContent
  let depth = 1, inStr = false, strChar = null, i

  for (i = pos; i < text.length && depth > 0; i++) {
    const ch = text[i]
    if (inStr) {
      if (ch === '\\') { i++; continue }
      if (ch === strChar) inStr = false
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = true; strChar = ch; continue }
    if (ch === '[') depth++
    else if (ch === ']') depth--
  }

  const sectionsText = text.slice(pos, i - 1)
  const sections = []
  let scanPos = 0

  while (scanPos < sectionsText.length) {
    const ob = sectionsText.indexOf('{', scanPos)
    if (ob < 0) break
    let d = 0, inS = false, sC = null, j
    for (j = ob; j < sectionsText.length; j++) {
      const c = sectionsText[j]
      if (inS) {
        if (c === '\\') { j++; continue }
        if (c === sC) inS = false
        continue
      }
      if (c === '"' || c === "'" || c === '`') { inS = true; sC = c; continue }
      if (c === '{') d++
      else if (c === '}') { d--; if (d === 0) break }
    }
    const block = sectionsText.slice(ob, j + 1)
    scanPos = j + 1

    const idM = block.match(/id:\s*['"]((?:jing|zi|shi|yi|meng)-\d+-s\d+)['"]/)
    if (!idM) continue

    const title = block.match(/title:\s*['"]([^'"]+)['"]/)?.[1] || ''
    const orig = extractField(block, 'original')
    const trans = extractField(block, 'translation')
    const interp = extractField(block, 'interpretation')

    sections.push({ id: idM[1], title, original: orig, translation: trans, interpretation: interp })
  }

  return sections
}

function extractField(text, fieldName) {
  const re = new RegExp(`${fieldName}:\\s*`)
  const m = text.match(re)
  if (!m) return ''
  const start = m.index + m[0].length
  const rest = text.slice(start)
  const firstChar = rest[0]
  if (firstChar === '`') {
    let result = '', i = 1
    for (; i < rest.length; i++) {
      if (rest[i] === '\\') { result += rest[++i]; continue }
      if (rest[i] === '`') break
      result += rest[i]
    }
    return result
  }
  if (firstChar === "'" || firstChar === '"') {
    let result = '', i = 1
    for (; i < rest.length; i++) {
      if (rest[i] === '\\') { result += rest[++i]; continue }
      if (rest[i] === firstChar) break
      result += rest[i]
    }
    return result
  }
  return ''
}

function sanitizeName(s) {
  return s.replace(/[（）()]/g, '').replace(/\s+/g, '')
}

function buildFilename(bookTitle, sectionTitle, typeLabel) {
  return `${sanitizeName(bookTitle)}_${sanitizeName(sectionTitle)}_${typeLabel}.mp3`
}

async function callEdgeTTS(text, profile, outputPath) {
  if (!text || !text.trim()) throw new Error('Empty text')
  const { voice, style, styleDegree, rate, pitch } = profile
  const tmpMp3 = outputPath + '.tmp.mp3'
  const tmpTxt = outputPath + '.tmp.txt'

  mkdirSync(dirname(outputPath), { recursive: true })

  const args = style
    ? ['-m', 'edge_tts', '--voice', voice, '--file', tmpTxt, '--write-media', tmpMp3]
    : ['-m', 'edge_tts', '--voice', voice, `--rate=${rate}`, `--pitch=${pitch || '+0Hz'}`, '--file', tmpTxt, '--write-media', tmpMp3]

  if (style) {
    writeFileSync(tmpTxt, buildSsml(text, voice, style, styleDegree, rate), 'utf-8')
  } else {
    writeFileSync(tmpTxt, text, 'utf-8')
  }

  const r = spawnSync('python3', args, { timeout: 300000, encoding: 'utf-8' })
  if (r.error) throw r.error
  if (r.status !== 0) {
    throw new Error(`edge-tts exit ${r.status}: ${(r.stderr || r.stdout || '').slice(0, 1500)}`)
  }
  if (!existsSync(tmpMp3)) throw new Error('No output file')
  const size = statSync(tmpMp3).size
  if (size < 100) {
    try { unlinkSync(tmpMp3) } catch {}
    throw new Error('File too small (' + size + 'B)')
  }
  renameSync(tmpMp3, outputPath)
  try { unlinkSync(tmpTxt) } catch {}
  return size
}

// ===== 主流程 =====
async function main() {
  log(C.cyan, '国学TTS', `音色: YunyangNeural | 语速: -35%`)
  const fileContent = readFileSync(resolve(APP_DIR, 'src/data/classics.ts'), 'utf-8')

  // 确定要处理的书籍
  const allBooks = parseAllBooks(fileContent)
  const booksToProcess = CONFIG.bookIds.length > 0
    ? allBooks.filter(b => CONFIG.bookIds.includes(b.id))
    : allBooks

  log(C.blue, '扫描', `共 ${allBooks.length} 本，本次处理 ${booksToProcess.length} 本`)

  let totalDone = 0, totalSkipped = 0, totalFailed = 0

  for (const book of booksToProcess) {
    const sections = parseSections(fileContent, book.id)
    log(C.blue, '解析', `${book.title}(${book.id}) → ${sections.length} 节`)

    if (sections.length === 0) continue
    const limit = CONFIG.poc ? 1 : sections.length

    for (let si = 0; si < limit; si++) {
      const sec = sections[si]
      for (const [type, label] of [['original', '原文'], ['translation', '译文'], ['interpretation', '解读']]) {
        const text = type === 'original' ? sec.original : type === 'translation' ? sec.translation : sec.interpretation
        if (!text.trim()) continue

        const filename = buildFilename(book.title, sec.title, label)
        const path = resolve(CONFIG.outputDir, filename)
        if (existsSync(path)) { totalSkipped++; continue }

        const profile = type === 'original' ? CONFIG.originalVoice : CONFIG.translationVoice
        log(C.cyan, '生成', `[${book.title}] ${sec.title} · ${label}`)

        let ok = false
        for (let retry = 0; retry < CONFIG.maxRetries; retry++) {
          try {
            const size = await callEdgeTTS(text, profile, path)
            log(C.green, '完成', `${filename} (${(size / 1024).toFixed(1)}KB)`)
            totalDone++
            ok = true
            break
          } catch (err) {
            if (retry < CONFIG.maxRetries - 1) {
              log(C.yellow, '重试', `${label}: ${String(err).slice(0, 200)}`)
              await new Promise(r => setTimeout(r, CONFIG.retryDelay))
            } else {
              log(C.red, '失败', `${label}: ${String(err).slice(0, 200)}`)
              totalFailed++
            }
          }
        }
        await new Promise(r => setTimeout(r, CONFIG.requestDelay))
      }
    }
  }

  log(C.green, '完毕', `生成 ${totalDone} 段 | 跳过 ${totalSkipped} 段 | 失败 ${totalFailed} 段`)
  if (CONFIG.poc) {
    log(C.yellow, '提示', 'PoC 完成，去掉 --poc 重新运行可生成全部')
  }
}

main().catch(e => { console.error(e); process.exit(1) })
