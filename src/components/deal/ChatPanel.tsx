'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAccount } from 'wagmi'
import MessageInput from '@/components/deal/MessageInput'
import { useSocketMessages, useDealRoom } from '@/hooks/useSocket'
import { 
  ChevronDown, 
  User, 
  Clock,
  CheckCircle,
  Check,
  Loader2,
  AlertCircle,
  MoreVertical,
  Reply,
  Copy,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatAddress } from '@/utils/format'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { DealStatus, DealType } from '@prisma/client'
import { useAlerts } from '@/contexts/AlertContext'

interface User {
  address: string
  ensName?: string
  avatar?: string
  avatarImage?: string
  username?: string
  isOnline?: boolean
  lastSeen?: Date
}

interface Deal {
  id: string
  type: DealType
  status: DealStatus
  creatorAddress: string
  counterpartyAddress?: string
  creator: User
  counterparty?: User
  nft: {
    name: string
    collectionName?: string
  }
}

interface Message {
  id: string
  dealId: string
  content: string
  senderAddress: string
  type: 'TEXT' | 'SYSTEM' | 'DEAL_UPDATE' | 'IMAGE' | 'NFT_PREVIEW'
  timestamp: Date
  isRead?: boolean
  editedAt?: Date
  sender?: User
  replyTo?: {
    id: string
    content: string
    senderAddress: string
    sender?: User
  }
}

interface ChatPanelProps {
  dealId: string
  deal: Deal
  onSidebarToggle?: () => void
}

const ChatPanel = ({ dealId, deal, onSidebarToggle }: ChatPanelProps) => {
  const { address } = useAccount()
  const { showError } = useAlerts()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const [replyTo, setReplyTo] = useState<Message | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const lastScrollTop = useRef(0)

  // Socket integration
  const { messages: socketMessages, sendMessage } = useSocketMessages(dealId)
  const { isInRoom } = useDealRoom(dealId)

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `/api/messages/${dealId}?limit=25&userAddress=${address}`, // Reduced limit to match database limit
        {
          signal: AbortSignal.timeout(15000) // Reduced timeout for faster failure detection
        }
      )
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }
      
      const data = await response.json()

      // Convert timestamps and sort messages
      const fetchedMessages = data.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
        editedAt: msg.editedAt ? new Date(msg.editedAt) : undefined,
        sender: msg.sender ? {
          ...msg.sender,
          lastSeen: (msg.sender as any).lastSeen ? new Date((msg.sender as any).lastSeen) : undefined,
        } : undefined,
        replyTo: msg.replyTo ? {
          ...msg.replyTo,
          sender: msg.replyTo.sender ? {
            ...msg.replyTo.sender,
            lastSeen: (msg.replyTo.sender as any).lastSeen ? new Date((msg.replyTo.sender as any).lastSeen) : undefined,
          } : undefined,
        } : undefined,
      })).sort((a: Message, b: Message) => a.timestamp.getTime() - b.timestamp.getTime())

      setMessages(fetchedMessages)
    } catch (error) {
      console.error('Error fetching messages:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch messages')
      // Set empty messages array so chat can still work
      setMessages([])
    } finally {
      setLoading(false)
    }
  }, [dealId, address])

  // Background refresh function (doesn't show loading state)
  const refreshMessages = useCallback(async () => {
    try {
      // Create AbortController for manual timeout control
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // Reduced to 10 seconds
      
      const response = await fetch(
        `/api/messages/${dealId}?limit=25&userAddress=${address}`, // Reduced limit
        {
          signal: controller.signal
        }
      )
      
      clearTimeout(timeoutId) // Clear timeout if request succeeds
      
      if (!response.ok) {
        // Don't throw error for background refresh, just return silently
        return
      }
      
      const data = await response.json()

      // Convert timestamps and sort messages
      const fetchedMessages = data.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
        editedAt: msg.editedAt ? new Date(msg.editedAt) : undefined,
        sender: msg.sender ? {
          ...msg.sender,
          lastSeen: (msg.sender as any).lastSeen ? new Date((msg.sender as any).lastSeen) : undefined,
        } : undefined,
        replyTo: msg.replyTo ? {
          ...msg.replyTo,
          sender: msg.replyTo.sender ? {
            ...msg.replyTo.sender,
            lastSeen: (msg.replyTo.sender as any).lastSeen ? new Date((msg.replyTo.sender as any).lastSeen) : undefined,
          } : undefined,
        } : undefined,
      })).sort((a: Message, b: Message) => a.timestamp.getTime() - b.timestamp.getTime())

      setMessages(fetchedMessages)
    } catch (error) {
      // Completely silent for background refresh errors
      // Only log if it's not a timeout or abort error
      if (error instanceof Error && 
          !error.name.includes('Abort') && 
          !error.message.includes('timeout') && 
          !error.message.includes('signal timed out')) {
        console.warn('Background refresh failed silently:', error.message)
      }
    }
  }, [dealId, address])

  // Load initial messages
  useEffect(() => {
    if (dealId && address) {
      fetchMessages()
    } else {
      // Don't stay in loading state if no deal ID or address
      setLoading(false)
    }
  }, [fetchMessages, dealId, address])

  // Add automatic message refreshing with exponential backoff and better error handling
  useEffect(() => {
    if (!loading && dealId && address) {
      let timeoutId: NodeJS.Timeout
      let retryCount = 0
      const maxRetries = 2 // Reduced max retries

      const scheduleRefresh = () => {
        // More conservative delays: 10s, 20s, 30s
        const baseDelay = 10000 // Start with 10 seconds instead of 5
        const delay = retryCount > 0 ? Math.min(baseDelay * (retryCount + 1), 30000) : baseDelay
        
        timeoutId = setTimeout(async () => {
          try {
            await refreshMessages()
            retryCount = 0 // Reset on success
          } catch (error) {
            // Increment retry count on any error
            retryCount = Math.min(retryCount + 1, maxRetries)
          }
          scheduleRefresh() // Always schedule next refresh
        }, delay)
      }

      scheduleRefresh()

      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
      }
    }
  }, [refreshMessages, loading, dealId, address])

  // Handle new socket messages with better error handling
  useEffect(() => {
    if (socketMessages.length > 0) {
      socketMessages.forEach(socketMessage => {
        setMessages(prev => {
          // Check if message already exists
          const exists = prev.some(msg => msg.id === socketMessage.id)
          if (exists) return prev
          
          // Add new message and sort
          const newMessages = [...prev, {
            ...socketMessage,
            timestamp: new Date(socketMessage.timestamp),
            sender: socketMessage.sender ? {
              ...socketMessage.sender,
              lastSeen: (socketMessage.sender as any).lastSeen ? new Date((socketMessage.sender as any).lastSeen) : undefined,
            } : undefined,
            replyTo: socketMessage.replyTo ? {
              ...socketMessage.replyTo,
              sender: (socketMessage.replyTo as any).sender ? {
                ...(socketMessage.replyTo as any).sender,
                lastSeen: ((socketMessage.replyTo as any).sender as any).lastSeen ? new Date(((socketMessage.replyTo as any).sender as any).lastSeen) : undefined,
              } : undefined,
            } : undefined,
          }].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
          
          // Update unread count if message is from another user
          if (socketMessage.senderAddress.toLowerCase() !== address?.toLowerCase()) {
            setUnreadCount(count => count + 1)
          }
          
          return newMessages
        })
      })
    }
  }, [socketMessages, address])

  // Auto-scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? 'smooth' : 'auto',
      block: 'end'
    })
    setUnreadCount(0)
  }, [])

  // Handle scroll to detect if user is at bottom
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50 // More sensitive threshold
    
    setShowScrollButton(!isAtBottom)
    
    // Reset unread count when scrolling to bottom
    if (isAtBottom && unreadCount > 0) {
      setUnreadCount(0)
    }
    
    lastScrollTop.current = scrollTop
  }, [unreadCount])

  // Auto-scroll when new messages arrive (improved messaging app behavior)
  useEffect(() => {
    if (messages.length === 0) return

    const container = messagesContainerRef.current
    if (!container) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50
    
    // Always auto-scroll if it's user's own message or if user is at bottom
    const latestMessage = messages[messages.length - 1]
    const isOwnMessage = latestMessage && latestMessage.senderAddress.toLowerCase() === address?.toLowerCase()
    
    if (isAtBottom || isOwnMessage) {
      // Small delay to ensure DOM is updated
      setTimeout(() => scrollToBottom(), 100)
    }
  }, [messages, address, scrollToBottom])

  // Scroll to bottom when component mounts
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollToBottom(false), 200)
    }
  }, [messages.length > 0, scrollToBottom])

  // Handle sending messages
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !address) return
    
    // Try to send via socket first, but fallback to API if needed
    try {
      sendMessage(content, replyTo?.id)
      setReplyTo(null)
      
      // Also send via API as backup to ensure message is saved
      const response = await fetch('/api/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dealId,
          senderAddress: address,
          content: content.trim(),
          type: 'TEXT',
          replyToId: replyTo?.id,
        }),
      })

      if (!response.ok) {
        console.error('Failed to send message via API')
        // Refresh messages to get latest state
        await fetchMessages()
        showError('Message Warning', 'Message sent but may not be saved. Please refresh if you don\'t see it.')
      }
      
    } catch (error) {
      console.error('Error sending message:', error)
      showError('Connection Issue', 'Attempting to send via backup method...')
      
      // Fallback to API-only sending if socket fails
      try {
        const response = await fetch('/api/message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dealId,
            senderAddress: address,
            content: content.trim(),
            type: 'TEXT',
            replyToId: replyTo?.id,
          }),
        })

        if (response.ok) {
          // Refresh messages to show the new message
          await fetchMessages()
          setReplyTo(null)
        } else {
          console.error('Failed to send message via API fallback')
          showError('Message Failed', 'Unable to send message. Please try again.')
        }
      } catch (apiError) {
        console.error('Both socket and API message sending failed:', apiError)
        showError('Message Failed', 'Unable to send message. Please check your connection and try again.')
      }
    }
    
    // Close mobile sidebar when sending message
    onSidebarToggle?.()
  }

  // Copy message content
  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
    } catch (error) {
      console.error('Failed to copy message:', error)
    }
  }

  // Format message timestamp
  const formatMessageTime = (timestamp: Date) => {
    const now = new Date()
    const isToday = timestamp.toDateString() === now.toDateString()
    
    if (isToday) {
      return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else {
      return timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  // Get user display info
  const getUserDisplay = (message: Message) => {
    const isCurrentUser = address && message.senderAddress.toLowerCase() === address.toLowerCase()
    const user = message.sender
    
    return {
      name: user?.ensName || user?.username || formatAddress(message.senderAddress),
      avatar: user?.avatarImage || user?.avatar, // Prioritize avatarImage (base64) over avatar (URL)
      isCurrentUser,
      isOnline: user?.isOnline,
    }
  }

  // Message bubble component
  const MessageBubble = ({ message, isLast }: { message: Message, isLast: boolean }) => {
    const userDisplay = getUserDisplay(message)
    const [showMenu, setShowMenu] = useState(false)

    return (
      <div className={cn(
        "flex items-end space-x-3 group mb-3",
        userDisplay.isCurrentUser ? "flex-row-reverse space-x-reverse" : "flex-row"
      )}>
        {/* Avatar - show for both sender and receiver */}
        <div className="relative flex-shrink-0">
          <div className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center border-2",
            userDisplay.isCurrentUser 
              ? "bg-gradient-to-br from-monad-purple to-purple-500 border-purple-400/50" 
              : "bg-gradient-to-br from-slate-500 to-slate-600 border-slate-400/50"
          )}>
            {userDisplay.avatar ? (
              <Image 
                src={userDisplay.avatar} 
                alt={userDisplay.name} 
                width={32} 
                height={32} 
                className="rounded-full object-cover" 
              />
            ) : (
              <User className="h-4 w-4 text-white" />
            )}
          </div>
          {userDisplay.isOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-400 border-2 border-background" />
          )}
        </div>

        {/* Message Content */}
        <div className={cn(
          "flex flex-col space-y-1 max-w-xs sm:max-w-sm lg:max-w-md",
          userDisplay.isCurrentUser ? "items-end" : "items-start"
        )}>
          {/* User name for non-current users */}
          {!userDisplay.isCurrentUser && (
            <span className="text-xs font-medium text-muted-foreground px-3">
              {userDisplay.name}
            </span>
          )}

          {/* Reply indicator */}
          {message.replyTo && (
            <div className={cn(
              "text-xs text-muted-foreground p-2 rounded border-l-2 border-border bg-muted/20",
              userDisplay.isCurrentUser ? "border-r-2 border-l-0" : ""
            )}>
              <div className="font-medium">
                {message.replyTo.sender?.ensName || 
                 message.replyTo.sender?.username || 
                 formatAddress(message.replyTo.senderAddress)}
              </div>
              <div className="truncate">
                {message.replyTo.content}
              </div>
            </div>
          )}

          {/* Message bubble */}
          <div
            className={cn(
              "relative group/message px-3 py-2 rounded-2xl break-words max-w-[280px] sm:max-w-[320px]",
              "transition-all duration-200 hover:shadow-lg",
              userDisplay.isCurrentUser ? [
                // Current user: Full purple with glass effect
                "glass-card-purple text-white ml-8",
                "rounded-br-md shadow-lg shadow-[#836EF9]/30",
                "hover:shadow-[#836EF9]/50 hover:scale-[1.02]",
                "border-[#836EF9]/60 hover:border-[#836EF9]/80"
              ] : [
                // Other users: Glass style with neutral accent
                "glass-card border border-slate-400/30 text-white mr-8",
                "rounded-bl-md shadow-lg shadow-black/10",
                "hover:border-slate-400/50 hover:bg-white/[0.08]",
                "bg-gradient-to-r from-white/[0.05] to-slate-500/[0.1] backdrop-blur-md"
              ]
            )}
          >
            {/* Message text */}
            {message.type === 'TEXT' && (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>
            )}

            {/* System message */}
            {message.type === 'SYSTEM' && (
              <p className="text-xs italic text-center text-muted-foreground">
                {message.content}
              </p>
            )}

            {/* Deal update message */}
            {message.type === 'DEAL_UPDATE' && (
              <div className="flex items-center space-x-2 text-sm">
                <AlertCircle className="h-4 w-4 text-yellow-400" />
                <span>{message.content}</span>
              </div>
            )}

            {/* Message menu */}
            <div className={cn(
              "absolute top-0 flex items-center space-x-1 opacity-0 group-hover/message:opacity-100 transition-opacity",
              userDisplay.isCurrentUser ? "-left-16" : "-right-16"
            )}>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-muted/80"
                onClick={() => setReplyTo(message)}
              >
                <Reply className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-muted/80"
                onClick={() => copyMessage(message.content)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Timestamp and status */}
          <div className={cn(
            "flex items-center space-x-1 text-xs text-muted-foreground px-3",
            userDisplay.isCurrentUser ? "flex-row-reverse space-x-reverse" : "flex-row"
          )}>
            <span>{formatMessageTime(message.timestamp)}</span>
            {message.editedAt && (
              <span className="italic">(edited)</span>
            )}
            {userDisplay.isCurrentUser && (
              <div className="flex items-center">
                {message.isRead ? (
                  <CheckCircle className="h-3 w-3 text-green-400" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-monad-purple" />
          <p className="text-sm text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <AlertCircle className="h-6 w-6 mx-auto text-red-400" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={fetchMessages} variant="outline" size="sm">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full max-h-full overflow-hidden">
      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth min-h-0"
        style={{ 
          scrollBehavior: 'smooth',
          overflowAnchor: 'none' // Prevent scroll jumping
        }}
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <div className="h-12 w-12 rounded-full bg-muted/20 flex items-center justify-center mx-auto">
                <User className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Start the conversation about <strong>{deal.nft.name}</strong>
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((message, index) => (
              <MessageBubble 
                key={message.id} 
                message={message} 
                isLast={index === messages.length - 1}
              />
            ))}
          </div>
        )}

        {/* Typing indicators */}
        {typingUsers.size > 0 && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground px-4 py-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
            <span>
              {Array.from(typingUsers).map(addr => formatAddress(addr)).join(', ')} typing...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <Button
          onClick={() => scrollToBottom()}
          className={cn(
            "absolute bottom-20 right-4 h-10 w-10 rounded-full shadow-lg",
            "bg-monad-purple hover:bg-monad-purple/90 text-white",
            "transform transition-all duration-200 hover:scale-105 z-10"
          )}
        >
          <ChevronDown className="h-4 w-4" />
          {unreadCount > 0 && (
            <div className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </Button>
      )}

      {/* Reply preview */}
      {replyTo && (
        <div className="px-4 py-2 border-t border-border/40 bg-muted/20 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm">
              <Reply className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Replying to</span>
              <span className="font-medium">
                {replyTo.sender?.ensName || 
                 replyTo.sender?.username || 
                 formatAddress(replyTo.senderAddress)}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyTo(null)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground truncate mt-1">
            {replyTo.content}
          </p>
        </div>
      )}

      {/* Message Input */}
      <div className="border-t border-border/40 p-4 flex-shrink-0">
        <MessageInput 
          dealId={dealId} 
          onSendMessage={handleSendMessage}
          disabled={false}
          placeholder={`Message about ${deal.nft.name}...`}
        />
      </div>
    </div>
  )
}

export default ChatPanel 