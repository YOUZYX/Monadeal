'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAccount, useWriteContract, usePublicClient } from 'wagmi'
import { parseEther } from 'viem'
import { DealFactoryABI, NFTEscrowABI } from '@/contracts/abis'
import { appConfig } from '@/lib/config'
import { useAlerts } from '@/contexts/AlertContext'
import type { TransactionState, TransactionData, TransactionError } from '@/components/common/TransactionModal'

interface UseTransactionsReturn {
  // State
  isModalOpen: boolean
  transactionState: TransactionState
  transactionData?: TransactionData
  transactionError?: TransactionError
  
  // Actions
  acceptDeal: (dealId: string, escrowAddress: string, price?: string) => Promise<void>
  depositNFT: (dealId: string, escrowAddress: string, nftContract: string, tokenId: string) => Promise<void>
  approveNFT: (nftContract: string, tokenId: string, escrowAddress: string) => Promise<void>
  depositNFTOnly: (dealId: string, escrowAddress: string) => Promise<void>
  checkNFTApproval: (nftContract: string, tokenId: string, escrowAddress: string) => Promise<boolean>
  depositPayment: (dealId: string, escrowAddress: string, amount: string) => Promise<void>
  completeDeal: (dealId: string, escrowAddress: string) => Promise<void>
  cancelDeal: (dealId: string, escrowAddress: string) => Promise<void>
  createDeal: (params: CreateDealParams) => Promise<void>
  updateDealPrice: (dealId: string, escrowAddress: string, newPrice: string) => Promise<void>
  closeModal: () => void
  retryTransaction: () => void
}

interface CreateDealParams {
  dealType: number
  counterparty: string
  nftContract: string
  tokenId: string
  price?: string
  swapNftContract?: string
  swapTokenId?: string
}

export function useTransactions(): UseTransactionsReturn {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { showTxPending, showTxSuccess, showTxError, showInfo, showError } = useAlerts()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [transactionState, setTransactionState] = useState<TransactionState>('idle')
  const [transactionData, setTransactionData] = useState<TransactionData>()
  const [transactionError, setTransactionError] = useState<TransactionError>()
  const [lastAction, setLastAction] = useState<() => Promise<void>>()

  // Wagmi hooks for writing contracts
  const { writeContract, isPending: isWritePending, data: txHash, error: writeError } = useWriteContract()

  // Monitor transaction hash changes
  useEffect(() => {
    if (txHash) {
      setTransactionData({ hash: txHash })
      setTransactionState('success')
      showTxPending('Transaction Submitted', txHash)
    }
  }, [txHash, showTxPending])

  // Monitor write errors
  useEffect(() => {
    if (writeError) {
      setTransactionError({
        message: writeError.message,
        details: 'Transaction failed'
      })
      setTransactionState('error')
      showTxError('Transaction Failed', writeError.message)
    }
  }, [writeError, showTxError])

  // Reset modal state
  const resetState = useCallback(() => {
    setTransactionState('idle')
    setTransactionData(undefined)
    setTransactionError(undefined)
    setLastAction(undefined)
  }, [])

  // Close modal and reset
  const closeModal = useCallback(() => {
    setIsModalOpen(false)
    setTimeout(resetState, 300) // Delay reset for smooth animation
  }, [resetState])

  // Retry last transaction
  const retryTransaction = useCallback(async () => {
    if (lastAction) {
      await lastAction()
    }
  }, [lastAction])

  // Helper function to check NFT approval
  const checkNFTApproval = useCallback(async (
    nftContract: string,
    tokenId: string,
    escrowAddress: string
  ): Promise<boolean> => {
    if (!publicClient || !address) return false

    try {
      // Check if specific token is approved
      const approvedAddress = await publicClient.readContract({
        address: nftContract as `0x${string}`,
        abi: [
          {
            inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
            name: "getApproved",
            outputs: [{ internalType: "address", name: "", type: "address" }],
            stateMutability: "view",
            type: "function"
          }
        ],
        functionName: 'getApproved',
        args: [BigInt(tokenId)]
      })

      // Check if approved for all
      const isApprovedForAll = await publicClient.readContract({
        address: nftContract as `0x${string}`,
        abi: [
          {
            inputs: [
              { internalType: "address", name: "owner", type: "address" },
              { internalType: "address", name: "operator", type: "address" }
            ],
            name: "isApprovedForAll",
            outputs: [{ internalType: "bool", name: "", type: "bool" }],
            stateMutability: "view",
            type: "function"
          }
        ],
        functionName: 'isApprovedForAll',
        args: [address, escrowAddress as `0x${string}`]
      })

      return (approvedAddress as string).toLowerCase() === escrowAddress.toLowerCase() || (isApprovedForAll as boolean)
    } catch (error) {
      console.error('Error checking NFT approval:', error)
      return false
    }
  }, [publicClient, address])

  // Generic transaction handler
  const executeTransaction = useCallback(async (
    action: () => Promise<void>,
    actionName: string
  ) => {
    if (!address) {
      setTransactionError({
        message: 'Wallet not connected',
        details: 'Please connect your wallet to continue.'
      })
      setTransactionState('error')
      setIsModalOpen(true)
      return
    }

    setLastAction(() => action)
    setIsModalOpen(true)
    setTransactionState('pending')
    resetState()

    try {
      await action()
    } catch (error: any) {
      console.error(`${actionName} error:`, error)
      
      if (error?.code === 4001 || error?.message?.includes('rejected')) {
        setTransactionState('rejected')
        setTransactionError({
          code: error.code,
          message: 'Transaction rejected',
          details: 'You rejected the transaction in your wallet.'
        })
      } else {
        setTransactionState('error')
        setTransactionError({
          code: error.code,
          message: error.message || `${actionName} failed`,
          details: error.details || 'An unexpected error occurred.'
        })
      }
    }
  }, [address, resetState])

  // Accept Deal
  const acceptDeal = useCallback(async (
    dealId: string, 
    escrowAddress: string, 
    price?: string
  ) => {
    showInfo('Accepting Deal', 'Preparing transaction to accept the deal...')
    
    const action = async () => {
      writeContract({
        address: escrowAddress as `0x${string}`,
        abi: NFTEscrowABI,
        functionName: 'acceptDeal',
        args: [BigInt(dealId)],
      })
    }

    await executeTransaction(action, 'Accept deal')
  }, [writeContract, executeTransaction, showInfo])

  // Enhanced Deposit NFT with automatic approval
  const depositNFT = useCallback(async (
    dealId: string,
    escrowAddress: string,
    nftContract: string,
    tokenId: string
  ) => {
    const action = async () => {
      // Step 1: Check if NFT is already approved
      console.log('Checking NFT approval...')
      const isApproved = await checkNFTApproval(nftContract, tokenId, escrowAddress)
      
      if (!isApproved) {
        // Step 2: Approve NFT first and wait for confirmation
        console.log('NFT not approved, requesting approval...')
        setTransactionState('confirming') // Show "waiting for approval" state
        
        // Start approval transaction
        writeContract({
          address: nftContract as `0x${string}`,
          abi: [
            {
              inputs: [
                { internalType: "address", name: "to", type: "address" },
                { internalType: "uint256", name: "tokenId", type: "uint256" }
              ],
              name: "approve",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function"
            }
          ],
          functionName: 'approve',
          args: [escrowAddress as `0x${string}`, BigInt(tokenId)]
        })

        // Wait for approval transaction to complete, then initiate NFT deposit
        return new Promise<void>((resolve, reject) => {
          const checkCompletion = setInterval(async () => {
            if (txHash) {
              try {
                console.log('Approval transaction hash:', txHash)
                console.log('Waiting for approval confirmation...')
                
                // Wait for the approval transaction to be confirmed
                const receipt = await publicClient?.waitForTransactionReceipt({ 
                  hash: txHash 
                })
                
                if (receipt?.status === 'success') {
                  console.log('NFT approved successfully, now starting NFT deposit...')
                  clearInterval(checkCompletion)
                  
                  // Create a short delay to ensure approval is fully processed
                  setTimeout(() => {
                    // Step 3: Now deposit NFT (this will trigger a new transaction)
                    writeContract({
                      address: escrowAddress as `0x${string}`,
                      abi: NFTEscrowABI,
                      functionName: 'depositNFT',
                      args: [BigInt(dealId)],
                    })
                  }, 2000) // 2 second delay to ensure approval is processed
                  
                  resolve()
                } else {
                  clearInterval(checkCompletion)
                  reject(new Error('Approval transaction failed'))
                }
              } catch (error) {
                clearInterval(checkCompletion)
                reject(error)
              }
            }
            if (writeError) {
              clearInterval(checkCompletion)
              reject(writeError)
            }
          }, 1000)
        })
      } else {
        // NFT already approved, proceed directly to deposit
        console.log('NFT already approved, depositing...')
        writeContract({
          address: escrowAddress as `0x${string}`,
          abi: NFTEscrowABI,
          functionName: 'depositNFT',
          args: [BigInt(dealId)],
        })
      }
    }

    await executeTransaction(action, 'Deposit NFT')
  }, [writeContract, executeTransaction, checkNFTApproval, txHash, writeError, publicClient])

  // Deposit Payment
  const depositPayment = useCallback(async (
    dealId: string,
    escrowAddress: string,
    amount: string
  ) => {
    showInfo('Depositing Payment', `Preparing to deposit ${amount} ETH for the deal...`)
    
    const action = async () => {
      // Handle both wei format and human-readable format
      let valueInWei: bigint
      try {
        if (amount.includes('.') || amount.length <= 10) {
          // Human-readable format (e.g., "0.15")
          valueInWei = parseEther(amount)
        } else {
          // Already in wei format (e.g., "150000000000000000")
          valueInWei = BigInt(amount)
        }
      } catch (error) {
        throw new Error(`Invalid amount format: ${amount}`)
      }

      writeContract({
        address: escrowAddress as `0x${string}`,
        abi: NFTEscrowABI,
        functionName: 'depositPayment',
        args: [BigInt(dealId)],
        value: valueInWei,
      })
    }

    await executeTransaction(action, 'Deposit payment')
  }, [writeContract, executeTransaction, showInfo])

  // Complete Deal
  const completeDeal = useCallback(async (
    dealId: string,
    escrowAddress: string
  ) => {
    const action = async () => {
      writeContract({
        address: escrowAddress as `0x${string}`,
        abi: NFTEscrowABI,
        functionName: 'completeDeal',
        args: [BigInt(dealId)],
      })
    }

    await executeTransaction(action, 'Complete deal')
  }, [writeContract, executeTransaction])

  // Cancel Deal
  const cancelDeal = useCallback(async (
    dealId: string,
    escrowAddress: string
  ) => {
    const action = async () => {
      writeContract({
        address: escrowAddress as `0x${string}`,
        abi: NFTEscrowABI,
        functionName: 'cancelDeal',
        args: [BigInt(dealId)],
      })
    }

    await executeTransaction(action, 'Cancel deal')
  }, [writeContract, executeTransaction])

  // NEW: Separate NFT Approval function
  const approveNFT = useCallback(async (
    nftContract: string,
    tokenId: string,
    escrowAddress: string
  ) => {
    const action = async () => {
      writeContract({
        address: nftContract as `0x${string}`,
        abi: [
          {
            inputs: [
              { internalType: "address", name: "to", type: "address" },
              { internalType: "uint256", name: "tokenId", type: "uint256" }
            ],
            name: "approve",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function"
          }
        ],
        functionName: 'approve',
        args: [escrowAddress as `0x${string}`, BigInt(tokenId)]
      })
    }

    await executeTransaction(action, 'Approve NFT')
  }, [writeContract, executeTransaction])

  // NEW: Deposit NFT only (no approval)
  const depositNFTOnly = useCallback(async (
    dealId: string,
    escrowAddress: string
  ) => {
    const action = async () => {
      writeContract({
        address: escrowAddress as `0x${string}`,
        abi: NFTEscrowABI,
        functionName: 'depositNFT',
        args: [BigInt(dealId)],
      })
    }

    await executeTransaction(action, 'Deposit NFT')
  }, [writeContract, executeTransaction])

  // Create Deal
  const createDeal = useCallback(async (params: CreateDealParams) => {
    const action = async () => {
      const priceInWei = params.price ? parseEther(params.price) : BigInt(0)
      
      writeContract({
        address: appConfig.contracts.dealFactory as `0x${string}`,
        abi: DealFactoryABI,
        functionName: 'createDeal',
        args: [
          params.dealType,
          params.counterparty as `0x${string}`,
          params.nftContract as `0x${string}`,
          BigInt(params.tokenId),
          priceInWei,
          (params.swapNftContract || '0x0000000000000000000000000000000000000000') as `0x${string}`,
          BigInt(params.swapTokenId || 0),
        ],
      })
    }

    await executeTransaction(action, 'Create deal')
  }, [writeContract, executeTransaction])

  // Update Deal Price
  const updateDealPrice = useCallback(async (
    dealId: string,
    escrowAddress: string,
    newPrice: string
  ) => {
    const action = async () => {
      // Convert price to wei if it's in human-readable format
      let priceInWei: bigint
      try {
        if (newPrice.includes('.') || newPrice.length <= 10) {
          // Human-readable format (e.g., "0.15")
          priceInWei = parseEther(newPrice)
        } else {
          // Already in wei format (e.g., "150000000000000000")
          priceInWei = BigInt(newPrice)
        }
      } catch (error) {
        throw new Error(`Invalid price format: ${newPrice}`)
      }

      writeContract({
        address: escrowAddress as `0x${string}`,
        abi: NFTEscrowABI,
        functionName: 'updateDealPrice',
        args: [BigInt(dealId), priceInWei],
      })
    }

    await executeTransaction(action, 'Update deal price')
  }, [writeContract, executeTransaction])

  return {
    // State
    isModalOpen,
    transactionState,
    transactionData,
    transactionError,
    
    // Actions
    acceptDeal,
    depositNFT,
    approveNFT, // NEW
    depositNFTOnly, // NEW
    checkNFTApproval, // NEW: expose for UI
    depositPayment,
    completeDeal,
    cancelDeal,
    createDeal,
    updateDealPrice,
    closeModal,
    retryTransaction,
  }
} 