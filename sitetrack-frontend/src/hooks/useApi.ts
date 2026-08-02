import { useState, useCallback } from 'react'
import api from '../lib/api'

interface UseApiOptions<T> {
  onSuccess?: (data: T) => void
  onError?: (error: unknown) => void
}

/**
 * Generic hook for making API requests with loading/error state.
 *
 * @example
 * const { execute, isLoading, error } = useApi<Project[]>()
 * execute(() => api.get('/projects').then(r => r.data))
 */
export function useApi<T>(options?: UseApiOptions<T>) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const execute = useCallback(
    async (request: () => Promise<T>) => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await request()
        setData(result)
        options?.onSuccess?.(result)
        return result
      } catch (err) {
        setError(err)
        options?.onError?.(err)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [options]
  )

  return { data, isLoading, error, execute }
}

// Re-export api for convenience
export { api }
