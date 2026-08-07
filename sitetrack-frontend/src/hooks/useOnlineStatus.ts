import { useState, useEffect } from 'react'

/**
 * Hook to track browser online/offline status in real time.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Fallback: update state when mounting in case status changed
    if (navigator.onLine !== isOnline) {
      setIsOnline(navigator.onLine)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [isOnline])

  return isOnline
}
