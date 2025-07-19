import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createMessage } from '@/lib/database'
import { parseEther, formatEther } from 'viem'

const updatePriceSchema = z.object({
  newPrice: z.string().min(1, 'Price is required'),
  senderAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params
    const body = await request.json()
    const { newPrice, senderAddress } = updatePriceSchema.parse(body)

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

    // Check if sender is the deal creator (buyer)
    if (deal.creatorAddress !== normalizedSenderAddress) {
      return NextResponse.json(
        { error: 'Only the buyer can update the price' },
        { status: 403 }
      )
    }

    // Check if deal is in valid state for price updates
    if (deal.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Price can only be updated on pending deals' },
        { status: 400 }
      )
    }

    // Check if deal type is BUY
    if (deal.type !== 'BUY') {
      return NextResponse.json(
        { error: 'Only buy requests can have their price updated' },
        { status: 400 }
      )
    }

    // Convert price to wei format for consistency
    const newPriceWei = parseEther(newPrice).toString()

    // Update the deal with new price
    const updatedDeal = await prisma.deal.update({
      where: { id: dealId },
      data: {
        price: newPriceWei,
        updatedAt: new Date(),
        // Reset counter offer status if there was one
        counterOfferPrice: null,
        counterOfferBy: null,
        counterOfferAt: null,
        counterOfferStatus: null,
      },
      include: {
        creator: true,
        counterparty: true,
        nft: true,
      },
    })

    // Create a system message about the price update
    const oldPriceEther = deal.price ? formatEther(BigInt(deal.price)) : 'N/A'
    const newPriceEther = formatEther(BigInt(newPriceWei))
    
    await createMessage({
      dealId,
      senderAddress: normalizedSenderAddress,
      content: `Buy request updated: ${newPriceEther} MON (Previous: ${oldPriceEther} MON)`,
      type: 'DEAL_UPDATE',
    })

    return NextResponse.json({
      success: true,
      deal: updatedDeal,
      message: 'Price updated successfully',
    })
  } catch (error) {
    console.error('Error updating price:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update price' },
      { status: 500 }
    )
  }
} 