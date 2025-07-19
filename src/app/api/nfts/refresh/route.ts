import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { nftMetadataService } from '@/lib/nft-metadata'

const refreshSchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val) : 100),
  force: z.string().optional().transform(val => val === 'true'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { limit, force } = refreshSchema.parse(body)

    // Validate limit
    if (limit && (limit < 1 || limit > 1000)) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 1000' },
        { status: 400 }
      )
    }

    // Refresh stale metadata
    const refreshedCount = await nftMetadataService.refreshStaleMetadata(limit)

    return NextResponse.json({
      success: true,
      refreshedCount,
      message: `Refreshed ${refreshedCount} NFT metadata records`,
    })
  } catch (error) {
    console.error('Error refreshing NFT metadata:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to refresh NFT metadata' },
      { status: 500 }
    )
  }
}

// Get recent NFTs endpoint
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20

    // Validate limit
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      )
    }

    // Get recent NFTs
    const nfts = await nftMetadataService.getRecentNFTs(limit)

    return NextResponse.json({
      success: true,
      nfts,
      count: nfts.length,
    })
  } catch (error) {
    console.error('Error fetching recent NFTs:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch recent NFTs' },
      { status: 500 }
    )
  }
} 