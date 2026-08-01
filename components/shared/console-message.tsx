'use client'

import type { ReactNode } from 'react'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ConsoleMessageType = 'error' | 'success'

export const CONSOLE_MESSAGE_DURATION_MS = 2500

interface ConsoleMessageProps {
  type: ConsoleMessageType
  title?: ReactNode
  description?: ReactNode
  text?: string
  className?: string
  onClose?: () => void
}

export function ConsoleMessage({
  type,
  title,
  description,
  text,
  className,
  onClose,
}: ConsoleMessageProps) {
  let displayTitle = title
  let displayDescription = description

  if (!displayTitle && text) {
    const parts = text.split(' — ')
    displayTitle = parts[0]
    if (parts.length > 1) {
      displayDescription = parts.slice(1).join(' — ')
    }
  }

  if (!displayTitle && !displayDescription) {
    displayTitle = text || (type === 'error' ? 'Error' : 'Success')
  }

  const isError = type === 'error'

  return (
    <div
      role="alert"
      className={cn(
        'relative flex items-start gap-3 rounded-xl p-3.5 text-sm shadow-lg backdrop-blur-md transition-all duration-200 border-none select-none',
        isError
          ? 'bg-rose-50 text-rose-950 dark:bg-rose-950/90 dark:text-rose-100 shadow-rose-950/10'
          : 'bg-emerald-50 text-emerald-950 dark:bg-emerald-950/90 dark:text-emerald-100 shadow-emerald-950/10',
        className
      )}
    >
      <div
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-lg shrink-0 mt-0.5 shadow-xs',
          isError
            ? 'bg-rose-500 text-white dark:bg-rose-500 dark:text-white'
            : 'bg-emerald-500 text-white dark:bg-emerald-500 dark:text-white'
        )}
      >
        {isError ? (
          <AlertCircle className="h-4 w-4 stroke-[2.5]" />
        ) : (
          <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
        )}
      </div>

      <div className="flex-1 min-w-0 pr-1">
        {displayTitle && (
          <div
            className={cn(
              'font-semibold text-sm leading-tight',
              isError
                ? 'text-rose-950 dark:text-rose-100'
                : 'text-emerald-950 dark:text-emerald-100'
            )}
          >
            {displayTitle}
          </div>
        )}
        {displayDescription && (
          <div
            className={cn(
              'text-xs leading-snug font-normal mt-0.5',
              isError
                ? 'text-rose-800/90 dark:text-rose-200/80'
                : 'text-emerald-800/90 dark:text-emerald-200/80'
            )}
          >
            {displayDescription}
          </div>
        )}
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className={cn(
            'shrink-0 p-1 transition-colors rounded-lg',
            isError
              ? 'text-rose-600 hover:text-rose-950 hover:bg-rose-200/50 dark:text-rose-300 dark:hover:text-white dark:hover:bg-rose-900/50'
              : 'text-emerald-600 hover:text-emerald-950 hover:bg-emerald-200/50 dark:text-emerald-300 dark:hover:text-white dark:hover:bg-emerald-900/50'
          )}
          aria-label="Close message"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

export function formatConsoleMessageText(
  title?: ReactNode,
  description?: ReactNode
): string {
  const parts = [title, description]
    .filter((part) => part !== undefined && part !== null && String(part).trim() !== '')
    .map((part) => String(part))
  return parts.join(' — ')
}
