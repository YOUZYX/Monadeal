const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Verifying Monadeal deployment on Monad testnet...\n");

  // Contract addresses from deployment
  const DEAL_FACTORY_ADDRESS = "0xF011f4AA50Fc554dCDef93909500253bC2Bc2791";
  const NFT_ESCROW_TEMPLATE_ADDRESS = "0x47670940Fd174A15e6279Cc79c704A3CC739A0af";

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("✅ Connected with wallet:", signer.address);
  
  // Get wallet balance
  const balance = await ethers.provider.getBalance(signer.address);
  console.log("💰 Wallet balance:", ethers.formatEther(balance), "MON\n");

  try {
    // Connect to DealFactory
    const DealFactory = await ethers.getContractFactory("DealFactory");
    const dealFactory = DealFactory.attach(DEAL_FACTORY_ADDRESS);
    
    console.log("📋 Testing DealFactory contract...");
    
    // Test basic reads
    const feeRecipient = await dealFactory.feeRecipient();
    const platformFee = await dealFactory.platformFee();
    const totalDeals = await dealFactory.totalDeals();
    const escrowTemplate = await dealFactory.escrowTemplate();
    
    console.log("✅ Fee recipient:", feeRecipient);
    console.log("✅ Platform fee:", platformFee.toString(), "basis points");
    console.log("✅ Total deals:", totalDeals.toString());
    console.log("✅ Escrow template:", escrowTemplate);
    
    // Verify the escrow template matches our deployment
    if (escrowTemplate.toLowerCase() === NFT_ESCROW_TEMPLATE_ADDRESS.toLowerCase()) {
      console.log("✅ Escrow template address matches deployment");
    } else {
      console.log("❌ Escrow template address mismatch!");
    }
    
    // Test platform stats
    const stats = await dealFactory.getPlatformStats();
    console.log("\n📊 Platform Statistics:");
    console.log("   Total deals:", stats[0].toString());
    console.log("   Completed deals:", stats[1].toString());
    console.log("   Cancelled deals:", stats[2].toString());
    console.log("   Total volume:", ethers.formatEther(stats[3]), "MON");
    console.log("   Active deals:", stats[4].toString());
    
    // Connect to NFTEscrow template
    console.log("\n📋 Testing NFTEscrow template...");
    const NFTEscrow = await ethers.getContractFactory("NFTEscrow");
    const nftEscrow = NFTEscrow.attach(NFT_ESCROW_TEMPLATE_ADDRESS);
    
    const templateFeeRecipient = await nftEscrow.feeRecipient();
    const templatePlatformFee = await nftEscrow.platformFee();
    const dealCounter = await nftEscrow.dealCounter();
    
    console.log("✅ Template fee recipient:", templateFeeRecipient);
    console.log("✅ Template platform fee:", templatePlatformFee.toString(), "basis points");
    console.log("✅ Template deal counter:", dealCounter.toString());
    
    // Verify ownership
    const factoryOwner = await dealFactory.owner();
    const escrowOwner = await nftEscrow.owner();
    
    console.log("\n👤 Ownership verification:");
    console.log("   DealFactory owner:", factoryOwner);
    console.log("   NFTEscrow owner:", escrowOwner);
    console.log("   Your address:", signer.address);
    
    if (factoryOwner.toLowerCase() === signer.address.toLowerCase()) {
      console.log("✅ You own the DealFactory");
    } else {
      console.log("❌ DealFactory ownership mismatch!");
    }
    
    console.log("\n🎉 Deployment verification completed successfully!");
    console.log("\n📝 Contract addresses for your .env file:");
    console.log(`NEXT_PUBLIC_DEAL_FACTORY_ADDRESS="${DEAL_FACTORY_ADDRESS}"`);
    console.log(`NEXT_PUBLIC_NFT_ESCROW_ADDRESS="${NFT_ESCROW_TEMPLATE_ADDRESS}"`);
    
    console.log("\n🌐 View on Monad Explorer:");
    console.log(`DealFactory: https://testnet.monadexplorer.com/address/${DEAL_FACTORY_ADDRESS}`);
    console.log(`NFTEscrow: https://testnet.monadexplorer.com/address/${NFT_ESCROW_TEMPLATE_ADDRESS}`);
    
  } catch (error) {
    console.error("❌ Error verifying deployment:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 