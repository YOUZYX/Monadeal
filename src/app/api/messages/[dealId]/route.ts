import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getDealMessages, markMessagesAsRead } from '@/lib/database'
import { prisma } from '@/lib/prisma'

const getMessagesSchema = z.object({
  limit: z.string().nullable().optional().transform(val => val ? parseInt(val) : 50),
  offset: z.string().nullable().optional().transform(val => val ? parseInt(val) : 0),
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address').nullable().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  try {
    const { dealId } = await params
    const { searchParams } = new URL(request.url)
    
    const queryParams = {
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      userAddress: searchParams.get('userAddress'),
    }

    const { limit, offset, userAddress } = getMessagesSchema.parse(queryParams)

    // Check if deal exists
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      select: {
        id: true,
        creatorAddress: true,
        counterpartyAddress: true,
      },
    })

    if (!deal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      )
    }

    // If userAddress is provided, verify they are a participant
    if (userAddress) {
      const normalizedUserAddress = userAddress.toLowerCase()
      const isParticipant = 
        deal.creatorAddress === normalizedUserAddress ||
        deal.counterpartyAddress === normalizedUserAddress

      if (!isParticipant) {
        return NextResponse.json(
          { error: 'You are not authorized to view messages in this deal' },
          { status: 403 }
        )
      }

      // Mark messages as read for this user
      await markMessagesAsRead(dealId, normalizedUserAddress)
    }

    // Get messages
    const messages = await getDealMessages(dealId, limit, offset)

    // Get total count for pagination
    const totalCount = await prisma.message.count({
      where: { dealId },
    })

    return NextResponse.json({
      success: true,
      messages,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
} 