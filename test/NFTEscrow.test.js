const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFTEscrow", function () {
  let nftEscrow;
  let mockNFT;
  let owner;
  let creator;
  let counterparty;
  let feeRecipient;
  let addrs;

  const DEAL_TYPES = {
    BUY: 0,
    SELL: 1,
    SWAP: 2
  };

  const DEAL_STATUS = {
    PENDING: 0,
    AWAITING_BUYER: 1,
    AWAITING_SELLER: 2,
    LOCKED_IN_ESCROW: 3,
    COMPLETED: 4,
    CANCELLED: 5
  };

  beforeEach(async function () {
    [owner, creator, counterparty, feeRecipient, ...addrs] = await ethers.getSigners();

    // Deploy mock NFT contract
    const MockNFT = await ethers.getContractFactory("MockERC721");
    mockNFT = await MockNFT.deploy("MockNFT", "MNFT");
    await mockNFT.waitForDeployment();

    // Deploy NFTEscrow contract
    const NFTEscrow = await ethers.getContractFactory("NFTEscrow");
    nftEscrow = await NFTEscrow.deploy(feeRecipient.address);
    await nftEscrow.waitForDeployment();

    // Mint NFTs for testing
    await mockNFT.mint(creator.address, 1);
    await mockNFT.mint(creator.address, 2);
    await mockNFT.mint(counterparty.address, 3);
    await mockNFT.mint(counterparty.address, 4);
  });

  describe("Deployment", function () {
    it("Should set the right fee recipient", async function () {
      expect(await nftEscrow.feeRecipient()).to.equal(feeRecipient.address);
    });

    it("Should set the right owner", async function () {
      expect(await nftEscrow.owner()).to.equal(owner.address);
    });

    it("Should start with deal counter at 0", async function () {
      expect(await nftEscrow.dealCounter()).to.equal(0);
    });

    it("Should have correct platform fee", async function () {
      expect(await nftEscrow.platformFee()).to.equal(250); // 2.5%
    });
  });

  describe("Deal Creation", function () {
    it("Should create a BUY deal", async function () {
      const price = ethers.parseEther("1");
      
      await expect(
        nftEscrow.connect(creator).createDeal(
          DEAL_TYPES.BUY,
          counterparty.address,
          mockNFT.target,
          1,
          price,
          ethers.ZeroAddress,
          0
        )
      ).to.emit(nftEscrow, "DealCreated")
        .withArgs(0, DEAL_TYPES.BUY, creator.address, counterparty.address, mockNFT.target, 1, price);

      const deal = await nftEscrow.getDeal(0);
      expect(deal.dealType).to.equal(DEAL_TYPES.BUY);
      expect(deal.status).to.equal(DEAL_STATUS.PENDING);
      expect(deal.creator).to.equal(creator.address);
      expect(deal.counterparty).to.equal(counterparty.address);
      expect(deal.price).to.equal(price);
    });

    it("Should create a SELL deal", async function () {
      const price = ethers.parseEther("1");
      
      await expect(
        nftEscrow.connect(creator).createDeal(
          DEAL_TYPES.SELL,
          counterparty.address,
          mockNFT.target,
          1,
          price,
          ethers.ZeroAddress,
          0
        )
      ).to.emit(nftEscrow, "DealCreated");

      const deal = await nftEscrow.getDeal(0);
      expect(deal.dealType).to.equal(DEAL_TYPES.SELL);
      expect(deal.status).to.equal(DEAL_STATUS.PENDING);
    });

    it("Should create a SWAP deal", async function () {
      await expect(
        nftEscrow.connect(creator).createDeal(
          DEAL_TYPES.SWAP,
          counterparty.address,
          mockNFT.target,
          1,
          0,
          mockNFT.target,
          3
        )
      ).to.emit(nftEscrow, "DealCreated");

      const deal = await nftEscrow.getDeal(0);
      expect(deal.dealType).to.equal(DEAL_TYPES.SWAP);
      expect(deal.swapNftContract).to.equal(mockNFT.target);
      expect(deal.swapTokenId).to.equal(3);
    });

    it("Should fail to create BUY deal with zero price", async function () {
      await expect(
        nftEscrow.connect(creator).createDeal(
          DEAL_TYPES.BUY,
          counterparty.address,
          mockNFT.target,
          1,
          0,
          ethers.ZeroAddress,
          0
        )
      ).to.be.revertedWith("Price must be greater than 0 for BUY deals");
    });

    it("Should fail to create SELL deal if not NFT owner", async function () {
      const price = ethers.parseEther("1");
      
      await expect(
        nftEscrow.connect(counterparty).createDeal(
          DEAL_TYPES.SELL,
          creator.address,
          mockNFT.target,
          1, // Creator owns this NFT
          price,
          ethers.ZeroAddress,
          0
        )
      ).to.be.revertedWith("Must own NFT to create SELL deal");
    });
  });

  describe("Deal Acceptance", function () {
    beforeEach(async function () {
      const price = ethers.parseEther("1");
      await nftEscrow.connect(creator).createDeal(
        DEAL_TYPES.BUY,
        ethers.ZeroAddress, // Open deal
        mockNFT.target,
        1,
        price,
        ethers.ZeroAddress,
        0
      );
    });

    it("Should allow accepting an open deal", async function () {
      await expect(
        nftEscrow.connect(counterparty).acceptDeal(0)
      ).to.emit(nftEscrow, "DealAccepted")
        .withArgs(0, counterparty.address);

      const deal = await nftEscrow.getDeal(0);
      expect(deal.counterparty).to.equal(counterparty.address);
    });

    it("Should fail to accept own deal", async function () {
      await expect(
        nftEscrow.connect(creator).acceptDeal(0)
      ).to.be.revertedWith("Cannot accept own deal");
    });
  });

  describe("NFT Deposits", function () {
    beforeEach(async function () {
      const price = ethers.parseEther("1");
      await nftEscrow.connect(creator).createDeal(
        DEAL_TYPES.SELL,
        counterparty.address,
        mockNFT.target,
        1,
        price,
        ethers.ZeroAddress,
        0
      );
    });

    it("Should allow NFT deposit for SELL deal", async function () {
      // Approve NFT transfer
      await mockNFT.connect(creator).approve(nftEscrow.target, 1);
      
      await expect(
        nftEscrow.connect(creator).depositNFT(0)
      ).to.emit(nftEscrow, "DepositMade")
        .withArgs(0, creator.address, "NFT");

      const deal = await nftEscrow.getDeal(0);
      expect(deal.creatorDeposited).to.be.true;
      expect(deal.status).to.equal(DEAL_STATUS.AWAITING_BUYER);
      
      // Check NFT ownership
      expect(await mockNFT.ownerOf(1)).to.equal(nftEscrow.target);
    });

    it("Should handle SWAP deal deposits", async function () {
      // Create swap deal
      await nftEscrow.connect(creator).createDeal(
        DEAL_TYPES.SWAP,
        counterparty.address,
        mockNFT.target,
        1,
        0,
        mockNFT.target,
        3
      );

      // Creator deposits their NFT
      await mockNFT.connect(creator).approve(nftEscrow.target, 1);
      await nftEscrow.connect(creator).depositNFT(1);

      // Counterparty deposits their NFT
      await mockNFT.connect(counterparty).approve(nftEscrow.target, 3);
      await nftEscrow.connect(counterparty).depositNFT(1);

      const deal = await nftEscrow.getDeal(1);
      expect(deal.creatorDeposited).to.be.true;
      expect(deal.counterpartyDeposited).to.be.true;
      expect(deal.status).to.equal(DEAL_STATUS.LOCKED_IN_ESCROW);
    });
  });

  describe("Payment Deposits", function () {
    beforeEach(async function () {
      const price = ethers.parseEther("1");
      await nftEscrow.connect(creator).createDeal(
        DEAL_TYPES.BUY,
        counterparty.address,
        mockNFT.target,
        1,
        price,
        ethers.ZeroAddress,
        0
      );
    });

    it("Should allow payment deposit for BUY deal", async function () {
      const price = ethers.parseEther("1");
      
      await expect(
        nftEscrow.connect(counterparty).depositPayment(0, { value: price })
      ).to.emit(nftEscrow, "DepositMade")
        .withArgs(0, counterparty.address, "Payment");

      const deal = await nftEscrow.getDeal(0);
      expect(deal.counterpartyDeposited).to.be.true;
      expect(deal.status).to.equal(DEAL_STATUS.AWAITING_SELLER);
    });

    it("Should fail with incorrect payment amount", async function () {
      const wrongPrice = ethers.parseEther("0.5");
      
      await expect(
        nftEscrow.connect(counterparty).depositPayment(0, { value: wrongPrice })
      ).to.be.revertedWith("Incorrect payment amount");
    });
  });

  describe("Deal Completion", function () {
    it("Should complete a BUY deal", async function () {
      const price = ethers.parseEther("1");
      
      // Create BUY deal
      await nftEscrow.connect(creator).createDeal(
        DEAL_TYPES.BUY,
        counterparty.address,
        mockNFT.target,
        1,
        price,
        ethers.ZeroAddress,
        0
      );

      // Counterparty deposits payment
      await nftEscrow.connect(counterparty).depositPayment(0, { value: price });

      // Creator completes deal (transfers NFT)
      await mockNFT.connect(creator).approve(nftEscrow.target, 1);
      
      const creatorBalanceBefore = await ethers.provider.getBalance(creator.address);
      
      await expect(
        nftEscrow.connect(creator).completeDeal(0)
      ).to.emit(nftEscrow, "DealCompleted")
        .withArgs(0, creator.address, counterparty.address);

      // Check NFT ownership
      expect(await mockNFT.ownerOf(1)).to.equal(counterparty.address);
      
      // Check creator received payment minus fee
      const creatorBalanceAfter = await ethers.provider.getBalance(creator.address);
      const expectedAmount = price * 9750n / 10000n; // 97.5% after 2.5% fee
      expect(creatorBalanceAfter).to.be.gt(creatorBalanceBefore);
    });

    it("Should complete a SELL deal", async function () {
      const price = ethers.parseEther("1");
      
      // Create SELL deal
      await nftEscrow.connect(creator).createDeal(
        DEAL_TYPES.SELL,
        counterparty.address,
        mockNFT.target,
        1,
        price,
        ethers.ZeroAddress,
        0
      );

      // Creator deposits NFT
      await mockNFT.connect(creator).approve(nftEscrow.target, 1);
      await nftEscrow.connect(creator).depositNFT(0);

      // Counterparty completes deal with payment
      await expect(
        nftEscrow.connect(counterparty).completeDeal(0, { value: price })
      ).to.emit(nftEscrow, "DealCompleted");

      // Check NFT ownership
      expect(await mockNFT.ownerOf(1)).to.equal(counterparty.address);
    });

    it("Should complete a SWAP deal", async function () {
      // Create SWAP deal
      await nftEscrow.connect(creator).createDeal(
        DEAL_TYPES.SWAP,
        counterparty.address,
        mockNFT.target,
        1,
        0,
        mockNFT.target,
        3
      );

      // Both parties deposit NFTs
      await mockNFT.connect(creator).approve(nftEscrow.target, 1);
      await nftEscrow.connect(creator).depositNFT(0);
      
      await mockNFT.connect(counterparty).approve(nftEscrow.target, 3);
      await nftEscrow.connect(counterparty).depositNFT(0);

      // Complete the swap
      await expect(
        nftEscrow.connect(creator).completeDeal(0)
      ).to.emit(nftEscrow, "DealCompleted");

      // Check NFT ownership swap
      expect(await mockNFT.ownerOf(1)).to.equal(counterparty.address);
      expect(await mockNFT.ownerOf(3)).to.equal(creator.address);
    });
  });

  describe("Deal Cancellation", function () {
    it("Should cancel a deal and return deposits", async function () {
      const price = ethers.parseEther("1");
      
      // Create and set up SELL deal
      await nftEscrow.connect(creator).createDeal(
        DEAL_TYPES.SELL,
        counterparty.address,
        mockNFT.target,
        1,
        price,
        ethers.ZeroAddress,
        0
      );

      await mockNFT.connect(creator).approve(nftEscrow.target, 1);
      await nftEscrow.connect(creator).depositNFT(0);

      // Cancel deal
      await expect(
        nftEscrow.connect(creator).cancelDeal(0)
      ).to.emit(nftEscrow, "DealCancelled")
        .withArgs(0, creator.address);

      // Check NFT returned
      expect(await mockNFT.ownerOf(1)).to.equal(creator.address);
      
      const deal = await nftEscrow.getDeal(0);
      expect(deal.status).to.equal(DEAL_STATUS.CANCELLED);
    });
  });

  describe("Platform Management", function () {
    it("Should update platform fee", async function () {
      const newFee = 500; // 5%
      
      await expect(
        nftEscrow.connect(owner).updatePlatformFee(newFee)
      ).to.emit(nftEscrow, "PlatformFeeUpdated")
        .withArgs(250, newFee);

      expect(await nftEscrow.platformFee()).to.equal(newFee);
    });

    it("Should fail to set fee above 10%", async function () {
      await expect(
        nftEscrow.connect(owner).updatePlatformFee(1001)
      ).to.be.revertedWith("Fee cannot exceed 10%");
    });

    it("Should update fee recipient", async function () {
      const newRecipient = addrs[0].address;
      
      await expect(
        nftEscrow.connect(owner).updateFeeRecipient(newRecipient)
      ).to.emit(nftEscrow, "FeeRecipientUpdated")
        .withArgs(feeRecipient.address, newRecipient);

      expect(await nftEscrow.feeRecipient()).to.equal(newRecipient);
    });

    it("Should pause and unpause contract", async function () {
      await nftEscrow.connect(owner).pause();
      
      // Should fail to create deal when paused
      await expect(
        nftEscrow.connect(creator).createDeal(
          DEAL_TYPES.BUY,
          counterparty.address,
          mockNFT.target,
          1,
          ethers.parseEther("1"),
          ethers.ZeroAddress,
          0
        )
      ).to.be.revertedWithCustomError(nftEscrow, "EnforcedPause");

      await nftEscrow.connect(owner).unpause();
      
      // Should work after unpause
      await expect(
        nftEscrow.connect(creator).createDeal(
          DEAL_TYPES.BUY,
          counterparty.address,
          mockNFT.target,
          1,
          ethers.parseEther("1"),
          ethers.ZeroAddress,
          0
        )
      ).to.emit(nftEscrow, "DealCreated");
    });
  });

  describe("Expired Deals", function () {
    it("Should clean up expired deals", async function () {
      const price = ethers.parseEther("1");
      
      // Create deal
      await nftEscrow.connect(creator).createDeal(
        DEAL_TYPES.SELL,
        counterparty.address,
        mockNFT.target,
        1,
        price,
        ethers.ZeroAddress,
        0
      );

      // Deposit NFT
      await mockNFT.connect(creator).approve(nftEscrow.target, 1);
      await nftEscrow.connect(creator).depositNFT(0);

      // Fast forward time beyond expiry
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]); // 7 days + 1 second
      await ethers.provider.send("evm_mine");

      // Clean up expired deal
      await expect(
        nftEscrow.connect(addrs[0]).cleanupExpiredDeal(0)
      ).to.emit(nftEscrow, "DealCancelled");

      // Check NFT returned
      expect(await mockNFT.ownerOf(1)).to.equal(creator.address);
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      const price = ethers.parseEther("1");
      await nftEscrow.connect(creator).createDeal(
        DEAL_TYPES.BUY,
        counterparty.address,
        mockNFT.target,
        1,
        price,
        ethers.ZeroAddress,
        0
      );
    });

    it("Should get deal status", async function () {
      const status = await nftEscrow.getDealStatus(0);
      expect(status).to.equal(DEAL_STATUS.PENDING);
    });

    it("Should get user deals", async function () {
      const userDeals = await nftEscrow.getUserDeals(creator.address);
      expect(userDeals.length).to.equal(1);
      expect(userDeals[0]).to.equal(0);
    });

    it("Should get full deal information", async function () {
      const deal = await nftEscrow.getDeal(0);
      expect(deal.dealId).to.equal(0);
      expect(deal.creator).to.equal(creator.address);
      expect(deal.counterparty).to.equal(counterparty.address);
      expect(deal.nftContract).to.equal(mockNFT.target);
      expect(deal.tokenId).to.equal(1);
    });
  });
}); 