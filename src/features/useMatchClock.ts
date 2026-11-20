import { useEffect, useState } from 'react'

export function useMatchClock(deadlines: readonly number[] | number | null) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    let timer: number
    const refresh = () => {
      window.clearTimeout(timer)
      const current = Date.now()
      setNow(current)
      const next = typeof deadlines === 'number' ? deadlines : deadlines?.find(deadline => deadline > current)
      if (next !== undefined && next > current) timer = window.setTimeout(refresh, next - current)
    }
    window.addEventListener('focus', refresh)
    timer = window.setTimeout(refresh, 0)
    return () => {
      window.removeEventListener('focus', refresh)
      window.clearTimeout(timer)
    }
  }, [deadlines])
  return now
}
