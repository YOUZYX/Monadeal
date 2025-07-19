'use client'

import { useState } from 'react'
import { 
  RotateCcw, 
  Plus, 
  Edit3,
  CheckCircle,
  Loader2,
  AlertTriangle,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { DealStatus, DealType } from '@prisma/client'

interface DealReactivationProps {
  deal: {
    id: string
    type: DealType
    status: DealStatus
    price?: string
    creatorAddress: string
    counterpartyAddress?: string
    nft: {
      name: string
      collectionName?: string
    }
  }
  userAddress?: string
  onReactivate?: (newPrice?: string) => Promise<void>
  className?: string
}

const DealReactivation = ({ 
  deal, 
  userAddress,
  onReactivate,
  className 
}: DealReactivationProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [newPrice, setNewPrice] = useState(deal.price || '')
  const [keepSameTerms, setKeepSameTerms] = useState(true)
  const [success, setSuccess] = useState(false)

  const isCreator = userAddress === deal.creatorAddress
  const canReactivate = deal.status === DealStatus.CANCELLED && isCreator

  const handleReactivation = async () => {
    if (!onReactivate) return

    setIsLoading(true)
    try {
      const priceToUse = keepSameTerms ? deal.price : newPrice
      await onReactivate(priceToUse)
      setSuccess(true)
      
      // Show success for 2 seconds then close
      setTimeout(() => {
        setSuccess(false)
        setIsOpen(false)
        // Reset form
        setKeepSameTerms(true)
        setNewPrice(deal.price || '')
      }, 2000)
    } catch (error) {
      console.error('Error reactivating deal:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Don't show component if deal can't be reactivated
  if (!canReactivate) {
    return null
  }

  const getDealTypeLabel = () => {
    switch (deal.type) {
      case DealType.BUY:
        return 'buy request'
      case DealType.SELL:
        return 'sell offer'
      case DealType.SWAP:
        return 'swap proposal'
      default:
        return 'deal'
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full glass-card border-border/40 hover:border-monad-purple/50 transition-all duration-200"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reactivate Deal
          </Button>
        </DialogTrigger>
        
        <DialogContent className="glass-card border-border/40 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <RotateCcw className="h-5 w-5 text-monad-purple" />
              <span>Reactivate Deal</span>
            </DialogTitle>
          </DialogHeader>
          
          {success ? (
            <div className="space-y-4 text-center py-8">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-400">Deal Reactivated!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your {getDealTypeLabel()} for {deal.nft.name} is now active again.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {/* Deal Info */}
              <div className="glass-card p-4 rounded-lg border border-border/40">
                <h3 className="font-medium text-sm mb-2">Deal Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">NFT:</span>
                    <span>{deal.nft.name}</span>
                  </div>
                  {deal.nft.collectionName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Collection:</span>
                      <span>{deal.nft.collectionName}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="capitalize">{getDealTypeLabel()}</span>
                  </div>
                </div>
              </div>

              {/* Price Options */}
              {deal.type !== DealType.SWAP && (
                <div className="space-y-4">
                  <h3 className="font-medium text-sm">Reactivation Options</h3>
                  
                  {/* Keep Same Terms */}
                  <div 
                    className={cn(
                      "p-3 rounded-lg border-2 cursor-pointer transition-all duration-200",
                      keepSameTerms 
                        ? "border-monad-purple bg-monad-purple/10" 
                        : "border-border/40 glass-card hover:border-monad-purple/30"
                    )}
                    onClick={() => setKeepSameTerms(true)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2 transition-all duration-200",
                        keepSameTerms 
                          ? "border-monad-purple bg-monad-purple" 
                          : "border-border"
                      )}>
                        {keepSameTerms && (
                          <div className="w-full h-full rounded-full bg-white scale-50" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">Keep same terms</p>
                        <p className="text-xs text-muted-foreground">
                          Price: {deal.price ? `${deal.price} MON` : 'Not specified'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Update Terms */}
                  <div 
                    className={cn(
                      "p-3 rounded-lg border-2 cursor-pointer transition-all duration-200",
                      !keepSameTerms 
                        ? "border-monad-purple bg-monad-purple/10" 
                        : "border-border/40 glass-card hover:border-monad-purple/30"
                    )}
                    onClick={() => setKeepSameTerms(false)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2 transition-all duration-200",
                        !keepSameTerms 
                          ? "border-monad-purple bg-monad-purple" 
                          : "border-border"
                      )}>
                        {!keepSameTerms && (
                          <div className="w-full h-full rounded-full bg-white scale-50" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">Update terms</p>
                        <p className="text-xs text-muted-foreground">
                          Change the price or other conditions
                        </p>
                      </div>
                      <Edit3 className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  {/* New Price Input */}
                  {!keepSameTerms && (
                    <div className="space-y-2 ml-7">
                      <label className="text-sm font-medium">New Price (MON)</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Enter new price..."
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        className="glass-card border-border/40 focus:border-monad-purple"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Warning */}
              <div className="flex items-start space-x-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-400">Important</p>
                  <p className="text-muted-foreground mt-1">
                    Reactivating this deal will make it visible again and allow the counterparty to accept it.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 glass-card border-border/40"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                
                <Button
                  size="sm"
                  onClick={handleReactivation}
                  disabled={isLoading || (!keepSameTerms && !newPrice)}
                  className="flex-1 btn-monad"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  {isLoading ? 'Reactivating...' : 'Reactivate'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DealReactivation 