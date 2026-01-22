/**
 * NanoDate - World's smallest date library
 * Zero-locale-payload, Intl-native, 100% immutable
 * 
 * @license MIT
 * @author Muhammet Ali Büyük
 */

import { format, parse as parseFormat, createLRU } from './format.js';
import { fromNow, toNow } from './relative.js';
import { add, subtract, startOf, endOf, set, init as initManipulate, batch, chain, raw } from './manipulate.js';
import { diff, isBefore, isAfter, isSame, isSameOrBefore, isSameOrAfter, isBetween, isValid, isLeapYear, daysInMonth, dayOfYear, week, quarter, isBusinessDay, addBusinessDays, diffBusinessDays, nextBusinessDay, prevBusinessDay, initUtils } from './utils.js';
import { tz, tzChainable, utcOffset, toTimezone, getTimezone, initTimezone } from './timezone.js';
import { duration, between as durationBetween, Duration } from './duration.js';
import { MS_PER_DAY } from './constants.js';
import { timePrepositions, weekPatterns } from './locales.js';

/**
 * Ultra-fast ISO parser V3.1 - NO REGEX, pure charCodeAt
 * Uses character position indexing for maximum V8 optimization
 * 
 * Supports:
 * - YYYY-MM-DD (10 chars) - most common
 * - YYYY-MM-DDTHH:mm (16 chars)
 * - YYYY-MM-DDTHH:mm:ss (19 chars)
 * - YYYY-MM-DDTHH:mm:ss.SSS (23 chars)
 * - All above with Z suffix (UTC)
 * - All above with ±HH:mm offset
 * 
 * Target: 5M+ ops/sec (vs 1.6M with regex)
 * 
 * @param {string} s - ISO date string
 * @returns {Date|null} Parsed Date or null for fallback
 */
const ultraFastParse = (s) => {
    // Quick length check - minimum is YYYY-MM-DD (10 chars)
    const len = s.length;
    if (len < 10) return null;

    // ===== YEAR (0-3) =====
    // charCodeAt: '0'=48, '9'=57
    const y0 = s.charCodeAt(0) - 48;
    const y1 = s.charCodeAt(1) - 48;
    const y2 = s.charCodeAt(2) - 48;
    const y3 = s.charCodeAt(3) - 48;

    // Validate year digits (0-9)
    if (y0 < 0 || y0 > 9 || y1 < 0 || y1 > 9 || y2 < 0 || y2 > 9 || y3 < 0 || y3 > 9) return null;

    const year = y0 * 1000 + y1 * 100 + y2 * 10 + y3;

    // Check first separator '-' at position 4
    if (s.charCodeAt(4) !== 45) return null;

    // ===== MONTH (5-6) =====
    const m0 = s.charCodeAt(5) - 48;
    const m1 = s.charCodeAt(6) - 48;
    if (m0 < 0 || m0 > 9 || m1 < 0 || m1 > 9) return null;

    const month = m0 * 10 + m1 - 1; // 0-indexed

    // Check separator '-' at position 7
    if (s.charCodeAt(7) !== 45) return null;

    // ===== DAY (8-9) =====
    const d0 = s.charCodeAt(8) - 48;
    const d1 = s.charCodeAt(9) - 48;
    if (d0 < 0 || d0 > 9 || d1 < 0 || d1 > 9) return null;

    const day = d0 * 10 + d1;

    // ===== FAST PATH: YYYY-MM-DD only =====
    if (len === 10) {
        return new Date(year, month, day);
    }

    // Check 'T' separator at position 10
    if (s.charCodeAt(10) !== 84) return null; // 'T' = 84

    // ===== HOUR (11-12) =====
    const h0 = s.charCodeAt(11) - 48;
    const h1 = s.charCodeAt(12) - 48;
    if (h0 < 0 || h0 > 9 || h1 < 0 || h1 > 9) return null;

    const hour = h0 * 10 + h1;

    // Check ':' at position 13
    if (s.charCodeAt(13) !== 58) return null; // ':' = 58

    // ===== MINUTE (14-15) =====
    const mi0 = s.charCodeAt(14) - 48;
    const mi1 = s.charCodeAt(15) - 48;
    if (mi0 < 0 || mi0 > 9 || mi1 < 0 || mi1 > 9) return null;

    const minute = mi0 * 10 + mi1;

    // ===== FAST PATH: YYYY-MM-DDTHH:mm =====
    if (len === 16) {
        return new Date(year, month, day, hour, minute);
    }

    // Check for Z at position 16 (YYYY-MM-DDTHH:mmZ)
    if (len === 17 && s.charCodeAt(16) === 90) { // 'Z' = 90
        return new Date(Date.UTC(year, month, day, hour, minute));
    }

    // Check ':' at position 16 for seconds
    if (s.charCodeAt(16) !== 58) {
        // Could be timezone offset
        return parseWithTimezone(s, year, month, day, hour, minute, 0, 0, 16);
    }

    // ===== SECOND (17-18) =====
    const s0 = s.charCodeAt(17) - 48;
    const s1 = s.charCodeAt(18) - 48;
    if (s0 < 0 || s0 > 9 || s1 < 0 || s1 > 9) return null;

    const second = s0 * 10 + s1;

    // ===== FAST PATH: YYYY-MM-DDTHH:mm:ss =====
    if (len === 19) {
        return new Date(year, month, day, hour, minute, second);
    }

    // Check for Z at position 19
    if (len === 20 && s.charCodeAt(19) === 90) {
        return new Date(Date.UTC(year, month, day, hour, minute, second));
    }

    // Check for '.' at position 19 for milliseconds
    if (s.charCodeAt(19) === 46) { // '.' = 46
        // ===== MILLISECONDS (20-22) =====
        const ms0 = s.charCodeAt(20) - 48;
        const ms1 = len > 21 ? s.charCodeAt(21) - 48 : 0;
        const ms2 = len > 22 ? s.charCodeAt(22) - 48 : 0;

        if (ms0 < 0 || ms0 > 9) return null;
        const ms = ms0 * 100 + (ms1 >= 0 && ms1 <= 9 ? ms1 * 10 : 0) + (ms2 >= 0 && ms2 <= 9 ? ms2 : 0);

        // YYYY-MM-DDTHH:mm:ss.SSS
        if (len === 23) {
            return new Date(year, month, day, hour, minute, second, ms);
        }

        // Check for Z
        if (s.charCodeAt(len - 1) === 90) {
            return new Date(Date.UTC(year, month, day, hour, minute, second, ms));
        }

        // Timezone offset
        return parseWithTimezone(s, year, month, day, hour, minute, second, ms, 23);
    }

    // Timezone offset after seconds
    return parseWithTimezone(s, year, month, day, hour, minute, second, 0, 19);
};

/**
 * Parse timezone offset from string
 * @private
 */
const parseWithTimezone = (s, year, month, day, hour, minute, second, ms, startPos) => {
    const len = s.length;
    if (startPos >= len) return new Date(year, month, day, hour, minute, second, ms);

    const signChar = s.charCodeAt(startPos);

    // '+' = 43, '-' = 45
    if (signChar !== 43 && signChar !== 45) return null;

    const sign = signChar === 43 ? -1 : 1; // + means subtract from UTC

    // Offset hours
    const oh0 = s.charCodeAt(startPos + 1) - 48;
    const oh1 = s.charCodeAt(startPos + 2) - 48;
    if (oh0 < 0 || oh0 > 9 || oh1 < 0 || oh1 > 9) return null;

    const offsetHours = oh0 * 10 + oh1;

    // Offset minutes (optional colon)
    let offsetMinutes = 0;
    let nextPos = startPos + 3;

    if (nextPos < len) {
        if (s.charCodeAt(nextPos) === 58) nextPos++; // Skip optional ':'

        if (nextPos + 1 < len) {
            const om0 = s.charCodeAt(nextPos) - 48;
            const om1 = s.charCodeAt(nextPos + 1) - 48;
            if (om0 >= 0 && om0 <= 9 && om1 >= 0 && om1 <= 9) {
                offsetMinutes = om0 * 10 + om1;
            }
        }
    }

    const timestamp = Date.UTC(year, month, day, hour, minute, second, ms);
    return new Date(timestamp + sign * (offsetHours * 60 + offsetMinutes) * 60000);
};

/**
 * Global configuration
 */
let globalConfig = {
    strict: false,
    locale: null,
    timezone: null
};

/**
 * Custom error for invalid dates in strict mode
 */
export class InvalidDateError extends Error {
    constructor(input) {
        super(`Invalid date: ${input}`);
        this.name = 'InvalidDateError';
        this.input = input;
    }
}

/**
 * Plugin registry for extending NanoDate
 */
const plugins = {};

/**
 * Extend NanoDate with a plugin
 * @param {string} name - Method name
 * @param {Function} fn - Method implementation (ctx, ...args) => result
 */
export const extend = (name, fn) => {
    plugins[name] = fn;
};

/**
 * Method registry - tüm metodlar burada toplanır
 * Proxy handler bu objeye bakarak metodları lazy-bind eder
 */
const methods = {
    format,
    fromNow,
    toNow,
    add,
    subtract,
    startOf,
    endOf,
    set,
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
    tz,
    utcOffset,

    // Chainable timezone method
    toTz: tzChainable,
    timezone: tzChainable,

    // Business day methods
    isBusinessDay,
    addBusinessDays,
    diffBusinessDays,
    nextBusinessDay,
    prevBusinessDay,

    // Batch operations - bypass Proxy overhead
    batch,

    // Fluent chain helper - defers NanoDate creation
    chain,

    // Native Date metodları için pass-through
    toISOString: (ctx) => ctx._d.toISOString(),
    toJSON: (ctx) => ctx._d.toJSON(),
    valueOf: (ctx) => ctx._d.getTime(),
    unix: (ctx) => Math.floor(ctx._d.getTime() / 1000),
    toDate: (ctx) => new Date(ctx._d),

    /**
     * Convert to array [year, month, date, hour, minute, second, millisecond]
     * @param {Object} ctx - NanoDate context
     * @returns {number[]} Array of date components
     */
    toArray: (ctx) => {
        const d = ctx._d;
        return [
            d.getFullYear(),
            d.getMonth(),
            d.getDate(),
            d.getHours(),
            d.getMinutes(),
            d.getSeconds(),
            d.getMilliseconds()
        ];
    },

    /**
     * Convert to object { year, month, date, hour, minute, second, millisecond }
     * @param {Object} ctx - NanoDate context
     * @returns {Object} Object with date components
     */
    toObject: (ctx) => {
        const d = ctx._d;
        return {
            year: d.getFullYear(),
            month: d.getMonth(),
            date: d.getDate(),
            hour: d.getHours(),
            minute: d.getMinutes(),
            second: d.getSeconds(),
            millisecond: d.getMilliseconds()
        };
    },

    /**
     * Calendar-style formatting (Today, Yesterday, Tomorrow, etc.)
     * @param {Object} ctx - NanoDate context
     * @param {Object} [referenceDate] - Reference date (default: now)
     * @returns {string} Calendar string
     */
    calendar: (ctx, referenceDate) => {
        const locale = ctx._l || 'en';

        let cached = calendarStringsCache.get(locale);
        if (!cached) {
            cached = getCalendarStrings(locale);
            calendarStringsCache.set(locale, cached);
        }

        const d = ctx._d;
        const ref = referenceDate ? (referenceDate._d || new Date(referenceDate)) : new Date();

        // Optimized: Calculate timestamps directly without creating multiple Date objects
        const refYear = ref.getFullYear();
        const refMonth = ref.getMonth();
        const refDate = ref.getDate();
        const refDay = ref.getDay();

        // Use Date.UTC-like calculation for day boundaries (in local time)
        const startOfTodayTs = new Date(refYear, refMonth, refDate).getTime();
        const startOfTomorrowTs = startOfTodayTs + MS_PER_DAY;
        const startOfYesterdayTs = startOfTodayTs - MS_PER_DAY;
        const startOfThisWeekTs = startOfTodayTs - refDay * MS_PER_DAY;
        const startOfNextWeekTs = startOfThisWeekTs + 7 * MS_PER_DAY;
        const startOfLastWeekTs = startOfThisWeekTs - 7 * MS_PER_DAY;

        const ts = d.getTime();
        const timeStr = getCalendarTimeFormatter(locale).format(d);

        if (ts >= startOfTodayTs && ts < startOfTomorrowTs) {
            return cached.today.replace('{time}', timeStr);
        }
        if (ts >= startOfTomorrowTs && ts < startOfTomorrowTs + MS_PER_DAY) {
            return cached.tomorrow.replace('{time}', timeStr);
        }
        if (ts >= startOfYesterdayTs && ts < startOfTodayTs) {
            return cached.yesterday.replace('{time}', timeStr);
        }
        if (ts >= startOfThisWeekTs && ts < startOfNextWeekTs) {
            const weekday = getCalendarWeekdayFormatter(locale).format(d);
            return cached.thisWeek.replace('{weekday}', weekday).replace('{time}', timeStr);
        }
        if (ts >= startOfLastWeekTs && ts < startOfThisWeekTs) {
            const weekday = getCalendarWeekdayFormatter(locale).format(d);
            return cached.lastWeek.replace('{weekday}', weekday).replace('{time}', timeStr);
        }
        if (ts >= startOfNextWeekTs && ts < startOfNextWeekTs + 7 * MS_PER_DAY) {
            const weekday = getCalendarWeekdayFormatter(locale).format(d);
            return cached.nextWeek.replace('{weekday}', weekday).replace('{time}', timeStr);
        }

        // Fallback to full date - use cached formatter
        return getCalendarFallbackFormatter(locale).format(d);
    },

    // Getter/Setter'lar - argüman varsa setter, yoksa getter
    year: (ctx, val) => val === undefined ? ctx._d.getFullYear() : set(ctx, 'year', val),
    month: (ctx, val) => val === undefined ? ctx._d.getMonth() : set(ctx, 'month', val),
    date: (ctx, val) => val === undefined ? ctx._d.getDate() : set(ctx, 'day', val),
    day: (ctx) => ctx._d.getDay(), // day of week sadece getter
    hour: (ctx, val) => val === undefined ? ctx._d.getHours() : set(ctx, 'hour', val),
    minute: (ctx, val) => val === undefined ? ctx._d.getMinutes() : set(ctx, 'minute', val),
    second: (ctx, val) => val === undefined ? ctx._d.getSeconds() : set(ctx, 'second', val),
    millisecond: (ctx, val) => val === undefined ? ctx._d.getMilliseconds() : set(ctx, 'millisecond', val),

    // ISO weekday (1=Pazartesi, 7=Pazar)
    isoWeekday: (ctx, val) => {
        if (val === undefined) {
            const day = ctx._d.getDay();
            return day === 0 ? 7 : day; // Pazar=0'ı 7'ye çevir
        }
        // Setter: ISO weekday'e ayarla
        const currentIsoDay = ctx._d.getDay() || 7;
        const diff = val - currentIsoDay;
        return add(ctx, diff, 'day');
    },

    // ISO week numarası
    isoWeek: (ctx, val) => {
        if (val === undefined) return week(ctx);
        // Setter: belirli ISO haftasına ayarla
        const currentWeek = week(ctx);
        const diff = val - currentWeek;
        return add(ctx, diff * 7, 'day');
    },

    // Locale ayarı
    locale: (ctx, newLocale) => nano(ctx._d, newLocale),

    // Clone
    clone: (ctx) => nano(ctx._d, ctx._l)
};

/**
 * Calendar caches - avoid creating formatters and strings on every call
 * Using LRU to prevent unbounded growth
 */
const calendarStringsCache = createLRU();
const calendarTimeFormatterCache = createLRU();
const calendarWeekdayFormatterCache = createLRU();
const calendarFallbackFormatterCache = createLRU();

const getCalendarTimeFormatter = (locale) => {
    let f = calendarTimeFormatterCache.get(locale);
    if (!f) {
        f = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' });
        calendarTimeFormatterCache.set(locale, f);
    }
    return f;
};

const getCalendarWeekdayFormatter = (locale) => {
    let f = calendarWeekdayFormatterCache.get(locale);
    if (!f) {
        f = new Intl.DateTimeFormat(locale, { weekday: 'long' });
        calendarWeekdayFormatterCache.set(locale, f);
    }
    return f;
};

const getCalendarFallbackFormatter = (locale) => {
    let f = calendarFallbackFormatterCache.get(locale);
    if (!f) {
        f = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
        calendarFallbackFormatterCache.set(locale, f);
    }
    return f;
};

/**
 * Get calendar strings using Intl API where possible
 * Falls back to patterns for complex formats
 */
const getCalendarStrings = (locale) => {
    // Intl.RelativeTimeFormat ile "yesterday", "tomorrow" çek
    let today = 'Today';
    let yesterday = 'Yesterday';
    let tomorrow = 'Tomorrow';

    try {
        const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

        const todayParts = rtf.formatToParts(0, 'day');
        const todayLiteral = todayParts.find(p => p.type === 'literal');
        if (todayLiteral && todayLiteral.value.trim()) {
            today = todayLiteral.value.trim();
        }

        const yesterdayStr = rtf.format(-1, 'day');
        if (yesterdayStr && !yesterdayStr.match(/\d/)) {
            yesterday = yesterdayStr;
        }

        const tomorrowStr = rtf.format(1, 'day');
        if (tomorrowStr && !tomorrowStr.match(/\d/)) {
            tomorrow = tomorrowStr;
        }
    } catch {
        // Fallback
    }

    const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    today = capitalize(today);
    yesterday = capitalize(yesterday);
    tomorrow = capitalize(tomorrow);

    const lang = locale.split('-')[0];

    // Externalized data from locales.js
    const timePrep = timePrepositions[lang] || ' ';
    const wp = weekPatterns[lang] || weekPatterns.en;

    return {
        today: today + timePrep + '{time}',
        yesterday: yesterday + timePrep + '{time}',
        tomorrow: tomorrow + timePrep + '{time}',
        thisWeek: '{weekday}' + timePrep + '{time}',
        lastWeek: wp.last + timePrep + '{time}',
        nextWeek: wp.next + timePrep + '{time}'
    };
};

/**
 * Bound method cache - avoids creating new functions on every property access
 * WeakMap key: target object, value: Map of prop -> bound function
 */
const boundMethodCache = new WeakMap();

/**
 * Proxy handler - lazy method binding sağlar
 * Sadece çağrılan metodlar bundle'a dahil edilir (tree-shaking)
 * Optimized: caches bound methods per target to avoid repeated function creation
 */
const handler = {
    get(target, prop) {
        // Fast path: internal properties
        if (prop === '_d' || prop === '_l' || prop === '_input' || prop === '_tz') {
            return target[prop];
        }

        // Symbol.toPrimitive - Date math için
        if (prop === Symbol.toPrimitive) {
            return (hint) => hint === 'number' ? target._d.getTime() : target._d.toString();
        }

        // toString - direct return
        if (prop === 'toString') {
            return () => target._d.toString();
        }

        // Check method cache first
        let targetCache = boundMethodCache.get(target);
        if (targetCache && targetCache[prop]) {
            return targetCache[prop];
        }

        // Önce methods'ta ara
        if (prop in methods) {
            const boundMethod = (...args) => methods[prop](target, ...args);
            // Cache the bound method
            if (!targetCache) {
                targetCache = Object.create(null);
                boundMethodCache.set(target, targetCache);
            }
            targetCache[prop] = boundMethod;
            return boundMethod;
        }

        // Plugin'lerde ara
        if (prop in plugins) {
            const boundPlugin = (...args) => plugins[prop](target, ...args);
            if (!targetCache) {
                targetCache = Object.create(null);
                boundMethodCache.set(target, targetCache);
            }
            targetCache[prop] = boundPlugin;
            return boundPlugin;
        }

        // Internal properties
        return target[prop];
    }
};

/**
 * NanoDate factory fonksiyonu
 * 
 * @param {Date|string|number|NanoDate} input - Tarih input'u
 * @param {string} [locale] - Locale (opsiyonel, default: navigator.language)
 * @returns {Proxy} NanoDate instance
 * 
 * @example
 * nano()                    // Şu an
 * nano('2026-01-21')        // ISO string'den
 * nano(1737452400000)       // Unix timestamp'ten
 * nano(new Date())          // Date objesinden
 * nano('2026-01-21', 'tr')  // Türkçe locale ile
 */
export const nano = (input, locale) => {
    let d;
    let originalInput;

    // MONOMORPHIC TYPE BRANCHES - prevents V8 de-optimization
    // Each branch handles exactly one input type for consistent IC (Inline Cache)
    const inputType = typeof input;

    if (input == null) {
        // Null or undefined - current time (fastest path)
        d = new Date();
    } else if (inputType === 'number') {
        // Timestamp - direct construction
        d = new Date(input);
    } else if (inputType === 'string') {
        // String input - try fast ISO parse first
        d = ultraFastParse(input) || new Date(input);
        // Keep original input for isValid() calendar validation
        originalInput = input;
    } else if (inputType === 'object') {
        if (input._d) {
            // Another NanoDate instance
            d = new Date(input._d.getTime());
            locale = locale || input._l;
            originalInput = input._input; // Preserve original input if present
        } else if (input instanceof Date) {
            // Native Date object
            d = new Date(input.getTime());
        } else {
            // Unknown object - let Date handle it
            d = new Date(input);
        }
    } else {
        d = new Date(input);
    }

    // Strict mode check - only for string inputs
    if (globalConfig.strict && inputType === 'string') {
        const ctx = { _d: d, _l: locale, _input: originalInput };
        if (!isValid(ctx)) {
            throw new InvalidDateError(input);
        }
    }

    // CONTEXT OPTIMIZATION:
    // - String inputs: include _input for isValid() calendar validation  
    // - Other inputs: slim 2-property context for minimal overhead
    if (originalInput !== undefined) {
        return new Proxy({ _d: d, _l: locale, _input: originalInput }, handler);
    }
    return new Proxy({ _d: d, _l: locale }, handler);
};

/**
 * Strict mode factory - throws on invalid dates
 * 
 * @param {Date|string|number} input - Date input
 * @param {string} [locale] - Locale
 * @returns {Proxy} NanoDate instance
 * @throws {InvalidDateError} If date is invalid
 */
export const strict = (input, locale) => {
    const d = new Date(input);
    const ctx = { _d: d, _l: locale, _input: typeof input === 'string' ? input : undefined };

    if (!isValid(ctx)) {
        throw new InvalidDateError(input);
    }

    return new Proxy(ctx, handler);
};

/**
 * Configure global settings
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} [options.strict] - Enable strict mode globally
 * @param {string} [options.locale] - Default locale
 * @param {string} [options.timezone] - Default timezone
 */
export const config = (options) => {
    if (options.strict !== undefined) globalConfig.strict = options.strict;
    if (options.locale !== undefined) globalConfig.locale = options.locale;
    if (options.timezone !== undefined) globalConfig.timezone = options.timezone;
};

/**
 * Reset configuration to defaults
 */
export const resetConfig = () => {
    globalConfig = {
        strict: false,
        locale: null,
        timezone: null
    };
};

/**
 * UTC modunda NanoDate oluştur
 * 
 * @param {Date|string|number} input - Tarih input'u
 * @returns {Proxy} NanoDate instance (UTC)
 */
export const utc = (input) => {
    const d = input ? new Date(input) : new Date();
    // UTC Date oluştur
    const utcDate = new Date(Date.UTC(
        d.getUTCFullYear(),
        d.getUTCMonth(),
        d.getUTCDate(),
        d.getUTCHours(),
        d.getUTCMinutes(),
        d.getUTCSeconds(),
        d.getUTCMilliseconds()
    ));
    return new Proxy({ _d: utcDate, _l: 'en-US', _utc: true }, handler);
};

/**
 * Unix timestamp'ten (saniye) NanoDate oluştur
 * 
 * @param {number} timestamp - Unix timestamp (saniye)
 * @param {string} [locale] - Locale
 * @returns {Proxy} NanoDate instance
 */
export const fromUnix = (timestamp, locale) => {
    return nano(timestamp * 1000, locale);
};

/**
 * Environment Intl desteğini kontrol et
 * Node.js ICU-less build'lerde uyarı verir
 */
export const checkIntlSupport = () => {
    try {
        const test = new Intl.DateTimeFormat('tr', { month: 'long' });
        const result = test.format(new Date(2026, 0, 1));
        // Eğer Türkçe "Ocak" dönmüyorsa, ICU desteği eksik
        if (result === 'January' || result === 'M01') {
            console.warn('[NanoDate] Limited Intl support detected. Install full-icu for all locales.');
            return false;
        }
        return true;
    } catch {
        console.warn('[NanoDate] Intl API not available.');
        return false;
    }
};

// Initialize modules with circular dependencies
initManipulate(nano);
initTimezone(nano);
initUtils(nano);

// Attach static methods to nano
nano.strict = strict;
nano.config = config;
nano.resetConfig = resetConfig;
nano.extend = extend;
nano.utc = utc;
nano.fromUnix = fromUnix;

/**
 * Parse a date string with a specific format
 * 
 * @param {string} dateStr - Date string to parse
 * @param {string} format - Format string
 * @param {string} [locale] - Locale
 * @returns {Proxy} NanoDate instance
 * 
 * @example
 * nano.parse('21-01-2026', 'DD-MM-YYYY')           // Jan 21, 2026
 * nano.parse('2026/01/21 14:30', 'YYYY/MM/DD HH:mm')
 * nano.parse('01/21/26', 'MM/DD/YY')
 * nano.parse('3:30 PM', 'h:mm A')
 */
nano.parse = (dateStr, format, locale) => parseFormat(dateStr, format, locale, nano);

/**
 * Create a duration from various inputs
 * 
 * @param {number|Object|string} input - Duration input
 * @param {string} [unit] - Unit if input is number
 * @returns {Duration} Duration instance
 * 
 * @example
 * nano.duration(5000)                       // 5 seconds in ms
 * nano.duration(2, 'hours')                 // 2 hours
 * nano.duration({ hours: 2, minutes: 30 }) // 2 hours 30 minutes
 * nano.duration('P1DT2H30M')                // ISO 8601 duration
 */
nano.duration = duration;

/**
 * Calculate duration between two dates
 * 
 * @param {Date|NanoDate} start - Start date
 * @param {Date|NanoDate} end - End date
 * @returns {Duration} Duration between dates
 * 
 * @example
 * nano.durationBetween(nano('2026-01-01'), nano('2026-01-21'))
 */
nano.durationBetween = durationBetween;

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
nano.raw = raw;

// ============================================
// HIGH-PERFORMANCE STATIC METHODS
// ============================================
// These bypass Proxy overhead for maximum performance
// Use when you need speed and don't need method chaining

/**
 * Configurable cache size for Intl.DateTimeFormat instances
 * @default 50
 */
nano.cacheSize = 50;

/**
 * Static format - bypasses Proxy overhead for one-shot formatting
 * Up to 2x faster than nano(date).format(fmt)
 * 
 * @param {Date|number|string} date - Input date
 * @param {string} fmt - Format string
 * @param {string} [locale] - Optional locale
 * @returns {string} Formatted date string
 * 
 * @example
 * nano.format(Date.now(), 'YYYY-MM-DD')           // '2026-01-22'
 * nano.format('2026-01-21', 'MMMM D, YYYY', 'tr') // 'Ocak 21, 2026'
 */
nano.format = (date, fmt, locale) => {
    const d = date instanceof Date ? date :
        typeof date === 'number' ? new Date(date) :
            new Date(date);
    return format({ _d: d, _l: locale }, fmt);
};

/**
 * Static add - returns timestamp without creating NanoDate wrapper
 * For bulk calculations where you only need the result timestamp
 * 
 * @param {number} timestamp - Input timestamp (milliseconds)
 * @param {number} value - Amount to add
 * @param {string} unit - Unit (day, hour, minute, etc.)
 * @returns {number} Result timestamp
 * 
 * @example
 * const tomorrow = nano.addTs(Date.now(), 1, 'day');
 * const nextWeek = nano.addTs(Date.now(), 7, 'days');
 */
nano.addTs = (timestamp, value, unit) => {
    return add({ _d: new Date(timestamp) }, value, unit)._d.getTime();
};

/**
 * Static subtract - returns timestamp without creating NanoDate wrapper
 * 
 * @param {number} timestamp - Input timestamp (milliseconds)
 * @param {number} value - Amount to subtract
 * @param {string} unit - Unit
 * @returns {number} Result timestamp
 */
nano.subtractTs = (timestamp, value, unit) => {
    return subtract({ _d: new Date(timestamp) }, value, unit)._d.getTime();
};

/**
 * Static diff - calculate difference without creating NanoDate wrappers
 * 
 * @param {number|Date} date1 - First date (timestamp or Date)
 * @param {number|Date} date2 - Second date (timestamp or Date)
 * @param {string} [unit='millisecond'] - Unit for result
 * @returns {number} Difference in specified unit
 * 
 * @example
 * nano.diffTs(Date.now(), Date.now() - 86400000, 'days') // 1
 */
nano.diffTs = (date1, date2, unit = 'millisecond') => {
    const d1 = date1 instanceof Date ? date1 : new Date(date1);
    const d2 = date2 instanceof Date ? date2 : new Date(date2);
    return diff({ _d: d1 }, d2, unit);
};

/**
 * Static isValid - check validity without creating NanoDate wrapper
 * 
 * @param {Date|number|string} date - Input to validate
 * @returns {boolean} True if valid date
 * 
 * @example
 * nano.isValidDate('2026-02-30') // false
 * nano.isValidDate('2026-01-21') // true
 */
nano.isValidDate = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    return isValid({ _d: d, _input: typeof date === 'string' ? date : undefined });
};

// Export Duration class
export { Duration, duration, durationBetween };

// Default export
export default nano;
