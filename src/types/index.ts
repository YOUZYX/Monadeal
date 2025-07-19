// Core Deal Types
export interface Deal {
  id: string;
  type: DealType;
  status: DealStatus;
  createdAt: Date;
  updatedAt: Date;
  creatorAddress: string;
  counterpartyAddress?: string;
  nftContractAddress: string;
  nftTokenId: string;
  price?: string; // In wei for buy/sell deals
  escrowContractAddress?: string;
  transactionHash?: string;
  onchainDealId?: string; // Numeric deal ID from smart contract
}

export enum DealType {
  BUY = 'BUY',
  SELL = 'SELL',
  SWAP = 'SWAP'
}

export enum DealStatus {
  PENDING = 'PENDING',
  AWAITING_BUYER = 'AWAITING_BUYER',
  AWAITING_SELLER = 'AWAITING_SELLER',
  LOCKED_IN_ESCROW = 'LOCKED_IN_ESCROW',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

// NFT Types
export interface NFT {
  contractAddress: string;
  tokenId: string;
  name: string;
  description?: string;
  image?: string;
  imageUrl?: string;
  collection?: {
    name: string;
    slug: string;
  };
  metadata?: Record<string, any>;
  owner?: string;
}

// User Types
export interface User {
  address: string;
  ensName?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Chat Types
export interface ChatMessage {
  id: string;
  dealId: string;
  senderAddress: string;
  content: string;
  timestamp: Date;
  type: MessageType;
}

export enum MessageType {
  TEXT = 'TEXT',
  SYSTEM = 'SYSTEM',
  DEAL_UPDATE = 'DEAL_UPDATE'
}

// Smart Contract Types
export interface EscrowContract {
  address: string;
  dealId: string;
  seller: string;
  buyer: string;
  nftContract: string;
  nftTokenId: string;
  price: string;
  isActive: boolean;
  isCompleted: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Wallet Types
export interface WalletState {
  address?: string;
  isConnected: boolean;
  isConnecting: boolean;
  chain?: {
    id: number;
    name: string;
    rpcUrl: string;
  };
} 