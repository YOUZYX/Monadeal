'use client'

import { useAlerts } from '@/contexts/AlertContext'
import { useState, useCallback } from 'react'

interface ApiOptions {
  successTitle?: string
  errorTitle?: string
  showSuccessAlert?: boolean
  showErrorAlert?: boolean
  infoMessage?: string
}

interface ApiResponse<T = any> {
  data?: T
  success: boolean
  error?: string
}

export function useApiWithAlerts() {
  const { showSuccess, showError, showInfo } = useAlerts()
  const [isLoading, setIsLoading] = useState(false)

  const executeRequest = useCallback(async <T>(
    request: () => Promise<T>,
    options: ApiOptions = {}
  ): Promise<T | null> => {
    const {
      successTitle = 'Success',
      errorTitle = 'Error',
      showSuccessAlert = true,
      showErrorAlert = true,
      infoMessage
    } = options

    setIsLoading(true)
    
    // Show info message if provided
    if (infoMessage) {
      showInfo('Processing...', infoMessage)
    }
    
    try {
      const result = await request()
      
      if (showSuccessAlert) {
        showSuccess(successTitle, 'Operation completed successfully')
      }
      
      return result
    } catch (error) {
      if (showErrorAlert) {
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'An unexpected error occurred'
        
        showError(errorTitle, errorMessage)
      }
      
      return null
    } finally {
      setIsLoading(false)
    }
  }, [showSuccess, showError, showInfo])

  // Specific method for API calls with response handling
  const apiCall = useCallback(async <T>(
    url: string,
    options: RequestInit = {},
    alertOptions: ApiOptions = {}
  ): Promise<T | null> => {
    return executeRequest(
      async () => {
        const response = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
          ...options,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => null)
          throw new Error(errorData?.error || `HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        return data
      },
      alertOptions
    )
  }, [executeRequest])

  const showApiInfo = useCallback((title: string, message: string) => {
    showInfo(title, message)
  }, [showInfo])

  const showApiSuccess = useCallback((title: string, message: string) => {
    showSuccess(title, message)
  }, [showSuccess])

  const showApiError = useCallback((title: string, message: string) => {
    showError(title, message)
  }, [showError])

  return {
    executeRequest,
    apiCall,
    isLoading,
    showApiInfo,
    showApiSuccess,
    showApiError
  }
}
