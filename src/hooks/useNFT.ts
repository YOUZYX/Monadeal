import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { NFTWithCollection, UserNFTsResponse, CollectionStats } from '@/lib/nft-metadata'
import { Collection } from '@prisma/client'
import { appConfig } from '@/lib/config'

// Query keys
export const NFT_QUERY_KEYS = {
  nftMetadata: (contractAddress: string, tokenId: string) => 
    ['nft', 'metadata', contractAddress, tokenId],
  userNFTs: (address: string, params?: any) => 
    ['nfts', 'user', address, params],
  searchNFTs: (params: any) => 
    ['nfts', 'search', params],
  collections: (limit?: number) => 
    ['collections', limit],
  collectionStats: (contractAddress: string) => 
    ['collections', 'stats', contractAddress],
  recentNFTs: (limit?: number) => 
    ['nfts', 'recent', limit],
}

// Hook for fetching NFT metadata
export function useNFTMetadata(
  contractAddress: string,
  tokenId: string,
  options: {
    enabled?: boolean
    refresh?: boolean
    staleTime?: number
  } = {}
) {
  const { enabled = true, refresh = false, staleTime = 5 * 60 * 1000 } = options

  return useQuery({
    queryKey: NFT_QUERY_KEYS.nftMetadata(contractAddress, tokenId),
    queryFn: () => apiClient.getNFTMetadata(contractAddress, tokenId, refresh),
    enabled: enabled && !!contractAddress && !!tokenId,
    staleTime,
    retry: 2,
  })
}

// Hook for validating NFT ownership
export function useValidateNFTOwnership() {
  return useMutation({
    mutationFn: ({
      contractAddress,
      tokenId,
      expectedOwner,
    }: {
      contractAddress: string
      tokenId: string
      expectedOwner: string
    }) => apiClient.validateNFTOwnership(contractAddress, tokenId, expectedOwner),
  })
}

// Hook for fetching user's NFTs
export function useUserNFTs(
  address: string,
  options: {
    contractAddresses?: string[]
    pageKey?: string
    pageSize?: number
    refresh?: boolean
    enabled?: boolean
  } = {}
) {
  const { enabled = true, pageSize = appConfig.api.nftPageSize, ...params } = options
  const finalParams = { ...params, pageSize }

  return useQuery({
    queryKey: NFT_QUERY_KEYS.userNFTs(address, finalParams),
    queryFn: () => apiClient.getUserNFTs(address, finalParams),
    enabled: enabled && !!address,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  })
}

// Hook for searching NFTs
export function useSearchNFTs(
  params: {
    name?: string
    collectionAddress?: string
    collectionSlug?: string
    owner?: string
    traits?: Record<string, any>
    limit?: number
    offset?: number
  } = {},
  options: {
    enabled?: boolean
  } = {}
) {
  const { enabled = true } = options

  return useQuery({
    queryKey: NFT_QUERY_KEYS.searchNFTs(params),
    queryFn: () => apiClient.searchNFTs(params),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  })
}

// Hook for fetching popular collections
export function usePopularCollections(
  limit?: number,
  options: {
    enabled?: boolean
  } = {}
) {
  const { enabled = true } = options

  return useQuery({
    queryKey: NFT_QUERY_KEYS.collections(limit),
    queryFn: () => apiClient.getPopularCollections(limit),
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  })
}

// Hook for fetching collection statistics
export function useCollectionStats(
  contractAddress: string,
  options: {
    enabled?: boolean
  } = {}
) {
  const { enabled = true } = options

  return useQuery({
    queryKey: NFT_QUERY_KEYS.collectionStats(contractAddress),
    queryFn: () => apiClient.getCollectionStats(contractAddress),
    enabled: enabled && !!contractAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  })
}

// Hook for fetching recent NFTs
export function useRecentNFTs(
  limit?: number,
  options: {
    enabled?: boolean
  } = {}
) {
  const { enabled = true } = options

  return useQuery({
    queryKey: NFT_QUERY_KEYS.recentNFTs(limit),
    queryFn: () => apiClient.getRecentNFTs(limit),
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  })
}

// Hook for refreshing NFT metadata
export function useRefreshNFTMetadata() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (limit?: number) => apiClient.refreshNFTMetadata(limit),
    onSuccess: () => {
      // Invalidate all NFT-related queries
      queryClient.invalidateQueries({ queryKey: ['nft'] })
      queryClient.invalidateQueries({ queryKey: ['nfts'] })
      queryClient.invalidateQueries({ queryKey: ['collections'] })
    },
  })
}

// Hook for paginated user NFTs with infinite scroll
export function useUserNFTsPaginated(
  address: string,
  options: {
    contractAddresses?: string[]
    pageSize?: number
    enabled?: boolean
  } = {}
) {
  const [allNFTs, setAllNFTs] = useState<NFTWithCollection[]>([])
  const [pageKey, setPageKey] = useState<string | undefined>()
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)

  const { enabled = true, pageSize = appConfig.api.nftPageSize, contractAddresses } = options

  const loadMore = async () => {
    if (loading || !hasMore || !enabled) return

    setLoading(true)
    try {
      const result = await apiClient.getUserNFTs(address, {
        contractAddresses,
        pageKey,
        pageSize,
      })

      if (pageKey) {
        // Append to existing NFTs
        setAllNFTs(prev => [...prev, ...result.nfts])
      } else {
        // First load
        setAllNFTs(result.nfts)
      }

      setPageKey(result.pageKey)
      setHasMore(result.hasMore)
    } catch (error) {
      console.error('Error loading more NFTs:', error)
    } finally {
      setLoading(false)
    }
  }

  const refresh = async () => {
    setPageKey(undefined)
    setHasMore(true)
    setAllNFTs([])
    await loadMore()
  }

  useEffect(() => {
    if (enabled && address) {
      loadMore()
    }
  }, [address, enabled])

  return {
    nfts: allNFTs,
    loading,
    hasMore,
    loadMore,
    refresh,
  }
}

// Hook for NFT search with debounced query
export function useNFTSearchDebounced(
  initialParams: {
    name?: string
    collectionAddress?: string
    collectionSlug?: string
    owner?: string
    traits?: Record<string, any>
    limit?: number
    offset?: number
  } = {},
  debounceMs: number = 500
) {
  const [searchParams, setSearchParams] = useState(initialParams)
  const [debouncedParams, setDebouncedParams] = useState(initialParams)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedParams(searchParams)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [searchParams, debounceMs])

  const query = useSearchNFTs(debouncedParams, {
    enabled: Object.values(debouncedParams).some(v => v !== undefined && v !== ''),
  })

  return {
    ...query,
    searchParams,
    setSearchParams,
    isDebouncing: JSON.stringify(searchParams) !== JSON.stringify(debouncedParams),
  }
}

// Utility hook for NFT image loading
export function useNFTImage(nft: NFTWithCollection | null) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!nft) {
      setImageUrl(null)
      return
    }

    const loadImage = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Try different image sources in order of preference
        const imageSources = [
          nft.imageUrl,
          nft.image,
          (nft.metadata as any)?.image,
        ].filter(Boolean)

        for (const src of imageSources) {
          try {
            // Test if image loads
            await new Promise((resolve, reject) => {
              const img = new Image()
              img.onload = resolve
              img.onerror = reject
              img.src = src as string
            })
            
            setImageUrl(src as string)
            break
          } catch {
            // Try next source
            continue
          }
        }

        if (!imageUrl) {
          setError('No valid image found')
        }
      } catch (err) {
        setError('Failed to load image')
      } finally {
        setIsLoading(false)
      }
    }

    loadImage()
  }, [nft])

  return { imageUrl, isLoading, error }
} 