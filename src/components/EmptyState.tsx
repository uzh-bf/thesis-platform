import React from 'react'

interface EmptyStateProps {
  title: string
  description: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
}) => {
  return (
    <div className="flex min-h-[28rem] flex-col items-center justify-center p-8 text-center">
      <div className="mb-5 h-16 w-16 text-[#99A9DB]">
        <svg
          className="h-full w-full"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V7a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <h3 className="mb-2 text-lg font-semibold text-[#121212]">{title}</h3>
      <p className="max-w-sm text-sm leading-6 text-[#4C4C4C]">{description}</p>
    </div>
  )
}

export default EmptyState
