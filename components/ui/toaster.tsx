'use client'

import { useToast } from '@/hooks/use-toast'
import {
  ConsoleMessage,
  formatConsoleMessageText,
} from '@/components/shared/console-message'

export function Toaster() {
  const { toasts, dismiss } = useToast()

  if (!toasts || toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[99999] flex w-full max-w-sm sm:max-w-md flex-col gap-2.5 px-4 sm:px-0">
      {toasts.map(({ id, title, description, variant }) => (
        <ConsoleMessage
          key={id}
          type={variant === 'destructive' ? 'error' : 'success'}
          title={title}
          description={description}
          text={formatConsoleMessageText(title, description)}
          onClose={() => dismiss(id)}
          className="pointer-events-auto shadow-2xl transition-all duration-200 animate-in fade-in slide-in-from-top-3 slide-in-from-right-4"
        />
      ))}
    </div>
  )
}
