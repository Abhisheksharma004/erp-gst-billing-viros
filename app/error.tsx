'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled app error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="p-3 bg-red-100 dark:bg-red-950/40 text-red-600 rounded-full mb-4">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        An unexpected error occurred. Please try again or contact support if the issue persists.
      </p>
      {process.env.NODE_ENV === 'development' && error?.message && (
        <pre className="p-4 bg-muted text-xs text-left rounded-md max-w-lg overflow-x-auto mb-6 text-red-600 font-mono">
          {error.message}
        </pre>
      )}
      <Button onClick={() => reset()} variant="default">
        Try Again
      </Button>
    </div>
  )
}
