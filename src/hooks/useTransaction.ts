'use client'

import { useAlerts } from '@/contexts/AlertContext'
import { useWaitForTransactionReceipt } from 'wagmi'
import { useEffect } from 'react'

interface UseTransactionOptions {
  onSuccess?: (txHash: string) => void
  onError?: (error: Error) => void
  successTitle?: string
  errorTitle?: string
  pendingTitle?: string
}

export function useTransaction(
  hash: `0x${string}` | undefined,
  options: UseTransactionOptions = {}
) {
  const { showTxPending, showTxSuccess, showTxError } = useAlerts()
  
  const {
    data: receipt,
    isError,
    isLoading,
    error
  } = useWaitForTransactionReceipt({
    hash,
  })

  useEffect(() => {
    if (hash && isLoading) {
      showTxPending(
        options.pendingTitle || 'Transaction Pending',
        hash
      )
    }
  }, [hash, isLoading, showTxPending, options.pendingTitle])

  useEffect(() => {
    if (receipt) {
      showTxSuccess(
        options.successTitle || 'Transaction Successful',
        receipt.transactionHash
      )
      options.onSuccess?.(receipt.transactionHash)
    }
  }, [receipt, showTxSuccess, options])

  useEffect(() => {
    if (isError && error) {
      showTxError(
        options.errorTitle || 'Transaction Failed',
        error.message
      )
      options.onError?.(error)
    }
  }, [isError, error, showTxError, options])

  return {
    receipt,
    isLoading,
    isError,
    error
  }
}
