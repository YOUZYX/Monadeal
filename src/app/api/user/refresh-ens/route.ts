import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json()

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 })
    }

    console.log(`Refreshing ENS for address: ${address}`)

    // Fetch ENS name from NAD Names API
    let ensName: string | null = null
    try {
      const nadResponse = await fetch(`https://api.nad.domains/v1/protocol/primary-name/${address}?chainId=10143`)
      if (nadResponse.ok) {
        const nadData = await nadResponse.json()
        console.log(`NAD API response for ${address}:`, nadData)
        
        // Check if the API returned a successful response with a name (use primaryName, not name)
        if (nadData.success && nadData.primaryName) {
          ensName = nadData.primaryName
          console.log(`NAD API found ENS name for ${address}: ${ensName}`)
        } else {
          console.log(`No ENS name found for ${address}`)
        }
      } else {
        console.log(`NAD API failed for ${address}:`, nadResponse.status)
      }
    } catch (error) {
      console.error('Error fetching from NAD API:', error)
    }

    // Check if user exists first
    const existingUser = await prisma.user.findUnique({
      where: { address: address.toLowerCase() },
    })

    if (!existingUser) {
      return NextResponse.json({ 
        error: 'User not found. Please ensure you are registered first.' 
      }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {
      ensName,
      ensChecked: true,
    }

    // Only update username if ENS name is found AND user doesn't have a custom username
    // (i.e., if current username looks like a default generated one)
    if (ensName) {
      const hasDefaultUsername = existingUser.username?.startsWith('monadeal') && existingUser.username?.endsWith('.nad')
      if (hasDefaultUsername || existingUser.username === existingUser.ensName) {
        updateData.username = ensName
        console.log(`Updating username to ENS name: ${ensName}`)
      } else {
        console.log(`Keeping custom username: ${existingUser.username}`)
      }
    }

    // Update user with new ENS information
    const updatedUser = await prisma.user.update({
      where: { address: address.toLowerCase() },
      data: updateData,
      include: {
        _count: {
          select: {
            dealsCreated: true,
            dealsParticipant: true,
          },
        },
      },
    })

    const hasNewEns = Boolean(ensName)
    const message = hasNewEns 
      ? `ENS name found: ${ensName}` 
      : 'No ENS name found'

    return NextResponse.json({ 
      user: updatedUser, 
      hasNewEns,
      message 
    })
  } catch (error) {
    console.error('Error refreshing ENS:', error)
    return NextResponse.json({ error: 'Failed to refresh ENS' }, { status: 500 })
  }
} 