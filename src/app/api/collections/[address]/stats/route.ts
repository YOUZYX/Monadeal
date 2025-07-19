import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { nftMetadataService } from '@/lib/nft-metadata'

const paramsSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address'),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    // Await and validate parameters
    const resolvedParams = await params
    const validatedParams = paramsSchema.parse(resolvedParams)
    const { address } = validatedParams

    // Get collection statistics
    const stats = await nftMetadataService.getCollectionStats(address)

    if (!stats) {
      return NextResponse.json(
        { error: 'Collection not found or no data available' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error('Error fetching collection stats:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch collection stats' },
      { status: 500 }
    )
  }
} 