'use client'

import { useState, useEffect } from 'react'
import {
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  X,
  Coins,
  Shield,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export type TransactionState = 
  | 'idle'
  | 'pending'
  | 'confirming'
  | 'success'
  | 'error'
  | 'rejected'

export interface TransactionData {
  hash?: string
  blockNumber?: number
  gasUsed?: string
  gasFee?: string
  confirmations?: number
  requiredConfirmations?: number
}

export interface TransactionError {
  code?: string | number
  message: string
  details?: string
}

interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  state: TransactionState
  transactionData?: TransactionData
  error?: TransactionError
  title?: string
  description?: string
  onRetry?: () => void
  onSuccess?: () => void
  className?: string
}

const TransactionModal = ({
  isOpen,
  onClose,
  state,
  transactionData,
  error,
  title = "Transaction",
  description,
  onRetry,
  onSuccess,
  className
}: TransactionModalProps) => {
  const [countdown, setCountdown] = useState(0)

  // Auto-close after success
  useEffect(() => {
    if (state === 'success' && onSuccess) {
      const timer = setTimeout(() => {
        onSuccess()
        onClose()
      }, 1000)
      
      // Start countdown
      setCountdown(5)
      const countdownTimer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownTimer)
            return 0
          }
          return prev - 1
        })
      }, 5000)

      return () => {
        clearTimeout(timer)
        clearInterval(countdownTimer)
      }
    }
  }, [state, onSuccess, onClose])

  const getBlockExplorerUrl = (hash: string) => {
    // Monad testnet block explorer - update when available
    return `https://testnet.monadexplorer.com/tx/${hash}`
  }

  const formatGasFee = (fee?: string) => {
    if (!fee) return 'Unknown'
    try {
      const feeNum = parseFloat(fee)
      return `${feeNum.toFixed(6)} MON`
    } catch {
      return fee
    }
  }

  const getStateIcon = () => {
    const iconClass = "h-8 w-8"
    
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
      default:
        return <Coins className={cn(iconClass, "text-muted-foreground")} />
    }
  }

  const getStateTitle = () => {
    switch (state) {
      case 'pending':
        return 'Confirm Transaction'
      case 'confirming':
        return 'Transaction Confirming'
      case 'success':
        return 'Transaction Successful'
      case 'error':
        return 'Transaction Failed'
      case 'rejected':
        return 'Transaction Rejected'
      default:
        return title
    }
  }

  const getSimplifiedErrorMessage = (errorMessage?: string) => {
    if (!errorMessage) return 'Transaction failed. Please try again.'
    
    // Handle common error patterns with user-friendly messages
    if (errorMessage.includes('rejected') || errorMessage.includes('denied')) {
      return 'Transaction was rejected in your wallet.'
    }
    if (errorMessage.includes('insufficient funds')) {
      return 'Insufficient funds to complete the transaction.'
    }
    if (errorMessage.includes('gas')) {
      return 'Transaction failed due to gas estimation error.'
    }
    if (errorMessage.includes('network')) {
      return 'Network error. Please check your connection and try again.'
    }
    if (errorMessage.includes('timeout')) {
      return 'Transaction timed out. Please try again.'
    }
    
    // For very long messages, truncate and show first part
    if (errorMessage.length > 100) {
      return errorMessage.substring(0, 100) + '...'
    }
    
    return errorMessage
  }

  const getStateDescription = () => {
    switch (state) {
      case 'pending':
        return description || 'Please confirm the transaction in your wallet to proceed.'
      case 'confirming':
        return 'Your transaction has been submitted and is being confirmed on the blockchain.'
      case 'success':
        return 'Your transaction has been successfully confirmed on the blockchain.'
      case 'error':
        return getSimplifiedErrorMessage(error?.message)
      case 'rejected':
        return 'You rejected the transaction. You can try again if you wish.'
      default:
        return description || ''
    }
  }

  const getStateColor = () => {
    switch (state) {
      case 'pending':
        return 'border-monad-purple/40 bg-monad-purple/5'
      case 'confirming':
        return 'border-blue-500/40 bg-blue-500/5'
      case 'success':
        return 'border-green-500/40 bg-green-500/5'
      case 'error':
        return 'border-red-500/40 bg-red-500/5'
      case 'rejected':
        return 'border-yellow-500/40 bg-yellow-500/5'
      default:
        return 'border-border/40'
    }
  }

  const canClose = state === 'success' || state === 'error' || state === 'rejected'
  const showRetry = (state === 'error' || state === 'rejected') && onRetry

  return (
    <Dialog open={isOpen} onOpenChange={canClose ? onClose : undefined}>
      <DialogContent 
        className={cn(
          "glass-card border max-w-md",
          getStateColor(),
          className
        )}
        showCloseButton={canClose}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            {getStateIcon()}
            <span>{getStateTitle()}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Description */}
          <p className="text-muted-foreground text-center">
            {getStateDescription()}
          </p>

          {/* Transaction Hash */}
          {transactionData?.hash && (
            <div className="glass-card p-4 rounded-lg border border-border/40 space-y-3">
              <h3 className="font-medium text-sm">Transaction Details</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Hash:</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs">
                      {`${transactionData.hash.slice(0, 8)}...${transactionData.hash.slice(-8)}`}
                    </span>
                    <a
                      href={getBlockExplorerUrl(transactionData.hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded hover:bg-muted/20 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-monad-purple" />
                    </a>
                  </div>
                </div>

                {transactionData.blockNumber && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Block:</span>
                    <span>#{transactionData.blockNumber.toLocaleString()}</span>
                  </div>
                )}

                {transactionData.gasFee && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Gas Fee:</span>
                    <span>{formatGasFee(transactionData.gasFee)}</span>
                  </div>
                )}

                {state === 'confirming' && transactionData.confirmations !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Confirmations:</span>
                    <span>
                      {transactionData.confirmations}/{transactionData.requiredConfirmations || 12}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Details */}
          {state === 'error' && error && (
            <div className="glass-card p-3 rounded-lg border border-red-500/20 bg-red-500/5 space-y-2 max-w-full">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm text-red-400">What happened?</h3>
                {error.code && (
                  <span className="text-xs font-mono text-muted-foreground bg-red-500/10 px-2 py-1 rounded">
                    {error.code}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground break-words">
                {getSimplifiedErrorMessage(error.message)}
              </p>
              {error.details && error.details !== error.message && (
                <details className="text-xs text-muted-foreground/80">
                  <summary className="cursor-pointer hover:text-muted-foreground transition-colors">
                    Technical details
                  </summary>
                  <p className="mt-2 break-words">{error.details}</p>
                </details>
              )}
            </div>
          )}

          {/* Progress for confirming state */}
          {state === 'confirming' && transactionData?.confirmations !== undefined && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Confirmation Progress</span>
                <span className="text-monad-purple font-medium">
                  {Math.round((transactionData.confirmations / (transactionData.requiredConfirmations || 12)) * 100)}%
                </span>
              </div>
              <div className="w-full bg-border/40 rounded-full h-2">
                <div 
                  className="h-2 bg-gradient-to-r from-monad-purple to-blue-500 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min((transactionData.confirmations / (transactionData.requiredConfirmations || 12)) * 100, 100)}%` 
                  }}
                />
              </div>
            </div>
          )}

          {/* Auto-close countdown for success */}
          {state === 'success' && countdown > 0 && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Closing automatically in {countdown} second{countdown !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-2">
            {showRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="flex-1 glass-card border-border/40 hover:border-monad-purple/50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
            
            {canClose && (
              <Button
                variant={state === 'success' ? 'default' : 'outline'}
                size="sm"
                onClick={onClose}
                className={cn(
                  "flex-1",
                  state === 'success' 
                    ? "btn-monad" 
                    : "glass-card border-border/40"
                )}
              >
                <X className="h-4 w-4 mr-2" />
                {state === 'success' ? 'Done' : 'Close'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default TransactionModal 