import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Add cache headers for better performance
    const response = NextResponse.json({})
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    
    // Calculate date ranges
    const now = new Date()
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Optimize queries with Promise.allSettled for better error handling
    const results = await Promise.allSettled([
      // Completed deals with prices (all time) - limit to recent for performance
      prisma.deal.findMany({
        where: {
          status: 'COMPLETED',
          price: { not: null },
          completedAt: { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) } // Last 90 days only
        },
        select: { price: true },
        take: 10000 // Limit for performance
      }),
      
      // Completed deals with prices (24h)
      prisma.deal.findMany({
        where: {
          status: 'COMPLETED',
          completedAt: { gte: last24Hours },
          price: { not: null }
        },
        select: { price: true }
      }),
      
      // Use counts instead of full queries where possible
      prisma.user.count(),
      
      // Active users (created deals in last week)
      prisma.user.count({
        where: {
          dealsCreated: {
            some: {
              createdAt: { gte: lastWeek }
            }
          }
        }
      }),
      
      // Total deals
      prisma.deal.count(),
      
      // Completed deals (all time)
      prisma.deal.count({
        where: { status: 'COMPLETED' }
      }),
      
      // Completed deals (last 30 days)
      prisma.deal.count({
        where: {
          status: 'COMPLETED',
          completedAt: { gte: last30Days }
        }
      }),
      
      // Total deals (last 30 days)
      prisma.deal.count({
        where: {
          createdAt: { gte: last30Days }
        }
      })
    ])

    // Handle partial failures gracefully
    const [
      completedDealsResult,
      completedDeals24hResult,
      totalUsersResult,
      activeUsersWeekResult,
      totalDealsResult,
      completedDealsResult2,
      completedDealsLast30DaysResult,
      totalDealsLast30DaysResult
    ] = results

    // Extract data with fallbacks
    const completedDealsWithPrices = completedDealsResult.status === 'fulfilled' ? completedDealsResult.value : []
    const completedDeals24h = completedDeals24hResult.status === 'fulfilled' ? completedDeals24hResult.value : []
    const totalUsers = totalUsersResult.status === 'fulfilled' ? totalUsersResult.value : 0
    const activeUsersWeek = activeUsersWeekResult.status === 'fulfilled' ? activeUsersWeekResult.value : 0
    const totalDeals = totalDealsResult.status === 'fulfilled' ? totalDealsResult.value : 0
    const completedDeals = completedDealsResult2.status === 'fulfilled' ? completedDealsResult2.value : 0
    const completedDealsLast30Days = completedDealsLast30DaysResult.status === 'fulfilled' ? completedDealsLast30DaysResult.value : 0
    const totalDealsLast30Days = totalDealsLast30DaysResult.status === 'fulfilled' ? totalDealsLast30DaysResult.value : 0

    // Calculate volumes in MON (manually sum the string prices)
    const totalVolumeInMON = completedDealsWithPrices.reduce((sum, deal) => {
      return sum + (deal.price ? parseFloat(deal.price) : 0)
    }, 0)
      
    const volume24hInMON = completedDeals24h.reduce((sum, deal) => {
      return sum + (deal.price ? parseFloat(deal.price) : 0)
    }, 0)

    // Calculate success rate for last 30 days
    const successRate = totalDealsLast30Days > 0 
      ? (completedDealsLast30Days / totalDealsLast30Days) * 100 
      : 0

    // Format statistics
    const stats = {
      volume: {
        total: totalVolumeInMON.toFixed(1),
        last24h: volume24hInMON.toFixed(1),
        formatted: {
          total: formatNumber(totalVolumeInMON),
          last24h: formatNumber(volume24hInMON)
        }
      },
      users: {
        total: totalUsers,
        activeWeek: activeUsersWeek,
        formatted: {
          total: formatNumber(totalUsers),
          activeWeek: formatNumber(activeUsersWeek)
        }
      },
      deals: {
        total: totalDeals,
        completed: completedDeals,
        formatted: {
          total: formatNumber(totalDeals),
          completed: formatNumber(completedDeals)
        }
      },
      successRate: {
        percentage: successRate,
        formatted: `${successRate.toFixed(1)}%`
      },
      lastUpdated: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      stats
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // 5 min cache, 10 min stale
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('Error fetching platform stats:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch platform statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Helper function to format numbers (e.g., 1234 -> "1.2K")
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  } else {
    return num.toString()
  }
} 