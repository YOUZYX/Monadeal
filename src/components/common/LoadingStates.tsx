import { 
  Skeleton, 
  SkeletonCard, 
  SkeletonAvatar, 
  SkeletonText, 
  SkeletonButton 
} from "@/components/ui/skeleton"

// Page-level loading component
export function PageLoading() {
  return (
    <div className="w-full space-y-8 animate-fade-in">
      <section className="text-center py-12 lg:py-16">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <Skeleton className="h-16 w-80 mx-auto" />
          <Skeleton className="h-6 w-96 mx-auto" />
          <SkeletonText lines={2} className="max-w-2xl mx-auto" />
          <SkeletonButton className="h-12 w-32 mx-auto" />
        </div>
      </section>
    </div>
  )
}

// Deal card loading skeleton
export function DealCardLoading() {
  return (
    <div className="glass-card rounded-xl p-6 space-y-4">
      <div className="flex items-center space-x-3">
        <SkeletonAvatar />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-32 w-full rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-20" />
        <SkeletonButton className="h-8 w-16" />
      </div>
    </div>
  )
}

// NFT grid loading
export function NFTGridLoading({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card rounded-xl p-4 space-y-3">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Chat message loading
export function ChatMessageLoading() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
          <div className={`flex items-start space-x-2 max-w-xs ${i % 2 === 1 ? 'flex-row-reverse space-x-reverse' : ''}`}>
            <SkeletonAvatar className="h-8 w-8" />
            <div className="glass-card rounded-lg p-3 space-y-1">
              <SkeletonText lines={2} />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Sidebar loading
export function SidebarLoading() {
  return (
    <div className="space-y-6">
      {/* Logo section */}
      <div className="flex items-center space-x-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-1">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      
      {/* Navigation */}
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3 px-4 py-3">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
      
      {/* Stats */}
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="glass-card rounded-xl p-4 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Header loading
export function HeaderLoading() {
  return (
    <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center space-x-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-6 w-24" />
      </div>
      
      <div className="hidden lg:flex items-center space-x-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-16" />
        ))}
      </div>
      
      <div className="flex items-center space-x-3">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <SkeletonButton />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
    </div>
  )
}

// Full page loading with layout
export function AppLoading() {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar skeleton */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 glass-nav p-6">
        <SidebarLoading />
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Header skeleton */}
        <div className="glass-header border-b border-border/40">
          <HeaderLoading />
        </div>
        
        {/* Page content skeleton */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <div className="max-w-7xl mx-auto w-full">
            <PageLoading />
          </div>
        </main>
      </div>
    </div>
  )
} 