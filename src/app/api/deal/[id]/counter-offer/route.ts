import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createMessage, createNotification } from '@/lib/database'
import { formatEther, parseEther } from 'viem'

const counterOfferSchema = z.object({
  counterOfferPrice: z.string().min(1, 'Price is required'),
  senderAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params
    const body = await request.json()
    const { counterOfferPrice, senderAddress } = counterOfferSchema.parse(body)

    // Normalize sender address
    const normalizedSenderAddress = senderAddress.toLowerCase()

    // Get the deal
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        creator: true,
        counterparty: true,
        nft: true,
      },
    })

    if (!deal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      )
    }

    // Check if sender is authorized to make counter offer
    // Only the NFT owner (counterparty) can make counter offers on BUY deals
    if (deal.type === 'BUY' && deal.counterpartyAddress !== normalizedSenderAddress) {
      return NextResponse.json(
        { error: 'Only the NFT owner can make counter offers' },
        { status: 403 }
      )
    }

    // Check if deal is in valid state for counter offers
    if (deal.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Counter offers can only be made on pending deals' },
        { status: 400 }
      )
    }

    // Convert wei format to human-readable format for consistent storage
    let formattedPrice: string
    try {
      // Frontend sends in wei format, convert to human-readable
      const priceInWei = BigInt(counterOfferPrice)
      formattedPrice = formatEther(priceInWei)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid price format. Price must be in wei format.' },
        { status: 400 }
      )
    }

    // Update the deal with counter offer
    const updatedDeal = await prisma.deal.update({
      where: { id: dealId },
      data: {
        counterOfferPrice: formattedPrice, // Store in human-readable format (e.g., "0.15")
        counterOfferBy: normalizedSenderAddress,
        counterOfferAt: new Date(),
        counterOfferStatus: 'PENDING',
        updatedAt: new Date(),
      },
      include: {
        creator: true,
        counterparty: true,
        nft: true,
      },
    })

    // Create a system message about the counter offer
    // Use the already formatted price
    const counterOfferEther = formattedPrice
    
    // Handle original price format safely
    const originalPriceEther = deal.price 
      ? (deal.price.includes('.') ? deal.price : formatEther(BigInt(deal.price)))
      : 'N/A'
    
    await createMessage({
      dealId,
      senderAddress: normalizedSenderAddress,
      content: `Counter offer: ${counterOfferEther} MON (Original: ${originalPriceEther} MON)`,
      type: 'DEAL_UPDATE',
    })

    // Create notification for the buyer
    const recipientAddress = deal.creatorAddress
    await createNotification({
      userId: recipientAddress,
      dealId,
      type: 'DEAL_CREATED', // We can add a new type later if needed
      title: 'Counter Offer Received',
      message: `You received a counter offer of ${counterOfferEther} MON`,
      data: {
        dealId,
        counterOfferPrice: formattedPrice, // Use human-readable format
        originalPrice: deal.price,
      },
    })

    return NextResponse.json({
      success: true,
      deal: updatedDeal,
      message: 'Counter offer created successfully',
    })
  } catch (error) {
    console.error('Error creating counter offer:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create counter offer' },
      { status: 500 }
    )
  }
} 