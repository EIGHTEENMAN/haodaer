// Speech recognition wrapper for "说" (Speak) action

let recognition: SpeechRecognition | null = null

function getRecognition(): SpeechRecognition | null {
  if (recognition) return recognition
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SR) return null
  recognition = new SR()
  recognition.lang = "en-US"
  recognition.continuous = false
  recognition.interimResults = false
  return recognition
}

export function isSpeechSupported(): boolean {
  return !!getRecognition()
}

export function startListening(targetWord: string): Promise<boolean> {
  return new Promise((resolve) => {
    const sr = getRecognition()
    if (!sr) {
      resolve(false)
      return
    }

    let timeout = setTimeout(() => {
      sr.abort()
      resolve(false)
    }, 8000)

    sr.onresult = (event: SpeechRecognitionEvent) => {
      clearTimeout(timeout)
      const transcript = event.results[0][0].transcript.toLowerCase().trim()
      const confidence = event.results[0][0].confidence
      // Check if transcript matches target word (or is very similar)
      const isMatch = transcript === targetWord.toLowerCase()
        || transcript.includes(targetWord.toLowerCase())
        || similarity(transcript, targetWord.toLowerCase()) > 0.6
      resolve(isMatch || confidence > 0.7)
    }

    sr.onerror = () => {
      clearTimeout(timeout)
      resolve(false)
    }

    sr.onend = () => {
      clearTimeout(timeout)
      // If no result fired, resolve false
      // (Already handled by timeout, but just in case)
    }

    sr.start()
  })
}

// Simple string similarity (Dice coefficient)
function similarity(a: string, b: string): number {
  const biagrams = new Set<string>()
  for (let i = 0; i < a.length - 1; i++) biagrams.add(a.substring(i, i + 2))
  let matches = 0
  for (let i = 0; i < b.length - 1; i++) {
    if (biagrams.has(b.substring(i, i + 2))) matches++
  }
  return (2 * matches) / (a.length + b.length) || 0
}

export function stopListening() {
  if (recognition) {
    try { recognition.abort() } catch {}
  }
}
