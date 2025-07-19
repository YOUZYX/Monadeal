'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { AlertContainer } from '@/components/ui/alert-system'

export type AlertType = 'success' | 'error' | 'info' | 'warning'

export interface Alert {
  id: string
  type: AlertType
  title: string
  message: string
  txHash?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface AlertContextType {
  alerts: Alert[]
  addAlert: (alert: Omit<Alert, 'id'>) => void
  removeAlert: (id: string) => void
  clearAllAlerts: () => void
  
  // Convenience methods
  showSuccess: (title: string, message: string, txHash?: string) => void
  showError: (title: string, message: string, details?: string) => void
  showInfo: (title: string, message: string) => void
  showWarning: (title: string, message: string) => void
  
  // Transaction specific alerts
  showTxPending: (title: string, txHash: string) => void
  showTxSuccess: (title: string, txHash: string) => void
  showTxError: (title: string, error: string) => void
}

const AlertContext = createContext<AlertContextType | undefined>(undefined)

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>([])

  const addAlert = useCallback((alert: Omit<Alert, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newAlert: Alert = {
      ...alert,
      id,
      duration: alert.duration || 5000, // Default 5 seconds
    }
    
    setAlerts(prev => [...prev, newAlert])
    
    // Auto-remove after duration
    setTimeout(() => {
      removeAlert(id)
    }, newAlert.duration)
  }, [])

  const removeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id))
  }, [])

  const clearAllAlerts = useCallback(() => {
    setAlerts([])
  }, [])

  // Convenience methods
  const showSuccess = useCallback((title: string, message: string, txHash?: string) => {
    addAlert({ type: 'success', title, message, txHash })
  }, [addAlert])

  const showError = useCallback((title: string, message: string, details?: string) => {
    addAlert({ 
      type: 'error', 
      title, 
      message: details ? `${message}\n${details}` : message 
    })
  }, [addAlert])

  const showInfo = useCallback((title: string, message: string) => {
    addAlert({ type: 'info', title, message })
  }, [addAlert])

  const showWarning = useCallback((title: string, message: string) => {
    addAlert({ type: 'warning', title, message })
  }, [addAlert])

  // Transaction specific alerts
  const showTxPending = useCallback((title: string, txHash: string) => {
    addAlert({
      type: 'info',
      title,
      message: 'Transaction submitted to the blockchain. Please wait for confirmation...',
      txHash,
      duration: 10000 // Longer duration for pending tx
    })
  }, [addAlert])

  const showTxSuccess = useCallback((title: string, txHash: string) => {
    addAlert({
      type: 'success',
      title,
      message: 'Transaction confirmed successfully on the blockchain.',
      txHash
    })
  }, [addAlert])

  const showTxError = useCallback((title: string, error: string) => {
    addAlert({
      type: 'error',
      title,
      message: `Transaction failed: ${error}`
    })
  }, [addAlert])

  const value: AlertContextType = {
    alerts,
    addAlert,
    removeAlert,
    clearAllAlerts,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    showTxPending,
    showTxSuccess,
    showTxError
  }

  return (
    <AlertContext.Provider value={value}>
      {children}
      <AlertContainer alerts={alerts} onRemove={removeAlert} />
    </AlertContext.Provider>
  )
}

export function useAlerts() {
  const context = useContext(AlertContext)
  if (context === undefined) {
    throw new Error('useAlerts must be used within an AlertProvider')
  }
  return context
}
