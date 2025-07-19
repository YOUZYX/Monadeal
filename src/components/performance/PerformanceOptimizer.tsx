'use client'

import { useEffect } from 'react'
import { preloadCriticalRoutes, optimizeImageLoading } from '@/lib/performance'

export default function PerformanceOptimizer() {
  useEffect(() => {
    // Initialize performance optimizations on mount
    const initOptimizations = () => {
      try {
        // Preload critical routes
        preloadCriticalRoutes()
        
        // Optimize image loading
        optimizeImageLoading()
        
        console.log('✅ Performance optimizations initialized')
      } catch (error) {
        console.warn('⚠️ Some performance optimizations failed:', error)
      }
    }

    // Run optimizations after a short delay to not block initial render
    const timer = setTimeout(initOptimizations, 100)
    
    return () => clearTimeout(timer)
  }, [])

  // This component doesn't render anything, it just sets up optimizations
  return null
}
