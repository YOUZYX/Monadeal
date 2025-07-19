'use client'

import { useState } from 'react'
import { formatEther, parseEther } from 'viem'
import { DealWithRelations } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  Check, 
  X, 
  Clock,
  Send
} from 'lucide-react'

interface CounterOfferCardProps {
  deal: DealWithRelations
  userAddress: string
  onCounterOffer: (price: string) => Promise<void>
  onAcceptCounterOffer: () => Promise<void>
  onDeclineCounterOffer: () => Promise<void>
  isLoading?: boolean
}

export function CounterOfferCard({
  deal,
  userAddress,
  onCounterOffer,
  onAcceptCounterOffer,
  onDeclineCounterOffer,
  isLoading = false
}: CounterOfferCardProps) {
  const [counterOfferPrice, setCounterOfferPrice] = useState('')
  const [isCreatingOffer, setIsCreatingOffer] = useState(false)

  const normalizedUserAddress = userAddress.toLowerCase()
  const isNFTOwner = deal.counterpartyAddress === normalizedUserAddress
  const isBuyer = deal.creatorAddress === normalizedUserAddress
  const hasCounterOffer = deal.counterOfferPrice && deal.counterOfferStatus === 'PENDING'
  const isCounterOfferAccepted = deal.counterOfferStatus === 'ACCEPTED'

  const handleCreateCounterOffer = async () => {
    if (!counterOfferPrice || isLoading) return

    try {
      const priceInWei = parseEther(counterOfferPrice).toString()
      await onCounterOffer(priceInWei)
      setCounterOfferPrice('')
      setIsCreatingOffer(false)
    } catch (error) {
      console.error('Error creating counter offer:', error)
    }
  }

  // Show counter offer form for NFT owner when no counter offer exists
  if (isNFTOwner && !hasCounterOffer && !isCounterOfferAccepted) {
    return (
      <div className="glass-card p-6 border border-white/10 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-semibold">Counter Offer</h3>
          </div>
          <Badge variant="secondary" className="bg-orange-500/20 text-orange-500">
            Your Turn
          </Badge>
        </div>

        {!isCreatingOffer ? (
          <div className="text-center py-4">
            <p className="text-gray-400 mb-4">
              Want to propose a different price?
            </p>
            <Button 
              onClick={() => setIsCreatingOffer(true)}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Make Counter Offer
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Your Price (MON)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={counterOfferPrice}
                onChange={(e) => setCounterOfferPrice(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
            
            <div className="flex space-x-3">
              <Button
                onClick={handleCreateCounterOffer}
                disabled={!counterOfferPrice || isLoading}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Offer
              </Button>
              <Button
                onClick={() => {
                  setIsCreatingOffer(false)
                  setCounterOfferPrice('')
                }}
                variant="outline"
                className="flex-1 border-white/10 hover:bg-white/5"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Show pending counter offer for seller (read-only view)
  if (isNFTOwner && hasCounterOffer) {
    const counterOfferEther = deal.counterOfferPrice || '0'
    const originalPriceEther = deal.price ? 
      (deal.price.includes('.') ? deal.price : formatEther(BigInt(deal.price))) : '0'

    return (
      <div className="glass-card p-6 border border-orange-500/30 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-semibold">Your Counter Offer</h3>
          </div>
          <Badge variant="secondary" className="bg-orange-500/20 text-orange-500">
            <Clock className="w-3 h-3 mr-1" />
            Waiting for Response
          </Badge>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Original Offer:</span>
            <span className="font-medium">{originalPriceEther} MON</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Your Counter:</span>
            <span className="font-semibold text-orange-500 text-lg">
              {counterOfferEther} MON
            </span>
          </div>
          
          <div className="pt-2 text-center">
            <p className="text-sm text-gray-400">
              Waiting for buyer to accept or decline your counter offer
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Show pending counter offer for buyer to accept/decline
  if (isBuyer && hasCounterOffer) {
    // Handle price formatting safely - counterOfferPrice is now always in human-readable format
    const counterOfferEther = deal.counterOfferPrice || '0'
    const originalPriceEther = deal.price ? 
      (deal.price.includes('.') ? deal.price : formatEther(BigInt(deal.price))) : '0'

    return (
      <div className="glass-card p-6 border border-orange-500/30 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-semibold">Counter Offer</h3>
          </div>
          <Badge variant="secondary" className="bg-orange-500/20 text-orange-500">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Your Offer:</span>
            <span className="font-medium">{originalPriceEther} MON</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Counter Offer:</span>
            <span className="font-semibold text-orange-500 text-lg">
              {counterOfferEther} MON
            </span>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              onClick={onAcceptCounterOffer}
              disabled={isLoading}
              className="flex-1 bg-green-500 hover:bg-green-600"
            >
              <Check className="w-4 h-4 mr-2" />
              Accept
            </Button>
            <Button
              onClick={onDeclineCounterOffer}
              disabled={isLoading}
              variant="outline"
              className="flex-1 border-red-500/30 text-red-500 hover:bg-red-500/10"
            >
              <X className="w-4 h-4 mr-2" />
              Decline
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Show accepted counter offer
  if (isCounterOfferAccepted && deal.counterOfferPrice) {
    // counterOfferPrice is now stored in human-readable format
    const counterOfferEther = deal.counterOfferPrice

    return (
      <div className="glass-card p-6 border border-green-500/30 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-semibold">Counter Offer</h3>
          </div>
          <Badge variant="secondary" className="bg-green-500/20 text-green-500">
            <Check className="w-3 h-3 mr-1" />
            Accepted
          </Badge>
        </div>

        <div className="text-center py-2">
          <p className="text-gray-400 mb-2">Agreed Price</p>
          <p className="text-2xl font-bold text-green-500">
            {counterOfferEther} MON
          </p>
        </div>
      </div>
    )
  }

  // Don't show the card if user is not a participant or no counter offer is relevant
  return null
} 