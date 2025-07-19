// This file will contain the ABIs for our smart contracts
// ABIs will be added after smart contract development in Phase 1.2

export const NFT_ESCROW_ABI = [
  // Will be populated after smart contract development
] as const

export const DEAL_FACTORY_ABI = [
  // Will be populated after smart contract development
] as const

export const ERC721_ABI = [
  // Standard ERC721 ABI for NFT interactions
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "ownerOf",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "tokenURI",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const

// Contract ABIs for DealFactory and NFTEscrow
export const DealFactoryABI = [
  // Constructor
  {
    inputs: [{ internalType: "address", name: "_feeRecipient", type: "address" }],
    stateMutability: "nonpayable",
    type: "constructor"
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "dealId", type: "uint256" },
      { indexed: true, internalType: "address", name: "escrowContract", type: "address" },
      { indexed: true, internalType: "address", name: "creator", type: "address" },
      { indexed: false, internalType: "uint8", name: "dealType", type: "uint8" }
    ],
    name: "DealCreated",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "dealId", type: "uint256" },
      { indexed: true, internalType: "address", name: "escrowContract", type: "address" },
      { indexed: true, internalType: "address", name: "creator", type: "address" },
      { indexed: false, internalType: "address", name: "counterparty", type: "address" },
      { indexed: false, internalType: "uint256", name: "volume", type: "uint256" }
    ],
    name: "DealCompleted",
    type: "event"
  },
  // Functions
  {
    inputs: [
      { internalType: "uint8", name: "_dealType", type: "uint8" },
      { internalType: "address", name: "_counterparty", type: "address" },
      { internalType: "address", name: "_nftContract", type: "address" },
      { internalType: "uint256", name: "_tokenId", type: "uint256" },
      { internalType: "uint256", name: "_price", type: "uint256" },
      { internalType: "address", name: "_swapNftContract", type: "address" },
      { internalType: "uint256", name: "_swapTokenId", type: "uint256" }
    ],
    name: "createDeal",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "address", name: "", type: "address" }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "_dealId", type: "uint256" }],
    name: "getDealInfo",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "dealId", type: "uint256" },
          { internalType: "address", name: "escrowContract", type: "address" },
          { internalType: "address", name: "creator", type: "address" },
          { internalType: "address", name: "counterparty", type: "address" },
          { internalType: "uint8", name: "dealType", type: "uint8" },
          { internalType: "uint8", name: "status", type: "uint8" },
          { internalType: "address", name: "nftContract", type: "address" },
          { internalType: "uint256", name: "tokenId", type: "uint256" },
          { internalType: "uint256", name: "price", type: "uint256" },
          { internalType: "uint256", name: "createdAt", type: "uint256" },
          { internalType: "uint256", name: "expiresAt", type: "uint256" }
        ],
        internalType: "struct DealFactory.DealInfo",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "_user", type: "address" }],
    name: "getUserDeals",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "_user", type: "address" }],
    name: "getUserDealsInfo",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "dealId", type: "uint256" },
          { internalType: "address", name: "escrowContract", type: "address" },
          { internalType: "address", name: "creator", type: "address" },
          { internalType: "address", name: "counterparty", type: "address" },
          { internalType: "uint8", name: "dealType", type: "uint8" },
          { internalType: "uint8", name: "status", type: "uint8" },
          { internalType: "address", name: "nftContract", type: "address" },
          { internalType: "uint256", name: "tokenId", type: "uint256" },
          { internalType: "uint256", name: "price", type: "uint256" },
          { internalType: "uint256", name: "createdAt", type: "uint256" },
          { internalType: "uint256", name: "expiresAt", type: "uint256" }
        ],
        internalType: "struct DealFactory.DealInfo[]",
        name: "",
        type: "tuple[]"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getPlatformStats",
    outputs: [
      { internalType: "uint256", name: "_totalDeals", type: "uint256" },
      { internalType: "uint256", name: "_totalCompletedDeals", type: "uint256" },
      { internalType: "uint256", name: "_totalCancelledDeals", type: "uint256" },
      { internalType: "uint256", name: "_totalVolume", type: "uint256" },
      { internalType: "uint256", name: "_totalActiveDeals", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "dealToEscrow",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "_dealId", type: "uint256" }],
    name: "getEscrowForDeal",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  }
] as const

export const NFTEscrowABI = [
  // Constructor
  {
    inputs: [{ internalType: "address", name: "_feeRecipient", type: "address" }],
    stateMutability: "nonpayable",
    type: "constructor"
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "dealId", type: "uint256" },
      { indexed: false, internalType: "uint8", name: "dealType", type: "uint8" },
      { indexed: true, internalType: "address", name: "creator", type: "address" },
      { indexed: true, internalType: "address", name: "counterparty", type: "address" },
      { indexed: false, internalType: "address", name: "nftContract", type: "address" },
      { indexed: false, internalType: "uint256", name: "tokenId", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "price", type: "uint256" }
    ],
    name: "DealCreated",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "dealId", type: "uint256" },
      { indexed: true, internalType: "address", name: "counterparty", type: "address" }
    ],
    name: "DealAccepted",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "dealId", type: "uint256" },
      { indexed: true, internalType: "address", name: "creator", type: "address" },
      { indexed: true, internalType: "address", name: "counterparty", type: "address" }
    ],
    name: "DealCompleted",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "dealId", type: "uint256" },
      { indexed: true, internalType: "address", name: "cancelledBy", type: "address" }
    ],
    name: "DealCancelled",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "dealId", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "oldPrice", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "newPrice", type: "uint256" },
      { indexed: true, internalType: "address", name: "updatedBy", type: "address" }
    ],
    name: "DealPriceUpdated",
    type: "event"
  },
  // Functions
  {
    inputs: [
      { internalType: "uint8", name: "_dealType", type: "uint8" },
      { internalType: "address", name: "_counterparty", type: "address" },
      { internalType: "address", name: "_nftContract", type: "address" },
      { internalType: "uint256", name: "_tokenId", type: "uint256" },
      { internalType: "uint256", name: "_price", type: "uint256" },
      { internalType: "address", name: "_swapNftContract", type: "address" },
      { internalType: "uint256", name: "_swapTokenId", type: "uint256" }
    ],
    name: "createDeal",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "_dealId", type: "uint256" }],
    name: "acceptDeal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "_dealId", type: "uint256" }],
    name: "depositNFT",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "_dealId", type: "uint256" }],
    name: "depositPayment",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "_dealId", type: "uint256" }],
    name: "completeDeal",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "_dealId", type: "uint256" }],
    name: "cancelDeal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "_dealId", type: "uint256" },
      { internalType: "uint256", name: "_newPrice", type: "uint256" }
    ],
    name: "updateDealPrice",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "_dealId", type: "uint256" }],
    name: "getDealStatus",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "_dealId", type: "uint256" }],
    name: "getDeal",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "dealId", type: "uint256" },
          { internalType: "uint8", name: "dealType", type: "uint8" },
          { internalType: "uint8", name: "status", type: "uint8" },
          { internalType: "address", name: "creator", type: "address" },
          { internalType: "address", name: "counterparty", type: "address" },
          { internalType: "address", name: "nftContract", type: "address" },
          { internalType: "uint256", name: "tokenId", type: "uint256" },
          { internalType: "uint256", name: "price", type: "uint256" },
          { internalType: "address", name: "swapNftContract", type: "address" },
          { internalType: "uint256", name: "swapTokenId", type: "uint256" },
          { internalType: "bool", name: "creatorDeposited", type: "bool" },
          { internalType: "bool", name: "counterpartyDeposited", type: "bool" },
          { internalType: "uint256", name: "createdAt", type: "uint256" },
          { internalType: "uint256", name: "expiresAt", type: "uint256" }
        ],
        internalType: "struct NFTEscrow.Deal",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "_user", type: "address" }],
    name: "getUserDeals",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function"
  }
] as const 