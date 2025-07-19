import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createMessage, createNotification } from '@/lib/database'
import { formatEther } from 'viem'

const declineCounterOfferSchema = z.object({
  senderAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params
    const body = await request.json()
    const { senderAddress } = declineCounterOfferSchema.parse(body)

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

    // Check if there's a pending counter offer
    if (!deal.counterOfferPrice || deal.counterOfferStatus !== 'PENDING') {
      return NextResponse.json(
        { error: 'No pending counter offer found' },
        { status: 400 }
      )
    }

    // Check if sender is authorized to decline counter offer
    // Only the original buyer (creator) can decline counter offers on BUY deals
    if (deal.type === 'BUY' && deal.creatorAddress !== normalizedSenderAddress) {
      return NextResponse.json(
        { error: 'Only the buyer can decline counter offers' },
        { status: 403 }
      )
    }

    // Update the deal - decline counter offer
    const updatedDeal = await prisma.deal.update({
      where: { id: dealId },
      data: {
        counterOfferStatus: 'DECLINED',
        updatedAt: new Date(),
      },
      include: {
        creator: true,
        counterparty: true,
        nft: true,
      },
    })

    // Create a system message about the declined counter offer
    const counterOfferEther = formatEther(BigInt(deal.counterOfferPrice))
    
    await createMessage({
      dealId,
      senderAddress: normalizedSenderAddress,
      content: `Counter offer declined. Offer remains at original price.`,
      type: 'DEAL_UPDATE',
    })

    // Create notification for the seller
    const recipientAddress = deal.counterpartyAddress
    if (recipientAddress) {
      await createNotification({
        userId: recipientAddress,
        dealId,
        type: 'DEAL_CANCELLED', // We can add a new type later if needed
        title: 'Counter Offer Declined',
        message: `Your counter offer of ${counterOfferEther} MON has been declined.`,
        data: {
          dealId,
          declinedPrice: deal.counterOfferPrice,
        },
      })
    }

    return NextResponse.json({
      success: true,
      deal: updatedDeal,
      message: 'Counter offer declined successfully',
    })
  } catch (error) {
    console.error('Error declining counter offer:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to decline counter offer' },
      { status: 500 }
    )
  }
} 