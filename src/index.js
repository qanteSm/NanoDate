/**
 * NanoDate - World's smallest date library
 * Zero-locale-payload, Intl-native, 100% immutable
 * 
 * @license MIT
 * @author Muhammet Ali Büyük
 */

import { format } from './format.js';
import { fromNow, toNow } from './relative.js';
import { add, subtract, startOf, endOf, set, init as initManipulate } from './manipulate.js';
import { diff, isBefore, isAfter, isSame, isSameOrBefore, isSameOrAfter, isBetween, isValid, isLeapYear, daysInMonth, dayOfYear, week, quarter, isBusinessDay, addBusinessDays, diffBusinessDays, nextBusinessDay, prevBusinessDay, initUtils } from './utils.js';
import { tz, tzChainable, utcOffset, toTimezone, getTimezone, initTimezone } from './timezone.js';

/**
 * Fast ISO 8601 date string regex for fast-path parsing
 * Matches: YYYY-MM-DD, YYYY-MM-DDTHH:mm:ss, YYYY-MM-DDTHH:mm:ss.SSS, with optional Z or ±HH:mm
 */
const ISO_REGEX = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?(?:Z|([+-])(\d{2}):?(\d{2}))?$/;

/**
 * Fast ISO string parser - avoids Date.parse overhead for common formats
 * Returns null if not a recognized format, falling back to native parsing
 */
const fastParseISO = (str) => {
    if (typeof str !== 'string' || str.length < 10) return null;
    
    const match = ISO_REGEX.exec(str);
    if (!match) return null;
    
    const year = +match[1];
    const month = +match[2] - 1;
    const day = +match[3];
    const hour = match[4] ? +match[4] : 0;
    const minute = match[5] ? +match[5] : 0;
    const second = match[6] ? +match[6] : 0;
    const ms = match[7] ? +match[7].padEnd(3, '0') : 0;
    
    // If has timezone info (Z or offset)
    if (match[0].includes('Z') || match[8]) {
        let timestamp = Date.UTC(year, month, day, hour, minute, second, ms);
        
        // Apply offset if present (not Z)
        if (match[8]) {
            const offsetSign = match[8] === '+' ? -1 : 1;
            const offsetHours = +match[9];
            const offsetMinutes = +match[10] || 0;
            timestamp += offsetSign * (offsetHours * 60 + offsetMinutes) * 60000;
        }
        
        return new Date(timestamp);
    }
    
    // Local time
    return new Date(year, month, day, hour, minute, second, ms);
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

    // Native Date metodları için pass-through
    toISOString: (ctx) => ctx._d.toISOString(),
    toJSON: (ctx) => ctx._d.toJSON(),
    valueOf: (ctx) => ctx._d.getTime(),
    unix: (ctx) => Math.floor(ctx._d.getTime() / 1000),
    toDate: (ctx) => new Date(ctx._d),

    // Getter'lar
    year: (ctx) => ctx._d.getFullYear(),
    month: (ctx) => ctx._d.getMonth(),
    date: (ctx) => ctx._d.getDate(),
    day: (ctx) => ctx._d.getDay(),
    hour: (ctx) => ctx._d.getHours(),
    minute: (ctx) => ctx._d.getMinutes(),
    second: (ctx) => ctx._d.getSeconds(),
    millisecond: (ctx) => ctx._d.getMilliseconds(),

    // Locale ayarı
    locale: (ctx, newLocale) => nano(ctx._d, newLocale),

    // Clone
    clone: (ctx) => nano(ctx._d, ctx._l)
};

/**
 * Proxy handler - lazy method binding sağlar
 * Sadece çağrılan metodlar bundle'a dahil edilir (tree-shaking)
 */
const handler = {
    get(target, prop) {
        // Önce methods'ta ara
        if (prop in methods) {
            return (...args) => methods[prop](target, ...args);
        }

        // Plugin'lerde ara
        if (prop in plugins) {
            return (...args) => plugins[prop](target, ...args);
        }

        // Symbol.toPrimitive - Date math için
        if (prop === Symbol.toPrimitive) {
            return (hint) => hint === 'number' ? target._d.getTime() : target._d.toString();
        }

        // toString
        if (prop === 'toString') {
            return () => target._d.toString();
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
    let originalInput = input;

    // Input türüne göre Date oluştur - optimized paths
    if (input === undefined || input === null) {
        // No input - current time
        d = new Date();
        originalInput = undefined;
    } else if (typeof input === 'number') {
        // Timestamp - fastest path
        d = new Date(input);
        originalInput = undefined;
    } else if (input._d) {
        // Başka bir NanoDate instance'ı
        d = new Date(input._d.getTime()); // Use getTime() for faster cloning
        locale = locale || input._l;
        originalInput = input._input;
    } else if (input instanceof Date) {
        d = new Date(input.getTime()); // Use getTime() for faster cloning
        originalInput = undefined;
    } else if (typeof input === 'string') {
        // String input - try fast ISO parse first
        d = fastParseISO(input);
        if (!d) {
            // Fall back to native parsing
            d = new Date(input);
        }
    } else {
        d = new Date(input);
    }

    // Strict mode check
    if (globalConfig.strict && typeof originalInput === 'string') {
        const ctx = { _d: d, _l: locale, _input: originalInput };
        if (!isValid(ctx)) {
            throw new InvalidDateError(originalInput);
        }
    }

    // Proxy ile wrap et
    return new Proxy({ _d: d, _l: locale, _input: originalInput }, handler);
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

// Default export
export default nano;
