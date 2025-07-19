// MagicEden API integration for enhanced NFT market data
import { appConfig } from './config'

const MAGICEDEN_BASE_URL = 'https://api-mainnet.magiceden.dev/v2'
const MAGICEDEN_API_KEY = process.env.MAGICEDEN_API_KEY

// Types for MagicEden API responses
export interface MagicEdenCollection {
  symbol: string
  name: string
  description?: string
  image?: string
  website?: string
  twitter?: string
  discord?: string
  categories: string[]
  floorPrice?: number
  listedCount?: number
  volumeAll?: number
  avgPrice24hr?: number
}

export interface MagicEdenNFT {
  mintAddress: string
  owner: string
  supply: number
  collection: string
  name: string
  updateAuthority: string
  primarySaleHappened: boolean
  sellerFeeBasisPoints: number
  image?: string
  animationUrl?: string
  externalUrl?: string
  attributes?: Array<{
    trait_type: string
    value: string | number
  }>
  properties?: {
    files?: Array<{
      uri: string
      type: string
    }>
    category?: string
    creators?: Array<{
      address: string
      verified: boolean
      share: number
    }>
  }
  listStatus?: string
  price?: number
  tokenAddress?: string
  tokenSize?: number
  auctionHouse?: string
  collectionName?: string
  collectionTitle?: string
}

export interface MagicEdenActivity {
  signature: string
  type: string
  source: string
  tokenMint: string
  collection: string
  slot: number
  blockTime: number
  buyer?: string
  buyerReferral?: string
  seller?: string
  sellerReferral?: string
  price: number
  marketplaceProgramId: string
  parsedTransaction?: any
}

export interface CollectionStats {
  symbol: string
  floorPrice?: number
  listedCount?: number
  avgPrice24hr?: number
  volumeAll?: number
  volume24hr?: number
}

class MagicEdenService {
  private baseUrl: string
  private apiKey?: string

  constructor() {
    this.baseUrl = MAGICEDEN_BASE_URL
    this.apiKey = MAGICEDEN_API_KEY
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}/${endpoint}`)
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString())
      }
    })

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
      })

      if (!response.ok) {
        // MagicEden often returns 429 for rate limits, handle gracefully
        if (response.status === 429) {
          console.warn('MagicEden rate limit hit, returning null')
          return null as T
        }
        
        const errorText = await response.text()
        throw new Error(`MagicEden API error: ${response.status} - ${errorText}`)
      }

      return response.json()
    } catch (error) {
      console.error(`MagicEden API request failed for ${endpoint}:`, error)
      throw error
    }
  }

  /**
   * Get collection statistics and floor price
   */
  async getCollectionStats(collectionSymbol: string): Promise<CollectionStats | null> {
    try {
      const response = await this.makeRequest<any>(`collections/${collectionSymbol}/stats`)
      
      if (!response) return null

      return {
        symbol: collectionSymbol,
        floorPrice: response.floorPrice,
        listedCount: response.listedCount,
        avgPrice24hr: response.avgPrice24hr,
        volumeAll: response.volumeAll,
        volume24hr: response.volume24hr,
      }
    } catch (error) {
      console.error(`Error fetching collection stats for ${collectionSymbol}:`, error)
      return null
    }
  }

  /**
   * Get collection information
   */
  async getCollection(collectionSymbol: string): Promise<MagicEdenCollection | null> {
    try {
      const response = await this.makeRequest<MagicEdenCollection>(`collections/${collectionSymbol}`)
      return response
    } catch (error) {
      console.error(`Error fetching collection ${collectionSymbol}:`, error)
      return null
    }
  }

  /**
   * Get NFT activities (sales, listings, etc.)
   */
  async getNFTActivities(
    mintAddress: string,
    options: {
      offset?: number
      limit?: number
    } = {}
  ): Promise<MagicEdenActivity[]> {
    try {
      const response = await this.makeRequest<MagicEdenActivity[]>(`tokens/${mintAddress}/activities`, {
        offset: options.offset || 0,
        limit: options.limit || 20,
      })
      
      return response || []
    } catch (error) {
      console.error(`Error fetching activities for ${mintAddress}:`, error)
      return []
    }
  }

  /**
   * Get popular collections
   */
  async getPopularCollections(
    options: {
      timeRange?: '1d' | '7d' | '30d'
      limit?: number
      offset?: number
    } = {}
  ): Promise<MagicEdenCollection[]> {
    try {
      const response = await this.makeRequest<MagicEdenCollection[]>('collections', {
        timeRange: options.timeRange || '1d',
        limit: options.limit || 20,
        offset: options.offset || 0,
      })
      
      return response || []
    } catch (error) {
      console.error('Error fetching popular collections:', error)
      return []
    }
  }

  /**
   * Search collections by name
   */
  async searchCollections(query: string, limit: number = 10): Promise<MagicEdenCollection[]> {
    try {
      // MagicEden doesn't have a direct search endpoint, so we'll get popular collections
      // and filter them by name. In production, you might want to implement a more sophisticated search
      const collections = await this.getPopularCollections({ limit: 100 })
      
      const filtered = collections.filter(collection => 
        collection.name.toLowerCase().includes(query.toLowerCase()) ||
        collection.symbol.toLowerCase().includes(query.toLowerCase())
      ).slice(0, limit)
      
      return filtered
    } catch (error) {
      console.error(`Error searching collections for "${query}":`, error)
      return []
    }
  }

  /**
   * Get floor price for a collection (optimized endpoint)
   */
  async getFloorPrice(collectionSymbol: string): Promise<number | null> {
    try {
      const stats = await this.getCollectionStats(collectionSymbol)
      return stats?.floorPrice || null
    } catch (error) {
      console.error(`Error fetching floor price for ${collectionSymbol}:`, error)
      return null
    }
  }

  /**
   * Enhance NFT data with MagicEden market information
   */
  async enhanceNFTData(nft: {
    contractAddress: string
    tokenId: string
    collectionName?: string
    collectionSlug?: string
  }): Promise<{
    floorPrice?: number
    lastSalePrice?: number
    listedPrice?: number
    collectionStats?: CollectionStats
  }> {
    try {
      // Try to get collection symbol from various sources
      const collectionSymbol = nft.collectionSlug || nft.collectionName

      if (!collectionSymbol) {
        return {}
      }

      // Get collection stats which includes floor price
      const collectionStats = await this.getCollectionStats(collectionSymbol)
      
      // Try to get recent activity for this specific NFT
      // Note: This would require the Solana mint address, which we don't have from Ethereum NFTs
      // In a real implementation, you'd need to map between different chain formats
      
      return {
        floorPrice: collectionStats?.floorPrice,
        collectionStats: collectionStats || undefined,
      }
    } catch (error) {
      console.error('Error enhancing NFT data with MagicEden:', error)
      return {}
    }
  }

  /**
   * Get trending collections
   */
  async getTrendingCollections(timeRange: '1d' | '7d' | '30d' = '1d'): Promise<MagicEdenCollection[]> {
    try {
      return await this.getPopularCollections({ timeRange, limit: 10 })
    } catch (error) {
      console.error('Error fetching trending collections:', error)
      return []
    }
  }
}

// Export singleton instance
export const magicEdenService = new MagicEdenService()

// Utility functions for working with MagicEden data
export const magicEdenUtils = {
  /**
   * Convert SOL price to ETH (rough conversion for display purposes)
   */
  solToEth(solPrice: number, solToEthRate: number = 0.05): number {
    return solPrice * solToEthRate
  },

  /**
   * Format price for display
   */
  formatPrice(price: number, decimals: number = 2): string {
    return price.toFixed(decimals)
  },

  /**
   * Get collection image URL with fallback
   */
  getCollectionImage(collection: MagicEdenCollection): string {
    return collection.image || '/api/placeholder/400/400'
  },

  /**
   * Determine if an NFT is likely valuable based on collection stats
   */
  isHighValueNFT(collectionStats: CollectionStats | null): boolean {
    if (!collectionStats) return false
    
    return (collectionStats.floorPrice || 0) > 1 || // > 1 SOL floor
           (collectionStats.volumeAll || 0) > 1000   // > 1000 SOL total volume
  },

  /**
   * Get rarity tier based on collection size and floor price
   */
  getRarityTier(collectionStats: CollectionStats | null): 'common' | 'uncommon' | 'rare' | 'legendary' {
    if (!collectionStats) return 'common'
    
    const floorPrice = collectionStats.floorPrice || 0
    const volume = collectionStats.volumeAll || 0
    
    if (floorPrice > 10 && volume > 10000) return 'legendary'
    if (floorPrice > 5 && volume > 5000) return 'rare'
    if (floorPrice > 1 && volume > 1000) return 'uncommon'
    return 'common'
  }
} 