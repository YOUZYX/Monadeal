import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserDeals, getUserDealsCount } from '@/lib/database'
import { DealStatus } from '@prisma/client'

const getUserDealsSchema = z.object({
  status: z.enum(['PENDING', 'AWAITING_BUYER', 'AWAITING_SELLER', 'LOCKED_IN_ESCROW', 'COMPLETED', 'CANCELLED']).nullable().optional(),
  limit: z.string().nullable().optional().transform(val => {
    if (!val || val === 'null') return 20
    const parsed = parseInt(val, 10)
    return isNaN(parsed) ? 20 : parsed
  }),
  offset: z.string().nullable().optional().transform(val => {
    if (!val || val === 'null') return 0
    const parsed = parseInt(val, 10)
    return isNaN(parsed) ? 0 : parsed
  }),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address: userAddress } = await params
    const { searchParams } = new URL(request.url)
    
    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address' },
        { status: 400 }
      )
    }

    const queryParams = {
      status: searchParams.get('status'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    }

    const { status, limit, offset } = getUserDealsSchema.parse(queryParams)

    // Get user's deals with database-level pagination
    const deals = await getUserDeals(userAddress, status as DealStatus, limit, offset)
    
    // Get total count for pagination metadata
    const totalCount = await getUserDealsCount(userAddress, status as DealStatus)

    return NextResponse.json({
      success: true,
      deals: deals,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    })
  } catch (error) {
    console.error('Error fetching user deals:', error)
    
    if (error instanceof z.ZodError) {
      console.error('Zod validation errors:', error.errors)
      return NextResponse.json(
        { 
          error: 'Invalid query parameters', 
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch user deals',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 