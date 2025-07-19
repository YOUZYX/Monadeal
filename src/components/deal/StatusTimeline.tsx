'use client'

import { useMemo } from 'react'
import { 
  CheckCircle, 
  Clock, 
  Circle,
  Zap,
  Shield,
  ArrowRightLeft,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { DealStatus, DealType } from '@prisma/client'
import { cn } from '@/lib/utils'

interface TimelineStep {
  id: string
  label: string
  description: string
  icon: any
  status: 'completed' | 'current' | 'upcoming' | 'failed'
  timestamp?: Date
}

interface StatusTimelineProps {
  currentStatus: DealStatus
  dealType?: DealType
  timestamps?: {
    created?: Date
    accepted?: Date
    deposited?: Date
    completed?: Date
    cancelled?: Date
  }
  className?: string
}

const StatusTimeline = ({ 
  currentStatus, 
  dealType = DealType.SELL,
  timestamps,
  className 
}: StatusTimelineProps) => {
  const steps = useMemo((): TimelineStep[] => {
    const baseSteps: TimelineStep[] = [
      {
        id: 'created',
        label: 'Deal Created',
        description: 'Deal proposal initiated',
        icon: Circle,
        status: 'completed',
        timestamp: timestamps?.created,
      },
      {
        id: 'accepted',
        label: 'Deal Accepted',
        description: 'Counterparty agreed to terms',
        icon: CheckCircle,
        status: 'upcoming',
        timestamp: timestamps?.accepted,
      },
      {
        id: 'deposits',
        label: 'Assets Locked',
        description: 'Assets secured in escrow',
        icon: Shield,
        status: 'upcoming',
        timestamp: timestamps?.deposited,
      },
      {
        id: 'transfer',
        label: 'Transfer Initiated',
        description: 'Asset exchange in progress',
        icon: ArrowRightLeft,
        status: 'upcoming',
      },
      {
        id: 'completed',
        label: 'Deal Completed',
        description: 'Assets successfully transferred',
        icon: CheckCircle,
        status: 'upcoming',
        timestamp: timestamps?.completed,
      },
    ]

    // Adjust steps based on current status
    switch (currentStatus) {
      case DealStatus.PENDING:
        baseSteps[1].status = 'current'
        baseSteps[1].icon = Clock
        break
        
      case DealStatus.AWAITING_BUYER:
      case DealStatus.AWAITING_SELLER:
        baseSteps[1].status = 'completed'
        baseSteps[2].status = 'current'
        baseSteps[2].icon = Clock
        break
        
      case DealStatus.LOCKED_IN_ESCROW:
        baseSteps[1].status = 'completed'
        baseSteps[2].status = 'completed'
        baseSteps[3].status = 'current'
        baseSteps[3].icon = Zap
        break
        
      case DealStatus.COMPLETED:
        baseSteps.forEach((step, index) => {
          if (index < baseSteps.length) {
            step.status = 'completed'
          }
        })
        break
        
      case DealStatus.CANCELLED:
        // Mark all remaining steps as failed
        const cancelledIndex = baseSteps.findIndex(step => !step.timestamp)
        baseSteps.forEach((step, index) => {
          if (index >= cancelledIndex && step.status !== 'completed') {
            step.status = 'failed'
            step.icon = XCircle
          }
        })
        // Add cancellation step
        baseSteps.push({
          id: 'cancelled',
          label: 'Deal Cancelled',
          description: 'Deal was cancelled by participant',
          icon: XCircle,
          status: 'completed',
          timestamp: timestamps?.cancelled,
        })
        break
    }

    return baseSteps
  }, [currentStatus, dealType, timestamps])

  const formatTimestamp = (timestamp?: Date) => {
    if (!timestamp) return null
    
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor(diff / (1000 * 60))

    if (days > 0) {
      return `${days}d ago`
    } else if (hours > 0) {
      return `${hours}h ago`
    } else if (minutes > 0) {
      return `${minutes}m ago`
    } else {
      return 'Just now'
    }
  }

  const getStepStyles = (step: TimelineStep, index: number) => {
    const isLast = index === steps.length - 1
    
    switch (step.status) {
      case 'completed':
        return {
          icon: 'text-green-400 bg-green-400/20 border-green-400/40',
          line: 'bg-green-400/40',
          text: 'text-foreground',
          glow: 'shadow-green-400/20',
        }
      case 'current':
        return {
          icon: 'text-monad-purple bg-monad-purple/20 border-monad-purple/40 animate-pulse',
          line: 'bg-border/40',
          text: 'text-monad-purple font-medium',
          glow: 'shadow-monad-purple/20',
        }
      case 'failed':
        return {
          icon: 'text-red-400 bg-red-400/20 border-red-400/40',
          line: 'bg-red-400/40',
          text: 'text-red-400',
          glow: 'shadow-red-400/20',
        }
      default: // upcoming
        return {
          icon: 'text-muted-foreground bg-muted/20 border-border/40',
          line: 'bg-border/40',
          text: 'text-muted-foreground',
          glow: '',
        }
    }
  }

  return (
    <div className={cn("space-y-1", className)}>
      {steps.map((step, index) => {
        const styles = getStepStyles(step, index)
        const IconComponent = step.icon
        const isLast = index === steps.length - 1

        return (
          <div key={step.id} className="relative flex items-start group">
            {/* Timeline Line */}
            {!isLast && (
              <div 
                className={cn(
                  "absolute left-4 top-8 w-0.5 h-12 transition-all duration-500",
                  styles.line
                )}
              />
            )}

            {/* Step Icon */}
            <div className={cn(
              "relative z-10 flex items-center justify-center",
              "h-8 w-8 rounded-full border-2 transition-all duration-300",
              "group-hover:scale-110",
              styles.icon,
              styles.glow && `shadow-lg ${styles.glow}`
            )}>
              <IconComponent className="h-4 w-4" />
            </div>

            {/* Step Content */}
            <div className="ml-4 flex-1 min-w-0 pb-6">
              <div className="flex items-center justify-between">
                <h4 className={cn(
                  "text-sm font-medium transition-colors duration-200",
                  styles.text
                )}>
                  {step.label}
                </h4>
                
                {step.timestamp && (
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(step.timestamp)}
                  </span>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground mt-1">
                {step.description}
              </p>

              {/* Progress Animation for Current Step */}
              {step.status === 'current' && (
                <div className="mt-2 w-full bg-muted/20 rounded-full h-1 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-monad-purple to-blue-500 rounded-full animate-pulse" 
                       style={{ width: '60%' }} />
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Status Summary */}
      <div className="pt-4 border-t border-border/40">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Current Status</span>
          <div className="flex items-center space-x-2">
            {currentStatus === DealStatus.CANCELLED ? (
              <AlertCircle className="h-3 w-3 text-red-400" />
            ) : currentStatus === DealStatus.COMPLETED ? (
              <CheckCircle className="h-3 w-3 text-green-400" />
            ) : (
              <Clock className="h-3 w-3 text-monad-purple" />
            )}
            <span className={cn(
              "font-medium",
              currentStatus === DealStatus.CANCELLED && "text-red-400",
              currentStatus === DealStatus.COMPLETED && "text-green-400",
              !['CANCELLED', 'COMPLETED'].includes(currentStatus) && "text-monad-purple"
            )}>
              {currentStatus.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StatusTimeline 