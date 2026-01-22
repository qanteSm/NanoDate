/**
 * NanoDate Utilities Module
 * High-performance comparison and utility functions
 * 
 * Optimizations:
 * - Pre-computed constants for common values
 * - Inline calculations where possible
 * - Lookup tables for leap years and days in month
 * - Timestamp arithmetic instead of Date object manipulation
 */

/**
 * Factory placeholder for circular dependency
 */
let nanoFactory;

/**
 * Initialize with nano factory
 */
export const initUtils = (factory) => {
    nanoFactory = factory;
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
 * Milliseconds per unit - pre-computed constants
 */
const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60000;
const MS_PER_HOUR = 3600000;
const MS_PER_DAY = 86400000;
const MS_PER_WEEK = 604800000;

const MS = Object.freeze({
    millisecond: 1,
    second: MS_PER_SECOND,
    minute: MS_PER_MINUTE,
    hour: MS_PER_HOUR,
    day: MS_PER_DAY,
    week: MS_PER_WEEK
});

/**
 * Days in each month (non-leap year) - lookup table
 */
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Fast leap year check - using bitwise operations where possible
 */
const isLeapYearNum = (year) => (year & 3) === 0 && ((year % 100) !== 0 || (year % 400) === 0);

const normalizeUnit = (unit) => UNIT_MAP[unit] || unit;

/**
 * Get the Date object from input (NanoDate or Date or string)
 * Optimized with early returns and getTime() for fast cloning
 */
const toDate = (input) => {
    if (!input) return new Date();
    if (input._d) return input._d;
    if (input instanceof Date) return input;
    return new Date(input);
};

/**
 * Get timestamp from input - faster than toDate when only timestamp needed
 */
const toTimestamp = (input) => {
    if (!input) return Date.now();
    if (input._d) return input._d.getTime();
    if (input instanceof Date) return input.getTime();
    if (typeof input === 'number') return input;
    return new Date(input).getTime();
};

/**
 * Calculate difference between two dates
 * Optimized with timestamp arithmetic
 * 
 * @param {Object} ctx - NanoDate context
 * @param {Object|Date|string} other - Date to compare with
 * @param {string} [unit='millisecond'] - Unit for result
 * @param {boolean} [precise=false] - If true, return float; if false, return integer
 * @returns {number} Difference in specified unit
 */
export const diff = (ctx, other, unit = 'millisecond', precise = false) => {
    const thisTime = ctx._d.getTime();
    const otherTime = toTimestamp(other);
    const diffMs = thisTime - otherTime;
    const u = normalizeUnit(unit);

    let result;

    switch (u) {
        case 'year':
            result = monthDiff(ctx._d, toDate(other)) / 12;
            break;
        case 'month':
            result = monthDiff(ctx._d, toDate(other));
            break;
        case 'week':
            result = diffMs / MS_PER_WEEK;
            break;
        case 'day':
            result = diffMs / MS_PER_DAY;
            break;
        case 'hour':
            result = diffMs / MS_PER_HOUR;
            break;
        case 'minute':
            result = diffMs / MS_PER_MINUTE;
            break;
        case 'second':
            result = diffMs / MS_PER_SECOND;
            break;
        case 'millisecond':
        default:
            result = diffMs;
    }

    return precise ? result : (result | 0);  // Bitwise OR is faster than Math.trunc for integers
};

/**
 * Calculate month difference (helper)
 */
const monthDiff = (a, b) => {
    const yearDiff = a.getFullYear() - b.getFullYear();
    const monthDiff = a.getMonth() - b.getMonth();
    const dayDiff = a.getDate() - b.getDate();

    let months = yearDiff * 12 + monthDiff;

    // Adjust for partial months
    if (dayDiff < 0) {
        months -= 1;
    }

    return months;
};

/**
 * Check if date is before another date
 * Optimized with timestamp comparison
 */
export const isBefore = (ctx, other, unit) => {
    if (!unit) {
        return ctx._d.getTime() < toTimestamp(other);
    }
    return truncateToUnit(ctx._d, unit) < truncateToUnit(toDate(other), unit);
};

/**
 * Check if date is after another date
 * Optimized with timestamp comparison
 */
export const isAfter = (ctx, other, unit) => {
    if (!unit) {
        return ctx._d.getTime() > toTimestamp(other);
    }
    return truncateToUnit(ctx._d, unit) > truncateToUnit(toDate(other), unit);
};

/**
 * Check if date is same as another date
 * Optimized with timestamp comparison
 */
export const isSame = (ctx, other, unit) => {
    if (!unit) {
        return ctx._d.getTime() === toTimestamp(other);
    }
    return truncateToUnit(ctx._d, unit) === truncateToUnit(toDate(other), unit);
};

/**
 * Check if date is same or before another date
 * Optimized: single comparison instead of calling two functions
 */
export const isSameOrBefore = (ctx, other, unit) => {
    if (!unit) {
        return ctx._d.getTime() <= toTimestamp(other);
    }
    return truncateToUnit(ctx._d, unit) <= truncateToUnit(toDate(other), unit);
};

/**
 * Check if date is same or after another date
 * Optimized: single comparison instead of calling two functions
 */
export const isSameOrAfter = (ctx, other, unit) => {
    if (!unit) {
        return ctx._d.getTime() >= toTimestamp(other);
    }
    return truncateToUnit(ctx._d, unit) >= truncateToUnit(toDate(other), unit);
};

/**
 * Check if date is between two dates
 */
export const isBetween = (ctx, start, end, unit, inclusivity = '()') => {
    const startDate = toDate(start);
    const endDate = toDate(end);
    const selfTime = unit ? truncateToUnit(ctx._d, unit) : ctx._d.getTime();
    const startTime = unit ? truncateToUnit(startDate, unit) : startDate.getTime();
    const endTime = unit ? truncateToUnit(endDate, unit) : endDate.getTime();

    const startCheck = inclusivity[0] === '[' ? selfTime >= startTime : selfTime > startTime;
    const endCheck = inclusivity[1] === ']' ? selfTime <= endTime : selfTime < endTime;

    return startCheck && endCheck;
};

/**
 * Truncate date to unit level for comparison
 * Optimized with early numeric returns for year/month
 */
const truncateToUnit = (date, unit) => {
    const u = normalizeUnit(unit);

    switch (u) {
        case 'year':
            return date.getFullYear();
        case 'month':
            return date.getFullYear() * 12 + date.getMonth();
        case 'day': {
            // Use timestamp arithmetic instead of creating new Date
            const ts = date.getTime();
            const offset = date.getTimezoneOffset() * MS_PER_MINUTE;
            return ((ts - offset) / MS_PER_DAY) | 0;
        }
        case 'hour':
            return ((date.getTime() / MS_PER_HOUR) | 0);
        case 'minute':
            return ((date.getTime() / MS_PER_MINUTE) | 0);
        case 'second':
            return ((date.getTime() / MS_PER_SECOND) | 0);
        default:
            return date.getTime();
    }
};

/**
 * Check if a date is calendrically valid
 * Uses lookup table for days in month
 */
const isCalendarValid = (year, month, day) => {
    if (month < 1 || month > 12 || day < 1) return false;
    const maxDay = month === 2 && isLeapYearNum(year) ? 29 : DAYS_IN_MONTH[month - 1];
    return day <= maxDay;
};

/**
 * Parse date string and extract components for validation
 * @param {string} str - Date string
 * @returns {Object|null} Parsed components or null
 */
const parseDateString = (str) => {
    if (typeof str !== 'string') return null;
    
    // ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        return {
            year: parseInt(isoMatch[1], 10),
            month: parseInt(isoMatch[2], 10),
            day: parseInt(isoMatch[3], 10)
        };
    }
    
    // Slash format: MM/DD/YYYY or DD/MM/YYYY (assume MM/DD/YYYY)
    const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
        return {
            year: parseInt(slashMatch[3], 10),
            month: parseInt(slashMatch[1], 10),
            day: parseInt(slashMatch[2], 10)
        };
    }
    
    return null;
};

/**
 * Check if date is valid
 * Performs both JavaScript Date validity and calendar validity checks
 * 
 * @param {Object} ctx - NanoDate context
 * @returns {boolean} True if date is valid
 */
export const isValid = (ctx) => {
    // First check: JavaScript Date must be valid
    if (!(ctx._d instanceof Date) || isNaN(ctx._d.getTime())) {
        return false;
    }
    
    // If original input was a string, validate against calendar
    if (ctx._input !== undefined && typeof ctx._input === 'string') {
        const parsed = parseDateString(ctx._input);
        if (parsed) {
            // Check if the parsed date matches what Date created
            // This catches cases like Feb 30 which JS converts to Mar 2
            const d = ctx._d;
            const matchesInput = 
                d.getFullYear() === parsed.year &&
                (d.getMonth() + 1) === parsed.month &&
                d.getDate() === parsed.day;
            
            if (!matchesInput) {
                return false;
            }
            
            return isCalendarValid(parsed.year, parsed.month, parsed.day);
        }
    }
    
    // For Date objects or timestamps, just check JS Date validity
    return true;
};

/**
 * Check if year is a leap year
 * Uses optimized bitwise check
 */
export const isLeapYear = (ctx) => isLeapYearNum(ctx._d.getFullYear());

/**
 * Get days in month
 * Uses lookup table with leap year adjustment
 */
export const daysInMonth = (ctx) => {
    const month = ctx._d.getMonth();
    if (month === 1) { // February
        return isLeapYearNum(ctx._d.getFullYear()) ? 29 : 28;
    }
    return DAYS_IN_MONTH[month];
};

/**
 * Get day of year (1-365/366)
 * Optimized with pre-computed cumulative days
 */
const CUMULATIVE_DAYS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

export const dayOfYear = (ctx) => {
    const d = ctx._d;
    const month = d.getMonth();
    const day = d.getDate();
    let doy = CUMULATIVE_DAYS[month] + day;
    // Add 1 for leap year if past February
    if (month > 1 && isLeapYearNum(d.getFullYear())) {
        doy++;
    }
    return doy;
};

/**
 * Get week of year (ISO week)
 */
export const week = (ctx) => {
    const d = new Date(Date.UTC(ctx._d.getFullYear(), ctx._d.getMonth(), ctx._d.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

/**
 * Get quarter (1-4)
 */
export const quarter = (ctx) => {
    return Math.floor(ctx._d.getMonth() / 3) + 1;
};

/**
 * Min of multiple dates
 */
export const min = (...dates) => {
    const timestamps = dates.map(d => toDate(d).getTime());
    const minTime = Math.min(...timestamps);
    return nanoFactory(new Date(minTime));
};

/**
 * Max of multiple dates
 */
export const max = (...dates) => {
    const timestamps = dates.map(d => toDate(d).getTime());
    const maxTime = Math.max(...timestamps);
    return nanoFactory(new Date(maxTime));
};

// ============================================
// BUSINESS DAY UTILITIES
// ============================================

/**
 * Get date string in YYYY-MM-DD format (local time)
 */
const toDateString = (d) => {
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return year + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day;
};

/**
 * Build optimized holiday lookup set
 * @param {Array<Date|string>} holidays - Array of holiday dates
 * @returns {Set<string>} Set of date strings in YYYY-MM-DD format
 */
const buildHolidaySet = (holidays) => {
    if (!holidays || holidays.length === 0) return null;
    
    const set = new Set();
    for (let i = 0; i < holidays.length; i++) {
        const h = holidays[i];
        if (typeof h === 'string' && h.length === 10 && h[4] === '-' && h[7] === '-') {
            // Already YYYY-MM-DD format - fast path
            set.add(h);
        } else {
            const d = h instanceof Date ? h : new Date(h);
            set.add(toDateString(d));
        }
    }
    return set;
};

/**
 * Check if a date is a business day (Mon-Fri, not a holiday)
 * 
 * @param {Object} ctx - NanoDate context
 * @param {Array<Date|string>} [holidays=[]] - Array of holiday dates
 * @returns {boolean} True if business day
 */
export const isBusinessDay = (ctx, holidays = []) => {
    const dayOfWeek = ctx._d.getDay();
    
    // Weekend check (0 = Sunday, 6 = Saturday) - most common rejection
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return false;
    }
    
    // Holiday check - only if holidays provided
    if (holidays.length > 0) {
        const holidaySet = buildHolidaySet(holidays);
        if (holidaySet && holidaySet.has(toDateString(ctx._d))) {
            return false;
        }
    }
    
    return true;
};

/**
 * Add business days to a date (skips weekends and holidays)
 * 
 * @param {Object} ctx - NanoDate context
 * @param {number} days - Number of business days to add (can be negative)
 * @param {Array<Date|string>} [holidays=[]] - Array of holiday dates
 * @returns {Proxy} New NanoDate instance
 * 
 * @example
 * addBusinessDays(ctx, 5)               // Add 5 business days
 * addBusinessDays(ctx, -3, holidays)    // Subtract 3 business days
 */
export const addBusinessDays = (ctx, days, holidays = []) => {
    // Build holiday set once
    const holidaySet = buildHolidaySet(holidays);
    
    const result = new Date(ctx._d.getTime());
    let remaining = Math.abs(days);
    const direction = days >= 0 ? 1 : -1;
    
    while (remaining > 0) {
        result.setDate(result.getDate() + direction);
        const dayOfWeek = result.getDay();
        
        // Skip weekends
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            continue;
        }
        
        // Skip holidays
        if (holidaySet && holidaySet.has(toDateString(result))) {
            continue;
        }
        
        remaining--;
    }
    
    return nanoFactory(result, ctx._l);
};

/**
 * Calculate number of business days between two dates
 * 
 * @param {Object} ctx - NanoDate context (start date)
 * @param {Object|Date|string} other - End date
 * @param {Array<Date|string>} [holidays=[]] - Array of holiday dates
 * @returns {number} Number of business days (can be negative)
 * 
 * @example
 * diffBusinessDays(ctx, '2026-01-31')          // Business days until Jan 31
 * diffBusinessDays(ctx, otherDate, holidays)   // With holiday exclusion
 */
export const diffBusinessDays = (ctx, other, holidays = []) => {
    const otherDate = toDate(other);
    const start = new Date(Math.min(ctx._d.getTime(), otherDate.getTime()));
    const end = new Date(Math.max(ctx._d.getTime(), otherDate.getTime()));
    
    // Build holiday set once
    const holidaySet = buildHolidaySet(holidays);
    
    let count = 0;
    const current = new Date(start.getTime());
    
    while (current < end) {
        current.setDate(current.getDate() + 1);
        const dayOfWeek = current.getDay();
        
        // Skip weekends
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            continue;
        }
        
        // Skip holidays
        if (holidaySet && holidaySet.has(toDateString(current))) {
            continue;
        }
        
        count++;
    }
    
    // Return negative if ctx is after other
    return ctx._d.getTime() > otherDate.getTime() ? count : -count;
};

/**
 * Get next business day
 * 
 * @param {Object} ctx - NanoDate context
 * @param {Array<Date|string>} [holidays=[]] - Array of holiday dates
 * @returns {Proxy} New NanoDate instance
 */
export const nextBusinessDay = (ctx, holidays = []) => {
    return addBusinessDays(ctx, 1, holidays);
};

/**
 * Get previous business day
 * 
 * @param {Object} ctx - NanoDate context
 * @param {Array<Date|string>} [holidays=[]] - Array of holiday dates
 * @returns {Proxy} New NanoDate instance
 */
export const prevBusinessDay = (ctx, holidays = []) => {
    return addBusinessDays(ctx, -1, holidays);
};

export default {
    diff,
    isBefore,
    isAfter,
    isSame,
    isSameOrBefore,
    isSameOrAfter,
    isBetween,
    isValid,
    isLeapYear,
    daysInMonth,
    dayOfYear,
    week,
    quarter,
    min,
    max,
    isBusinessDay,
    addBusinessDays,
    diffBusinessDays,
    nextBusinessDay,
    prevBusinessDay
};
