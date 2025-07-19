import { NextRequest, NextResponse } from 'next/server'

interface NADNamesResponse {
  code: number
  success: boolean
  message: string
  primaryName?: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const resolvedParams = await params
    const userAddress = resolvedParams.address

    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address' },
        { status: 400 }
      )
    }

    // Fetch NAD Names from Monad testnet
    const nadNamesUrl = `https://api.nad.domains/v1/protocol/primary-name/${userAddress}?chainId=10143`
    
    const response = await fetch(nadNamesUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('NAD Names API error:', response.status, response.statusText)
      return NextResponse.json(
        { error: 'Failed to fetch NAD Names', ensName: null },
        { status: 200 } // Return 200 with null ensName instead of error
      )
    }

    const data: NADNamesResponse = await response.json()

    if (!data.success) {
      return NextResponse.json(
        { error: data.message || 'NAD Names API returned error', ensName: null },
        { status: 200 }
      )
    }

    return NextResponse.json({
      success: true,
      ensName: data.primaryName || null,
      address: userAddress,
    })

  } catch (error) {
    console.error('Error fetching NAD Names:', error)
    return NextResponse.json(
      { error: 'Failed to fetch NAD Names', ensName: null },
      { status: 200 } // Return 200 with null ensName for graceful degradation
    )
  }
} 