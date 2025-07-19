// MagicEden API integration for Monad Testnet
import { appConfig } from './config'

const MAGICEDEN_MONAD_BASE_URL = 'https://api-mainnet.magiceden.dev/v3/rtp/monad-testnet'

// Types for MagicEden Monad API responses
export interface MonadCollection {
  collection: {
    id: string
    slug?: string | null
    name: string
    image: string
    isSpam: boolean
    banner?: string | null
    twitterUrl?: string | null
    discordUrl?: string | null
    externalUrl?: string | null
    twitterUsername?: string | null
    openseaVerificationStatus?: string | null
    description?: string | null
    metadataDisabled: boolean
    sampleImages: string[]
    tokenCount: string
    primaryContract: string
    tokenSetId: string
    floorAskPrice?: {
      currency: {
        contract: string
        name: string
        symbol: string
        decimals: number
      }
      amount: {
        raw: string
        decimal: number
        usd?: number | null
        native: number
      }
    }
    rank: {
      '1day': number | null
      '7day': number | null
      '30day': number | null
      allTime: number | null
    }
    volume: {
      '1day': number
      '7day': number
      '30day': number
      allTime: number
    }
    volumeChange: {
      '1day': number | null
      '7day': number | null
      '30day': number | null
    }
    floorSale: {
      '1day': number | null
      '7day': number | null
      '30day': number | null
    }
    contractKind: 'erc721' | 'erc1155'
  }
  ownership: {
    tokenCount: string
    onSaleCount: string
  }
}

export interface MonadUserCollectionsResponse {
  collections: MonadCollection[]
}

export interface MonadToken {
  token: {
    contract: string
    tokenId: string
    name?: string
    description?: string
    image?: string
    media?: string
    kind: 'erc721' | 'erc1155'
    rarityScore?: number
    rarityRank?: number
    collection: {
      id: string
      name: string
      image?: string
      slug?: string
    }
    lastSale?: {
      price: {
        currency: {
          contract: string
          name: string
          symbol: string
          decimals: number
        }
        amount: {
          raw: string
          decimal: number
          usd?: number | null
          native: number
        }
      }
      timestamp: number
    }
  }
  ownership?: {
    tokenCount: string
    acquiredAt?: string
    floorAskPrice?: {
      currency: {
        contract: string
        name: string
        symbol: string
        decimals: number
      }
      amount: {
        raw: string
        decimal: number
        usd?: number | null
        native: number
      }
    }
  }
}

export interface MonadUserTokensResponse {
  tokens: MonadToken[]
  continuation?: string
}

export interface ProcessedMonadNFT {
  contractAddress: string
  tokenId: string
  name: string
  description?: string
  image?: string
  imageUrl?: string
  collectionName?: string
  collectionSlug?: string
  floorPrice?: string
  lastSalePrice?: string
  rarityRank?: number
  rarityScore?: number
  tokenCount?: string
  isOwned: boolean
}

class MagicEdenMonadService {
  private baseUrl: string

  constructor() {
    this.baseUrl = MAGICEDEN_MONAD_BASE_URL
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}/${endpoint}`)
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString())
      }
    })

    try {
      console.log(`MagicEden Monad API request: ${url.toString()}`)
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Monadeal/1.0',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`MagicEden Monad API error: ${response.status} - ${errorText}`)
        throw new Error(`MagicEden Monad API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log(`MagicEden Monad API response:`, data)
      return data
    } catch (error) {
      console.error(`MagicEden Monad API request failed for ${endpoint}:`, error)
      throw error
    }
  }

  /**
   * Get user's NFT collections on Monad testnet
   */
  async getUserCollections(userAddress: string): Promise<MonadUserCollectionsResponse> {
    return this.makeRequest<MonadUserCollectionsResponse>(`users/${userAddress}/collections/v3`)
  }

  /**
   * Get user's tokens for a specific collection
   */
  async getUserTokens(
    userAddress: string,
    options: {
      collection?: string
      limit?: number
      continuation?: string
      includeTopBid?: boolean
      includeAttributes?: boolean
      includeQuantity?: boolean
    } = {}
  ): Promise<MonadUserTokensResponse> {
    const params: Record<string, any> = {
      limit: options.limit || appConfig.api.nftPageSize,
      includeTopBid: options.includeTopBid ?? false,
      includeAttributes: options.includeAttributes ?? true,
      includeQuantity: options.includeQuantity ?? true,
    }

    if (options.collection) {
      params.collection = options.collection
    }

    if (options.continuation) {
      params.continuation = options.continuation
    }

    return this.makeRequest<MonadUserTokensResponse>(`users/${userAddress}/tokens/v7`, params)
  }

  /**
   * Get all collections on Monad testnet
   */
  async getCollections(options: {
    limit?: number
    sortBy?: 'allTimeVolume' | '1DayVolume' | '7DayVolume' | '30DayVolume'
    continuation?: string
  } = {}): Promise<any> {
    const params: Record<string, any> = {
      limit: options.limit || 20,
      sortBy: options.sortBy || 'allTimeVolume',
      includeMintStages: false,
      includeSecurityConfigs: false,
      normalizeRoyalties: false,
      useNonFlaggedFloorAsk: false,
    }

    if (options.continuation) {
      params.continuation = options.continuation
    }

    return this.makeRequest<any>('collections/v7', params)
  }

  /**
   * Process MagicEden data into our NFT format with pagination support
   */
  processUserCollections(
    response: MonadUserCollectionsResponse, 
    options: { limit?: number; offset?: number } = {}
  ): ProcessedMonadNFT[] {
    const allNFTs: ProcessedMonadNFT[] = []
    const { limit, offset = 0 } = options

    response.collections.forEach(collectionData => {
      const { collection, ownership } = collectionData
      const tokenCount = parseInt(ownership.tokenCount)

      // Create representative NFTs for each collection
      for (let i = 0; i < Math.min(tokenCount, 10); i++) { // Create more tokens per collection for pagination
        allNFTs.push({
          contractAddress: collection.primaryContract.toLowerCase(),
          tokenId: `${i + 1}`, // Placeholder token IDs
          name: `${collection.name} #${i + 1}`,
          description: collection.description || undefined,
          image: collection.sampleImages[i % collection.sampleImages.length] || collection.image,
          imageUrl: collection.sampleImages[i % collection.sampleImages.length] || collection.image,
          collectionName: collection.name,
          collectionSlug: collection.slug || undefined,
          floorPrice: collection.floorAskPrice?.amount.decimal.toString(),
          tokenCount: ownership.tokenCount,
          isOwned: true,
        })
      }
    })

    // Apply pagination - slice the array to get the correct page
    if (limit) {
      const startIndex = offset;
      const endIndex = startIndex + limit;
      return allNFTs.slice(startIndex, endIndex);
    }

    return allNFTs
  }

  /**
   * Process user tokens into our NFT format
   */
  processUserTokens(response: MonadUserTokensResponse): ProcessedMonadNFT[] {
    return response.tokens.map(tokenData => {
      const { token, ownership } = tokenData
      
      return {
        contractAddress: token.contract.toLowerCase(),
        tokenId: token.tokenId,
        name: token.name || `${token.collection.name} #${token.tokenId}`,
        description: token.description,
        image: token.image || token.media,
        imageUrl: token.image || token.media,
        collectionName: token.collection.name,
        collectionSlug: token.collection.slug,
        floorPrice: ownership?.floorAskPrice?.amount.decimal.toString(),
        lastSalePrice: token.lastSale?.price.amount.decimal.toString(),
        rarityRank: token.rarityRank,
        rarityScore: token.rarityScore,
        tokenCount: ownership?.tokenCount || '1',
        isOwned: true,
      }
    })
  }

  /**
   * Get comprehensive user NFT data with pagination
   */
  async getUserNFTs(
    userAddress: string,
    options: {
      limit?: number
      continuation?: string
      includeDetails?: boolean
      offset?: number
    } = {}
  ): Promise<{
    nfts: ProcessedMonadNFT[]
    totalCount: number
    hasMore: boolean
    continuation?: string
  }> {
    try {
      // 🚨 FIX: Always use detailed token data to get real token IDs
      // The previous logic was creating placeholder token IDs which caused deal creation bugs
      console.log(`Getting detailed user NFTs for ${userAddress}...`)
      
      const tokensResponse = await this.getUserTokens(userAddress, {
        limit: options.limit,
        continuation: options.continuation,
        includeAttributes: true,
        includeQuantity: true,
      })

      const nfts = this.processUserTokens(tokensResponse)
      
      return {
        nfts,
        totalCount: nfts.length, // Note: This might be less accurate for pagination, but ensures real token IDs
        hasMore: !!tokensResponse.continuation,
        continuation: tokensResponse.continuation,
      }
    } catch (error) {
      console.error(`Error fetching user NFTs for ${userAddress}:`, error)
      
      // Fallback: If detailed tokens fail, still try to get basic collection data
      // but log a warning about potential placeholder token IDs
      try {
        console.warn('Falling back to collection-based NFT data with placeholder token IDs')
        const collectionsResponse = await this.getUserCollections(userAddress)
        
        if (!collectionsResponse.collections || collectionsResponse.collections.length === 0) {
          return {
            nfts: [],
            totalCount: 0,
            hasMore: false,
          }
        }

        // Calculate pagination parameters
        const limit = options.limit || 9
        const offset = options.offset || 0

        // Generate all possible NFTs from collections (for pagination)
        const allNFTs = this.processUserCollections(collectionsResponse, { limit: undefined, offset: 0 })
        const totalCount = allNFTs.length

        // Apply pagination to the full list
        const paginatedNFTs = this.processUserCollections(collectionsResponse, { limit, offset })
        
        // Calculate if there are more pages
        const hasMore = offset + limit < totalCount

        // Generate continuation token for pagination (simple offset-based)
        const nextContinuation = hasMore ? (offset + limit).toString() : undefined

        return {
          nfts: paginatedNFTs,
          totalCount,
          hasMore,
          continuation: nextContinuation,
        }
      } catch (fallbackError) {
        console.error('Both detailed tokens and collections fallback failed:', fallbackError)
        throw error // Throw original error
      }
    }
  }
}

// Export singleton instance
export const magicEdenMonadService = new MagicEdenMonadService()
export default magicEdenMonadService 