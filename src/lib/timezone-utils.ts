'use client'

// IANA timezone options with UTC offset labels
export const COMMON_TIMEZONES = [
    { value: 'Asia/Ho_Chi_Minh', label: '(UTC+7) Việt Nam' },
    { value: 'Asia/Bangkok', label: '(UTC+7) Thailand' },
    { value: 'Asia/Singapore', label: '(UTC+8) Singapore' },
    { value: 'Asia/Hong_Kong', label: '(UTC+8) Hong Kong' },
    { value: 'Asia/Shanghai', label: '(UTC+8) China' },
    { value: 'Asia/Tokyo', label: '(UTC+9) Japan' },
    { value: 'Asia/Seoul', label: '(UTC+9) Korea' },
    { value: 'Australia/Sydney', label: '(UTC+10/11) Sydney' },
    { value: 'Europe/London', label: '(UTC+0/1) London' },
    { value: 'Europe/Paris', label: '(UTC+1/2) Paris' },
    { value: 'America/New_York', label: '(UTC-5/-4) New York' },
    { value: 'America/Los_Angeles', label: '(UTC-8/-7) Los Angeles' },
    { value: 'UTC', label: '(UTC+0) UTC' },
]

// Default timezone for new funds
export const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh'

/**
 * Format a UTC date string to display in a specific timezone
 */
export function formatDateInTimezone(
    utcDate: string | Date,
    timezone: string,
    options?: Intl.DateTimeFormatOptions
): string {
    const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate

    const defaultOptions: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timezone,
    }

    return date.toLocaleString('vi-VN', { ...defaultOptions, ...options })
}

/**
 * Convert a local datetime string (from datetime-local input) to UTC Date
 * The input is assumed to be in the fund's timezone
 */
export function localToUTC(localDateTimeStr: string, timezone: string): Date {
    // datetime-local format: "2024-12-08T14:30"
    // We need to interpret this as being in the fund's timezone

    // Create a date formatter that can parse the timezone offset
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    })

    // Parse the local datetime string
    const [datePart, timePart] = localDateTimeStr.split('T')
    const [year, month, day] = datePart.split('-').map(Number)
    const [hour, minute] = timePart.split(':').map(Number)

    // Create date in UTC, then adjust for timezone offset
    // We do this by creating a date and finding the offset
    const tempDate = new Date(Date.UTC(year, month - 1, day, hour, minute))

    // Get the timezone offset for this date in the target timezone
    const parts = formatter.formatToParts(tempDate)
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0'

    // Calculate what the UTC time should be
    // Since we want localDateTimeStr to represent the time in `timezone`,
    // we need to find the offset and adjust

    // Use a different approach: create the date and use getTimezoneOffset equivalent
    const localDate = new Date(`${localDateTimeStr}:00`)

    // Get the offset for the target timezone at this particular datetime
    const tzOffset = getTimezoneOffset(timezone, localDate)

    // Adjust: localDate + localOffset - tzOffset = UTC
    const localOffset = localDate.getTimezoneOffset() * 60 * 1000
    const utcTime = localDate.getTime() + localOffset - tzOffset

    return new Date(utcTime)
}

/**
 * Convert a UTC date to local datetime string (for datetime-local input)
 */
export function utcToLocal(utcDate: string | Date, timezone: string): string {
    const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate

    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    })

    const parts = formatter.formatToParts(date)
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || '00'

    const year = getPart('year')
    const month = getPart('month')
    const day = getPart('day')
    let hour = getPart('hour')
    const minute = getPart('minute')

    // Handle edge case where hour might be "24" in some locales
    if (hour === '24') hour = '00'

    // Format for datetime-local: YYYY-MM-DDTHH:mm
    return `${year}-${month}-${day}T${hour}:${minute}`
}

/**
 * Get timezone offset in milliseconds for a specific timezone at a specific date
 */
function getTimezoneOffset(timezone: string, date: Date): number {
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }))
    return (tzDate.getTime() - utcDate.getTime())
}

/**
 * Get the current datetime in a specific timezone, formatted for datetime-local input
 */
export function getCurrentDatetimeInTimezone(timezone: string): string {
    return utcToLocal(new Date(), timezone)
}
