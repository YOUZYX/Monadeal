import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { updateDealStatus, createTransaction } from '@/lib/database'

const updateBlockchainSchema = z.object({
  transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'),
  escrowContractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address'),
  onchainDealId: z.string(),
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid user address').optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params
    const body = await request.json()
    const validatedData = updateBlockchainSchema.parse(body)

    // Update the deal with blockchain information
    const updatedDeal = await updateDealStatus(dealId, 'PENDING', {
      transactionHash: validatedData.transactionHash,
      escrowContractAddress: validatedData.escrowContractAddress,
      onchainDealId: validatedData.onchainDealId,
    })

    // Create transaction record for deal creation
    if (validatedData.userAddress) {
      await createTransaction({
        dealId: dealId,
        userAddress: validatedData.userAddress,
        type: 'CREATE_DEAL',
        hash: validatedData.transactionHash,
        contractAddress: validatedData.escrowContractAddress,
        status: 'CONFIRMED', // Transaction is already mined when we reach this point
      })
    }

    return NextResponse.json({
      success: true,
      deal: updatedDeal,
      message: 'Deal updated with blockchain data successfully',
    })
  } catch (error) {
    console.error('Error updating deal with blockchain data:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update deal with blockchain data' },
      { status: 500 }
    )
  }
} 