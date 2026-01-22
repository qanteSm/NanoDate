/**
 * NanoDate - World's smallest date library
 * Zero-locale-payload, Intl-native, 100% immutable
 * 
 * @license MIT
 * @author Muhammet Ali Büyük
 */

import { format, parse as parseFormat } from './format.js';
import { fromNow, toNow } from './relative.js';
import { add, subtract, startOf, endOf, set, init as initManipulate, batch, raw } from './manipulate.js';
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
    
    // Batch operations - bypass Proxy overhead
    batch,

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
        const d = ctx._d;
        const ref = referenceDate ? (referenceDate._d || new Date(referenceDate)) : new Date();
        
        // Get day boundaries
        const startOfToday = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
        const startOfTomorrow = new Date(startOfToday.getTime() + 86400000);
        const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
        const startOfThisWeek = new Date(startOfToday.getTime() - startOfToday.getDay() * 86400000);
        const startOfNextWeek = new Date(startOfThisWeek.getTime() + 7 * 86400000);
        const startOfLastWeek = new Date(startOfThisWeek.getTime() - 7 * 86400000);
        
        const ts = d.getTime();
        const timeStr = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(d);
        
        // Calendar strings by locale
        const strings = getCalendarStrings(locale);
        
        if (ts >= startOfToday.getTime() && ts < startOfTomorrow.getTime()) {
            return strings.today.replace('{time}', timeStr);
        }
        if (ts >= startOfTomorrow.getTime() && ts < startOfTomorrow.getTime() + 86400000) {
            return strings.tomorrow.replace('{time}', timeStr);
        }
        if (ts >= startOfYesterday.getTime() && ts < startOfToday.getTime()) {
            return strings.yesterday.replace('{time}', timeStr);
        }
        if (ts >= startOfThisWeek.getTime() && ts < startOfNextWeek.getTime()) {
            const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(d);
            return strings.thisWeek.replace('{weekday}', weekday).replace('{time}', timeStr);
        }
        if (ts >= startOfLastWeek.getTime() && ts < startOfThisWeek.getTime()) {
            const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(d);
            return strings.lastWeek.replace('{weekday}', weekday).replace('{time}', timeStr);
        }
        if (ts >= startOfNextWeek.getTime() && ts < startOfNextWeek.getTime() + 7 * 86400000) {
            const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(d);
            return strings.nextWeek.replace('{weekday}', weekday).replace('{time}', timeStr);
        }
        
        // Fallback to full date
        return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(d);
    },

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
 * Calendar strings for different locales
 */
const calendarStringsCache = Object.create(null);

const getCalendarStrings = (locale) => {
    if (calendarStringsCache[locale]) return calendarStringsCache[locale];
    
    const lang = locale.split('-')[0];
    
    const strings = {
        en: {
            today: 'Today at {time}',
            tomorrow: 'Tomorrow at {time}',
            yesterday: 'Yesterday at {time}',
            thisWeek: '{weekday} at {time}',
            lastWeek: 'Last {weekday} at {time}',
            nextWeek: 'Next {weekday} at {time}'
        },
        tr: {
            today: 'Bugün {time}',
            tomorrow: 'Yarın {time}',
            yesterday: 'Dün {time}',
            thisWeek: '{weekday} {time}',
            lastWeek: 'Geçen {weekday} {time}',
            nextWeek: 'Gelecek {weekday} {time}'
        },
        de: {
            today: 'Heute um {time}',
            tomorrow: 'Morgen um {time}',
            yesterday: 'Gestern um {time}',
            thisWeek: '{weekday} um {time}',
            lastWeek: 'Letzten {weekday} um {time}',
            nextWeek: 'Nächsten {weekday} um {time}'
        },
        fr: {
            today: "Aujourd'hui à {time}",
            tomorrow: 'Demain à {time}',
            yesterday: 'Hier à {time}',
            thisWeek: '{weekday} à {time}',
            lastWeek: '{weekday} dernier à {time}',
            nextWeek: '{weekday} prochain à {time}'
        },
        es: {
            today: 'Hoy a las {time}',
            tomorrow: 'Mañana a las {time}',
            yesterday: 'Ayer a las {time}',
            thisWeek: '{weekday} a las {time}',
            lastWeek: 'El {weekday} pasado a las {time}',
            nextWeek: 'El próximo {weekday} a las {time}'
        },
        ja: {
            today: '今日 {time}',
            tomorrow: '明日 {time}',
            yesterday: '昨日 {time}',
            thisWeek: '{weekday} {time}',
            lastWeek: '先週{weekday} {time}',
            nextWeek: '来週{weekday} {time}'
        },
        zh: {
            today: '今天 {time}',
            tomorrow: '明天 {time}',
            yesterday: '昨天 {time}',
            thisWeek: '{weekday} {time}',
            lastWeek: '上周{weekday} {time}',
            nextWeek: '下周{weekday} {time}'
        },
        ko: {
            today: '오늘 {time}',
            tomorrow: '내일 {time}',
            yesterday: '어제 {time}',
            thisWeek: '{weekday} {time}',
            lastWeek: '지난 {weekday} {time}',
            nextWeek: '다음 {weekday} {time}'
        },
        ar: {
            today: 'اليوم {time}',
            tomorrow: 'غداً {time}',
            yesterday: 'أمس {time}',
            thisWeek: '{weekday} {time}',
            lastWeek: '{weekday} الماضي {time}',
            nextWeek: '{weekday} القادم {time}'
        },
        ru: {
            today: 'Сегодня в {time}',
            tomorrow: 'Завтра в {time}',
            yesterday: 'Вчера в {time}',
            thisWeek: '{weekday} в {time}',
            lastWeek: 'В прошлый {weekday} в {time}',
            nextWeek: 'В следующий {weekday} в {time}'
        }
    };
    
    calendarStringsCache[locale] = strings[lang] || strings.en;
    return calendarStringsCache[locale];
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

// Default export
export default nano;
