/**
 * NanoDate Manipulation Module
 * Immutable date manipulation methods
 * All operations return new NanoDate instances
 */

import { nano } from './index.js';

/**
 * Unit abbreviations to full names
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

/**
 * Normalize unit string
 */
const normalizeUnit = (unit) => UNIT_MAP[unit] || unit;

/**
 * Add time to a date (immutable)
 * 
 * @param {Object} ctx - NanoDate context
 * @param {number} value - Amount to add
 * @param {string} unit - Unit (year, month, week, day, hour, minute, second, millisecond)
 * @returns {Proxy} New NanoDate instance
 * 
 * @example
 * add(ctx, 7, 'days')      // 7 gün ekle
 * add(ctx, 1, 'month')     // 1 ay ekle
 * add(ctx, -2, 'hours')    // 2 saat çıkar (subtract ile aynı)
 */
export const add = (ctx, value, unit) => {
    const d = new Date(ctx._d);
    const u = normalizeUnit(unit);

    switch (u) {
        case 'year':
            d.setFullYear(d.getFullYear() + value);
            break;
        case 'month':
            // Ay ekleme - edge case: 31 Ocak + 1 ay = 28/29 Şubat
            const targetMonth = d.getMonth() + value;
            const dayOfMonth = d.getDate();
            d.setMonth(targetMonth, 1);
            // Ayın son günü kontrolü
            const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
            d.setDate(Math.min(dayOfMonth, daysInMonth));
            break;
        case 'week':
        case 'day':
        case 'hour':
        case 'minute':
        case 'second':
        case 'millisecond':
            d.setTime(d.getTime() + value * MS[u]);
            break;
        default:
            // Unknown unit, return clone
            break;
    }

    return nano(d, ctx._l);
};

/**
 * Subtract time from a date (immutable)
 * 
 * @param {Object} ctx - NanoDate context
 * @param {number} value - Amount to subtract
 * @param {string} unit - Unit
 * @returns {Proxy} New NanoDate instance
 */
export const subtract = (ctx, value, unit) => add(ctx, -value, unit);

/**
 * Set to start of a unit (immutable)
 * 
 * @param {Object} ctx - NanoDate context
 * @param {string} unit - Unit (year, month, week, day, hour, minute, second)
 * @returns {Proxy} New NanoDate instance
 * 
 * @example
 * startOf(ctx, 'month')    // Ayın ilk günü 00:00:00.000
 * startOf(ctx, 'day')      // Günün başı 00:00:00.000
 * startOf(ctx, 'week')     // Haftanın ilk günü (Pazar veya Pazartesi locale'e bağlı)
 */
export const startOf = (ctx, unit) => {
    const d = new Date(ctx._d);
    const u = normalizeUnit(unit);

    switch (u) {
        case 'year':
            d.setMonth(0, 1);
            d.setHours(0, 0, 0, 0);
            break;
        case 'month':
            d.setDate(1);
            d.setHours(0, 0, 0, 0);
            break;
        case 'week':
            // Haftanın başına git (Pazar = 0)
            const day = d.getDay();
            d.setDate(d.getDate() - day);
            d.setHours(0, 0, 0, 0);
            break;
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

    return nano(d, ctx._l);
};

/**
 * Set to end of a unit (immutable)
 * 
 * @param {Object} ctx - NanoDate context
 * @param {string} unit - Unit
 * @returns {Proxy} New NanoDate instance
 * 
 * @example
 * endOf(ctx, 'month')      // Ayın son günü 23:59:59.999
 * endOf(ctx, 'day')        // Günün sonu 23:59:59.999
 */
export const endOf = (ctx, unit) => {
    const d = new Date(ctx._d);
    const u = normalizeUnit(unit);

    switch (u) {
        case 'year':
            d.setMonth(11, 31);
            d.setHours(23, 59, 59, 999);
            break;
        case 'month':
            // Sonraki ayın ilk günü - 1ms = Bu ayın son günü
            d.setMonth(d.getMonth() + 1, 0);
            d.setHours(23, 59, 59, 999);
            break;
        case 'week':
            // Haftanın sonuna git (Cumartesi = 6)
            const day = d.getDay();
            d.setDate(d.getDate() + (6 - day));
            d.setHours(23, 59, 59, 999);
            break;
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

    return nano(d, ctx._l);
};

/**
 * Set a specific unit value (immutable)
 * 
 * @param {Object} ctx - NanoDate context
 * @param {string} unit - Unit to set
 * @param {number} value - New value
 * @returns {Proxy} New NanoDate instance
 */
export const set = (ctx, unit, value) => {
    const d = new Date(ctx._d);
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
