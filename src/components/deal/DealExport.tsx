'use client'

import { useState } from 'react'
import { 
  Download, 
  FileText, 
  Table, 
  Check,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DealStatus, DealType } from '@prisma/client'

interface DealData {
  id: string
  type: DealType
  status: DealStatus
  createdAt: Date
  updatedAt: Date
  expiresAt?: Date
  creatorAddress: string
  counterpartyAddress?: string
  price?: string
  escrowContractAddress?: string
  transactionHash?: string
  completedAt?: Date
  cancelledAt?: Date
  title?: string
  description?: string
  nft: {
    contractAddress: string
    tokenId: string
    name: string
    collectionName?: string
    image?: string
  }
  swapNft?: {
    contractAddress: string
    tokenId: string
    name: string
    collectionName?: string
    image?: string
  }
}

interface DealExportProps {
  deal: DealData
  className?: string
}

type ExportFormat = 'json' | 'csv'

const DealExport = ({ deal, className }: DealExportProps) => {
  const [isExporting, setIsExporting] = useState<ExportFormat | null>(null)
  const [lastExported, setLastExported] = useState<ExportFormat | null>(null)

  const formatDealDataForExport = () => {
    return {
      // Basic deal info
      dealId: deal.id,
      dealType: deal.type,
      dealStatus: deal.status,
      createdAt: deal.createdAt.toISOString(),
      updatedAt: deal.updatedAt.toISOString(),
      expiresAt: deal.expiresAt?.toISOString(),
      completedAt: deal.completedAt?.toISOString(),
      cancelledAt: deal.cancelledAt?.toISOString(),
      
      // Participants
      creatorAddress: deal.creatorAddress,
      counterpartyAddress: deal.counterpartyAddress || 'Not assigned',
      
      // Financial details
      price: deal.price || 'Not specified',
      currency: 'MON',
      
      // Smart contract details
      escrowContractAddress: deal.escrowContractAddress || 'Not deployed',
      transactionHash: deal.transactionHash || 'None',
      
      // NFT details
      nftContractAddress: deal.nft.contractAddress,
      nftTokenId: deal.nft.tokenId,
      nftName: deal.nft.name,
      nftCollection: deal.nft.collectionName || 'Unknown',
      nftImage: deal.nft.image || 'None',
      
      // Swap NFT details (if applicable)
      swapNftContractAddress: deal.swapNft?.contractAddress || 'N/A',
      swapNftTokenId: deal.swapNft?.tokenId || 'N/A',
      swapNftName: deal.swapNft?.name || 'N/A',
      swapNftCollection: deal.swapNft?.collectionName || 'N/A',
      swapNftImage: deal.swapNft?.image || 'N/A',
      
      // Additional metadata
      title: deal.title || 'Untitled Deal',
      description: deal.description || 'No description',
      exportedAt: new Date().toISOString(),
      platform: 'Monadeal',
      blockchain: 'Monad Testnet'
    }
  }

  const downloadAsJSON = async () => {
    setIsExporting('json')
    
    try {
      const exportData = formatDealDataForExport()
      const jsonString = JSON.stringify(exportData, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `monadeal-${deal.id}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      URL.revokeObjectURL(url)
      setLastExported('json')
      
      // Reset success state after 3 seconds
      setTimeout(() => setLastExported(null), 3000)
    } catch (error) {
      console.error('Error exporting JSON:', error)
    } finally {
      setIsExporting(null)
    }
  }

  const downloadAsCSV = async () => {
    setIsExporting('csv')
    
    try {
      const exportData = formatDealDataForExport()
      
      // Convert object to CSV format
      const headers = Object.keys(exportData)
      const values = Object.values(exportData)
      
      const csvContent = [
        headers.join(','),
        values.map(value => 
          typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value
        ).join(',')
      ].join('\n')
      
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `monadeal-${deal.id}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      URL.revokeObjectURL(url)
      setLastExported('csv')
      
      // Reset success state after 3 seconds
      setTimeout(() => setLastExported(null), 3000)
    } catch (error) {
      console.error('Error exporting CSV:', error)
    } finally {
      setIsExporting(null)
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center space-x-2">
        <Download className="h-4 w-4 text-monad-purple" />
        <h3 className="text-sm font-medium">Export Deal Data</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {/* JSON Export */}
        <Button
          variant="outline"
          size="sm"
          onClick={downloadAsJSON}
          disabled={isExporting === 'json'}
          className={cn(
            "glass-card border-border/40 hover:border-monad-purple/50 transition-all duration-200",
            lastExported === 'json' && "border-green-500/50 bg-green-500/10"
          )}
        >
          {isExporting === 'json' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : lastExported === 'json' ? (
            <Check className="h-4 w-4 text-green-400" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          <span className="ml-2 text-xs">
            {lastExported === 'json' ? 'Downloaded!' : 'JSON'}
          </span>
        </Button>

        {/* CSV Export */}
        <Button
          variant="outline"
          size="sm"
          onClick={downloadAsCSV}
          disabled={isExporting === 'csv'}
          className={cn(
            "glass-card border-border/40 hover:border-monad-purple/50 transition-all duration-200",
            lastExported === 'csv' && "border-green-500/50 bg-green-500/10"
          )}
        >
          {isExporting === 'csv' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : lastExported === 'csv' ? (
            <Check className="h-4 w-4 text-green-400" />
          ) : (
            <Table className="h-4 w-4" />
          )}
          <span className="ml-2 text-xs">
            {lastExported === 'csv' ? 'Downloaded!' : 'CSV'}
          </span>
        </Button>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Export includes deal details, NFT metadata, participants, and transaction history.
      </p>
    </div>
  )
}

export default DealExport 