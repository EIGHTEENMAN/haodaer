let synth = typeof window !== 'undefined' ? window.speechSynthesis : null

export function speak(text: string, rate: number = 0.8, onEnd?: () => void): SpeechSynthesisUtterance | null {
  if (!synth) return null
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'zh-CN'
  u.rate = rate
  u.onend = () => onEnd?.()
  synth.speak(u)
  return u
}

export function stopSpeaking(): void {
  synth?.cancel()
}

let mediaRecorder: MediaRecorder | null = null
let chunks: Blob[] = []
let startTime = 0

export async function startRecording(): Promise<void> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  chunks = []
  startTime = Date.now()
  mediaRecorder = new MediaRecorder(stream)
  mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
  mediaRecorder.start()
}

export function stopRecording(): Promise<{ blob: Blob; duration: number }> {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder) return reject('No recorder')
    const dur = (Date.now() - startTime) / 1000
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' })
      mediaRecorder?.stream.getTracks().forEach(t => t.stop())
      mediaRecorder = null
      resolve({ blob, duration: dur })
    }
    mediaRecorder.stop()
  })
}

export function playBlob(blob: Blob): HTMLAudioElement {
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  audio.play()
  return audio
}
