'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useAlerts } from '@/contexts/AlertContext'
import { useApiWithAlerts } from '@/hooks/useApiWithAlerts'
import { 
  Search,
  Users,
  Wallet,
  ImageIcon,
  ExternalLink,
  ArrowLeft,
  AlertCircle,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface SearchResults {
  searchType: 'contract' | 'wallet'
  query: string
  results: {
    type: 'collection_holders' | 'account_nfts'
    holders?: Array<{
      ownerAddress: string
      balance: number
      tokenIds?: string[]
    }>
    nfts?: Array<{
      contractAddress: string
      tokenId: string
      name?: string
      description?: string
      image?: string
      collection?: {
        name?: string
        contractAddress: string
      }
    }>
  }
  pagination: {
    currentPage: number
    pageSize: number
    totalCount: number
    totalPages: number
    hasMore: boolean
  }
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { showError, showInfo, showSuccess } = useAlerts()
  const { apiCall } = useApiWithAlerts()
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  // Search function
  const performSearch = async (query: string, page: number = 1, appendResults: boolean = false) => {
    if (!query.trim()) return

    try {
      if (appendResults) {
        setLoadingMore(true)
      } else {
        setLoading(true)
        setError(null)
        setResults(null)
        showInfo('Searching', `Looking for NFTs and wallets for "${query.trim()}"...`)
      }
      
      const data = await apiCall(`/api/search?query=${encodeURIComponent(query.trim())}&pageIndex=${page}&pageSize=50`, {}, {
        successTitle: 'Search Complete',
        errorTitle: 'Search Failed',
        showSuccessAlert: false // We'll show custom success message
      }) as SearchResults & { error?: string } | null
      
      if (!data) {
        throw new Error('Search failed')
      }
      
      if (data.results) {
        if (appendResults && results) {
          // Append new results to existing ones
          const updatedResults = { ...data }
          if (data.results.type === 'collection_holders' && results.results.type === 'collection_holders') {
            updatedResults.results.holders = [
              ...(results.results.holders || []), 
              ...(data.results.holders || [])
            ]
          } else if (data.results.type === 'account_nfts' && results.results.type === 'account_nfts') {
            updatedResults.results.nfts = [
              ...(results.results.nfts || []), 
              ...(data.results.nfts || [])
            ]
          }
          setResults(updatedResults)
        } else {
          setResults(data)
          // Show success message for new searches
          const resultCount = data.results.type === 'collection_holders' 
            ? data.results.holders?.length || 0
            : data.results.nfts?.length || 0
          showSuccess('Search Complete', `Found ${resultCount} results for "${query.trim()}"`)
        }
        setCurrentPage(page)
        setHasMore(data.pagination.hasMore)
      } else {
        throw new Error(data.error || 'No results found')
      }
    } catch (err) {
      console.error('Search error:', err)
      if (!appendResults) {
        setError(err instanceof Error ? err.message : 'Search failed')
        setResults(null)
        setHasMore(false)
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Update URL
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.set('q', searchQuery.trim())
      router.push(newUrl.pathname + newUrl.search)
      
      setCurrentPage(1)
      setHasMore(false)
      performSearch(searchQuery.trim(), 1, false)
    }
  }

  // Handle loading more results
  const handleLoadMore = () => {
    if (searchQuery.trim() && !loadingMore && hasMore) {
      performSearch(searchQuery.trim(), currentPage + 1, true)
    }
  }

  // Handle pagination (for collection holders where we want page navigation)
  const handlePageChange = (page: number) => {
    if (searchQuery.trim()) {
      performSearch(searchQuery.trim(), page, false)
    }
  }

  // Copy address to clipboard
  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address)
      setCopiedAddress(address)
      setTimeout(() => setCopiedAddress(null), 2000)
      showSuccess('Address Copied', `Wallet address copied to clipboard!`)
    } catch (err) {
      console.error('Failed to copy address:', err)
      showError('Copy Failed', 'Failed to copy address to clipboard')
    }
  }

  // Helper function to truncate long values
  const truncateValue = (value: string, maxLength: number = 10): string => {
    if (!value) return ''
    return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value
  }

  // Initial search from URL params
  useEffect(() => {
    const queryFromUrl = searchParams.get('q')
    if (queryFromUrl && queryFromUrl !== searchQuery) {
      setSearchQuery(queryFromUrl)
      setCurrentPage(1)
      setHasMore(false)
      performSearch(queryFromUrl, 1, false)
    }
  }, [searchParams])

  return (
    <div className="flex flex-col h-screen">
      {/* Fixed Header */}
      <div className="bg-background border-b border-border/40 sticky top-0 z-10">
        <div className="container mx-auto p-4">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="glass-card hover:monad-glow-hover">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">
                  <span className="monad-gradient-text">NFT Search</span>
                </h1>
                <p className="text-muted-foreground text-sm">
                  Search by contract address or wallet address
                </p>
              </div>
            </div>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1 max-w-2xl">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Enter contract address (0x...) or wallet address (0x...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 glass-card border-border/40 focus:border-monad-purple"
                />
              </div>
              <Button type="submit" className="btn-monad" disabled={loading}>
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Search
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-hidden">
        <div className="container mx-auto p-4 h-full overflow-y-auto">
          {/* Loading State */}
          {loading && (
            <div className="space-y-4 mt-6">
              <Skeleton className="h-8 w-64 bg-muted/20" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-xl bg-muted/20" />
                ))}
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="mt-6">
              <div className={cn(
                "glass-card rounded-xl p-6 border",
                error.includes('rate limit') || error.includes('Rate limit')
                  ? "border-yellow-500/20 bg-yellow-500/5"
                  : "border-red-500/20 bg-red-500/5"
              )}>
                <div className="flex items-center gap-3">
                  <AlertCircle className={cn(
                    "w-5 h-5",
                    error.includes('rate limit') || error.includes('Rate limit')
                      ? "text-yellow-500"
                      : "text-red-500"
                  )} />
                  <div>
                    <h3 className={cn(
                      "font-semibold",
                      error.includes('rate limit') || error.includes('Rate limit')
                        ? "text-yellow-500"
                        : "text-red-500"
                    )}>
                      {error.includes('rate limit') || error.includes('Rate limit')
                        ? 'Rate Limit Exceeded'
                        : 'Search Error'
                      }
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">{error}</p>
                    {(error.includes('rate limit') || error.includes('Rate limit')) && (
                      <p className="text-xs text-muted-foreground mt-2">
                        💡 Try searching again in a few seconds, or specify the search type (contract/wallet) to reduce API calls.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {results && !loading && !error && (
            <div className="mt-6 space-y-6">
              {/* Results Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className="bg-monad-purple text-white">
                    {results.searchType === 'contract' ? (
                      <>
                        <Users className="w-3 h-3 mr-1" />
                        Collection Holders
                      </>
                    ) : (
                      <>
                        <Wallet className="w-3 h-3 mr-1" />
                        Wallet NFTs
                      </>
                    )}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {results.results.type === 'account_nfts' 
                      ? `${results.results.nfts?.length || 0} NFTs loaded${hasMore ? ' (more available)' : ''}`
                      : `${results.pagination.totalCount} results found`
                    }
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Query:</span>
                  <code className="bg-muted/50 px-2 py-1 rounded text-xs font-mono">
                    {results.query.slice(0, 10)}...{results.query.slice(-8)}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyAddress(results.query)}
                    className="p-1 h-auto"
                  >
                    {copiedAddress === results.query ? (
                      <Check className="w-3 h-3 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Collection Holders Results */}
              {results.results.type === 'collection_holders' && results.results.holders && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.results.holders.map((holder) => (
                    <div key={holder.ownerAddress} className="glass-card rounded-xl p-4 hover-lift">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-monad-purple" />
                          <span className="text-sm font-medium">Holder</span>
                        </div>
                        <Badge variant="outline">
                          {holder.balance} NFT{holder.balance !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Address</p>
                          <div className="flex items-center gap-2">
                            <code className="text-xs font-mono bg-muted/50 px-2 py-1 rounded flex-1">
                              {holder.ownerAddress.slice(0, 8)}...{holder.ownerAddress.slice(-6)}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyAddress(holder.ownerAddress)}
                              className="p-1 h-auto"
                            >
                              {copiedAddress === holder.ownerAddress ? (
                                <Check className="w-3 h-3 text-green-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                        
                        {holder.tokenIds && holder.tokenIds.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Token IDs</p>
                            <div className="flex flex-wrap gap-1">
                              {holder.tokenIds.slice(0, 5).map((tokenId) => (
                                <Badge key={tokenId} variant="outline" className="text-xs">
                                  #{tokenId}
                                </Badge>
                              ))}
                              {holder.tokenIds.length > 5 && (
                                <Badge variant="outline" className="text-xs">
                                  +{holder.tokenIds.length - 5} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Account NFTs Results */}
              {results.results.type === 'account_nfts' && results.results.nfts && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {results.results.nfts.map((nft) => (
                      <div key={`${nft.contractAddress}-${nft.tokenId}`} className="glass-card rounded-xl p-4 hover-lift">
                        {/* NFT Image */}
                        <div className="aspect-square rounded-lg bg-muted/20 mb-3 overflow-hidden">
                          {nft.image ? (
                            <img
                              src={nft.image}
                              alt={nft.name || `NFT #${nft.tokenId}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                // Show fallback icon
                                const parent = target.parentElement
                                if (parent) {
                                  parent.innerHTML = `
                                    <div class="w-full h-full flex items-center justify-center">
                                      <svg class="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                      </svg>
                                    </div>
                                  `
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        
                        {/* NFT Info */}
                        <div className="space-y-2">
                          <div>
                            <h3 className="font-semibold text-sm truncate">
                              {nft.name || `NFT #${truncateValue(nft.tokenId, 8)}`}
                            </h3>
                            {nft.collection?.name && (
                              <p className="text-xs text-muted-foreground truncate">
                                {nft.collection.name}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <Badge 
                              variant="outline" 
                              className="text-xs cursor-help" 
                              title={`Full Token ID: ${nft.tokenId}`}
                            >
                              #{truncateValue(nft.tokenId, 10)}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyAddress(nft.contractAddress)}
                              className="p-1 h-auto"
                              title="Copy contract address"
                            >
                              {copiedAddress === nft.contractAddress ? (
                                <Check className="w-3 h-3 text-green-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Load More Button for NFTs */}
                  {hasMore && (
                    <div className="flex justify-center mt-8">
                      <Button 
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="btn-monad"
                        size="lg"
                      >
                        {loadingMore ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                            Loading more NFTs...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Load More NFTs
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}

              {/* Pagination - Only for Collection Holders */}
              {results.searchType === 'contract' && results.pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8 pb-8">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="glass-card"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, results.pagination.totalPages) }, (_, i) => {
                      const pageNum = i + 1
                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          className={cn(
                            "w-8 h-8 p-0",
                            pageNum === currentPage ? "btn-monad" : "glass-card"
                          )}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!results.pagination.hasMore}
                    className="glass-card"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!results && !loading && !error && searchParams.get('q') && (
            <div className="min-h-[60vh] flex items-center justify-center">
              <div className="text-center space-y-6">
                <div className="w-20 h-20 mx-auto rounded-full bg-monad-purple/10 flex items-center justify-center">
                  <Search className="w-10 h-10 text-monad-purple" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-2">Start Your Search</h2>
                  <p className="text-muted-foreground mb-6">
                    Enter a contract address to see collection holders, or a wallet address to see NFTs
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 