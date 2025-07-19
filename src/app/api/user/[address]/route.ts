import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createOrUpdateUser, setUserOnlineStatus } from '@/lib/database'
import { prisma } from '@/lib/prisma'

const updateUserSchema = z.object({
  ensName: z.string().optional(),
  avatar: z.string().url().optional(),
  username: z.string().min(1).max(50).optional(),
  bio: z.string().max(200).optional(),
  isOnline: z.boolean().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const resolvedParams = await params
    const userAddress = resolvedParams.address

    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/i.test(userAddress)) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address' },
        { status: 400 }
      )
    }

    // Normalize address to lowercase
    const normalizedAddress = userAddress.toLowerCase()

    const user = await prisma.user.findUnique({
      where: { address: normalizedAddress },
      select: {
        id: true,
        address: true,
        ensName: true,
        ensChecked: true,
        avatar: true,
        avatarImage: true,
        username: true,
        bio: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        _count: {
          select: {
            dealsCreated: true,
            dealsParticipant: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user,
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const resolvedParams = await params
    const userAddress = resolvedParams.address
    const body = await request.json()

    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/i.test(userAddress)) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address' },
        { status: 400 }
      )
    }

    // Normalize address to lowercase
    const normalizedAddress = userAddress.toLowerCase()

    const validatedData = updateUserSchema.parse(body)

    // Update or create user
    const user = await createOrUpdateUser(normalizedAddress, validatedData)

    return NextResponse.json({
      success: true,
      user,
    })
  } catch (error) {
    console.error('Error updating user:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
} 