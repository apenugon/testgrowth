import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100)
}

export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date'
  }
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj)
}

export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  return `${Math.floor(diffInSeconds / 86400)}d ago`
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function isContestActive(startAt: Date, endAt: Date): boolean {
  const now = new Date()
  return now >= startAt && now <= endAt
}

export function getContestTimeStatus(startAt: Date | string, endAt: Date | string): 'upcoming' | 'active' | 'ended' {
  const now = new Date()
  const start = typeof startAt === 'string' ? new Date(startAt) : startAt
  const end = typeof endAt === 'string' ? new Date(endAt) : endAt
  
  if (now < start) return 'upcoming'
  if (now > end) return 'ended'
  return 'active'
}

export function getContestStatusBadge(startAt: Date | string, endAt: Date | string): {
  label: string
  variant: 'default' | 'secondary' | 'destructive'
} {
  const status = getContestTimeStatus(startAt, endAt)
  
  switch (status) {
    case 'upcoming':
      return { label: 'Upcoming', variant: 'secondary' }
    case 'active':
      return { label: 'Live', variant: 'default' }
    case 'ended':
      return { label: 'Ended', variant: 'destructive' }
  }
} 