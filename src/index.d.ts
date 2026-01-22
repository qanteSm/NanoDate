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
     * Now includes calendar validation (e.g., Feb 30 returns false)
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
     * Chainable timezone method - returns NanoDate for chaining
     * @param timezone - IANA timezone
     * @returns New NanoDate instance with timezone context
     * 
     * @example
     * nano().toTz('America/New_York').add(1, 'day').format('YYYY-MM-DD')
     */
    toTz(timezone: string): NanoDate;

    /**
     * Alias for toTz - chainable timezone method
     */
    timezone(timezone: string): NanoDate;

    /**
     * Get UTC offset in minutes
     * @param timezone - Optional specific timezone
     * @returns UTC offset in minutes (e.g., 180 for UTC+3)
     */
    utcOffset(timezone?: string): number;

    // ============================================
    // BUSINESS DAYS
    // ============================================

    /**
     * Check if date is a business day (Mon-Fri, not a holiday)
     * @param holidays - Optional array of holiday dates to exclude
     * @returns True if business day
     * 
     * @example
     * nano().isBusinessDay()               // Check if weekday
     * nano().isBusinessDay(['2026-01-01']) // Exclude holidays
     */
    isBusinessDay(holidays?: Array<Date | string>): boolean;

    /**
     * Add business days (skips weekends and holidays)
     * @param days - Number of business days to add (can be negative)
     * @param holidays - Optional array of holiday dates
     * @returns New NanoDate instance
     * 
     * @example
     * nano().addBusinessDays(5)            // Add 5 business days
     * nano().addBusinessDays(-3)           // Subtract 3 business days
     */
    addBusinessDays(days: number, holidays?: Array<Date | string>): NanoDate;

    /**
     * Calculate business days between two dates
     * @param other - End date
     * @param holidays - Optional array of holiday dates
     * @returns Number of business days
     */
    diffBusinessDays(other: DateInput, holidays?: Array<Date | string>): number;

    /**
     * Get next business day
     * @param holidays - Optional array of holiday dates
     */
    nextBusinessDay(holidays?: Array<Date | string>): NanoDate;

    /**
     * Get previous business day
     * @param holidays - Optional array of holiday dates
     */
    prevBusinessDay(holidays?: Array<Date | string>): NanoDate;

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
    
    // ============================================
    // NEW FEATURES v0.1.6
    // ============================================
    
    /**
     * Convert to array [year, month, date, hour, minute, second, millisecond]
     * @returns Array of date components
     * 
     * @example
     * nano('2026-01-21T14:30:00').toArray()
     * // [2026, 0, 21, 14, 30, 0, 0]
     */
    toArray(): [number, number, number, number, number, number, number];
    
    /**
     * Convert to object with date components
     * @returns Object with year, month, date, hour, minute, second, millisecond
     * 
     * @example
     * nano('2026-01-21T14:30:00').toObject()
     * // { year: 2026, month: 0, date: 21, hour: 14, minute: 30, second: 0, millisecond: 0 }
     */
    toObject(): {
        year: number;
        month: number;
        date: number;
        hour: number;
        minute: number;
        second: number;
        millisecond: number;
    };
    
    /**
     * Calendar-style formatting (Today, Yesterday, Tomorrow, etc.)
     * Locale-aware calendar strings
     * 
     * @param referenceDate - Reference date for comparison (default: now)
     * @returns Calendar string like "Today at 2:30 PM", "Yesterday at 10:00 AM"
     * 
     * @example
     * nano().calendar()                    // "Today at 2:30 PM"
     * nano().subtract(1, 'day').calendar() // "Yesterday at 2:30 PM"
     * nano().add(1, 'day').calendar()      // "Tomorrow at 2:30 PM"
     * nano('2026-01-20', 'tr').calendar()  // "Dün 14:30"
     */
    calendar(referenceDate?: DateInput): string;
    
    /**
     * Create batch context for chained operations
     * Up to 10x faster for multiple operations by avoiding Proxy overhead
     * 
     * @returns BatchContext with chainable methods
     * 
     * @example
     * // Instead of: nano().add(1, 'day').add(2, 'hours').startOf('hour')
     * // Use:
     * nano().batch()
     *   .add(1, 'day')
     *   .add(2, 'hours')
     *   .startOf('hour')
     *   .done()
     */
    batch(): BatchContext;
}

/**
 * Batch context for high-performance chained operations
 * Mutates internal date to avoid object creation overhead
 */
export interface BatchContext {
    /**
     * Add time (mutates internal date)
     */
    add(value: number, unit: TimeUnit): BatchContext;
    
    /**
     * Subtract time (mutates internal date)
     */
    subtract(value: number, unit: TimeUnit): BatchContext;
    
    /**
     * Set to start of unit (mutates internal date)
     */
    startOf(unit: TimeUnit): BatchContext;
    
    /**
     * Set to end of unit (mutates internal date)
     */
    endOf(unit: TimeUnit): BatchContext;
    
    /**
     * Set specific unit value (mutates internal date)
     */
    set(unit: TimeUnit, value: number): BatchContext;
    
    /**
     * Finalize batch and return NanoDate
     */
    done(): NanoDate;
    
    /**
     * Get timestamp without creating NanoDate
     */
    valueOf(): number;
    
    /**
     * Get Date object without creating NanoDate
     */
    toDate(): Date;
}

/**
 * Raw timestamp operations for maximum performance
 * Use for bulk calculations without NanoDate wrapper
 */
export interface RawOperations {
    /**
     * Add milliseconds to timestamp
     */
    addMs(ts: number, ms: number): number;
    
    /**
     * Add seconds to timestamp
     */
    addSeconds(ts: number, seconds: number): number;
    
    /**
     * Add minutes to timestamp
     */
    addMinutes(ts: number, minutes: number): number;
    
    /**
     * Add hours to timestamp
     */
    addHours(ts: number, hours: number): number;
    
    /**
     * Add days to timestamp
     */
    addDays(ts: number, days: number): number;
    
    /**
     * Add weeks to timestamp
     */
    addWeeks(ts: number, weeks: number): number;
    
    /**
     * Get start of day for timestamp
     * @param ts - Timestamp
     * @param tzOffset - Timezone offset in ms (optional, auto-detected)
     */
    startOfDay(ts: number, tzOffset?: number): number;
    
    /**
     * Get end of day for timestamp
     */
    endOfDay(ts: number, tzOffset?: number): number;
    
    /**
     * Get start of hour for timestamp
     */
    startOfHour(ts: number): number;
    
    /**
     * Get start of minute for timestamp
     */
    startOfMinute(ts: number): number;
    
    /**
     * Diff in days between two timestamps
     */
    diffDays(ts1: number, ts2: number): number;
    
    /**
     * Diff in hours between two timestamps
     */
    diffHours(ts1: number, ts2: number): number;
    
    /**
     * Diff in minutes between two timestamps
     */
    diffMinutes(ts1: number, ts2: number): number;
}

/**
 * NanoDate configuration options
 */
export interface NanoDateConfig {
    /** Enable strict mode globally - throws on invalid dates */
    strict?: boolean;
    /** Default locale for formatting */
    locale?: string;
    /** Default timezone */
    timezone?: string;
}

/**
 * Custom error thrown in strict mode for invalid dates
 */
export class InvalidDateError extends Error {
    name: 'InvalidDateError';
    input: any;
    constructor(input: any);
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

export namespace nano {
    /**
     * Create NanoDate in strict mode - throws on invalid dates
     * @throws {InvalidDateError} If date is invalid
     * 
     * @example
     * nano.strict('2026-02-30')  // throws InvalidDateError
     * nano.strict('2026-01-21')  // works fine
     */
    function strict(input: DateInput, locale?: string): NanoDate;

    /**
     * Configure global NanoDate settings
     * 
     * @example
     * nano.config({ strict: true })  // Enable strict mode globally
     * nano.config({ locale: 'tr' })  // Set default locale
     */
    function config(options: NanoDateConfig): void;

    /**
     * Reset configuration to defaults
     */
    function resetConfig(): void;

    /**
     * Extend NanoDate with a plugin
     * @param name - Method name
     * @param fn - Method implementation
     */
    function extend(name: string, fn: (ctx: any, ...args: any[]) => any): void;
    
    /**
     * Create NanoDate in UTC mode
     * @param input - Date input
     * @returns NanoDate instance in UTC
     */
    function utc(input?: DateInput): NanoDate;
    
    /**
     * Create NanoDate from Unix timestamp (seconds)
     * @param timestamp - Unix timestamp in seconds
     * @param locale - Locale (optional)
     * @returns NanoDate instance
     */
    function fromUnix(timestamp: number, locale?: string): NanoDate;
    
    /**
     * Parse a date string with a specific format
     * 
     * @param dateStr - Date string to parse
     * @param format - Format string
     * @param locale - Locale (optional)
     * @returns NanoDate instance
     * 
     * @example
     * nano.parse('21-01-2026', 'DD-MM-YYYY')              // Jan 21, 2026
     * nano.parse('2026/01/21 14:30', 'YYYY/MM/DD HH:mm')  // Jan 21, 2026 2:30 PM
     * nano.parse('01/21/26', 'MM/DD/YY')                  // Jan 21, 2026
     * nano.parse('3:30 PM', 'h:mm A')                     // Today at 3:30 PM
     */
    function parse(dateStr: string, format: string, locale?: string): NanoDate;
    
    /**
     * Raw timestamp operations for maximum performance
     * Use when doing bulk calculations without NanoDate wrapper
     * 
     * @example
     * const ts = Date.now();
     * nano.raw.addDays(ts, 7)          // Add 7 days to timestamp
     * nano.raw.startOfDay(ts)          // Get start of day timestamp
     * nano.raw.diffDays(ts1, ts2)      // Get day difference
     */
    const raw: RawOperations;
}

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
 * Create NanoDate in strict mode
 * @throws {InvalidDateError} If date is invalid
 */
export function strict(input: DateInput, locale?: string): NanoDate;

/**
 * Configure global NanoDate settings
 */
export function config(options: NanoDateConfig): void;

/**
 * Reset configuration to defaults
 */
export function resetConfig(): void;

/**
 * Check Intl API support in current environment
 * Logs warning if limited ICU support is detected
 * 
 * @returns true if full Intl support is available
 */
export function checkIntlSupport(): boolean;

// Default export
export default nano;
