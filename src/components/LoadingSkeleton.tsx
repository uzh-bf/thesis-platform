import React from 'react'

export const LoadingSkeleton = () => {
  return (
    <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 animate-pulse">
      {/* Left column skeleton */}
      <div className="flex-initial space-y-4 pb-4 md:flex-1">
        <div className="rounded-lg border border-[#E9E9E9] bg-white p-6">
          <div className="mb-4 h-8 w-1/3 rounded bg-[#E9E9E9]"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-24 w-full rounded-lg bg-[#F5F5FB]"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right column skeleton */}
      <div className="mb-4 rounded-lg border border-[#E9E9E9] bg-white p-6">
        <div className="mb-6 h-8 w-1/4 rounded bg-[#E9E9E9]"></div>
        <div className="space-y-4">
          <div className="h-24 rounded bg-[#F5F5FB]"></div>
          <div className="h-32 rounded bg-[#F5F5FB]"></div>
        </div>
      </div>
    </div>
  )
}

export default LoadingSkeleton
