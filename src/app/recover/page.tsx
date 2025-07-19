'use client'

import { useState } from 'react'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { NFTEscrowABI } from '@/contracts/abis'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// Current buggy contract addresses
const CURRENT_CONTRACT_ADDRESSES = {
  dealFactory: '0x9aeFcbe2D5EA097ce9300B8d7E19b96CDe5A73e9',
  nftEscrow: '0x229d7Ae73E10789CfF0E40cD0CBDc08Afd728839', // Example escrow address
}

interface DealInfo {
  id: string
  onchainDealId: string
  type: 'BUY' | 'SELL' | 'SWAP'
  status: string
  price: string
  escrowContractAddress: string
  creatorAddress: string
  counterpartyAddress: string
  nftContractAddress: string
  nftTokenId: string
  creator: {
    address: string
    ensName?: string
    username?: string
  }
  counterparty: {
    address: string
    ensName?: string
    username?: string
  }
  nft: {
    name?: string
    image?: string
  }
}

export default function RecoverPage() {
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  
  const [databaseDealId, setDatabaseDealId] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [dealInfo, setDealInfo] = useState<DealInfo | null>(null)

  const fetchDealInfo = async () => {
    if (!databaseDealId.trim()) {
      setMessage('Please enter a deal ID')
      return
    }

    try {
      setLoading(true)
      setMessage('Fetching deal information...')

      const response = await fetch(`/api/deal/${databaseDealId}`)
      if (!response.ok) {
        throw new Error('Deal not found')
      }

      const data = await response.json()
      setDealInfo(data.deal)
      setMessage('✅ Deal found! Review your deposits below.')
    } catch (error) {
      setMessage(`❌ Error fetching deal: ${error instanceof Error ? error.message : 'Unknown error'}`)
      console.error('Error fetching deal:', error)
      setDealInfo(null)
    } finally {
      setLoading(false)
    }
  }

  const cancelDeal = async () => {
    if (!walletClient || !publicClient || !dealInfo) return

    try {
      setLoading(true)
      setMessage('Cancelling deal to recover your deposits...')

      const hash = await walletClient.writeContract({
        address: dealInfo.escrowContractAddress as `0x${string}`,
        abi: NFTEscrowABI,
        functionName: 'cancelDeal',
        args: [BigInt(dealInfo.onchainDealId)]
      })

      setMessage(`Transaction sent: ${hash}`)
      
      // Wait for transaction to be mined
      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      
      if (receipt.status === 'success') {
        setMessage('✅ Deal cancelled successfully! Your deposits have been returned to your wallet.')
        
        // Update deal status in database
        await fetch(`/api/deal/${dealInfo.id}/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            transactionHash: hash,
            userAddress: address
          })
        })
      } else {
        setMessage('❌ Transaction failed. Please try again.')
      }
    } catch (error) {
      setMessage(`❌ Error cancelling deal: ${error instanceof Error ? error.message : 'Unknown error'}`)
      console.error('Error cancelling deal:', error)
    } finally {
      setLoading(false)
    }
  }

  const getUserRole = () => {
    if (!dealInfo || !address) return null
    
    const isCreator = dealInfo.creatorAddress.toLowerCase() === address.toLowerCase()
    const isCounterparty = dealInfo.counterpartyAddress.toLowerCase() === address.toLowerCase()
    
    // Fix: For BUY deals, creator is buyer, counterparty is seller
    // But based on user feedback, the roles were reversed, so let's correct this
    if (isCreator) return dealInfo.type === 'BUY' ? 'Seller' : 'Buyer' 
    if (isCounterparty) return dealInfo.type === 'BUY' ? 'Buyer' : 'Seller'
    
    return null
  }

  const getUserDeposits = () => {
    if (!dealInfo || !address) return []
    
    const deposits = []
    const userRole = getUserRole()
    
    if (dealInfo.type === 'BUY') {
      if (userRole === 'Buyer') {
        deposits.push(`💰 ${dealInfo.price} MON (Payment)`)
      }
      if (userRole === 'Seller') {
        deposits.push(`🖼️ NFT: ${dealInfo.nft.name || `Token #${dealInfo.nftTokenId}`}`)
      }
    } else if (dealInfo.type === 'SELL') {
      if (userRole === 'Seller') {
        deposits.push(`🖼️ NFT: ${dealInfo.nft.name || `Token #${dealInfo.nftTokenId}`}`)
      }
      if (userRole === 'Buyer') {
        deposits.push(`💰 ${dealInfo.price} MON (Payment)`)
      }
    }
    
    return deposits
  }

  const canRecover = dealInfo && address && getUserRole() && dealInfo.status === 'LOCKED_IN_ESCROW'

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Asset Recovery Tool</h1>
        
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
            🚨 Buggy Contract Recovery
          </h2>
          <p className="text-red-700 dark:text-red-300 mb-2">
            Due to bugs in the current smart contracts, deals with "LOCKED_IN_ESCROW" status cannot be completed safely. 
            Use this tool to cancel deals and recover your deposited assets.
          </p>
          <p className="text-sm text-red-600 dark:text-red-400">
            <strong>Current Contract:</strong> {CURRENT_CONTRACT_ADDRESSES.dealFactory}
          </p>
        </div>

        <div className="space-y-6">
          {/* Deal ID Input */}
          <div className="space-y-2">
            <label htmlFor="dealId" className="text-sm font-medium">
              Database Deal ID
            </label>
            <div className="flex gap-2">
              <Input
                id="dealId"
                placeholder="e.g., cmd54otw4000s710w6gp65xyp"
                value={databaseDealId}
                onChange={(e) => setDatabaseDealId(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={fetchDealInfo}
                disabled={loading || !databaseDealId.trim()}
              >
                {loading ? 'Loading...' : 'Fetch Deal'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter the database deal ID (found in deal URLs: /deal/[dealId])
            </p>
          </div>

          {/* Status Message */}
          {message && (
            <div className={`p-4 rounded-lg ${
              message.includes('✅') ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
              message.includes('❌') ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200' :
              'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
            }`}>
              {message}
            </div>
          )}

          {/* Deal Information */}
          {dealInfo && (
            <div className="bg-white dark:bg-gray-800 border rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-semibold">Deal Information</h3>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                               <div>
                 <span className="font-medium">Deal Type:</span>
                 <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded text-blue-800 dark:text-blue-200">
                   {dealInfo.type}
                 </span>
               </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <span className="ml-2 px-2 py-1 bg-yellow-100 dark:bg-yellow-900 rounded text-yellow-800 dark:text-yellow-200">
                    {dealInfo.status}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Price:</span>
                  <span className="ml-2">{dealInfo.price} MON</span>
                </div>
                <div>
                  <span className="font-medium">Your Role:</span>
                  <span className="ml-2">{getUserRole() || 'Not Participant'}</span>
                </div>
              </div>

                             <div>
                 <h4 className="font-medium mb-2">NFT Details:</h4>
                 <div className="text-sm text-muted-foreground">
                   <div>Contract: {dealInfo.nftContractAddress}</div>
                   <div>Token ID: {dealInfo.nftTokenId}</div>
                   {dealInfo.nft.name && <div>Name: {dealInfo.nft.name}</div>}
                 </div>
               </div>

              <div>
                <h4 className="font-medium mb-2">Your Deposits to Recover:</h4>
                <div className="space-y-1">
                  {getUserDeposits().map((deposit, index) => (
                    <div key={index} className="text-sm bg-gray-50 dark:bg-gray-700 p-2 rounded">
                      {deposit}
                    </div>
                  ))}
                </div>
              </div>

              {/* Recovery Button */}
              {canRecover ? (
                <div className="pt-4 border-t">
                  <Button 
                    onClick={cancelDeal}
                    disabled={loading}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                  >
                    {loading ? 'Processing...' : '🔄 Cancel Deal & Recover Assets'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    This will return all deposited assets to their original owners
                  </p>
                </div>
              ) : (
                <div className="pt-4 border-t">
                  {!getUserRole() && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      ❌ You are not a participant in this deal
                    </p>
                  )}
                  {getUserRole() && dealInfo.status !== 'LOCKED_IN_ESCROW' && (
                    <p className="text-sm text-orange-600 dark:text-orange-400">
                      ⚠️ This deal is not in LOCKED_IN_ESCROW status. Recovery only available for deals where both parties have deposited.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 