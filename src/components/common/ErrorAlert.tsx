'use client'

import { useState } from 'react'
import { 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  X, 
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ErrorAlertProps {
  title?: string
  message: string
  details?: string
  code?: string | number
  onRetry?: () => void
  onDismiss?: () => void
  retryLabel?: string
  dismissible?: boolean
  variant?: 'error' | 'warning' | 'info'
  className?: string
  showDetails?: boolean
}

const ErrorAlert = ({
  title = 'Error',
  message,
  details,
  code,
  onRetry,
  onDismiss,
  retryLabel = 'Try Again',
  dismissible = true,
  variant = 'error',
  className,
  showDetails = false
}: ErrorAlertProps) => {
  const [isExpanded, setIsExpanded] = useState(showDetails)
  const [copied, setCopied] = useState(false)

  const getVariantClasses = () => {
    switch (variant) {
      case 'warning':
        return {
          container: 'border-yellow-500/40 bg-yellow-500/10',
          icon: 'text-yellow-400',
          title: 'text-yellow-300',
          text: 'text-yellow-100'
        }
      case 'info':
        return {
          container: 'border-blue-500/40 bg-blue-500/10',
          icon: 'text-blue-400',
          title: 'text-blue-300',
          text: 'text-blue-100'
        }
      case 'error':
      default:
        return {
          container: 'border-red-500/40 bg-red-500/10',
          icon: 'text-red-400',
          title: 'text-red-300',
          text: 'text-red-100'
        }
    }
  }

  const getIcon = () => {
    const { icon } = getVariantClasses()
    const iconClass = cn('h-5 w-5', icon)

    switch (variant) {
      case 'warning':
        return <AlertTriangle className={iconClass} />
      case 'info':
        return <AlertTriangle className={iconClass} />
      case 'error':
      default:
        return <XCircle className={iconClass} />
    }
  }

  const copyErrorDetails = async () => {
    const errorText = [
      `Title: ${title}`,
      `Message: ${message}`,
      details && `Details: ${details}`,
      code && `Code: ${code}`,
      `Timestamp: ${new Date().toISOString()}`
    ].filter(Boolean).join('\n')

    try {
      await navigator.clipboard.writeText(errorText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy error details:', error)
    }
  }

  const { container, title: titleClass, text } = getVariantClasses()

  return (
    <div className={cn(
      "glass-card rounded-lg border backdrop-blur-sm",
      container,
      className
    )}>
      {/* Main Alert Content */}
      <div className="p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 pt-0.5">
            {getIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className={cn("font-medium text-sm", titleClass)}>
                  {title}
                </h3>
                <p className={cn("text-sm mt-1", text)}>
                  {message}
                </p>
                
                {code && (
                  <p className="text-xs font-mono mt-2 opacity-80">
                    Error Code: {code}
                  </p>
                )}
              </div>
              
              {dismissible && onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                  className="p-1 h-auto -mt-1 -mr-1 hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 mt-3">
              {onRetry && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRetry}
                  className="glass-card border-border/40 hover:border-monad-purple/50 text-sm"
                >
                  <RefreshCw className="h-3 w-3 mr-2" />
                  {retryLabel}
                </Button>
              )}

              {(details || code) && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs hover:bg-white/10"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Hide Details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      Show Details
                    </>
                  )}
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={copyErrorDetails}
                className="text-xs hover:bg-white/10"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (details || code) && (
        <div className="border-t border-border/20 p-4 bg-background/20">
          <div className="space-y-3">
            {details && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">
                  Error Details
                </h4>
                <p className="text-sm text-muted-foreground bg-background/30 rounded p-3 font-mono text-xs">
                  {details}
                </p>
              </div>
            )}

            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              <div>
                <span className="font-medium">Timestamp:</span>
                <span className="ml-1 font-mono">
                  {new Date().toISOString()}
                </span>
              </div>
              
              <a
                href="https://discord.gg/monadeal"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 hover:text-monad-purple transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                <span>Get Help</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ErrorAlert 