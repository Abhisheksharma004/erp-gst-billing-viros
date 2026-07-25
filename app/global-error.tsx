'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global layout error:', error)
  }, [error])

  return (
    <html>
      <body className="flex flex-col items-center justify-center min-h-screen p-6 font-sans bg-slate-50 text-slate-900">
        <div className="max-w-md p-8 bg-white rounded-lg shadow-md text-center border">
          <h2 className="text-xl font-bold text-red-600 mb-2">Application Error</h2>
          <p className="text-sm text-slate-600 mb-6">
            A critical server error occurred. Please refresh or try again.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 bg-blue-600 text-white font-medium text-sm rounded-md hover:bg-blue-700 transition"
          >
            Refresh Page
          </button>
        </div>
      </body>
    </html>
  )
}
