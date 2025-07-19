import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createTransaction } from '@/lib/database'
import { prisma } from '@/lib/prisma'

const updatePriceSchema = z.object({
  transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'),
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid user address'),
  newPrice: z.string(),
  escrowContractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address'),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params
    const body = await request.json()
    const validatedData = updatePriceSchema.parse(body)

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

    // Create transaction record for price update
    const transaction = await createTransaction({
      dealId,
      userAddress: validatedData.userAddress,
      type: 'UPDATE_PRICE',
      hash: validatedData.transactionHash,
      contractAddress: validatedData.escrowContractAddress,
      amount: validatedData.newPrice,
      status: 'CONFIRMED',
    })

    return NextResponse.json({
      success: true,
      transaction,
      message: 'Price update transaction saved successfully',
    })
  } catch (error) {
    console.error('Error saving price update transaction:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to save price update transaction' },
      { status: 500 }
    )
  }
} 