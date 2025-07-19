'use client'

import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Clock,
  Wifi,
  WifiOff
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TransactionState } from '@/components/common/TransactionModal'

interface TransactionStatusIndicatorProps {
  state: TransactionState
  confirmations?: number
  requiredConfirmations?: number
  className?: string
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const TransactionStatusIndicator = ({
  state,
  confirmations = 0,
  requiredConfirmations = 12,
  className,
  showText = true,
  size = 'md'
}: TransactionStatusIndicatorProps) => {
  const getIcon = () => {
    const iconSizes = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4', 
      lg: 'h-5 w-5'
    }
    const iconClass = iconSizes[size]

    switch (state) {
      case 'pending':
        return <Loader2 className={cn(iconClass, "text-monad-purple animate-spin")} />
      case 'confirming':
        return <Clock className={cn(iconClass, "text-blue-400 animate-pulse")} />
      case 'success':
        return <CheckCircle className={cn(iconClass, "text-green-400")} />
      case 'error':
        return <XCircle className={cn(iconClass, "text-red-400")} />
      case 'rejected':
        return <AlertTriangle className={cn(iconClass, "text-yellow-400")} />
      case 'idle':
      default:
        return <Wifi className={cn(iconClass, "text-muted-foreground")} />
    }
  }

  const getText = () => {
    switch (state) {
      case 'pending':
        return 'Pending...'
      case 'confirming':
        return confirmations > 0 
          ? `${confirmations}/${requiredConfirmations} confirmations`
          : 'Confirming...'
      case 'success':
        return 'Success'
      case 'error':
        return 'Failed'
      case 'rejected':
        return 'Rejected'
      case 'idle':
      default:
        return 'Ready'
    }
  }

  const getStatusColor = () => {
    switch (state) {
      case 'pending':
        return 'border-monad-purple/40 bg-monad-purple/10'
      case 'confirming':
        return 'border-blue-500/40 bg-blue-500/10'
      case 'success':
        return 'border-green-500/40 bg-green-500/10'
      case 'error':
        return 'border-red-500/40 bg-red-500/10'
      case 'rejected':
        return 'border-yellow-500/40 bg-yellow-500/10'
      case 'idle':
      default:
        return 'border-border/40 bg-background/50'
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs gap-1'
      case 'lg':
        return 'px-4 py-2 text-base gap-3'
      case 'md':
      default:
        return 'px-3 py-1.5 text-sm gap-2'
    }
  }

  // Progress bar for confirming state
  const getProgress = () => {
    if (state !== 'confirming' || confirmations === 0) return 0
    return Math.min((confirmations / requiredConfirmations) * 100, 100)
  }

  return (
    <div className={cn(
      "inline-flex items-center rounded-full border backdrop-blur-sm transition-all duration-200",
      getStatusColor(),
      getSizeClasses(),
      className
    )}>
      {getIcon()}
      
      {showText && (
        <span className="font-medium whitespace-nowrap">
          {getText()}
        </span>
      )}
      
      {/* Progress indicator for confirming state */}
      {state === 'confirming' && confirmations > 0 && (
        <div className="relative ml-2">
          <div className="w-8 h-1 bg-border/40 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-400 to-monad-purple rounded-full transition-all duration-300"
              style={{ width: `${getProgress()}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default TransactionStatusIndicator 