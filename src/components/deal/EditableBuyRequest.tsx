'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  ShoppingCart, 
  Edit3, 
  Check, 
  X, 
  Loader2
} from 'lucide-react'

interface EditableBuyRequestProps {
  currentPrice: string
  onUpdatePrice: (newPrice: string) => Promise<void>
  isLoading?: boolean
  hasCounterOffer?: boolean
}

export function EditableBuyRequest({
  currentPrice,
  onUpdatePrice,
  isLoading = false,
  hasCounterOffer = false
}: EditableBuyRequestProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [newPrice, setNewPrice] = useState(currentPrice)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleStartEdit = () => {
    setIsEditing(true)
    setNewPrice(currentPrice)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setNewPrice(currentPrice)
  }

  const handleSaveEdit = async () => {
    if (!newPrice || newPrice === currentPrice) {
      handleCancelEdit()
      return
    }

    try {
      setIsUpdating(true)
      await onUpdatePrice(newPrice)
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating price:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="p-4 glass-card rounded-lg border border-monad-purple/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-monad-purple to-purple-500 flex items-center justify-center">
            <ShoppingCart className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-medium text-sm text-muted-foreground">Buy Request</p>
            {hasCounterOffer && (
              <Badge variant="secondary" className="bg-orange-500/20 text-orange-500 text-xs">
                Counter Offer Received
              </Badge>
            )}
          </div>
        </div>
        
        {!isEditing && hasCounterOffer && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleStartEdit}
            disabled={isLoading}
            className="border-monad-purple/30 hover:border-monad-purple/50 text-monad-purple hover:text-monad-purple"
          >
            <Edit3 className="h-3 w-3 mr-1" />
            Edit
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-2">
              Your New Offer (MON)
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              className="bg-white/5 border-white/10"
              disabled={isUpdating}
            />
          </div>
          
          <div className="flex space-x-2">
            <Button
              onClick={handleSaveEdit}
              disabled={!newPrice || isUpdating || newPrice === currentPrice}
              className="flex-1 bg-monad-purple hover:bg-monad-purple/90"
              size="sm"
            >
              {isUpdating ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Check className="h-3 w-3 mr-1" />
              )}
              Update Offer
            </Button>
            <Button
              onClick={handleCancelEdit}
              variant="outline"
              size="sm"
              disabled={isUpdating}
              className="flex-1 border-white/10 hover:bg-white/5"
            >
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <p className="font-bold text-2xl monad-gradient-text mb-1">
            {currentPrice} MON
          </p>
          {hasCounterOffer && (
            <p className="text-xs text-muted-foreground">
              Click "Edit" to update your offer
            </p>
          )}
        </div>
      )}
    </div>
  )
} 