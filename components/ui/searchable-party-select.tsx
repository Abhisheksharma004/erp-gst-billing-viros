'use client'

import * as React from 'react'
import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronsUpDown, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PartyOption {
  id: string
  name: string
  gstin?: string
}

interface SearchablePartySelectProps {
  value: string
  onValueChange: (value: string) => void
  options: PartyOption[]
  placeholder?: string
  allOptionLabel?: string // e.g. "All Customers" or "All Vendors"
  className?: string
  containerClassName?: string
  disabled?: boolean
}

export function SearchablePartySelect({
  value,
  onValueChange,
  options = [],
  placeholder = 'Select party...',
  allOptionLabel,
  className,
  containerClassName,
  disabled = false,
}: SearchablePartySelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Find currently selected option
  const selectedOption = useMemo(
    () => options.find((opt) => opt.id === value),
    [options, value]
  )

  // Label to display when not actively typing
  const displayLabel = useMemo(() => {
    if (value === 'ALL' && allOptionLabel) {
      return allOptionLabel
    }
    if (selectedOption) {
      return selectedOption.name
    }
    if (value && value !== 'ALL') {
      const match = options.find((o) => o.id === value)
      if (match) return match.name
    }
    return allOptionLabel || placeholder
  }, [value, selectedOption, allOptionLabel, placeholder, options])

  // Filter options based on typed search query (case-insensitive substring match)
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) {
      return options
    }
    const q = searchQuery.toLowerCase().trim()
    return options.filter(
      (opt) =>
        opt.name.toLowerCase().includes(q) ||
        (opt.gstin && opt.gstin.toLowerCase().includes(q))
    )
  }, [options, searchQuery])

  // Determine if "ALL" option should be shown in dropdown
  const showAllOption = useMemo(() => {
    if (!allOptionLabel) return false
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    return (
      allOptionLabel.toLowerCase().includes(q) ||
      'all'.includes(q)
    )
  }, [allOptionLabel, searchQuery])

  const totalItemsCount = (showAllOption ? 1 : 0) + filteredOptions.length

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setIsEditing(false)
        setSearchQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleFocus = () => {
    if (disabled) return
    setIsEditing(true)
    setSearchQuery('') // Clear search query on focus so full list is shown when cursor enters
    setIsOpen(true)
    setHighlightedIndex(0)
  }

  const handleSelect = (val: string) => {
    onValueChange(val)
    setIsOpen(false)
    setIsEditing(false)
    setSearchQuery('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault()
        setIsOpen(true)
        setIsEditing(true)
      }
      return
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
      setIsEditing(false)
      setSearchQuery('')
      inputRef.current?.blur()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev + 1) % Math.max(1, totalItemsCount))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev - 1 + totalItemsCount) % Math.max(1, totalItemsCount))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (showAllOption && highlightedIndex === 0) {
        handleSelect('ALL')
      } else {
        const idx = showAllOption ? highlightedIndex - 1 : highlightedIndex
        if (filteredOptions[idx]) {
          handleSelect(filteredOptions[idx].id)
        }
      }
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', containerClassName || 'w-full')}>
      {/* Input container */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={isEditing ? searchQuery : displayLabel}
          onFocus={handleFocus}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setIsOpen(true)
            setIsEditing(true)
            setHighlightedIndex(0)
          }}
          onKeyDown={handleKeyDown}
          placeholder={allOptionLabel || placeholder}
          autoComplete="off"
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 pr-8 text-xs shadow-sm transition-colors',
            'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            if (disabled) return
            if (isOpen) {
              setIsOpen(false)
              setIsEditing(false)
              setSearchQuery('')
            } else {
              inputRef.current?.focus()
            }
          }}
          className="absolute right-2 text-muted-foreground hover:text-foreground p-0.5"
        >
          {isEditing && searchQuery ? (
            <X
              className="h-3.5 w-3.5 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                setSearchQuery('')
                inputRef.current?.focus()
              }}
            />
          ) : (
            <ChevronsUpDown className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <ul
          className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover py-1 text-xs shadow-md animate-in fade-in-50"
          onMouseDown={(e) => e.preventDefault()} // Prevent blur when clicking items
        >
          {/* "ALL" Option */}
          {showAllOption && (
            <li>
              <button
                type="button"
                onClick={() => handleSelect('ALL')}
                className={cn(
                  'flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground',
                  value === 'ALL' && 'bg-accent/60 font-semibold text-primary',
                  highlightedIndex === 0 && 'bg-accent'
                )}
              >
                <span>{allOptionLabel}</span>
                {value === 'ALL' && <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />}
              </button>
            </li>
          )}

          {/* Filtered Customer/Vendor Options */}
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => {
              const itemHighlightedIdx = showAllOption ? idx + 1 : idx
              const isSelected = value === opt.id
              const isHighlighted = highlightedIndex === itemHighlightedIdx

              return (
                <li key={opt.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(opt.id)}
                    className={cn(
                      'flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground',
                      isSelected && 'bg-accent/60 font-semibold text-primary',
                      isHighlighted && 'bg-accent'
                    )}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="truncate font-medium">{opt.name}</span>
                      {opt.gstin && (
                        <span className="text-[10px] text-muted-foreground font-mono truncate">
                          {opt.gstin}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </button>
                </li>
              )
            })
          ) : !showAllOption ? (
            <li className="px-3 py-4 text-center text-muted-foreground italic">
              No matching records found
            </li>
          ) : null}
        </ul>
      )}
    </div>
  )
}
