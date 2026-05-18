let synth = typeof window !== 'undefined' ? window.speechSynthesis : null

export function speak(text: string, rate: number = 0.8, onEnd?: () => void): SpeechSynthesisUtterance | null {
  if (!synth) return null
  synth.cancel()

  const lines = text.split('\n')

  if (lines.length <= 1) {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'zh-CN'
    u.rate = rate
    u.onend = () => onEnd?.()
    synth.speak(u)
    return u
  }

  let index = 0
  function speakNext() {
    if (index >= lines.length) {
      onEnd?.()
      return
    }
    const u = new SpeechSynthesisUtterance(lines[index])
    u.lang = 'zh-CN'
    u.rate = rate
    u.onend = () => {
      index++
      if (index < lines.length) {
        setTimeout(speakNext, 500)
      } else {
        onEnd?.()
      }
    }
    synth.speak(u)
  }
  speakNext()
  return null
}

export function stopSpeaking(): void {
  synth?.cancel()
}
