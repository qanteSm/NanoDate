/**
 * NanoDate Format Module
 * Token-based formatter using Intl.DateTimeFormat
 * 
 * Supports:
 * - YYYY, YY (year)
 * - MMMM, MMM, MM, M (month)  
 * - DD, D, Do (day with ordinal)
 * - dddd, ddd, dd (weekday)
 * - HH, H, hh, h (hour)
 * - mm, m (minute)
 * - ss, s (second)
 * - SSS (millisecond)
 * - A, a (AM/PM)
 * - Z, ZZ (timezone offset)
 * - [text] (escape)
 * - Presets: short, medium, long, full
 */

/**
 * Token to Intl.DateTimeFormat options mapping
 * Ultra-compact, her token tek bir Intl option'a karşılık gelir
 */
const T = {
    YYYY: { year: 'numeric' },
    YY: { year: '2-digit' },
    MMMM: { month: 'long' },
    MMM: { month: 'short' },
    MM: { month: '2-digit' },
    M: { month: 'numeric' },
    DD: { day: '2-digit' },
    D: { day: 'numeric' },
    dddd: { weekday: 'long' },
    ddd: { weekday: 'short' },
    dd: { weekday: 'narrow' },
    HH: { hour: '2-digit', hour12: false },
    H: { hour: 'numeric', hour12: false },
    hh: { hour: '2-digit', hour12: true },
    h: { hour: 'numeric', hour12: true },
    mm: { minute: '2-digit' },
    m: { minute: 'numeric' },
    ss: { second: '2-digit' },
    s: { second: 'numeric' },
    SSS: { fractionalSecondDigits: 3 },
    A: { hour: 'numeric', hour12: true, hourCycle: 'h12' },
    a: { hour: 'numeric', hour12: true, hourCycle: 'h12' }
};

/**
 * Ordinal suffix for English
 * ~35 bytes, supports 1st, 2nd, 3rd, 4th-20th, 21st, 22nd, etc.
 * 
 * @param {number} n - Day number
 * @returns {string} Day with ordinal suffix (e.g., "1st", "2nd", "3rd")
 */
const ord = (n) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/**
 * Default locale getter
 * Browser: navigator.language
 * Node.js: Intl.DateTimeFormat().resolvedOptions().locale
 */
const getLocale = (ctx) => {
    if (ctx._l) return ctx._l;
    if (typeof navigator !== 'undefined' && navigator.language) {
        return navigator.language;
    }
    return Intl.DateTimeFormat().resolvedOptions().locale || 'en';
};

/**
 * Preset formats - Intl dateStyle/timeStyle kullanır (0 byte ek maliyet)
 */
const PRESETS = ['short', 'medium', 'long', 'full'];

/**
 * Extract AM/PM from formatted time
 */
const getAmPm = (date, locale, uppercase) => {
    const formatter = new Intl.DateTimeFormat(locale, {
        hour: 'numeric',
        hour12: true
    });
    const parts = formatter.formatToParts(date);
    const period = parts.find(p => p.type === 'dayPeriod');
    if (period) {
        return uppercase ? period.value.toUpperCase() : period.value.toLowerCase();
    }
    return date.getHours() < 12 ? (uppercase ? 'AM' : 'am') : (uppercase ? 'PM' : 'pm');
};

/**
 * Get timezone offset string
 * Z: +03:00
 * ZZ: +0300
 */
const getOffset = (date, withColon) => {
    const offset = -date.getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const absOffset = Math.abs(offset);
    const hours = String(Math.floor(absOffset / 60)).padStart(2, '0');
    const minutes = String(absOffset % 60).padStart(2, '0');
    return sign + hours + (withColon ? ':' : '') + minutes;
};

/**
 * Token regex pattern
 * Order matters: longer tokens first (YYYY before YY, etc.)
 */
const TOKEN_REGEX = /\[([^\]]+)]|YYYY|YY|MMMM|MMM|MM|M|Do|DD|D|dddd|ddd|dd|HH|H|hh|h|mm|m|ss|s|SSS|A|a|ZZ|Z/g;

/**
 * Format a NanoDate using a format string or preset
 * 
 * @param {Object} ctx - NanoDate context (_d: Date, _l: locale)
 * @param {string} [fmt='YYYY-MM-DDTHH:mm:ss'] - Format string or preset
 * @returns {string} Formatted date string
 * 
 * @example
 * format(ctx, 'YYYY-MM-DD')           // "2026-01-21"
 * format(ctx, 'dddd, MMMM Do YYYY')   // "Wednesday, January 21st 2026"
 * format(ctx, 'short')                // "1/21/26" (locale-dependent)
 * format(ctx, 'full')                 // "Wednesday, January 21, 2026"
 */
export const format = (ctx, fmt = 'YYYY-MM-DDTHH:mm:ssZ') => {
    const locale = getLocale(ctx);
    const date = ctx._d;

    // Preset format kontrolü (short, medium, long, full)
    if (PRESETS.includes(fmt)) {
        return new Intl.DateTimeFormat(locale, { dateStyle: fmt }).format(date);
    }

    // Preset with time: 'short-time', 'full-time', etc.
    if (fmt.endsWith('-time')) {
        const style = fmt.replace('-time', '');
        if (PRESETS.includes(style)) {
            return new Intl.DateTimeFormat(locale, {
                dateStyle: style,
                timeStyle: style
            }).format(date);
        }
    }

    // Token-based formatting
    return fmt.replace(TOKEN_REGEX, (match) => {
        // Escaped text: [text]
        if (match[0] === '[') {
            return match.slice(1, -1);
        }

        // Ordinal day: Do (1st, 2nd, 3rd...)
        if (match === 'Do') {
            return ord(date.getDate());
        }

        // AM/PM
        if (match === 'A') {
            return getAmPm(date, locale, true);
        }
        if (match === 'a') {
            return getAmPm(date, locale, false);
        }

        // Timezone offset
        if (match === 'Z') {
            return getOffset(date, true);
        }
        if (match === 'ZZ') {
            return getOffset(date, false);
        }

        // Standard token - Intl.DateTimeFormat kullan
        const opt = T[match];
        if (!opt) return match;

        try {
            const formatted = new Intl.DateTimeFormat(locale, opt).format(date);

            // Hour12 için sadece AM/PM döndürme, hour'u döndür
            if (match === 'HH' || match === 'hh') {
                return formatted.padStart(2, '0');
            }
            if (match === 'mm' || match === 'ss') {
                return formatted.padStart(2, '0');
            }

            return formatted;
        } catch {
            return match;
        }
    });
};

/**
 * Parse a date string with a given format
 * (Basic implementation for common patterns)
 * 
 * @param {string} dateStr - Date string to parse
 * @param {string} fmt - Format string
 * @param {string} [locale] - Locale
 * @returns {Proxy} NanoDate instance
 */
export const parse = (dateStr, fmt, locale) => {
    // ISO format shortcut
    if (fmt === 'YYYY-MM-DD' || fmt === 'YYYY-MM-DDTHH:mm:ss') {
        const d = new Date(dateStr);
        if (!isNaN(d)) {
            // Dynamic import ile circular dependency önle
            const { nano } = require('./index.js');
            return nano(d, locale);
        }
    }

    // Fallback: native Date parsing
    const d = new Date(dateStr);
    const { nano } = require('./index.js');
    return nano(d, locale);
};

export default format;
