import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { nftMetadataService } from '@/lib/nft-metadata'

const paramsSchema = z.object({
  contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address'),
  tokenId: z.string().regex(/^\d+$/, 'Invalid token ID'),
})

const querySchema = z.object({
  refresh: z.string().optional().transform(val => val === 'true'),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contractAddress: string; tokenId: string }> }
) {
  try {
    // Await and validate parameters
    const resolvedParams = await params
    const validatedParams = paramsSchema.parse(resolvedParams)
    const { searchParams } = new URL(request.url)
    const query = querySchema.parse(Object.fromEntries(searchParams.entries()))

    const { contractAddress, tokenId } = validatedParams
    const forceRefresh = query.refresh || false

    // Get NFT metadata
    const nft = await nftMetadataService.getNFTMetadata(
      contractAddress,
      tokenId,
      forceRefresh
    )

    if (!nft) {
      return NextResponse.json(
        { error: 'NFT not found or invalid' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      nft,
    })
  } catch (error) {
    console.error('Error fetching NFT metadata:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch NFT metadata' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contractAddress: string; tokenId: string }> }
) {
  try {
    // Await and validate parameters
    const resolvedParams = await params
    const validatedParams = paramsSchema.parse(resolvedParams)
    const { contractAddress, tokenId } = validatedParams

    const body = await request.json()
    const { expectedOwner } = body

    // Validate NFT ownership
    const validation = await nftMetadataService.validateNFTOwnership(
      contractAddress,
      tokenId,
      expectedOwner
    )

    return NextResponse.json({
      success: true,
      validation,
    })
  } catch (error) {
    console.error('Error validating NFT ownership:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to validate NFT ownership' },
      { status: 500 }
    )
  }
} 