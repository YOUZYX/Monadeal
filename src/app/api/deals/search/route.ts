import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { searchDeals } from '@/lib/database'
import { DealType, DealStatus } from '@prisma/client'

const searchDealsSchema = z.object({
  type: z.enum(['BUY', 'SELL', 'SWAP']).optional(),
  status: z.enum(['PENDING', 'AWAITING_BUYER', 'AWAITING_SELLER', 'LOCKED_IN_ESCROW', 'COMPLETED', 'CANCELLED']).optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  collectionAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  offset: z.string().optional().transform(val => val ? parseInt(val) : 0),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const queryParams = {
      type: searchParams.get('type'),
      status: searchParams.get('status'),
      minPrice: searchParams.get('minPrice'),
      maxPrice: searchParams.get('maxPrice'),
      collectionAddress: searchParams.get('collectionAddress'),
      createdAfter: searchParams.get('createdAfter'),
      createdBefore: searchParams.get('createdBefore'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    }

    const validatedParams = searchDealsSchema.parse(queryParams)

    // Search deals
    const deals = await searchDeals({
      type: validatedParams.type as DealType,
      status: validatedParams.status as DealStatus,
      minPrice: validatedParams.minPrice,
      maxPrice: validatedParams.maxPrice,
      collectionAddress: validatedParams.collectionAddress,
      createdAfter: validatedParams.createdAfter ? new Date(validatedParams.createdAfter) : undefined,
      createdBefore: validatedParams.createdBefore ? new Date(validatedParams.createdBefore) : undefined,
    })

    // Apply pagination
    const paginatedDeals = deals.slice(validatedParams.offset, validatedParams.offset + validatedParams.limit)
    const totalCount = deals.length

    return NextResponse.json({
      success: true,
      deals: paginatedDeals,
      pagination: {
        total: totalCount,
        limit: validatedParams.limit,
        offset: validatedParams.offset,
        hasMore: validatedParams.offset + validatedParams.limit < totalCount,
      },
    })
  } catch (error) {
    console.error('Error searching deals:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to search deals' },
      { status: 500 }
    )
  }
} 