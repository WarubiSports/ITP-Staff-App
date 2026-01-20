import {
  formatDate,
  formatTime,
  getInitials,
  getDaysUntil,
  getStatusColor,
  getPriorityColor,
  getErrorMessage,
} from '@/lib/utils'

describe('formatDate', () => {
  it('formats date string correctly', () => {
    expect(formatDate('2024-03-15')).toBe('Mar 15, 2024')
  })

  it('formats Date object correctly', () => {
    expect(formatDate(new Date('2024-12-25'))).toBe('Dec 25, 2024')
  })
})

describe('formatTime', () => {
  it('formats time-only string', () => {
    expect(formatTime('14:30')).toBe('2:30 PM')
    expect(formatTime('08:00')).toBe('8:00 AM')
    expect(formatTime('00:00')).toBe('12:00 AM')
    expect(formatTime('12:00')).toBe('12:00 PM')
  })

  it('formats ISO timestamp', () => {
    expect(formatTime('2024-01-15T14:30:00')).toBe('2:30 PM')
    expect(formatTime('2024-01-15T08:00:00')).toBe('8:00 AM')
  })

  it('handles time with seconds', () => {
    expect(formatTime('15:10:00')).toBe('3:10 PM')
  })

  it('returns empty string for invalid input', () => {
    expect(formatTime('')).toBe('')
    expect(formatTime('invalid')).toBe('')
  })
})

describe('getInitials', () => {
  it('returns initials for two-word name', () => {
    expect(getInitials('John Doe')).toBe('JD')
  })

  it('returns initials for single name', () => {
    expect(getInitials('Max')).toBe('M')
  })

  it('handles three-word names (takes first two)', () => {
    expect(getInitials('John Michael Doe')).toBe('JM')
  })
})

describe('getDaysUntil', () => {
  it('returns positive number for future date', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 10)
    expect(getDaysUntil(futureDate.toISOString())).toBe(10)
  })

  it('returns negative number for past date', () => {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 5)
    expect(getDaysUntil(pastDate.toISOString())).toBe(-5)
  })
})

describe('getStatusColor', () => {
  it('returns correct color for known statuses', () => {
    expect(getStatusColor('active')).toBe('bg-green-100 text-green-800')
    expect(getStatusColor('pending')).toBe('bg-yellow-100 text-yellow-800')
    expect(getStatusColor('expired')).toBe('bg-red-100 text-red-800')
  })

  it('returns default color for unknown status', () => {
    expect(getStatusColor('unknown')).toBe('bg-gray-100 text-gray-800')
  })
})

describe('getPriorityColor', () => {
  it('returns correct color for priorities', () => {
    expect(getPriorityColor('low')).toBe('bg-gray-100 text-gray-800')
    expect(getPriorityColor('urgent')).toBe('bg-red-100 text-red-800')
  })

  it('returns default for unknown priority', () => {
    expect(getPriorityColor('unknown')).toBe('bg-gray-100 text-gray-800')
  })
})

describe('getErrorMessage', () => {
  it('returns fallback for null/undefined', () => {
    expect(getErrorMessage(null)).toBe('An error occurred')
    expect(getErrorMessage(undefined)).toBe('An error occurred')
    expect(getErrorMessage(null, 'Custom fallback')).toBe('Custom fallback')
  })

  it('extracts message from error object', () => {
    const error = { message: 'Something went wrong' }
    expect(getErrorMessage(error)).toBe('Something went wrong')
  })

  it('includes details when present', () => {
    const error = { message: 'Error', details: 'More info here' }
    expect(getErrorMessage(error)).toBe('Error: More info here')
  })

  it('includes hint when no details', () => {
    const error = { message: 'Error', hint: 'Try this instead' }
    expect(getErrorMessage(error)).toBe('Error (Try this instead)')
  })

  it('handles PostgreSQL duplicate key error', () => {
    const error = { message: 'duplicate key', code: '23505' }
    expect(getErrorMessage(error)).toBe('A record with this value already exists')
  })

  it('handles PostgreSQL foreign key error', () => {
    const error = { message: 'foreign key violation', code: '23503' }
    expect(getErrorMessage(error)).toBe('Cannot delete: this record is referenced by other data')
  })

  it('handles PostgreSQL permission error', () => {
    const error = { message: 'permission denied', code: '42501' }
    expect(getErrorMessage(error)).toBe('Permission denied. Please contact an administrator.')
  })
})
