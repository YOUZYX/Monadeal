'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import DealCard from "@/components/deal/DealCard"
import { Skeleton } from "@/components/ui/skeleton"
import { Wallet, Search, Plus, AlertCircle } from "lucide-react"
import Link from "next/link"
import { DealStatus } from "@prisma/client"

// Enhanced Deal interface matching the database structure
interface Deal {
  id: string
  type: 'BUY' | 'SELL' | 'SWAP'
  status: DealStatus
  price?: string
  createdAt: string
  updatedAt: string
  title?: string
  creator: {
    address: string
    ensName?: string
    username?: string
  }
  counterparty?: {
    address: string
    ensName?: string
    username?: string
  }
  nft: {
    contractAddress: string
    tokenId: string
    name: string
    image?: string
    collectionName?: string
  }
  swapNft?: {
    contractAddress: string
    tokenId: string
    name: string
    image?: string
    collectionName?: string
  }
  _count: {
    messages: number
  }
}

export default function DealsPage() {
  const { address, isConnected } = useAccount()
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  // Fetch user's deals - optimized for faster loading
  const fetchDeals = async () => {
    if (!address) {
      console.log('No address available for fetching deals')
      return
    }

    // Validate address format before making API call
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/
    if (!ethAddressRegex.test(address)) {
      console.error('Invalid Ethereum address format:', address)
      setError(`Invalid wallet address format: ${address}`)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      console.log('Fetching deals for address:', address)
      
      // Add timeout and optimized fetch options
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 second timeout
      
      const response = await fetch(`/api/deals/user/${address}?limit=50`, {
        signal: controller.signal,
        // Add performance optimizations
        cache: 'no-store', // Fresh data for deals
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      clearTimeout(timeoutId)
      const data = await response.json()
      
      console.log('API Response:', { status: response.status, data })
      
      if (!response.ok) {
        console.error('API Error Details:', data)
        throw new Error(data.error || 'Failed to fetch deals')
      }
      
      if (data.success) {
        console.log('Successfully fetched deals:', data.deals?.length || 0)
        setDeals(data.deals || [])
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.warn('Deals request timed out')
        setError('Request timed out. Please try again.')
      } else {
        console.error('Error fetching deals:', err)
        setError(err instanceof Error ? err.message : 'Failed to load deals')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isConnected && address) {
      // Add small delay to prevent blocking navigation
      const timer = setTimeout(() => {
        fetchDeals()
      }, 50) // Very small delay to let navigation complete first
      
      return () => clearTimeout(timer)
    } else {
      setLoading(false)
    }
  }, [isConnected, address])

  // Filter deals based on search and status
  const filteredDeals = deals.filter(deal => {
    const matchesSearch = !searchQuery || 
      deal.nft.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.nft.collectionName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.title?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesTab = activeTab === 'all' || 
      (activeTab === 'ongoing' && ['PENDING', 'AWAITING_BUYER', 'AWAITING_SELLER', 'LOCKED_IN_ESCROW'].includes(deal.status)) ||
      (activeTab === 'completed' && deal.status === 'COMPLETED') ||
      (activeTab === 'cancelled' && deal.status === 'CANCELLED')
    
    return matchesSearch && matchesTab
  })

  // Group deals by status for tab counts
  const ongoingDeals = deals.filter(d => ['PENDING', 'AWAITING_BUYER', 'AWAITING_SELLER', 'LOCKED_IN_ESCROW'].includes(d.status))
  const completedDeals = deals.filter(d => d.status === 'COMPLETED')
  const cancelledDeals = deals.filter(d => d.status === 'CANCELLED')

  // Adapter function to convert database Deal to DealCard format
  const adaptDealForCard = (deal: Deal) => ({
    id: deal.id,
    nftName: deal.nft.name,
    price: deal.price ? `${deal.price} MON` : deal.type === 'SWAP' ? 'Swap Deal' : 'Price TBD',
    status: deal.status, // Pass through the original Prisma enum value for StatusBadge
    type: deal.type,
    nftImage: deal.nft.image,
    collectionName: deal.nft.collectionName,
    createdAt: deal.createdAt,
    messageCount: deal._count.messages
  })

  // Wallet not connected state
  if (!isConnected) {
    return (
      <div className="container mx-auto p-4">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-monad-purple/10 flex items-center justify-center">
              <Wallet className="w-10 h-10 text-monad-purple" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
              <p className="text-muted-foreground mb-6">
                Connect your wallet to view and manage your NFT deals
              </p>
                             <Button className="btn-monad">
                 Connect Wallet
               </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">My Deals</h1>
                       <Skeleton className="h-10 w-32" />
           </div>
           <Skeleton className="h-10 w-1/3" />
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {[...Array(6)].map((_, i) => (
               <Skeleton key={i} className="h-48 rounded-xl" />
             ))}
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Failed to Load Deals</h2>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button onClick={fetchDeals} className="btn-monad">
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Fixed Header */}
      <div className="border-b border-border/40 top-0 z-10">
        <div className="container mx-auto p-4">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h1 className="text-3xl font-bold">
                <span className="monad-gradient-text">My Deals</span>
              </h1>
              <Link href="/create">
                <Button className="btn-monad">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Deal
                </Button>
              </Link>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by NFT name or collection..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 glass-card border-border/40 focus:border-monad-purple"
                />
              </div>

              {deals.length > 0 && (
                <div className="text-sm text-muted-foreground flex items-center">
                  {filteredDeals.length} of {deals.length} deals
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-hidden">
        <div className="container mx-auto p-4 h-full">
          {/* Deals Content */}
          {deals.length === 0 ? (
          // Empty state - no deals created yet
          <div className="min-h-[40vh] flex items-center justify-center">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-monad-purple/10 flex items-center justify-center">
                <Plus className="w-10 h-10 text-monad-purple" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">No Deals Yet</h2>
                <p className="text-muted-foreground mb-6">
                  Create your first NFT deal to get started with secure P2P trading
                </p>
                <Link href="/create">
                  <Button className="btn-monad">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Deal
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          // Deals tabs with scrollable content
          <div className="h-full flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="glass-card border-border/40 flex-shrink-0">
                <TabsTrigger value="all" className="data-[state=active]:bg-monad-purple data-[state=active]:text-white">
                  All ({deals.length})
                </TabsTrigger>
                <TabsTrigger value="ongoing" className="data-[state=active]:bg-monad-purple data-[state=active]:text-white">
                  Ongoing ({ongoingDeals.length})
                </TabsTrigger>
                <TabsTrigger value="completed" className="data-[state=active]:bg-monad-purple data-[state=active]:text-white">
                  Completed ({completedDeals.length})
                </TabsTrigger>
                <TabsTrigger value="cancelled" className="data-[state=active]:bg-monad-purple data-[state=active]:text-white">
                  Cancelled ({cancelledDeals.length})
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto mt-6">
                <TabsContent value="all" className="mt-0">
                  {filteredDeals.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">No deals match your search criteria</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredDeals.map(deal => (
                        <DealCard key={deal.id} deal={adaptDealForCard(deal)} />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="ongoing" className="mt-0">
                  {filteredDeals.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">No ongoing deals found</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredDeals.map(deal => (
                        <DealCard key={deal.id} deal={adaptDealForCard(deal)} />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="completed" className="mt-0">
                  {filteredDeals.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">No completed deals found</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredDeals.map(deal => (
                        <DealCard key={deal.id} deal={adaptDealForCard(deal)} />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="cancelled" className="mt-0">
                  {filteredDeals.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">No cancelled deals found</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredDeals.map(deal => (
                        <DealCard key={deal.id} deal={adaptDealForCard(deal)} />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        )}
        </div>
      </div>
    </div>
  )
} 