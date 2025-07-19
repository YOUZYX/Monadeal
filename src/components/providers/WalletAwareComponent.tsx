'use client'

import { ReactNode } from 'react'
import { useConfig } from 'wagmi'

interface WalletAwareComponentProps {
  children: ReactNode
  fallback?: ReactNode
}

export default function WalletAwareComponent({ 
  children, 
  fallback = null 
}: WalletAwareComponentProps) {
  try {
    // Try to access wagmi config to check if provider is ready
    useConfig()
    return <>{children}</>
  } catch (error) {
    // If wagmi is not ready, render fallback
    return <>{fallback}</>
  }
}
