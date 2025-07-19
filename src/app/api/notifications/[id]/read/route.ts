import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { markNotificationAsRead } from '@/lib/database'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: notificationId } = await params

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      )
    }

    // Mark notification as read
    const notification = await markNotificationAsRead(notificationId)

    return NextResponse.json({
      success: true,
      notification,
    })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark notification as read' },
      { status: 500 }
    )
  }
} 