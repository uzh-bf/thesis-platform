import React from 'react'

export const LoadingSkeleton = () => {
  return (
    <div className="grid flex-1 grid-cols-1 gap-2 m-4 md:grid-cols-2 animate-pulse">
      {/* Left column skeleton */}
      <div className="flex-initial pb-4 space-y-4 md:flex-1">
        <div className="p-4 bg-gray-100 rounded-lg">
          <div className="h-8 mb-4 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-full h-16 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right column skeleton */}
      <div className="p-4 mb-4 border shadow rounded-lg">
        <div className="h-8 mb-6 bg-gray-200 rounded w-1/4"></div>
        <div className="space-y-4">
          <div className="h-24 bg-gray-100 rounded"></div>
          <div className="h-32 bg-gray-100 rounded"></div>
        </div>
      </div>
    </div>
  )
}

export default LoadingSkeleton
