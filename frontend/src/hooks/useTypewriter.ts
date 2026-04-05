import { useState, useEffect } from 'react'

interface Options {
  speed?: number  // ms per character
  delay?: number  // ms before starting
}

export function useTypewriter(text: string, options: Options = {}) {
  const { speed = 28, delay = 0 } = options
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!text) {
      setDisplayed('')
      setDone(false)
      return
    }
    setDisplayed('')
    setDone(false)
    let i = 0
    let intervalId: ReturnType<typeof setInterval>

    const timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        i++
        setDisplayed(text.slice(0, i))
        if (i >= text.length) {
          clearInterval(intervalId)
          setDone(true)
        }
      }, speed)
    }, delay)

    return () => {
      clearTimeout(timeoutId)
      clearInterval(intervalId)
    }
  }, [text, speed, delay])

  return { displayed, done }
}
