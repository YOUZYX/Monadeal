// Type overrides for Prisma client to handle linter issues
// This file provides proper TypeScript types that match our schema

export type NotificationType = 
  | 'DEAL_CREATED'
  | 'DEAL_ACCEPTED'
  | 'DEAL_COMPLETED'
  | 'DEAL_CANCELLED'
  | 'MESSAGE_RECEIVED'
  | 'DEPOSIT_MADE'
  | 'SYSTEM_ANNOUNCEMENT'

// Enhanced User type with all our fields
export interface UserWithExtensions {
  id: string
  address: string
  ensName?: string
  avatar?: string
  username?: string
  bio?: string
  isOnline: boolean
  lastSeen?: Date
  createdAt: Date
  updatedAt: Date
}

// Enhanced NFT type with all our fields
export interface NFTWithExtensions {
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
  lastSalePrice?: string
  floorPrice?: string
  rarity?: string
  traits?: any
  isValidated: boolean
  createdAt: Date
  updatedAt: Date
}

// Enhanced Message type with all our fields
export interface MessageWithExtensions {
  id: string
  dealId: string
  senderAddress: string
  content: string
  timestamp: Date
  type: 'TEXT' | 'SYSTEM' | 'DEAL_UPDATE' | 'IMAGE' | 'NFT_PREVIEW'
  isRead: boolean
  editedAt?: Date
  replyToId?: string
}

// Enhanced Deal type with all our fields
export interface DealWithExtensions {
  id: string
  type: 'BUY' | 'SELL' | 'SWAP'
  status: 'PENDING' | 'AWAITING_BUYER' | 'AWAITING_SELLER' | 'LOCKED_IN_ESCROW' | 'COMPLETED' | 'CANCELLED'
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
  onchainDealId?: string
  completedAt?: Date
  cancelledAt?: Date
  creatorDeposited: boolean
  counterpartyDeposited: boolean
  title?: string
  description?: string
}

// Enhanced Notification type
export interface NotificationWithExtensions {
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

// Collection type
export interface CollectionWithExtensions {
  id: string
  address: string
  name: string
  slug: string
  description?: string
  image?: string
  externalUrl?: string
  floorPrice?: string
  totalVolume: string
  totalSales: number
  isVerified: boolean
  createdAt: Date
  updatedAt: Date
}

// Platform Analytics type
export interface PlatformAnalyticsWithExtensions {
  id: string
  date: Date
  totalUsers: number
  activeUsers: number
  totalDeals: number
  completedDeals: number
  cancelledDeals: number
  totalVolume: string
  averageDealValue: string
  topCollection?: string
  createdAt: Date
} 