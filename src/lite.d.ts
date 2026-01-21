/**
 * NanoDate Lite - Minimal TypeScript Definitions
 * For < 1KB bundle with core features only
 */

/**
 * Time unit types for manipulation
 */
export type TimeUnit =
    | 'year' | 'years' | 'y'
    | 'month' | 'months' | 'M'
    | 'week' | 'weeks' | 'w'
    | 'day' | 'days' | 'd'
    | 'hour' | 'hours' | 'h'
    | 'minute' | 'minutes' | 'm'
    | 'second' | 'seconds' | 's';

/**
 * Valid date input types
 */
export type DateInput = Date | string | number | NanoDate | null | undefined;

/**
 * NanoDate Lite instance interface
 * Minimal API for < 1KB bundle
 */
export interface NanoDate {
    /**
     * Format date using tokens
     * @example nano().format('YYYY-MM-DD') // "2026-01-21"
     */
    format(format?: string): string;

    /**
     * Add time (immutable)
     * @example nano().add(7, 'days')
     */
    add(value: number, unit: TimeUnit): NanoDate;

    /**
     * Subtract time (immutable)
     * @example nano().subtract(1, 'month')
     */
    subtract(value: number, unit: TimeUnit): NanoDate;

    // Getters
    year(): number;
    month(): number;
    date(): number;
    day(): number;
    hour(): number;
    minute(): number;
    second(): number;

    // Conversion
    valueOf(): number;
    toISOString(): string;
    toDate(): Date;
    isValid(): boolean;
    toString(): string;
}

/**
 * Create a NanoDate Lite instance
 */
export function nano(input?: DateInput, locale?: string): NanoDate;

export default nano;
