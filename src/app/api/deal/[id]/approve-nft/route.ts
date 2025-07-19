import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createTransaction } from '@/lib/database'
import { prisma } from '@/lib/prisma'

const approveNFTSchema = z.object({
  transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'),
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid user address'),
  nftContractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address'),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params
    const body = await request.json()
    const validatedData = approveNFTSchema.parse(body)

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

    // Create transaction record for NFT approval
    const transaction = await createTransaction({
      dealId,
      userAddress: validatedData.userAddress,
      type: 'APPROVE_NFT',
      hash: validatedData.transactionHash,
      contractAddress: validatedData.nftContractAddress,
      status: 'CONFIRMED',
    })

    return NextResponse.json({
      success: true,
      transaction,
      message: 'NFT approval transaction saved successfully',
    })
  } catch (error) {
    console.error('Error saving NFT approval transaction:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to save NFT approval transaction' },
      { status: 500 }
    )
  }
} 