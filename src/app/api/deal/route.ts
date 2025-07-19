import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createDeal, createOrUpdateUser, createNotification, createMessage, updateDealStatus } from '@/lib/database'
import { DealType } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const createDealSchema = z.object({
  type: z.enum(['BUY', 'SELL', 'SWAP']),
  creatorAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  nftContractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address'),
  nftTokenId: z.string(),
  price: z.string().optional(),
  counterpartyAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid counterparty address').optional(),
  swapNftContract: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid swap contract address').optional(),
  swapTokenId: z.string().optional(),
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  expiresAt: z.string().datetime().optional(),
  // Optional blockchain data (to be filled after client-side transaction)
  transactionHash: z.string().optional(),
  escrowContractAddress: z.string().optional(),
})

function generateWelcomeMessage(dealData: any, nftName: string): string {
  const { type, price } = dealData
  
  switch (type) {
    case 'BUY':
      return `🎯 Hey! I'm interested in buying your ${nftName} for ${price} MON. Are you open to this offer? Let's discuss! 💎`
    case 'SELL':
      return `💰 Hi there! I'm offering my ${nftName} for ${price} MON. Would you like to purchase it? Let's chat about the details! ✨`
    case 'SWAP':
      return `🔄 Hey! I'd like to propose a swap - my NFT for your ${nftName}. Let's discuss this trade opportunity! 🤝`
    default:
      return `👋 Hi! I've created a deal proposal for ${nftName}. Let's discuss the details! 💬`
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createDealSchema.parse(body)

    // Validate deal type specific requirements
    if (validatedData.type === 'BUY' || validatedData.type === 'SELL') {
      if (!validatedData.price) {
        return NextResponse.json(
          { error: 'Price is required for BUY/SELL deals' },
          { status: 400 }
        )
      }
    }

    if (validatedData.type === 'SWAP') {
      if (!validatedData.swapNftContract || !validatedData.swapTokenId) {
        return NextResponse.json(
          { error: 'Swap NFT details are required for SWAP deals' },
          { status: 400 }
        )
      }
    }

    // Ensure creator user exists
    await createOrUpdateUser(validatedData.creatorAddress)

    // Create counterparty user if specified
    if (validatedData.counterpartyAddress) {
      await createOrUpdateUser(validatedData.counterpartyAddress)
    }

    // Create the deal in database
    let deal = await createDeal({
      type: validatedData.type as DealType,
      creatorAddress: validatedData.creatorAddress,
      nftContractAddress: validatedData.nftContractAddress,
      nftTokenId: validatedData.nftTokenId,
      price: validatedData.price,
      counterpartyAddress: validatedData.counterpartyAddress,
      swapNftContract: validatedData.swapNftContract,
      swapTokenId: validatedData.swapTokenId,
      title: validatedData.title,
      description: validatedData.description,
      expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined,
    })

    // Update with blockchain data if provided
    if (validatedData.transactionHash || validatedData.escrowContractAddress) {
      deal = await updateDealStatus(deal.id, 'PENDING', {
        transactionHash: validatedData.transactionHash,
        escrowContractAddress: validatedData.escrowContractAddress,
      })
    }

    // Create notification for counterparty if specified
    if (validatedData.counterpartyAddress) {
      await createNotification({
        userId: validatedData.counterpartyAddress,
        dealId: deal.id,
        type: 'DEAL_CREATED',
        title: 'New Deal Proposal',
        message: `You have a new ${validatedData.type.toLowerCase()} deal proposal`,
        data: {
          dealId: deal.id,
          dealType: validatedData.type,
          creatorAddress: validatedData.creatorAddress,
        },
      })
    }

    // Create automatic welcome message to start the conversation
    if (validatedData.counterpartyAddress) {
      // Try to get NFT name from database first
      let nftName = `NFT #${validatedData.nftTokenId}`
      
      try {
        const nftData = await prisma.nFT.findUnique({
          where: {
            contractAddress_tokenId: {
              contractAddress: validatedData.nftContractAddress,
              tokenId: validatedData.nftTokenId
            }
          },
          select: {
            name: true,
            collectionName: true
          }
        })
        
        if (nftData) {
          nftName = nftData.collectionName && nftData.name
            ? `${nftData.collectionName} ${nftData.name}`
            : nftData.name
        }
      } catch (error) {
        console.warn('Failed to fetch NFT name for welcome message:', error)
        // Fall back to default NFT #tokenId format
      }
      
      const welcomeMessage = generateWelcomeMessage(validatedData, nftName)
      await createMessage({
        dealId: deal.id,
        senderAddress: validatedData.creatorAddress,
        content: welcomeMessage,
        type: 'TEXT',
      })
    }

    return NextResponse.json({
      success: true,
      deal,
      message: 'Deal created successfully in database',
    })
  } catch (error) {
    console.error('Error creating deal:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create deal' },
      { status: 500 }
    )
  }
} 