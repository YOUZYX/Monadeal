'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Bell,
  BellRing,
  Check,
  CheckCheck,
  MessageCircle,
  ShoppingCart,
  HandCoins,
  XCircle,
  Trophy,
  Coins,
  Settings,
  Filter,
  MoreVertical,
  ArrowUpRight,
  Trash2,
  RefreshCw
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { NotificationType } from '@/types/prisma-override'
import { useNotifications } from '@/hooks/useNotifications'
import { useSocketNotifications } from '@/hooks/useSocket'

interface Notification {
  id: string
  userId: string
  dealId?: string
  type: NotificationType
  title: string
  message: string
  data?: any
  isRead: boolean
  createdAt: string
  deal?: {
    id: string
    type: string
    status: string
    nftContractAddress: string
    nftTokenId: string
  }
}

const NotificationIcon = ({ type, isRead }: { type: NotificationType; isRead: boolean }) => {
  const baseClasses = "w-5 h-5 transition-colors"
  const iconStyle = { color: '#FBFAF9' }

  switch (type) {
    case 'DEAL_CREATED':
      return <ShoppingCart className={baseClasses} style={iconStyle} />
    case 'DEAL_ACCEPTED':
      return <Check className={baseClasses} style={iconStyle} />
    case 'DEAL_COMPLETED':
      return <Trophy className={baseClasses} style={iconStyle} />
    case 'DEAL_CANCELLED':
      return <XCircle className={baseClasses} style={iconStyle} />
    case 'MESSAGE_RECEIVED':
      return <MessageCircle className={baseClasses} style={iconStyle} />
    case 'DEPOSIT_MADE':
      return <Coins className={baseClasses} style={iconStyle} />
    case 'SYSTEM_ANNOUNCEMENT':
      return <Settings className={baseClasses} style={iconStyle} />
    default:
      return <Bell className={baseClasses} style={iconStyle} />
  }
}

const getNotificationColor = (type: NotificationType) => {
  switch (type) {
    case 'DEAL_CREATED':
      return 'bg-blue-500'
    case 'DEAL_ACCEPTED':
      return 'bg-green-500'
    case 'DEAL_COMPLETED':
      return 'bg-purple-500'
    case 'DEAL_CANCELLED':
      return 'bg-red-500'
    case 'MESSAGE_RECEIVED':
      return 'bg-orange-500'
    case 'DEPOSIT_MADE':
      return 'bg-emerald-500'
    case 'SYSTEM_ANNOUNCEMENT':
      return 'bg-gray-500'
    default:
      return 'bg-[#836EF9]'
  }
}

const getTimeAgo = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
  
  if (diffInMinutes < 1) return 'Just now'
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h ago`
  
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays}d ago`
  
  return date.toLocaleDateString()
}

export default function NotificationsPage() {
  const { address, isConnected } = useAccount()
  const [activeTab, setActiveTab] = useState('all')
  const [refreshing, setRefreshing] = useState(false)
  
  // Use the notifications hook
  const {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications()

  const { notifications: realtimeNotifications } = useSocketNotifications()

  // Silent refresh function
  const silentRefresh = async () => {
    setRefreshing(true)
    await fetchNotifications(false)
    setRefreshing(false)
  }

  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'all') return true
    if (activeTab === 'unread') return !notification.isRead
    if (activeTab === 'deals') return notification.type.includes('DEAL_')
    if (activeTab === 'messages') return notification.type === 'MESSAGE_RECEIVED'
    return true
  })

  // Count unread notifications by category
  const unreadDealsCount = notifications.filter(n => !n.isRead && n.type.includes('DEAL_')).length
  const unreadMessagesCount = notifications.filter(n => !n.isRead && n.type === 'MESSAGE_RECEIVED').length

  // Re-fetch when tab changes
  useEffect(() => {
    if (isConnected && address) {
      const unreadOnly = activeTab === 'unread'
      fetchNotifications(unreadOnly)
    }
  }, [activeTab, isConnected, address, fetchNotifications])

  // Wallet not connected state
  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-monad-purple/10 flex items-center justify-center">
            <Bell className="w-10 h-10 text-monad-purple" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground mb-6">
              Connect your wallet to view your notifications
            </p>
            <Button className="btn-monad">
              Connect Wallet
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col h-screen">
        <div className="border-b border-border/40 top-0 z-10">
          <div className="container mx-auto p-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">
                  <span className="monad-gradient-text">Notifications</span>
                </h1>
                <Skeleton className="h-10 w-32" />
              </div>
              <Skeleton className="h-10 w-full max-w-md" />
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden">
          <div className="container mx-auto p-4 h-full">
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="glass-card p-4 rounded-xl">
                  <div className="flex items-start gap-4">
                    <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Failed to Load Notifications</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => fetchNotifications()} className="btn-monad">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Fixed Header */}
      <div className="border-b border-border/40 top-0 z-10">
        <div className="container mx-auto p-4">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">
                  <span className="monad-gradient-text">Notifications</span>
                </h1>
                {unreadCount > 0 && (
                  <Badge className="bg-monad-purple text-white">
                    {unreadCount} new
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={silentRefresh}
                  disabled={refreshing}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                  Refresh
                </Button>
                
                {unreadCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={markAllAsRead}
                    className="flex items-center gap-2"
                  >
                    <CheckCheck className="w-4 h-4" />
                    Mark All Read
                  </Button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="glass-card border-border/40">
                <TabsTrigger value="all" className="data-[state=active]:bg-monad-purple data-[state=active]:text-white">
                  All {notifications.length > 0 && `(${notifications.length})`}
                </TabsTrigger>
                <TabsTrigger value="unread" className="data-[state=active]:bg-monad-purple data-[state=active]:text-white">
                  Unread {unreadCount > 0 && `(${unreadCount})`}
                </TabsTrigger>
                <TabsTrigger value="deals" className="data-[state=active]:bg-monad-purple data-[state=active]:text-white">
                  Deals {unreadDealsCount > 0 && `(${unreadDealsCount})`}
                </TabsTrigger>
                <TabsTrigger value="messages" className="data-[state=active]:bg-monad-purple data-[state=active]:text-white">
                  Messages {unreadMessagesCount > 0 && `(${unreadMessagesCount})`}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-hidden">
        <div className="container mx-auto p-4 h-full">
          <div className="h-full overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              // Empty state
              <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 mx-auto rounded-full bg-monad-purple/10 flex items-center justify-center">
                    <Bell className="w-10 h-10 text-monad-purple" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-2">
                      {activeTab === 'unread' ? 'All Caught Up!' : 'No Notifications Yet'}
                    </h2>
                    <p className="text-muted-foreground mb-6">
                      {activeTab === 'unread' 
                        ? "You've read all your notifications. Great job staying on top of things!"
                        : "We'll notify you about new deals, messages, and important updates."
                      }
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              // Notifications list
              <div className="space-y-3">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "glass-card rounded-xl p-4 transition-all duration-200 hover:scale-[1.01] cursor-pointer group",
                      !notification.isRead && "bg-[#836EF9]/5"
                    )}
                    style={!notification.isRead ? {
                      boxShadow: '0 0 0 2px rgba(131, 110, 249, 0.2)'
                    } : {}}
                    onClick={() => {
                      if (!notification.isRead) {
                        markAsRead(notification.id)
                      }
                      // Navigate to deal if it exists
                      if (notification.dealId) {
                        window.open(`/deal/${notification.dealId}`, '_blank')
                      }
                    }}
                  >
                    <div className="flex items-start gap-4">
                      {/* Notification Icon */}
                      <div className={cn(
                        "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center",
                        getNotificationColor(notification.type),
                        !notification.isRead && "ring-2 ring-white/20"
                      )}>
                        <NotificationIcon type={notification.type} isRead={notification.isRead} />
                      </div>

                      {/* Notification Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h3 className={cn(
                              "font-semibold text-sm leading-tight",
                              !notification.isRead ? "text-foreground" : "text-muted-foreground"
                            )}>
                              {notification.title}
                            </h3>
                            <p className={cn(
                              "text-sm mt-1 leading-relaxed",
                              !notification.isRead ? "text-foreground/80" : "text-muted-foreground"
                            )}>
                              {notification.message}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {notification.dealId && (
                              <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                            {!notification.isRead && (
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: '#836EF9' }}
                              />
                            )}
                          </div>
                        </div>

                        {/* Timestamp */}
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-muted-foreground">
                            {getTimeAgo(notification.createdAt)}
                          </span>
                          
                          {/* Deal info if available */}
                          {notification.deal && (
                            <Badge variant="outline" className="text-xs">
                              {notification.deal.type} Deal
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 