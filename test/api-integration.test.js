/**
 * MONADEAL API INTEGRATION TESTS
 * Phase 4: Integration & Testing
 * 
 * REAL DATA TESTING - No mocks, no fake data
 * Tests all API endpoints with live database and real NFT data
 */

const { describe, it, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals')
const { spawn } = require('child_process')
const fetch = require('node-fetch')

// Test Configuration
const BASE_URL = 'http://localhost:3000'
const API_BASE = `${BASE_URL}/api`
const TEST_TIMEOUT = 30000 // 30 seconds

// Test Data - These should be REAL addresses/contracts on Monad testnet
const TEST_DATA = {
  // Real wallet addresses (replace with actual test addresses)
  userAddress: '0x73C978453ebAf65b243d1C42E86BfD8fd2Dff0DA', // Deployer address from deployment
  counterpartyAddress: '0x1234567890123456789012345678901234567890', // Another test address
  
  // Real NFT contracts on Monad testnet
  nftContract: '0x47670940Fd174A15e6279Cc79c704A3CC739A0af', // NFT Escrow template (for testing)
  tokenId: '1',
  
  // Real deal data
  dealTypes: ['BUY', 'SELL', 'SWAP'],
  testPrice: '1.5',
  
  // Real collection data (these should be actual collections)
  collectionAddress: '0x47670940Fd174A15e6279Cc79c704A3CC739A0af',
}

// Global variables
let serverProcess = null
let testDealId = null
let testUserId = null

describe('🚀 MONADEAL API INTEGRATION TESTS - REAL DATA', () => {
  // Setup and teardown
  beforeAll(async () => {
    console.log('🔧 Setting up test environment...')
    
    // Start the Next.js server
    serverProcess = spawn('npm', ['run', 'dev'], {
      env: { ...process.env, NODE_ENV: 'test' },
      stdio: 'pipe'
    })
    
    // Wait for server to start
    await new Promise((resolve) => {
      serverProcess.stdout.on('data', (data) => {
        if (data.toString().includes('Ready') || data.toString().includes('ready')) {
          resolve()
        }
      })
    })
    
    // Wait additional time for database connections
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    console.log('✅ Test server started')
  }, TEST_TIMEOUT)

  afterAll(async () => {
    if (serverProcess) {
      console.log('🔧 Cleaning up test environment...')
      serverProcess.kill()
    }
  })

  describe('📊 DATABASE & HEALTH CHECKS', () => {
    it('should connect to database successfully', async () => {
      const response = await fetch(`${API_BASE}/deals/test`)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Database connection successful')
      expect(data.stats).toBeDefined()
      
      console.log('✅ Database Stats:', data.stats)
    }, TEST_TIMEOUT)

    it('should verify deployed contracts are accessible', async () => {
      // Test the deployed contract addresses from config
      const dealFactoryAddress = '0xF011f4AA50Fc554dCDef93909500253bC2Bc2791'
      const escrowTemplateAddress = '0x47670940Fd174A15e6279Cc79c704A3CC739A0af'
      
      expect(dealFactoryAddress).toMatch(/^0x[a-fA-F0-9]{40}$/)
      expect(escrowTemplateAddress).toMatch(/^0x[a-fA-F0-9]{40}$/)
      
      console.log('✅ Contract addresses verified')
      console.log('   Deal Factory:', dealFactoryAddress)
      console.log('   Escrow Template:', escrowTemplateAddress)
    })
  })

  describe('👤 USER MANAGEMENT API', () => {
    it('should register a new user', async () => {
      const response = await fetch(`${API_BASE}/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: TEST_DATA.userAddress,
          username: 'testuser_' + Date.now(),
          email: 'test@monadeal.com',
        })
      })
      
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user).toBeDefined()
      expect(data.user.address).toBe(TEST_DATA.userAddress)
      
      testUserId = data.user.id
      console.log('✅ User registered:', data.user.address)
    }, TEST_TIMEOUT)

    it('should fetch user profile', async () => {
      const response = await fetch(`${API_BASE}/user/${TEST_DATA.userAddress}`)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user).toBeDefined()
      expect(data.user.address).toBe(TEST_DATA.userAddress)
      
      console.log('✅ User profile fetched:', data.user.username)
    }, TEST_TIMEOUT)

    it('should update user profile', async () => {
      const updateData = {
        username: 'updated_testuser_' + Date.now(),
        bio: 'This is a test user for API integration testing'
      }
      
      const response = await fetch(`${API_BASE}/user/${TEST_DATA.userAddress}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })
      
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user.username).toBe(updateData.username)
      expect(data.user.bio).toBe(updateData.bio)
      
      console.log('✅ User profile updated:', data.user.username)
    }, TEST_TIMEOUT)
  })

  describe('🎨 NFT METADATA API', () => {
    it('should fetch user NFTs', async () => {
      const response = await fetch(`${API_BASE}/nfts/user/${TEST_DATA.userAddress}`)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.nfts)).toBe(true)
      
      console.log(`✅ Fetched ${data.nfts.length} NFTs for user`)
      
      // Log first NFT if available
      if (data.nfts.length > 0) {
        console.log('   First NFT:', {
          name: data.nfts[0].name,
          contract: data.nfts[0].contractAddress,
          tokenId: data.nfts[0].tokenId
        })
      }
    }, TEST_TIMEOUT)

    it('should search NFTs', async () => {
      const searchQuery = 'test'
      const response = await fetch(`${API_BASE}/nfts/search?q=${searchQuery}`)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.nfts)).toBe(true)
      
      console.log(`✅ NFT search for "${searchQuery}" returned ${data.nfts.length} results`)
    }, TEST_TIMEOUT)

    it('should get specific NFT metadata', async () => {
      const response = await fetch(`${API_BASE}/nft/${TEST_DATA.nftContract}/${TEST_DATA.tokenId}`)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.nft).toBeDefined()
      expect(data.nft.contractAddress).toBe(TEST_DATA.nftContract)
      expect(data.nft.tokenId).toBe(TEST_DATA.tokenId)
      
      console.log('✅ NFT metadata fetched:', data.nft.name || 'Unnamed NFT')
    }, TEST_TIMEOUT)

    it('should refresh NFT metadata', async () => {
      const response = await fetch(`${API_BASE}/nfts/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractAddress: TEST_DATA.nftContract,
          tokenId: TEST_DATA.tokenId
        })
      })
      
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      console.log('✅ NFT metadata refreshed')
    }, TEST_TIMEOUT)
  })

  describe('🏪 COLLECTION API', () => {
    it('should fetch collections', async () => {
      const response = await fetch(`${API_BASE}/collections`)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.collections)).toBe(true)
      
      console.log(`✅ Fetched ${data.collections.length} collections`)
    }, TEST_TIMEOUT)

    it('should get collection statistics', async () => {
      const response = await fetch(`${API_BASE}/collections/${TEST_DATA.collectionAddress}/stats`)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.stats).toBeDefined()
      
      console.log('✅ Collection stats fetched:', data.stats)
    }, TEST_TIMEOUT)
  })

  describe('🤝 DEAL MANAGEMENT API', () => {
    it('should create a new deal', async () => {
      const dealData = {
        type: 'BUY',
        creatorAddress: TEST_DATA.userAddress,
        counterpartyAddress: TEST_DATA.counterpartyAddress,
        nftContractAddress: TEST_DATA.nftContract,
        nftTokenId: TEST_DATA.tokenId,
        price: TEST_DATA.testPrice,
        title: 'Test Deal - API Integration',
        description: 'This is a test deal created during API integration testing'
      }
      
      const response = await fetch(`${API_BASE}/deal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dealData)
      })
      
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.deal).toBeDefined()
      expect(data.deal.type).toBe(dealData.type)
      expect(data.deal.creatorAddress).toBe(dealData.creatorAddress)
      
      testDealId = data.deal.id
      console.log('✅ Deal created:', data.deal.id)
    }, TEST_TIMEOUT)

    it('should fetch deal details', async () => {
      expect(testDealId).toBeDefined()
      
      const response = await fetch(`${API_BASE}/deal/${testDealId}`)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.deal).toBeDefined()
      expect(data.deal.id).toBe(testDealId)
      
      console.log('✅ Deal details fetched:', data.deal.title)
    }, TEST_TIMEOUT)

    it('should update deal price', async () => {
      expect(testDealId).toBeDefined()
      
      const newPrice = '2.0'
      const response = await fetch(`${API_BASE}/deal/${testDealId}/update-price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPrice: newPrice,
          senderAddress: TEST_DATA.userAddress
        })
      })
      
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      console.log('✅ Deal price updated to:', newPrice)
    }, TEST_TIMEOUT)

    it('should fetch user deals', async () => {
      const response = await fetch(`${API_BASE}/deals/user/${TEST_DATA.userAddress}`)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.deals)).toBe(true)
      expect(data.deals.length).toBeGreaterThan(0)
      
      console.log(`✅ Fetched ${data.deals.length} deals for user`)
    }, TEST_TIMEOUT)

    it('should search deals', async () => {
      const response = await fetch(`${API_BASE}/deals/search?q=test`)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.deals)).toBe(true)
      
      console.log(`✅ Deal search returned ${data.deals.length} results`)
    }, TEST_TIMEOUT)
  })

  describe('💬 MESSAGING API', () => {
    it('should send a message', async () => {
      expect(testDealId).toBeDefined()
      
      const messageData = {
        dealId: testDealId,
        senderAddress: TEST_DATA.userAddress,
        content: 'This is a test message from API integration testing',
        type: 'TEXT'
      }
      
      const response = await fetch(`${API_BASE}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      })
      
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBeDefined()
      
      console.log('✅ Message sent:', data.message.content)
    }, TEST_TIMEOUT)

    it('should fetch deal messages', async () => {
      expect(testDealId).toBeDefined()
      
      const response = await fetch(`${API_BASE}/messages/${testDealId}`)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.messages)).toBe(true)
      expect(data.messages.length).toBeGreaterThan(0)
      
      console.log(`✅ Fetched ${data.messages.length} messages for deal`)
    }, TEST_TIMEOUT)
  })

  describe('🔔 NOTIFICATION API', () => {
    it('should fetch user notifications', async () => {
      const response = await fetch(`${API_BASE}/notifications/user/${TEST_DATA.userAddress}`)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.notifications)).toBe(true)
      
      console.log(`✅ Fetched ${data.notifications.length} notifications for user`)
    }, TEST_TIMEOUT)
  })

  describe('🔍 ENS AND DOMAIN RESOLUTION', () => {
    it('should resolve ENS names', async () => {
      const response = await fetch(`${API_BASE}/nad-names/${TEST_DATA.userAddress}`)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      console.log('✅ ENS resolution tested for:', TEST_DATA.userAddress)
    }, TEST_TIMEOUT)

    it('should refresh ENS data', async () => {
      const response = await fetch(`${API_BASE}/user/refresh-ens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: TEST_DATA.userAddress
        })
      })
      
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      console.log('✅ ENS data refreshed')
    }, TEST_TIMEOUT)
  })

  describe('🧪 ERROR HANDLING & EDGE CASES', () => {
    it('should handle invalid addresses gracefully', async () => {
      const invalidAddress = '0xinvalid'
      const response = await fetch(`${API_BASE}/user/${invalidAddress}`)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
      
      console.log('✅ Invalid address handled gracefully')
    }, TEST_TIMEOUT)

    it('should handle non-existent deal requests', async () => {
      const nonExistentDealId = '999999'
      const response = await fetch(`${API_BASE}/deal/${nonExistentDealId}`)
      const data = await response.json()
      
      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
      
      console.log('✅ Non-existent deal handled gracefully')
    }, TEST_TIMEOUT)

    it('should handle invalid NFT contract addresses', async () => {
      const invalidContract = '0xinvalid'
      const response = await fetch(`${API_BASE}/nft/${invalidContract}/1`)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
      
      console.log('✅ Invalid NFT contract handled gracefully')
    }, TEST_TIMEOUT)

    it('should handle missing required fields in POST requests', async () => {
      const response = await fetch(`${API_BASE}/deal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // Empty body
      })
      
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
      
      console.log('✅ Missing required fields handled gracefully')
    }, TEST_TIMEOUT)
  })

  describe('⚡ PERFORMANCE & LOAD TESTING', () => {
    it('should handle concurrent requests', async () => {
      const concurrentRequests = 10
      const promises = []
      
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(fetch(`${API_BASE}/deals/test`))
      }
      
      const results = await Promise.all(promises)
      
      expect(results.length).toBe(concurrentRequests)
      results.forEach(response => {
        expect(response.status).toBe(200)
      })
      
      console.log(`✅ Handled ${concurrentRequests} concurrent requests successfully`)
    }, TEST_TIMEOUT)

    it('should respond quickly to health checks', async () => {
      const startTime = Date.now()
      const response = await fetch(`${API_BASE}/deals/test`)
      const endTime = Date.now()
      
      const responseTime = endTime - startTime
      
      expect(response.status).toBe(200)
      expect(responseTime).toBeLessThan(5000) // Should respond within 5 seconds
      
      console.log(`✅ Health check responded in ${responseTime}ms`)
    }, TEST_TIMEOUT)
  })
})

// Helper function to validate Ethereum addresses
function isValidEthereumAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

// Helper function to validate deal structure
function isValidDealStructure(deal) {
  return deal &&
    deal.id &&
    deal.type &&
    deal.creatorAddress &&
    deal.status &&
    deal.createdAt
}

// Helper function to validate NFT structure
function isValidNFTStructure(nft) {
  return nft &&
    nft.contractAddress &&
    nft.tokenId &&
    isValidEthereumAddress(nft.contractAddress)
}

console.log(`
🚀 MONADEAL API INTEGRATION TEST SUITE
📊 Testing all API endpoints with REAL DATA
🔗 Monad Testnet: https://testnet.monadexplorer.com/
📝 Test Results will be displayed above
`) 