'use client'

import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http, type Config } from 'wagmi'
import { monadTestnet } from './config'

// Check if we're on the client side
const isClient = typeof window !== 'undefined'

// Get WalletConnect Project ID with fallback
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID

// Wagmi config with enhanced error handling
let cachedConfig: Config | null = null

// Only initialize wagmi config on client side
export const wagmiConfig: Config | null = isClient ? (() => {
  try {
    if (cachedConfig) return cachedConfig
    
    cachedConfig = getDefaultConfig({
      appName: 'Monadeal',
      projectId: projectId || 'demo', // Use 'demo' as fallback for development
      chains: [monadTestnet],
      transports: {
        [monadTestnet.id]: http(),
      },
      ssr: true, // Enable SSR support to prevent hydration issues
    })
    
    return cachedConfig
  } catch (error) {
    console.error('Failed to initialize wagmi config:', error)
    return null
  }
})() : null

// Export a getter function for safe access
export const getWagmiConfig = (): Config => {
  if (!isClient || !wagmiConfig) {
    throw new Error('Wagmi config can only be accessed on the client side')
  }
  return wagmiConfig
} 