import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Clock, Zap, User, Users, AlertTriangle } from "lucide-react"
import { DealStatus } from "@prisma/client"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: DealStatus | string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'glass';
}

const statusConfig = {
  [DealStatus.PENDING]: {
    label: 'Pending',
    icon: Clock,
    colors: {
      bg: 'bg-yellow-500/20',
      border: 'border-yellow-500/40',
      text: 'text-yellow-300',
      glow: 'shadow-yellow-500/20',
    }
  },
  [DealStatus.AWAITING_BUYER]: {
    label: 'Awaiting Buyer',
    icon: User,
    colors: {
      bg: 'bg-blue-500/20',
      border: 'border-blue-500/40',
      text: 'text-blue-300',
      glow: 'shadow-blue-500/20',
    }
  },
  [DealStatus.AWAITING_SELLER]: {
    label: 'Awaiting Seller',
    icon: Users,
    colors: {
      bg: 'bg-orange-500/20',
      border: 'border-orange-500/40',
      text: 'text-orange-300',
      glow: 'shadow-orange-500/20',
    }
  },
  [DealStatus.LOCKED_IN_ESCROW]: {
    label: 'Locked in Escrow',
    icon: Zap,
    colors: {
      bg: 'bg-monad-purple/20',
      border: 'border-monad-purple/40',
      text: 'text-monad-purple',
      glow: 'shadow-monad-purple/20',
    }
  },
  [DealStatus.COMPLETED]: {
    label: 'Completed',
    icon: CheckCircle,
    colors: {
      bg: 'bg-green-500/20',
      border: 'border-green-500/40',
      text: 'text-green-300',
      glow: 'shadow-green-500/20',
    }
  },
  [DealStatus.CANCELLED]: {
    label: 'Cancelled',
    icon: XCircle,
    colors: {
      bg: 'bg-red-500/20',
      border: 'border-red-500/40',
      text: 'text-red-300',
      glow: 'shadow-red-500/20',
    }
  },
}

// Default fallback configuration
const defaultConfig = {
  label: 'Unknown',
  icon: AlertTriangle,
  colors: {
    bg: 'bg-gray-500/20',
    border: 'border-gray-500/40',
    text: 'text-gray-300',
    glow: 'shadow-gray-500/20',
  }
}

const sizeConfig = {
  sm: {
    padding: 'px-2 py-1',
    text: 'text-xs',
    icon: 'h-3 w-3',
    gap: 'gap-1',
  },
  md: {
    padding: 'px-3 py-1.5',
    text: 'text-sm',
    icon: 'h-4 w-4',
    gap: 'gap-1.5',
  },
  lg: {
    padding: 'px-4 py-2',
    text: 'text-base',
    icon: 'h-5 w-5',
    gap: 'gap-2',
  }
}

export const StatusBadge = ({ 
  status, 
  className, 
  size = 'md', 
  variant = 'glass' 
}: StatusBadgeProps) => {
  // Get config with fallback for unknown statuses
  const config = statusConfig[status as DealStatus] || {
    ...defaultConfig,
    label: typeof status === 'string' ? status.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown'
  }
  
  const sizeStyles = sizeConfig[size]
  const IconComponent = config.icon

  // Add debugging in development
  if (process.env.NODE_ENV === 'development' && !statusConfig[status as DealStatus]) {
    console.warn(`StatusBadge: Unknown status "${status}". Available statuses:`, Object.keys(statusConfig))
  }

  const baseStyles = cn(
    // Base styles
    'inline-flex items-center font-medium rounded-full transition-all duration-200',
    sizeStyles.padding,
    sizeStyles.text,
    sizeStyles.gap,
    
    // Variant-specific styles
    variant === 'glass' && [
      'glass-card backdrop-blur-md',
      config.colors.bg,
      config.colors.border,
      config.colors.text,
      'shadow-lg',
      config.colors.glow,
      'hover:shadow-xl',
      `hover:${config.colors.glow.replace('shadow-', 'shadow-2xl shadow-')}`
    ],
    
    variant === 'outline' && [
      'border-2',
      config.colors.border,
      config.colors.text,
      'bg-transparent',
      'hover:bg-opacity-10'
    ],
    
    variant === 'default' && [
      'bg-opacity-90',
      config.colors.bg.replace('/20', ''),
      'text-white',
      'shadow-md'
    ],
    
    className
  )

  return (
    <div className={baseStyles}>
      <IconComponent className={cn(sizeStyles.icon, 'flex-shrink-0')} />
      <span className="font-medium">
        {config.label}
      </span>
    </div>
  )
} 