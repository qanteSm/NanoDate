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
import { diff, isBefore, isAfter, isSame, isSameOrBefore, isSameOrAfter, isBetween, isValid, isLeapYear, daysInMonth, dayOfYear, week, quarter } from './utils.js';
import { tz, utcOffset } from './timezone.js';

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

    // Input türüne göre Date oluştur
    if (input === undefined || input === null) {
        d = new Date();
    } else if (input._d) {
        // Başka bir NanoDate instance'ı
        d = new Date(input._d);
        locale = locale || input._l;
    } else if (input instanceof Date) {
        d = new Date(input);
    } else {
        d = new Date(input);
    }

    // Proxy ile wrap et
    return new Proxy({ _d: d, _l: locale }, handler);
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

// Default export
export default nano;
