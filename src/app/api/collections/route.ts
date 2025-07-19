import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { nftMetadataService } from '@/lib/nft-metadata'

const querySchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  popular: z.string().optional().transform(val => val === 'true'),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = querySchema.parse(Object.fromEntries(searchParams.entries()))

    // Validate limit
    if (query.limit && (query.limit < 1 || query.limit > 50)) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 50' },
        { status: 400 }
      )
    }

    // Get popular collections
    const collections = await nftMetadataService.getPopularCollections(query.limit)

    return NextResponse.json({
      success: true,
      collections,
      count: collections.length,
    })
  } catch (error) {
    console.error('Error fetching collections:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch collections' },
      { status: 500 }
    )
  }
} 