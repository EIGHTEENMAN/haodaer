import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

// ===================== Data Imports =====================
import { poemsData } from '../../xueshici/src/data/poems.ts'
import { classicData } from '../../xueguoxue/src/data/classics.ts'
import { words } from '../../english/src/data/words.ts'
import { knowledgeData, type Section, type Topic } from '../../xuetongshi/src/data/knowledge.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '..', 'data', 'game.db')

// ===================== Helpers =====================

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickN<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n)
}

function pickNExcept<T>(arr: T[], n: number, exclude: T[]): T[] {
  const pool = arr.filter(x => !exclude.includes(x))
  return shuffle(pool).slice(0, n)
}

/**
 * Pick distractors from multiple pools in priority order.
 * Tries the first pool first (most similar domain), then falls back to each subsequent pool.
 * Ensures correctValue and any already-selected items are excluded.
 */
function pickDistractors(
  correctValue: string,
  required: number,
  ...pools: string[][]
): string[] {
  const result: string[] = []
  const seen = new Set<string>([correctValue])

  for (const pool of pools) {
    if (result.length >= required) break
    for (const item of shuffle(pool)) {
      if (result.length >= required) break
      if (!seen.has(item)) {
        result.push(item)
        seen.add(item)
      }
    }
  }

  return result
}

/** Parse poem original text into individual lines (non-empty) */
function parsePoemLines(original: string): string[] {
  return original
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
}

/**
 * Try to split a line at a punctuation boundary for "next line" questions.
 * If a line has internal punctuation (，。？！), take the part after
 * the last punctuation as a shorter "line segment".
 */
function splitLineSegments(line: string): string[] {
  const parts = line.split(/[，。？！；：、]/).filter(s => s.trim().length > 0)
  return parts.length > 1 ? parts : [line]
}

type QuestionRow = {
  category: string
  question: string
  options: string // JSON.stringify of string[]
  answer: number
  difficulty: number
}

// ===================== 诗词 Generator (4,000 题, category: chinese) =====================

function generateShiciQuestions(): QuestionRow[] {
  const results: QuestionRow[] = []

  interface LineInfo {
    text: string
    poemTitle: string
    author: string
    dynasty: string
  }

  const allLines: LineInfo[] = []
  const allAuthors: string[] = []
  const allTitles: string[] = []

  for (const poem of poemsData) {
    allAuthors.push(poem.author)
    allTitles.push(poem.title)
    for (const section of poem.sections) {
      const lines = parsePoemLines(section.original)
      for (const line of lines) {
        const segments = splitLineSegments(line)
        for (const seg of segments) {
          if (seg.length >= 3) {
            allLines.push({
              text: seg,
              poemTitle: poem.title,
              author: poem.author,
              dynasty: poem.dynasty,
            })
          }
        }
      }
    }
  }

  const seenLines = new Set<string>()
  const uniqueLines = allLines.filter(l => {
    const key = l.text
    if (seenLines.has(key)) return false
    seenLines.add(key)
    return true
  })

  // Build domain pools for smarter distractor selection
  const linesByAuthor = new Map<string, LineInfo[]>()
  const linesByDynasty = new Map<string, LineInfo[]>()
  const titlesByAuthor = new Map<string, string[]>()

  for (const line of uniqueLines) {
    if (!linesByAuthor.has(line.author)) linesByAuthor.set(line.author, [])
    linesByAuthor.get(line.author)!.push(line)
    if (!linesByDynasty.has(line.dynasty)) linesByDynasty.set(line.dynasty, [])
    linesByDynasty.get(line.dynasty)!.push(line)
  }
  for (const poem of poemsData) {
    if (!titlesByAuthor.has(poem.author)) titlesByAuthor.set(poem.author, [])
    titlesByAuthor.get(poem.author)!.push(poem.title)
  }

  console.log(`  诗词: ${allLines.length} raw lines → ${uniqueLines.length} unique lines from ${allTitles.length} poems`)

  // Collect full original lines (not split by punctuation) for longer excerpts
  // Used by "出自哪首诗" questions to show complete couplets
  const longLines: LineInfo[] = []
  {
    const seenLong = new Set<string>()
    for (const poem of poemsData) {
      for (const section of poem.sections) {
        const lines = parsePoemLines(section.original)
        for (const line of lines) {
          const cleaned = line.trim()
          if (cleaned.length >= 5 && !seenLong.has(cleaned)) {
            seenLong.add(cleaned)
            longLines.push({
              text: cleaned,
              poemTitle: poem.title,
              author: poem.author,
              dynasty: poem.dynasty,
            })
          }
        }
      }
    }
  }

  // Collect couplet pairs (consecutive lines joined by "，") for longer excerpts
  // Used by "作者是谁" questions to show complete couplets
  const coupletLines: LineInfo[] = []
  {
    const seenCouplet = new Set<string>()
    for (const poem of poemsData) {
      for (const section of poem.sections) {
        const lines = parsePoemLines(section.original)
        for (let i = 0; i < lines.length - 1; i++) {
          const left = lines[i].trim().replace(/[，。？！；：、\n]/g, '')
          const right = lines[i + 1].trim().replace(/[，。？！；：、\n]/g, '')
          if (left.length < 2 || right.length < 2) continue
          const couplet = left + '，' + right
          if (!seenCouplet.has(couplet)) {
            seenCouplet.add(couplet)
            coupletLines.push({
              text: couplet,
              poemTitle: poem.title,
              author: poem.author,
              dynasty: poem.dynasty,
            })
          }
        }
      }
    }
  }

  // ----- Type A: "下一句" (target: 2,200) -----
  const usedLinePairs = new Set<string>()
  let targetA = 2200

  for (const poem of shuffle(poemsData)) {
    if (results.length - 0 >= targetA) break
    for (const section of poem.sections) {
      if (results.length - 0 >= targetA) break
      const lines = parsePoemLines(section.original)
      const phrases: string[] = []
      for (const line of lines) {
        const parts = splitLineSegments(line)
        phrases.push(...parts)
      }

      for (let i = 0; i < phrases.length - 1; i++) {
        if (results.length >= targetA) break
        const current = phrases[i]
        const next = phrases[i + 1]
        if (current.length < 2 || next.length < 2) continue
        const key = current + '|' + next
        if (usedLinePairs.has(key)) continue
        usedLinePairs.add(key)

        // Smart distractor selection: same poem > same author > same dynasty > any
        const samePoemLines = uniqueLines
          .filter(l => l.poemTitle === poem.title && l.text !== next && l.text !== current)
          .map(l => l.text)
        const sameAuthorLines = (linesByAuthor.get(poem.author) || [])
          .filter(l => l.poemTitle !== poem.title && l.text !== next && l.text !== current)
          .map(l => l.text)
        const sameDynastyLines = (linesByDynasty.get(poem.dynasty) || [])
          .filter(l => l.author !== poem.author && l.text !== next && l.text !== current)
          .map(l => l.text)
        const otherLines = uniqueLines
          .filter(l => l.text !== next && l.text !== current && l.author !== poem.author && l.dynasty !== poem.dynasty)
          .map(l => l.text)

        const distractors = pickDistractors(next, 3, samePoemLines, sameAuthorLines, sameDynastyLines, otherLines)
        if (distractors.length < 3) continue

        const options = shuffle([next, ...distractors])
        const answer = options.indexOf(next)

        const isFamous = poem.author === '李白' || poem.author === '杜甫' || poem.author === '苏轼' ||
          poem.author === '白居易' || poem.author === '王维'
        const diff = isFamous ? 1 : (poem.dynasty === '唐' || poem.dynasty === '宋' ? 1 : 2)

        results.push({
          category: 'shici',
          question: `「${current}」的下一句是？`,
          options: JSON.stringify(options),
          answer,
          difficulty: diff,
        })
      }
    }
  }
  console.log(`  已生成 下一句: ${results.filter(r => r.question.includes('下一句')).length} 题`)

  // ----- Type B: "作者是谁" (target: 1,100) -----
  const countB_start = results.length
  const targetB = 1100
  const usedAuthors = new Set<string>()

  // Build dynasty-author groupings for plausible distractor selection
  const authorsByDynasty = new Map<string, string[]>()
  for (const line of uniqueLines) {
    if (!authorsByDynasty.has(line.dynasty)) authorsByDynasty.set(line.dynasty, [])
    if (!authorsByDynasty.get(line.dynasty)!.includes(line.author)) {
      authorsByDynasty.get(line.dynasty)!.push(line.author)
    }
  }

  for (const line of shuffle(coupletLines.length > 0 ? coupletLines : uniqueLines)) {
    if (results.length - countB_start >= targetB) break
    const key = line.text + '|' + line.author
    if (usedAuthors.has(key)) continue
    usedAuthors.add(key)

    // Smart: same dynasty authors first, then fallback to other authors
    const sameDynastyAuthors = (authorsByDynasty.get(line.dynasty) || []).filter(a => a !== line.author)
    const otherAuthors = allAuthors.filter(a => a !== line.author && !sameDynastyAuthors.includes(a))
    const distractors = pickDistractors(line.author, 3, sameDynastyAuthors, otherAuthors)
    if (distractors.length < 3) continue

    const options = shuffle([line.author, ...distractors])
    const answer = options.indexOf(line.author)

    const isVeryFamous = ['李白', '杜甫', '苏轼', '白居易', '王维', '孟浩然', '王昌龄', '杜牧', '李商隐', '李清照', '辛弃疾'].includes(line.author)
    const diff = isVeryFamous ? 1 : 2

    results.push({
      category: 'shici',
      question: `「${line.text}」是哪位诗人写的？`,
      options: JSON.stringify(options),
      answer,
      difficulty: diff,
    })
  }
  console.log(`  已生成 作者是谁: ${results.filter(r => r.question.includes('哪位诗人')).length} 题`)

  // ----- Type C: "出自哪首诗" (target: 1,100) -----
  const countC_start = results.length
  const targetC = 1100
  const usedPoemQ = new Set<string>()

  for (const line of shuffle(coupletLines.length > 0 ? coupletLines : longLines)) {
    if (results.length - countC_start >= targetC) break
    const key = line.text + '|' + line.poemTitle
    if (usedPoemQ.has(key)) continue
    usedPoemQ.add(key)

    if (line.text.includes(line.poemTitle)) continue

    // Smart: same author's other poems first, then same dynasty, then any
    const sameAuthorTitles = (titlesByAuthor.get(line.author) || []).filter(t => t !== line.poemTitle)
    const distractors = pickDistractors(line.poemTitle, 3, sameAuthorTitles, allTitles)
    if (distractors.length < 3) continue

    const options = shuffle([line.poemTitle, ...distractors])
    const answer = options.indexOf(line.poemTitle)

    const diff = [1, 2, 2][Math.floor(Math.random() * 3)]

    results.push({
      category: 'shici',
      question: `「${line.text}」出自哪首诗？`,
      options: JSON.stringify(options),
      answer,
      difficulty: diff,
    })
  }
  console.log(`  已生成 出自哪首: ${results.filter(r => r.question.includes('出自哪首')).length} 题`)

  return results
}

// ===================== 国学 Generator (2,000 题, category: chinese) =====================

function generateGuoxueQuestions(): QuestionRow[] {
  const results: QuestionRow[] = []

  const allClassicTitles: string[] = classicData.map(c => c.title)
  const allAuthors: string[] = [...new Set(classicData.filter(c => c.author && c.author.length > 0).map(c => c.author))]

  // Build domain pools
  const titlesByCategory = new Map<string, string[]>()
  const authorsByDynasty = new Map<string, string[]>()
  const allDynasties: string[] = []

  for (const classic of classicData) {
    if (classic.category) {
      if (!titlesByCategory.has(classic.category)) titlesByCategory.set(classic.category, [])
      titlesByCategory.get(classic.category)!.push(classic.title)
    }
    if (classic.author && classic.dynasty) {
      if (!authorsByDynasty.has(classic.dynasty)) authorsByDynasty.set(classic.dynasty, [])
      if (!authorsByDynasty.get(classic.dynasty)!.includes(classic.author)) {
        authorsByDynasty.get(classic.dynasty)!.push(classic.author)
      }
    }
    if (classic.dynasty && !allDynasties.includes(classic.dynasty)) {
      allDynasties.push(classic.dynasty)
    }
  }

  interface ClassicLine {
    text: string
    classicTitle: string
    author: string
  }
  const allLines: ClassicLine[] = []

  for (const classic of classicData) {
    for (const section of classic.sections) {
      const parts = (section.original || '').split(/[，。？！\n；：、]/).filter(s => s.trim().length > 0)
      for (const part of parts) {
        if (part.length >= 3) {
          allLines.push({ text: part, classicTitle: classic.title, author: classic.author })
        }
      }
    }
  }

  // Collect full original lines (split by newline only) for longer excerpts
  const longClassicLines: ClassicLine[] = []
  {
    const seenLong = new Set<string>()
    for (const classic of classicData) {
      for (const section of classic.sections) {
        const lines = (section.original || '').split('\n').filter(s => s.trim().length > 0)
        for (const line of lines) {
          const cleaned = line.trim()
          // Only use lines that have internal punctuation (indicating a complete phrase)
          if (cleaned.length >= 8 && /[，。？！；：]/.test(cleaned) && !seenLong.has(cleaned)) {
            seenLong.add(cleaned)
            longClassicLines.push({
              text: cleaned,
              classicTitle: classic.title,
              author: classic.author,
            })
          }
        }
      }
    }
  }

  console.log(`  国学: ${allLines.length} lines from ${classicData.length} classics`)

  // ----- Type A: "出自哪部经典" (target: 1,000) -----
  const countA_start = results.length
  const targetA = 1000

  for (const line of shuffle(longClassicLines.length > 0 ? longClassicLines : allLines)) {
    if (results.length - countA_start >= targetA) break

    // Find the classic to get its category
    const classic = classicData.find(c => c.title === line.classicTitle)
    const category = classic?.category

    // Smart: same category classics first, then any
    const sameCatTitles = category ? (titlesByCategory.get(category) || []).filter(t => t !== line.classicTitle) : []
    const distractors = pickDistractors(line.classicTitle, 3, sameCatTitles, allClassicTitles)
    if (distractors.length < 3) continue

    const options = shuffle([line.classicTitle, ...distractors])
    const answer = options.indexOf(line.classicTitle)

    results.push({
      category: 'guoxue',
      question: `「${line.text}」出自哪部经典？`,
      options: JSON.stringify(options),
      answer,
      difficulty: 2,
    })
  }
  console.log(`  已生成 出自哪部: ${results.length - countA_start} 题`)

  // ----- Type B: "经典作者" (target: 500) -----
  const countB_start = results.length
  const targetB = 500
  const usedAuthorQ = new Set<string>()

  for (const classic of shuffle(classicData)) {
    if (results.length - countB_start >= targetB) break
    if (!classic.author || classic.author.length === 0) continue
    const key = classic.title + '|' + classic.author
    if (usedAuthorQ.has(key)) continue
    usedAuthorQ.add(key)

    // Smart: same dynasty authors first, then any
    const sameDynastyAuthors = classic.dynasty ? (authorsByDynasty.get(classic.dynasty) || []).filter(a => a !== classic.author) : []
    const distractors = pickDistractors(classic.author, 3, sameDynastyAuthors, allAuthors)
    if (distractors.length < 3) continue

    const options = shuffle([classic.author, ...distractors])
    const answer = options.indexOf(classic.author)

    results.push({
      category: 'guoxue',
      question: `经典《${classic.title}》的作者是谁？`,
      options: JSON.stringify(options),
      answer,
      difficulty: 2,
    })
  }
  console.log(`  已生成 经典作者: ${results.length - countB_start} 题`)

  // ----- Type C: "经典常识" (target: ~900) -----
  const countC_start = results.length
  const targetC = 900

  const summaryQuestions: Array<{ text: string; answer: string; classicTitle: string; category?: string }> = []

  for (const classic of classicData) {
    if (classic.summary && classic.summary.length > 0) {
      summaryQuestions.push({
        text: classic.summary,
        answer: classic.title,
        classicTitle: classic.title,
        category: classic.category,
      })
    }
  }

  for (const sq of shuffle(summaryQuestions)) {
    if (results.length - countC_start >= targetC) break

    const sameCatTitles = sq.category ? (titlesByCategory.get(sq.category) || []).filter(t => t !== sq.classicTitle) : []
    const distractors = pickDistractors(sq.classicTitle, 3, sameCatTitles, allClassicTitles)
    if (distractors.length < 3) continue

    const options = shuffle([sq.answer, ...distractors])
    const answerIdx = options.indexOf(sq.answer)

    results.push({
      category: 'guoxue',
      question: `以下哪部经典的介绍是："${sq.text}"？`,
      options: JSON.stringify(options),
      answer: answerIdx,
      difficulty: 2,
    })
  }

  const sectionItems: Array<{ text: string; classicTitle: string; category?: string }> = []
  for (const classic of classicData) {
    for (const section of classic.sections) {
      if (section.translation && section.translation.length > 0 && section.translation.length < 60) {
        sectionItems.push({ text: section.translation, classicTitle: classic.title, category: classic.category })
      }
    }
  }

  for (const item of shuffle(sectionItems)) {
    if (results.length - countC_start >= targetC) break

    const sameCatTitles = item.category ? (titlesByCategory.get(item.category) || []).filter(t => t !== item.classicTitle) : []
    const distractors = pickDistractors(item.classicTitle, 3, sameCatTitles, allClassicTitles)
    if (distractors.length < 3) continue

    const options = shuffle([item.classicTitle, ...distractors])
    const answerIdx = options.indexOf(item.classicTitle)

    results.push({
      category: 'guoxue',
      question: `"${item.text}"——这段描述对应哪部经典？`,
      options: JSON.stringify(options),
      answer: answerIdx,
      difficulty: 2,
    })
  }

  console.log(`  已生成 经典常识: ${results.length - countC_start} 题`)


  // ----- Type E: Commentary questions (target: ~200) -----
  const countE_start = results.length
  const targetE = 200

  const interpItems: Array<{ text: string; classicTitle: string; category?: string }> = []
  for (const classic of classicData) {
    for (const section of classic.sections) {
      if (section.interpretation && section.interpretation.length > 0 && section.interpretation.length < 50) {
        interpItems.push({ text: section.interpretation, classicTitle: classic.title, category: classic.category })
      }
    }
  }

  for (const item of shuffle(interpItems)) {
    if (results.length - countE_start >= targetE) break

    const sameCatTitles = item.category ? (titlesByCategory.get(item.category) || []).filter(t => t !== item.classicTitle) : []
    const distractors = pickDistractors(item.classicTitle, 3, sameCatTitles, allClassicTitles)
    if (distractors.length < 3) continue

    const options = shuffle([item.classicTitle, ...distractors])
    const ansIdx = options.indexOf(item.classicTitle)

    results.push({
      category: 'guoxue',
      question: `"${item.text}"——这是对哪部经典的评价？`,
      options: JSON.stringify(options),
      answer: ansIdx,
      difficulty: 2,
    })
  }

  console.log(`  已生成 朝代+评述: ${results.length - countE_start} 题`)

  return results
}

// ===================== 英语 Generator (2,000 题, category: english) =====================

function generateEnglishQuestions(): QuestionRow[] {
  const results: QuestionRow[] = []

  const allWords = words
  const allMeanings = words.map(w => w.meaning)
  const allEngWords = words.map(w => w.word)

  // Build difficulty-based pools for plausible distractors
  const wordsByDifficulty = new Map<number, typeof words>()
  for (const w of words) {
    const d = w.difficulty
    if (!wordsByDifficulty.has(d)) wordsByDifficulty.set(d, [])
    wordsByDifficulty.get(d)!.push(w)
  }

  /**
   * Pick English word distractors from similar difficulty level first,
   * then adjacent levels, then any.
   */
  function pickEnglishDistractors(correctWord: string, difficulty: number, required: number): string[] {
    const result: string[] = []
    const seen = new Set<string>([correctWord])

    // Same difficulty
    const sameDiff = (wordsByDifficulty.get(difficulty) || []).map(w => w.word).filter(w => !seen.has(w))
    for (const w of shuffle(sameDiff)) {
      if (result.length >= required) break
      result.push(w)
      seen.add(w)
    }

    // Adjacent difficulties (±1)
    if (result.length < required) {
      for (const adj of [difficulty - 1, difficulty + 1]) {
        if (result.length >= required) break
        const adjWords = (wordsByDifficulty.get(adj) || []).map(w => w.word).filter(w => !seen.has(w))
        for (const w of shuffle(adjWords)) {
          if (result.length >= required) break
          result.push(w)
          seen.add(w)
        }
      }
    }

    // Any remaining
    if (result.length < required) {
      for (const w of shuffle(allEngWords)) {
        if (result.length >= required) break
        if (!seen.has(w)) {
          result.push(w)
          seen.add(w)
        }
      }
    }

    return result.slice(0, required)
  }

  console.log(`  英语: ${allWords.length} words available, ${wordsByDifficulty.size} difficulty levels`)

  // ----- Type A: 中文→英文 (target: 800) -----
  const countA_start = results.length
  const targetA = 800

  for (const word of shuffle(allWords)) {
    if (results.length - countA_start >= targetA) break
    const distractors = pickEnglishDistractors(word.word, word.difficulty, 3)
    if (distractors.length < 3) continue

    const options = shuffle([word.word, ...distractors])
    const ansIdx = options.indexOf(word.word)
    const diff = word.difficulty <= 3 ? 1 : word.difficulty <= 6 ? 2 : 3

    results.push({
      category: 'english',
      question: `"${word.meaning}" 的英文是？`,
      options: JSON.stringify(options),
      answer: ansIdx,
      difficulty: diff,
    })
  }
  console.log(`  已生成 中→英: ${results.length - countA_start} 题`)

  // ----- Type B: 英文→中文 (target: 800) -----
  const countB_start = results.length
  const targetB = 800

  for (const word of shuffle(allWords)) {
    if (results.length - countB_start >= targetB) break

    // Pick meaning distractors from similar difficulty words
    const sameDiffWords = (wordsByDifficulty.get(word.difficulty) || []).filter(w => w.word !== word.word)
    const sameDiffMeanings = [...new Set(sameDiffWords.map(w => w.meaning))]
    const otherMeanings = allMeanings.filter(m => m !== word.meaning)

    const distractors = pickDistractors(word.meaning, 3, sameDiffMeanings, otherMeanings)
    if (distractors.length < 3) continue

    const options = shuffle([word.meaning, ...distractors])
    const ansIdx = options.indexOf(word.meaning)
    const diff = word.difficulty <= 3 ? 1 : word.difficulty <= 6 ? 2 : 3

    results.push({
      category: 'english',
      question: `"${word.word}" 的中文意思是？`,
      options: JSON.stringify(options),
      answer: ansIdx,
      difficulty: diff,
    })
  }
  console.log(`  已生成 英→中: ${results.length - countB_start} 题`)

  // ----- Type C: 选词填空 (target: 400) -----
  const countC_start = results.length
  const targetC = 400

  for (const word of shuffle(allWords)) {
    if (results.length - countC_start >= targetC) break
    if (!word.sentence || word.sentence.length < 5) continue

    const sentenceLower = word.sentence.toLowerCase()
    const wordLower = word.word.toLowerCase()
    const idx = sentenceLower.indexOf(wordLower)
    if (idx < 0) continue

    const blank = '____'
    const filledSentence =
      word.sentence.slice(0, idx) + blank + word.sentence.slice(idx + word.word.length)

    // Smart: same difficulty words as distractors (they could fit similar contexts)
    const sameDiffWords = (wordsByDifficulty.get(word.difficulty) || []).map(w => w.word).filter(w => w !== word.word)
    const otherWords = allEngWords.filter(w => w !== word.word)
    const distractors = pickDistractors(word.word, 3, sameDiffWords, otherWords)
    if (distractors.length < 3) continue

    const options = shuffle([word.word, ...distractors])
    const ansIdx = options.indexOf(word.word)
    const diff = word.difficulty <= 3 ? 1 : word.difficulty <= 6 ? 2 : 3

    results.push({
      category: 'english',
      question: `选择正确的词填空：${filledSentence}`,
      options: JSON.stringify(options),
      answer: ansIdx,
      difficulty: diff,
    })
  }
  console.log(`  已生成 填空: ${results.length - countC_start} 题`)

  return results
}

// ===================== 通识 Generator (2,000 题, category: general/science) =====================

function generateTongshiQuestions(): QuestionRow[] {
  const results: QuestionRow[] = []

  const scienceCats = new Set(['科学'])
  const validTopics = knowledgeData.filter(t => t.sections && t.sections.length > 0)

  const usedPairs = new Set<string>()

  // Collect clean term pools: section titles are the only reliable clean terms
  const allSectionTitles = new Set<string>()
  const sectionTitlesByTopic = new Map<string, string[]>()
  const sectionTitlesByCat = new Map<string, string[]>()
  const topicTitlesByCat = new Map<string, string[]>()

  for (const topic of validTopics) {
    const cat = scienceCats.has(topic.category) ? 'science' : 'general'
    if (!topicTitlesByCat.has(cat)) topicTitlesByCat.set(cat, [])
    topicTitlesByCat.get(cat)!.push(topic.title)
    if (!sectionTitlesByTopic.has(topic.id)) sectionTitlesByTopic.set(topic.id, [])
    if (!sectionTitlesByCat.has(cat)) sectionTitlesByCat.set(cat, [])

    for (const section of topic.sections) {
      if (section.title && section.title.length >= 2 && section.title.length <= 8) {
        allSectionTitles.add(section.title)
        sectionTitlesByTopic.get(topic.id)!.push(section.title)
        sectionTitlesByCat.get(cat)!.push(section.title)
      }
    }
  }

  // Build a "term pool" per topic: section titles + any short clean terms from content
  // These serve as distractor pools
  const termPoolByTopic = new Map<string, string[]>()
  const termPoolByCat = new Map<string, string[]>()
  for (const topic of validTopics) {
    const cat = scienceCats.has(topic.category) ? 'science' : 'general'
    const pool: string[] = [...(sectionTitlesByTopic.get(topic.id) || [])]
    termPoolByTopic.set(topic.id, pool)
    if (!termPoolByCat.has(cat)) termPoolByCat.set(cat, [])
    termPoolByCat.get(cat)!.push(...pool)
  }

  interface Fact {
    q: string
    answer: string
    dbCat: string
    difficulty: number
    topicId: string
  }

  const allFacts: Fact[] = []

  // ============= Strategy A: Definition questions (section title as answer) =============
  // For each section, find a "X是Y" sentence where X is the section title
  // → q: "Y是什么？" a: sectionTitle  distractors: other section titles from same topic
  for (const topic of validTopics) {
    const dbCat = scienceCats.has(topic.category) ? 'science' : 'general'
    const diff = topic.category === '科学' ? 2 : 1

    for (const section of topic.sections) {
      if (!section.title || !section.content || section.content.length < 15) continue
      const title = section.title
      // Skip long or punctuated titles
      if (title.length < 2 || title.length > 8) continue
      if (/[，。！？、；：]/.test(title) || /^(什么|如何|怎样)/.test(title)) continue

      const content = section.content

      // Try to find "title是Y" — answer is the section title
      const defRe = new RegExp(
        title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '是([^，。！？\n]{8,55})([。！？]|，)'
      )
      const defMatch = content.match(defRe)
      if (defMatch) {
        let clue = defMatch[1].trim()
        // Skip if clue starts with "一种" "一个" etc. or contains "最"
        if (/^(一种|一个|一类|一位|一群|一系列|一项|一个|一种)/.test(clue)) {
          // Try to use the part after "一种/一个" instead
          const after = clue.replace(/^(一种|一个|一类|一位|一群)的?/, '').trim()
          if (after.length >= 6) clue = after
          else continue
        }
        if (clue.includes('最') || clue.length < 6) continue

        // Clean up clue: remove leading "指" (redundant with "是指什么" template)
        let cleanedClue = clue.replace(/[，。；、：]+$/, '').trim()
        cleanedClue = cleanedClue.replace(/^指/, '').trim()
        if (cleanedClue.length < 6) continue

        // Build clean question
        const q = `${cleanedClue}是指什么？`
        allFacts.push({ q, answer: title, dbCat, difficulty: diff, topicId: topic.id })

        // Also add reverse phrasing for variety
        const q2 = `什么是${cleanedClue}？`
        allFacts.push({ q: q2, answer: title, dbCat, difficulty: diff, topicId: topic.id })
      }
    }
  }

  // ============= Strategy B: Superlative facts =============
  // Extract "最..." patterns, answer is section title (if mentioned in the same sentence)
  for (const topic of validTopics) {
    const dbCat = scienceCats.has(topic.category) ? 'science' : 'general'
    const diff = topic.category === '科学' ? 2 : 1

    for (const section of topic.sections) {
      if (!section.content || !section.title) continue
      const title = section.title
      if (title.length < 2 || title.length > 8) continue

      const content = section.content
      const topicTitles = sectionTitlesByTopic.get(topic.id) || []

      // Pattern: "title是最Y的Z。"
      const re1 = new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '是最([^，。！？\n]{8,45})([。！？])')
      const m1 = content.match(re1)
      if (m1) {
        const phrase = m1[1].trim()
        // Find real superlative — the phrase should contain at least one topic-relevant term
        const q = `最${phrase}是什么？`

        // Distractors: other section titles from same topic
        const distractors = pickDistractors(title, 3, topicTitles.filter(t => t !== title), [])
        if (distractors.length >= 3) {
          allFacts.push({ q, answer: title, dbCat, difficulty: diff, topicId: topic.id })
        }
        continue
      }

      // Pattern: "最Y的Z是title。"
      const re2 = new RegExp('最([^，。！？\n]{2,18})的([^，。！？\n]{2,14})是' + title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([。！？])')
      const m2 = content.match(re2)
      if (m2) {
        const adj = m2[1].trim()
        const noun = m2[2].trim()
        const q = `最${adj}的${noun}是什么？`

        const distractors = pickDistractors(title, 3, topicTitles.filter(t => t !== title), [])
        if (distractors.length >= 3) {
          allFacts.push({ q, answer: title, dbCat, difficulty: diff, topicId: topic.id })
        }
      }
    }
  }

  // ============= Strategy C: Numeric/quantity facts (science only) =============
  // Extract "X约为N单位" → ask "X约为多少？" answer: N单位
  for (const topic of validTopics) {
    if (!scienceCats.has(topic.category)) continue
    const dbCat = 'science'
    const diff = 2

    for (const section of topic.sections) {
      if (!section.content) continue
      const title = section.title
      const content = section.content

      // Match patterns: "X的Y约为N单位" where X is a section title or topic-relevant
      // e.g. "太阳的表面温度约为5500摄氏度"
      // e.g. "地球的直径约为12756公里"
      // e.g. "人体有206块骨头"
      const numRe = new RegExp(
        '(' + title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^，。！？\n]{0,12})' +
        '(约为|高达|可达|约有|约|有|达到|长达|重达|只[有需])' +
        '(\\d+(?:\\.\\d+)?[万亿千百十万]?\\s*[-－]?\\s*\\d*(?:\\.\\d+)?[万亿千百十万]?\\s*)' +
        '(摄氏度|华氏度|[公里度克倍种天年个分钟秒人次%升吨米层°]+)'
      )
      const numMatch = content.match(numRe)
      if (numMatch) {
        let subject = numMatch[1].trim()
        const rel = numMatch[2].trim()
        // Reconstruct value: digits + decimal + unit
        const digits = numMatch[3].trim()
        const unit = numMatch[4] || ''
        const value = digits + unit

        subject = subject.replace(/[：:，,、\s]+$/, '').trim()
        // Strip parenthetical content from subject (e.g. "重力了（国际空间站离地面" → "重力")
        const parenIdx = subject.indexOf('（')
        if (parenIdx > 2) subject = subject.slice(0, parenIdx).trim()
        if (subject.length < 4 || subject.length > 25) continue
        // Reject subjects with leftover parentheses (incomplete stripping)
        if (/[（(][^）)]*$/.test(subject)) continue
        if (!/[\d]/.test(value)) continue
        if (/^\d{4}年$/.test(value)) continue
        if (value.length > 20) continue

        const relWord = rel === '有' || rel === '只有' || rel === '只需' ? '有多少' :
                        rel === '约' || rel === '约为' || rel === '约有' ? '约为多少' :
                        rel === '高达' ? '高达多少' : rel === '长达' ? '长达多少' :
                        rel === '只需要' ? '只需要多少' : '有多少'

        // Skip if subject already contains digits (redundant, answer is already in subject)
        if (/\d/.test(subject)) continue

        const q = `${subject}${relWord}？`

        // Distractors: other numeric values from the same topic (look for other numbers)
        const otherNums: string[] = []
        const allNumRe = /(\d+(?:\.\d+)?[万亿千百十万]?\s*[-－]?\s*\d*(?:\.\d+)?[万亿千百十万]?\s*(?:摄氏度|华氏度|[公里度克倍种天年个分钟秒人次%升吨米层°]+))/g
        let nm: RegExpExecArray | null
        while ((nm = allNumRe.exec(content)) !== null) {
          const v = nm[1].trim()
          if (v !== value && v.length >= 2 && !otherNums.includes(v)) otherNums.push(v)
        }
        // Also look at other sections in the same topic
        for (const otherSection of topic.sections) {
          if (otherSection.id === section.id || !otherSection.content) continue
          allNumRe.lastIndex = 0
          while ((nm = allNumRe.exec(otherSection.content)) !== null) {
            const v = nm[1].trim()
            if (v !== value && v.length >= 2 && !otherNums.includes(v)) otherNums.push(v)
          }
        }

        const distractors = pickDistractors(value, 3, otherNums, [])
        if (distractors.length >= 3) {
          allFacts.push({ q, answer: value, dbCat, difficulty: diff, topicId: topic.id })
        }
      }
    }
  }

  // ============= Strategy D: "为什么" questions =============
  // Extract cause-effect: "因为{title}，{effect}" → "为什么{effect}？" answer: title
  for (const topic of validTopics) {
    const dbCat = scienceCats.has(topic.category) ? 'science' : 'general'
    const diff = topic.category === '科学' ? 2 : 1

    for (const section of topic.sections) {
      if (!section.content || !section.title) continue
      const title = section.title
      if (title.length < 2 || title.length > 6) continue
      const content = section.content
      const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      // Pattern 1: 因为/由于{up to 15 chars}{title} → effect is text before 因为
      for (const prefix of ['因为', '由于']) {
        const re1 = new RegExp(prefix + '(.{0,15})' + escaped, 'g')
        for (const m of content.matchAll(re1)) {
          const between = m[1].trim()
          if (between.length > 15) continue
          // Find preceding sentence boundary
          let start = Math.max(content.lastIndexOf('。', m.index!), content.lastIndexOf('！', m.index!), content.lastIndexOf('？', m.index!))
          start = start < 0 ? 0 : start + 1
          let effect = content.slice(start, m.index!).trim()
          effect = effect.replace(/^(就是|正是|也是|就在于)/, '').trim()
          effect = effect.replace(/(就是|正是|就在于)$/, '').trim().replace(/[，,]+$/, '')
          if (effect.length < 6 || effect.length > 45) continue
          if (effect.startsWith(title) || effect.includes('是指')) continue
          allFacts.push({ q: `为什么${effect}？`, answer: title, dbCat, difficulty: diff, topicId: topic.id })
          break // one per section
        }
      }

      // Pattern 2: 这是因为{up to 60 chars}{title}
      const re2 = new RegExp('这是因为(.{0,60})' + escaped)
      const m2 = content.match(re2)
      if (m2) {
        let start = Math.max(content.lastIndexOf('。', m2.index!), content.lastIndexOf('！', m2.index!), content.lastIndexOf('？', m2.index!))
        start = start < 0 ? 0 : start + 1
        let effect = content.slice(start, m2.index!).trim().replace(/[，,]+$/, '')
        if (effect.length >= 6 && effect.length <= 45 && !effect.startsWith(title) && !effect.includes('是指')) {
          allFacts.push({ q: `为什么${effect}？`, answer: title, dbCat, difficulty: diff, topicId: topic.id })
        }
      }
    }
  }

  console.log(`  通识: ${validTopics.length} topics, ${allFacts.length} clean facts extracted`)

  // ============= Phase 2: Generate final questions with dedup =============
  let questions: QuestionRow[] = []
  const usedQ = new Set<string>()

  for (const fact of shuffle(allFacts)) {
    if (questions.length >= 2000) break

    const key = fact.answer + '|' + fact.q.slice(0, 25)
    if (usedPairs.has(key)) continue
    usedPairs.add(key)

    // Deduplicate by question content
    const qShort = fact.q.replace(/[，。！？、；：\s]/g, '').slice(0, 22)
    if (usedQ.has(qShort)) continue
    usedQ.add(qShort)

    // Pick distractors from same topic section titles
    const topicTitles = sectionTitlesByTopic.get(fact.topicId) || []
    const catTitles = sectionTitlesByCat.get(fact.dbCat) || []

    const distractors = pickDistractors(fact.answer, 3,
      topicTitles.filter(t => t !== fact.answer),
      catTitles.filter(t => t !== fact.answer && !topicTitles.includes(t))
    )

    if (distractors.length < 3) continue

    const options = shuffle([fact.answer, ...distractors])

    questions.push({
      category: fact.dbCat,
      question: fact.q,
      options: JSON.stringify(options),
      answer: options.indexOf(fact.answer),
      difficulty: fact.difficulty,
    })
  }

  console.log(`  Fact-based questions: ${questions.length}`)

  // Trim to exactly 2000
  const shuffled = shuffle(questions)
  for (let i = 0; i < Math.min(2000, shuffled.length); i++) {
    results.push(shuffled[i])
  }

  console.log(`  已生成 通识: ${results.length} 题 (science=${results.filter(r => r.category === 'science').length}, general=${results.filter(r => r.category === 'general').length})`)

  return results
}

// ===================== Main =====================

function main() {
  console.log('========================================')
  console.log('  好大儿问答挑战 - 自动出题脚本')
  console.log('========================================\n')

  let allQuestions: QuestionRow[] = []

  console.log('📜 [1/4] 生成诗词题目 (target: 4,000)...')
  const shici = generateShiciQuestions()
  console.log(`   → 诗词题目: ${shici.length}\n`)
  allQuestions.push(...shici)

  console.log('📚 [2/4] 生成国学题目 (target: 2,000)...')
  const guoxue = generateGuoxueQuestions()
  console.log(`   → 国学题目: ${guoxue.length}\n`)
  allQuestions.push(...guoxue)

  console.log('🔤 [3/4] 生成英语题目 (target: 2,000)...')
  const eng = generateEnglishQuestions()
  console.log(`   → 英语题目: ${eng.length}\n`)
  allQuestions.push(...eng)

  console.log('🌍 [4/4] 生成通识题目 (target: 2,000)...')
  const tongshi = generateTongshiQuestions()
  console.log(`   → 通识题目: ${tongshi.length}\n`)
  allQuestions.push(...tongshi)

  // Final stats
  console.log('========================================')
  console.log(`  总计生成: ${allQuestions.length} 题`)
  const cats = new Map<string, number>()
  const diffs = new Map<number, number>()
  for (const q of allQuestions) {
    cats.set(q.category, (cats.get(q.category) || 0) + 1)
    diffs.set(q.difficulty, (diffs.get(q.difficulty) || 0) + 1)
  }
  console.log('  按分类:')
  for (const [k, v] of cats) console.log(`    ${k}: ${v}`)
  console.log('  按难度:')
  for (const [k, v] of diffs) console.log(`    level ${k}: ${v}`)

  // ---- Insert into database ----
  console.log('\n💾 写入数据库...')

  const db = new Database(DB_PATH)
  db.pragma('journal_mode = DELETE')

  db.exec(`
    CREATE TABLE IF NOT EXISTS quiz_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT DEFAULT 'general',
      question TEXT NOT NULL,
      options TEXT NOT NULL,
      answer INTEGER NOT NULL,
      difficulty INTEGER DEFAULT 1
    );
  `)

  db.exec('DELETE FROM quiz_questions')
  db.exec("DELETE FROM sqlite_sequence WHERE name='quiz_questions'")

  const insert = db.prepare(
    'INSERT INTO quiz_questions (category, question, options, answer, difficulty) VALUES (?, ?, ?, ?, ?)'
  )

  const batchSize = 500
  let inserted = 0

  for (let i = 0; i < allQuestions.length; i += batchSize) {
    const batch = allQuestions.slice(i, i + batchSize)
    const tx = db.transaction((qs: QuestionRow[]) => {
      for (const q of qs) {
        insert.run(q.category, q.question, q.options, q.answer, q.difficulty)
        inserted++
      }
    })
    tx(batch)
    console.log(`  已写入 ${inserted}/${allQuestions.length}`)
  }

  const count = db.prepare('SELECT COUNT(*) as cnt FROM quiz_questions').get() as { cnt: number }
  console.log(`\n✅ 完成！题库现有 ${count.cnt} 道题`)

  const breakdown = db.prepare('SELECT category, difficulty, COUNT(*) as cnt FROM quiz_questions GROUP BY category, difficulty ORDER BY category, difficulty').all()
  console.log('\n📊 题库详情:')
  for (const row of breakdown as Array<{ category: string; difficulty: number; cnt: number }>) {
    console.log(`  ${row.category} (难度${row.difficulty}): ${row.cnt}`)
  }

  db.close()
}

main()
