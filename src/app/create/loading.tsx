import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-4 w-80" />
        </div>
        
        <div className="glass-card p-8 rounded-xl space-y-6">
          {/* Form skeleton */}
          <div className="space-y-4">
            <div>
              <Skeleton className="h-5 w-24 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
            
            <div>
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-24 w-full" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Skeleton className="h-5 w-20 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div>
                <Skeleton className="h-5 w-24 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            
            <div>
              <Skeleton className="h-5 w-28 mb-2" />
              <Skeleton className="h-32 w-full rounded-lg" />
            </div>
            
            <div className="flex justify-end space-x-4 pt-4">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}