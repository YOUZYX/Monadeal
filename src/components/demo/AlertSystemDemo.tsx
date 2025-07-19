'use client'

import React from 'react'
import { useAlerts } from '@/contexts/AlertContext'
import { useApiWithAlerts } from '@/hooks/useApiWithAlerts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Info, 
  Zap,
  Database,
  Globe
} from 'lucide-react'

export function AlertSystemDemo() {
  const { 
    showSuccess, 
    showError, 
    showInfo, 
    showWarning,
    showTxPending,
    showTxSuccess,
    showTxError
  } = useAlerts()
  
  const { executeRequest, isLoading } = useApiWithAlerts()

  const mockTransactionHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'

  const handleApiSuccess = async () => {
    await executeRequest(
      async () => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000))
        return { message: 'API call successful' }
      },
      {
        successTitle: 'API Success',
        errorTitle: 'API Error',
        infoMessage: 'Making API call to create deal...'
      }
    )
  }

  const handleApiError = async () => {
    await executeRequest(
      async () => {
        // Simulate API error
        await new Promise(resolve => setTimeout(resolve, 1000))
        throw new Error('Network connection failed')
      },
      {
        successTitle: 'API Success',
        errorTitle: 'API Failed',
        infoMessage: 'Attempting API call...'
      }
    )
  }

  const demoAlerts = [
    {
      title: 'Success Alert',
      description: 'Shows successful operations',
      icon: <CheckCircle className="w-5 h-5 text-green-400" />,
      action: () => showSuccess('Operation Successful', 'Your deal has been created successfully!'),
      color: 'border-green-500/20 hover:border-green-500/40'
    },
    {
      title: 'Error Alert', 
      description: 'Shows error messages',
      icon: <XCircle className="w-5 h-5 text-red-400" />,
      action: () => showError('Transaction Failed', 'Insufficient funds to complete transaction'),
      color: 'border-red-500/20 hover:border-red-500/40'
    },
    {
      title: 'Info Alert',
      description: 'Shows informational messages',
      icon: <Info className="w-5 h-5 text-blue-400" />,
      action: () => showInfo('Deal Status', 'Your deal is waiting for counterparty acceptance'),
      color: 'border-blue-500/20 hover:border-blue-500/40'
    },
    {
      title: 'Warning Alert',
      description: 'Shows warning messages',
      icon: <AlertCircle className="w-5 h-5 text-yellow-400" />,
      action: () => showWarning('Low Balance', 'Your ETH balance is running low'),
      color: 'border-yellow-500/20 hover:border-yellow-500/40'
    }
  ]

  const transactionAlerts = [
    {
      title: 'Transaction Pending',
      description: 'Shows pending blockchain transaction',
      icon: <Zap className="w-5 h-5 text-blue-400" />,
      action: () => showTxPending('Deal Creation Pending', mockTransactionHash),
      color: 'border-blue-500/20 hover:border-blue-500/40'
    },
    {
      title: 'Transaction Success',
      description: 'Shows successful blockchain transaction',
      icon: <CheckCircle className="w-5 h-5 text-green-400" />,
      action: () => showTxSuccess('Deal Created Successfully', mockTransactionHash),
      color: 'border-green-500/20 hover:border-green-500/40'
    },
    {
      title: 'Transaction Error',
      description: 'Shows failed blockchain transaction',
      icon: <XCircle className="w-5 h-5 text-red-400" />,
      action: () => showTxError('Deal Creation Failed', 'Gas estimation failed'),
      color: 'border-red-500/20 hover:border-red-500/40'
    }
  ]

  return (
    <div className="space-y-8 p-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          🚀 Monadeal Alert System
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Experience our beautiful alert system with auto-dismissal, transaction links, and stunning animations.
          All alerts automatically close after 5 seconds!
        </p>
      </div>

      {/* Basic Alerts */}
      <Card className="glass-card border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-400" />
            Basic Alert Types
          </CardTitle>
          <CardDescription>
            Standard alerts for various application states
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {demoAlerts.map((alert, index) => (
              <Button
                key={index}
                variant="outline"
                onClick={alert.action}
                className={`h-auto p-4 justify-start glass-card ${alert.color} 
                          hover:scale-[1.02] transition-all duration-200`}
              >
                <div className="flex items-center gap-3 w-full">
                  {alert.icon}
                  <div className="text-left">
                    <div className="font-semibold">{alert.title}</div>
                    <div className="text-sm opacity-70">{alert.description}</div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transaction Alerts */}
      <Card className="glass-card border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-400" />
            Blockchain Transaction Alerts
          </CardTitle>
          <CardDescription>
            Alerts with Monad Explorer links for blockchain transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {transactionAlerts.map((alert, index) => (
              <Button
                key={index}
                variant="outline"
                onClick={alert.action}
                className={`h-auto p-4 justify-start glass-card ${alert.color}
                          hover:scale-[1.02] transition-all duration-200`}
              >
                <div className="flex items-center gap-3 w-full">
                  {alert.icon}
                  <div className="text-left">
                    <div className="font-semibold">{alert.title}</div>
                    <div className="text-sm opacity-70">{alert.description}</div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API Integration Demo */}
      <Card className="glass-card border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-green-400" />
            API Integration Demo
          </CardTitle>
          <CardDescription>
            Real API calls with automatic alert handling
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              onClick={handleApiSuccess}
              disabled={isLoading}
              variant="outline"
              className="glass-card border-green-500/20 hover:border-green-500/40 
                       hover:scale-[1.02] transition-all duration-200"
            >
              <Globe className="w-4 h-4 mr-2" />
              {isLoading ? 'Loading...' : 'Simulate API Success'}
            </Button>
            
            <Button
              onClick={handleApiError}
              disabled={isLoading}
              variant="outline"
              className="glass-card border-red-500/20 hover:border-red-500/40
                       hover:scale-[1.02] transition-all duration-200"
            >
              <XCircle className="w-4 h-4 mr-2" />
              {isLoading ? 'Loading...' : 'Simulate API Error'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Features List */}
      <Card className="glass-card border-border/40">
        <CardHeader>
          <CardTitle>✨ Alert System Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Auto-dismissal after 5 seconds
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Visual progress bar countdown
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Smooth animations with framer-motion
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Glassmorphism design
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Direct links to Monad Explorer
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Type-specific icons and colors
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Manual close buttons
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Stack management (max 5 alerts)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
