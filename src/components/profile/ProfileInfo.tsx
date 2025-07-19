'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Edit, 
  Calendar, 
  Wallet, 
  TrendingUp, 
  ArrowLeftRight,
  Copy,
  Check,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { User as UserType } from '@/hooks/useUser';
import { useState } from 'react';

interface ProfileInfoProps {
  user: UserType;
  onEdit: () => void;
  isOwner: boolean;
  onRefreshEns?: () => void;
  isRefreshingEns?: boolean;
}

const ProfileInfo: React.FC<ProfileInfoProps> = ({ user, onEdit, isOwner, onRefreshEns, isRefreshingEns }) => {
  const [copiedAddress, setCopiedAddress] = useState(false);

  const copyAddress = async () => {
    if (user.address) {
      await navigator.clipboard.writeText(user.address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getAvatarUrl = (user: UserType) => {
    // Prioritize uploaded image over URL avatar
    if (user.avatarImage) return user.avatarImage;
    if (user.avatar) return user.avatar;
    // Generate a default avatar based on address
    return `https://api.dicebear.com/7.x/identicon/svg?seed=${user.address}`;
  };

  return (
    <div className="glass-card rounded-xl p-6 border border-border/40 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Profile</h2>
        {isOwner && (
          <Button
            onClick={onEdit}
            variant="outline"
            size="sm"
            className="glass-card border-border/40 hover:bg-monad-purple/20"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </div>

      {/* Avatar and Basic Info */}
      <div className="flex items-center space-x-4">
        <div className="relative">
          <img
            src={getAvatarUrl(user)}
            alt={user.username || 'User'}
            className="w-20 h-20 rounded-full bg-muted object-cover"
          />
          {user.isOnline && (
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-2 border-background" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className="text-xl font-semibold">
              {user.username || formatAddress(user.address)}
            </h3>
            {user.ensName ? (
              <div className="px-2 py-1 bg-monad-purple/20 rounded-full">
                <span className="text-xs font-medium text-monad-purple">
                  ENS Name
                </span>
              </div>
            ) : (user.username?.startsWith('monadeal') && user.username?.endsWith('.nad')) && (
              <div className="px-2 py-1 bg-orange-500/20 rounded-full">
                <span className="text-xs font-medium text-orange-500">
                  Default Username
                </span>
              </div>
            )}
            {isOwner && onRefreshEns && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefreshEns}
                disabled={isRefreshingEns}
                className="h-8 w-8 p-0 hover:bg-monad-purple/20"
                title="Refresh ENS name"
              >
                <RefreshCw className={cn(
                  "h-4 w-4",
                  isRefreshingEns && "animate-spin"
                )} />
              </Button>
            )}
          </div>
          
          {user.bio && (
            <p className="text-muted-foreground mt-1 text-sm">
              {user.bio}
            </p>
          )}
        </div>
      </div>

      {/* Address */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Wallet className="h-4 w-4" />
          <span>Wallet Address</span>
        </div>
        <div className="flex items-center space-x-2">
          <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
            {user.address}
          </code>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyAddress}
            className="h-8 w-8 p-0"
          >
            {copiedAddress ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="h-8 w-8 p-0"
          >
            <a
              href={`https://testnet.monadexplorer.com/address/${user.address}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>Deals Created</span>
          </div>
          <div className="text-2xl font-bold">
            {user._count?.dealsCreated || 0}
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <ArrowLeftRight className="h-4 w-4" />
            <span>Deals Participated</span>
          </div>
          <div className="text-2xl font-bold">
            {user._count?.dealsParticipant || 0}
          </div>
        </div>
      </div>

      {/* Member Since */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Member Since</span>
        </div>
        <div className="text-sm">
          {formatDate(user.createdAt)}
        </div>
      </div>

      {/* Status */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          <span>Status</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            user.isOnline ? "bg-green-500" : "bg-gray-500"
          )} />
          <span className="text-sm">
            {user.isOnline ? "Online" : "Offline"}
          </span>
          {user.lastSeen && !user.isOnline && (
            <span className="text-xs text-muted-foreground">
              • Last seen {formatDate(new Date(user.lastSeen))}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileInfo; 