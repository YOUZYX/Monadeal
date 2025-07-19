'use client'

import { useState } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { formatEther } from 'viem'
import { DealFactoryABI, NFTEscrowABI } from '@/contracts/abis'
import { appConfig } from '@/lib/config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function DebugDealPage() {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  
  const [dealId, setDealId] = useState('')
  const [loading, setLoading] = useState(false)
  const [databaseDeal, setDatabaseDeal] = useState<any>(null)
  const [onchainDeal, setOnchainDeal] = useState<any>(null)
  const [escrowDeal, setEscrowDeal] = useState<any>(null)
  const [escrowFromMapping, setEscrowFromMapping] = useState<string>('')
  const [error, setError] = useState('')
  const [nftOwnership, setNftOwnership] = useState<any>(null)

  const debugDeal = async () => {
    if (!dealId || !publicClient) return

    try {
      setLoading(true)
      setError('')
      setDatabaseDeal(null)
      setOnchainDeal(null)
      setEscrowDeal(null)
      setEscrowFromMapping('')
      setNftOwnership(null)

      console.log('=== DEBUGGING DEAL ===')
      console.log('Deal ID:', dealId)
      console.log('User Address:', address)

      // 1. Get deal from database
      console.log('\n1. Fetching from database...')
      const dbResponse = await fetch(`/api/deal/${dealId}`)
      const dbResult = await dbResponse.json()
      
      if (!dbResponse.ok) {
        throw new Error(`Database error: ${dbResult.error}`)
      }

      const dbDeal = dbResult.deal
      setDatabaseDeal(dbDeal)
      
      console.log('Database Deal:')
      console.log('- Creator:', dbDeal.creatorAddress)
      console.log('- Counterparty:', dbDeal.counterpartyAddress) 
      console.log('- Status:', dbDeal.status)
      console.log('- Onchain Deal ID:', dbDeal.onchainDealId)
      console.log('- Escrow Address:', dbDeal.escrowContractAddress)

      if (!dbDeal.onchainDealId) {
        setError('No onchain deal ID found in database')
        return
      }

      // 2. Get deal info from DealFactory
      console.log('\n2. Fetching from DealFactory...')
      console.log('Using factory address:', appConfig.contracts.dealFactory)
      console.log('Using onchain deal ID:', dbDeal.onchainDealId)
      
      try {
        // First, check if the deal exists in the factory's dealToEscrow mapping
        const escrowFromFactory = await publicClient.readContract({
          address: appConfig.contracts.dealFactory as `0x${string}`,
          abi: DealFactoryABI,
          functionName: 'dealToEscrow',
          args: [BigInt(dbDeal.onchainDealId || 0)]
        })
        
        console.log('Escrow address from factory dealToEscrow:', escrowFromFactory)
        
        setEscrowFromMapping(escrowFromFactory as string)
        
        if (escrowFromFactory === '0x0000000000000000000000000000000000000000') {
          throw new Error(`Deal ID ${dbDeal.onchainDealId} not found in factory contract`)
        }
        
        // Now get the full deal info
        const factoryDeal = await publicClient.readContract({
          address: appConfig.contracts.dealFactory as `0x${string}`,
          abi: DealFactoryABI,
          functionName: 'getDealInfo',
          args: [BigInt(dbDeal.onchainDealId || 0)]
        })
        
        setOnchainDeal(factoryDeal)
        
        console.log('Factory Deal:')
        console.log('- Deal ID:', factoryDeal.dealId.toString())
        console.log('- Creator:', factoryDeal.creator)
        console.log('- Counterparty:', factoryDeal.counterparty)
        console.log('- Deal Type:', factoryDeal.dealType) // 0=BUY, 1=SELL, 2=SWAP
        console.log('- Status:', factoryDeal.status) // 0=PENDING, 1=AWAITING_BUYER, etc.
        console.log('- Escrow Contract:', factoryDeal.escrowContract)
        console.log('- Price:', formatEther(factoryDeal.price))
        
        // Verify escrow addresses match
        if (factoryDeal.escrowContract.toLowerCase() !== dbDeal.escrowContractAddress?.toLowerCase()) {
          console.log('⚠️ ESCROW ADDRESS MISMATCH!')
          console.log('Factory says:', factoryDeal.escrowContract)
          console.log('Database says:', dbDeal.escrowContractAddress)
        } else {
          console.log('✅ Escrow addresses match')
        }

        // 3. Get deal from escrow contract using the factory's escrow address
        console.log('\n3. Fetching from Escrow Contract...')
        console.log('Using escrow address from factory:', factoryDeal.escrowContract)
        
        try {
          const escrowDealData = await publicClient.readContract({
            address: factoryDeal.escrowContract as `0x${string}`,
            abi: NFTEscrowABI,
            functionName: 'getDeal',
            args: [BigInt(dbDeal.onchainDealId || 0)]
          })
          
          setEscrowDeal(escrowDealData)
          
          console.log('Escrow Deal:')
          console.log('- Deal ID:', escrowDealData.dealId.toString())
          console.log('- Creator:', escrowDealData.creator)
          console.log('- Counterparty:', escrowDealData.counterparty)
          console.log('- Deal Type:', escrowDealData.dealType)
          console.log('- Status:', escrowDealData.status)
          console.log('- Creator Deposited:', escrowDealData.creatorDeposited)
          console.log('- Counterparty Deposited:', escrowDealData.counterpartyDeposited)
          console.log('- Price:', formatEther(escrowDealData.price))

          // 4. Check participant status
          console.log('\n4. Participant Analysis:')
          console.log('Current user is creator:', escrowDealData.creator.toLowerCase() === address?.toLowerCase())
          console.log('Current user is counterparty:', escrowDealData.counterparty.toLowerCase() === address?.toLowerCase())
          
          const isParticipant = escrowDealData.creator.toLowerCase() === address?.toLowerCase() || 
                               escrowDealData.counterparty.toLowerCase() === address?.toLowerCase()
          console.log('Current user is participant:', isParticipant)

          // 5. Check depositPayment requirements for BUY deals
          if (escrowDealData.dealType === 0) { // BUY deal
            console.log('\n5. BUY Deal Analysis:')
            console.log('Deal type is BUY')
            console.log('Status should be AWAITING_BUYER (1):', escrowDealData.status === 1)
            console.log('User should be creator (buyer):', escrowDealData.creator.toLowerCase() === address?.toLowerCase())
            console.log('Creator deposited (should be false):', escrowDealData.creatorDeposited)
            
            if (escrowDealData.status === 1 && 
                escrowDealData.creator.toLowerCase() === address?.toLowerCase() && 
                !escrowDealData.creatorDeposited) {
              console.log('✅ All requirements met for depositPayment')
            } else {
              console.log('❌ Requirements NOT met for depositPayment')
            }

            // 6. Check NFT ownership and approval for counterparty (seller)
            if (escrowDealData.counterparty.toLowerCase() === address?.toLowerCase()) {
              console.log('\n6. NFT Ownership & Approval Check (You are Seller):')
              
              try {
                // Get the correct NFT token ID from database instead of escrow contract
                const actualNftTokenId = BigInt(dbDeal.nftTokenId || dbDeal.nft?.tokenId || '0')
                console.log('Using NFT Token ID from database:', actualNftTokenId.toString())
                console.log('Escrow was returning wrong tokenId:', escrowDealData.tokenId.toString())
                
                // Check NFT ownership using the correct token ID
                const nftOwner = await publicClient.readContract({
                  address: escrowDealData.nftContract as `0x${string}`,
                  abi: [
                    {
                      inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
                      name: "ownerOf",
                      outputs: [{ internalType: "address", name: "", type: "address" }],
                      stateMutability: "view",
                      type: "function"
                    }
                  ],
                  functionName: 'ownerOf',
                  args: [actualNftTokenId]  // ✅ Fixed: Use actual NFT token ID from database
                })
                
                console.log('NFT Contract:', escrowDealData.nftContract)
                console.log('Token ID (correct):', actualNftTokenId.toString())
                console.log('Token ID (from escrow - wrong):', escrowDealData.tokenId.toString())
                console.log('Current NFT Owner:', nftOwner)
                console.log('Your Address:', address)
                console.log('You own the NFT:', nftOwner.toLowerCase() === address?.toLowerCase())
                
                if (nftOwner.toLowerCase() === address?.toLowerCase()) {
                  // Check NFT approval
                  try {
                    const isApproved = await publicClient.readContract({
                      address: escrowDealData.nftContract as `0x${string}`,
                      abi: [
                        {
                          inputs: [
                            { internalType: "address", name: "owner", type: "address" },
                            { internalType: "address", name: "operator", type: "address" }
                          ],
                          name: "isApprovedForAll",
                          outputs: [{ internalType: "bool", name: "", type: "bool" }],
                          stateMutability: "view",
                          type: "function"
                        },
                        {
                          inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
                          name: "getApproved",
                          outputs: [{ internalType: "address", name: "", type: "address" }],
                          stateMutability: "view",
                          type: "function"
                        }
                      ],
                      functionName: 'isApprovedForAll',
                      args: [address as `0x${string}`, factoryDeal.escrowContract as `0x${string}`]
                    })
                    
                    const specificApproval = await publicClient.readContract({
                      address: escrowDealData.nftContract as `0x${string}`,
                      abi: [
                        {
                          inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
                          name: "getApproved",
                          outputs: [{ internalType: "address", name: "", type: "address" }],
                          stateMutability: "view",
                          type: "function"
                        }
                      ],
                      functionName: 'getApproved',
                      args: [actualNftTokenId]  // ✅ Fixed: Use actual NFT token ID
                    })
                    
                    console.log('Escrow Contract:', factoryDeal.escrowContract)
                    console.log('Approved for All:', isApproved)
                    console.log('Specific Token Approval:', specificApproval)
                    console.log('Token Approved to Escrow:', specificApproval.toLowerCase() === factoryDeal.escrowContract.toLowerCase())
                    
                    const canDeposit = isApproved || (specificApproval.toLowerCase() === factoryDeal.escrowContract.toLowerCase())
                    console.log('✅ CAN DEPOSIT NFT:', canDeposit)
                    
                    // Store NFT ownership data
                    setNftOwnership({
                      nftContract: escrowDealData.nftContract,
                      tokenId: actualNftTokenId.toString(),  // ✅ Fixed: Use actual NFT token ID
                      currentOwner: nftOwner,
                      userOwnsNft: nftOwner.toLowerCase() === address?.toLowerCase(),
                      escrowContract: factoryDeal.escrowContract,
                      approvedForAll: isApproved,
                      specificApproval: specificApproval,
                      tokenApprovedToEscrow: specificApproval.toLowerCase() === factoryDeal.escrowContract.toLowerCase(),
                      canDeposit: canDeposit
                    })
                    
                    if (!canDeposit) {
                      console.log('❌ NFT NOT APPROVED - You need to approve the NFT to escrow contract first!')
                      console.log('Approve NFT command needed:', `approve(${factoryDeal.escrowContract}, ${actualNftTokenId})`)
                    }
                    
                  } catch (approvalError) {
                    console.error('Error checking NFT approval:', approvalError)
                  }
                } else {
                  console.log('❌ You do not own this NFT - cannot deposit!')
                }
                
              } catch (ownershipError) {
                console.error('Error checking NFT ownership:', ownershipError)
              }
            }
          }

        } catch (escrowError) {
          console.error('Error fetching from escrow:', escrowError)
          setError(`Escrow contract error: ${escrowError}`)
        }

      } catch (factoryError) {
        console.error('Error fetching from factory:', factoryError)
        setError(`Factory contract error: ${factoryError}`)
      }

    } catch (error) {
      console.error('Debug error:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const getStatusText = (status: number) => {
    const statusMap = {
      0: 'PENDING',
      1: 'AWAITING_BUYER', 
      2: 'AWAITING_SELLER',
      3: 'LOCKED_IN_ESCROW',
      4: 'COMPLETED',
      5: 'CANCELLED'
    }
    return statusMap[status as keyof typeof statusMap] || 'UNKNOWN'
  }

  const getDealTypeText = (type: number) => {
    const typeMap = {
      0: 'BUY',
      1: 'SELL', 
      2: 'SWAP'
    }
    return typeMap[type as keyof typeof typeMap] || 'UNKNOWN'
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Deal Debug Tool</h1>
        
        <div className="space-y-6">
          <div className="flex gap-4">
            <Input
              type="text"
              value={dealId}
              onChange={(e) => setDealId(e.target.value)}
              placeholder="Enter deal ID from database"
              className="flex-1"
            />
            <Button onClick={debugDeal} disabled={loading || !dealId}>
              {loading ? 'Debugging...' : 'Debug Deal'}
            </Button>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Database Deal */}
          {databaseDeal && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Database Deal</h3>
              <div className="space-y-2 text-sm">
                <p><strong>ID:</strong> {databaseDeal.id}</p>
                <p><strong>Type:</strong> {databaseDeal.type}</p>
                <p><strong>Status:</strong> {databaseDeal.status}</p>
                <p><strong>Creator:</strong> {databaseDeal.creatorAddress}</p>
                <p><strong>Counterparty:</strong> {databaseDeal.counterpartyAddress || 'None'}</p>
                <p><strong>Onchain Deal ID:</strong> {databaseDeal.onchainDealId || 'Not set'}</p>
                <p><strong>Escrow Address:</strong> {databaseDeal.escrowContractAddress || 'Not set'}</p>
                <p><strong>Price:</strong> {databaseDeal.price || 'N/A'} MON</p>
              </div>
            </div>
          )}

          {/* Factory Deal */}
          {(onchainDeal || escrowFromMapping) && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Factory Contract Deal</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Factory Address:</strong> {appConfig.contracts.dealFactory}</p>
                <p><strong>DealToEscrow Mapping:</strong> {escrowFromMapping || 'Not fetched'}</p>
                {escrowFromMapping === '0x0000000000000000000000000000000000000000' && (
                  <p className="text-red-600"><strong>⚠️ Deal not found in factory!</strong></p>
                )}
                {onchainDeal ? (
                  <>
                    <p><strong>Deal ID:</strong> {onchainDeal.dealId.toString()}</p>
                    <p><strong>Type:</strong> {getDealTypeText(onchainDeal.dealType)}</p>
                    <p><strong>Status:</strong> {getStatusText(onchainDeal.status)}</p>
                    <p><strong>Creator:</strong> {onchainDeal.creator}</p>
                    <p><strong>Counterparty:</strong> {onchainDeal.counterparty}</p>
                    <p><strong>Escrow Contract:</strong> {onchainDeal.escrowContract}</p>
                    <p><strong>Price:</strong> {formatEther(onchainDeal.price)} MON</p>
                    <p><strong>Created At:</strong> {new Date(Number(onchainDeal.createdAt) * 1000).toLocaleString()}</p>
                    <p><strong>Expires At:</strong> {new Date(Number(onchainDeal.expiresAt) * 1000).toLocaleString()}</p>
                  </>
                ) : (
                  <p className="text-red-600"><strong>Failed to fetch full deal info from factory</strong></p>
                )}
              </div>
            </div>
          )}

          {/* Escrow Deal */}
          {escrowDeal && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Escrow Contract Deal</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Deal ID:</strong> {escrowDeal.dealId.toString()}</p>
                <p><strong>Type:</strong> {getDealTypeText(escrowDeal.dealType)}</p>
                <p><strong>Status:</strong> {getStatusText(escrowDeal.status)}</p>
                <p><strong>Creator:</strong> {escrowDeal.creator}</p>
                <p><strong>Counterparty:</strong> {escrowDeal.counterparty}</p>
                <p><strong>Creator Deposited:</strong> {escrowDeal.creatorDeposited ? 'Yes' : 'No'}</p>
                <p><strong>Counterparty Deposited:</strong> {escrowDeal.counterpartyDeposited ? 'Yes' : 'No'}</p>
                <p><strong>Price:</strong> {formatEther(escrowDeal.price)} MON</p>
              </div>
            </div>
          )}

          {/* User Analysis */}
          {address && escrowDeal && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">User Analysis</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Your Address:</strong> {address}</p>
                <p><strong>You are Creator:</strong> {escrowDeal.creator.toLowerCase() === address.toLowerCase() ? 'Yes' : 'No'}</p>
                <p><strong>You are Counterparty:</strong> {escrowDeal.counterparty.toLowerCase() === address.toLowerCase() ? 'Yes' : 'No'}</p>
                <p><strong>You are Participant:</strong> {
                  (escrowDeal.creator.toLowerCase() === address.toLowerCase() || 
                   escrowDeal.counterparty.toLowerCase() === address.toLowerCase()) ? 'Yes' : 'No'
                }</p>
                
                {escrowDeal.dealType === 0 && (
                  <>
                    <hr className="my-2" />
                    <p className="font-semibold">BUY Deal - depositPayment Requirements:</p>
                    <p><strong>Status is AWAITING_BUYER:</strong> {escrowDeal.status === 1 ? '✅ Yes' : '❌ No'}</p>
                    <p><strong>You are Creator (Buyer):</strong> {escrowDeal.creator.toLowerCase() === address.toLowerCase() ? '✅ Yes' : '❌ No'}</p>
                    <p><strong>Creator Not Deposited:</strong> {!escrowDeal.creatorDeposited ? '✅ Yes' : '❌ No'}</p>
                    
                    {escrowDeal.status === 1 && 
                     escrowDeal.creator.toLowerCase() === address.toLowerCase() && 
                     !escrowDeal.creatorDeposited ? (
                      <p className="text-green-600 font-semibold">✅ All requirements met - depositPayment should work!</p>
                    ) : (
                      <p className="text-red-600 font-semibold">❌ Requirements not met - this is why you get "Not a deal participant"</p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* NFT Ownership & Approval */}
          {nftOwnership && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">NFT Ownership & Approval (Seller Debug)</h3>
              <div className="space-y-2 text-sm">
                <p><strong>NFT Contract:</strong> {nftOwnership.nftContract}</p>
                <p><strong>Token ID:</strong> {nftOwnership.tokenId}</p>
                <p><strong>Current Owner:</strong> {nftOwnership.currentOwner}</p>
                <p><strong>You Own NFT:</strong> {nftOwnership.userOwnsNft ? '✅ Yes' : '❌ No'}</p>
                <p><strong>Escrow Contract:</strong> {nftOwnership.escrowContract}</p>
                <p><strong>Approved for All:</strong> {nftOwnership.approvedForAll ? '✅ Yes' : '❌ No'}</p>
                <p><strong>Specific Token Approval:</strong> {nftOwnership.specificApproval}</p>
                <p><strong>Token Approved to Escrow:</strong> {nftOwnership.tokenApprovedToEscrow ? '✅ Yes' : '❌ No'}</p>
                
                <hr className="my-2" />
                <p className="font-semibold">
                  <strong>CAN DEPOSIT NFT:</strong> {nftOwnership.canDeposit ? '✅ YES' : '❌ NO'}
                </p>
                
                {!nftOwnership.canDeposit && nftOwnership.userOwnsNft && (
                  <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded p-2 mt-2">
                    <p className="text-red-800 dark:text-red-200 font-semibold">
                      ⚠️ NFT NOT APPROVED - You need to approve the NFT first!
                    </p>
                    <p className="text-red-700 dark:text-red-300 text-xs mt-1">
                      Call: approve({nftOwnership.escrowContract}, {nftOwnership.tokenId})
                    </p>
                  </div>
                )}
                
                {!nftOwnership.userOwnsNft && (
                  <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded p-2 mt-2">
                    <p className="text-red-800 dark:text-red-200 font-semibold">
                      ❌ You do not own this NFT!
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 