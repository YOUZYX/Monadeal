import { 
  CreateDealRequest, 
  AcceptDealRequest, 
  SendMessageRequest, 
  UpdateUserRequest,
  SearchDealsParams,
  GetMessagesParams,
  GetNotificationsParams,
  ApiResponse,
  DealWithRelations,
  MessageWithRelations,
  UserProfile,
  NotificationData
} from '@/types/api'
import { NFTWithCollection, UserNFTsResponse, CollectionStats } from '@/lib/nft-metadata'
import { Collection } from '@prisma/client'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api'

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }))
      throw new Error(error.error || 'API request failed')
    }

    return response.json()
  }

  // Deal API methods
  async createDeal(data: CreateDealRequest): Promise<DealWithRelations> {
    const response = await this.request<{ deal: DealWithRelations }>('/deal', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.deal
  }

  async getDeal(dealId: string): Promise<DealWithRelations> {
    const response = await this.request<{ deal: DealWithRelations }>(`/deal/${dealId}`)
    return response.deal
  }

  async acceptDeal(dealId: string, data: AcceptDealRequest): Promise<DealWithRelations> {
    const response = await this.request<{ deal: DealWithRelations }>(`/deal/${dealId}/accept`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.deal
  }

  async getUserDeals(
    address: string,
    params: { status?: string; limit?: number; offset?: number } = {}
  ): Promise<{ deals: DealWithRelations[]; pagination: any }> {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString())
      }
    })

    const response = await this.request<{ deals: DealWithRelations[]; pagination: any }>(
      `/deals/user/${address}?${searchParams.toString()}`
    )
    return response
  }

  async searchDeals(params: SearchDealsParams = {}): Promise<{ deals: DealWithRelations[]; pagination: any }> {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString())
      }
    })

    const response = await this.request<{ deals: DealWithRelations[]; pagination: any }>(
      `/deals/search?${searchParams.toString()}`
    )
    return response
  }

  // Message API methods
  async sendMessage(data: SendMessageRequest): Promise<MessageWithRelations> {
    const response = await this.request<{ message: MessageWithRelations }>('/message', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.message!
  }

  async getMessages(
    dealId: string,
    params: GetMessagesParams = {}
  ): Promise<{ messages: MessageWithRelations[]; pagination: any }> {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString())
      }
    })

    const response = await this.request<{ messages: MessageWithRelations[]; pagination: any }>(
      `/messages/${dealId}?${searchParams.toString()}`
    )
    return { messages: response.messages!, pagination: response.pagination! }
  }

  // User API methods
  async getUser(address: string): Promise<UserProfile> {
    const response = await this.request<{ user: UserProfile }>(`/user/${address}`)
    return response.user!
  }

  async updateUser(address: string, data: UpdateUserRequest): Promise<UserProfile> {
    const response = await this.request<{ user: UserProfile }>(`/user/${address}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return response.user!
  }

  // Notification API methods
  async getNotifications(
    userId: string,
    params: GetNotificationsParams = {}
  ): Promise<{ notifications: NotificationData[]; pagination: any }> {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString())
      }
    })

    const response = await this.request<{ notifications: NotificationData[]; pagination: any }>(
      `/notifications/${userId}?${searchParams.toString()}`
    )
    return { notifications: response.notifications!, pagination: response.pagination! }
  }

  async markNotificationAsRead(notificationId: string): Promise<NotificationData> {
    const response = await this.request<{ notification: NotificationData }>(
      `/notifications/${notificationId}/read`,
      { method: 'PUT' }
    )
    return response.notification!
  }

  // NFT API methods
  async getNFTMetadata(
    contractAddress: string,
    tokenId: string,
    refresh?: boolean
  ): Promise<NFTWithCollection> {
    const searchParams = new URLSearchParams()
    if (refresh) {
      searchParams.append('refresh', 'true')
    }

    const response = await this.request<{ nft: NFTWithCollection }>(
      `/nft/${contractAddress}/${tokenId}?${searchParams.toString()}`
    )
    return response.nft
  }

  async validateNFTOwnership(
    contractAddress: string,
    tokenId: string,
    expectedOwner: string
  ): Promise<{ isValid: boolean; actualOwner?: string; error?: string }> {
    const response = await this.request<{ validation: any }>(
      `/nft/${contractAddress}/${tokenId}`,
      {
        method: 'POST',
        body: JSON.stringify({ expectedOwner }),
      }
    )
    return response.validation
  }

  async getUserNFTs(
    address: string,
    params: {
      contractAddresses?: string[]
      pageKey?: string
      pageSize?: number
      refresh?: boolean
    } = {}
  ): Promise<UserNFTsResponse> {
    const searchParams = new URLSearchParams()
    
    if (params.contractAddresses) {
      searchParams.append('contractAddresses', params.contractAddresses.join(','))
    }
    if (params.pageKey) {
      searchParams.append('pageKey', params.pageKey)
    }
    if (params.pageSize) {
      searchParams.append('pageSize', params.pageSize.toString())
    }
    if (params.refresh) {
      searchParams.append('refresh', 'true')
    }

    const response = await this.request<UserNFTsResponse>(
      `/nfts/user/${address}?${searchParams.toString()}`
    )
    return response
  }

  async searchNFTs(params: {
    name?: string
    collectionAddress?: string
    collectionSlug?: string
    owner?: string
    traits?: Record<string, any>
    limit?: number
    offset?: number
  } = {}): Promise<{ nfts: NFTWithCollection[]; count: number; pagination: any }> {
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'traits') {
          searchParams.append(key, JSON.stringify(value))
        } else {
          searchParams.append(key, value.toString())
        }
      }
    })

    const response = await this.request<{ nfts: NFTWithCollection[]; count: number; pagination: any }>(
      `/nfts/search?${searchParams.toString()}`
    )
    return response
  }

  async getPopularCollections(limit?: number): Promise<Collection[]> {
    const searchParams = new URLSearchParams()
    if (limit) {
      searchParams.append('limit', limit.toString())
    }

    const response = await this.request<{ collections: Collection[] }>(
      `/collections?${searchParams.toString()}`
    )
    return response.collections
  }

  async getCollectionStats(contractAddress: string): Promise<CollectionStats> {
    const response = await this.request<{ stats: CollectionStats }>(
      `/collections/${contractAddress}/stats`
    )
    return response.stats
  }

  async getRecentNFTs(limit?: number): Promise<NFTWithCollection[]> {
    const searchParams = new URLSearchParams()
    if (limit) {
      searchParams.append('limit', limit.toString())
    }

    const response = await this.request<{ nfts: NFTWithCollection[] }>(
      `/nfts/refresh?${searchParams.toString()}`
    )
    return response.nfts
  }

  async refreshNFTMetadata(limit?: number): Promise<{ refreshedCount: number; message: string }> {
    const response = await this.request<{ refreshedCount: number; message: string }>(
      '/nfts/refresh',
      {
        method: 'POST',
        body: JSON.stringify({ limit }),
      }
    )
    return response
  }
}

// Export singleton instance
export const apiClient = new ApiClient()

// Export individual methods for convenience
export const {
  createDeal,
  getDeal,
  acceptDeal,
  getUserDeals,
  searchDeals,
  sendMessage,
  getMessages,
  getUser,
  updateUser,
  getNotifications,
  markNotificationAsRead,
  getNFTMetadata,
  validateNFTOwnership,
  getUserNFTs,
  searchNFTs,
  getPopularCollections,
  getCollectionStats,
  getRecentNFTs,
  refreshNFTMetadata,
} = apiClient 