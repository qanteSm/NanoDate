/**
 * NanoDate Utilities Module
 * Comparison and utility functions
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
 * Unit abbreviations
 */
const UNIT_MAP = {
    y: 'year', year: 'year', years: 'year',
    M: 'month', month: 'month', months: 'month',
    w: 'week', week: 'week', weeks: 'week',
    d: 'day', day: 'day', days: 'day',
    h: 'hour', hour: 'hour', hours: 'hour',
    m: 'minute', minute: 'minute', minutes: 'minute',
    s: 'second', second: 'second', seconds: 'second',
    ms: 'millisecond', millisecond: 'millisecond', milliseconds: 'millisecond'
};

/**
 * Milliseconds per unit
 */
const MS = {
    millisecond: 1,
    second: 1000,
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000
};

const normalizeUnit = (unit) => UNIT_MAP[unit] || unit;

/**
 * Get the Date object from input (NanoDate or Date or string)
 */
const toDate = (input) => {
    if (!input) return new Date();
    if (input._d) return input._d;
    if (input instanceof Date) return input;
    return new Date(input);
};

/**
 * Calculate difference between two dates
 * 
 * @param {Object} ctx - NanoDate context
 * @param {Object|Date|string} other - Date to compare with
 * @param {string} [unit='millisecond'] - Unit for result
 * @param {boolean} [precise=false] - If true, return float; if false, return integer
 * @returns {number} Difference in specified unit
 * 
 * @example
 * diff(ctx, '2026-01-14', 'days')     // 7
 * diff(ctx, '2026-02-21', 'months')   // 1
 */
export const diff = (ctx, other, unit = 'millisecond', precise = false) => {
    const otherDate = toDate(other);
    const diffMs = ctx._d.getTime() - otherDate.getTime();
    const u = normalizeUnit(unit);

    let result;

    switch (u) {
        case 'year':
            result = monthDiff(ctx._d, otherDate) / 12;
            break;
        case 'month':
            result = monthDiff(ctx._d, otherDate);
            break;
        case 'week':
        case 'day':
        case 'hour':
        case 'minute':
        case 'second':
        case 'millisecond':
            result = diffMs / MS[u];
            break;
        default:
            result = diffMs;
    }

    return precise ? result : Math.trunc(result);
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
 * 
 * @param {Object} ctx - NanoDate context
 * @param {Object|Date|string} other - Date to compare with
 * @param {string} [unit] - Granularity (optional)
 * @returns {boolean}
 */
export const isBefore = (ctx, other, unit) => {
    const otherDate = toDate(other);

    if (!unit) {
        return ctx._d.getTime() < otherDate.getTime();
    }

    // Truncate both dates to unit level
    return truncateToUnit(ctx._d, unit) < truncateToUnit(otherDate, unit);
};

/**
 * Check if date is after another date
 */
export const isAfter = (ctx, other, unit) => {
    const otherDate = toDate(other);

    if (!unit) {
        return ctx._d.getTime() > otherDate.getTime();
    }

    return truncateToUnit(ctx._d, unit) > truncateToUnit(otherDate, unit);
};

/**
 * Check if date is same as another date
 */
export const isSame = (ctx, other, unit) => {
    const otherDate = toDate(other);

    if (!unit) {
        return ctx._d.getTime() === otherDate.getTime();
    }

    return truncateToUnit(ctx._d, unit) === truncateToUnit(otherDate, unit);
};

/**
 * Check if date is same or before another date
 */
export const isSameOrBefore = (ctx, other, unit) => {
    return isSame(ctx, other, unit) || isBefore(ctx, other, unit);
};

/**
 * Check if date is same or after another date
 */
export const isSameOrAfter = (ctx, other, unit) => {
    return isSame(ctx, other, unit) || isAfter(ctx, other, unit);
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
 */
const truncateToUnit = (date, unit) => {
    const d = new Date(date);
    const u = normalizeUnit(unit);

    switch (u) {
        case 'year':
            return d.getFullYear();
        case 'month':
            return d.getFullYear() * 12 + d.getMonth();
        case 'day':
            d.setHours(0, 0, 0, 0);
            return d.getTime();
        case 'hour':
            d.setMinutes(0, 0, 0);
            return d.getTime();
        case 'minute':
            d.setSeconds(0, 0);
            return d.getTime();
        case 'second':
            d.setMilliseconds(0);
            return d.getTime();
        default:
            return d.getTime();
    }
};

/**
 * Check if a date is calendrically valid
 * Validates that the date actually exists (e.g., Feb 30 is invalid)
 * 
 * @param {number} year - Full year
 * @param {number} month - Month (1-12)
 * @param {number} day - Day of month
 * @returns {boolean} True if date is valid
 */
const isCalendarValid = (year, month, day) => {
    // Check basic ranges
    if (month < 1 || month > 12 || day < 1) return false;
    
    // Days in each month (non-leap year)
    const daysInMonths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    
    // Check leap year for February
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    const maxDay = month === 2 && isLeap ? 29 : daysInMonths[month - 1];
    
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
 */
export const isLeapYear = (ctx) => {
    const year = ctx._d.getFullYear();
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
};

/**
 * Get days in month
 */
export const daysInMonth = (ctx) => {
    return new Date(ctx._d.getFullYear(), ctx._d.getMonth() + 1, 0).getDate();
};

/**
 * Get day of year (1-365/366)
 */
export const dayOfYear = (ctx) => {
    const start = new Date(ctx._d.getFullYear(), 0, 0);
    const diffMs = ctx._d - start;
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.floor(diffMs / oneDay);
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
 * Check if a date is a business day (Mon-Fri, not a holiday)
 * 
 * @param {Object} ctx - NanoDate context
 * @param {Array<Date|string>} [holidays=[]] - Array of holiday dates
 * @returns {boolean} True if business day
 * 
 * @example
 * isBusinessDay(ctx)                    // Check if weekday
 * isBusinessDay(ctx, ['2026-01-01'])   // Exclude holidays
 */
export const isBusinessDay = (ctx, holidays = []) => {
    const dayOfWeek = ctx._d.getDay();
    
    // Weekend check (0 = Sunday, 6 = Saturday)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return false;
    }
    
    // Holiday check
    if (holidays.length > 0) {
        const dateStr = ctx._d.toISOString().split('T')[0];
        const holidaySet = new Set(
            holidays.map(h => {
                const d = h instanceof Date ? h : new Date(h);
                return d.toISOString().split('T')[0];
            })
        );
        return !holidaySet.has(dateStr);
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
    // Build holiday set for fast lookup
    const holidaySet = new Set(
        holidays.map(h => {
            const d = h instanceof Date ? h : new Date(h);
            return d.toISOString().split('T')[0];
        })
    );
    
    const result = new Date(ctx._d);
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
        const dateStr = result.toISOString().split('T')[0];
        if (holidaySet.has(dateStr)) {
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
    
    // Build holiday set for fast lookup
    const holidaySet = new Set(
        holidays.map(h => {
            const d = h instanceof Date ? h : new Date(h);
            return d.toISOString().split('T')[0];
        })
    );
    
    let count = 0;
    const current = new Date(start);
    
    while (current < end) {
        current.setDate(current.getDate() + 1);
        const dayOfWeek = current.getDay();
        
        // Skip weekends
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            continue;
        }
        
        // Skip holidays
        const dateStr = current.toISOString().split('T')[0];
        if (holidaySet.has(dateStr)) {
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
