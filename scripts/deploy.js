const { ethers } = require("hardhat");
const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy DealFactory (which will deploy NFTEscrow template)
  console.log("\nDeploying DealFactory...");
  const DealFactory = await ethers.getContractFactory("DealFactory");
  const dealFactory = await DealFactory.deploy(deployer.address); // Fee recipient is deployer
  await dealFactory.waitForDeployment();
  
  const dealFactoryAddress = await dealFactory.getAddress();
  console.log("DealFactory deployed to:", dealFactoryAddress);
  
  // Get the NFTEscrow template address
  const escrowTemplateAddress = await dealFactory.escrowTemplate();
  console.log("NFTEscrow template deployed to:", escrowTemplateAddress);
  
  // Display deployment info
  console.log("\n=== Deployment Summary ===");
  console.log("Network:", hre.network.name);
  console.log("Deployer:", deployer.address);
  console.log("DealFactory:", dealFactoryAddress);
  console.log("NFTEscrow Template:", escrowTemplateAddress);
  console.log("Fee Recipient:", deployer.address);
  console.log("Platform Fee:", await dealFactory.platformFee(), "basis points");
  
  // Save deployment info to file
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    dealFactory: dealFactoryAddress,
    nftEscrowTemplate: escrowTemplateAddress,
    feeRecipient: deployer.address,
    platformFee: (await dealFactory.platformFee()).toString(),
    timestamp: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber()
  };
  
  const fs = require('fs');
  const path = require('path');
  
  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  // Save deployment info
  const deploymentFile = path.join(deploymentsDir, `${hre.network.name}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\nDeployment info saved to: ${deploymentFile}`);
  
  // Verify contracts on block explorer (if not local network)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nWaiting for block confirmations...");
    await dealFactory.deploymentTransaction().wait(5);
    
    console.log("Verifying contracts on block explorer...");
    try {
      await hre.run("verify:verify", {
        address: dealFactoryAddress,
        constructorArguments: [deployer.address],
      });
      console.log("DealFactory verified successfully");
    } catch (error) {
      console.log("Error verifying DealFactory:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 