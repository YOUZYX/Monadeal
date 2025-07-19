import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createOrUpdateUser } from '@/lib/database'

const registerUserSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address } = registerUserSchema.parse(body)
    
    // Normalize address to lowercase to prevent duplicates
    const normalizedAddress = address.toLowerCase()

    // Fetch ENS name from NAD Names directly
    let ensName: string | null = null
    try {
      console.log('Fetching NAD Names for address:', normalizedAddress)
      const nadNamesUrl = `https://api.nad.domains/v1/protocol/primary-name/${normalizedAddress}?chainId=10143`
      
      const nadNamesResponse = await fetch(nadNamesUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (nadNamesResponse.ok) {
        const nadNamesData = await nadNamesResponse.json()
        console.log('NAD Names response:', nadNamesData)
        
        if (nadNamesData.success && nadNamesData.primaryName) {
          ensName = nadNamesData.primaryName
          console.log('Found ENS name:', ensName)
        }
      } else {
        console.error('NAD Names API error:', nadNamesResponse.status, nadNamesResponse.statusText)
      }
    } catch (error) {
      console.error('Error fetching ENS name during registration:', error)
      // Continue without ENS name if it fails
    }

    // Generate default username with fallback options
    const generateDefaultUsername = (ensName: string | null, address: string) => {
      if (ensName) {
        console.log(`Using ENS name as username: ${ensName}`)
        return ensName;
      }
      
      // Try to create a Monadeal username based on address
      const addressSuffix = address.slice(-6).toLowerCase();
      const defaultName = `monadeal${addressSuffix}.nad`;
      console.log(`No ENS name found, using default username: ${defaultName}`)
      return defaultName;
    };

    // Create or update user with ENS name or default username
    const defaultUsername = generateDefaultUsername(ensName, normalizedAddress);
    
    const userData = {
      ensName: ensName || undefined,
      ensChecked: true, // Mark that we've checked for ENS name
      username: defaultUsername,
      isOnline: true,
    }

    const user = await createOrUpdateUser(normalizedAddress, userData)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        address: user.address,
        ensName: user.ensName,
        ensChecked: user.ensChecked,
        username: user.username,
        avatar: user.avatar,
        avatarImage: user.avatarImage,
        bio: user.bio,
        isOnline: user.isOnline,
        createdAt: user.createdAt,
      },
      message: ensName 
        ? `Welcome back, ${ensName}!` 
        : `Welcome! Your default username is ${defaultUsername}`,
    })

  } catch (error) {
    console.error('Error registering user:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    )
  }
} 