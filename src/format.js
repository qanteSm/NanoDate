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
 * Zero-pad a number to specified width
 */
const pad = (n, width = 2) => String(n).padStart(width, '0');

/**
 * Precompiled format functions for common patterns
 * These bypass regex parsing for maximum performance
 */
const PRECOMPILED = {
    'YYYY-MM-DD': (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    'YYYY-MM-DDTHH:mm:ss': (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
    'YYYY-MM-DDTHH:mm:ssZ': (d) => {
        const offset = -d.getTimezoneOffset();
        const sign = offset >= 0 ? '+' : '-';
        const absOffset = Math.abs(offset);
        const hours = pad(Math.floor(absOffset / 60));
        const minutes = pad(absOffset % 60);
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${hours}:${minutes}`;
    },
    'DD/MM/YYYY': (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`,
    'MM/DD/YYYY': (d) => `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`,
    'HH:mm': (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    'HH:mm:ss': (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
    'ISO': (d) => d.toISOString()
};

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
 * Formatter cache for 10x+ performance
 * Intl.DateTimeFormat instances are expensive to create
 */
const formatterCache = new Map();
const MAX_FORMATTER_CACHE = 200;

/**
 * Parsed token cache for format strings
 */
const tokenCache = new Map();
const MAX_TOKEN_CACHE = 100;

/**
 * Get cached Intl.DateTimeFormat instance
 * @param {string} locale - Locale string
 * @param {Object} options - DateTimeFormat options
 * @returns {Intl.DateTimeFormat}
 */
const getFormatter = (locale, options) => {
    const key = locale + JSON.stringify(options);
    let formatter = formatterCache.get(key);
    if (!formatter) {
        // Limit cache size
        if (formatterCache.size >= MAX_FORMATTER_CACHE) {
            const firstKey = formatterCache.keys().next().value;
            formatterCache.delete(firstKey);
        }
        formatter = new Intl.DateTimeFormat(locale, options);
        formatterCache.set(key, formatter);
    }
    return formatter;
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
    const formatter = getFormatter(locale, {
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
 * Compiled once at module load for performance
 */
const TOKEN_REGEX = /\[([^\]]+)]|YYYY|YY|MMMM|MMM|MM|M|Do|DD|D|dddd|ddd|dd|HH|H|hh|h|mm|m|ss|s|SSS|A|a|ZZ|Z/g;

/**
 * Parse format string into tokens (cached)
 * @param {string} fmt - Format string
 * @returns {Array} Array of token objects
 */
const parseFormatTokens = (fmt) => {
    if (tokenCache.has(fmt)) {
        return tokenCache.get(fmt);
    }
    
    const tokens = [];
    let lastIndex = 0;
    let match;
    
    // Reset regex state
    TOKEN_REGEX.lastIndex = 0;
    
    while ((match = TOKEN_REGEX.exec(fmt)) !== null) {
        // Add literal text before this match
        if (match.index > lastIndex) {
            tokens.push({ type: 'literal', value: fmt.slice(lastIndex, match.index) });
        }
        
        // Add token
        if (match[0][0] === '[') {
            // Escaped text
            tokens.push({ type: 'literal', value: match[1] });
        } else {
            tokens.push({ type: 'token', value: match[0] });
        }
        
        lastIndex = match.index + match[0].length;
    }
    
    // Add remaining literal text
    if (lastIndex < fmt.length) {
        tokens.push({ type: 'literal', value: fmt.slice(lastIndex) });
    }
    
    // Limit cache size
    if (tokenCache.size >= MAX_TOKEN_CACHE) {
        const firstKey = tokenCache.keys().next().value;
        tokenCache.delete(firstKey);
    }
    
    tokenCache.set(fmt, tokens);
    return tokens;
};

/**
 * Format a single token
 * @param {string} token - Token to format
 * @param {Date} date - Date object
 * @param {string} locale - Locale string
 * @returns {string} Formatted value
 */
const formatToken = (token, date, locale) => {
    // Ordinal day: Do (1st, 2nd, 3rd...)
    if (token === 'Do') {
        return ord(date.getDate());
    }

    // AM/PM
    if (token === 'A') {
        return getAmPm(date, locale, true);
    }
    if (token === 'a') {
        return getAmPm(date, locale, false);
    }

    // Timezone offset
    if (token === 'Z') {
        return getOffset(date, true);
    }
    if (token === 'ZZ') {
        return getOffset(date, false);
    }

    // 12-hour format - extract only hour value (no AM/PM)
    if (token === 'hh' || token === 'h') {
        const formatter = getFormatter(locale, {
            hour: 'numeric',
            hour12: true
        });
        const parts = formatter.formatToParts(date);
        const hourPart = parts.find(p => p.type === 'hour');
        if (hourPart) {
            return token === 'hh' ? hourPart.value.padStart(2, '0') : hourPart.value;
        }
        // Fallback
        let hour = date.getHours() % 12;
        if (hour === 0) hour = 12;
        return token === 'hh' ? String(hour).padStart(2, '0') : String(hour);
    }

    // Standard token - Intl.DateTimeFormat kullan
    const opt = T[token];
    if (!opt) return token;

    try {
        const formatted = getFormatter(locale, opt).format(date);

        // 2-digit padding for HH, mm, ss
        if (token === 'HH' || token === 'mm' || token === 'ss') {
            return formatted.padStart(2, '0');
        }

        return formatted;
    } catch {
        return token;
    }
};

/**
 * Format a NanoDate using a format string or preset
 * 
 * @param {Object} ctx - NanoDate context (_d: Date, _l: locale)
 * @param {string} [fmt='YYYY-MM-DDTHH:mm:ssZ'] - Format string or preset
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

    // Check for precompiled format first (fastest path)
    if (PRECOMPILED[fmt]) {
        return PRECOMPILED[fmt](date);
    }

    // Preset format kontrolü (short, medium, long, full)
    if (PRESETS.includes(fmt)) {
        return getFormatter(locale, { dateStyle: fmt }).format(date);
    }

    // Preset with time: 'short-time', 'full-time', etc.
    if (fmt.endsWith('-time')) {
        const style = fmt.replace('-time', '');
        if (PRESETS.includes(style)) {
            return getFormatter(locale, {
                dateStyle: style,
                timeStyle: style
            }).format(date);
        }
    }

    // Token-based formatting with caching
    const tokens = parseFormatTokens(fmt);
    let result = '';
    
    for (const token of tokens) {
        if (token.type === 'literal') {
            result += token.value;
        } else {
            result += formatToken(token.value, date, locale);
        }
    }
    
    return result;
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
