const BLOCKVISION_API_KEY = process.env.BLOCKVISION_API_KEY || process.env.NEXT_PUBLIC_BLOCKVISION_API_KEY
const BLOCKVISION_BASE_URL = 'https://api.blockvision.org/v2/monad'

interface BlockVisionNFTItem {
  name: string
  contractAddress: string
  tokenId: string
  image?: string
  qty: string
}

interface BlockVisionCollection {
  contractAddress: string
  verified: boolean
  name: string
  image?: string
  ercStandard: string
  items: BlockVisionNFTItem[]
}

interface BlockVisionCollectionHolder {
  ownerAddress: string
  amount: string
  uniqueTokens: number
  percentage: string
  isContract: boolean
}

interface BlockVisionCollectionHoldersResponse {
  code: number
  message: string
  result: {
    data: BlockVisionCollectionHolder[]
    nextPageIndex?: number
  }
}

interface BlockVisionAccountNFTsResponse {
  code: number
  message: string
  result: {
    data: BlockVisionCollection[]
    total: number
    nextPageIndex?: number
    unknownTotal: number
    verifiedTotal: number
    collectionTotal: number
  }
}

export class BlockVisionService {
  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    try {
      console.log(`🚀 BlockVision: Making request to ${endpoint}`)
      
      const url = new URL(`${BLOCKVISION_BASE_URL}${endpoint}`)
      
      // Add query parameters
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value.toString())
        }
      })

      console.log(`📡 BlockVision: Request URL: ${url.toString()}`)

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'x-api-key': BLOCKVISION_API_KEY || ''
        }
      })

      console.log(`📊 BlockVision: Response status: ${response.status}`)

      if (!response.ok) {
        if (response.status === 429) {
          console.log(`⏰ BlockVision: Rate limit exceeded`)
          throw new Error('Rate limit exceeded. Please try again in a moment.')
        }
        console.log(`❌ BlockVision: HTTP error ${response.status}`)
        throw new Error(`BlockVision API error: ${response.status} ${response.statusText}`)
      }

      const responseText = await response.text()
      console.log(`📄 BlockVision: Response length: ${responseText.length}`)

      if (!responseText.trim()) {
        console.log(`❌ BlockVision: Empty response body`)
        throw new Error('Empty response from BlockVision API')
      }

      let data: any
      try {
        data = JSON.parse(responseText)
        console.log(`✅ BlockVision: JSON parsed successfully`)
      } catch (parseError) {
        console.log(`❌ BlockVision: JSON parse error`)
        throw new Error(`Invalid JSON response from BlockVision API: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
      }
      
      // Check if the API returned an error in the response body
      if (data.code !== 0) {
        console.log(`❌ BlockVision: API error code ${data.code}: ${data.message}`)
        throw new Error(data.message || 'BlockVision API error')
      }
      
      console.log(`🎯 BlockVision: Request successful`)
      return data
    } catch (error) {
      console.error(`💥 BlockVision: Request failed:`, error)
      throw error
    }
  }

  /**
   * Get collection holders by contract address
   */
  async getCollectionHolders(
    contractAddress: string,
    options: {
      pageIndex?: number
      pageSize?: number
    } = {}
  ): Promise<{
    success: boolean
    data: {
      holders: Array<{
        ownerAddress: string
        balance: number
        tokenIds?: string[]
      }>
      totalCount: number
    }
  }> {
    try {
      console.log(`🔍 BlockVision: Getting collection holders for ${contractAddress}`)
      
      const params = {
        contractAddress: contractAddress.toLowerCase(),
        pageIndex: options.pageIndex || 1,
        pageSize: Math.min(options.pageSize || 20, 100) // Limit to 100 max
      }

      console.log(`📊 BlockVision: Request params:`, params)

      const response = await this.makeRequest<BlockVisionCollectionHoldersResponse>(
        '/collection/holders',
        params
      )

      console.log(`📊 BlockVision: Response received:`, {
        dataLength: response.result?.data?.length || 0,
        nextPageIndex: response.result?.nextPageIndex || 'none'
      })

      // Transform the response to match our expected format
      const holders = response.result.data.map(holder => ({
        ownerAddress: holder.ownerAddress,
        balance: holder.uniqueTokens,
        tokenIds: [] // BlockVision doesn't provide individual token IDs in this endpoint
      }))

      // Calculate estimated total count based on pagination
      const currentPage = params.pageIndex
      const pageSize = params.pageSize
      const hasNextPage = !!response.result.nextPageIndex
      
      // If there's a next page, estimate total as at least (current page * page size + 1)
      // If no next page, total is (previous pages * page size + current page count)
      const estimatedTotal = hasNextPage 
        ? (currentPage * pageSize) + 1 // At least one more page
        : ((currentPage - 1) * pageSize) + holders.length

      console.log(`📊 BlockVision: Holders processed:`, {
        holdersCount: holders.length,
        estimatedTotal,
        hasNextPage
      })

      return {
        success: true,
        data: {
          holders,
          totalCount: estimatedTotal
        }
      }
    } catch (error) {
      console.error(`❌ BlockVision: Error fetching collection holders for ${contractAddress}:`, error)
      // Re-throw the error to be handled by the calling code
      throw error
    }
  }

  /**
   * Get account NFTs by wallet address
   */
  async getAccountNFTs(
    address: string,
    options: {
      pageIndex?: number
      pageSize?: number
      verified?: boolean
      unknown?: boolean
    } = {}
  ): Promise<{
    success: boolean
    data: {
      nfts: Array<{
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
      totalCount: number
    }
  }> {
    try {
      const params = {
        address: address.toLowerCase(),
        pageIndex: options.pageIndex || 1,
        pageSize: Math.min(options.pageSize || 20, 100), // Limit to 100 max
        verified: options.verified !== undefined ? options.verified : false,
        unknown: options.unknown !== undefined ? options.unknown : false
      }

      const response = await this.makeRequest<BlockVisionAccountNFTsResponse>(
        '/account/nfts',
        params
      )

      // Transform the response by flattening collection items into individual NFTs
      const allNFTs: Array<{
        contractAddress: string
        tokenId: string
        name?: string
        description?: string
        image?: string
        collection?: {
          name?: string
          contractAddress: string
        }
      }> = []

      // Flatten all items from all collections
      response.result.data.forEach(collection => {
        collection.items.forEach(item => {
          allNFTs.push({
            contractAddress: item.contractAddress,
            tokenId: item.tokenId,
            name: item.name,
            description: undefined, // Not provided in this API
            image: item.image,
            collection: {
              name: collection.name,
              contractAddress: collection.contractAddress
            }
          })
        })
      })

      return {
        success: true,
        data: {
          nfts: allNFTs,
          totalCount: response.result.total // Use the total from API
        }
      }
    } catch (error) {
      console.error(`Error fetching NFTs for account ${address}:`, error)
      throw error
    }
  }
}

// Utility function to detect search type
export function detectSearchType(query: string): 'contract' | 'wallet' | 'invalid' {
  const cleanQuery = query.trim()
  
  // Check if it's a valid Ethereum address
  if (/^0x[a-fA-F0-9]{40}$/.test(cleanQuery)) {
    // For now, we'll need additional logic to distinguish between contract and wallet
    // This is a simplified version - in practice you might want to check on-chain
    return 'contract' // Default to contract for valid addresses
  }
  
  return 'invalid'
}

// Simplified function that tries contract first, then wallet (with rate limiting consideration)
export async function isContractAddress(address: string): Promise<boolean> {
  try {
    // First try collection holders - if it works, it's likely a contract
    const blockVisionService = new BlockVisionService()
    await blockVisionService.getCollectionHolders(address, { pageSize: 1 })
    return true
  } catch (error) {
    // If it fails for any reason (including rate limits), assume it's a wallet
    return false
  }
}

export const blockVisionService = new BlockVisionService() 