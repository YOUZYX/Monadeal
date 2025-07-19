'use client'

import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNotifications } from '@/hooks/useNotifications'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface NotificationIndicatorProps {
  className?: string
  showCount?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function NotificationIndicator({ 
  className,
  showCount = true,
  size = 'sm'
}: NotificationIndicatorProps) {
  const { unreadCount } = useNotifications()

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5', 
    lg: 'w-6 h-6'
  }

  const badgeSizes = {
    sm: 'h-4 w-4 text-[11px]',
    md: 'h-5 w-5 text-xs',
    lg: 'h-6 w-6 text-sm'
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "relative glass-card hover:monad-glow-hover p-2",
        className
      )}
      asChild
    >
      <Link href="/notifications">
        <Bell className={iconSizes[size]} />
        
        {/* Unread notification indicator */}
        {unreadCount > 0 && (
          <>
            {showCount && unreadCount <= 99 ? (
              // Show count badge for reasonable numbers
              <Badge 
                className={cn(
                  "absolute -right-1 -top-1 min-w-0 flex items-center justify-center rounded-full border-0 font-bold",
                  badgeSizes[size],
                  unreadCount > 9 ? "px-1" : "px-0"
                )}
                style={{ 
                  backgroundColor: '#836EF9', 
                  color: '#FBFAF9',
                  fontWeight: '700'
                }}
              >
                {unreadCount}
              </Badge>
            ) : (
              // Show simple dot for high numbers or when count disabled
              <div 
                className={cn(
                  "absolute -right-1 -top-1 rounded-full animate-pulse",
                  badgeSizes[size]
                )}
                style={{ backgroundColor: '#836EF9' }}
              >
                <div 
                  className={cn(
                    "absolute inset-0 rounded-full animate-ping opacity-75",
                    badgeSizes[size]
                  )} 
                  style={{ backgroundColor: '#836EF9' }}
                />
              </div>
            )}
          </>
        )}
      </Link>
    </Button>
  )
} 