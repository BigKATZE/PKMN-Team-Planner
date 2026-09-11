import { useEffect, useRef, useState } from 'react'

export function useAsync(task, dependencies, enabled = true, delay = 0) {
  const [revision, setRevision] = useState(0)
  const key = JSON.stringify([...dependencies, revision])
  const [result, setResult] = useState({ key: null, data: null, error: null, loading: true })
  useEffect(() => {
    if (!enabled) return
    let active = true
    const timer = setTimeout(async () => {
      setResult({ key, data: null, error: null, loading: true })
      try {
        const data = await task()
        if (active) setResult({ key, data, error: null, loading: false })
      } catch (error) {
        if (active) setResult({ key, data: null, error: error.message || 'Could not load data. Please try again.', loading: false })
      }
    }, delay)
    return () => { active = false; clearTimeout(timer) }
    // The serialized dependencies define this request, including all task inputs.
  }, [key, enabled, delay])
  const current = enabled && result.key === key ? result : { data: null, error: null, loading: enabled }
  return { ...current, retry: () => setRevision((r) => r + 1) }
}

export function useAsyncAction(onSuccess) {
  const alive = useRef(false)
  const busy = useRef(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  async function run(task) {
    if (busy.current) return
    busy.current = true
    setLoading(true)
    setError(null)
    try {
      const result = await task()
      if (alive.current) onSuccess(result)
    } catch (e) {
      if (alive.current) setError(e.message)
    } finally {
      busy.current = false
      if (alive.current) setLoading(false)
    }
  }
  return { run, loading, error }
}
