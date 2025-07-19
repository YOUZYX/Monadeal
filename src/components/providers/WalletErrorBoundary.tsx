'use client'

import React from 'react'

interface WalletErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

interface WalletErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default class WalletErrorBoundary extends React.Component<
  WalletErrorBoundaryProps,
  WalletErrorBoundaryState
> {
  constructor(props: WalletErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): WalletErrorBoundaryState {
    // Check if this is a wagmi-related error
    const isWagmiError = error.message.includes('WagmiProvider') || 
                        error.message.includes('useConfig') ||
                        error.message.includes('wagmi')
    
    if (isWagmiError) {
      return { hasError: true, error }
    }
    
    // Re-throw non-wagmi errors
    throw error
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('WalletErrorBoundary caught error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="glass-card rounded-lg px-3 py-2">
          <span className="text-sm text-muted-foreground">Wallet loading...</span>
        </div>
      )
    }

    return this.props.children
  }
}
