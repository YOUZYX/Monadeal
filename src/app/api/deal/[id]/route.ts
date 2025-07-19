import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const updateDealSchema = z.object({
  status: z.enum(['PENDING', 'AWAITING_BUYER', 'AWAITING_SELLER', 'LOCKED_IN_ESCROW', 'COMPLETED', 'CANCELLED']).optional(),
  transactionHash: z.string().optional(),
  cancelledAt: z.string().optional(),
  completedAt: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params

    if (!dealId) {
      return NextResponse.json(
        { error: 'Deal ID is required' },
        { status: 400 }
      )
    }

    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        creator: {
          select: {
            id: true,
            address: true,
            ensName: true,
            avatar: true,
            avatarImage: true,
            username: true,
            isOnline: true,
            lastSeen: true,
          },
        },
        counterparty: {
          select: {
            id: true,
            address: true,
            ensName: true,
            avatar: true,
            avatarImage: true,
            username: true,
            isOnline: true,
            lastSeen: true,
          },
        },
        nft: true,
        swapNft: true,
        _count: {
          select: {
            messages: true,
          },
        },
      },
    })

    if (!deal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      deal,
    })
  } catch (error) {
    console.error('Error fetching deal:', error)
    return NextResponse.json(
      { error: 'Failed to fetch deal' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params
    const body = await request.json()
    const validatedData = updateDealSchema.parse(body)

    if (!dealId) {
      return NextResponse.json(
        { error: 'Deal ID is required' },
        { status: 400 }
      )
    }

    // Check if deal exists
    const existingDeal = await prisma.deal.findUnique({
      where: { id: dealId }
    })

    if (!existingDeal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    
    if (validatedData.status) {
      updateData.status = validatedData.status
    }
    
    if (validatedData.transactionHash) {
      updateData.transactionHash = validatedData.transactionHash
    }
    
    if (validatedData.cancelledAt) {
      updateData.cancelledAt = new Date(validatedData.cancelledAt)
    }
    
    if (validatedData.completedAt) {
      updateData.completedAt = new Date(validatedData.completedAt)
    }

    // Update the deal
    const updatedDeal = await prisma.deal.update({
      where: { id: dealId },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            address: true,
            ensName: true,
            avatar: true,
            avatarImage: true,
            username: true,
            isOnline: true,
            lastSeen: true,
          },
        },
        counterparty: {
          select: {
            id: true,
            address: true,
            ensName: true,
            avatar: true,
            avatarImage: true,
            username: true,
            isOnline: true,
            lastSeen: true,
          },
        },
        nft: true,
        swapNft: true,
      },
    })

    return NextResponse.json({
      success: true,
      deal: updatedDeal,
      message: 'Deal updated successfully',
    })
  } catch (error) {
    console.error('Error updating deal:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update deal' },
      { status: 500 }
    )
  }
}