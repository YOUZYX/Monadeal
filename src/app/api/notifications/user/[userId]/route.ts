import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserNotifications } from '@/lib/database'

const getNotificationsSchema = z.object({
  unreadOnly: z.string().optional().transform(val => val === 'true'),
  limit: z.string().optional().transform(val => {
    if (!val) return 20
    const parsed = parseInt(val, 10)
    return isNaN(parsed) ? 20 : parsed
  }),
  offset: z.string().optional().transform(val => {
    if (!val) return 0
    const parsed = parseInt(val, 10)
    return isNaN(parsed) ? 0 : parsed
  }),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const { searchParams } = new URL(request.url)

    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(userId)) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address' },
        { status: 400 }
      )
    }

    const queryParams = {
      unreadOnly: searchParams.get('unreadOnly') || undefined,
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
    }

    const { unreadOnly, limit, offset } = getNotificationsSchema.parse(queryParams)

    // Get user notifications (normalize address to lowercase for database consistency)
    const notifications = await getUserNotifications(userId.toLowerCase(), unreadOnly)

    // Apply pagination
    const paginatedNotifications = notifications.slice(offset, offset + limit)
    const totalCount = notifications.length

    return NextResponse.json({
      success: true,
      notifications: paginatedNotifications,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
} 