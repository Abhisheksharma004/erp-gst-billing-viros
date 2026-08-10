'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled app error:', error)
    // Auto recover from stale webpack chunks during development/deployment
    const msg = error?.message || ''
    if (
      msg.includes('Loading chunk') ||
      msg.includes('ChunkLoadError') ||
      error?.name === 'ChunkLoadError'
    ) {
      const lastReload = sessionStorage.getItem('last_chunk_error_reload')
      const now = Date.now()
      if (!lastReload || now - Number(lastReload) > 10000) {
        sessionStorage.setItem('last_chunk_error_reload', String(now))
        window.location.reload()
      }
    }
  }, [error])

  const isChunkError =
    error?.message?.includes('Loading chunk') ||
    error?.message?.includes('ChunkLoadError') ||
    error?.name === 'ChunkLoadError'

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="p-3 bg-red-100 dark:bg-red-950/40 text-red-600 rounded-full mb-4">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-semibold mb-2">
        {isChunkError ? 'App Update Detected' : 'Something went wrong'}
      </h2>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        {isChunkError
          ? 'A newer version of the application or updated page bundle is available. Please reload to continue.'
          : 'An unexpected error occurred. Please try again or contact support if the issue persists.'}
      </p>
      {process.env.NODE_ENV === 'development' && error?.message && (
        <pre className="p-4 bg-muted text-xs text-left rounded-md max-w-lg overflow-x-auto mb-6 text-red-600 font-mono">
          {error.message}
        </pre>
      )}
      <div className="flex items-center gap-3">
        <Button onClick={() => window.location.reload()} variant="default" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Reload Page
        </Button>
        {!isChunkError && (
          <Button onClick={() => reset()} variant="outline">
            Try Again
          </Button>
        )}
      </div>
    </div>
  )
}
