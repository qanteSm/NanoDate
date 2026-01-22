/**
 * NanoDate Shared Constants
 * Centralized constants for tree-shakeable imports
 * 
 * Each export is individually tree-shakeable.
 * Unused constants will be removed from the bundle.
 */

// ============================================
// MILLISECOND CONSTANTS
// ============================================

export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60000;
export const MS_PER_HOUR = 3600000;
export const MS_PER_DAY = 86400000;
export const MS_PER_WEEK = 604800000;
export const MS_PER_MONTH = 2629746000; // Average month (30.44 days)
export const MS_PER_YEAR = 31556952000; // Average year (365.25 days)

// ============================================
// UNIT NORMALIZATION
// ============================================

/**
 * Unit abbreviations map - frozen for performance
 */
export const UNIT_MAP = Object.freeze({
    y: 'year', year: 'year', years: 'year',
    Q: 'quarter', quarter: 'quarter', quarters: 'quarter',
    M: 'month', month: 'month', months: 'month',
    w: 'week', week: 'week', weeks: 'week',
    isoWeek: 'isoWeek', isoWeeks: 'isoWeek',
    d: 'day', day: 'day', days: 'day',
    h: 'hour', hour: 'hour', hours: 'hour',
    m: 'minute', minute: 'minute', minutes: 'minute',
    s: 'second', second: 'second', seconds: 'second',
    ms: 'millisecond', millisecond: 'millisecond', milliseconds: 'millisecond'
});

/**
 * Normalize unit string - with early return for common cases
 * @param {string} unit - Unit string to normalize
 * @returns {string} Normalized unit
 */
export const normalizeUnit = (unit) => {
    // Fast path for most common units
    if (unit === 'day' || unit === 'days' || unit === 'd') return 'day';
    if (unit === 'month' || unit === 'months' || unit === 'M') return 'month';
    if (unit === 'year' || unit === 'years' || unit === 'y') return 'year';
    return UNIT_MAP[unit] || unit;
};

// ============================================
// DATE UTILITIES
// ============================================

/**
 * Days in each month (non-leap year) - lookup table
 */
export const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Fast leap year check using bitwise operations
 * @param {number} year - Year to check
 * @returns {boolean} True if leap year
 */
export const isLeapYear = (year) => (year & 3) === 0 && ((year % 100) !== 0 || (year % 400) === 0);

/**
 * Get days in a specific month
 * @param {number} year - Year
 * @param {number} month - Month (0-indexed)
 * @returns {number} Number of days in month
 */
export const getDaysInMonth = (year, month) => {
    if (month === 1) return isLeapYear(year) ? 29 : 28;
    return DAYS_IN_MONTH[month];
};

/**
 * Cumulative days for day-of-year calculation
 */
export const CUMULATIVE_DAYS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
