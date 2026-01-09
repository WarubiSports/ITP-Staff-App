'use client'

import { useState } from 'react'
import { cn, getInitials } from '@/lib/utils'

interface AvatarProps {
  name: string
  src?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const [imgError, setImgError] = useState(false)

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  }

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name}
        className={cn(
          'rounded-full object-cover',
          sizeClasses[size],
          className
        )}
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-full bg-red-100 text-red-700 flex items-center justify-center font-medium',
        sizeClasses[size],
        className
      )}
    >
      {getInitials(name)}
    </div>
  )
}
