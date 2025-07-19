'use client'

import { useNavigationPerformance } from '@/hooks/useNavigationPerformance'

export default function NavigationMonitor() {
  useNavigationPerformance()
  return null // This component doesn't render anything
}
