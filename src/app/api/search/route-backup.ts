import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { blockVisionService, detectSearchType, isContractAddress } from '@/lib/blockvision'

const searchSchema = z.object({
  query: z.string().min(1),
  type: z.enum(['auto', 'contract', 'wallet']).optional().default('auto'),
  pageIndex: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  pageSize: z.string().optional().transform(val => {
    const parsed = val ? parseInt(val, 10) : 20
    return Math.min(Math.max(parsed, 1), 100) // Between 1 and 100
  })
})

export async function GET(request: NextRequest) {
  console.log('🔍 Search API called with URL:', request.url)
  
  try {
    const { searchParams } = new URL(request.url)
    
    const queryParams = {
      query: searchParams.get('query') || '',
      type: searchParams.get('type') || 'auto',
      pageIndex: searchParams.get('pageIndex') || '1',
      pageSize: searchParams.get('pageSize') || '20'
    }

    console.log('📊 Query params:', queryParams)

    let parsedParams
    try {
      parsedParams = searchSchema.parse(queryParams)
      console.log('✅ Parsed params:', parsedParams)
    } catch (parseError) {
      console.error('❌ Schema parse error:', parseError)
      return NextResponse.json({
        success: false,
        error: 'Invalid search parameters',
        details: parseError instanceof Error ? parseError.message : 'Unknown parse error'
      }, { status: 400 })
    }

    const { query, type, pageIndex, pageSize } = parsedParams

    // Validate the query is an Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(query)) {
      console.log('❌ Invalid address format:', query)
      return NextResponse.json({
        success: false,
        error: 'Invalid search query. Please enter a valid Ethereum address (contract or wallet).',
        searchType: 'invalid',
        query
      }, { status: 400 })
    }

    console.log('✅ Address validation passed')

    let searchType: 'contract' | 'wallet'
    let results: any = null
    let totalCount = 0

    try {
      console.log('🚀 Starting search operation with type:', type)
      
      if (type === 'auto') {
        console.log('🔄 Auto-detection mode')
        // Try contract first, then fallback to wallet
        try {
          console.log('🏢 Trying collection holders for:', query)
          
          let contractResponse
          try {
            contractResponse = await blockVisionService.getCollectionHolders(query, {
              pageIndex,
              pageSize
            })
            console.log('📊 Collection holders response received')
          } catch (serviceError) {
            console.error('❌ BlockVision service error:', serviceError)
            throw serviceError
          }
          
          console.log('📊 Collection holders response:', contractResponse)
          
          if (contractResponse.success && contractResponse.data.holders.length > 0) {
            // It's a contract with holders
            console.log('✅ Found collection holders:', contractResponse.data.holders.length)
            searchType = 'contract'
            results = {
              type: 'collection_holders',
              holders: contractResponse.data.holders
            }
            totalCount = contractResponse.data.totalCount
          } else {
            console.log('⚠️ No holders found, trying wallet')
            throw new Error('No holders found, try wallet')
          }
        } catch (contractError) {
          // If contract search fails, try as wallet
          console.log('❌ Contract search failed, trying wallet:', contractError instanceof Error ? contractError.message : 'Unknown error')
          console.error('Full contract error:', contractError)
          
          // Handle rate limit specifically in auto mode
          if (contractError instanceof Error && contractError.message.includes('Rate limit exceeded')) {
            console.log('⏰ Rate limited during auto-detection, returning rate limit error')
            return NextResponse.json({
              success: false,
              error: 'API rate limit exceeded. Please wait a moment and try again.',
              searchType: 'rate_limited',
              query
            }, { status: 429 })
          }
          
          try {
            console.log('👤 Trying account NFTs for:', query)
            
            const walletResponse = await blockVisionService.getAccountNFTs(query, {
              pageIndex,
              pageSize,
              verified: false,
              unknown: false
            })
            
            console.log('📊 Account NFTs response:', walletResponse)
            
            if (walletResponse.success) {
              searchType = 'wallet'
              results = {
                type: 'account_nfts',
                nfts: walletResponse.data.nfts
              }
              totalCount = walletResponse.data.totalCount
              
              // Calculate if there are more pages based on current results and total
              const currentlyLoaded = pageIndex * pageSize
              const hasMorePages = currentlyLoaded < totalCount
              
              return NextResponse.json({
                success: true,
                searchType,
                query,
                results,
                pagination: {
                  currentPage: pageIndex,
                  pageSize,
                  totalCount,
                  totalPages: Math.ceil(totalCount / pageSize),
                  hasMore: hasMorePages
                }
              })
            } else {
              console.log('❌ Wallet response was not successful')
              throw new Error('No NFTs found for this wallet')
            }
          } catch (walletError) {
            console.log('❌ Wallet search failed:', walletError instanceof Error ? walletError.message : 'Unknown error')
            console.error('Full wallet error:', walletError)
            
            // Handle rate limit specifically for wallet search too
            if (walletError instanceof Error && walletError.message.includes('Rate limit exceeded')) {
              console.log('⏰ Rate limited during wallet search')
              return NextResponse.json({
                success: false,
                error: 'API rate limit exceeded. Please wait a moment and try again.',
                searchType: 'rate_limited',
                query
              }, { status: 429 })
            }
            
            const errorMessage = walletError instanceof Error ? walletError.message : 'Unknown error'
            console.log('🔍 Returning 404 for failed auto-detection')
            return NextResponse.json({
              success: false,
              error: `No data found for this address. It may not be a valid NFT contract or wallet with NFTs. Details: ${errorMessage}`,
              searchType: 'unknown',
              query
            }, { status: 404 })
          }
        }
      } else if (type === 'contract') {
        // Force contract search
        const response = await blockVisionService.getCollectionHolders(query, {
          pageIndex,
          pageSize
        })
        
        if (response.success) {
          searchType = 'contract'
          results = {
            type: 'collection_holders',
            holders: response.data.holders
          }
          totalCount = response.data.totalCount
        } else {
          throw new Error('Failed to fetch collection holders')
        }
      } else {
        // Force wallet search
        const response = await blockVisionService.getAccountNFTs(query, {
          pageIndex,
          pageSize,
          verified: false,
          unknown: false
        })
        
        if (response.success) {
          searchType = 'wallet'
          results = {
            type: 'account_nfts',
            nfts: response.data.nfts
          }
          totalCount = response.data.totalCount
          
          // Calculate if there are more pages based on current results and total
          const currentlyLoaded = pageIndex * pageSize
          const hasMorePages = currentlyLoaded < totalCount
          
          return NextResponse.json({
            success: true,
            searchType,
            query,
            results,
            pagination: {
              currentPage: pageIndex,
              pageSize,
              totalCount,
              totalPages: Math.ceil(totalCount / pageSize),
              hasMore: hasMorePages
            }
          })
        } else {
          throw new Error('Failed to fetch account NFTs')
        }
      }

      if (!results) {
        return NextResponse.json({
          success: false,
          error: 'No data found for this address.',
          searchType: searchType || 'unknown',
          query
        }, { status: 404 })
      }

    } catch (apiError) {
      console.error('BlockVision API error:', apiError)
      
      // Handle specific rate limiting error
      const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown error'
      if (errorMessage.includes('Rate limit')) {
        return NextResponse.json({
          success: false,
          error: 'API rate limit exceeded. Please wait a moment and try again.',
          searchType: 'rate_limited',
          query
        }, { status: 429 })
      }
      
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch data from BlockVision API. Please try again later.',
        details: errorMessage,
        searchType: 'error',
        query
      }, { status: 503 })
    }

  } catch (error) {
    console.error('Search API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid search parameters',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 