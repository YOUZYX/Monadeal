import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { nftMetadataService } from '@/lib/nft-metadata'
import { appConfig } from '@/lib/config'

const paramsSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
})

const querySchema = z.object({
  contractAddresses: z.string().optional().transform(val => 
    val ? val.split(',').map(addr => addr.trim()) : undefined
  ),
  pageKey: z.string().optional(),
  pageSize: z.string().optional().transform(val => val ? parseInt(val) : appConfig.api.nftPageSize),
  refresh: z.string().optional().transform(val => val === 'true'),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    // Await and validate parameters
    const resolvedParams = await params
    const validatedParams = paramsSchema.parse(resolvedParams)
    const { searchParams } = new URL(request.url)
    const query = querySchema.parse(Object.fromEntries(searchParams.entries()))

    const { address } = validatedParams
    const { contractAddresses, pageKey, pageSize, refresh } = query

    // Validate page size
    if (pageSize && (pageSize < 1 || pageSize > 50)) {
      return NextResponse.json(
        { error: 'Page size must be between 1 and 50' },
        { status: 400 }
      )
    }

    // Get user's NFTs
    const result = await nftMetadataService.getUserNFTs(address, {
      contractAddresses,
      pageKey,
      pageSize,
      forceRefresh: refresh,
    })

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Error fetching user NFTs:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch user NFTs' },
      { status: 500 }
    )
  }
} 