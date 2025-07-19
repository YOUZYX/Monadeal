import { useState, useEffect } from 'react'

interface PlatformStats {
  volume: {
    total: string
    last24h: string
    formatted: {
      total: string
      last24h: string
    }
  }
  users: {
    total: number
    activeWeek: number
    formatted: {
      total: string
      activeWeek: string
    }
  }
  deals: {
    total: number
    completed: number
    formatted: {
      total: string
      completed: string
    }
  }
  successRate: {
    percentage: number
    formatted: string
  }
  lastUpdated: string
}

export function usePlatformStats() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(false) // Start as false to avoid blocking
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
      
      const response = await fetch('/api/stats/platform', {
        signal: controller.signal,
        // Add cache headers for better performance
        cache: 'force-cache',
        next: { revalidate: 300 } // 5 minutes
      })
      
      clearTimeout(timeoutId)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch statistics')
      }
      
      if (data.success) {
        setStats(data.stats)
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.warn('Stats request timed out')
        setError('Request timed out')
      } else {
        console.error('Error fetching platform stats:', err)
        setError(err instanceof Error ? err.message : 'Failed to load statistics')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Delay initial fetch to not block page rendering
    const timer = setTimeout(() => {
      fetchStats()
    }, 100) // Small delay to let page render first
    
    // Refresh stats every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000)
    
    return () => {
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [])

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  }
} 