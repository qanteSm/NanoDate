/**
 * NanoDate - World's smallest date library
 * TypeScript Definitions
 * 
 * @license MIT
 * @author Muhammet Ali Büyük
 */

/**
 * Time unit types for manipulation and comparison
 */
export type TimeUnit =
    | 'year' | 'years' | 'y'
    | 'month' | 'months' | 'M'
    | 'week' | 'weeks' | 'w'
    | 'day' | 'days' | 'd'
    | 'hour' | 'hours' | 'h'
    | 'minute' | 'minutes' | 'm'
    | 'second' | 'seconds' | 's'
    | 'millisecond' | 'milliseconds' | 'ms';

/**
 * Preset format types
 */
export type PresetFormat = 'short' | 'medium' | 'long' | 'full';

/**
 * Format string or preset
 * Common tokens: YYYY, YY, MMMM, MMM, MM, M, DD, D, Do, dddd, ddd, dd, HH, H, hh, h, mm, m, ss, s, A, a, Z, ZZ
 */
export type FormatInput = PresetFormat | `${PresetFormat}-time` | string;

/**
 * Valid date input types
 */
export type DateInput = Date | string | number | NanoDate | null | undefined;

/**
 * Inclusivity for isBetween
 */
export type Inclusivity = '()' | '(]' | '[)' | '[]';

/**
 * NanoDate instance interface
 * Represents an immutable date object with fluent API
 */
export interface NanoDate {
    // ============================================
    // FORMATTING
    // ============================================

    /**
     * Format date using tokens or presets
     * @param format - Format string or preset ('short', 'medium', 'long', 'full')
     * @returns Formatted date string
     * 
     * @example
     * nano().format('YYYY-MM-DD')           // "2026-01-21"
     * nano('2026-01-21', 'tr').format('dddd, MMMM Do YYYY')  // "Çarşamba, Ocak 21. 2026"
     * nano().format('short')                // "1/21/26" (locale-dependent)
     * nano().format('full-time')            // Full date with time
     */
    format(format?: FormatInput): string;

    // ============================================
    // RELATIVE TIME
    // ============================================

    /**
     * Get relative time from now
     * @param withoutSuffix - If true, returns "3 days" instead of "3 days ago"
     * @returns Relative time string (e.g., "3 days ago", "in 2 hours")
     * 
     * @example
     * nano('2026-01-20').fromNow()      // "1 day ago"
     * nano('2026-01-28').fromNow()      // "in 7 days"
     * nano('2026-01-20', 'tr').fromNow() // "1 gün önce"
     */
    fromNow(withoutSuffix?: boolean): string;

    /**
     * Get relative time to now
     */
    toNow(withoutSuffix?: boolean): string;

    // ============================================
    // MANIPULATION (Immutable)
    // ============================================

    /**
     * Add time to date (returns new NanoDate)
     * @param value - Amount to add
     * @param unit - Time unit
     * @returns New NanoDate instance
     * 
     * @example
     * nano().add(7, 'days')        // 7 days later
     * nano().add(1, 'month')       // 1 month later
     * nano().add(2, 'hours')       // 2 hours later
     */
    add(value: number, unit: TimeUnit): NanoDate;

    /**
     * Subtract time from date (returns new NanoDate)
     * @param value - Amount to subtract
     * @param unit - Time unit
     * @returns New NanoDate instance
     */
    subtract(value: number, unit: TimeUnit): NanoDate;

    /**
     * Set to start of time unit (returns new NanoDate)
     * @param unit - Time unit
     * @returns New NanoDate instance
     * 
     * @example
     * nano().startOf('month')      // First day of month, 00:00:00.000
     * nano().startOf('year')       // January 1st, 00:00:00.000
     * nano().startOf('day')        // Today, 00:00:00.000
     */
    startOf(unit: TimeUnit): NanoDate;

    /**
     * Set to end of time unit (returns new NanoDate)
     * @param unit - Time unit
     * @returns New NanoDate instance
     * 
     * @example
     * nano().endOf('month')        // Last day of month, 23:59:59.999
     * nano().endOf('day')          // Today, 23:59:59.999
     */
    endOf(unit: TimeUnit): NanoDate;

    // ============================================
    // DIFFERENCE
    // ============================================

    /**
     * Calculate difference between two dates
     * @param other - Date to compare with
     * @param unit - Unit for result (default: 'millisecond')
     * @param precise - If true, return float; if false, return integer
     * @returns Difference in specified unit
     * 
     * @example
     * nano().diff('2026-01-14', 'days')     // 7
     * nano().diff('2026-02-21', 'months')   // 1
     */
    diff(other: DateInput, unit?: TimeUnit, precise?: boolean): number;

    // ============================================
    // COMPARISON
    // ============================================

    /**
     * Check if date is before another date
     * @param other - Date to compare with
     * @param unit - Granularity (optional)
     */
    isBefore(other: DateInput, unit?: TimeUnit): boolean;

    /**
     * Check if date is after another date
     */
    isAfter(other: DateInput, unit?: TimeUnit): boolean;

    /**
     * Check if date is same as another date
     */
    isSame(other: DateInput, unit?: TimeUnit): boolean;

    /**
     * Check if date is valid
     */
    isValid(): boolean;

    // ============================================
    // TIMEZONE (Zero-cost)
    // ============================================

    /**
     * Format date in a specific timezone
     * @param timezone - IANA timezone (e.g., 'America/New_York', 'Asia/Tokyo')
     * @param format - Optional format preset
     * @returns Formatted date in timezone
     * 
     * @example
     * nano().tz('America/New_York')        // "1/21/2026, 4:36:33 AM"
     * nano().tz('Asia/Tokyo')              // "2026/1/21 18:36:33"
     * nano().tz('Europe/London', 'full')   // Full format in London time
     */
    tz(timezone: string, format?: PresetFormat | `${PresetFormat}-time`): string;

    /**
     * Get UTC offset in minutes
     * @returns UTC offset in minutes (e.g., 180 for UTC+3)
     */
    utcOffset(): number;

    // ============================================
    // GETTERS
    // ============================================

    /**
     * Get year
     */
    year(): number;

    /**
     * Get month (0-11)
     */
    month(): number;

    /**
     * Get date of month (1-31)
     */
    date(): number;

    /**
     * Get day of week (0-6, Sunday = 0)
     */
    day(): number;

    /**
     * Get hour (0-23)
     */
    hour(): number;

    /**
     * Get minute (0-59)
     */
    minute(): number;

    /**
     * Get second (0-59)
     */
    second(): number;

    /**
     * Get millisecond (0-999)
     */
    millisecond(): number;

    // ============================================
    // CONVERSION
    // ============================================

    /**
     * Get ISO 8601 string
     */
    toISOString(): string;

    /**
     * Get JSON representation
     */
    toJSON(): string;

    /**
     * Get Unix timestamp (seconds)
     */
    unix(): number;

    /**
     * Get timestamp (milliseconds)
     */
    valueOf(): number;

    /**
     * Get native Date object
     */
    toDate(): Date;

    /**
     * Get string representation
     */
    toString(): string;

    // ============================================
    // UTILITY
    // ============================================

    /**
     * Create a clone with optional new locale
     * @param newLocale - New locale (optional)
     * @returns New NanoDate instance
     */
    locale(newLocale: string): NanoDate;

    /**
     * Clone this NanoDate
     * @returns New NanoDate instance
     */
    clone(): NanoDate;
}

/**
 * Create a NanoDate instance
 * 
 * @param input - Date input (Date, string, number, or another NanoDate)
 * @param locale - Locale for formatting (optional, defaults to browser locale)
 * @returns NanoDate instance
 * 
 * @example
 * nano()                        // Current date/time
 * nano('2026-01-21')            // From ISO string
 * nano(1737452400000)           // From Unix timestamp (ms)
 * nano(new Date())              // From Date object
 * nano('2026-01-21', 'tr')      // With Turkish locale
 * nano('2026-01-21', 'ja')      // With Japanese locale
 */
export function nano(input?: DateInput, locale?: string): NanoDate;

/**
 * Create a NanoDate in UTC mode
 * 
 * @param input - Date input
 * @returns NanoDate instance in UTC
 */
export function utc(input?: DateInput): NanoDate;

/**
 * Create NanoDate from Unix timestamp (seconds)
 * 
 * @param timestamp - Unix timestamp in seconds
 * @param locale - Locale (optional)
 * @returns NanoDate instance
 * 
 * @example
 * fromUnix(1737452400)          // From Unix seconds
 */
export function fromUnix(timestamp: number, locale?: string): NanoDate;

/**
 * Check Intl API support in current environment
 * Logs warning if limited ICU support is detected
 * 
 * @returns true if full Intl support is available
 */
export function checkIntlSupport(): boolean;

// Default export
export default nano;
