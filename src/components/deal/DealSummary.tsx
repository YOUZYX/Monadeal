'use client'

import { useState } from 'react'
import Image from 'next/image'
import { formatEther } from 'viem'
import { StatusBadge } from './StatusBadge'
import { CounterOfferCard } from './CounterOfferCard'
import { EditableBuyRequest } from './EditableBuyRequest'
import TransactionHistory from './TransactionHistory'
import DealReactivation from './DealReactivation'
import { 
  Copy, 
  Check, 
  User, 
  Coins,
  ArrowLeftRight,
  ShoppingCart,
  Tag,
  Shield
} from 'lucide-react'
import { DealStatus, DealType } from '@prisma/client'
import { cn } from '@/lib/utils'
import { formatAddress } from '@/utils/format'
import { useAccount } from 'wagmi'
import { useAlerts } from '@/contexts/AlertContext'

interface NFTData {
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

interface User {
  address: string
  ensName?: string
  avatar?: string
  username?: string
  isOnline?: boolean
  lastSeen?: Date
}

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
  completedAt?: Date
  cancelledAt?: Date
  title?: string
  description?: string
  // Counter offer fields
  counterOfferPrice?: string
  counterOfferBy?: string
  counterOfferAt?: Date
  counterOfferStatus?: 'PENDING' | 'ACCEPTED' | 'DECLINED'
  // Additional fields for DealWithRelations compatibility
  creatorDeposited?: boolean
  counterpartyDeposited?: boolean
  swapNftContract?: string
  swapTokenId?: string
  creator: User
  counterparty?: User
  nft: NFTData
  swapNft?: NFTData
}

interface DealSummaryProps {
  deal: Deal
  onAccept?: () => void
  onApproveNFT?: () => void
  onDepositNFT?: () => void
  nftApprovalStatus?: 'unknown' | 'approved' | 'not_approved'
  checkingApproval?: boolean
  onDepositPayment?: () => void
  onCancel?: () => void
  onAcceptCounterOffer?: () => void
  onRestart?: () => void
  onReactivate?: (newPrice?: string) => Promise<void>
  loading?: boolean
  className?: string
}

const DealSummary = ({ 
  deal, 
  onAccept, 
  onApproveNFT,
  onDepositNFT,
  nftApprovalStatus,
  checkingApproval,
  onDepositPayment,
  onCancel, 
  onAcceptCounterOffer,
  onRestart,
  onReactivate,
  loading = false,
  className 
}: DealSummaryProps) => {
  const { address: userAddress } = useAccount()
  const { showSuccess, showError } = useAlerts()
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const [counterOfferLoading, setCounterOfferLoading] = useState(false)

  const isCreator = userAddress === deal.creatorAddress
  const isCounterparty = userAddress === deal.counterpartyAddress
  const isParticipant = isCreator || isCounterparty

  // Check if there's a counter offer
  const hasCounterOffer = deal.counterOfferPrice && deal.counterOfferStatus === 'PENDING'

  // Update price functionality
  const handleUpdatePrice = async (newPrice: string) => {
    if (!userAddress || counterOfferLoading) return

    try {
      setCounterOfferLoading(true)
      
      const response = await fetch(`/api/deal/${deal.id}/update-price`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newPrice: newPrice,
          senderAddress: userAddress,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update price')
      }

      showSuccess('Price Updated', 'Deal price has been updated successfully!')
      console.log('Price updated successfully:', data)
      
      // Refresh the deal data
      window.location.reload() // Temporary solution - ideally use a callback
      
    } catch (error) {
      console.error('Error updating price:', error)
      showError('Update Failed', error instanceof Error ? error.message : 'Failed to update deal price')
      throw error
    } finally {
      setCounterOfferLoading(false)
    }
  }

  // Counter offer API integration functions
  const handleCounterOffer = async (price: string) => {
    if (!userAddress || counterOfferLoading) return

    try {
      setCounterOfferLoading(true)
      
      const response = await fetch(`/api/deal/${deal.id}/counter-offer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          counterOfferPrice: price,
          senderAddress: userAddress,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create counter offer')
      }

      showSuccess('Counter Offer Sent', 'Your counter offer has been submitted successfully!')

      // Refresh the deal data or update the UI
      console.log('Counter offer created successfully:', data)
      
      // You may want to trigger a parent component refresh here
      window.location.reload() // Temporary solution - ideally use a callback
      
    } catch (error) {
      console.error('Error creating counter offer:', error)
      showError('Counter Offer Failed', error instanceof Error ? error.message : 'Failed to create counter offer')
      throw error
    } finally {
      setCounterOfferLoading(false)
    }
  }

  const handleAcceptCounterOffer = async () => {
    if (!onAcceptCounterOffer || counterOfferLoading) return

    try {
      setCounterOfferLoading(true)
      await onAcceptCounterOffer()
    } catch (error) {
      console.error('Error accepting counter offer:', error)
    } finally {
      setCounterOfferLoading(false)
    }
  }

  const handleDeclineCounterOffer = async () => {
    if (!userAddress || counterOfferLoading) return

    try {
      setCounterOfferLoading(true)
      
      const response = await fetch(`/api/deal/${deal.id}/decline-counter-offer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          senderAddress: userAddress,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to decline counter offer')
      }

      showSuccess('Counter Offer Declined', 'The counter offer has been declined successfully!')
      console.log('Counter offer declined successfully:', data)
      
      // Refresh the deal data or update the UI
      window.location.reload() // Temporary solution - ideally use a callback
      
    } catch (error) {
      console.error('Error declining counter offer:', error)
      showError('Decline Failed', error instanceof Error ? error.message : 'Failed to decline counter offer')
      throw error
    } finally {
      setCounterOfferLoading(false)
    }
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedAddress(type)
      showSuccess('Copied!', `${type} has been copied to clipboard`)
      setTimeout(() => setCopiedAddress(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
      showError('Copy Failed', 'Failed to copy to clipboard')
    }
  }

  const formatPrice = (price?: string) => {
    if (!price) return 'Not specified'
    try {
      // If the price looks like wei (very large number), convert it
      if (price.length > 10 && !price.includes('.')) {
        const ethValue = formatEther(BigInt(price))
        return `${ethValue} MON`
      }
      // Otherwise treat as normal decimal
      const monValue = parseFloat(price)
      return `${monValue} MON`
    } catch {
      return `${price} MON`
    }
  }

  const getDealTypeIcon = (type: DealType) => {
    switch (type) {
      case DealType.BUY:
        return <ShoppingCart className="h-4 w-4 text-white" />
      case DealType.SELL:
        return <Tag className="h-4 w-4 text-white" />
      case DealType.SWAP:
        return <ArrowLeftRight className="h-4 w-4 text-white" />
      default:
        return <Coins className="h-4 w-4 text-white" />
    }
  }

  const getDealTypeLabel = (type: DealType) => {
    switch (type) {
      case DealType.BUY:
        return 'Buy Request'
      case DealType.SELL:
        return 'Sell Offer'
      case DealType.SWAP:
        return 'Swap Proposal'
      default:
        return type
    }
  }

  const UserDisplay = ({ user, label, isOnline }: { user: User, label: string, isOnline?: boolean }) => (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="glass-card rounded-lg p-3 border border-border/40">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-monad-purple to-blue-500 flex items-center justify-center">
              {user.avatar ? (
                <Image src={user.avatar} alt={user.ensName || user.username || 'User'} width={40} height={40} className="rounded-full" />
              ) : (
                <User className="h-5 w-5 text-white" />
              )}
            </div>
            {isOnline && (
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-400 border-2 border-background" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user.ensName || user.username || formatAddress(user.address)}
            </p>
            <div className="flex items-center space-x-2">
              <p className="text-xs text-muted-foreground font-mono">
                {formatAddress(user.address)}
              </p>
              <button
                onClick={() => copyToClipboard(user.address, `${label}-address`)}
                className="p-0.5 rounded hover:bg-muted/20 transition-colors"
              >
                {copiedAddress === `${label}-address` ? (
                  <Check className="h-3 w-3 text-green-400" />
                ) : (
                  <Copy className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
        </div>
          </div>
        </div>
      </div>
    </div>
  )

  const NFTDisplay = ({ nft, title }: { nft: NFTData, title: string }) => (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <div className="glass-card rounded-xl overflow-hidden border border-border/40">
        <div className="aspect-square relative">
          <Image
            src={nft.image || nft.imageUrl || '/placeholder-nft.png'}
            alt={nft.name}
            fill
            className="object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = '/placeholder-nft.png'
            }}
          />
        </div>
        <div className="p-4 space-y-2">
          <h3 className="font-semibold text-lg truncate">{nft.name}</h3>
          {nft.collectionName && (
            <p className="text-sm text-muted-foreground truncate">{nft.collectionName}</p>
          )}
          {nft.floorPrice && (
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-muted-foreground">Floor:</span>
              <span className="font-medium">{nft.floorPrice} MON</span>
            </div>
          )}
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <span>{nft.contractAddress.slice(0, 6)}...{nft.contractAddress.slice(-4)}</span>
            <span>#{nft.tokenId}</span>
            <button
              onClick={() => copyToClipboard(`${nft.contractAddress}:${nft.tokenId}`, 'nft-id')}
              className="p-0.5 rounded hover:bg-muted/20 transition-colors"
            >
              {copiedAddress === 'nft-id' ? (
                <Check className="h-3 w-3 text-green-400" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Fixed container to prevent scrolling behind header */}
      <div className="glass-card rounded-xl border border-border/40 h-full overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Deal Summary</h2>
              <StatusBadge status={deal.status} size="sm" className='ml-2' />
            </div>
            
            {/* Deal Type & Price - Use EditableBuyRequest for buyers with counter offers */}
            {deal.type === DealType.BUY && isCreator && deal.price ? (
              <EditableBuyRequest
                currentPrice={formatPrice(deal.price).replace(' MON', '')}
                onUpdatePrice={handleUpdatePrice}
                isLoading={counterOfferLoading}
                hasCounterOffer={!!hasCounterOffer}
              />
            ) : (
              <div className="p-4 glass-card rounded-lg border border-monad-purple/20">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-monad-purple to-purple-500 flex items-center justify-center shadow-lg">
                    {getDealTypeIcon(deal.type)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-muted-foreground">{getDealTypeLabel(deal.type)}</p>
                    {deal.price && (
                      <p className="font-bold text-xl monad-gradient-text">{formatPrice(deal.price)}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Counter Offer Card - positioned right after Deal Type & Price */}
          <CounterOfferCard 
            deal={deal as any}
            userAddress={userAddress || ''}
            onCounterOffer={handleCounterOffer}
            onAcceptCounterOffer={handleAcceptCounterOffer}
            onDeclineCounterOffer={handleDeclineCounterOffer}
            isLoading={counterOfferLoading}
          />

          {/* NFT Display */}
          <NFTDisplay nft={deal.nft} title="NFT" />

          {/* Swap NFT Display (if it's a swap deal) */}
          {deal.type === DealType.SWAP && deal.swapNft && (
            <NFTDisplay nft={deal.swapNft} title="In Exchange For" />
          )}

          {/* Deal Participants */}
          <div className="space-y-4">
            <UserDisplay 
              user={deal.creator} 
              label={deal.type === DealType.SELL ? "Seller" : deal.type === DealType.BUY ? "Buyer" : "Creator"}
              isOnline={deal.creator.isOnline}
            />
            
            {deal.counterparty && (
              <UserDisplay 
                user={deal.counterparty} 
                label={deal.type === DealType.SELL ? "Buyer" : deal.type === DealType.BUY ? "Seller" : "Counterparty"}
                isOnline={deal.counterparty.isOnline}
              />
            )}
          </div>

          {/* Basic Deal Info */}
          <div className="space-y-3 text-sm p-4 glass-card rounded-lg border border-border/40">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{deal.createdAt.toLocaleDateString()}</span>
            </div>
            {deal.escrowContractAddress && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Escrow</span>
                <div className="flex items-center space-x-1">
                  <Shield className="h-3 w-3 text-green-400" />
                  <span className="font-mono text-xs">{formatAddress(deal.escrowContractAddress)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Transaction History */}
          <TransactionHistory 
            dealId={deal.id}
          />

          {/* Deal Reactivation */}
          <DealReactivation 
            deal={deal}
            userAddress={userAddress}
            onReactivate={onReactivate}
          />
        </div>
      </div>
    </div>
  )
}

export default DealSummary 