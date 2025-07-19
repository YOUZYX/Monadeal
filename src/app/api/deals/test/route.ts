import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Test database connection and get basic stats
    const totalDeals = await prisma.deal.count()
    const totalUsers = await prisma.user.count()
    const totalNFTs = await prisma.nFT.count()
    
    // Get a sample of recent deals (without sensitive data)
    const recentDeals = await prisma.deal.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true,
        creatorAddress: true,
        counterpartyAddress: true,
      }
    })

    return NextResponse.json({
      success: true,
      stats: {
        totalDeals,
        totalUsers,
        totalNFTs,
      },
      recentDeals,
      message: 'Database connection successful'
    })
  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 