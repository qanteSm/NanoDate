/**
 * NanoDate Manipulation Module
 * High-performance immutable date manipulation
 * 
 * Optimizations:
 * - Pre-computed millisecond constants
 * - Timestamp arithmetic instead of Date mutations
 * - Frozen lookup objects
 * - Inline calculations
 */

/**
 * NanoDate factory placeholder
 */
let nano;

/**
 * Initialize with factory
 * @param {Function} factory - nano factory function
 */
export const init = (factory) => {
    nano = factory;
};

/**
 * Unit abbreviations - frozen for performance
 */
const UNIT_MAP = Object.freeze({
    y: 'year', year: 'year', years: 'year',
    M: 'month', month: 'month', months: 'month',
    w: 'week', week: 'week', weeks: 'week',
    d: 'day', day: 'day', days: 'day',
    h: 'hour', hour: 'hour', hours: 'hour',
    m: 'minute', minute: 'minute', minutes: 'minute',
    s: 'second', second: 'second', seconds: 'second',
    ms: 'millisecond', millisecond: 'millisecond', milliseconds: 'millisecond'
});

/**
 * Pre-computed millisecond constants
 */
const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60000;
const MS_PER_HOUR = 3600000;
const MS_PER_DAY = 86400000;
const MS_PER_WEEK = 604800000;

/**
 * Normalize unit string - with early return for common cases
 */
const normalizeUnit = (unit) => {
    // Fast path for common units
    if (unit === 'day' || unit === 'days' || unit === 'd') return 'day';
    if (unit === 'month' || unit === 'months' || unit === 'M') return 'month';
    if (unit === 'year' || unit === 'years' || unit === 'y') return 'year';
    return UNIT_MAP[unit] || unit;
};

/**
 * Days in each month (non-leap year) - lookup table
 */
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Fast leap year check
 */
const isLeapYear = (year) => (year & 3) === 0 && ((year % 100) !== 0 || (year % 400) === 0);

/**
 * Get days in a specific month
 */
const getDaysInMonth = (year, month) => {
    if (month === 1) return isLeapYear(year) ? 29 : 28;
    return DAYS_IN_MONTH[month];
};

/**
 * Add time to a date (immutable)
 * Optimized with timestamp arithmetic for time units
 * 
 * @param {Object} ctx - NanoDate context
 * @param {number} value - Amount to add
 * @param {string} unit - Unit (year, month, week, day, hour, minute, second, millisecond)
 * @returns {Proxy} New NanoDate instance
 */
export const add = (ctx, value, unit) => {
    const u = normalizeUnit(unit);
    const timestamp = ctx._d.getTime();

    // Fast path: time-based units use pure timestamp arithmetic
    switch (u) {
        case 'millisecond':
            return nano(new Date(timestamp + value), ctx._l);
        case 'second':
            return nano(new Date(timestamp + value * MS_PER_SECOND), ctx._l);
        case 'minute':
            return nano(new Date(timestamp + value * MS_PER_MINUTE), ctx._l);
        case 'hour':
            return nano(new Date(timestamp + value * MS_PER_HOUR), ctx._l);
        case 'day':
            return nano(new Date(timestamp + value * MS_PER_DAY), ctx._l);
        case 'week':
            return nano(new Date(timestamp + value * MS_PER_WEEK), ctx._l);
    }

    // Calendar-based units need Date object manipulation
    const d = new Date(timestamp);

    switch (u) {
        case 'year':
            d.setFullYear(d.getFullYear() + value);
            break;
        case 'month': {
            const targetMonth = d.getMonth() + value;
            const dayOfMonth = d.getDate();
            d.setMonth(targetMonth, 1);
            // Clamp to days in target month
            const maxDays = getDaysInMonth(d.getFullYear(), d.getMonth());
            d.setDate(Math.min(dayOfMonth, maxDays));
            break;
        }
    }

    return nano(d, ctx._l);
};

/**
 * Subtract time from a date (immutable)
 * Simply delegates to add with negated value
 */
export const subtract = (ctx, value, unit) => add(ctx, -value, unit);

/**
 * Pre-computed start-of-day offset for common operations
 */
const START_OF_DAY = [0, 0, 0, 0]; // hours, minutes, seconds, ms

/**
 * Set to start of a unit (immutable)
 * Optimized with timestamp arithmetic where possible
 * 
 * @param {Object} ctx - NanoDate context
 * @param {string} unit - Unit (year, month, week, day, hour, minute, second)
 * @returns {Proxy} New NanoDate instance
 */
export const startOf = (ctx, unit) => {
    const u = normalizeUnit(unit);
    const d = ctx._d;
    
    switch (u) {
        case 'year':
            return nano(new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0), ctx._l);
        case 'month':
            return nano(new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0), ctx._l);
        case 'week': {
            const day = d.getDay();
            const newDate = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day, 0, 0, 0, 0);
            return nano(newDate, ctx._l);
        }
        case 'day':
            return nano(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0), ctx._l);
        case 'hour': {
            const ts = d.getTime();
            return nano(new Date(ts - (ts % MS_PER_HOUR)), ctx._l);
        }
        case 'minute': {
            const ts = d.getTime();
            return nano(new Date(ts - (ts % MS_PER_MINUTE)), ctx._l);
        }
        case 'second': {
            const ts = d.getTime();
            return nano(new Date(ts - (ts % MS_PER_SECOND)), ctx._l);
        }
        default:
            return nano(new Date(d.getTime()), ctx._l);
    }
};

/**
 * Set to end of a unit (immutable)
 * Optimized with direct Date construction
 * 
 * @param {Object} ctx - NanoDate context
 * @param {string} unit - Unit
 * @returns {Proxy} New NanoDate instance
 */
export const endOf = (ctx, unit) => {
    const u = normalizeUnit(unit);
    const d = ctx._d;

    switch (u) {
        case 'year':
            return nano(new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999), ctx._l);
        case 'month': {
            // Get last day of month using day 0 of next month
            const lastDay = getDaysInMonth(d.getFullYear(), d.getMonth());
            return nano(new Date(d.getFullYear(), d.getMonth(), lastDay, 23, 59, 59, 999), ctx._l);
        }
        case 'week': {
            const day = d.getDay();
            return nano(new Date(d.getFullYear(), d.getMonth(), d.getDate() + (6 - day), 23, 59, 59, 999), ctx._l);
        }
        case 'day':
            return nano(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999), ctx._l);
        case 'hour': {
            const ts = d.getTime();
            return nano(new Date(ts - (ts % MS_PER_HOUR) + MS_PER_HOUR - 1), ctx._l);
        }
        case 'minute': {
            const ts = d.getTime();
            return nano(new Date(ts - (ts % MS_PER_MINUTE) + MS_PER_MINUTE - 1), ctx._l);
        }
        case 'second': {
            const ts = d.getTime();
            return nano(new Date(ts - (ts % MS_PER_SECOND) + MS_PER_SECOND - 1), ctx._l);
        }
        default:
            return nano(new Date(d.getTime()), ctx._l);
    }
};

/**
 * Set a specific unit value (immutable)
 * Optimized with direct Date construction
 * 
 * @param {Object} ctx - NanoDate context
 * @param {string} unit - Unit to set
 * @param {number} value - New value
 * @returns {Proxy} New NanoDate instance
 */
export const set = (ctx, unit, value) => {
    const d = new Date(ctx._d.getTime());
    const u = normalizeUnit(unit);

    switch (u) {
        case 'year':
            d.setFullYear(value);
            break;
        case 'month':
            d.setMonth(value);
            break;
        case 'day':
            d.setDate(value);
            break;
        case 'hour':
            d.setHours(value);
            break;
        case 'minute':
            d.setMinutes(value);
            break;
        case 'second':
            d.setSeconds(value);
            break;
        case 'millisecond':
            d.setMilliseconds(value);
            break;
    }

    return nano(d, ctx._l);
};

export default { add, subtract, startOf, endOf, set };
