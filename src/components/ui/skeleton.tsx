import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("glass-card animate-pulse rounded-xl bg-gradient-to-r from-monad-dark/50 to-monad-deep/30", className)}
      {...props}
    />
  )
}

// Specific skeleton components for common use cases
function SkeletonCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("glass-card rounded-xl p-6 space-y-4 animate-fade-in", className)} {...props}>
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-32 w-full" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  )
}

function SkeletonAvatar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <Skeleton 
      className={cn("h-10 w-10 rounded-full", className)} 
      {...props} 
    />
  )
}

function SkeletonText({ className, lines = 3, ...props }: React.ComponentProps<"div"> & { lines?: number }) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i}
          className={cn(
            "h-3",
            i === lines - 1 ? "w-2/3" : "w-full"
          )}
        />
      ))}
    </div>
  )
}

function SkeletonButton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <Skeleton 
      className={cn("h-10 w-24 rounded-xl", className)} 
      {...props} 
    />
  )
}

function SkeletonGrid({ 
  className, 
  columns = 3, 
  rows = 2, 
  ...props 
}: React.ComponentProps<"div"> & { columns?: number; rows?: number }) {
  return (
    <div 
      className={cn(`grid grid-cols-1 md:grid-cols-${columns} gap-6`, className)} 
      {...props}
    >
      {Array.from({ length: columns * rows }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export { 
  Skeleton, 
  SkeletonCard, 
  SkeletonAvatar, 
  SkeletonText, 
  SkeletonButton, 
  SkeletonGrid 
}
