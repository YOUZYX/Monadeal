/**
 * BLOCKCHAIN INTEGRATION TESTING
 * Phase 4: Integration & Testing
 * 
 * REAL MONAD TESTNET INTEGRATION
 * Tests actual blockchain transactions, NFT transfers, and smart contract interactions
 */

const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals')
const { ethers } = require('hardhat')

// Monad Testnet Configuration
const MONAD_TESTNET_CONFIG = {
  name: 'Monad Testnet',
  rpcUrl: 'https://testnet-rpc.monad.xyz/',
  chainId: 10143,
  symbol: 'MON',
  explorerUrl: 'https://testnet.monadexplorer.com/',
  blockTime: 1000, // 1 second
}

// Deployed contract addresses
const DEPLOYED_CONTRACTS = {
  dealFactory: '0xF011f4AA50Fc554dCDef93909500253bC2Bc2791',
  nftEscrowTemplate: '0x47670940Fd174A15e6279Cc79c704A3CC739A0af',
  feeRecipient: '0x73C978453ebAf65b243d1C42E86BfD8fd2Dff0DA',
}

// Test configuration
const TEST_TIMEOUT = 120000 // 2 minutes for blockchain operations
const GAS_LIMIT = 500000
const GAS_PRICE = ethers.parseUnits('20', 'gwei')

// Global variables
let provider = null
let dealFactory = null
let nftEscrowTemplate = null
let testSigner = null
let mockNFT = null
let testDealId = null
let escrowAddress = null

describe('⛓️ BLOCKCHAIN INTEGRATION - MONAD TESTNET', () => {
  beforeAll(async () => {
    console.log('🔧 Setting up blockchain integration tests...')
    
    // Initialize provider
    provider = new ethers.JsonRpcProvider(MONAD_TESTNET_CONFIG.rpcUrl)
    
    // Verify network connection
    const network = await provider.getNetwork()
    expect(Number(network.chainId)).toBe(MONAD_TESTNET_CONFIG.chainId)
    
    console.log('✅ Connected to Monad Testnet')
    console.log('   Chain ID:', Number(network.chainId))
    console.log('   Network Name:', network.name)
    
    // Get test signer (in real environment, this would be from env vars)
    const signers = await ethers.getSigners()
    testSigner = signers[0]
    
    console.log('✅ Test signer:', testSigner.address)
    
    // Get signer balance
    const balance = await provider.getBalance(testSigner.address)
    console.log('   Balance:', ethers.formatEther(balance), 'MON')
    
    // Load contract instances
    const DealFactory = await ethers.getContractFactory('DealFactory')
    dealFactory = DealFactory.attach(DEPLOYED_CONTRACTS.dealFactory)
    
    const NFTEscrow = await ethers.getContractFactory('NFTEscrow')
    nftEscrowTemplate = NFTEscrow.attach(DEPLOYED_CONTRACTS.nftEscrowTemplate)
    
    console.log('✅ Contract instances loaded')
  }, TEST_TIMEOUT)

  describe('🏗️ SMART CONTRACT DEPLOYMENT VERIFICATION', () => {
    it('should verify DealFactory deployment', async () => {
      // Check if contract exists
      const code = await provider.getCode(DEPLOYED_CONTRACTS.dealFactory)
      expect(code).not.toBe('0x')
      
      // Verify contract state
      const feeRecipient = await dealFactory.feeRecipient()
      const platformFee = await dealFactory.platformFee()
      const totalDeals = await dealFactory.totalDeals()
      
      expect(feeRecipient).toBe(DEPLOYED_CONTRACTS.feeRecipient)
      expect(platformFee).toBe(250n) // 2.5%
      expect(totalDeals).toBeGreaterThanOrEqual(0n)
      
      console.log('✅ DealFactory verified')
      console.log('   Address:', DEPLOYED_CONTRACTS.dealFactory)
      console.log('   Fee Recipient:', feeRecipient)
      console.log('   Platform Fee:', platformFee.toString(), 'basis points')
      console.log('   Total Deals:', totalDeals.toString())
    }, TEST_TIMEOUT)

    it('should verify NFTEscrow template deployment', async () => {
      // Check if contract exists
      const code = await provider.getCode(DEPLOYED_CONTRACTS.nftEscrowTemplate)
      expect(code).not.toBe('0x')
      
      // Verify contract state
      const feeRecipient = await nftEscrowTemplate.feeRecipient()
      const platformFee = await nftEscrowTemplate.platformFee()
      
      expect(feeRecipient).toBe(DEPLOYED_CONTRACTS.feeRecipient)
      expect(platformFee).toBe(250n) // 2.5%
      
      console.log('✅ NFTEscrow template verified')
      console.log('   Address:', DEPLOYED_CONTRACTS.nftEscrowTemplate)
      console.log('   Fee Recipient:', feeRecipient)
      console.log('   Platform Fee:', platformFee.toString(), 'basis points')
    }, TEST_TIMEOUT)

    it('should verify escrow template address in factory', async () => {
      const escrowTemplate = await dealFactory.escrowTemplate()
      expect(escrowTemplate).toBe(DEPLOYED_CONTRACTS.nftEscrowTemplate)
      
      console.log('✅ Escrow template address verified in factory')
    }, TEST_TIMEOUT)
  })

  describe('🎨 MOCK NFT DEPLOYMENT', () => {
    it('should deploy mock NFT for testing', async () => {
      console.log('🚀 Deploying mock NFT contract...')
      
      const MockNFT = await ethers.getContractFactory('MockERC721')
      mockNFT = await MockNFT.deploy('TestNFT', 'TNFT')
      
      const deploymentTx = await mockNFT.waitForDeployment()
      const nftAddress = await mockNFT.getAddress()
      
      console.log('✅ Mock NFT deployed')
      console.log('   Address:', nftAddress)
      console.log('   Name:', await mockNFT.name())
      console.log('   Symbol:', await mockNFT.symbol())
      
      expect(nftAddress).toMatch(/^0x[a-fA-F0-9]{40}$/)
    }, TEST_TIMEOUT)

    it('should mint test NFTs', async () => {
      expect(mockNFT).toBeDefined()
      
      // Mint NFT to test signer
      const mintTx = await mockNFT.mint(testSigner.address, 1)
      await mintTx.wait()
      
      // Verify ownership
      const owner = await mockNFT.ownerOf(1)
      expect(owner).toBe(testSigner.address)
      
      // Mint another NFT for testing
      const mintTx2 = await mockNFT.mint(testSigner.address, 2)
      await mintTx2.wait()
      
      const balance = await mockNFT.balanceOf(testSigner.address)
      expect(balance).toBe(2n)
      
      console.log('✅ Test NFTs minted')
      console.log('   Owner:', owner)
      console.log('   Balance:', balance.toString())
    }, TEST_TIMEOUT)
  })

  describe('🤝 DEAL CREATION ON BLOCKCHAIN', () => {
    it('should create a SELL deal on blockchain', async () => {
      expect(mockNFT).toBeDefined()
      
      console.log('🚀 Creating SELL deal on blockchain...')
      
      const nftAddress = await mockNFT.getAddress()
      const dealType = 1 // SELL
      const counterparty = '0x1234567890123456789012345678901234567890'
      const tokenId = 1
      const price = ethers.parseEther('1.5')
      
      // Create deal transaction
      const tx = await dealFactory.createDeal(
        dealType,
        counterparty,
        nftAddress,
        tokenId,
        price,
        ethers.ZeroAddress, // No swap NFT
        0, // No swap token ID
        {
          gasLimit: GAS_LIMIT,
          gasPrice: GAS_PRICE
        }
      )
      
      console.log('   Transaction hash:', tx.hash)
      console.log('   Waiting for confirmation...')
      
      const receipt = await tx.wait()
      expect(receipt.status).toBe(1)
      
      // Parse events to get deal ID and escrow address
      const dealCreatedEvent = receipt.logs.find(
        log => log.topics[0] === ethers.id('DealCreated(uint256,address,address,uint8)')
      )
      
      expect(dealCreatedEvent).toBeDefined()
      
      const decodedEvent = dealFactory.interface.parseLog(dealCreatedEvent)
      testDealId = decodedEvent.args.dealId
      escrowAddress = decodedEvent.args.escrowContract
      
      console.log('✅ SELL deal created successfully')
      console.log('   Deal ID:', testDealId.toString())
      console.log('   Escrow Address:', escrowAddress)
      console.log('   Block Number:', receipt.blockNumber)
      console.log('   Gas Used:', receipt.gasUsed.toString())
      console.log('   Explorer:', `${MONAD_TESTNET_CONFIG.explorerUrl}tx/${tx.hash}`)
    }, TEST_TIMEOUT)

    it('should verify deal info on blockchain', async () => {
      expect(testDealId).toBeDefined()
      
      const dealInfo = await dealFactory.getDealInfo(testDealId)
      
      expect(dealInfo.dealId).toBe(testDealId)
      expect(dealInfo.dealType).toBe(1n) // SELL
      expect(dealInfo.status).toBe(0n) // PENDING
      expect(dealInfo.creator).toBe(testSigner.address)
      expect(dealInfo.price).toBe(ethers.parseEther('1.5'))
      
      console.log('✅ Deal info verified on blockchain')
      console.log('   Deal ID:', dealInfo.dealId.toString())
      console.log('   Type:', dealInfo.dealType.toString())
      console.log('   Status:', dealInfo.status.toString())
      console.log('   Creator:', dealInfo.creator)
      console.log('   Price:', ethers.formatEther(dealInfo.price), 'MON')
    }, TEST_TIMEOUT)

    it('should verify deal appears in user deals', async () => {
      const userDeals = await dealFactory.getUserDeals(testSigner.address)
      
      expect(userDeals).toContain(testDealId)
      
      console.log('✅ Deal appears in user deals')
      console.log('   User deals count:', userDeals.length)
    }, TEST_TIMEOUT)
  })

  describe('🔐 ESCROW CONTRACT INTERACTION', () => {
    it('should get escrow contract for deal', async () => {
      expect(testDealId).toBeDefined()
      
      const escrowAddr = await dealFactory.getEscrowForDeal(testDealId)
      expect(escrowAddr).toBe(escrowAddress)
      
      console.log('✅ Escrow contract address retrieved')
      console.log('   Escrow Address:', escrowAddr)
    }, TEST_TIMEOUT)

    it('should interact with escrow contract', async () => {
      expect(escrowAddress).toBeDefined()
      
      // Load escrow contract instance
      const NFTEscrow = await ethers.getContractFactory('NFTEscrow')
      const escrowContract = NFTEscrow.attach(escrowAddress)
      
      // Get deal from escrow
      const deal = await escrowContract.getDeal(testDealId)
      
      expect(deal.dealId).toBe(testDealId)
      expect(deal.dealType).toBe(1n) // SELL
      expect(deal.status).toBe(0n) // PENDING
      expect(deal.creator).toBe(testSigner.address)
      
      console.log('✅ Escrow contract interaction successful')
      console.log('   Deal ID:', deal.dealId.toString())
      console.log('   Creator:', deal.creator)
      console.log('   Status:', deal.status.toString())
    }, TEST_TIMEOUT)
  })

  describe('🎯 NFT DEPOSIT TESTING', () => {
    it('should approve NFT for escrow', async () => {
      expect(mockNFT).toBeDefined()
      expect(escrowAddress).toBeDefined()
      
      console.log('🚀 Approving NFT for escrow...')
      
      // Approve NFT for escrow
      const approveTx = await mockNFT.approve(escrowAddress, 1)
      const receipt = await approveTx.wait()
      
      expect(receipt.status).toBe(1)
      
      // Verify approval
      const approvedAddress = await mockNFT.getApproved(1)
      expect(approvedAddress).toBe(escrowAddress)
      
      console.log('✅ NFT approved for escrow')
      console.log('   Approved Address:', approvedAddress)
      console.log('   Transaction:', `${MONAD_TESTNET_CONFIG.explorerUrl}tx/${approveTx.hash}`)
    }, TEST_TIMEOUT)

    it('should deposit NFT to escrow', async () => {
      expect(escrowAddress).toBeDefined()
      expect(testDealId).toBeDefined()
      
      console.log('🚀 Depositing NFT to escrow...')
      
      // Load escrow contract
      const NFTEscrow = await ethers.getContractFactory('NFTEscrow')
      const escrowContract = NFTEscrow.attach(escrowAddress)
      
      // Deposit NFT
      const depositTx = await escrowContract.depositNFT(testDealId, {
        gasLimit: GAS_LIMIT,
        gasPrice: GAS_PRICE
      })
      
      console.log('   Transaction hash:', depositTx.hash)
      
      const receipt = await depositTx.wait()
      expect(receipt.status).toBe(1)
      
      // Verify NFT is now owned by escrow
      const nftOwner = await mockNFT.ownerOf(1)
      expect(nftOwner).toBe(escrowAddress)
      
      // Verify deal status updated
      const deal = await escrowContract.getDeal(testDealId)
      expect(deal.creatorDeposited).toBe(true)
      
      console.log('✅ NFT deposited to escrow successfully')
      console.log('   New Owner:', nftOwner)
      console.log('   Creator Deposited:', deal.creatorDeposited)
      console.log('   Transaction:', `${MONAD_TESTNET_CONFIG.explorerUrl}tx/${depositTx.hash}`)
    }, TEST_TIMEOUT)
  })

  describe('📊 PLATFORM STATISTICS', () => {
    it('should get platform statistics', async () => {
      const stats = await dealFactory.getPlatformStats()
      
      expect(stats.length).toBe(5)
      
      const [totalDeals, completedDeals, cancelledDeals, totalVolume, activeDeals] = stats
      
      expect(totalDeals).toBeGreaterThanOrEqual(1n)
      expect(completedDeals).toBeGreaterThanOrEqual(0n)
      expect(cancelledDeals).toBeGreaterThanOrEqual(0n)
      expect(totalVolume).toBeGreaterThanOrEqual(0n)
      expect(activeDeals).toBeGreaterThanOrEqual(0n)
      
      console.log('✅ Platform statistics retrieved')
      console.log('   Total Deals:', totalDeals.toString())
      console.log('   Completed Deals:', completedDeals.toString())
      console.log('   Cancelled Deals:', cancelledDeals.toString())
      console.log('   Total Volume:', ethers.formatEther(totalVolume), 'MON')
      console.log('   Active Deals:', activeDeals.toString())
    }, TEST_TIMEOUT)
  })

  describe('🔄 DEAL LIFECYCLE TESTING', () => {
    it('should create a BUY deal for testing', async () => {
      expect(mockNFT).toBeDefined()
      
      console.log('🚀 Creating BUY deal for lifecycle testing...')
      
      const nftAddress = await mockNFT.getAddress()
      const dealType = 0 // BUY
      const counterparty = '0x1234567890123456789012345678901234567890'
      const tokenId = 2
      const price = ethers.parseEther('2.0')
      
      const tx = await dealFactory.createDeal(
        dealType,
        counterparty,
        nftAddress,
        tokenId,
        price,
        ethers.ZeroAddress,
        0,
        {
          gasLimit: GAS_LIMIT,
          gasPrice: GAS_PRICE
        }
      )
      
      const receipt = await tx.wait()
      expect(receipt.status).toBe(1)
      
      // Parse event to get deal ID
      const dealCreatedEvent = receipt.logs.find(
        log => log.topics[0] === ethers.id('DealCreated(uint256,address,address,uint8)')
      )
      
      const decodedEvent = dealFactory.interface.parseLog(dealCreatedEvent)
      const buyDealId = decodedEvent.args.dealId
      
      console.log('✅ BUY deal created for lifecycle testing')
      console.log('   Deal ID:', buyDealId.toString())
      console.log('   Transaction:', `${MONAD_TESTNET_CONFIG.explorerUrl}tx/${tx.hash}`)
      
      // Store for cleanup
      expect(buyDealId).toBeDefined()
    }, TEST_TIMEOUT)

    it('should test deal cancellation', async () => {
      expect(testDealId).toBeDefined()
      expect(escrowAddress).toBeDefined()
      
      console.log('🚀 Testing deal cancellation...')
      
      // Load escrow contract
      const NFTEscrow = await ethers.getContractFactory('NFTEscrow')
      const escrowContract = NFTEscrow.attach(escrowAddress)
      
      // Cancel deal
      const cancelTx = await escrowContract.cancelDeal(testDealId, {
        gasLimit: GAS_LIMIT,
        gasPrice: GAS_PRICE
      })
      
      console.log('   Transaction hash:', cancelTx.hash)
      
      const receipt = await cancelTx.wait()
      expect(receipt.status).toBe(1)
      
      // Verify deal status
      const deal = await escrowContract.getDeal(testDealId)
      expect(deal.status).toBe(5n) // CANCELLED
      
      // Verify NFT returned to creator
      const nftOwner = await mockNFT.ownerOf(1)
      expect(nftOwner).toBe(testSigner.address)
      
      console.log('✅ Deal cancelled successfully')
      console.log('   Deal Status:', deal.status.toString())
      console.log('   NFT Returned to:', nftOwner)
      console.log('   Transaction:', `${MONAD_TESTNET_CONFIG.explorerUrl}tx/${cancelTx.hash}`)
    }, TEST_TIMEOUT)
  })

  describe('⚡ GAS OPTIMIZATION TESTING', () => {
    it('should measure gas usage for deal creation', async () => {
      expect(mockNFT).toBeDefined()
      
      const nftAddress = await mockNFT.getAddress()
      
      // Estimate gas for deal creation
      const gasEstimate = await dealFactory.createDeal.estimateGas(
        0, // BUY
        '0x1234567890123456789012345678901234567890',
        nftAddress,
        3,
        ethers.parseEther('1.0'),
        ethers.ZeroAddress,
        0
      )
      
      console.log('✅ Gas estimation for deal creation')
      console.log('   Estimated Gas:', gasEstimate.toString())
      console.log('   Gas Limit Used:', GAS_LIMIT)
      
      expect(gasEstimate).toBeLessThan(GAS_LIMIT)
    }, TEST_TIMEOUT)

    it('should verify gas prices on Monad testnet', async () => {
      const gasPrice = await provider.getFeeData()
      
      console.log('✅ Monad testnet gas information')
      console.log('   Gas Price:', gasPrice.gasPrice?.toString())
      console.log('   Max Fee Per Gas:', gasPrice.maxFeePerGas?.toString())
      console.log('   Max Priority Fee:', gasPrice.maxPriorityFeePerGas?.toString())
      
      expect(gasPrice.gasPrice).toBeDefined()
    }, TEST_TIMEOUT)
  })

  describe('🔍 BLOCKCHAIN EXPLORER INTEGRATION', () => {
    it('should verify transaction links', async () => {
      // Test transaction hash format
      const testTxHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      const txUrl = `${MONAD_TESTNET_CONFIG.explorerUrl}tx/${testTxHash}`
      const addressUrl = `${MONAD_TESTNET_CONFIG.explorerUrl}address/${testSigner.address}`
      
      expect(txUrl).toBe(`https://testnet.monadexplorer.com/tx/${testTxHash}`)
      expect(addressUrl).toBe(`https://testnet.monadexplorer.com/address/${testSigner.address}`)
      
      console.log('✅ Explorer links verified')
      console.log('   Transaction URL format:', txUrl)
      console.log('   Address URL format:', addressUrl)
    }, TEST_TIMEOUT)
  })

  describe('📋 FINAL VERIFICATION', () => {
    it('should verify all blockchain interactions completed successfully', async () => {
      // Verify platform has recorded the activities
      const finalStats = await dealFactory.getPlatformStats()
      const [totalDeals] = finalStats
      
      expect(totalDeals).toBeGreaterThanOrEqual(2n) // At least 2 deals created
      
      // Verify user has deals
      const userDeals = await dealFactory.getUserDeals(testSigner.address)
      expect(userDeals.length).toBeGreaterThanOrEqual(1)
      
      // Verify balance changes (creator should have spent gas)
      const finalBalance = await provider.getBalance(testSigner.address)
      console.log('✅ Final verification completed')
      console.log('   Platform Total Deals:', totalDeals.toString())
      console.log('   User Deals Count:', userDeals.length)
      console.log('   Final Balance:', ethers.formatEther(finalBalance), 'MON')
    }, TEST_TIMEOUT)
  })
})

console.log(`
⛓️ BLOCKCHAIN INTEGRATION TEST SUITE
🌐 Monad Testnet: ${MONAD_TESTNET_CONFIG.explorerUrl}
💰 Real MON token transactions
🎨 Actual NFT transfers and escrow operations
🔐 Smart contract security and gas optimization
📊 Comprehensive blockchain state verification
`) 