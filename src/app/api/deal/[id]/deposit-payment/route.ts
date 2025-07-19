import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { updateDealStatus, createTransaction } from '@/lib/database'
import { prisma } from '@/lib/prisma'
import { formatEther } from 'viem'

const depositPaymentSchema = z.object({
  transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'),
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid user address'),
  amount: z.string().optional(), // Payment amount in wei
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params
    const body = await request.json()
    const validatedData = depositPaymentSchema.parse(body)

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

    // Verify this is a BUY deal
    if (existingDeal.type !== 'BUY') {
      return NextResponse.json(
        { error: 'Payment deposit only available for BUY deals' },
        { status: 400 }
      )
    }

    // Update deal status to LOCKED_IN_ESCROW since both NFT and payment are now deposited
    const updatedDeal = await updateDealStatus(dealId, 'LOCKED_IN_ESCROW', {
      creatorDeposited: true, // Creator (buyer) has deposited payment
      completedAt: new Date(), // Deal is effectively completed
    })

    // Create transaction record for payment deposit
    await createTransaction({
      dealId: dealId,
      userAddress: validatedData.userAddress,
      type: 'DEPOSIT_PAYMENT',
      hash: validatedData.transactionHash,
      contractAddress: existingDeal.escrowContractAddress || undefined,
      amount: validatedData.amount ? formatEther(BigInt(validatedData.amount)) : (existingDeal.price || undefined),
      status: 'CONFIRMED', // Transaction is already mined when we reach this point
    })

    return NextResponse.json({
      success: true,
      deal: updatedDeal,
      message: 'Payment deposited successfully - Deal completed!',
    })
  } catch (error) {
    console.error('Error depositing payment:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to deposit payment' },
      { status: 500 }
    )
  }
} 