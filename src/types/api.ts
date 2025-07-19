import { DealType, DealStatus, MessageType } from '@prisma/client'

// Define NotificationType locally as a workaround
export type NotificationType = 
  | 'DEAL_CREATED'
  | 'DEAL_ACCEPTED'
  | 'DEAL_COMPLETED'
  | 'DEAL_CANCELLED'
  | 'MESSAGE_RECEIVED'
  | 'DEPOSIT_MADE'
  | 'SYSTEM_ANNOUNCEMENT'

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  details?: any
}

// Pagination
export interface PaginationParams {
  limit?: number
  offset?: number
}

export interface PaginationResponse {
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

// Deal API Types
export interface CreateDealRequest {
  type: DealType
  creatorAddress: string
  nftContractAddress: string
  nftTokenId: string
  price?: string
  counterpartyAddress?: string
  swapNftContract?: string
  swapTokenId?: string
  title?: string
  description?: string
  expiresAt?: string
}

export interface AcceptDealRequest {
  counterpartyAddress: string
}

export interface UpdateDealStatusRequest {
  status: DealStatus
  escrowContractAddress?: string
  transactionHash?: string
  creatorDeposited?: boolean
  counterpartyDeposited?: boolean
}

// Message API Types
export interface SendMessageRequest {
  dealId: string
  senderAddress: string
  content: string
  type?: MessageType
  replyToId?: string
}

export interface GetMessagesParams extends PaginationParams {
  userAddress?: string
}

// User API Types
export interface UpdateUserRequest {
  ensName?: string
  avatar?: string
  username?: string
  bio?: string
  isOnline?: boolean
}

export interface UserProfile {
  id: string
  address: string
  ensName?: string
  avatar?: string
  username?: string
  bio?: string
  isOnline: boolean
  lastSeen?: Date
  createdAt: Date
  _count: {
    dealsCreated: number
    dealsParticipant: number
  }
}

// Notification API Types
export interface GetNotificationsParams extends PaginationParams {
  unreadOnly?: boolean
}

export interface NotificationData {
  id: string
  userId: string
  dealId?: string
  type: NotificationType
  title: string
  message: string
  data?: any
  isRead: boolean
  createdAt: Date
}

// Search API Types
export interface SearchDealsParams extends PaginationParams {
  type?: DealType
  status?: DealStatus
  minPrice?: string
  maxPrice?: string
  collectionAddress?: string
  createdAfter?: string
  createdBefore?: string
}

// NFT API Types
export interface NFTMetadata {
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
  metadata?: any
  owner?: string
  traits?: any
  rarity?: string
  floorPrice?: string
  lastSalePrice?: string
  isValidated: boolean
}

// Deal with relations
export interface DealWithRelations {
  id: string
  type: DealType
  status: DealStatus
  createdAt: Date
  updatedAt: Date
  expiresAt?: Date
  creatorAddress: string
  counterpartyAddress?: string
  nftContractAddress: string
  nftTokenId: string
  price?: string
  swapNftContract?: string
  swapTokenId?: string
  escrowContractAddress?: string
  transactionHash?: string
  completedAt?: Date
  cancelledAt?: Date
  creatorDeposited: boolean
  counterpartyDeposited: boolean
  title?: string
  description?: string
  // Counter offer fields
  counterOfferPrice?: string
  counterOfferBy?: string
  counterOfferAt?: Date
  counterOfferStatus?: 'PENDING' | 'ACCEPTED' | 'DECLINED'
  creator: UserProfile
  counterparty?: UserProfile
  nft?: NFTMetadata
  swapNft?: NFTMetadata
  _count?: {
    messages: number
  }
}

// Message with relations
export interface MessageWithRelations {
  id: string
  dealId: string
  senderAddress: string
  content: string
  timestamp: Date
  type: MessageType
  isRead: boolean
  editedAt?: Date
  replyToId?: string
  sender: UserProfile
  replyTo?: MessageWithRelations
}

// WebSocket Events
export interface WebSocketMessage {
  type: 'message' | 'deal_update' | 'notification' | 'user_online' | 'user_offline'
  data: any
  timestamp: Date
}

export interface DealUpdateEvent {
  dealId: string
  status: DealStatus
  updatedBy: string
  timestamp: Date
}

export interface UserStatusEvent {
  address: string
  isOnline: boolean
  timestamp: Date
} 