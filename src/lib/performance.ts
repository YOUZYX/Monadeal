// Performance optimization utilities for Monadeal platform

/**
 * Preload critical routes to reduce navigation delays
 * Enhanced with route priority and aggressive preloading
 */
export function preloadCriticalRoutes() {
  if (typeof window === 'undefined') return

  const criticalRoutes = [
    { path: '/deals', priority: 'high' },
    { path: '/profile', priority: 'high' },
    { path: '/notifications', priority: 'high' },
    { path: '/create', priority: 'medium' }
  ]

  criticalRoutes.forEach(route => {
    // Prefetch for routing
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = route.path
    document.head.appendChild(link)

    // For high priority routes, also use modulepreload
    if (route.priority === 'high') {
      const moduleLink = document.createElement('link')
      moduleLink.rel = 'modulepreload'
      moduleLink.href = `/_next/static/chunks/pages${route.path}.js`
      document.head.appendChild(moduleLink)
    }
  })

  // Aggressive preloading: Actually visit the routes in the background
  setTimeout(() => {
    precompileRoutes(criticalRoutes.map(r => r.path))
  }, 2000) // Wait 2 seconds after initial load
}

/**
 * Precompile routes by making background requests
 */
async function precompileRoutes(routes: string[]) {
  for (const route of routes) {
    try {
      // Use fetch with no-cors to avoid CORS issues and just trigger compilation
      fetch(route, { 
        mode: 'no-cors',
        cache: 'no-store' 
      }).catch(() => {
        // Ignore errors, we just want to trigger compilation
      })
      
      // Small delay between requests to not overwhelm the server
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error) {
      // Ignore errors in background precompilation
    }
  }
}

/**
 * Optimize images for faster loading
 */
export function optimizeImageLoading() {
  if (typeof window === 'undefined') return

  // Preload critical images
  const criticalImages = [
    '/placeholder-nft.png'
  ]

  criticalImages.forEach(src => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = src
    document.head.appendChild(link)
  })
}

/**
 * Cache API responses for better performance
 */
export class APICache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()

  set(key: string, data: any, ttlMs: number = 5 * 60 * 1000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    })
  }

  get(key: string): any | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    const isExpired = Date.now() - cached.timestamp > cached.ttl
    if (isExpired) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  clear() {
    this.cache.clear()
  }
}

export const apiCache = new APICache()

/**
 * Debounced function to prevent excessive API calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      func(...args)
    }, waitMs)
  }
}

/**
 * Intersection Observer for lazy loading
 */
export function createLazyLoader(callback: (entries: IntersectionObserverEntry[]) => void) {
  if (typeof window === 'undefined') return null

  return new IntersectionObserver(callback, {
    rootMargin: '100px', // Start loading 100px before element enters viewport
    threshold: 0.1
  })
}

/**
 * Performance monitoring
 */
export function measurePerformance(name: string, fn: () => Promise<any>) {
  const start = performance.now()
  
  return fn().finally(() => {
    const end = performance.now()
    const duration = end - start
    
    if (duration > 1000) { // Log if operation takes more than 1 second
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`)
    } else {
      console.log(`Performance: ${name} completed in ${duration.toFixed(2)}ms`)
    }
  })
}
