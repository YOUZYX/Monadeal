'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Info, 
  X, 
  ExternalLink,
  Loader2
} from 'lucide-react'
import { Alert, AlertType } from '@/contexts/AlertContext'
import { Button } from '@/components/ui/button'

const alertIcons: Record<AlertType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-green-400" />,
  error: <XCircle className="w-5 h-5 text-red-400" />,
  warning: <AlertCircle className="w-5 h-5 text-yellow-400" />,
  info: <Info className="w-5 h-5 text-blue-400" />
}

const alertStyles: Record<AlertType, string> = {
  success: 'border-green-500/20 bg-green-500/10 text-green-100',
  error: 'border-red-500/20 bg-red-500/10 text-red-100',
  warning: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-100',
  info: 'border-blue-500/20 bg-blue-500/10 text-blue-100'
}

const alertGlows: Record<AlertType, string> = {
  success: 'shadow-green-500/20',
  error: 'shadow-red-500/20',
  warning: 'shadow-yellow-500/20',
  info: 'shadow-blue-500/20'
}

interface AlertItemProps {
  alert: Alert
  onRemove: (id: string) => void
}

function AlertItem({ alert, onRemove }: AlertItemProps) {
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    const duration = alert.duration || 5000
    const interval = 50 // Update every 50ms
    const decrement = (interval / duration) * 100

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev <= 0) {
          clearInterval(timer)
          return 0
        }
        return prev - decrement
      })
    }, interval)

    return () => clearInterval(timer)
  }, [alert.duration])

  const handleTxLinkClick = () => {
    if (alert.txHash) {
      window.open(`https://testnet.monadexplorer.com/tx/${alert.txHash}`, '_blank')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.9 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`
        relative overflow-hidden rounded-xl border backdrop-blur-xl
        ${alertStyles[alert.type]} ${alertGlows[alert.type]}
        shadow-2xl max-w-md w-full mx-auto
        hover:scale-[1.02] transition-transform duration-200
      `}
    >
      {/* Progress bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-white/10">
        <motion.div
          className="h-full bg-gradient-to-r from-white/30 to-white/60"
          initial={{ width: '100%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.05, ease: "linear" }}
        />
      </div>

      {/* Subtle glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

      <div className="p-4 relative">
        <div className="flex items-start gap-3">
          {/* Icon with subtle animation */}
          <motion.div 
            className="flex-shrink-0 mt-0.5"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, duration: 0.2 }}
          >
            {alertIcons[alert.type]}
          </motion.div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm mb-1 font-space-grotesk">
              {alert.title}
            </h4>
            <p className="text-sm opacity-90 whitespace-pre-line leading-relaxed">
              {alert.message}
            </p>

            {/* Transaction link */}
            {alert.txHash && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleTxLinkClick}
                  className="mt-3 h-8 px-3 text-xs hover:bg-white/10 
                           border border-white/10 hover:border-white/20
                           transition-all duration-200 group"
                >
                  <ExternalLink className="w-3 h-3 mr-1.5 group-hover:scale-110 transition-transform" />
                  View on Monad Explorer
                </Button>
              </motion.div>
            )}

            {/* Custom action */}
            {alert.action && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={alert.action.onClick}
                  className="mt-3 h-8 px-3 text-xs hover:bg-white/10 
                           border border-white/10 hover:border-white/20
                           transition-all duration-200"
                >
                  {alert.action.label}
                </Button>
              </motion.div>
            )}
          </div>

          {/* Close button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(alert.id)}
            className="h-8 w-8 p-0 hover:bg-white/10 flex-shrink-0
                     hover:rotate-90 transition-all duration-200
                     opacity-60 hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

interface AlertContainerProps {
  alerts: Alert[]
  onRemove: (id: string) => void
}

export function AlertContainer({ alerts, onRemove }: AlertContainerProps) {
  return (
    <div className="fixed top-20 right-4 z-[9999] space-y-3 max-h-screen overflow-hidden">
      <AnimatePresence mode="popLayout">
        {alerts.slice(-5).map((alert) => ( // Show max 5 alerts
          <AlertItem
            key={alert.id}
            alert={alert}
            onRemove={onRemove}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

// Loading alert component for async operations
interface LoadingAlertProps {
  title: string
  message: string
  onCancel?: () => void
}

export function LoadingAlert({ title, message, onCancel }: LoadingAlertProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="border-blue-500/20 bg-blue-500/10 text-blue-100 
                 rounded-xl border backdrop-blur-xl shadow-2xl 
                 shadow-blue-500/20 max-w-md w-full relative overflow-hidden"
    >
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
      
      <div className="p-4 relative">
        <div className="flex items-start gap-3">
          <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm mb-1 font-space-grotesk">{title}</h4>
            <p className="text-sm opacity-90">{message}</p>
          </div>
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-8 w-8 p-0 hover:bg-white/10 flex-shrink-0
                       hover:rotate-90 transition-all duration-200
                       opacity-60 hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
