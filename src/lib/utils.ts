import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getPlayerAppUrl(playerId?: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_PLAYER_APP_URL || 'https://itp-player-app.vercel.app'
  return playerId ? `${baseUrl}/players/${playerId}` : baseUrl
}

export function getManagementAppUrl(playerId?: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_MANAGEMENT_APP_URL || 'https://itp-pink.vercel.app'
  return playerId ? `${baseUrl}/players/${playerId}` : baseUrl
}

export function getDaysUntil(date: string): number {
  const target = new Date(date)
  const today = new Date()
  const diffTime = target.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    alumni: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
    valid: 'bg-green-100 text-green-800',
    expired: 'bg-red-100 text-red-800',
    expiring_soon: 'bg-orange-100 text-orange-800',
    completed: 'bg-green-100 text-green-800',
    in_progress: 'bg-blue-100 text-blue-800',
    scheduled: 'bg-purple-100 text-purple-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
  }
  return colors[priority] || 'bg-gray-100 text-gray-800'
}
