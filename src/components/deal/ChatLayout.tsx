'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import Image from 'next/image'
import DealSummary from '@/components/deal/DealSummary'
import ChatPanel from '@/components/deal/ChatPanel'
import StatusTimeline from '@/components/deal/StatusTimeline'
import TransactionModal from '@/components/common/TransactionModal'
import { useDealRoom, useSocket } from '@/hooks/useSocket'
import { useTransactions } from '@/hooks/useTransactions'
import { useAlerts } from '@/contexts/AlertContext'
import { useApiWithAlerts } from '@/hooks/useApiWithAlerts'
import { appConfig } from '@/lib/config'
import { DealFactoryABI } from '@/contracts/abis'
import { Button } from '@/components/ui/button'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Menu, 
  X, 
  ArrowLeft,
  AlertCircle,
  Loader2,
  Clock,
  XCircle,
  Check,
  Coins
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DealStatus, DealType } from '@prisma/client'

interface Deal {
  id: string
  type: DealType
  status: DealStatus
  createdAt: Date
  updatedAt: Date
  expiresAt?: Date
  creatorAddress: string
  counterpartyAddress?: string
  nftContractAddress: string
  nftTokenId: string
  price?: string
  escrowContractAddress?: string
  transactionHash?: string
  onchainDealId?: string
  completedAt?: Date
  cancelledAt?: Date
  title?: string
  description?: string
  // Counter offer fields
  counterOfferPrice?: string
  counterOfferBy?: string
  counterOfferAt?: Date
  counterOfferStatus?: 'PENDING' | 'ACCEPTED' | 'DECLINED'
  creator: {
    address: string
    ensName?: string
    avatar?: string
    avatarImage?: string
    username?: string
    isOnline?: boolean
    lastSeen?: Date
  }
  counterparty?: {
    address: string
    ensName?: string
    avatar?: string
    avatarImage?: string
    username?: string
    isOnline?: boolean
    lastSeen?: Date
  }
  nft: {
    contractAddress: string
    tokenId: string
    name: string
    description?: string
    image?: string
    imageUrl?: string
    collectionName?: string
    collectionSlug?: string
    floorPrice?: string
    traits?: any
  }
  swapNft?: {
    contractAddress: string
    tokenId: string
    name: string
    description?: string
    image?: string
    imageUrl?: string
    collectionName?: string
    collectionSlug?: string
    floorPrice?: string
    traits?: any
  }
  _count?: {
    messages: number
  }
}

interface ChatLayoutProps {
  dealId: string
}

const ChatLayout = ({ dealId }: ChatLayoutProps) => {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const [deal, setDeal] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  
  // Modal states
  const [timelineModalOpen, setTimelineModalOpen] = useState(false)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  // NEW: NFT approval state
  const [nftApprovalStatus, setNftApprovalStatus] = useState<'unknown' | 'approved' | 'not_approved'>('unknown')
  const [checkingApproval, setCheckingApproval] = useState(false)

  // Socket integration for real-time deal room
  const { isInRoom, roomError, joinRoom, leaveRoom } = useDealRoom(dealId)
  const { isConnected: isSocketConnected } = useSocket()
  
  // Transaction handling
  const {
    isModalOpen: isTransactionModalOpen,
    transactionState,
    transactionData,
    transactionError,
    acceptDeal: acceptDealTx,
    depositNFT: depositNFTTx,
    approveNFT: approveNFTTx, // NEW
    depositNFTOnly: depositNFTOnlyTx, // NEW
    checkNFTApproval, // NEW
    depositPayment: depositPaymentTx,
    completeDeal: completeDealTx,
    cancelDeal: cancelDealTx,
    updateDealPrice: updateDealPriceTx,
    closeModal: closeTransactionModal,
    retryTransaction
  } = useTransactions()

  // Alert system integration
  const { showSuccess, showError, showInfo, showWarning } = useAlerts()
  const { apiCall, isLoading: apiLoading } = useApiWithAlerts()

  // Helper function to get the correct escrow address from factory contract
  const getCorrectEscrowAddress = async (onchainDealId: string): Promise<string> => {
    if (!publicClient) {
      throw new Error('Public client not available')
    }

    try {
      const escrowAddress = await publicClient.readContract({
        address: appConfig.contracts.dealFactory as `0x${string}`,
        abi: DealFactoryABI,
        functionName: 'dealToEscrow',
        args: [BigInt(onchainDealId || 0)]
      })

      console.log('Correct escrow address from factory:', escrowAddress)
      return escrowAddress as string
    } catch (error) {
      console.error('Error getting escrow address from factory:', error)
      // Fallback to database address if factory call fails
      return deal?.escrowContractAddress || ''
    }
  }

  // Fetch deal data
  const fetchDeal = useCallback(async () => {
    if (!dealId) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/deal/${dealId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch deal')
      }

      // Convert date strings to Date objects
      const dealData = {
        ...data.deal,
        nftContractAddress: data.deal.nft.contractAddress,
        nftTokenId: data.deal.nft.tokenId,
        createdAt: new Date(data.deal.createdAt),
        updatedAt: new Date(data.deal.updatedAt),
        expiresAt: data.deal.expiresAt ? new Date(data.deal.expiresAt) : undefined,
        completedAt: data.deal.completedAt ? new Date(data.deal.completedAt) : undefined,
        cancelledAt: data.deal.cancelledAt ? new Date(data.deal.cancelledAt) : undefined,
        creator: {
          ...data.deal.creator,
          lastSeen: data.deal.creator.lastSeen ? new Date(data.deal.creator.lastSeen) : undefined,
        },
        counterparty: data.deal.counterparty ? {
          ...data.deal.counterparty,
          lastSeen: data.deal.counterparty.lastSeen ? new Date(data.deal.counterparty.lastSeen) : undefined,
        } : undefined,
      }

      setDeal(dealData)
    } catch (error) {
      console.error('Error fetching deal:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch deal')
    } finally {
      setLoading(false)
    }
  }, [dealId])

  // NEW: Silent fetch for background updates (no loading indicator)
  const silentFetchDeal = useCallback(async () => {
    if (!dealId) return

    try {
      const response = await fetch(`/api/deal/${dealId}`)
      const data = await response.json()

      if (!response.ok) {
        console.error('Silent fetch failed:', response.status, data.error)
        return // Don't update error state for background updates
      }

      // Convert date strings to Date objects (same as fetchDeal but without loading states)
      const dealData = {
        ...data.deal,
        nftContractAddress: data.deal.nft.contractAddress,
        nftTokenId: data.deal.nft.tokenId,
        createdAt: new Date(data.deal.createdAt),
        updatedAt: new Date(data.deal.updatedAt),
        expiresAt: data.deal.expiresAt ? new Date(data.deal.expiresAt) : undefined,
        completedAt: data.deal.completedAt ? new Date(data.deal.completedAt) : undefined,
        cancelledAt: data.deal.cancelledAt ? new Date(data.deal.cancelledAt) : undefined,
        creator: {
          ...data.deal.creator,
          lastSeen: data.deal.creator.lastSeen ? new Date(data.deal.creator.lastSeen) : undefined,
        },
        counterparty: data.deal.counterparty ? {
          ...data.deal.counterparty,
          lastSeen: data.deal.counterparty.lastSeen ? new Date(data.deal.counterparty.lastSeen) : undefined,
        } : undefined,
      }

      setDeal(dealData)
    } catch (error) {
      console.error('Silent fetch error:', error)
      // Don't update error state for background updates - just log the error
    }
  }, [dealId])

  // NEW: Function to check NFT approval status
  const checkNFTApprovalStatus = useCallback(async () => {
    if (!deal || !address || !deal.nftContractAddress || !deal.nftTokenId || !deal.onchainDealId) return

    try {
      setCheckingApproval(true)
      const escrowAddress = await getCorrectEscrowAddress(deal.onchainDealId)
      const isApproved = await checkNFTApproval(
        deal.nftContractAddress,
        deal.nftTokenId,
        escrowAddress
      )
      setNftApprovalStatus(isApproved ? 'approved' : 'not_approved')
    } catch (error) {
      console.error('Error checking NFT approval:', error)
      setNftApprovalStatus('unknown')
    } finally {
      setCheckingApproval(false)
    }
  }, [deal, address, checkNFTApproval])

  // Initial data fetch
  useEffect(() => {
    fetchDeal()
  }, [fetchDeal])

  // NEW: Real-time deal updates every 5 seconds (SILENT - no loading indicators)
  useEffect(() => {
    if (!deal) return

    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing deal data silently...')
      silentFetchDeal() // Use silent fetch instead of fetchDeal
      
      // Also check NFT approval status if user can deposit NFT
      const canDepositNFT = deal && address && 
        (deal.status === DealStatus.PENDING || deal.status === DealStatus.AWAITING_SELLER) &&
        ((deal.type === DealType.SELL && deal.creatorAddress.toLowerCase() === address.toLowerCase()) ||
         (deal.type === DealType.BUY && deal.counterpartyAddress?.toLowerCase() === address.toLowerCase()) ||
         (deal.type === DealType.SWAP && deal.creatorAddress.toLowerCase() === address.toLowerCase()))

      if (canDepositNFT) {
        checkNFTApprovalStatus()
      }
    }, 60000) // Every 60 seconds

    return () => clearInterval(interval)
  }, [deal, address, silentFetchDeal, checkNFTApprovalStatus])

  // Check NFT approval status when deal or user changes
  useEffect(() => {
    if (deal && address) {
      checkNFTApprovalStatus()
    }
  }, [deal, address, checkNFTApprovalStatus])

  // Monitor transaction state changes for deal updates
  useEffect(() => {
    const updateDealStatusAfterTransaction = async () => {
      if (transactionState === 'success' && transactionData?.hash && deal && address && publicClient) {
        console.log('🔍 Transaction detected, verifying confirmation...', transactionData.hash)
        
        try {
          // CRITICAL: Wait for transaction to be confirmed and check if it was successful
          const receipt = await publicClient.waitForTransactionReceipt({ 
            hash: transactionData.hash as `0x${string}`,
            timeout: 60000 // 60 second timeout
          })
          
          console.log('📋 Transaction receipt:', receipt)
          
          // CRITICAL: Check if transaction was actually successful
          if (receipt.status !== 'success') {
            console.log('❌ Transaction failed or reverted - not updating database')
            return
          }

          // Check if this was a cancellation transaction by looking at the current action context
          if (cancelModalOpen) {
            // Check if transaction interacted with escrow contract
            const hasEscrowLogs = receipt.logs?.some(log => 
              log.address.toLowerCase() === deal.escrowContractAddress?.toLowerCase()
            )

            if (!hasEscrowLogs) {
              console.log('❌ Cancel transaction did not interact with escrow contract')
              return
            }

            // Update deal status to CANCELLED in database and save transaction record
            const response = await fetch(`/api/deal/${deal.id}/cancel`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                transactionHash: transactionData.hash,
                userAddress: address,
              }),
            });

            if (response.ok) {
              console.log('✅ Deal cancelled and transaction saved');
              // Refresh deal data silently
              await silentFetchDeal();
              // Close modal
              setCancelModalOpen(false);
            }
            return
          }

          // For other transactions, check if they are approval transactions or escrow transactions
          const hasEscrowLogs = receipt.logs?.some(log => 
            log.address.toLowerCase() === deal.escrowContractAddress?.toLowerCase()
          )

          const hasNFTLogs = receipt.logs?.some(log => 
            log.address.toLowerCase() === deal.nftContractAddress?.toLowerCase()
          )

          // DETECT AND SAVE APPROVAL TRANSACTIONS
          if (hasNFTLogs && !hasEscrowLogs) {
            // This is likely an NFT approval transaction
            console.log('📝 Processing NFT approval transaction')
            
            try {
              const response = await fetch(`/api/deal/${deal.id}/approve-nft`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  transactionHash: transactionData.hash,
                  userAddress: address,
                  nftContractAddress: deal.nftContractAddress,
                }),
              });

              if (response.ok) {
                console.log('✅ NFT approval transaction saved');
                await silentFetchDeal();
              }
            } catch (error) {
              console.error('Error saving approval transaction:', error);
            }
            return
          }

          if (!hasEscrowLogs) {
            console.log('❌ Transaction did not interact with escrow or NFT contract')
            return
          }

          console.log('✅ Transaction confirmed and interacted with escrow contract')

          // DETECT PRICE UPDATE TRANSACTIONS
          // Check if this transaction called updateDealPrice function
          // We can detect this by checking if the deal had a counter offer that was recently accepted
          const isPriceUpdateContext = deal.counterOfferStatus === 'ACCEPTED' && 
                                      deal.counterOfferPrice && 
                                      deal.counterOfferPrice !== deal.price &&
                                      deal.escrowContractAddress

          if (isPriceUpdateContext && hasEscrowLogs) {
            // This might be a price update transaction - let's check more carefully
            // Look for DealPriceUpdated event signature: keccak256("DealPriceUpdated(uint256,uint256,uint256,address)")
            const dealPriceUpdatedTopic = '0x8a35e3a9e4c1b2b5b5e99d0e0e5e7b5c8a35e3a9e4c1b2b5b5e99d0e0e5e7b5c'
            
            const hasPriceUpdateEvent = receipt.logs?.some(log => 
              log.address.toLowerCase() === deal.escrowContractAddress!.toLowerCase() &&
              log.topics.length > 0 &&
              log.topics[0]?.toLowerCase().includes('dealpriceupdat') // Partial match for event
            )

            if (hasPriceUpdateEvent) {
              console.log('💲 Processing price update transaction')
              
              try {
                const response = await fetch(`/api/deal/${deal.id}/update-price-transaction`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    transactionHash: transactionData.hash,
                    userAddress: address,
                    newPrice: deal.counterOfferPrice,
                    escrowContractAddress: deal.escrowContractAddress,
                  }),
                });

                if (response.ok) {
                  console.log('✅ Price update transaction saved');
                  await silentFetchDeal();
                }
              } catch (error) {
                console.error('Error saving price update transaction:', error);
              }
              // Continue to process other potential transaction types
            }
          }

          // More careful transaction detection based on deal state and user role
          const isOpenDeal = !deal.counterpartyAddress || deal.counterpartyAddress === '0x0000000000000000000000000000000000000000'
          const isCreator = deal.creatorAddress.toLowerCase() === address.toLowerCase()
          
          if (deal.status === 'AWAITING_BUYER' && isCreator) {
            // This is a payment deposit transaction
            console.log('💰 Processing payment deposit transaction')
            const response = await fetch(`/api/deal/${deal.id}/deposit-payment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                transactionHash: transactionData.hash,
                userAddress: address,
              }),
            });

            if (response.ok) {
              console.log('✅ Payment deposit transaction saved');
              await silentFetchDeal();
            }
          } else if (!isOpenDeal && deal.status === 'PENDING') {
            // This is a targeted deal, so the transaction was a depositNFT
            console.log('🖼️ Processing NFT deposit transaction')
            const response = await fetch(`/api/deal/${deal.id}/deposit-nft`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                transactionHash: transactionData.hash,
                userAddress: address,
              }),
            });

            if (response.ok) {
              console.log('✅ NFT deposit transaction saved');
              await silentFetchDeal();
            }
          } else if (isOpenDeal && deal.status === 'PENDING') {
            // This is an open deal, so the transaction was an acceptDeal
            console.log('🤝 Processing deal acceptance transaction')
            const response = await fetch(`/api/deal/${deal.id}/accept`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                transactionHash: transactionData.hash,
                userAddress: address,
              }),
            });

            if (response.ok) {
              console.log('✅ Deal acceptance transaction saved');
              await silentFetchDeal();
            }
          } else if (deal.status === 'LOCKED_IN_ESCROW') {
            // This could be a completeDeal transaction
            console.log('🏁 Processing deal completion transaction')
            const response = await fetch(`/api/deal/${deal.id}/complete`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                transactionHash: transactionData.hash,
                userAddress: address,
              }),
            });

            if (response.ok) {
              console.log('✅ Deal completion transaction saved');
              await silentFetchDeal();
            }
          }
        } catch (error) {
          console.error('❌ Error verifying transaction or updating database:', error);
          // Don't update database if we can't verify the transaction was successful
        }
      }
    };

    updateDealStatusAfterTransaction();
  }, [transactionState, transactionData, deal?.id, address, cancelModalOpen, publicClient, silentFetchDeal])

  // Reset avatar error when deal changes
  useEffect(() => {
    setAvatarError(false)
  }, [deal?.id])

  // Check if user is authorized to view this deal
  const isAuthorized = deal && address && (
    deal.creatorAddress.toLowerCase() === address.toLowerCase() ||
    deal.counterpartyAddress?.toLowerCase() === address.toLowerCase()
  )

  // Check if user can cancel the deal (only counterparty/participant, not creator)
  const canCancel = deal && address && isAuthorized && 
    deal.counterpartyAddress?.toLowerCase() === address.toLowerCase() && (
    deal.status === DealStatus.PENDING || 
    deal.status === DealStatus.AWAITING_BUYER || 
    deal.status === DealStatus.AWAITING_SELLER
  )

  // Check if user can accept the deal
  const canAccept = deal && address && isAuthorized && 
    deal.status === DealStatus.PENDING && 
    deal.creatorAddress.toLowerCase() !== address.toLowerCase()

  // Check if user can deposit payment (for buyers when NFT is deposited)
  const canDepositPayment = deal && address && isAuthorized &&
    deal.status === DealStatus.AWAITING_BUYER &&
    deal.type === DealType.BUY &&
    deal.creatorAddress.toLowerCase() === address.toLowerCase() // Creator is the buyer in BUY deals

  // Check if user can complete the deal (when both deposits are done)
  const canCompleteDeal = deal && address && isAuthorized &&
    deal.status === DealStatus.LOCKED_IN_ESCROW

  // Handle deal actions
  const handleAcceptDeal = async () => {
    if (!deal || !address) return

    if (!deal.onchainDealId) {
      showError('Deal Error', 'Onchain deal ID not found')
      console.error('Onchain deal ID not found')
      return
    }

    try {
      showInfo('Accepting Deal', 'Preparing to accept the deal...')
      
      // Get the correct escrow address from factory contract
      const escrowAddress = await getCorrectEscrowAddress(deal.onchainDealId)

      console.log('Using escrow address from factory:', escrowAddress)

      // Check if this is an open deal (no counterparty) or targeted deal (has counterparty)
      const isOpenDeal = !deal.counterpartyAddress || deal.counterpartyAddress === '0x0000000000000000000000000000000000000000'
      
      if (isOpenDeal) {
        // For open deals, use acceptDeal()
        await acceptDealTx(
          deal.onchainDealId,
          escrowAddress,
          deal.price
        )
      } else {
        // For targeted deals, the counterparty accepts by depositing their NFT
        console.log('This is a targeted deal - accepting by depositing NFT')
        await depositNFTTx(
          deal.onchainDealId,
          escrowAddress,
          deal.nftContractAddress,
          deal.nftTokenId
        )
      }

      // Refresh deal data after successful transaction
      await silentFetchDeal()
    } catch (error) {
      console.error('Error accepting deal:', error)
      // Error handled by transaction modal
    }
  }

  const handleDepositPayment = async () => {
    if (!deal || !address) return

    if (!deal.onchainDealId) {
      showError('Deal Error', 'Onchain deal ID not found')
      console.error('Onchain deal ID not found')
      return
    }

    if (!deal.price) {
      showError('Payment Error', 'Deal price not found')
      console.error('Deal price not found')
      return
    }

    try {
      // Use the correct price: accepted counter offer price or original price
      const paymentAmount = deal.counterOfferStatus === 'ACCEPTED' && deal.counterOfferPrice 
        ? deal.counterOfferPrice  // Use counter offer price if accepted
        : deal.price             // Use original price otherwise

      console.log('Payment amount:', paymentAmount, 'Original price:', deal.price, 'Counter offer:', deal.counterOfferPrice, 'Status:', deal.counterOfferStatus)

      showInfo('Depositing Payment', `Preparing to deposit ${paymentAmount} ETH...`)

      // Use smart contract transaction to deposit payment
      const escrowAddress = await getCorrectEscrowAddress(deal.onchainDealId)
      await depositPaymentTx(
        deal.onchainDealId,
        escrowAddress,
        paymentAmount
      )

      // Refresh deal data after successful transaction
      await silentFetchDeal()
    } catch (error) {
      console.error('Error depositing payment:', error)
      showError('Payment Failed', error instanceof Error ? error.message : 'Failed to deposit payment')
    }
  }

  const handleCompleteDeal = async () => {
    if (!deal || !address) return

    if (!deal.onchainDealId) {
      showError('Deal Error', 'Onchain deal ID not found')
      console.error('Onchain deal ID not found')
      return
    }

    try {
      showInfo('Completing Deal', 'Finalizing the NFT deal on blockchain...')
      
      // Use smart contract transaction to complete the deal
      const escrowAddress = await getCorrectEscrowAddress(deal.onchainDealId)
      await completeDealTx(
        deal.onchainDealId,
        escrowAddress
      )

      // Refresh deal data after successful transaction
      await silentFetchDeal()
    } catch (error) {
      console.error('Error completing deal:', error)
      showError('Deal Completion Failed', error instanceof Error ? error.message : 'Failed to complete deal')
    }
  }

  const handleAcceptCounterOffer = async () => {
    if (!deal || !address || !deal.counterOfferPrice) return

    try {
      showInfo('Accepting Counter Offer', `Accepting counter offer of ${deal.counterOfferPrice} ETH...`)
      
      // First, update the database
      const response = await apiCall(`/api/deal/${deal.id}/accept-counter-offer`, {
        method: 'POST',
        body: JSON.stringify({
          senderAddress: address,
        }),
      }, {
        successTitle: 'Counter Offer Accepted',
        errorTitle: 'Accept Counter Offer Failed',
        showSuccessAlert: false // We'll show custom alert after blockchain update
      })

      if (!response) {
        throw new Error('Failed to accept counter offer in database')
      }

      console.log('Counter offer accepted in database:', response)

      // If deal has an onchain ID, update the smart contract price
      if (deal.onchainDealId) {
        showInfo('Updating Price', 'Updating deal price on blockchain...')
        const escrowAddress = await getCorrectEscrowAddress(deal.onchainDealId)
        await updateDealPriceTx(
          deal.onchainDealId,
          escrowAddress,
          deal.counterOfferPrice
        )
        console.log('Smart contract price updated to:', deal.counterOfferPrice)
      }

      showSuccess('Counter Offer Accepted', `Deal price updated to ${deal.counterOfferPrice} ETH`)
      
      // Refresh deal data
      await silentFetchDeal()
    } catch (error) {
      console.error('Error accepting counter offer:', error)
      showError('Accept Counter Offer Failed', error instanceof Error ? error.message : 'Failed to accept counter offer')
      throw error
    }
  }

  const handleCancelDeal = async () => {
    if (!deal || !address) return

    if (!deal.onchainDealId) {
      showError('Deal Error', 'Onchain deal ID not found')
      console.error('Onchain deal ID not found')
      return
    }

    try {
      showWarning('Canceling Deal', 'Preparing to cancel the deal. Any deposits will be refunded...')
      
      // Use smart contract transaction
      const escrowAddress = await getCorrectEscrowAddress(deal.onchainDealId)
      await cancelDealTx(
        deal.onchainDealId,
        escrowAddress
      )

      // Note: Modal closing and deal status update will be handled by useEffect
      // when transaction succeeds
    } catch (error) {
      console.error('Error canceling deal:', error)
      showError('Cancellation Failed', error instanceof Error ? error.message : 'Failed to cancel deal')
    }
  }

  // NEW: Handle NFT Approval
  const handleApproveNFT = async () => {
    if (!deal || !address || !deal.nftContractAddress || !deal.nftTokenId || !deal.onchainDealId) return

    try {
      const escrowAddress = await getCorrectEscrowAddress(deal.onchainDealId)
      await approveNFTTx(
        deal.nftContractAddress,
        deal.nftTokenId,
        escrowAddress
      )

      // Check approval status after transaction
      await checkNFTApprovalStatus()
    } catch (error) {
      console.error('Error approving NFT:', error)
      // Error handled by transaction modal
    }
  }

  // NEW: Handle NFT Deposit (only deposit, no approval)
  const handleDepositNFTOnly = async () => {
    if (!deal || !address || !deal.onchainDealId) return

    try {
      const escrowAddress = await getCorrectEscrowAddress(deal.onchainDealId)
      await depositNFTOnlyTx(
        deal.onchainDealId,
        escrowAddress
      )

      // Refresh deal data after successful transaction
      await silentFetchDeal()
    } catch (error) {
      console.error('Error depositing NFT:', error)
      // Error handled by transaction modal
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-monad-purple" />
          <p className="text-muted-foreground">Loading deal...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !deal) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="h-12 w-12 mx-auto text-red-400" />
          <h3 className="text-lg font-semibold">Failed to load deal</h3>
          <p className="text-muted-foreground">{error || 'Deal not found'}</p>
          <Button onClick={fetchDeal} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // Unauthorized state
  if (!isConnected || !isAuthorized) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="h-12 w-12 mx-auto text-yellow-400" />
          <h3 className="text-lg font-semibold">Access Restricted</h3>
          <p className="text-muted-foreground">
            {!isConnected 
              ? 'Please connect your wallet to view this deal.' 
              : 'You are not authorized to view this deal.'
            }
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row max-w-7xl mx-auto gap-0 lg:gap-6 relative">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 glass-card border-b border-border/40 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center space-x-2">
            <h1 className="font-semibold truncate">{deal?.nft.name}</h1>
            {deal && (
              <span className="text-xs text-muted-foreground">
                with {(() => {
                  const otherUser = deal.creatorAddress.toLowerCase() === address?.toLowerCase() 
                    ? deal.counterparty 
                    : deal.creator;
                  return otherUser?.ensName || otherUser?.username || 
                         `${otherUser?.address?.slice(0, 6)}...${otherUser?.address?.slice(-4)}`;
                })()}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Timeline Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTimelineModalOpen(true)}
          >
            <Clock className="h-4 w-4" />
          </Button>
          
          {/* Cancel Button */}
          {canCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCancelModalOpen(true)}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Deal Summary Sidebar */}
      <div className={cn(
        "lg:w-1/3 lg:border-r lg:border-border/40 lg:relative",
        "fixed lg:static inset-y-0 left-0 z-40 w-80 lg:w-auto",
        "transform transition-transform duration-300 ease-in-out lg:transform-none",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Mobile Overlay Background */}
        {sidebarOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar Content */}
        <div className="relative h-full glass-nav lg:glass-transparent p-4 lg:p-6 z-50">
          {deal && (
            <DealSummary 
              deal={deal}
              onAccept={handleAcceptDeal}
              onApproveNFT={handleApproveNFT}
              onDepositNFT={handleDepositNFTOnly}
              nftApprovalStatus={nftApprovalStatus}
              checkingApproval={checkingApproval}
              onDepositPayment={handleDepositPayment}
              onCancel={handleCancelDeal}
              onAcceptCounterOffer={handleAcceptCounterOffer}
              onRestart={() => {}}
              loading={transactionState === 'pending' || transactionState === 'confirming'}
              className="h-full"
            />
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <div className="flex-1 flex flex-col lg:w-2/3 min-h-0 h-full">
        {/* Desktop Connection Status & Actions */}
        <div className="hidden lg:flex items-center justify-between p-3 glass-card border-b border-border/40 bg-background/50 backdrop-blur-sm z-30 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <h2 className="font-medium">Chat</h2>
            {/*{deal?._count?.messages && (
              <span className="text-xs text-muted-foreground">
                {deal._count.messages} messages
              </span>
            )}*/}
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Accept Button */}
            {canAccept && (
              <Button
                size="sm"
                onClick={() => {
                  // For open deals (no counterparty), always use accept deal
                  if (!deal.counterpartyAddress || deal.counterpartyAddress === '0x0000000000000000000000000000000000000000') {
                    handleAcceptDeal()
                  } else {
                    // For targeted deals, check approval status
                    if (nftApprovalStatus === 'not_approved') {
                      handleApproveNFT()
                    } else if (nftApprovalStatus === 'approved') {
                      handleDepositNFTOnly()
                    } else {
                      // Fallback to original behavior if approval status unknown
                      handleAcceptDeal()
                    }
                  }
                }}
                disabled={transactionState === 'pending' || transactionState === 'confirming' || checkingApproval}
                className="btn-monad"
              >
                {(transactionState === 'pending' || transactionState === 'confirming') ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : checkingApproval ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Check className="h-3 w-3 mr-1" />
                )}
                {/* Show different text based on whether it's an open deal or targeted deal and approval status */}
                {deal && (!deal.counterpartyAddress || deal.counterpartyAddress === '0x0000000000000000000000000000000000000000') 
                  ? 'Accept' 
                  : checkingApproval
                    ? 'Checking...'
                    : nftApprovalStatus === 'not_approved'
                      ? 'Approve Deal'
                      : nftApprovalStatus === 'approved'
                        ? 'Deposit NFT'
                        : 'Deposit NFT' // Fallback
                }
              </Button>
            )}

            {/* Deposit Payment Button */}
            {canDepositPayment && (
              <Button
                size="sm"
                onClick={handleDepositPayment}
                disabled={transactionState === 'pending' || transactionState === 'confirming'}
                className="btn-monad"
              >
                {(transactionState === 'pending' || transactionState === 'confirming') ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Coins className="h-3 w-3 mr-1" />
                )}
                Deposit Payment ({deal?.counterOfferStatus === 'ACCEPTED' && deal?.counterOfferPrice 
                  ? deal.counterOfferPrice 
                  : deal?.price} MON)
              </Button>
            )}

            {/* Complete Deal Button */}
            {canCompleteDeal && (
              <Button
                size="sm"
                onClick={handleCompleteDeal}
                disabled={transactionState === 'pending' || transactionState === 'confirming'}
                className="btn-monad bg-green-600 hover:bg-green-700"
              >
                {(transactionState === 'pending' || transactionState === 'confirming') ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Check className="h-3 w-3 mr-1" />
                )}
                Complete Deal
              </Button>
            )}
            
            {/* Timeline Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTimelineModalOpen(true)}
              className="glass-card border-border/40 hover:border-monad-purple/50"
            >
              <Clock className="h-4 w-4" />
            </Button>
            
            {/* Cancel Button */}
            {canCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelModalOpen(true)}
                className="glass-card border-red-500/40 hover:border-red-500/70 text-red-400 hover:text-red-300"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            )}
            
            {/* Chat Partner Info */}
            {deal && (
              <div className="flex items-center space-x-2 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center overflow-hidden">
                    {(() => {
                      const otherUser = deal.creatorAddress.toLowerCase() === address?.toLowerCase() 
                        ? deal.counterparty 
                        : deal.creator;
                      const avatar = otherUser?.avatarImage || otherUser?.avatar; // Prioritize avatarImage over avatar
                      const name = otherUser?.ensName || otherUser?.username;
                      
                      if (avatar && !avatarError) {
                        return (
                          <Image 
                            src={avatar} 
                            alt={name || 'User'} 
                            width={24}
                            height={24}
                            className="h-6 w-6 rounded-full object-cover"
                            onError={() => setAvatarError(true)}
                          />
                        );
                      } else {
                        return (
                          <span className="text-xs text-white font-medium">
                            {name ? name.charAt(0).toUpperCase() : '?'}
                          </span>
                        );
                      }
                    })()}
                  </div>
                  <span className="text-muted-foreground">
                    {(() => {
                      const otherUser = deal.creatorAddress.toLowerCase() === address?.toLowerCase() 
                        ? deal.counterparty 
                        : deal.creator;
                      return otherUser?.ensName || otherUser?.username || 
                             `${otherUser?.address?.slice(0, 6)}...${otherUser?.address?.slice(-4)}`;
                    })()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Panel */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {deal && (
            <ChatPanel 
              dealId={dealId} 
              deal={deal}
              onSidebarToggle={() => setSidebarOpen(false)}
            />
          )}
        </div>
      </div>

      {/* Timeline Modal */}
      <Dialog open={timelineModalOpen} onOpenChange={setTimelineModalOpen}>
        <DialogContent className="sm:max-w-md glass-card border-border/40">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-monad-purple" />
              <span>Deal Progress</span>
            </DialogTitle>
            <DialogDescription>
              Track the current status and progress of your deal
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {deal && <StatusTimeline currentStatus={deal.status} />}
            
            {/* Deal Details */}
            {deal && (
              <div className="space-y-3 text-sm mt-6 p-4 glass-card rounded-lg border border-border/40">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{deal.createdAt.toLocaleDateString()}</span>
                </div>
                {deal.expiresAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Expires</span>
                    <span>{new Date(deal.expiresAt).toLocaleDateString()}</span>
                  </div>
                )}
                {deal.completedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Completed</span>
                    <span>{new Date(deal.completedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Modal */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="sm:max-w-md glass-card border-border/40">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-red-400">
              <XCircle className="h-5 w-5" />
              <span>Cancel Deal</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this deal? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {deal && (
            <div className="py-4">
              <div className="p-4 glass-card rounded-lg border border-red-500/20 bg-red-500/5">
                <h4 className="font-medium text-sm mb-2">{deal.nft.name}</h4>
                <p className="text-xs text-muted-foreground">
                  {deal.type} offer for {deal.counterOfferStatus === 'ACCEPTED' && deal.counterOfferPrice 
                    ? deal.counterOfferPrice 
                    : deal.price} MON
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter className="space-x-2">
            <Button
              variant="outline"
              onClick={() => setCancelModalOpen(false)}
              disabled={transactionState === 'pending' || transactionState === 'confirming'}
            >
              Keep Deal
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelDeal}
              disabled={transactionState === 'pending' || transactionState === 'confirming'}
            >
              {(transactionState === 'pending' || transactionState === 'confirming') ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Cancel Deal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={closeTransactionModal}
        state={transactionState}
        transactionData={transactionData}
        error={transactionError}
        onRetry={retryTransaction}
        onSuccess={() => {
          // Refresh deal data after successful transaction
          fetchDeal()
        }}
      />
    </div>
  )
}

export default ChatLayout 