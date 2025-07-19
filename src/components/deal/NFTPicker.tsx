'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Filter, 
  Grid3x3, 
  List, 
  Wallet, 
  ExternalLink,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  ImageIcon,
  Zap,
  Users,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserNFTs, useSearchNFTs } from '@/hooks/useNFT';
import { NFTWithCollection } from '@/lib/nft-metadata';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { NFTGridLoading } from '@/components/common/LoadingStates';
import { appConfig } from '@/lib/config';

export interface SelectedNFT {
  contractAddress: string;
  tokenId: string;
  name: string;
  description?: string;
  image?: string;
  collection?: {
    name?: string;
    slug?: string;
  };
  floorPrice?: string;
  owner?: string;
}

interface NFTPickerProps {
  onSelect: (nft: SelectedNFT) => void;
  selectedNFT?: SelectedNFT | null;
  className?: string;
  title?: string;
  subtitle?: string;
  showWalletConnection?: boolean;
  allowedCollections?: string[];
  maxSelection?: number;
  mode?: 'user' | 'search';
}

type ViewMode = 'grid' | 'list';

const NFTPicker: React.FC<NFTPickerProps> = ({
  onSelect,
  selectedNFT,
  className,
  title = "Select NFT",
  subtitle = "Choose an NFT from your wallet",
  showWalletConnection = true,
  allowedCollections,
  maxSelection = 1,
  mode = 'user',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [collectionFilter, setCollectionFilter] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [searchAddress, setSearchAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageKey, setPageKey] = useState<string | undefined>();
  
  const { address, isConnected, isConnecting } = useAccount();
  
  const targetAddress = mode === 'search' ? searchAddress : address || '';
  
  const {
    data: userNFTsData,
    isLoading: isLoadingNFTs,
    error: nftsError,
    refetch: refetchNFTs
  } = useUserNFTs(targetAddress, {
    enabled: !!targetAddress && (mode === 'user' ? isConnected : !!searchAddress),
    pageSize: appConfig.api.nftPageSize,
    pageKey: pageKey,
  });

  const availableCollections = useMemo(() => {
    if (!userNFTsData?.nfts) return [];
    
    const collections = new Map();
    userNFTsData.nfts.forEach(nft => {
      if (nft.collectionName && !collections.has(nft.contractAddress)) {
        collections.set(nft.contractAddress, {
          address: nft.contractAddress,
          name: nft.collectionName,
          count: 1,
        });
      } else if (collections.has(nft.contractAddress)) {
        collections.get(nft.contractAddress).count++;
      }
    });
    
    return Array.from(collections.values()).sort((a, b) => b.count - a.count);
  }, [userNFTsData?.nfts]);

  const filteredNFTs = useMemo(() => {
    if (!userNFTsData?.nfts) return [];
    
    let filtered = userNFTsData.nfts;
    
    if (collectionFilter) {
      filtered = filtered.filter(nft => nft.contractAddress === collectionFilter);
    }
    
    if (allowedCollections && allowedCollections.length > 0) {
      filtered = filtered.filter(nft => 
        allowedCollections.includes(nft.contractAddress)
      );
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(nft => 
        nft.name.toLowerCase().includes(query) ||
        nft.collectionName?.toLowerCase().includes(query) ||
        nft.description?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [userNFTsData?.nfts, searchQuery, collectionFilter, allowedCollections]);

  const totalNFTs = userNFTsData?.totalCount || filteredNFTs.length;
  const totalPages = Math.ceil(totalNFTs / appConfig.api.nftPageSize);
  const hasNextPage = userNFTsData?.hasMore || false;
  const hasPreviousPage = currentPage > 1;

  const handleCopyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const handleSearchAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchAddress.trim()) {
      setIsSearching(true);
      setCurrentPage(1);
      setPageKey(undefined);
      refetchNFTs().finally(() => setIsSearching(false));
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || (totalPages > 0 && newPage > totalPages)) return;
    
    setCurrentPage(newPage);
    
    if (newPage > currentPage && hasNextPage) {
      setPageKey(userNFTsData?.pageKey);
    } else if (newPage < currentPage) {
      setPageKey(undefined);
    }
    
    refetchNFTs();
  };

  const handleNextPage = () => {
    if (hasNextPage) {
      handlePageChange(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (hasPreviousPage) {
      handlePageChange(currentPage - 1);
    }
  };

  const handleNFTSelect = (nft: NFTWithCollection) => {
    const selectedNFT: SelectedNFT = {
      contractAddress: nft.contractAddress,
      tokenId: nft.tokenId,
      name: nft.name,
      description: nft.description || undefined,
      image: nft.imageUrl || nft.image || undefined,
      collection: {
        name: nft.collectionName || undefined,
        slug: nft.collectionSlug || undefined,
      },
      floorPrice: nft.floorPrice || undefined,
      owner: nft.owner || undefined,
    };
    
    onSelect(selectedNFT);
  };

  const isNFTSelected = (nft: NFTWithCollection) => {
    return selectedNFT?.contractAddress === nft.contractAddress && 
           selectedNFT?.tokenId === nft.tokenId;
  };

  const getImageUrl = (nft: NFTWithCollection) => {
    return nft.imageUrl || nft.image || '/api/placeholder/300/300';
  };

  useEffect(() => {
    setCurrentPage(1);
    setPageKey(undefined);
  }, [searchQuery, collectionFilter, searchAddress]);

  if (!showWalletConnection && !isConnected && mode === 'user') {
    return (
      <div className="glass-card rounded-xl p-8 text-center">
        <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Wallet Not Connected</h3>
        <p className="text-muted-foreground mb-4">Connect your wallet to view your NFTs</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2 monad-gradient-text">{title}</h2>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>

      {mode === 'search' && (
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center space-x-3 mb-4">
            <Users className="h-5 w-5 text-monad-purple" />
            <div>
              <p className="font-medium">Search NFTs by Wallet Address</p>
              <p className="text-sm text-muted-foreground">Enter a wallet address to browse their NFTs</p>
            </div>
          </div>
          
          <form onSubmit={handleSearchAddressSubmit} className="flex space-x-2">
            <Input
              type="text"
              placeholder="0x... or ENS name"
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              className="flex-1 glass-card border-border/40 focus:border-monad-purple bg-background/50"
            />
            <Button
              type="submit"
              disabled={!searchAddress.trim() || isSearching}
              className="btn-monad"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </form>
          
          {searchAddress && (
            <div className="mt-3 flex items-center space-x-2">
              <p className="text-sm text-muted-foreground">
                Searching: {`${searchAddress.slice(0, 6)}...${searchAddress.slice(-4)}`}
              </p>
              <button
                onClick={() => handleCopyAddress(searchAddress)}
                className="p-1 rounded hover:bg-muted/20 transition-colors"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-400" />
                ) : (
                  <Copy className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {mode === 'user' && showWalletConnection && (
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Wallet className="h-5 w-5 text-monad-purple" />
              <div>
                <p className="font-medium">
                  {isConnected ? 'Wallet Connected' : 'Connect Wallet'}
                </p>
                {address && (
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-muted-foreground">
                      {`${address.slice(0, 6)}...${address.slice(-4)}`}
                    </p>
                    <button
                      onClick={() => handleCopyAddress(address)}
                      className="p-1 rounded hover:bg-muted/20 transition-colors"
                    >
                      {copied ? (
                        <Check className="h-3 w-3 text-green-400" />
                      ) : (
                        <Copy className="h-3 w-3 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <ConnectButton showBalance={false} />
            </div>
          </div>
        </div>
      )}

      {(isConnected || (mode === 'search' && searchAddress)) && (
        <div className="glass-card rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search NFTs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 glass-card border-border/40 focus:border-monad-purple bg-background/50"
              />
            </div>

            {availableCollections.length > 0 && (
              <select
                value={collectionFilter}
                onChange={(e) => setCollectionFilter(e.target.value)}
                className="px-3 py-2 rounded-lg glass-card border border-border/40 focus:border-monad-purple bg-background/50 text-sm min-w-[150px]"
              >
                <option value="">All Collections</option>
                {availableCollections.map((collection) => (
                  <option key={collection.address} value={collection.address}>
                    {collection.name} ({collection.count})
                  </option>
                ))}
              </select>
            )}

            <div className="flex items-center space-x-1 bg-background/50 p-1 rounded-lg border border-border/40">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-2 rounded transition-colors",
                  viewMode === 'grid'
                    ? "bg-monad-purple text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-2 rounded transition-colors",
                  viewMode === 'list'
                    ? "bg-monad-purple text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {filteredNFTs.length > 0 && (
              <div className="text-sm text-muted-foreground">
                <span className="px-2 py-1 bg-monad-purple/20 rounded-full">
                  {filteredNFTs.length} NFT{filteredNFTs.length !== 1 ? 's' : ''} found
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {(isConnected || (mode === 'search' && searchAddress)) && (
        <div className="min-h-[400px]">
          {isLoadingNFTs || isSearching ? (
            <NFTGridLoading count={viewMode === 'grid' ? 9 : 9} />
          ) : nftsError ? (
            <div className="glass-card rounded-xl p-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
              <h3 className="text-lg font-semibold mb-2">Failed to Load NFTs</h3>
              <p className="text-muted-foreground mb-4">
                There was an error fetching NFTs. Please try again.
              </p>
              <Button
                onClick={() => refetchNFTs()}
                className="btn-monad"
              >
                Try Again
              </Button>
            </div>
          ) : filteredNFTs.length === 0 ? (
            <div className="glass-card rounded-xl p-8 text-center">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No NFTs Found</h3>
              <p className="text-muted-foreground">
                {searchQuery || collectionFilter
                  ? "No NFTs match your current filters. Try adjusting your search."
                  : mode === 'search' && searchAddress
                  ? `No NFTs found for address ${searchAddress.slice(0, 6)}...${searchAddress.slice(-4)}`
                  : "You don't have any NFTs in your wallet yet."
                }
              </p>
            </div>
          ) : (
            <>
              <div className={cn(
                viewMode === 'grid'
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                  : "space-y-4"
              )}>
                {filteredNFTs.map((nft) => (
                  <NFTCard
                    key={`${nft.contractAddress}-${nft.tokenId}`}
                    nft={nft}
                    isSelected={isNFTSelected(nft)}
                    onClick={() => handleNFTSelect(nft)}
                    viewMode={viewMode}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={!hasPreviousPage || isLoadingNFTs}
                    className="glass-card border-border/40 hover:border-monad-purple/50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <div className="flex items-center space-x-1">
                    {currentPage > 2 && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(1)}
                          className="glass-card border-border/40 hover:border-monad-purple/50"
                        >
                          1
                        </Button>
                        {currentPage > 3 && (
                          <span className="px-2 text-muted-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                          </span>
                        )}
                      </>
                    )}

                    {currentPage > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        className="glass-card border-border/40 hover:border-monad-purple/50"
                      >
                        {currentPage - 1}
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="glass-card border-monad-purple bg-monad-purple/10 text-monad-purple"
                      disabled
                    >
                      {currentPage}
                    </Button>

                    {hasNextPage && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        className="glass-card border-border/40 hover:border-monad-purple/50"
                      >
                        {currentPage + 1}
                      </Button>
                    )}

                    {hasNextPage && totalPages > currentPage + 1 && (
                      <>
                        {totalPages > currentPage + 2 && (
                          <span className="px-2 text-muted-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                          </span>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(totalPages)}
                          className="glass-card border-border/40 hover:border-monad-purple/50"
                        >
                          {totalPages}
                        </Button>
                      </>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={!hasNextPage || isLoadingNFTs}
                    className="glass-card border-border/40 hover:border-monad-purple/50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {totalNFTs > 0 && (
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * appConfig.api.nftPageSize) + 1} to{' '}
                  {Math.min(currentPage * appConfig.api.nftPageSize, totalNFTs)} of{' '}
                  {totalNFTs} NFTs
                </div>
              )}
            </>
          )}
        </div>
      )}

      {mode === 'search' && !searchAddress && (
        <div className="glass-card rounded-xl p-8 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Search NFTs</h3>
          <p className="text-muted-foreground">
            Enter a wallet address above to browse their NFT collection
          </p>
        </div>
      )}
    </div>
  );
};

interface NFTCardProps {
  nft: NFTWithCollection;
  isSelected: boolean;
  onClick: () => void;
  viewMode: ViewMode;
}

const NFTCard: React.FC<NFTCardProps> = ({ nft, isSelected, onClick, viewMode }) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  const imageUrl = nft.imageUrl || nft.image;

  if (viewMode === 'list') {
    return (
      <button
        onClick={onClick}
        className={cn(
          "w-full glass-card rounded-xl p-4 text-left hover-lift transition-all duration-300 group",
          isSelected
            ? "border-2 border-monad-purple bg-monad-purple/10 shadow-lg shadow-monad-purple/20"
            : "border border-border/40 hover:border-monad-purple/50"
        )}
      >
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
              {imageUrl && !imageError ? (
                <img
                  src={imageUrl}
                  alt={nft.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  onLoad={() => setImageLoading(false)}
                  onError={() => setImageError(true)}
                />
              ) : (
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            {isSelected && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-monad-purple rounded-full flex items-center justify-center">
                <Check className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{nft.name}</h3>
            <p className="text-sm text-muted-foreground truncate">
              {nft.collectionName || 'Unknown Collection'}
            </p>
            {nft.floorPrice && (
              <p className="text-xs text-monad-purple font-medium">
                Floor: {nft.floorPrice} MON
              </p>
            )}
          </div>
          
          <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "group glass-card rounded-xl p-4 text-left hover-lift transition-all duration-300 relative overflow-hidden",
        isSelected
          ? "border-2 border-monad-purple bg-monad-purple/10 shadow-lg shadow-monad-purple/20"
          : "border border-border/40 hover:border-monad-purple/50"
      )}
    >
      {isSelected && (
        <div className="absolute top-3 right-3 w-6 h-6 bg-monad-purple rounded-full flex items-center justify-center z-10">
          <Check className="h-4 w-4 text-white" />
        </div>
      )}

      <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-3 relative">
        {imageUrl && !imageError ? (
          <>
            <img
              src={imageUrl}
              alt={nft.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              onLoad={() => setImageLoading(false)}
              onError={() => setImageError(true)}
            />
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
            <ExternalLink className="h-5 w-5 text-white" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold truncate group-hover:text-monad-purple transition-colors">
          {nft.name}
        </h3>
        <p className="text-sm text-muted-foreground truncate">
          {nft.collectionName || 'Unknown Collection'}
        </p>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            #{nft.tokenId}
          </span>
          {nft.floorPrice && (
            <span className="text-xs text-monad-purple font-medium">
              {nft.floorPrice} MON
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

export default NFTPicker; 