import { appConfig } from './config'

// Alchemy API configuration for Monad Testnet
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || appConfig.api.alchemyKey
// For Monad Testnet, the API key is part of the URL path
const ALCHEMY_BASE_URL = `https://monad-testnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`

// Types for Alchemy API responses
export interface AlchemyNFTMetadata {
  contract: {
    address: string
    name?: string
    symbol?: string
    totalSupply?: string
    tokenType: 'ERC721' | 'ERC1155' | 'UNKNOWN'
    contractDeployer?: string
    deployedBlockNumber?: number
    openSeaMetadata?: {
      floorPrice?: number
      collectionName?: string
      collectionSlug?: string
      safelistRequestStatus?: string
      imageUrl?: string
      description?: string
      externalUrl?: string
      twitterUsername?: string
      discordUrl?: string
      lastIngestedAt?: string
    }
  }
  tokenId: string
  tokenType: 'ERC721' | 'ERC1155'
  name?: string
  description?: string
  image?: {
    cachedUrl?: string
    thumbnailUrl?: string
    pngUrl?: string
    contentType?: string
    size?: number
    originalUrl?: string
  }
  raw?: {
    tokenUri?: string
    metadata?: Record<string, any>
    error?: string
  }
  collection?: {
    name?: string
    slug?: string
    externalUrl?: string
    bannerImageUrl?: string
  }
  mint?: {
    mintAddress?: string
    blockNumber?: number
    timestamp?: string
    transactionHash?: string
  }
  owners?: Array<{
    ownerAddress: string
    tokenBalances: Array<{
      tokenId: string
      balance: string
    }>
  }>
  timeLastUpdated: string
  balance?: string
  acquiredAt?: {
    blockTimestamp?: string
    blockNumber?: number
  }
}

export interface AlchemyNFTsResponse {
  ownedNfts: AlchemyNFTMetadata[]
  totalCount: number
  blockHash?: string
  pageKey?: string
}

export interface AlchemyNFTContractResponse {
  address: string
  name?: string
  symbol?: string
  totalSupply?: string
  tokenType: 'ERC721' | 'ERC1155' | 'UNKNOWN'
  contractDeployer?: string
  deployedBlockNumber?: number
  openSeaMetadata?: {
    floorPrice?: number
    collectionName?: string
    collectionSlug?: string
    safelistRequestStatus?: string
    imageUrl?: string
    description?: string
    externalUrl?: string
    twitterUsername?: string
    discordUrl?: string
    lastIngestedAt?: string
  }
}

export interface ProcessedNFTMetadata {
  contractAddress: string
  tokenId: string
  name: string
  description?: string
  image?: string
  imageUrl?: string
  animationUrl?: string
  externalUrl?: string
  collectionName?: string
  collectionSlug?: string
  metadata?: Record<string, any>
  owner?: string
  lastSalePrice?: string
  floorPrice?: string
  rarity?: string
  traits?: Record<string, any>[]
  isValidated: boolean
}

class AlchemyNFTService {
  private apiKey: string
  private baseUrl: string

  constructor() {
    this.apiKey = ALCHEMY_API_KEY
    this.baseUrl = ALCHEMY_BASE_URL
    
    if (!this.apiKey) {
      console.warn('Alchemy API key not found. NFT metadata fetching will be limited.')
    } else {
      console.log('Alchemy initialized for Monad Testnet with base URL:', this.baseUrl.replace(this.apiKey, '[API_KEY]'))
    }
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Alchemy API key not configured')
    }

    const url = new URL(`${this.baseUrl}/${endpoint}`)
    // No need to append apikey as query param - it's already in the URL for Monad Testnet
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString())
      }
    })

    console.log(`Making Alchemy API request to: ${url.toString().replace(this.apiKey, '[API_KEY]')}`)

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    console.log(`Alchemy API response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Alchemy API error response: ${errorText}`)
      throw new Error(`Alchemy API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log(`Alchemy API response received successfully`)
    return data
  }

  /**
   * Get NFT metadata for a specific token
   */
  async getNFTMetadata(contractAddress: string, tokenId: string): Promise<AlchemyNFTMetadata> {
    try {
      const response = await this.makeRequest<AlchemyNFTMetadata>(
        `getNFTMetadata`,
        {
          contractAddress,
          tokenId,
          refreshCache: false,
        }
      )
      return response
    } catch (error) {
      console.error(`Error fetching NFT metadata for ${contractAddress}:${tokenId}:`, error)
      throw error
    }
  }

  /**
   * Get all NFTs owned by an address
   */
  async getNFTsForOwner(
    ownerAddress: string,
    options: {
      contractAddresses?: string[]
      pageKey?: string
      pageSize?: number
      withMetadata?: boolean
    } = {}
  ): Promise<AlchemyNFTsResponse> {
    try {
      const params: Record<string, any> = {
        owner: ownerAddress,
        withMetadata: options.withMetadata ?? true,
        pageSize: options.pageSize ?? 20,
      }

      if (options.contractAddresses && options.contractAddresses.length > 0) {
        params.contractAddresses = options.contractAddresses
      }

      if (options.pageKey) {
        params.pageKey = options.pageKey
      }

      const response = await this.makeRequest<AlchemyNFTsResponse>(
        'getNFTsForOwner',
        params
      )
      return response
    } catch (error) {
      console.error(`Error fetching NFTs for owner ${ownerAddress}:`, error)
      throw error
    }
  }

  /**
   * Get contract metadata
   */
  async getContractMetadata(contractAddress: string): Promise<AlchemyNFTContractResponse> {
    try {
      const response = await this.makeRequest<AlchemyNFTContractResponse>(
        'getContractMetadata',
        { contractAddress }
      )
      return response
    } catch (error) {
      console.error(`Error fetching contract metadata for ${contractAddress}:`, error)
      throw error
    }
  }

  /**
   * Resolve IPFS URLs to HTTP URLs
   */
  resolveIPFS(ipfsUrl: string): string {
    if (!ipfsUrl) return ''
    
    // Handle different IPFS URL formats
    if (ipfsUrl.startsWith('ipfs://')) {
      return ipfsUrl.replace('ipfs://', 'https://ipfs.io/ipfs/')
    }
    
    if (ipfsUrl.startsWith('ipfs/')) {
      return `https://ipfs.io/ipfs/${ipfsUrl.slice(5)}`
    }
    
    // Return as-is if it's already an HTTP URL
    return ipfsUrl
  }

  /**
   * Process raw Alchemy NFT data into our database format
   */
  processNFTMetadata(alchemyNFT: AlchemyNFTMetadata): ProcessedNFTMetadata {
    const traits: Record<string, any>[] = []
    
    // Extract traits from metadata
    if (alchemyNFT.raw?.metadata?.attributes) {
      const attributes = alchemyNFT.raw.metadata.attributes
      if (Array.isArray(attributes)) {
        attributes.forEach((attr: any) => {
          if (attr.trait_type && attr.value !== undefined) {
            traits.push({
              trait_type: attr.trait_type,
              value: attr.value,
              display_type: attr.display_type,
            })
          }
        })
      }
    }

    // Get the best available image URL
    const getImageUrl = (): string | undefined => {
      if (alchemyNFT.image?.cachedUrl) {
        return alchemyNFT.image.cachedUrl
      }
      if (alchemyNFT.image?.originalUrl) {
        return this.resolveIPFS(alchemyNFT.image.originalUrl)
      }
      if (alchemyNFT.raw?.metadata?.image) {
        return this.resolveIPFS(alchemyNFT.raw.metadata.image)
      }
      return undefined
    }

    // Get animation URL if available
    const getAnimationUrl = (): string | undefined => {
      if (alchemyNFT.raw?.metadata?.animation_url) {
        return this.resolveIPFS(alchemyNFT.raw.metadata.animation_url)
      }
      return undefined
    }

    // Get external URL
    const getExternalUrl = (): string | undefined => {
      if (alchemyNFT.raw?.metadata?.external_url) {
        return alchemyNFT.raw.metadata.external_url
      }
      if (alchemyNFT.contract.openSeaMetadata?.externalUrl) {
        return alchemyNFT.contract.openSeaMetadata.externalUrl
      }
      return undefined
    }

    // Get floor price if available
    const getFloorPrice = (): string | undefined => {
      if (alchemyNFT.contract.openSeaMetadata?.floorPrice) {
        return alchemyNFT.contract.openSeaMetadata.floorPrice.toString()
      }
      return undefined
    }

    // Get owner address
    const getOwner = (): string | undefined => {
      if (alchemyNFT.owners && alchemyNFT.owners.length > 0) {
        return alchemyNFT.owners[0].ownerAddress
      }
      return undefined
    }

    return {
      contractAddress: alchemyNFT.contract.address.toLowerCase(),
      tokenId: alchemyNFT.tokenId,
      name: alchemyNFT.name || alchemyNFT.raw?.metadata?.name || `Token #${alchemyNFT.tokenId}`,
      description: alchemyNFT.description || alchemyNFT.raw?.metadata?.description,
      image: getImageUrl(),
      imageUrl: getImageUrl(),
      animationUrl: getAnimationUrl(),
      externalUrl: getExternalUrl(),
      collectionName: alchemyNFT.collection?.name || alchemyNFT.contract.name,
      collectionSlug: alchemyNFT.collection?.slug || alchemyNFT.contract.openSeaMetadata?.collectionSlug,
      metadata: alchemyNFT.raw?.metadata || {},
      owner: getOwner(),
      floorPrice: getFloorPrice(),
      traits: traits.length > 0 ? traits : undefined,
      isValidated: !alchemyNFT.raw?.error,
    }
  }

  /**
   * Validate NFT existence and ownership
   */
  async validateNFT(contractAddress: string, tokenId: string, expectedOwner?: string): Promise<{
    exists: boolean
    owner?: string
    isValid: boolean
    error?: string
  }> {
    try {
      const metadata = await this.getNFTMetadata(contractAddress, tokenId)
      
      const owner = metadata.owners?.[0]?.ownerAddress
      const exists = !metadata.raw?.error
      
      let isValid = exists
      if (expectedOwner && owner) {
        isValid = owner.toLowerCase() === expectedOwner.toLowerCase()
      }

      return {
        exists,
        owner,
        isValid,
        error: metadata.raw?.error,
      }
    } catch (error) {
      return {
        exists: false,
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get floor price for a collection
   */
  async getCollectionFloorPrice(contractAddress: string): Promise<number | null> {
    try {
      const contract = await this.getContractMetadata(contractAddress)
      return contract.openSeaMetadata?.floorPrice || null
    } catch (error) {
      console.error(`Error fetching floor price for ${contractAddress}:`, error)
      return null
    }
  }
}

// Export singleton instance
export const alchemyService = new AlchemyNFTService()
export default alchemyService 