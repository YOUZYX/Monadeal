'use client'

import { ReactNode, useEffect, useState } from 'react'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getWagmiConfig } from '@/lib/wagmi-config'

import '@rainbow-me/rainbowkit/styles.css'

interface WalletProviderProps {
  children: ReactNode
}

const queryClient = new QueryClient()

export function WalletProvider({ children }: WalletProviderProps) {
  const [mounted, setMounted] = useState(false)
  const [config, setConfig] = useState<ReturnType<typeof getWagmiConfig> | null>(null)

  // Ensure component only renders on client side - optimized for faster mounting
  useEffect(() => {
    const initializeConfig = () => {
      try {
        const wagmiConfig = getWagmiConfig()
        setConfig(wagmiConfig)
        setMounted(true)
      } catch (error) {
        console.error('Failed to initialize wagmi config:', error)
        // Still set mounted to true to show error state
        setMounted(true)
      }
    }

    // Initialize immediately
    initializeConfig()
  }, [])

  // Don't render anything until we have a config - this prevents the wagmi context error
  if (!mounted || !config) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          {!mounted ? (
            <>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-monad-purple mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Initializing...</p>
            </>
          ) : (
            <>
              <div className="text-red-500 mb-4">⚠️</div>
              <p className="text-muted-foreground">Failed to initialize wallet connection</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-4 px-4 py-2 bg-monad-purple text-white rounded-lg hover:bg-monad-purple/80 transition-colors"
              >
                Retry
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#7c3aed', // Monad purple
            accentColorForeground: 'white',
            borderRadius: 'medium',
            fontStack: 'system',
            overlayBlur: 'small',
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
} 