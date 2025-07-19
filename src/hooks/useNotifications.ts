import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { NotificationType } from '@/types/prisma-override'

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

export function useNotifications() {
  const { address, isConnected } = useAccount()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch notifications
  const fetchNotifications = useCallback(async (unreadOnly = false) => {
    if (!address || !isConnected) return

    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/notifications/user/${address}?unreadOnly=${unreadOnly}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch notifications')
      }
      
      if (data.success) {
        const fetchedNotifications = data.notifications || []
        setNotifications(fetchedNotifications)
        
        // Update unread count
        const unread = fetchedNotifications.filter((n: Notification) => !n.isRead).length
        setUnreadCount(unread)
      }
    } catch (err) {
      console.error('Error fetching notifications:', err)
      setError(err instanceof Error ? err.message : 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [address, isConnected])

  // Fetch unread count only (for header indicator)
  const fetchUnreadCount = useCallback(async () => {
    if (!address || !isConnected) return

    try {
      const response = await fetch(`/api/notifications/user/${address}?unreadOnly=true`)
      const data = await response.json()
      
      if (response.ok && data.success) {
        const unread = data.notifications?.length || 0
        setUnreadCount(unread)
      }
    } catch (err) {
      console.error('Error fetching unread count:', err)
    }
  }, [address, isConnected])

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
      })
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        )
        
        // Update unread count
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }, [])

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    const unreadNotifications = notifications.filter(n => !n.isRead)
    
    try {
      await Promise.all(
        unreadNotifications.map(n => 
          fetch(`/api/notifications/${n.id}/read`, { method: 'PUT' })
        )
      )
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true }))
      )
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }, [notifications])

  // Initial fetch
  useEffect(() => {
    if (isConnected && address) {
      fetchNotifications()
    } else {
      setNotifications([])
      setUnreadCount(0)
      setLoading(false)
    }
  }, [isConnected, address, fetchNotifications])

  // Periodic unread count refresh (for header indicator)
  useEffect(() => {
    if (!address || !isConnected) return

    const interval = setInterval(() => {
      fetchUnreadCount()
    }, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [address, isConnected, fetchUnreadCount])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
  }
} 