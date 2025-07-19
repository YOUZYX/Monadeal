// Monad Testnet Configuration (Official Chain Info)
export const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  network: 'monad-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'MON',
    symbol: 'MON',
  },
  rpcUrls: {
    public: { http: ['https://testnet-rpc.monad.xyz/'] },
    default: { http: ['https://testnet-rpc.monad.xyz/'] },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://testnet.monadexplorer.com/' },
  },
  testnet: true,
} as const

// App Configuration (Server & Client Safe)
export const appConfig = {
  name: 'Monadeal',
  description: 'P2P NFT Trading Platform with Escrow Smart Contracts on Monad',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  
  // Blockchain - Only Monad Testnet
  defaultChain: monadTestnet,
  supportedChains: [monadTestnet],
  
  // Contract Addresses (deployed on Monad testnet)
  contracts: {
    dealFactory: process.env.NEXT_PUBLIC_DEAL_FACTORY_ADDRESS || '0x6122cb4C6043dd7719e4c4cC46a96d773f5C0C8f', // v4 - added updateDealPrice
    nftEscrow: process.env.NEXT_PUBLIC_NFT_ESCROW_ADDRESS || '0x66C721B3Bf13Db6b8FdA9373A236155C5F7d4b84', // v4 - template contract
  },
  
  // API Configuration
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
    alchemyKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || process.env.ALCHEMY_API_KEY || '',
    nftPageSize: 9, // Reduced to 9 for better pagination UX
  },
  
  // Socket.IO Configuration
  socketio: {
    url: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001',
    options: {
      transports: ['websocket', 'polling'],
    },
  },
} as const

export type AppConfig = typeof appConfig 