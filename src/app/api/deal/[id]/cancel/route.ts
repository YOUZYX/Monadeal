import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { updateDealStatus, createTransaction } from '@/lib/database'
import { prisma } from '@/lib/prisma'

const cancelDealSchema = z.object({
  transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'),
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid user address'),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params
    const body = await request.json()
    const validatedData = cancelDealSchema.parse(body)

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

    // Update deal status to cancelled
    const updatedDeal = await updateDealStatus(dealId, 'CANCELLED', {
      cancelledAt: new Date(),
      transactionHash: validatedData.transactionHash, // Update main transaction hash for backward compatibility
    })

    // Create transaction record for cancellation
    await createTransaction({
      dealId: dealId,
      userAddress: validatedData.userAddress,
      type: 'CANCEL_DEAL',
      hash: validatedData.transactionHash,
      contractAddress: existingDeal.escrowContractAddress || undefined,
      status: 'CONFIRMED', // Transaction is already mined when we reach this point
    })

    return NextResponse.json({
      success: true,
      deal: updatedDeal,
      message: 'Deal cancelled successfully',
    })
  } catch (error) {
    console.error('Error cancelling deal:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to cancel deal' },
      { status: 500 }
    )
  }
} 