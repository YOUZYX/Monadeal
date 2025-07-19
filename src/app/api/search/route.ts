import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const searchSchema = z.object({
  query: z.string().min(1),
  type: z.enum(['auto', 'contract', 'wallet']).optional().default('auto'),
  pageIndex: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  pageSize: z.string().optional().transform(val => {
    const parsed = val ? parseInt(val, 10) : 20
    return Math.min(Math.max(parsed, 1), 100)
  })
})

export async function GET(request: NextRequest) {
  console.log('🔍 New Search API called')
  
  try {
    // Step 1: Parse URL parameters
    console.log('📝 Step 1: Parsing URL parameters')
    const { searchParams } = new URL(request.url)
    const queryParams = {
      query: searchParams.get('query') || '',
      type: searchParams.get('type') || 'auto',
      pageIndex: searchParams.get('pageIndex') || '1',
      pageSize: searchParams.get('pageSize') || '20'
    }
    console.log('✅ URL parameters parsed:', queryParams)

    // Step 2: Validate with Zod
    console.log('📝 Step 2: Validating with Zod schema')
    const { query, type, pageIndex, pageSize } = searchSchema.parse(queryParams)
    console.log('✅ Schema validation passed:', { query, type, pageIndex, pageSize })

    // Step 3: Validate Ethereum address format
    console.log('📝 Step 3: Validating Ethereum address format')
    if (!/^0x[a-fA-F0-9]{40}$/.test(query)) {
      console.log('❌ Invalid address format')
      return NextResponse.json({
        success: false,
        error: 'Invalid search query. Please enter a valid Ethereum address.',
        searchType: 'invalid',
        query
      }, { status: 400 })
    }
    console.log('✅ Address format validation passed')

    // Step 4: Import BlockVision service
    console.log('📝 Step 4: Importing BlockVision service')
    const { blockVisionService } = await import('@/lib/blockvision')
    console.log('✅ BlockVision service imported')

    // Step 5: Handle different search types
    console.log('📝 Step 5: Handling search type:', type)
    
    if (type === 'contract') {
      console.log('🏢 Processing contract search')
      return await handleContractSearch(blockVisionService, query, pageIndex, pageSize)
    } else if (type === 'wallet') {
      console.log('👤 Processing wallet search')
      return await handleWalletSearch(blockVisionService, query, pageIndex, pageSize)
    } else {
      console.log('🔄 Processing auto-detection search')
      return await handleAutoSearch(blockVisionService, query, pageIndex, pageSize)
    }

  } catch (error) {
    console.error('💥 Unexpected error in search API:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function handleContractSearch(blockVisionService: any, query: string, pageIndex: number, pageSize: number) {
  try {
    console.log('🔍 Calling getCollectionHolders...')
    const response = await blockVisionService.getCollectionHolders(query, { pageIndex, pageSize })
    console.log('✅ getCollectionHolders completed')
    
    if (response.success && response.data.holders.length > 0) {
      return NextResponse.json({
        success: true,
        searchType: 'contract',
        query,
        results: {
          type: 'collection_holders',
          holders: response.data.holders
        },
        pagination: {
          currentPage: pageIndex,
          pageSize,
          totalCount: response.data.totalCount,
          totalPages: Math.ceil(response.data.totalCount / pageSize),
          hasMore: pageIndex * pageSize < response.data.totalCount
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'No holders found for this contract address',
        searchType: 'contract',
        query
      }, { status: 404 })
    }
  } catch (error) {
    console.error('❌ Contract search error:', error)
    
    if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
      return NextResponse.json({
        success: false,
        error: 'API rate limit exceeded. Please wait a moment and try again.',
        searchType: 'rate_limited',
        query
      }, { status: 429 })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to search contract',
      details: error instanceof Error ? error.message : 'Unknown error',
      searchType: 'contract',
      query
    }, { status: 500 })
  }
}

async function handleWalletSearch(blockVisionService: any, query: string, pageIndex: number, pageSize: number) {
  try {
    console.log('🔍 Calling getAccountNFTs...')
    const response = await blockVisionService.getAccountNFTs(query, { pageIndex, pageSize, verified: false, unknown: false })
    console.log('✅ getAccountNFTs completed')
    
    if (response.success && response.data.nfts.length > 0) {
      return NextResponse.json({
        success: true,
        searchType: 'wallet',
        query,
        results: {
          type: 'account_nfts',
          nfts: response.data.nfts
        },
        pagination: {
          currentPage: pageIndex,
          pageSize,
          totalCount: response.data.totalCount,
          totalPages: Math.ceil(response.data.totalCount / pageSize),
          hasMore: pageIndex * pageSize < response.data.totalCount
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'No NFTs found for this wallet address',
        searchType: 'wallet',
        query
      }, { status: 404 })
    }
  } catch (error) {
    console.error('❌ Wallet search error:', error)
    
    if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
      return NextResponse.json({
        success: false,
        error: 'API rate limit exceeded. Please wait a moment and try again.',
        searchType: 'rate_limited',
        query
      }, { status: 429 })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to search wallet',
      details: error instanceof Error ? error.message : 'Unknown error',
      searchType: 'wallet',
      query
    }, { status: 500 })
  }
}

async function handleAutoSearch(blockVisionService: any, query: string, pageIndex: number, pageSize: number) {
  console.log('🔄 Starting auto-detection...')
  
  // First try contract
  try {
    console.log('🏢 Auto: Trying contract search...')
    
    // Try to get collection holders
    const contractResponse = await blockVisionService.getCollectionHolders(query, { pageIndex, pageSize })
    
    if (contractResponse.success && contractResponse.data.holders.length > 0) {
      console.log('✅ Auto: Found collection holders, it\'s a contract!')
      return NextResponse.json({
        success: true,
        searchType: 'contract',
        query,
        results: {
          type: 'collection_holders',
          holders: contractResponse.data.holders
        },
        pagination: {
          currentPage: pageIndex,
          pageSize,
          totalCount: contractResponse.data.totalCount,
          totalPages: Math.ceil(contractResponse.data.totalCount / pageSize),
          hasMore: pageIndex * pageSize < contractResponse.data.totalCount
        }
      })
    } else {
      console.log('⚠️ Auto: No holders found for contract, trying wallet...')
    }
  } catch (contractError) {
    console.log('❌ Auto: Contract search failed, trying wallet...', contractError instanceof Error ? contractError.message : 'Unknown error')
    
    // Handle rate limit specifically
    if (contractError instanceof Error && contractError.message.includes('Rate limit exceeded')) {
      console.log('⏰ Auto: Rate limited during contract search')
      return NextResponse.json({
        success: false,
        error: 'API rate limit exceeded. Please wait a moment and try again.',
        searchType: 'rate_limited',
        query
      }, { status: 429 })
    }
  }
  
  // If contract failed or returned no holders, try wallet
  try {
    console.log('👤 Auto: Trying wallet search...')
    const walletResponse = await blockVisionService.getAccountNFTs(query, { pageIndex, pageSize, verified: false, unknown: false })
    
    if (walletResponse.success && walletResponse.data.nfts.length > 0) {
      console.log('✅ Auto: Found NFTs, it\'s a wallet!')
      return NextResponse.json({
        success: true,
        searchType: 'wallet',
        query,
        results: {
          type: 'account_nfts',
          nfts: walletResponse.data.nfts
        },
        pagination: {
          currentPage: pageIndex,
          pageSize,
          totalCount: walletResponse.data.totalCount,
          totalPages: Math.ceil(walletResponse.data.totalCount / pageSize),
          hasMore: pageIndex * pageSize < walletResponse.data.totalCount
        }
      })
    } else {
      console.log('⚠️ Auto: No NFTs found for wallet either')
      return NextResponse.json({
        success: false,
        error: 'No NFTs found for this wallet address',
        searchType: 'wallet',
        query
      }, { status: 404 })
    }
  } catch (walletError) {
    console.error('❌ Auto: Wallet search also failed:', walletError)
    
    // Handle rate limit specifically
    if (walletError instanceof Error && walletError.message.includes('Rate limit exceeded')) {
      console.log('⏰ Auto: Rate limited during wallet search')
      return NextResponse.json({
        success: false,
        error: 'API rate limit exceeded. Please wait a moment and try again.',
        searchType: 'rate_limited',
        query
      }, { status: 429 })
    }
    
    return NextResponse.json({
      success: false,
      error: 'No data found for this address. It may not be a valid NFT contract or wallet with NFTs.',
      searchType: 'unknown',
      query,
      details: walletError instanceof Error ? walletError.message : 'Unknown error'
    }, { status: 404 })
  }
} 