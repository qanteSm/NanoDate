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
import { duration, between as durationBetween, Duration } from './duration.js';

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
        
        // Optimized: Calculate timestamps directly without creating multiple Date objects
        const refYear = ref.getFullYear();
        const refMonth = ref.getMonth();
        const refDate = ref.getDate();
        const refDay = ref.getDay();
        
        // Use Date.UTC-like calculation for day boundaries (in local time)
        const startOfTodayTs = new Date(refYear, refMonth, refDate).getTime();
        const MS_PER_DAY = 86400000;
        const startOfTomorrowTs = startOfTodayTs + MS_PER_DAY;
        const startOfYesterdayTs = startOfTodayTs - MS_PER_DAY;
        const startOfThisWeekTs = startOfTodayTs - refDay * MS_PER_DAY;
        const startOfNextWeekTs = startOfThisWeekTs + 7 * MS_PER_DAY;
        const startOfLastWeekTs = startOfThisWeekTs - 7 * MS_PER_DAY;
        
        const ts = d.getTime();
        const timeStr = getCalendarTimeFormatter(locale).format(d);
        
        // Calendar strings by locale
        const strings = getCalendarStrings(locale);
        
        if (ts >= startOfTodayTs && ts < startOfTomorrowTs) {
            return strings.today.replace('{time}', timeStr);
        }
        if (ts >= startOfTomorrowTs && ts < startOfTomorrowTs + MS_PER_DAY) {
            return strings.tomorrow.replace('{time}', timeStr);
        }
        if (ts >= startOfYesterdayTs && ts < startOfTodayTs) {
            return strings.yesterday.replace('{time}', timeStr);
        }
        if (ts >= startOfThisWeekTs && ts < startOfNextWeekTs) {
            const weekday = getCalendarWeekdayFormatter(locale).format(d);
            return strings.thisWeek.replace('{weekday}', weekday).replace('{time}', timeStr);
        }
        if (ts >= startOfLastWeekTs && ts < startOfThisWeekTs) {
            const weekday = getCalendarWeekdayFormatter(locale).format(d);
            return strings.lastWeek.replace('{weekday}', weekday).replace('{time}', timeStr);
        }
        if (ts >= startOfNextWeekTs && ts < startOfNextWeekTs + 7 * MS_PER_DAY) {
            const weekday = getCalendarWeekdayFormatter(locale).format(d);
            return strings.nextWeek.replace('{weekday}', weekday).replace('{time}', timeStr);
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
 * Calendar strings cache - Intl API'den dinamik olarak çekilir
 */
const calendarStringsCache = Object.create(null);

/**
 * Calendar Intl formatter caches - avoid creating formatters on every call
 */
const calendarTimeFormatterCache = Object.create(null);
const calendarWeekdayFormatterCache = Object.create(null);
const calendarFallbackFormatterCache = Object.create(null);

const getCalendarTimeFormatter = (locale) => {
    if (!calendarTimeFormatterCache[locale]) {
        calendarTimeFormatterCache[locale] = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' });
    }
    return calendarTimeFormatterCache[locale];
};

const getCalendarWeekdayFormatter = (locale) => {
    if (!calendarWeekdayFormatterCache[locale]) {
        calendarWeekdayFormatterCache[locale] = new Intl.DateTimeFormat(locale, { weekday: 'long' });
    }
    return calendarWeekdayFormatterCache[locale];
};

const getCalendarFallbackFormatter = (locale) => {
    if (!calendarFallbackFormatterCache[locale]) {
        calendarFallbackFormatterCache[locale] = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
    }
    return calendarFallbackFormatterCache[locale];
};

/**
 * Get calendar strings using Intl API where possible
 * Falls back to patterns for complex formats
 */
const getCalendarStrings = (locale) => {
    if (calendarStringsCache[locale]) return calendarStringsCache[locale];
    
    // Intl.RelativeTimeFormat ile "yesterday", "tomorrow" çek
    let today = 'Today';
    let yesterday = 'Yesterday';
    let tomorrow = 'Tomorrow';
    
    try {
        const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
        
        // "0 days" → "today" (bazı locale'lerde)
        const todayParts = rtf.formatToParts(0, 'day');
        const todayLiteral = todayParts.find(p => p.type === 'literal');
        if (todayLiteral && todayLiteral.value.trim()) {
            today = todayLiteral.value.trim();
        }
        
        // "-1 days" → "yesterday"
        const yesterdayStr = rtf.format(-1, 'day');
        if (yesterdayStr && !yesterdayStr.match(/\d/)) {
            yesterday = yesterdayStr;
        }
        
        // "+1 days" → "tomorrow"  
        const tomorrowStr = rtf.format(1, 'day');
        if (tomorrowStr && !tomorrowStr.match(/\d/)) {
            tomorrow = tomorrowStr;
        }
    } catch {
        // Fallback - Intl.RelativeTimeFormat desteklenmiyorsa
    }
    
    // Capitalize first letter for languages that need it
    const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    today = capitalize(today);
    yesterday = capitalize(yesterday);
    tomorrow = capitalize(tomorrow);
    
    // Time preposition by locale (Intl API'den çekilemez, minimal hardcode)
    const lang = locale.split('-')[0];
    const timePrep = {
        en: ' at ', tr: ' ', de: ' um ', fr: ' à ', es: ' a las ',
        it: ' alle ', pt: ' às ', nl: ' om ', pl: ' o ', sv: ' kl ',
        da: ' kl ', no: ' kl ', fi: ' klo ', ja: ' ', zh: ' ', ko: ' ',
        ar: ' ', ru: ' в ', uk: ' о ', cs: ' v ', hu: ' ', ro: ' la ',
        el: ' στις ', he: ' ב', th: ' ', vi: ' lúc ', id: ' pukul ',
        ms: ' pukul ', hi: ' ', bn: ' '
    }[lang] || ' ';
    
    // Last/Next week patterns (Intl API'de bu formatlar yok)
    const weekPatterns = {
        en: { last: 'Last {weekday}', next: 'Next {weekday}' },
        tr: { last: 'Geçen {weekday}', next: 'Gelecek {weekday}' },
        de: { last: 'Letzten {weekday}', next: 'Nächsten {weekday}' },
        fr: { last: '{weekday} dernier', next: '{weekday} prochain' },
        es: { last: 'El {weekday} pasado', next: 'El próximo {weekday}' },
        it: { last: '{weekday} scorso', next: '{weekday} prossimo' },
        pt: { last: '{weekday} passado', next: 'Próximo {weekday}' },
        ja: { last: '先週{weekday}', next: '来週{weekday}' },
        zh: { last: '上周{weekday}', next: '下周{weekday}' },
        ko: { last: '지난 {weekday}', next: '다음 {weekday}' },
        ar: { last: '{weekday} الماضي', next: '{weekday} القادم' },
        ru: { last: 'В прошлый {weekday}', next: 'В следующий {weekday}' },
        nl: { last: 'Afgelopen {weekday}', next: 'Volgende {weekday}' },
        pl: { last: 'Zeszły {weekday}', next: 'Następny {weekday}' },
        sv: { last: 'Förra {weekday}', next: 'Nästa {weekday}' },
        da: { last: 'Sidste {weekday}', next: 'Næste {weekday}' },
        no: { last: 'Forrige {weekday}', next: 'Neste {weekday}' },
        fi: { last: 'Viime {weekday}', next: 'Ensi {weekday}' },
        cs: { last: 'Minulý {weekday}', next: 'Příští {weekday}' },
        hu: { last: 'Múlt {weekday}', next: 'Következő {weekday}' },
        ro: { last: '{weekday} trecută', next: '{weekday} viitoare' },
        el: { last: 'Περασμένη {weekday}', next: 'Επόμενη {weekday}' },
        he: { last: '{weekday} שעבר', next: '{weekday} הבא' },
        th: { last: '{weekday}ที่แล้ว', next: '{weekday}หน้า' },
        vi: { last: '{weekday} tuần trước', next: '{weekday} tuần sau' },
        id: { last: '{weekday} lalu', next: '{weekday} depan' },
        ms: { last: '{weekday} lepas', next: '{weekday} depan' },
        hi: { last: 'पिछले {weekday}', next: 'अगले {weekday}' },
        bn: { last: 'গত {weekday}', next: 'আগামী {weekday}' },
        uk: { last: 'Минулої {weekday}', next: 'Наступної {weekday}' }
    };
    
    const wp = weekPatterns[lang] || weekPatterns.en;
    
    calendarStringsCache[locale] = {
        today: today + timePrep + '{time}',
        yesterday: yesterday + timePrep + '{time}',
        tomorrow: tomorrow + timePrep + '{time}',
        thisWeek: '{weekday}' + timePrep + '{time}',
        lastWeek: wp.last + timePrep + '{time}',
        nextWeek: wp.next + timePrep + '{time}'
    };
    
    return calendarStringsCache[locale];
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

// Export Duration class
export { Duration, duration, durationBetween };

// Default export
export default nano;
