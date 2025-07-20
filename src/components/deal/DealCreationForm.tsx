'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { parseEther, Address, decodeEventLog } from 'viem';
import { Button } from '@/components/ui/button';
import NFTPicker, { SelectedNFT } from './NFTPicker';
import { Input } from '@/components/ui/input';
import { Copy, Check, ArrowRight, Plus, X, ImageIcon, AlertCircle, Loader2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTransactions } from '@/hooks/useTransactions';
import { useAlerts } from '@/contexts/AlertContext';
import { useApiWithAlerts } from '@/hooks/useApiWithAlerts';
import { useTransaction } from '@/hooks/useTransaction';
import { appConfig } from '@/lib/config';
import { DealFactoryABI } from '@/contracts/abis';

type DealType = 'buy' | 'sell' | 'swap';

interface DealCreationFormProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

const DealCreationForm: React.FC<DealCreationFormProps> = ({ onClose, onSuccess }) => {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { showSuccess, showError, showInfo, showTxPending, showTxSuccess } = useAlerts()
  const { apiCall, isLoading: apiLoading } = useApiWithAlerts()
  const [dealType, setDealType] = useState<DealType>('buy');
  const [selectedNFT, setSelectedNFT] = useState<SelectedNFT | null>(null);
  const [showNFTPicker, setShowNFTPicker] = useState(false);
  const [price, setPrice] = useState('');
  const [counterpartyAddress, setCounterpartyAddress] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'blockchain' | 'database' | 'complete'>('blockchain');
  const [pendingTransactionData, setPendingTransactionData] = useState<{
    dealType: DealType;
    selectedNFT: SelectedNFT;
    price: string;
    counterpartyAddress: string;
  } | null>(null);
  
  // Ref to prevent duplicate API calls
  const isProcessingRef = useRef(false);

  // Use the transactions hook for proper wallet interaction
  const { createDeal, isModalOpen, transactionState, transactionData, closeModal } = useTransactions();

  const handleBlockchainSuccess = useCallback(async (txHash: string) => {
    try {
      if (!pendingTransactionData) {
        throw new Error('No pending transaction data found');
      }

      // Prevent duplicate processing
      if (isProcessingRef.current) {
        console.log('Already processing transaction, skipping...');
        return;
      }
      
      isProcessingRef.current = true;

      // Step 2: Extract escrow address from transaction receipt
      setCurrentStep('database');
      showInfo('Processing Transaction', 'Extracting escrow address from blockchain...');
      console.log('Extracting escrow address from transaction...');

      if (!publicClient) {
        throw new Error('Public client not available');
      }

      // Wait for transaction to be mined with retry logic
      let receipt;
      let retries = 0;
      const maxRetries = 30; // 30 retries = ~3 minutes with 6 second delays
      
      while (retries < maxRetries) {
        try {
          receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
          console.log('Transaction receipt found:', receipt);
          break;
        } catch (error) {
          console.log(`Transaction receipt not found yet (attempt ${retries + 1}/${maxRetries}), waiting...`);
          retries++;
          
          if (retries >= maxRetries) {
            throw new Error(`Transaction receipt not found after ${maxRetries} attempts. The transaction may still be pending.`);
          }
          
          // Wait 6 seconds before retrying (typical block time on Monad)
          await new Promise(resolve => setTimeout(resolve, 6000));
        }
      }

      // Check if receipt was found
      if (!receipt) {
        throw new Error('Transaction receipt not available');
      }

      // Parse the DealCreated event to get escrow address and onchain deal ID
      let escrowAddress = '0x0000000000000000000000000000000000000000';
      let onchainDealId = '0';
      
      if (receipt.logs && receipt.logs.length > 0) {
        for (const log of receipt.logs) {
          try {
            const decodedLog = decodeEventLog({
              abi: DealFactoryABI,
              data: log.data,
              topics: log.topics,
            });
            
            if (decodedLog.eventName === 'DealCreated') {
              escrowAddress = decodedLog.args.escrowContract;
              onchainDealId = decodedLog.args.dealId.toString();
              console.log('Extracted escrow address:', escrowAddress);
              console.log('Extracted onchain deal ID:', onchainDealId);
              break;
            }
          } catch (logError) {
            // Skip invalid logs
            continue;
          }
        }
      }

      // Step 3: Now save deal to database with all blockchain data
      showInfo('Saving Deal', 'Creating deal record in database...');
      console.log('Creating deal in database with blockchain data...');

      const dealData = {
        type: pendingTransactionData.dealType.toUpperCase() as 'BUY' | 'SELL' | 'SWAP',
        creatorAddress: address,
        nftContractAddress: pendingTransactionData.selectedNFT.contractAddress,
        nftTokenId: pendingTransactionData.selectedNFT.tokenId,
        price: pendingTransactionData.price || undefined,
        counterpartyAddress: pendingTransactionData.counterpartyAddress || undefined,
        title: `${pendingTransactionData.dealType === 'buy' ? 'Buy' : pendingTransactionData.dealType === 'sell' ? 'Sell' : 'Swap'} ${pendingTransactionData.selectedNFT.name}`,
        description: `${pendingTransactionData.dealType === 'buy' ? 'Buy offer for' : pendingTransactionData.dealType === 'sell' ? 'Sell offer for' : 'Swap offer for'} ${pendingTransactionData.selectedNFT.name} from ${pendingTransactionData.selectedNFT.collection?.name || 'Unknown Collection'}`,
        // Include blockchain data immediately
        transactionHash: txHash,
        escrowContractAddress: escrowAddress,
        onchainDealId: onchainDealId,
      };

      const result = await apiCall<{ deal: any }>('/api/deal', {
        method: 'POST',
        body: JSON.stringify(dealData),
      }, {
        successTitle: 'Deal Created Successfully',
        errorTitle: 'Database Error',
        showSuccessAlert: false, // We'll show custom success
      });

      if (!result) {
        throw new Error('Failed to create deal in database');
      }

      console.log('Deal created in database with blockchain data:', result);

      // Step 4: Complete
      setCurrentStep('complete');
      showTxSuccess('Deal Created Successfully', txHash);
      
      // Clear pending data
      setPendingTransactionData(null);
      
      // Show success for a moment then close
      setTimeout(() => {
        closeModal(); // Close transaction modal
        if (onSuccess) {
          onSuccess();
        } else if (onClose) {
          onClose();
        }
      }, 2000);

    } catch (err) {
      console.error('Error processing blockchain transaction:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to process blockchain transaction';
      showError('Deal Creation Failed', errorMessage);
      setError(errorMessage);
      setCurrentStep('blockchain'); // Reset to initial state
      setPendingTransactionData(null);
    } finally {
      setIsLoading(false);
      isProcessingRef.current = false; // Reset the flag
    }
  }, [pendingTransactionData, address, publicClient, apiCall, showInfo, showTxSuccess, showError, setCurrentStep, setError, setPendingTransactionData, setIsLoading, closeModal, onSuccess, onClose]);

  // Listen for transaction completion
  useEffect(() => {
    if (pendingTransactionData && transactionState === 'success' && transactionData?.hash) {
      console.log('Transaction completed, hash:', transactionData.hash);
      showTxPending('Deal Creation', transactionData.hash);
      handleBlockchainSuccess(transactionData.hash);
    } else if (pendingTransactionData && (transactionState === 'error' || transactionState === 'rejected')) {
      console.error('Transaction failed or was rejected');
      const errorMsg = 'Blockchain transaction failed or was rejected';
      showError('Transaction Failed', errorMsg);
      setError(errorMsg);
      setCurrentStep('blockchain');
      setIsLoading(false);
      setPendingTransactionData(null);
    }
  }, [transactionState, transactionData, pendingTransactionData, handleBlockchainSuccess]);

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(counterpartyAddress);
      setCopied(true);
      showSuccess('Address Copied', 'Counterparty address copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
      showError('Copy Failed', 'Failed to copy address to clipboard');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !address) {
      showError('Wallet Connection Required', 'Please connect your wallet first');
      return;
    }

    if (!selectedNFT) {
      showError('NFT Selection Required', 'Please select an NFT to create a deal');
      return;
    }

    if (dealType === 'buy' && !price) {
      showError('Price Required', 'Please enter a price for your buy offer');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      isProcessingRef.current = false; // Reset flag for new transaction

      // Step 1: Prepare transaction data and start blockchain transaction first
      setCurrentStep('blockchain');
      showInfo('Blockchain Transaction', 'Preparing smart contract transaction...');
      
      // Store transaction data for later database save
      const transactionData = {
        dealType,
        selectedNFT,
        price,
        counterpartyAddress,
      };
      
      setPendingTransactionData(transactionData);

      const counterpartyAddr = counterpartyAddress || '0x0000000000000000000000000000000000000000';

      // Start the blockchain transaction immediately
      await createDeal({
        dealType: dealType === 'buy' ? 0 : dealType === 'sell' ? 1 : 2,
        counterparty: counterpartyAddr,
        nftContract: selectedNFT.contractAddress,
        tokenId: selectedNFT.tokenId,
        price: price || '0',
        swapNftContract: '0x0000000000000000000000000000000000000000',
        swapTokenId: '0',
      });

      // Transaction is now pending - useEffect will handle completion when successful

    } catch (err) {
      console.error('Error preparing blockchain transaction:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to prepare blockchain transaction';
      showError('Transaction Preparation Failed', errorMessage);
      setError(errorMessage);
      setCurrentStep('blockchain'); // Reset to initial state
      setIsLoading(false);
      setPendingTransactionData(null);
    }
  };

  const handleNFTSelect = (nft: SelectedNFT) => {
    setSelectedNFT(nft);
    setShowNFTPicker(false);
    
    // Auto-populate seller address for "buy" deals
    if (dealType === 'buy' && nft.owner) {
      setCounterpartyAddress(nft.owner);
    }
  };

  // Auto-populate counterparty address when deal type changes to "buy"
  useEffect(() => {
    if (dealType === 'buy' && selectedNFT?.owner) {
      setCounterpartyAddress(selectedNFT.owner);
    } else if (dealType !== 'buy') {
      // Clear for sell/swap deals unless manually entered
      setCounterpartyAddress('');
    }
  }, [dealType, selectedNFT?.owner]);

  // Show NFT Picker modal
  if (showNFTPicker) {
    return (
      <div className="glass-card rounded-2xl p-8 relative overflow-hidden max-w-4xl mx-auto">
        {/* Close Button */}
        <button
          onClick={() => setShowNFTPicker(false)}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted/20 transition-colors z-10"
        >
          <X className="h-5 w-5" />
        </button>

        <NFTPicker
          onSelect={handleNFTSelect}
          selectedNFT={selectedNFT}
          title={dealType === 'buy' ? 'Select NFT to Buy' : dealType === 'sell' ? 'Select Your NFT to Sell' : 'Select Your NFT to Swap'}
          subtitle={dealType === 'buy' ? 'Choose the NFT you want to purchase from another wallet' : 'Choose an NFT from your wallet'}
          showWalletConnection={dealType !== 'buy'}
          mode={dealType === 'buy' ? 'search' : 'user'}
        />
      </div>
    );
  }

  // Wallet not connected state
  if (!isConnected) {
    return (
      <div className="glass-card rounded-2xl p-8 relative overflow-hidden">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        
        <div className="text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-monad-purple/10 flex items-center justify-center">
            <ImageIcon className="w-10 h-10 text-monad-purple" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground mb-6">
              Connect your wallet to create NFT deals
            </p>
            <Button className="btn-monad">
              Connect Wallet
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-8 relative overflow-hidden">
      {/* Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted/20 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Loading Progress */}
      {isLoading && (
        <div className="mb-6 p-4 rounded-lg bg-monad-purple/10 border border-monad-purple/20">
          <div className="flex items-center space-x-3">
            <Loader2 className="h-5 w-5 text-monad-purple animate-spin" />
            <div className="flex-1">
              <p className="text-monad-purple font-medium">
                {currentStep === 'blockchain' && 'Creating deal on blockchain...'}
                {currentStep === 'database' && 'Saving deal to database...'}
                {currentStep === 'complete' && 'Deal created successfully!'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {currentStep === 'blockchain' && 'Step 1 of 2: Deploying escrow contract'}
                {currentStep === 'database' && 'Step 2 of 2: Saving deal information'}
                {currentStep === 'complete' && 'All steps completed!'}
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Deal Type Selector - Focused on Buy for now */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Deal Type</h3>
          <div className="grid grid-cols-3 gap-4">
            {(['buy', 'sell', 'swap'] as DealType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setDealType(type)}
                disabled={type !== 'buy'} // Focus on Buy for now
                className={cn(
                  "p-4 rounded-xl border-2 transition-all duration-300 text-center relative overflow-hidden group",
                  dealType === type
                    ? "border-monad-purple bg-monad-purple/10 shadow-lg shadow-monad-purple/20"
                    : type === 'buy'
                      ? "border-border/40 hover:border-monad-purple/50 glass-card"
                      : "border-border/20 bg-muted/20 opacity-50 cursor-not-allowed",
                )}
              >
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-r from-monad-purple/20 to-purple-500/20 opacity-0 transition-opacity duration-300",
                  dealType === type && "opacity-100"
                )} />
                
                <div className="relative z-10">
                  <div className={cn(
                    "h-10 w-10 mx-auto mb-2 rounded-lg flex items-center justify-center transition-transform",
                    dealType === type 
                      ? "bg-monad-purple text-white" 
                      : type === 'buy'
                        ? "bg-muted text-muted-foreground group-hover:scale-110"
                        : "bg-muted/50 text-muted-foreground/50"
                  )}>
                    {type === 'buy' && <ArrowRight className="h-5 w-5 rotate-180" />}
                    {type === 'sell' && <ArrowRight className="h-5 w-5" />}
                    {type === 'swap' && <Zap className="h-5 w-5" />}
                  </div>
                  <p className={cn(
                    "font-medium capitalize transition-colors",
                    dealType === type ? "text-foreground" : type === 'buy' ? "text-muted-foreground" : "text-muted-foreground/50"
                  )}>
                    {type}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {type === 'buy' && "Purchase an NFT"}
                    {type === 'sell' && "Coming Soon"}
                    {type === 'swap' && "Coming Soon"}
                  </p>
                </div>
              </button>
            ))}
          </div>
          {dealType === 'buy' && (
            <div className="p-3 rounded-lg bg-monad-purple/10 border border-monad-purple/20">
              <p className="text-sm text-monad-purple font-medium">✨ Buy Mode Selected</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create a purchase offer for any NFT. The seller address will be automatically filled when you select an NFT.
              </p>
            </div>
          )}
        </div>

        {/* NFT Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            {dealType === 'buy' ? 'NFT to Buy' : dealType === 'sell' ? 'Your NFT to Sell' : 'Your NFT to Swap'}
          </h3>
          
          {selectedNFT ? (
            <div className="glass-card rounded-xl p-4 flex items-center space-x-4 group hover-lift">
              <div className="relative">
                <img
                  src={selectedNFT.image || '/api/placeholder/200/200'}
                  alt={selectedNFT.name}
                  className="h-16 w-16 rounded-lg object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">{selectedNFT.name}</h4>
                <p className="text-sm text-muted-foreground">{selectedNFT.collection?.name || 'Unknown Collection'}</p>
                <p className="text-xs text-muted-foreground">{selectedNFT.contractAddress.slice(0, 10)}...{selectedNFT.contractAddress.slice(-8)}</p>
                {selectedNFT.floorPrice && (
                  <p className="text-xs text-monad-purple font-medium">Floor: {selectedNFT.floorPrice} MON</p>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowNFTPicker(true)}
                className="text-xs"
              >
                Change
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              onClick={() => setShowNFTPicker(true)}
              className="w-full h-20 border-2 border-dashed border-border/40 bg-transparent hover:bg-muted/20 text-muted-foreground"
            >
              <div className="flex flex-col items-center space-y-2">
                <Plus className="h-5 w-5" />
                <span className="text-sm">
                  {dealType === 'buy' ? 'Select NFT to Buy' : dealType === 'sell' ? 'Select Your NFT to Sell' : 'Select Your NFT to Swap'}
                </span>
              </div>
            </Button>
          )}
        </div>

        {/* Price Input */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            {dealType === 'buy' ? 'Your Offer Price' : dealType === 'sell' ? 'Asking Price' : 'Swap (No Price)'}
          </h3>
          {dealType !== 'swap' && (
            <div className="relative">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="pr-12 text-lg glass-card border-border/40 focus:border-monad-purple"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                MON
              </div>
            </div>
          )}
          {dealType === 'buy' && price && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-sm text-green-400 font-medium">💰 Buy Offer Ready</p>
              <p className="text-xs text-muted-foreground mt-1">
                You're offering {price} MON for this NFT
              </p>
            </div>
          )}
        </div>

        {/* Counterparty Address Input */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            {dealType === 'buy' ? 'Seller Address' : 'Buyer Address'} {dealType === 'swap' && '(Optional)'}
          </h3>
          <div className="relative">
            <Input
              type="text"
              placeholder={dealType === 'buy' ? 'Auto-filled from NFT owner' : '0x... or ENS name'}
              value={counterpartyAddress}
              onChange={(e) => setCounterpartyAddress(e.target.value)}
              className={cn(
                "pr-12 glass-card border-border/40 focus:border-monad-purple bg-background/50",
                dealType === 'buy' && selectedNFT?.owner && "bg-green-500/10 border-green-500/30"
              )}
              readOnly={!!(dealType === 'buy' && selectedNFT?.owner)}
            />
            {counterpartyAddress && (
              <button
                type="button"
                onClick={handleCopyAddress}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted/20 transition-colors"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            )}
            {dealType === 'buy' && selectedNFT?.owner && (
              <div className="absolute right-12 top-1/2 -translate-y-1/2">
                <Check className="h-4 w-4 text-green-400" />
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {dealType === 'buy' && selectedNFT?.owner
              ? "Automatically filled with the current NFT owner's address"
              : dealType === 'swap' 
                ? "Leave empty to create a public swap offer" 
                : "Leave empty to create a public offer"
            }
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          {onClose && (
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 glass-card border-border/40 hover:border-red-500/50"
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
          
          <Button
            type="submit"
            disabled={isLoading || !selectedNFT}
            className="flex-1 btn-monad relative overflow-hidden group"
          >
            <span className="relative z-10 flex items-center justify-center">
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  {currentStep === 'blockchain' && 'On Blockchain...'}
                  {currentStep === 'database' && 'Saving...'}
                  {currentStep === 'complete' && 'Complete!'}
                </>
              ) : (
                <>
                  Start Deal
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </span>
            
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse" />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default DealCreationForm; 