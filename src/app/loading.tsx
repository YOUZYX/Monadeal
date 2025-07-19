import { 
  Skeleton, 
  SkeletonCard, 
  SkeletonAvatar, 
  SkeletonText, 
  SkeletonButton, 
  SkeletonGrid 
} from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="w-full space-y-8 animate-fade-in">
      {/* Hero Section Skeleton */}
      <section className="text-center py-12 lg:py-16">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <Skeleton className="h-16 w-80 mx-auto" />
          <Skeleton className="h-6 w-96 mx-auto" />
          <SkeletonText lines={2} className="max-w-2xl mx-auto" />
          <SkeletonButton className="h-12 w-32 mx-auto" />
        </div>
      </section>

      {/* Features Section Skeleton */}
      <section className="px-4">
        <div className="max-w-6xl mx-auto">
          <SkeletonGrid columns={3} rows={1} />
        </div>
      </section>

      {/* Stats Section Skeleton */}
      <section className="glass-card rounded-xl p-6 lg:p-8 mx-4 max-w-6xl lg:mx-auto">
        <Skeleton className="h-8 w-48 mx-auto mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-dark rounded-lg p-4 lg:p-6 text-center space-y-2">
              <Skeleton className="h-8 w-16 mx-auto" />
              <Skeleton className="h-3 w-20 mx-auto" />
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section Skeleton */}
      <section className="glass-card rounded-xl p-6 lg:p-8 mx-4 max-w-4xl lg:mx-auto">
        <div className="text-center space-y-4">
          <Skeleton className="h-8 w-64 mx-auto" />
          <SkeletonText lines={2} className="max-w-md mx-auto" />
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <SkeletonButton className="h-10 w-32" />
            <SkeletonButton className="h-10 w-32" />
          </div>
        </div>
      </section>
    </div>
  )
} 