import { prisma } from './prisma'
import { alchemyService, ProcessedNFTMetadata } from './alchemy'
import { magicEdenMonadService, ProcessedMonadNFT } from './magiceden-monad'
import { NFT, Collection } from '@prisma/client'
import { appConfig } from './config'

// Cache configuration
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
const REFRESH_THRESHOLD = 60 * 60 * 1000 // 1 hour in milliseconds

export interface NFTWithCollection extends NFT {
  collection?: Collection | null
}

export interface UserNFTsResponse {
  nfts: NFTWithCollection[]
  totalCount: number
  pageKey?: string
  hasMore: boolean
}

export interface CollectionStats {
  totalNFTs: number
  totalOwners: number
  floorPrice?: string | null
  totalVolume: string
  averagePrice?: string | null
}

class NFTMetadataService {
  /**
   * Get cached NFT metadata or fetch from Alchemy if not cached/stale
   */
  async getNFTMetadata(
    contractAddress: string, 
    tokenId: string, 
    forceRefresh: boolean = false
  ): Promise<NFTWithCollection | null> {
    const normalizedAddress = contractAddress.toLowerCase()
    
    try {
      // Check cache first
      if (!forceRefresh) {
        const cached = await prisma.nFT.findUnique({
          where: {
            contractAddress_tokenId: {
              contractAddress: normalizedAddress,
              tokenId: tokenId,
            },
          },
        })

        // Get collection data separately
        let collection: Collection | null = null
        if (cached) {
          collection = await prisma.collection.findUnique({
            where: { address: normalizedAddress },
          })
        }

        // Return cached data if it's fresh
        if (cached && this.isCacheFresh(cached.updatedAt)) {
          return { ...cached, collection }
        }
      }

      // Fetch from Alchemy
      const alchemyData = await alchemyService.getNFTMetadata(normalizedAddress, tokenId)
      const processedData = alchemyService.processNFTMetadata(alchemyData)

      // Update or create collection if needed
      await this.updateOrCreateCollection(processedData)

      // Update or create NFT metadata
      const nft = await prisma.nFT.upsert({
        where: {
          contractAddress_tokenId: {
            contractAddress: normalizedAddress,
            tokenId: tokenId,
          },
        },
        update: {
          name: processedData.name,
          description: processedData.description,
          image: processedData.image,
          imageUrl: processedData.imageUrl,
          animationUrl: processedData.animationUrl,
          externalUrl: processedData.externalUrl,
          collectionName: processedData.collectionName,
          collectionSlug: processedData.collectionSlug,
          metadata: processedData.metadata,
          owner: processedData.owner,
          floorPrice: processedData.floorPrice,
          traits: processedData.traits,
          isValidated: processedData.isValidated,
          updatedAt: new Date(),
        },
        create: {
          contractAddress: normalizedAddress,
          tokenId: tokenId,
          name: processedData.name,
          description: processedData.description,
          image: processedData.image,
          imageUrl: processedData.imageUrl,
          animationUrl: processedData.animationUrl,
          externalUrl: processedData.externalUrl,
          collectionName: processedData.collectionName,
          collectionSlug: processedData.collectionSlug,
          metadata: processedData.metadata,
          owner: processedData.owner,
          floorPrice: processedData.floorPrice,
          traits: processedData.traits,
          isValidated: processedData.isValidated,
        },
      })

      // Get collection data separately
      const collection = await prisma.collection.findUnique({
        where: { address: normalizedAddress },
      })

      return { ...nft, collection }
    } catch (error) {
      console.error(`Error fetching NFT metadata for ${contractAddress}:${tokenId}:`, error)
      
              // Return cached data if available, even if stale
        const cached = await prisma.nFT.findUnique({
          where: {
            contractAddress_tokenId: {
              contractAddress: normalizedAddress,
              tokenId: tokenId,
            },
          },
        })

        if (cached) {
          console.warn(`Returning stale cache for ${contractAddress}:${tokenId}`)
          const collection = await prisma.collection.findUnique({
            where: { address: normalizedAddress },
          })
          return { ...cached, collection }
        }

      return null
    }
  }

  /**
   * Get all NFTs owned by a user using MagicEden Monad API with fallback to cached data
   */
  async getUserNFTs(
    ownerAddress: string,
    options: {
      contractAddresses?: string[]
      pageKey?: string
      pageSize?: number
      forceRefresh?: boolean
    } = {}
  ): Promise<UserNFTsResponse> {
    const normalizedAddress = ownerAddress.toLowerCase()
    const pageSize = options.pageSize || appConfig.api.nftPageSize

    try {
      // Use MagicEden Monad API as primary source
      console.log(`Fetching NFTs from MagicEden Monad for ${normalizedAddress} with pageSize ${pageSize}`)
      
      // Convert pageKey (continuation token) to offset for pagination
      const offset = options.pageKey ? parseInt(options.pageKey) || 0 : 0
      
      const magicEdenResponse = await magicEdenMonadService.getUserNFTs(normalizedAddress, {
        limit: pageSize,
        offset: offset,
        includeDetails: false, // Start with collection overview
      })

      // Process and cache each NFT
      const processedNFTs: NFTWithCollection[] = []
      
      for (const monadNFT of magicEdenResponse.nfts) {
        try {
          // Convert MagicEden data to our ProcessedNFTMetadata format
          const processedData: ProcessedNFTMetadata = {
            contractAddress: monadNFT.contractAddress,
            tokenId: monadNFT.tokenId,
            name: monadNFT.name,
            description: monadNFT.description,
            image: monadNFT.image,
            imageUrl: monadNFT.imageUrl,
            animationUrl: undefined, // Not available in MagicEden response
            externalUrl: undefined,
            collectionName: monadNFT.collectionName,
            collectionSlug: monadNFT.collectionSlug,
            metadata: {
              source: 'magiceden-monad',
              tokenCount: monadNFT.tokenCount,
              rarityRank: monadNFT.rarityRank,
              rarityScore: monadNFT.rarityScore,
            },
            owner: normalizedAddress,
            lastSalePrice: monadNFT.lastSalePrice,
            floorPrice: monadNFT.floorPrice,
            rarity: monadNFT.rarityRank ? `Rank #${monadNFT.rarityRank}` : undefined,
            traits: [], // Could be enhanced later
            isValidated: true,
          }
          
          // Update or create collection
          await this.updateOrCreateCollection(processedData)
          
          // Update or create NFT
          const nft = await prisma.nFT.upsert({
            where: {
              contractAddress_tokenId: {
                contractAddress: processedData.contractAddress,
                tokenId: processedData.tokenId,
              },
            },
            update: {
              name: processedData.name,
              description: processedData.description,
              image: processedData.image,
              imageUrl: processedData.imageUrl,
              animationUrl: processedData.animationUrl,
              externalUrl: processedData.externalUrl,
              collectionName: processedData.collectionName,
              collectionSlug: processedData.collectionSlug,
              metadata: processedData.metadata,
              owner: processedData.owner,
              floorPrice: processedData.floorPrice,
              traits: processedData.traits,
              isValidated: processedData.isValidated,
              updatedAt: new Date(),
            },
            create: {
              contractAddress: processedData.contractAddress,
              tokenId: processedData.tokenId,
              name: processedData.name,
              description: processedData.description,
              image: processedData.image,
              imageUrl: processedData.imageUrl,
              animationUrl: processedData.animationUrl,
              externalUrl: processedData.externalUrl,
              collectionName: processedData.collectionName,
              collectionSlug: processedData.collectionSlug,
              metadata: processedData.metadata,
              owner: processedData.owner,
              floorPrice: processedData.floorPrice,
              traits: processedData.traits,
              isValidated: processedData.isValidated,
            },
          })

          // Get collection data separately
          const collection = await prisma.collection.findUnique({
            where: { address: processedData.contractAddress },
          })

          processedNFTs.push({ ...nft, collection })
        } catch (error) {
          console.error(`Error processing NFT ${monadNFT.contractAddress}:${monadNFT.tokenId}:`, error)
          // Continue processing other NFTs
        }
      }

      return {
        nfts: processedNFTs,
        totalCount: magicEdenResponse.totalCount,
        pageKey: magicEdenResponse.continuation,
        hasMore: magicEdenResponse.hasMore,
      }
    } catch (error) {
      console.error(`Error fetching NFTs from MagicEden for user ${ownerAddress}:`, error)
      
      // Fallback to cached data
      console.log('Falling back to cached NFT data...')
      const cachedNFTs = await prisma.nFT.findMany({
        where: {
          owner: normalizedAddress,
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: pageSize,
      })

      // Get collection data for cached NFTs
      const nftsWithCollection = await Promise.all(
        cachedNFTs.map(async (nft) => {
          const collection = await prisma.collection.findUnique({
            where: { address: nft.contractAddress },
          })
          return { ...nft, collection }
        })
      )

      return {
        nfts: nftsWithCollection,
        totalCount: cachedNFTs.length,
        hasMore: false,
      }
    }
  }

  /**
   * Validate NFT ownership
   */
  async validateNFTOwnership(
    contractAddress: string,
    tokenId: string,
    expectedOwner: string
  ): Promise<{ isValid: boolean; actualOwner?: string; error?: string }> {
    try {
      const validation = await alchemyService.validateNFT(
        contractAddress,
        tokenId,
        expectedOwner
      )

      // Update cached owner if we got valid data
      if (validation.exists && validation.owner) {
        await prisma.nFT.updateMany({
          where: {
            contractAddress: contractAddress.toLowerCase(),
            tokenId: tokenId,
          },
          data: {
            owner: validation.owner.toLowerCase(),
            updatedAt: new Date(),
          },
        })
      }

      return {
        isValid: validation.isValid,
        actualOwner: validation.owner,
        error: validation.error,
      }
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(contractAddress: string): Promise<CollectionStats | null> {
    try {
      const normalizedAddress = contractAddress.toLowerCase()
      
      // Get from database
      const stats = await prisma.nFT.aggregate({
        where: {
          contractAddress: normalizedAddress,
        },
        _count: {
          tokenId: true,
        },
      })

      const uniqueOwners = await prisma.nFT.findMany({
        where: {
          contractAddress: normalizedAddress,
          owner: { not: null },
        },
        select: {
          owner: true,
        },
        distinct: ['owner'],
      })

      const collection = await prisma.collection.findUnique({
        where: {
          address: normalizedAddress,
        },
      })

      return {
        totalNFTs: stats._count.tokenId,
        totalOwners: uniqueOwners.length,
        floorPrice: collection?.floorPrice,
        totalVolume: collection?.totalVolume || '0',
        averagePrice: collection?.floorPrice, // Simplified - could calculate from sales
      }
    } catch (error) {
      console.error(`Error getting collection stats for ${contractAddress}:`, error)
      return null
    }
  }

  /**
   * Search NFTs by various criteria
   */
  async searchNFTs(query: {
    name?: string
    collectionAddress?: string
    collectionSlug?: string
    owner?: string
    traits?: Record<string, any>
    limit?: number
    offset?: number
  }): Promise<NFTWithCollection[]> {
    const where: any = {}

    if (query.name) {
      where.name = {
        contains: query.name,
        mode: 'insensitive',
      }
    }

    if (query.collectionAddress) {
      where.contractAddress = query.collectionAddress.toLowerCase()
    }

    if (query.collectionSlug) {
      where.collectionSlug = query.collectionSlug
    }

    if (query.owner) {
      where.owner = query.owner.toLowerCase()
    }

    if (query.traits) {
      where.traits = {
        path: '$',
        array_contains: query.traits,
      }
    }

    const nfts = await prisma.nFT.findMany({
      where,
      orderBy: {
        updatedAt: 'desc',
      },
      take: query.limit || 50,
      skip: query.offset || 0,
    })

    // Get collection data for each NFT
    const nftsWithCollection = await Promise.all(
      nfts.map(async (nft) => {
        const collection = await prisma.collection.findUnique({
          where: { address: nft.contractAddress },
        })
        return { ...nft, collection }
      })
    )

    return nftsWithCollection
  }

  /**
   * Refresh stale NFT metadata
   */
  async refreshStaleMetadata(limit: number = 100): Promise<number> {
    const staleThreshold = new Date(Date.now() - REFRESH_THRESHOLD)
    
    const staleNFTs = await prisma.nFT.findMany({
      where: {
        updatedAt: {
          lt: staleThreshold,
        },
      },
      take: limit,
      orderBy: {
        updatedAt: 'asc',
      },
    })

    let refreshedCount = 0
    
    for (const nft of staleNFTs) {
      try {
        await this.getNFTMetadata(nft.contractAddress, nft.tokenId, true)
        refreshedCount++
      } catch (error) {
        console.error(`Error refreshing ${nft.contractAddress}:${nft.tokenId}:`, error)
      }
    }

    return refreshedCount
  }

  /**
   * Update or create collection metadata
   */
  private async updateOrCreateCollection(nftData: ProcessedNFTMetadata): Promise<void> {
    if (!nftData.collectionName || !nftData.contractAddress) return

    try {
      // Try to get more collection data from Alchemy
      const contractData = await alchemyService.getContractMetadata(nftData.contractAddress)
      
      await prisma.collection.upsert({
        where: {
          address: nftData.contractAddress,
        },
        update: {
          name: nftData.collectionName,
          slug: nftData.collectionSlug || nftData.collectionName.toLowerCase().replace(/\s+/g, '-'),
          description: contractData.openSeaMetadata?.description,
          image: contractData.openSeaMetadata?.imageUrl,
          externalUrl: contractData.openSeaMetadata?.externalUrl,
          floorPrice: contractData.openSeaMetadata?.floorPrice?.toString(),
          updatedAt: new Date(),
        },
        create: {
          address: nftData.contractAddress,
          name: nftData.collectionName,
          slug: nftData.collectionSlug || nftData.collectionName.toLowerCase().replace(/\s+/g, '-'),
          description: contractData.openSeaMetadata?.description,
          image: contractData.openSeaMetadata?.imageUrl,
          externalUrl: contractData.openSeaMetadata?.externalUrl,
          floorPrice: contractData.openSeaMetadata?.floorPrice?.toString(),
        },
      })
    } catch (error) {
      console.error(`Error updating collection for ${nftData.contractAddress}:`, error)
      // Create basic collection record anyway
      await prisma.collection.upsert({
        where: {
          address: nftData.contractAddress,
        },
        update: {
          name: nftData.collectionName,
          updatedAt: new Date(),
        },
        create: {
          address: nftData.contractAddress,
          name: nftData.collectionName,
          slug: nftData.collectionSlug || nftData.collectionName.toLowerCase().replace(/\s+/g, '-'),
        },
      })
    }
  }

  /**
   * Check if cached data is fresh
   */
  private isCacheFresh(updatedAt: Date): boolean {
    const now = new Date()
    const cacheAge = now.getTime() - updatedAt.getTime()
    return cacheAge < CACHE_DURATION
  }

  /**
   * Get popular collections
   */
  async getPopularCollections(limit: number = 10): Promise<Collection[]> {
    return await prisma.collection.findMany({
      where: {
        isVerified: true,
      },
      orderBy: [
        { totalVolume: 'desc' },
        { totalSales: 'desc' },
      ],
      take: limit,
    })
  }

  /**
   * Get recently added NFTs
   */
  async getRecentNFTs(limit: number = 20): Promise<NFTWithCollection[]> {
    const nfts = await prisma.nFT.findMany({
      where: {
        isValidated: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    })

    // Get collection data for each NFT
    const nftsWithCollection = await Promise.all(
      nfts.map(async (nft) => {
        const collection = await prisma.collection.findUnique({
          where: { address: nft.contractAddress },
        })
        return { ...nft, collection }
      })
    )

    return nftsWithCollection
  }
}

// Export singleton instance
export const nftMetadataService = new NFTMetadataService()
export default nftMetadataService 