'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function useNavigationPerformance() {
  const pathname = usePathname()

  useEffect(() => {
    const startTime = performance.now()
    
    // Measure how long it takes for the route to be ready
    const measureRouteLoad = () => {
      const endTime = performance.now()
      const loadTime = endTime - startTime
      
      if (loadTime > 2000) {
        console.warn(`🐌 Slow route load: ${pathname} took ${loadTime.toFixed(2)}ms`)
      } else if (loadTime > 1000) {
        console.log(`⚠️ Route load: ${pathname} took ${loadTime.toFixed(2)}ms`)
      } else {
        console.log(`✅ Fast route load: ${pathname} took ${loadTime.toFixed(2)}ms`)
      }
    }

    // Use requestIdleCallback if available, otherwise setTimeout
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(measureRouteLoad)
    } else {
      setTimeout(measureRouteLoad, 0)
    }
  }, [pathname])
}
