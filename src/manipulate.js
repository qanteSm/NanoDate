/**
 * NanoDate Manipulation Module
 * High-performance immutable date manipulation
 * 
 * Optimizations:
 * - Pre-computed millisecond constants
 * - Timestamp arithmetic instead of Date mutations
 * - Frozen lookup objects
 * - Inline calculations
 * - Batch mode for chained operations (avoids Proxy overhead)
 * - Raw mode for direct timestamp manipulation
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

// ============================================
// BATCH OPERATIONS MODE
// ============================================

/**
 * Batch context - holds mutable date during batch operations
 * Avoids creating new Proxy objects for each operation
 */
class BatchContext {
    constructor(date, locale) {
        this._d = new Date(date.getTime());
        this._l = locale;
        this._batch = true;
    }
    
    /**
     * Add time (mutates internal date)
     */
    add(value, unit) {
        const u = normalizeUnit(unit);
        const timestamp = this._d.getTime();
        
        switch (u) {
            case 'millisecond':
                this._d.setTime(timestamp + value);
                break;
            case 'second':
                this._d.setTime(timestamp + value * MS_PER_SECOND);
                break;
            case 'minute':
                this._d.setTime(timestamp + value * MS_PER_MINUTE);
                break;
            case 'hour':
                this._d.setTime(timestamp + value * MS_PER_HOUR);
                break;
            case 'day':
                this._d.setTime(timestamp + value * MS_PER_DAY);
                break;
            case 'week':
                this._d.setTime(timestamp + value * MS_PER_WEEK);
                break;
            case 'year':
                this._d.setFullYear(this._d.getFullYear() + value);
                break;
            case 'month': {
                const targetMonth = this._d.getMonth() + value;
                const dayOfMonth = this._d.getDate();
                this._d.setMonth(targetMonth, 1);
                const maxDays = getDaysInMonth(this._d.getFullYear(), this._d.getMonth());
                this._d.setDate(Math.min(dayOfMonth, maxDays));
                break;
            }
        }
        return this;
    }
    
    /**
     * Subtract time (mutates internal date)
     */
    subtract(value, unit) {
        return this.add(-value, unit);
    }
    
    /**
     * Set to start of unit (mutates internal date)
     */
    startOf(unit) {
        const u = normalizeUnit(unit);
        const d = this._d;
        
        switch (u) {
            case 'year':
                d.setMonth(0, 1);
                d.setHours(0, 0, 0, 0);
                break;
            case 'quarter': {
                const quarterMonth = Math.floor(d.getMonth() / 3) * 3;
                d.setMonth(quarterMonth, 1);
                d.setHours(0, 0, 0, 0);
                break;
            }
            case 'month':
                d.setDate(1);
                d.setHours(0, 0, 0, 0);
                break;
            case 'week': {
                const day = d.getDay();
                d.setDate(d.getDate() - day);
                d.setHours(0, 0, 0, 0);
                break;
            }
            case 'isoWeek': {
                const day = d.getDay();
                const diff = day === 0 ? -6 : 1 - day;
                d.setDate(d.getDate() + diff);
                d.setHours(0, 0, 0, 0);
                break;
            }
            case 'day':
                d.setHours(0, 0, 0, 0);
                break;
            case 'hour':
                d.setMinutes(0, 0, 0);
                break;
            case 'minute':
                d.setSeconds(0, 0);
                break;
            case 'second':
                d.setMilliseconds(0);
                break;
        }
        return this;
    }
    
    /**
     * Set to end of unit (mutates internal date)
     */
    endOf(unit) {
        const u = normalizeUnit(unit);
        const d = this._d;
        
        switch (u) {
            case 'year':
                d.setMonth(11, 31);
                d.setHours(23, 59, 59, 999);
                break;
            case 'quarter': {
                const quarterEndMonth = Math.floor(d.getMonth() / 3) * 3 + 2;
                const lastDay = getDaysInMonth(d.getFullYear(), quarterEndMonth);
                d.setMonth(quarterEndMonth, lastDay);
                d.setHours(23, 59, 59, 999);
                break;
            }
            case 'month': {
                const lastDay = getDaysInMonth(d.getFullYear(), d.getMonth());
                d.setDate(lastDay);
                d.setHours(23, 59, 59, 999);
                break;
            }
            case 'week': {
                const day = d.getDay();
                d.setDate(d.getDate() + (6 - day));
                d.setHours(23, 59, 59, 999);
                break;
            }
            case 'day':
                d.setHours(23, 59, 59, 999);
                break;
            case 'hour':
                d.setMinutes(59, 59, 999);
                break;
            case 'minute':
                d.setSeconds(59, 999);
                break;
            case 'second':
                d.setMilliseconds(999);
                break;
        }
        return this;
    }
    
    /**
     * Set specific unit value (mutates internal date)
     */
    set(unit, value) {
        const u = normalizeUnit(unit);
        const d = this._d;
        
        switch (u) {
            case 'year': d.setFullYear(value); break;
            case 'month': d.setMonth(value); break;
            case 'day': d.setDate(value); break;
            case 'hour': d.setHours(value); break;
            case 'minute': d.setMinutes(value); break;
            case 'second': d.setSeconds(value); break;
            case 'millisecond': d.setMilliseconds(value); break;
        }
        return this;
    }
    
    /**
     * Finalize batch and return NanoDate
     */
    done() {
        return nano(this._d, this._l);
    }
    
    /**
     * Get timestamp without creating NanoDate
     */
    valueOf() {
        return this._d.getTime();
    }
    
    /**
     * Get Date object without creating NanoDate
     */
    toDate() {
        return new Date(this._d.getTime());
    }
}

/**
 * Create batch context for chained operations
 * Up to 10x faster for multiple operations
 * 
 * @param {Object} ctx - NanoDate context
 * @returns {BatchContext} Batch context with chainable methods
 * 
 * @example
 * // Instead of: nano().add(1, 'day').add(2, 'hours').startOf('hour')
 * // Use: nano().batch().add(1, 'day').add(2, 'hours').startOf('hour').done()
 */
export const batch = (ctx) => {
    return new BatchContext(ctx._d, ctx._l);
};

// ============================================
// RAW TIMESTAMP OPERATIONS
// ============================================

/**
 * Raw operations - work directly with timestamps
 * Maximum performance for bulk calculations
 */
export const raw = {
    /**
     * Add milliseconds to timestamp
     */
    addMs: (ts, ms) => ts + ms,
    
    /**
     * Add seconds to timestamp
     */
    addSeconds: (ts, s) => ts + s * MS_PER_SECOND,
    
    /**
     * Add minutes to timestamp
     */
    addMinutes: (ts, m) => ts + m * MS_PER_MINUTE,
    
    /**
     * Add hours to timestamp
     */
    addHours: (ts, h) => ts + h * MS_PER_HOUR,
    
    /**
     * Add days to timestamp
     */
    addDays: (ts, d) => ts + d * MS_PER_DAY,
    
    /**
     * Add weeks to timestamp
     */
    addWeeks: (ts, w) => ts + w * MS_PER_WEEK,
    
    /**
     * Get start of day for timestamp
     * Uses timezone offset for correct local day boundary
     */
    startOfDay: (ts, tzOffset = new Date(ts).getTimezoneOffset() * 60000) => {
        return ts - ((ts - tzOffset) % MS_PER_DAY);
    },
    
    /**
     * Get end of day for timestamp
     */
    endOfDay: (ts, tzOffset = new Date(ts).getTimezoneOffset() * 60000) => {
        return raw.startOfDay(ts, tzOffset) + MS_PER_DAY - 1;
    },
    
    /**
     * Get start of hour for timestamp
     */
    startOfHour: (ts) => ts - (ts % MS_PER_HOUR),
    
    /**
     * Get start of minute for timestamp
     */
    startOfMinute: (ts) => ts - (ts % MS_PER_MINUTE),
    
    /**
     * Diff in days between two timestamps
     */
    diffDays: (ts1, ts2) => ((ts1 - ts2) / MS_PER_DAY) | 0,
    
    /**
     * Diff in hours between two timestamps
     */
    diffHours: (ts1, ts2) => ((ts1 - ts2) / MS_PER_HOUR) | 0,
    
    /**
     * Diff in minutes between two timestamps
     */
    diffMinutes: (ts1, ts2) => ((ts1 - ts2) / MS_PER_MINUTE) | 0
};

/**
 * Unit abbreviations - frozen for performance
 */
const UNIT_MAP = Object.freeze({
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
        case 'quarter': {
            // Q1: 0-2, Q2: 3-5, Q3: 6-8, Q4: 9-11
            const quarterMonth = Math.floor(d.getMonth() / 3) * 3;
            return nano(new Date(d.getFullYear(), quarterMonth, 1, 0, 0, 0, 0), ctx._l);
        }
        case 'month':
            return nano(new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0), ctx._l);
        case 'week': {
            const day = d.getDay();
            const newDate = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day, 0, 0, 0, 0);
            return nano(newDate, ctx._l);
        }
        case 'isoWeek': {
            // ISO week: Pazartesi başlangıç
            const day = d.getDay();
            const diff = day === 0 ? -6 : 1 - day; // Pazartesi'ye git
            const newDate = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff, 0, 0, 0, 0);
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
        case 'quarter': {
            // Q1: Mart 31, Q2: Haziran 30, Q3: Eylül 30, Q4: Aralık 31
            const quarterEndMonth = Math.floor(d.getMonth() / 3) * 3 + 2;
            const lastDay = getDaysInMonth(d.getFullYear(), quarterEndMonth);
            return nano(new Date(d.getFullYear(), quarterEndMonth, lastDay, 23, 59, 59, 999), ctx._l);
        }
        case 'month': {
            // Get last day of month using day 0 of next month
            const lastDay = getDaysInMonth(d.getFullYear(), d.getMonth());
            return nano(new Date(d.getFullYear(), d.getMonth(), lastDay, 23, 59, 59, 999), ctx._l);
        }
        case 'week': {
            const day = d.getDay();
            return nano(new Date(d.getFullYear(), d.getMonth(), d.getDate() + (6 - day), 23, 59, 59, 999), ctx._l);
        }
        case 'isoWeek': {
            // ISO week: Pazar sonu
            const day = d.getDay();
            const diff = day === 0 ? 0 : 7 - day; // Pazar'a git
            return nano(new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff, 23, 59, 59, 999), ctx._l);
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

export default { add, subtract, startOf, endOf, set, batch, raw };
