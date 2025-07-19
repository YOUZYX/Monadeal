import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import { ImageIcon, ArrowRight, Zap, ShoppingBag, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DealStatus } from '@prisma/client';

type DealType = "BUY" | "SELL" | "SWAP";

interface Deal {
  id: string;
  nftName: string;
  price: string;
  status: DealStatus;
  type?: DealType;
  nftImage?: string;
  collectionName?: string;
  createdAt?: string;
  messageCount?: number;
}

const DealCard = ({ deal }: { deal: Deal }) => {
  const getDealIcon = () => {
    switch (deal.type) {
      case 'BUY':
        return <ShoppingBag className="h-4 w-4" />;
      case 'SELL':
        return <Tag className="h-4 w-4" />;
      case 'SWAP':
        return <Zap className="h-4 w-4" />;
      default:
        return <ArrowRight className="h-4 w-4" />;
    }
  };

  const getDealTypeColor = () => {
    switch (deal.type) {
      case 'BUY':
        return 'text-blue-400';
      case 'SELL':
        return 'text-green-400';
      case 'SWAP':
        return 'text-purple-400';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden border border-border/40 hover:border-monad-purple/50 transition-all duration-300 group hover:shadow-lg hover:shadow-monad-purple/10 hover-lift">
      {/* NFT Image Header */}
      <div className="relative h-48 bg-gradient-to-br from-monad-purple/20 to-purple-500/20 overflow-hidden">
        {deal.nftImage ? (
          <img
            src={deal.nftImage}
            alt={deal.nftName}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        
        {/* Fallback for missing/broken images */}
        <div className={cn(
          "absolute inset-0 flex items-center justify-center bg-gradient-to-br from-monad-purple/30 to-purple-500/30",
          deal.nftImage ? "hidden" : "flex"
        )}>
          <ImageIcon className="h-16 w-16 text-white/60" />
        </div>

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Deal type badge */}
        <div className="absolute top-3 left-3">
          <div className={cn(
            "flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium backdrop-blur-sm border",
            "bg-black/30 border-white/20 text-white"
          )}>
            {getDealIcon()}
            <span>{deal.type || 'DEAL'}</span>
          </div>
        </div>

        {/* Status badge */}
        <div className="absolute top-3 right-3">
          <StatusBadge status={deal.status} size="sm" variant="glass" />
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 space-y-3">
        {/* NFT Name and Collection */}
        <div>
          <h3 className="font-semibold text-lg leading-tight group-hover:text-monad-purple transition-colors">
            {deal.nftName}
          </h3>
          {deal.collectionName && (
            <p className="text-sm text-muted-foreground mt-1">
              {deal.collectionName}
            </p>
          )}
        </div>

        {/* Price */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Price</p>
            <p className="font-bold text-lg monad-gradient-text">
              {deal.price}
            </p>
          </div>
          
          {/* Message count if available */}
          {deal.messageCount !== undefined && deal.messageCount > 0 && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Messages</p>
              <p className="text-sm font-medium">{deal.messageCount}</p>
            </div>
          )}
        </div>

        {/* Action Button */}
        <Link href={`/deal/${deal.id}`} className="block">
          <Button 
            className="w-full btn-monad group/btn"
            size="sm"
          >
            <span>View Deal</span>
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default DealCard; 