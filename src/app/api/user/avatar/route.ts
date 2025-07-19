import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const uploadAvatarSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  imageData: z.string().min(1, 'Image data is required'),
  mimeType: z.string().regex(/^image\/(jpeg|jpg|png|gif|webp)$/, 'Invalid image format'),
})

// Helper function to validate base64 image
const isValidBase64Image = (imageData: string, mimeType: string): boolean => {
  try {
    // Check if it's a valid base64 string
    const base64Regex = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/
    if (!base64Regex.test(imageData)) {
      return false
    }

    // Check file size (limit to 2MB)
    const base64Length = imageData.split(',')[1]?.length || 0
    const sizeInBytes = (base64Length * 3) / 4
    const maxSize = 2 * 1024 * 1024 // 2MB
    
    return sizeInBytes <= maxSize
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address, imageData, mimeType } = uploadAvatarSchema.parse(body)

    // Normalize address to lowercase to match database
    const normalizedAddress = address.toLowerCase()

    // Validate the image data
    if (!isValidBase64Image(imageData, mimeType)) {
      return NextResponse.json(
        { error: 'Invalid image data or file too large (max 2MB)' },
        { status: 400 }
      )
    }

    // Update user avatar in database
    const user = await prisma.user.update({
      where: { address: normalizedAddress },
      data: {
        avatarImage: imageData,
        avatar: null, // Clear URL avatar when uploading image
        updatedAt: new Date(),
      },
      select: {
        id: true,
        address: true,
        ensName: true,
        avatar: true,
        avatarImage: true,
        username: true,
        bio: true,
        isOnline: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      user,
      message: 'Avatar uploaded successfully',
    })

  } catch (error) {
    console.error('Error uploading avatar:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    if ((error as any)?.code === 'P2025') {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to upload avatar' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (!address || !/^0x[a-fA-F0-9]{40}$/i.test(address)) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address' },
        { status: 400 }
      )
    }

    // Normalize address to lowercase to match database
    const normalizedAddress = address.toLowerCase()

    // Remove user avatar from database
    const user = await prisma.user.update({
      where: { address: normalizedAddress },
      data: {
        avatarImage: null,
        avatar: null,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        address: true,
        ensName: true,
        avatar: true,
        avatarImage: true,
        username: true,
        bio: true,
        isOnline: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      user,
      message: 'Avatar removed successfully',
    })

  } catch (error) {
    console.error('Error removing avatar:', error)

    if ((error as any)?.code === 'P2025') {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to remove avatar' },
      { status: 500 }
    )
  }
} 