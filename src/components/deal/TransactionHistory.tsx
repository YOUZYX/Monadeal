'use client'

import { useState, useEffect } from 'react'
import { 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  Clock, 
  CheckCircle, 
  XCircle,
  ArrowUpRight,
  Coins,
  Shield,
  ArrowLeftRight,
  Plus,
  Ban
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAlerts } from '@/contexts/AlertContext'

interface Transaction {
  id: string
  hash: string
  type: 'CREATE_DEAL' | 'ACCEPT_DEAL' | 'APPROVE_NFT' | 'DEPOSIT_NFT' | 'DEPOSIT_PAYMENT' | 'UPDATE_PRICE' | 'CANCEL_DEAL' | 'COMPLETE_DEAL' | 'COUNTER_OFFER' | 'ACCEPT_COUNTER_OFFER' | 'DECLINE_COUNTER_OFFER'
  status: 'PENDING' | 'CONFIRMED' | 'FAILED'
  createdAt: string
  confirmedAt?: string
  blockNumber?: string
  gasUsed?: string
  gasFee?: string
  amount?: string
  contractAddress?: string
  user: {
    address: string
    ensName?: string
    username?: string
    avatar?: string
    avatarImage?: string
  }
}

interface TransactionHistoryProps {
  dealId: string
  className?: string
}

const getTransactionIcon = (type: Transaction['type']) => {
  switch (type) {
    case 'CREATE_DEAL':
      return <Plus className="w-4 h-4" />
    case 'ACCEPT_DEAL':
      return <CheckCircle className="w-4 h-4" />
    case 'APPROVE_NFT':
      return <Shield className="w-4 h-4" />
    case 'DEPOSIT_NFT':
    case 'DEPOSIT_PAYMENT':
      return <ArrowUpRight className="w-4 h-4" />
    case 'UPDATE_PRICE':
      return <Coins className="w-4 h-4" />
    case 'CANCEL_DEAL':
      return <Ban className="w-4 h-4" />
    case 'COMPLETE_DEAL':
      return <CheckCircle className="w-4 h-4" />
    case 'COUNTER_OFFER':
    case 'ACCEPT_COUNTER_OFFER':
    case 'DECLINE_COUNTER_OFFER':
      return <ArrowLeftRight className="w-4 h-4" />
    default:
      return <Clock className="w-4 h-4" />
  }
}

const getTransactionLabel = (type: Transaction['type']) => {
  switch (type) {
    case 'CREATE_DEAL':
      return 'Deal Created'
    case 'ACCEPT_DEAL':
      return 'Deal Accepted'
    case 'APPROVE_NFT':
      return 'NFT Approved'
    case 'DEPOSIT_NFT':
      return 'NFT Deposited'
    case 'DEPOSIT_PAYMENT':
      return 'Payment Deposited'
    case 'UPDATE_PRICE':
      return 'Price Updated'
    case 'CANCEL_DEAL':
      return 'Deal Cancelled'
    case 'COMPLETE_DEAL':
      return 'Deal Completed'
    case 'COUNTER_OFFER':
      return 'Counter Offer Made'
    case 'ACCEPT_COUNTER_OFFER':
      return 'Counter Offer Accepted'
    case 'DECLINE_COUNTER_OFFER':
      return 'Counter Offer Declined'
    default:
      return 'Transaction'
  }
}

const getStatusColor = (status: Transaction['status']) => {
  switch (status) {
    case 'CONFIRMED':
      return 'text-green-400'
    case 'FAILED':
      return 'text-red-400'
    case 'PENDING':
      return 'text-yellow-400'
    default:
      return 'text-gray-400'
  }
}

const getStatusIcon = (status: Transaction['status']) => {
  switch (status) {
    case 'CONFIRMED':
      return <CheckCircle className="w-4 h-4" />
    case 'FAILED':
      return <XCircle className="w-4 h-4" />
    case 'PENDING':
      return <Clock className="w-4 h-4" />
    default:
      return <Clock className="w-4 h-4" />
  }
}

const formatUserDisplay = (user: Transaction['user']) => {
  if (user.ensName) return user.ensName
  if (user.username) return user.username
  return `${user.address.slice(0, 6)}...${user.address.slice(-4)}`
}

export default function TransactionHistory({ dealId, className }: TransactionHistoryProps) {
  const { showError } = useAlerts()
  const [isExpanded, setIsExpanded] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/deal/${dealId}/transactions`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch transactions')
      }
      
      setTransactions(data.transactions || [])
    } catch (err) {
      console.error('Error fetching transactions:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch transactions'
      setError(errorMessage)
      showError('Transaction History', 'Unable to load transaction history. Please try refreshing.')
    } finally {
      setLoading(false)
    }
  }

  const silentFetchTransactions = async () => {
    try {
      // Don't show loading indicator for silent updates
      const response = await fetch(`/api/deal/${dealId}/transactions`)
      const data = await response.json()
      
      if (response.ok) {
        setTransactions(data.transactions || [])
        // Clear any previous errors on successful silent update
        setError(null)
      }
    } catch (err) {
      console.error('Silent transaction fetch error:', err)
      // Don't update error state for silent updates to avoid disrupting UX
    }
  }

  useEffect(() => {
    if (dealId) {
      fetchTransactions()
    }
  }, [dealId])

  // Silent update every 60 seconds
  useEffect(() => {
    if (!dealId) return

    const interval = setInterval(() => {
      silentFetchTransactions()
    }, 60000) // 60 seconds

    return () => clearInterval(interval)
  }, [dealId])

  const getExplorerUrl = (hash: string) => {
    return `https://testnet.monadexplorer.com/tx/${hash}`
  }

  if (loading) {
    return (
      <div className={cn('bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Clock className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Transaction History</h3>
              <p className="text-sm text-gray-400">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Transaction History</h3>
              <p className="text-sm text-red-400">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-lg', className)}>
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Shield className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Transaction History</h3>
            <p className="text-sm text-gray-400">
              {transactions.length === 0 ? 'No transactions yet' : `${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        
        {transactions.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {isExpanded ? 'Hide' : 'Show'} Details
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>
        )}
      </div>

      {isExpanded && transactions.length > 0 && (
        <div className="border-t border-gray-700">
          <div className="p-4 space-y-4">
            {transactions.map((transaction, index) => (
              <div key={transaction.id} className="relative">
                {/* Timeline line */}
                {index < transactions.length - 1 && (
                  <div className="absolute left-6 top-8 w-px h-8 bg-gray-600" />
                )}
                
                <div className="flex items-start gap-4">
                  {/* Transaction icon */}
                  <div className={cn(
                    'p-2 rounded-lg flex-shrink-0',
                    transaction.status === 'CONFIRMED' ? 'bg-green-500/20' :
                    transaction.status === 'FAILED' ? 'bg-red-500/20' : 'bg-yellow-500/20'
                  )}>
                    <div className={getStatusColor(transaction.status)}>
                      {getTransactionIcon(transaction.type)}
                    </div>
                  </div>

                  {/* Transaction details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">{getTransactionLabel(transaction.type)}</p>
                        <p className="text-sm text-gray-400">
                          by {formatUserDisplay(transaction.user)}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className={cn('flex items-center gap-1', getStatusColor(transaction.status))}>
                          {getStatusIcon(transaction.status)}
                          <span className="text-xs capitalize">{transaction.status.toLowerCase()}</span>
                        </div>
                        
                        <a
                          href={getExplorerUrl(transaction.hash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 hover:bg-gray-700 rounded transition-colors"
                          title="View on Monad Explorer"
                        >
                          <ExternalLink className="w-4 h-4 text-gray-400 hover:text-purple-400" />
                        </a>
                      </div>
                    </div>

                    {/* Transaction hash */}
                    <div className="mt-2 text-xs text-gray-500 font-mono">
                      {transaction.hash.slice(0, 10)}...{transaction.hash.slice(-8)}
                    </div>

                    {/* Timestamp */}
                    <div className="mt-1 text-xs text-gray-500">
                      {new Date(transaction.createdAt).toLocaleString()}
                      {transaction.confirmedAt && transaction.status === 'CONFIRMED' && (
                        <span className="ml-2">
                          (confirmed {new Date(transaction.confirmedAt).toLocaleString()})
                        </span>
                      )}
                    </div>

                    {/* Additional details */}
                    {(transaction.blockNumber || transaction.gasUsed || transaction.amount) && (
                      <div className="mt-2 text-xs text-gray-500 space-y-1">
                        {transaction.blockNumber && (
                          <div>Block: {transaction.blockNumber}</div>
                        )}
                        {transaction.gasUsed && (
                          <div>Gas: {transaction.gasUsed}</div>
                        )}
                        {transaction.amount && (
                          <div>Amount: {transaction.amount} MON</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 