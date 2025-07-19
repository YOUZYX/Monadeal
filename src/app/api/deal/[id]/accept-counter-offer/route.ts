import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createMessage, createNotification } from '@/lib/database'
import { formatEther } from 'viem'

const acceptCounterOfferSchema = z.object({
  senderAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params
    const body = await request.json()
    const { senderAddress } = acceptCounterOfferSchema.parse(body)

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

    // Check if sender is authorized to accept counter offer
    // Only the original buyer (creator) can accept counter offers on BUY deals
    if (deal.type === 'BUY' && deal.creatorAddress !== normalizedSenderAddress) {
      return NextResponse.json(
        { error: 'Only the buyer can accept counter offers' },
        { status: 403 }
      )
    }

    // Update the deal - accept counter offer and update the main price
    const updatedDeal = await prisma.deal.update({
      where: { id: dealId },
      data: {
        price: deal.counterOfferPrice, // Update main price to counter offer price
        counterOfferStatus: 'ACCEPTED',
        updatedAt: new Date(),
      },
      include: {
        creator: true,
        counterparty: true,
        nft: true,
      },
    })

    // Create a system message about the accepted counter offer
    // counterOfferPrice is now stored in human-readable format
    const counterOfferEther = deal.counterOfferPrice
    
    await createMessage({
      dealId,
      senderAddress: normalizedSenderAddress,
      content: `Counter offer accepted! New price: ${counterOfferEther} MON`,
      type: 'DEAL_UPDATE',
    })

    // Create notification for the seller
    const recipientAddress = deal.counterpartyAddress
    if (recipientAddress) {
      await createNotification({
        userId: recipientAddress,
        dealId,
        type: 'DEAL_ACCEPTED',
        title: 'Counter Offer Accepted',
        message: `Your counter offer of ${counterOfferEther} MON has been accepted!`,
        data: {
          dealId,
          acceptedPrice: deal.counterOfferPrice,
        },
      })
    }

    return NextResponse.json({
      success: true,
      deal: updatedDeal,
      message: 'Counter offer accepted successfully',
    })
  } catch (error) {
    console.error('Error accepting counter offer:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to accept counter offer' },
      { status: 500 }
    )
  }
} 