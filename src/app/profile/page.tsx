'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Grid3x3, 
  List, 
  Wallet, 
  ShoppingCart,
  ArrowLeftRight,
  Loader2,
  AlertCircle,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserNFTs } from '@/hooks/useNFT';
import { useCurrentUser } from '@/hooks/useUser';
import { NFTWithCollection } from '@/lib/nft-metadata';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { NFTGridLoading } from '@/components/common/LoadingStates';
import { appConfig } from '@/lib/config';
import ProfileInfo from '@/components/profile/ProfileInfo';
import ProfileEdit from '@/components/profile/ProfileEdit';

type ViewMode = 'grid' | 'list';

interface ProfileNFTCardProps {
  nft: NFTWithCollection;
  viewMode: ViewMode;
}

const ProfileNFTCard: React.FC<ProfileNFTCardProps> = ({ nft, viewMode }) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  const imageUrl = nft.imageUrl || nft.image;

  if (viewMode === 'list') {
    return (
      <div className="w-full glass-card rounded-xl p-4 border border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                {imageUrl && !imageError ? (
                  <img
                    src={imageUrl}
                    alt={nft.name}
                    className="w-full h-full object-cover"
                    onLoad={() => setImageLoading(false)}
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
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
          </div>
          
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              disabled
              className="glass-card border-border/40 text-muted-foreground cursor-not-allowed"
            >
              <ShoppingCart className="h-4 w-4 mr-1" />
              Sell
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled
              className="glass-card border-border/40 text-muted-foreground cursor-not-allowed"
            >
              <ArrowLeftRight className="h-4 w-4 mr-1" />
              Swap
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-4 border border-border/40 relative overflow-hidden">
      <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-3 relative">
        {imageUrl && !imageError ? (
          <>
            <img
              src={imageUrl}
              alt={nft.name}
              className="w-full h-full object-cover"
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
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="font-semibold truncate">
            {nft.name}
          </h3>
          <p className="text-sm text-muted-foreground truncate">
            {nft.collectionName || 'Unknown Collection'}
          </p>
          
          <div className="flex items-center justify-between mt-2">
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
        
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            disabled
            className="flex-1 glass-card border-border/40 text-muted-foreground cursor-not-allowed"
          >
            <ShoppingCart className="h-4 w-4 mr-1" />
            Sell
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled
            className="flex-1 glass-card border-border/40 text-muted-foreground cursor-not-allowed"
          >
            <ArrowLeftRight className="h-4 w-4 mr-1" />
            Swap
          </Button>
        </div>
      </div>
    </div>
  );
};

const ProfilePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [collectionFilter, setCollectionFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageKey, setPageKey] = useState<string | undefined>();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  const { address, isConnected, isConnecting } = useAccount();
  const { user, isLoading: isLoadingUser, updateUser, isUpdating, refreshEns, isRefreshingEns } = useCurrentUser();
  
  const {
    data: userNFTsData,
    isLoading: isLoadingNFTs,
    error: nftsError,
    refetch: refetchNFTs
  } = useUserNFTs(address || '', {
    enabled: !!address && isConnected,
    pageSize: appConfig.api.nftPageSize,
    pageKey: pageKey,
  });

  // Auto-refresh ENS on profile page visit for better UX
  useEffect(() => {
    const autoRefreshEns = async () => {
      if (user && address && !isRefreshingEns) {
        try {
          await refreshEns();
        } catch (error) {
          console.log('Auto ENS refresh failed (this is normal):', error);
        }
      }
    };

    // Auto-refresh ENS when user lands on profile page
    if (user && address) {
      autoRefreshEns();
    }
  }, [user?.id, address]); // Only trigger when user ID or address changes

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
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(nft => 
        nft.name.toLowerCase().includes(query) ||
        nft.collectionName?.toLowerCase().includes(query) ||
        nft.description?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [userNFTsData?.nfts, searchQuery, collectionFilter]);

  const totalNFTs = userNFTsData?.totalCount || filteredNFTs.length;
  const totalPages = Math.ceil(totalNFTs / appConfig.api.nftPageSize);
  const hasNextPage = userNFTsData?.hasMore || false;
  const hasPreviousPage = currentPage > 1;

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

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-monad-purple/5 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="glass-card rounded-xl p-8 text-center">
            <Wallet className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground mb-6">
              Connect your wallet to view your NFT collection and manage your assets
            </p>
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  const handleProfileSave = async (userData: any) => {
    try {
      await updateUser(userData);
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const handleRefreshEns = async () => {
    try {
      const result = await refreshEns();
      if (result?.hasNewEns) {
        // Show success message if ENS was found
        console.log('ENS refreshed successfully:', result.message);
      }
    } catch (error) {
      console.error('Error refreshing ENS:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-monad-purple/5 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <User className="h-8 w-8 text-monad-purple" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-monad-purple bg-clip-text text-transparent">
              {isEditingProfile ? 'Edit Profile' : 'My Profile'}
            </h1>
          </div>
          <p className="text-muted-foreground">
            {isEditingProfile ? 'Update your profile information' : 'Manage your profile and view your NFT collection'}
          </p>
        </div>

        {/* Profile Section */}
        <div className="mb-8">
          {isLoadingUser ? (
            <div className="glass-card rounded-xl p-6 border border-border/40">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-muted rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-6 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
                </div>
              </div>
            </div>
          ) : user && isEditingProfile ? (
            <ProfileEdit
              user={user}
              onSave={handleProfileSave}
              onCancel={() => setIsEditingProfile(false)}
              isLoading={isUpdating}
            />
          ) : user ? (
            <ProfileInfo
              user={user}
              onEdit={() => setIsEditingProfile(true)}
              isOwner={true}
              onRefreshEns={handleRefreshEns}
              isRefreshingEns={isRefreshingEns}
            />
          ) : (
            <div className="glass-card rounded-xl p-6 border border-border/40 text-center">
              <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Loading Profile...</h3>
              <p className="text-muted-foreground">
                Setting up your profile for the first time
              </p>
            </div>
          )}
        </div>

        {/* NFT Collection Section */}
        {!isEditingProfile && (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">NFT Collection</h2>
              <p className="text-muted-foreground">
                View and manage all your NFTs in one place
          </p>
        </div>

        {/* Search and Filters */}
        <div className="glass-card rounded-xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search NFTs by name, collection, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 glass-input border-border/40 focus:border-monad-purple/50"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={collectionFilter}
                onChange={(e) => setCollectionFilter(e.target.value)}
                className="px-4 py-2 rounded-lg border border-border/40 bg-background/50 backdrop-blur-sm focus:border-monad-purple/50 focus:outline-none"
              >
                <option value="">All Collections</option>
                {availableCollections.map((collection) => (
                  <option key={collection.address} value={collection.address}>
                    {collection.name} ({collection.count})
                  </option>
                ))}
              </select>
              
              <div className="flex border border-border/40 rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "rounded-none border-0",
                    viewMode === 'grid' && "bg-monad-purple hover:bg-monad-purple/90"
                  )}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "rounded-none border-0",
                    viewMode === 'list' && "bg-monad-purple hover:bg-monad-purple/90"
                  )}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* NFT Grid/List */}
        {isLoadingNFTs && <NFTGridLoading />}
        
        {nftsError && (
          <div className="glass-card rounded-xl p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h3 className="text-lg font-semibold mb-2">Error Loading NFTs</h3>
            <p className="text-muted-foreground mb-4">
              Failed to load your NFT collection. Please try again.
            </p>
            <Button onClick={() => refetchNFTs()} variant="outline">
              Retry
            </Button>
          </div>
        )}

        {!isLoadingNFTs && !nftsError && filteredNFTs.length === 0 && (
          <div className="glass-card rounded-xl p-8 text-center">
            <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No NFTs Found</h3>
            <p className="text-muted-foreground">
              {searchQuery || collectionFilter 
                ? "No NFTs match your current search or filter criteria"
                : "You don't have any NFTs in your wallet yet"
              }
            </p>
            {(searchQuery || collectionFilter) && (
              <Button 
                onClick={() => {
                  setSearchQuery('');
                  setCollectionFilter('');
                }} 
                variant="outline" 
                className="mt-4"
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}

        {!isLoadingNFTs && !nftsError && filteredNFTs.length > 0 && (
          <>
            <div className={cn(
              "mb-6",
              viewMode === 'grid' 
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-4"
            )}>
              {filteredNFTs.map((nft) => (
                <ProfileNFTCard
                  key={`${nft.contractAddress}-${nft.tokenId}`}
                  nft={nft}
                  viewMode={viewMode}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 mt-8">
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
                  {hasPreviousPage && currentPage > 2 && (
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

                  {hasPreviousPage && (
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
                    variant="default"
                    size="sm"
                    className="bg-monad-purple hover:bg-monad-purple/90"
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
          </>
        )}
      </div>
    </div>
  );
};

export default ProfilePage; 