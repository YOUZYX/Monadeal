import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { updateDealStatus, createTransaction } from '@/lib/database'
import { prisma } from '@/lib/prisma'

const depositNFTSchema = z.object({
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
    const validatedData = depositNFTSchema.parse(body)

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

    // Determine the new status based on deal type
    let newStatus = existingDeal.status // Keep current status by default
    let updates: any = {}

    if (existingDeal.type === 'BUY') {
      // For BUY deals, when counterparty deposits NFT, we're awaiting buyer payment
      newStatus = 'AWAITING_BUYER'
      updates.counterpartyDeposited = true
    } else if (existingDeal.type === 'SELL') {
      // For SELL deals, when creator deposits NFT, we're awaiting buyer payment
      newStatus = 'AWAITING_BUYER'
      updates.creatorDeposited = true
    } else if (existingDeal.type === 'SWAP') {
      // For SWAP deals, determine based on who is depositing
      if (existingDeal.creatorAddress === validatedData.userAddress) {
        updates.creatorDeposited = true
      } else {
        updates.counterpartyDeposited = true
      }
      
      // If both have deposited, lock in escrow
      if (existingDeal.creatorDeposited && existingDeal.counterpartyDeposited) {
        newStatus = 'LOCKED_IN_ESCROW'
      }
    }

    // Update deal status
    const updatedDeal = await updateDealStatus(dealId, newStatus as any, updates)

    // Create transaction record for NFT deposit
    await createTransaction({
      dealId: dealId,
      userAddress: validatedData.userAddress,
      type: 'DEPOSIT_NFT',
      hash: validatedData.transactionHash,
      contractAddress: existingDeal.escrowContractAddress || undefined,
      status: 'CONFIRMED', // Transaction is already mined when we reach this point
    })

    return NextResponse.json({
      success: true,
      deal: updatedDeal,
      message: 'NFT deposited successfully',
    })
  } catch (error) {
    console.error('Error depositing NFT:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to deposit NFT' },
      { status: 500 }
    )
  }
} 