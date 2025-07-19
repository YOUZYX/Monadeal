import { NextRequest, NextResponse } from 'next/server'
import { getTransactionsByDeal } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params

    if (!dealId) {
      return NextResponse.json(
        { error: 'Deal ID is required' },
        { status: 400 }
      )
    }

    const transactions = await getTransactionsByDeal(dealId)

    return NextResponse.json({
      success: true,
      transactions,
    })
  } catch (error) {
    console.error('Error fetching deal transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch deal transactions' },
      { status: 500 }
    )
  }
} 