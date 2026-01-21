/**
 * NanoDate Utilities Module
 * Comparison and utility functions
 */

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
 * Check if date is valid
 */
export const isValid = (ctx) => {
    return ctx._d instanceof Date && !isNaN(ctx._d.getTime());
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
    const { nano } = require('./index.js');
    return nano(new Date(minTime));
};

/**
 * Max of multiple dates
 */
export const max = (...dates) => {
    const timestamps = dates.map(d => toDate(d).getTime());
    const maxTime = Math.max(...timestamps);
    const { nano } = require('./index.js');
    return nano(new Date(maxTime));
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
    max
};
