import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { nftMetadataService } from '@/lib/nft-metadata'
import { appConfig } from '@/lib/config'

const searchSchema = z.object({
  name: z.string().optional(),
  collectionAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  collectionSlug: z.string().optional(),
  owner: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  traits: z.string().optional().transform(val => {
    if (!val) return undefined
    try {
      return JSON.parse(val)
    } catch {
      return undefined
    }
  }),
  limit: z.string().optional().transform(val => val ? parseInt(val) : appConfig.api.nftPageSize),
  offset: z.string().optional().transform(val => val ? parseInt(val) : 0),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchSchema.parse(Object.fromEntries(searchParams.entries()))

    // Validate limit and offset
    if (query.limit && (query.limit < 1 || query.limit > 50)) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 50' },
        { status: 400 }
      )
    }

    if (query.offset && query.offset < 0) {
      return NextResponse.json(
        { error: 'Offset must be non-negative' },
        { status: 400 }
      )
    }

    // Search NFTs
    const nfts = await nftMetadataService.searchNFTs({
      name: query.name,
      collectionAddress: query.collectionAddress,
      collectionSlug: query.collectionSlug,
      owner: query.owner,
      traits: query.traits,
      limit: query.limit,
      offset: query.offset,
    })

    return NextResponse.json({
      success: true,
      nfts,
      count: nfts.length,
      pagination: {
        limit: query.limit,
        offset: query.offset,
        hasMore: nfts.length === query.limit,
      },
    })
  } catch (error) {
    console.error('Error searching NFTs:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to search NFTs' },
      { status: 500 }
    )
  }
} 