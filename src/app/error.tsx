'use client' // Error components must be Client Components

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application Error:', error)
  }, [error])

  const isDevelopment = process.env.NODE_ENV === 'development'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="max-w-md w-full glass-card rounded-xl p-8 text-center space-y-6">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center animate-pulse">
            <AlertTriangle className="h-8 w-8 text-white" />
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold monad-gradient-text">
            Oops! Something went wrong
          </h2>
          <p className="text-muted-foreground">
            We encountered an unexpected error. Don't worry, our team has been notified.
          </p>
        </div>

        {/* Error Details (Development only) */}
        {isDevelopment && (
          <div className="glass-dark rounded-lg p-4 text-left">
            <div className="flex items-center space-x-2 mb-2">
              <Bug className="h-4 w-4 text-red-400" />
              <span className="text-sm font-medium text-red-400">Development Details:</span>
            </div>
            <code className="text-xs text-muted-foreground break-all">
              {error.message}
            </code>
            {error.digest && (
              <p className="text-xs text-muted-foreground mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={reset}
            className="btn-monad w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          
          <Button
            variant="outline"
            className="glass-card border-monad-purple/30 hover:border-monad-purple w-full"
            asChild
          >
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>

        {/* Support Message */}
        <p className="text-xs text-muted-foreground">
          If the problem persists, please contact{' '}
          <span className="monad-gradient-text font-medium">YOUZY</span>
        </p>
      </div>
    </div>
  )
} 