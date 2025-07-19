import { prisma } from './prisma'
import { DealType, DealStatus, MessageType } from '@prisma/client'
import { NotificationType } from '@/types/prisma-override'

// User utilities
export async function createOrUpdateUser(address: string, userData?: {
  ensName?: string
  ensChecked?: boolean
  avatar?: string
  avatarImage?: string
  username?: string
  bio?: string
  isOnline?: boolean
}) {
  // Normalize address to lowercase to prevent duplicates
  const normalizedAddress = address.toLowerCase()
  
  return await prisma.user.upsert({
    where: { address: normalizedAddress },
    update: {
      ...userData,
      isOnline: userData?.isOnline ?? true,
      lastSeen: new Date(),
    },
    create: {
      address: normalizedAddress,
      ...userData,
      isOnline: userData?.isOnline ?? true,
      lastSeen: new Date(),
    },
  })
}

export async function setUserOnlineStatus(address: string, isOnline: boolean) {
  return await prisma.user.update({
    where: { address: address.toLowerCase() },
    data: {
      isOnline,
      lastSeen: new Date(),
    },
  })
}

// Deal utilities
export async function createDeal(dealData: {
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
  expiresAt?: Date
}) {
  return await prisma.deal.create({
    data: {
      ...dealData,
      creatorAddress: dealData.creatorAddress.toLowerCase(),
      counterpartyAddress: dealData.counterpartyAddress?.toLowerCase(),
    },
    include: {
      creator: true,
      counterparty: true,
      nft: true,
      swapNft: true,
    },
  })
}

export async function updateDealStatus(dealId: string, status: DealStatus, updates?: {
  escrowContractAddress?: string
  transactionHash?: string
  onchainDealId?: string
  creatorDeposited?: boolean
  counterpartyDeposited?: boolean
  completedAt?: Date
  cancelledAt?: Date
  counterpartyAddress?: string
}) {
  return await prisma.deal.update({
    where: { id: dealId },
    data: {
      status,
      ...updates,
    },
    include: {
      creator: true,
      counterparty: true,
      nft: true,
      swapNft: true,
    },
  })
}

// Transaction utilities
export async function createTransaction(transactionData: {
  dealId: string
  userAddress: string
  type: 'CREATE_DEAL' | 'ACCEPT_DEAL' | 'APPROVE_NFT' | 'DEPOSIT_NFT' | 'DEPOSIT_PAYMENT' | 'UPDATE_PRICE' | 'CANCEL_DEAL' | 'COMPLETE_DEAL' | 'COUNTER_OFFER' | 'ACCEPT_COUNTER_OFFER' | 'DECLINE_COUNTER_OFFER'
  hash: string
  blockNumber?: string
  gasUsed?: string
  gasFee?: string
  amount?: string
  contractAddress?: string
  status?: 'PENDING' | 'CONFIRMED' | 'FAILED'
}) {
  return await prisma.transaction.create({
    data: {
      ...transactionData,
      userAddress: transactionData.userAddress.toLowerCase(),
      status: transactionData.status || 'CONFIRMED', // Default to CONFIRMED since we only save successful transactions
      confirmedAt: transactionData.status === 'CONFIRMED' || !transactionData.status ? new Date() : undefined,
    },
    include: {
      deal: true,
      user: true,
    },
  })
}

export async function updateTransactionStatus(
  hash: string, 
  status: 'PENDING' | 'CONFIRMED' | 'FAILED',
  updates?: {
    blockNumber?: string
    gasUsed?: string
    gasFee?: string
    confirmedAt?: Date
  }
) {
  return await prisma.transaction.update({
    where: { hash },
    data: {
      status,
      ...updates,
      confirmedAt: status === 'CONFIRMED' ? (updates?.confirmedAt || new Date()) : undefined,
    },
    include: {
      deal: true,
      user: true,
    },
  })
}

export async function getTransactionsByDeal(dealId: string) {
  return await prisma.transaction.findMany({
    where: { dealId },
    include: {
      user: {
        select: {
          address: true,
          ensName: true,
          username: true,
          avatar: true,
          avatarImage: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  })
}

export async function getTransactionByHash(hash: string) {
  return await prisma.transaction.findUnique({
    where: { hash },
    include: {
      deal: true,
      user: true,
    },
  })
}

export async function getUserDeals(
  address: string, 
  status?: DealStatus,
  limit: number = 20,
  offset: number = 0
) {
  const normalizedAddress = address.toLowerCase()
  
  // Optimized query with better performance
  return await prisma.deal.findMany({
    where: {
      OR: [
        { creatorAddress: normalizedAddress },
        { counterpartyAddress: normalizedAddress },
      ],
      ...(status && { status }),
    },
    include: {
      creator: {
        select: {
          id: true,
          address: true,
          ensName: true,
          username: true,
          avatar: true, // URL-based avatars only, exclude avatarImage (large base64)
          isOnline: true,
          lastSeen: true,
        }
      },
      counterparty: {
        select: {
          id: true,
          address: true,
          ensName: true,
          username: true,
          avatar: true, // URL-based avatars only, exclude avatarImage (large base64)
          isOnline: true,
          lastSeen: true,
        }
      },
      nft: {
        select: {
          contractAddress: true,
          tokenId: true,
          name: true,
          image: true,
          imageUrl: true,
          collectionName: true,
          // Exclude large fields like metadata, traits, description
        }
      },
      swapNft: {
        select: {
          contractAddress: true,
          tokenId: true,
          name: true,
          image: true,
          imageUrl: true,
          collectionName: true,
          // Exclude large fields like metadata, traits, description
        }
      },
      _count: {
        select: { messages: true },
      },
    },
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' } // Secondary sort for consistent pagination
    ],
    take: Math.min(limit, 100), // Cap at 100 to prevent excessive data transfer
    skip: offset,
  })
}

export async function getUserDealsCount(address: string, status?: DealStatus) {
  const normalizedAddress = address.toLowerCase()
  return await prisma.deal.count({
    where: {
      OR: [
        { creatorAddress: normalizedAddress },
        { counterpartyAddress: normalizedAddress },
      ],
      ...(status && { status }),
    },
  })
}

// NFT utilities
export async function cacheNFTMetadata(nftData: {
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
}) {
  return await prisma.nFT.upsert({
    where: {
      contractAddress_tokenId: {
        contractAddress: nftData.contractAddress,
        tokenId: nftData.tokenId,
      },
    },
    update: {
      ...nftData,
      isValidated: true,
    },
    create: {
      ...nftData,
      isValidated: true,
    },
  })
}

export async function getNFTMetadata(contractAddress: string, tokenId: string) {
  return await prisma.nFT.findUnique({
    where: {
      contractAddress_tokenId: {
        contractAddress,
        tokenId,
      },
    },
  })
}

// Message utilities
export async function createMessage(messageData: {
  dealId: string
  senderAddress: string
  content: string
  type?: MessageType
  replyToId?: string
}) {
  // Create message with minimal user data
  const message = await prisma.message.create({
    data: {
      ...messageData,
      senderAddress: messageData.senderAddress.toLowerCase(),
    },
    include: {
      sender: {
        select: {
          address: true,
          username: true,
          ensName: true,
          avatar: true, // URL-based avatars are small
          isOnline: true,
          lastSeen: true,
        }
      },
      replyTo: {
        select: {
          id: true,
          content: true,
          senderAddress: true,
          sender: {
            select: {
              address: true,
              username: true,
              ensName: true,
              avatar: true,
            }
          }
        }
      },
    },
  })

  // Collect addresses that need avatar images
  const addressesToFetch = [messageData.senderAddress.toLowerCase()]
  if (message.replyTo?.senderAddress) {
    addressesToFetch.push(message.replyTo.senderAddress)
  }

  // Fetch avatarImage for all relevant users
  const usersWithAvatars = await prisma.user.findMany({
    where: { address: { in: addressesToFetch } },
    select: { 
      address: true, 
      avatarImage: true 
    }
  })

  // Create a map for quick lookup
  const avatarImageMap = new Map(
    usersWithAvatars.map(user => [user.address, user.avatarImage])
  )

  // Merge avatar images back into the message
  return {
    ...message,
    sender: {
      ...message.sender,
      avatarImage: avatarImageMap.get(messageData.senderAddress.toLowerCase()) || null
    },
    replyTo: message.replyTo ? {
      ...message.replyTo,
      sender: {
        ...message.replyTo.sender,
        avatarImage: avatarImageMap.get(message.replyTo.senderAddress) || null
      }
    } : null
  }
}

export async function getDealMessages(dealId: string, limit = 50, offset = 0) {
  // First, get messages with minimal user data
  const messages = await prisma.message.findMany({
    where: { dealId },
    include: {
      sender: {
        select: {
          address: true,
          username: true,
          ensName: true,
          avatar: true, // URL-based avatars are small
          isOnline: true,
          lastSeen: true,
        }
      },
      replyTo: {
        select: {
          id: true,
          content: true,
          senderAddress: true,
          sender: {
            select: {
              address: true,
              username: true,
              ensName: true,
              avatar: true,
            }
          }
        }
      },
    },
    orderBy: { timestamp: 'desc' },
    take: Math.min(limit, 15), // Conservative limit to allow for avatar images
    skip: offset,
  })

  // Get unique sender addresses from the messages (including reply-to senders)
  const senderAddresses = [...new Set(messages.map(msg => msg.senderAddress))]
  const replyToSenderAddresses = messages
    .filter(msg => msg.replyTo?.senderAddress)
    .map(msg => msg.replyTo!.senderAddress)
  const allSenderAddresses = [...new Set([...senderAddresses, ...replyToSenderAddresses])]
  
  // Fetch avatarImage separately for unique senders only (much smaller dataset)
  const avatarImages = await prisma.user.findMany({
    where: {
      address: { in: allSenderAddresses }
    },
    select: {
      address: true,
      avatarImage: true, // Only fetch avatar images for unique users
    }
  })

  // Create a map for quick lookup
  const avatarImageMap = new Map(
    avatarImages.map(user => [user.address, user.avatarImage])
  )

  // Merge avatar images back into messages
  const messagesWithAvatars = messages.map(message => ({
    ...message,
    sender: {
      ...message.sender,
      avatarImage: avatarImageMap.get(message.senderAddress) || null
    },
    replyTo: message.replyTo ? {
      ...message.replyTo,
      sender: {
        ...message.replyTo.sender,
        avatarImage: avatarImageMap.get(message.replyTo.senderAddress) || null
      }
    } : null
  }))

  return messagesWithAvatars
}

export async function markMessagesAsRead(dealId: string, userAddress: string) {
  return await prisma.message.updateMany({
    where: {
      dealId,
      senderAddress: { not: userAddress.toLowerCase() },
      isRead: false,
    },
    data: { isRead: true },
  })
}

// Notification utilities
export async function createNotification(notificationData: {
  userId: string
  dealId?: string
  type: NotificationType
  title: string
  message: string
  data?: any
}) {
  return await prisma.notification.create({
    data: {
      ...notificationData,
      userId: notificationData.userId.toLowerCase(),
    },
    include: {
      user: true,
      deal: true,
    },
  })
}

export async function getUserNotifications(userId: string, unreadOnly = false) {
  return await prisma.notification.findMany({
    where: {
      userId: userId.toLowerCase(),
      ...(unreadOnly && { isRead: false }),
    },
    include: {
      deal: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function markNotificationAsRead(notificationId: string) {
  return await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  })
}

// Analytics utilities
export async function updatePlatformAnalytics() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [totalUsers, activeUsers, totalDeals, completedDeals, cancelledDeals] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isOnline: true } }),
    prisma.deal.count(),
    prisma.deal.count({ where: { status: 'COMPLETED' } }),
    prisma.deal.count({ where: { status: 'CANCELLED' } }),
  ])

  const completedDealsWithPrice = await prisma.deal.findMany({
    where: { 
      status: 'COMPLETED',
      price: { not: null },
    },
    select: { price: true },
  })

  const totalVolume = completedDealsWithPrice.reduce((sum, deal) => {
    return sum + BigInt(deal.price || '0')
  }, BigInt(0))

  const averageDealValue = completedDeals > 0 ? totalVolume / BigInt(completedDeals) : BigInt(0)

  return await prisma.platformAnalytics.upsert({
    where: { date: today },
    update: {
      totalUsers,
      activeUsers,
      totalDeals,
      completedDeals,
      cancelledDeals,
      totalVolume: totalVolume.toString(),
      averageDealValue: averageDealValue.toString(),
    },
    create: {
      date: today,
      totalUsers,
      activeUsers,
      totalDeals,
      completedDeals,
      cancelledDeals,
      totalVolume: totalVolume.toString(),
      averageDealValue: averageDealValue.toString(),
    },
  })
}

// Collection utilities
export async function createOrUpdateCollection(collectionData: {
  address: string
  name: string
  slug: string
  description?: string
  image?: string
  externalUrl?: string
  floorPrice?: string
  isVerified?: boolean
}) {
  return await prisma.collection.upsert({
    where: { address: collectionData.address },
    update: collectionData,
    create: collectionData,
  })
}

export async function getPopularCollections(limit = 10) {
  return await prisma.collection.findMany({
    orderBy: [
      { totalVolume: 'desc' },
      { totalSales: 'desc' },
    ],
    take: limit,
  })
}

// Search utilities
export async function searchDeals(query: {
  type?: DealType
  status?: DealStatus
  minPrice?: string
  maxPrice?: string
  collectionAddress?: string
  createdAfter?: Date
  createdBefore?: Date
}) {
  return await prisma.deal.findMany({
    where: {
      ...(query.type && { type: query.type }),
      ...(query.status && { status: query.status }),
      ...(query.minPrice && { price: { gte: query.minPrice } }),
      ...(query.maxPrice && { price: { lte: query.maxPrice } }),
      ...(query.collectionAddress && { nftContractAddress: query.collectionAddress }),
      ...(query.createdAfter && { createdAt: { gte: query.createdAfter } }),
      ...(query.createdBefore && { createdAt: { lte: query.createdBefore } }),
    },
    include: {
      creator: true,
      counterparty: true,
      nft: true,
      swapNft: true,
    },
    orderBy: { createdAt: 'desc' },
  })
} 