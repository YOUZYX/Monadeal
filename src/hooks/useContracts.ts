'use client'

import { useCallback, useMemo } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther, type Address } from 'viem'
import { appConfig } from '@/lib/config'
import { DealFactoryABI, NFTEscrowABI } from '@/contracts/abis'

// Types
export interface DealInfo {
  dealId: bigint
  escrowContract: Address
  creator: Address
  counterparty: Address
  dealType: number
  status: number
  nftContract: Address
  tokenId: bigint
  price: bigint
  createdAt: bigint
  expiresAt: bigint
}

export interface EscrowDeal {
  dealId: bigint
  dealType: number
  status: number
  creator: Address
  counterparty: Address
  nftContract: Address
  tokenId: bigint
  price: bigint
  swapNftContract: Address
  swapTokenId: bigint
  creatorDeposited: boolean
  counterpartyDeposited: boolean
  createdAt: bigint
  expiresAt: bigint
}

export interface PlatformStats {
  totalDeals: bigint
  totalCompletedDeals: bigint
  totalCancelledDeals: bigint
  totalVolume: bigint
  totalActiveDeals: bigint
}

export interface CreateDealParams {
  dealType: number
  counterparty: Address
  nftContract: Address
  tokenId: bigint
  price: bigint
  swapNftContract?: Address
  swapTokenId?: bigint
}

// Deal Factory Hooks
export function useDealFactory() {
  return {
    address: appConfig.contracts.dealFactory as Address,
    abi: DealFactoryABI,
  }
}

// Get Deal Info Hook
export function useDealInfo(dealId: string | number) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: appConfig.contracts.dealFactory as Address,
    abi: DealFactoryABI,
    functionName: 'getDealInfo',
    args: [BigInt(dealId || 0)],
    query: {
      enabled: !!dealId,
      refetchInterval: 10000, // Refetch every 10 seconds for real-time updates
    },
  })

  return {
    deal: data as DealInfo | undefined,
    isLoading,
    error,
    refetch,
  }
}

// Get User Deals Hook
export function useUserDeals(userAddress?: Address) {
  const { address: connectedAddress } = useAccount()
  const targetAddress = userAddress || connectedAddress

  const { data, isLoading, error, refetch } = useReadContract({
    address: appConfig.contracts.dealFactory as Address,
    abi: DealFactoryABI,
    functionName: 'getUserDealsInfo',
    args: [targetAddress as Address],
    query: {
      enabled: !!targetAddress,
      refetchInterval: 15000, // Refetch every 15 seconds
    },
  })

  return {
    deals: (data as DealInfo[]) || [],
    isLoading,
    error,
    refetch,
  }
}

// Get Platform Stats Hook
export function usePlatformStats() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: appConfig.contracts.dealFactory as Address,
    abi: DealFactoryABI,
    functionName: 'getPlatformStats',
    query: {
      refetchInterval: 30000, // Refetch every 30 seconds
    },
  })

  const formattedStats = useMemo(() => {
    if (!data) return null
    
    const [totalDeals, totalCompletedDeals, totalCancelledDeals, totalVolume, totalActiveDeals] = data
    
    return {
      totalDeals,
      totalCompletedDeals,
      totalCancelledDeals,
      totalVolume,
      totalActiveDeals,
      formattedVolume: formatEther(totalVolume),
      completionRate: totalDeals > 0 ? Number((totalCompletedDeals * BigInt(100)) / totalDeals) : 0,
    }
  }, [data])

  return {
    stats: formattedStats,
    isLoading,
    error,
    refetch,
  }
}

// Get Escrow Address for Deal Hook
export function useEscrowForDeal(dealId: string | number) {
  const { data, isLoading, error } = useReadContract({
    address: appConfig.contracts.dealFactory as Address,
    abi: DealFactoryABI,
    functionName: 'getEscrowForDeal',
    args: [BigInt(dealId || 0)],
    query: {
      enabled: !!dealId,
    },
  })

  return {
    escrowAddress: data as Address | undefined,
    isLoading,
    error,
  }
}

// Create Deal Hook
export function useCreateDeal() {
  const { writeContract, isPending, error } = useWriteContract()
  const { address } = useAccount()

  const createDeal = useCallback(async (params: CreateDealParams) => {
    if (!address) {
      throw new Error('Wallet not connected')
    }

    const result = await writeContract({
      address: appConfig.contracts.dealFactory as Address,
      abi: DealFactoryABI,
      functionName: 'createDeal',
      args: [
        params.dealType,
        params.counterparty,
        params.nftContract,
        params.tokenId,
        params.price,
        params.swapNftContract || '0x0000000000000000000000000000000000000000',
        params.swapTokenId || BigInt(0),
      ],
    })

    return result
  }, [writeContract, address])

  return {
    createDeal,
    isPending,
    error,
  }
}

// NFT Escrow Hooks
export function useNFTEscrow(escrowAddress?: Address) {
  return {
    address: escrowAddress,
    abi: NFTEscrowABI,
  }
}

// Get Escrow Deal Hook
export function useEscrowDeal(escrowAddress?: Address, dealId?: string | number) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: escrowAddress,
    abi: NFTEscrowABI,
    functionName: 'getDeal',
    args: [BigInt(dealId || 0)],
    query: {
      enabled: !!escrowAddress && !!dealId,
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  })

  return {
    deal: data as EscrowDeal | undefined,
    isLoading,
    error,
    refetch,
  }
}

// Get Deal Status Hook
export function useDealStatus(escrowAddress?: Address, dealId?: string | number) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: escrowAddress,
    abi: NFTEscrowABI,
    functionName: 'getDealStatus',
    args: [BigInt(dealId || 0)],
    query: {
      enabled: !!escrowAddress && !!dealId,
      refetchInterval: 5000, // Refetch every 5 seconds for status updates
    },
  })

  return {
    status: data as number | undefined,
    isLoading,
    error,
    refetch,
  }
}

// Accept Deal Hook
export function useAcceptDeal(escrowAddress?: Address) {
  const { writeContract, isPending, error } = useWriteContract()
  const { address } = useAccount()

  const acceptDeal = useCallback(async (dealId: string | number) => {
    if (!address) {
      throw new Error('Wallet not connected')
    }
    if (!escrowAddress) {
      throw new Error('Escrow address not provided')
    }

    const result = await writeContract({
      address: escrowAddress,
      abi: NFTEscrowABI,
      functionName: 'acceptDeal',
      args: [BigInt(dealId)],
    })

    return result
  }, [writeContract, address, escrowAddress])

  return {
    acceptDeal,
    isPending,
    error,
  }
}

// Deposit NFT Hook
export function useDepositNFT(escrowAddress?: Address) {
  const { writeContract, isPending, error } = useWriteContract()
  const { address } = useAccount()

  const depositNFT = useCallback(async (dealId: string | number) => {
    if (!address) {
      throw new Error('Wallet not connected')
    }
    if (!escrowAddress) {
      throw new Error('Escrow address not provided')
    }

    const result = await writeContract({
      address: escrowAddress,
      abi: NFTEscrowABI,
      functionName: 'depositNFT',
      args: [BigInt(dealId)],
    })

    return result
  }, [writeContract, address, escrowAddress])

  return {
    depositNFT,
    isPending,
    error,
  }
}

// Deposit Payment Hook
export function useDepositPayment(escrowAddress?: Address) {
  const { writeContract, isPending, error } = useWriteContract()
  const { address } = useAccount()

  const depositPayment = useCallback(async (dealId: string | number, amount: string) => {
    if (!address) {
      throw new Error('Wallet not connected')
    }
    if (!escrowAddress) {
      throw new Error('Escrow address not provided')
    }

    const result = await writeContract({
      address: escrowAddress,
      abi: NFTEscrowABI,
      functionName: 'depositPayment',
      args: [BigInt(dealId)],
      value: parseEther(amount),
    })

    return result
  }, [writeContract, address, escrowAddress])

  return {
    depositPayment,
    isPending,
    error,
  }
}

// Complete Deal Hook
export function useCompleteDeal(escrowAddress?: Address) {
  const { writeContract, isPending, error } = useWriteContract()
  const { address } = useAccount()

  const completeDeal = useCallback(async (dealId: string | number, paymentAmount?: string) => {
    if (!address) {
      throw new Error('Wallet not connected')
    }
    if (!escrowAddress) {
      throw new Error('Escrow address not provided')
    }

    const result = await writeContract({
      address: escrowAddress,
      abi: NFTEscrowABI,
      functionName: 'completeDeal',
      args: [BigInt(dealId)],
      value: paymentAmount ? parseEther(paymentAmount) : BigInt(0),
    })

    return result
  }, [writeContract, address, escrowAddress])

  return {
    completeDeal,
    isPending,
    error,
  }
}

// Cancel Deal Hook
export function useCancelDeal(escrowAddress?: Address) {
  const { writeContract, isPending, error } = useWriteContract()
  const { address } = useAccount()

  const cancelDeal = useCallback(async (dealId: string | number) => {
    if (!address) {
      throw new Error('Wallet not connected')
    }
    if (!escrowAddress) {
      throw new Error('Escrow address not provided')
    }

    const result = await writeContract({
      address: escrowAddress,
      abi: NFTEscrowABI,
      functionName: 'cancelDeal',
      args: [BigInt(dealId)],
    })

    return result
  }, [writeContract, address, escrowAddress])

  return {
    cancelDeal,
    isPending,
    error,
  }
}

// Comprehensive Deal Management Hook
export function useDealManager(dealId?: string | number) {
  const { escrowAddress, isLoading: escrowLoading } = useEscrowForDeal(dealId || 0)
  const { deal: factoryDeal, isLoading: factoryLoading } = useDealInfo(dealId || 0)
  const { deal: escrowDeal, isLoading: escrowDealLoading } = useEscrowDeal(escrowAddress, dealId || 0)
  const { status, isLoading: statusLoading } = useDealStatus(escrowAddress, dealId || 0)
  
  const { acceptDeal, isPending: acceptPending } = useAcceptDeal(escrowAddress)
  const { depositNFT, isPending: depositNFTPending } = useDepositNFT(escrowAddress)
  const { depositPayment, isPending: depositPaymentPending } = useDepositPayment(escrowAddress)
  const { completeDeal, isPending: completePending } = useCompleteDeal(escrowAddress)
  const { cancelDeal, isPending: cancelPending } = useCancelDeal(escrowAddress)

  const isLoading = escrowLoading || factoryLoading || escrowDealLoading || statusLoading
  const isPending = acceptPending || depositNFTPending || depositPaymentPending || completePending || cancelPending

  return {
    // Data
    escrowAddress,
    factoryDeal,
    escrowDeal,
    status,
    isLoading,
    isPending,
    
    // Actions
    acceptDeal,
    depositNFT,
    depositPayment,
    completeDeal,
    cancelDeal,
  }
}

// Utility functions
export function getDealTypeLabel(type: number): string {
  switch (type) {
    case 0: return 'Buy'
    case 1: return 'Sell'
    case 2: return 'Swap'
    default: return 'Unknown'
  }
}

export function getDealStatusLabel(status: number): string {
  switch (status) {
    case 0: return 'Pending'
    case 1: return 'Awaiting Buyer'
    case 2: return 'Awaiting Seller'
    case 3: return 'Locked in Escrow'
    case 4: return 'Completed'
    case 5: return 'Cancelled'
    default: return 'Unknown'
  }
}

export function getDealStatusColor(status: number): string {
  switch (status) {
    case 0: return 'yellow'
    case 1: return 'blue'
    case 2: return 'orange'
    case 3: return 'purple'
    case 4: return 'green'
    case 5: return 'red'
    default: return 'gray'
  }
}

export function formatDealPrice(price: bigint): string {
  return formatEther(price)
}

export function isDealExpired(expiresAt: bigint): boolean {
  return Date.now() > Number(expiresAt) * 1000
}

export function getTimeUntilExpiry(expiresAt: bigint): number {
  const expiryTime = Number(expiresAt) * 1000
  const now = Date.now()
  return Math.max(0, expiryTime - now)
} 