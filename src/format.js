/**
 * NanoDate Format Module
 * Ultra-optimized token-based formatter
 * 
 * Optimizations:
 * - Pre-compiled format functions for common patterns (bypass regex)
 * - Cached Intl.DateTimeFormat instances
 * - Token parsing cache
 * - Inline value extraction (avoid function calls)
 * - Array-based string building
 */

/**
 * Zero-pad lookup table for 0-99 (faster than padStart)
 */
const PAD2 = Array.from({ length: 100 }, (_, i) => i < 10 ? '0' + i : String(i));

/**
 * Fast zero-pad for 2-digit numbers
 */
const pad2 = (n) => PAD2[n] || String(n).padStart(2, '0');

/**
 * Fast zero-pad for 3-digit numbers (milliseconds)
 */
const pad3 = (n) => n < 10 ? '00' + n : n < 100 ? '0' + n : String(n);

/**
 * Precompiled format functions for common patterns
 * These bypass regex parsing for maximum performance (~10x faster)
 */
const PRECOMPILED = {
    // Date formats
    'YYYY-MM-DD': (d) => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()),
    'YYYY/MM/DD': (d) => d.getFullYear() + '/' + pad2(d.getMonth() + 1) + '/' + pad2(d.getDate()),
    'DD/MM/YYYY': (d) => pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear(),
    'MM/DD/YYYY': (d) => pad2(d.getMonth() + 1) + '/' + pad2(d.getDate()) + '/' + d.getFullYear(),
    'DD-MM-YYYY': (d) => pad2(d.getDate()) + '-' + pad2(d.getMonth() + 1) + '-' + d.getFullYear(),
    'DD.MM.YYYY': (d) => pad2(d.getDate()) + '.' + pad2(d.getMonth() + 1) + '.' + d.getFullYear(),
    
    // Time formats
    'HH:mm': (d) => pad2(d.getHours()) + ':' + pad2(d.getMinutes()),
    'HH:mm:ss': (d) => pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()),
    'HH:mm:ss.SSS': (d) => pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()) + '.' + pad3(d.getMilliseconds()),
    
    // DateTime formats
    'YYYY-MM-DDTHH:mm:ss': (d) => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + 'T' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()),
    'YYYY-MM-DD HH:mm': (d) => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()),
    'YYYY-MM-DD HH:mm:ss': (d) => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()),
    'DD/MM/YYYY HH:mm': (d) => pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()),
    'MM/DD/YYYY HH:mm': (d) => pad2(d.getMonth() + 1) + '/' + pad2(d.getDate()) + '/' + d.getFullYear() + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()),
    
    // ISO formats with timezone
    'YYYY-MM-DDTHH:mm:ssZ': (d) => {
        const offset = -d.getTimezoneOffset();
        const sign = offset >= 0 ? '+' : '-';
        const absOffset = Math.abs(offset);
        return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + 'T' + 
               pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()) + 
               sign + pad2((absOffset / 60) | 0) + ':' + pad2(absOffset % 60);
    },
    'YYYY-MM-DDTHH:mm:ss.SSSZ': (d) => {
        const offset = -d.getTimezoneOffset();
        const sign = offset >= 0 ? '+' : '-';
        const absOffset = Math.abs(offset);
        return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + 'T' + 
               pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()) + '.' + pad3(d.getMilliseconds()) +
               sign + pad2((absOffset / 60) | 0) + ':' + pad2(absOffset % 60);
    },
    
    // Special
    'ISO': (d) => d.toISOString(),
    'X': (d) => String((d.getTime() / 1000) | 0),  // Unix timestamp (seconds)
    'x': (d) => String(d.getTime())  // Unix timestamp (milliseconds)
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
 * Formatter cache - Intl.DateTimeFormat instances are expensive to create
 * Using Object for faster property access than Map for small caches
 */
const formatterCache = Object.create(null);
let formatterCacheSize = 0;
const MAX_FORMATTER_CACHE = 200;

/**
 * Parsed token cache for format strings
 * Using Object for faster property access
 */
const tokenCache = Object.create(null);
let tokenCacheSize = 0;
const MAX_TOKEN_CACHE = 150;

/**
 * Compiled format function cache
 * Maps format string -> compiled function for ultimate speed
 */
const compiledCache = Object.create(null);
let compiledCacheSize = 0;
const MAX_COMPILED_CACHE = 100;

/**
 * Fast key generation for formatter cache
 * Avoids JSON.stringify overhead for simple options
 */
const getOptionsKey = (options) => {
    let key = '';
    for (const k in options) {
        key += k + ':' + options[k] + ';';
    }
    return key;
};

/**
 * Get cached Intl.DateTimeFormat instance
 * @param {string} locale - Locale string
 * @param {Object} options - DateTimeFormat options
 * @returns {Intl.DateTimeFormat}
 */
const getFormatter = (locale, options) => {
    const key = locale + '|' + getOptionsKey(options);
    let formatter = formatterCache[key];
    if (!formatter) {
        // Simple cache eviction - clear half when full
        if (formatterCacheSize >= MAX_FORMATTER_CACHE) {
            const keys = Object.keys(formatterCache);
            for (let i = 0; i < keys.length / 2; i++) {
                delete formatterCache[keys[i]];
            }
            formatterCacheSize = keys.length / 2;
        }
        formatter = new Intl.DateTimeFormat(locale, options);
        formatterCache[key] = formatter;
        formatterCacheSize++;
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
 * Returns array of [type, value] tuples for faster iteration
 * type: 0 = literal, 1 = token
 * @param {string} fmt - Format string
 * @returns {Array} Array of [type, value] tuples
 */
const parseFormatTokens = (fmt) => {
    const cached = tokenCache[fmt];
    if (cached) return cached;
    
    const tokens = [];
    let lastIndex = 0;
    let match;
    
    // Reset regex state
    TOKEN_REGEX.lastIndex = 0;
    
    while ((match = TOKEN_REGEX.exec(fmt)) !== null) {
        // Add literal text before this match
        if (match.index > lastIndex) {
            tokens.push([0, fmt.slice(lastIndex, match.index)]);
        }
        
        // Add token
        if (match[0][0] === '[') {
            // Escaped text
            tokens.push([0, match[1]]);
        } else {
            tokens.push([1, match[0]]);
        }
        
        lastIndex = match.index + match[0].length;
    }
    
    // Add remaining literal text
    if (lastIndex < fmt.length) {
        tokens.push([0, fmt.slice(lastIndex)]);
    }
    
    // Cache management
    if (tokenCacheSize >= MAX_TOKEN_CACHE) {
        const keys = Object.keys(tokenCache);
        for (let i = 0; i < keys.length / 2; i++) {
            delete tokenCache[keys[i]];
        }
        tokenCacheSize = keys.length / 2;
    }
    
    tokenCache[fmt] = tokens;
    tokenCacheSize++;
    return tokens;
};

/**
 * Fast 12-hour conversion
 */
const to12Hour = (h) => {
    const hour = h % 12;
    return hour === 0 ? 12 : hour;
};

/**
 * Format a single token - ultra-optimized
 * Uses direct value extraction where possible, falls back to Intl only when needed
 * @param {string} token - Token to format
 * @param {Date} date - Date object
 * @param {string} locale - Locale string
 * @returns {string} Formatted value
 */
const formatToken = (token, date, locale) => {
    // Fast path: numeric tokens without locale dependency
    switch (token) {
        // Year
        case 'YYYY': return String(date.getFullYear());
        case 'YY': return String(date.getFullYear()).slice(-2);
        
        // Month (numeric)
        case 'MM': return pad2(date.getMonth() + 1);
        case 'M': return String(date.getMonth() + 1);
        
        // Day
        case 'DD': return pad2(date.getDate());
        case 'D': return String(date.getDate());
        case 'Do': return ord(date.getDate());
        
        // Hour (24h)
        case 'HH': return pad2(date.getHours());
        case 'H': return String(date.getHours());
        
        // Hour (12h)
        case 'hh': return pad2(to12Hour(date.getHours()));
        case 'h': return String(to12Hour(date.getHours()));
        
        // Minute
        case 'mm': return pad2(date.getMinutes());
        case 'm': return String(date.getMinutes());
        
        // Second
        case 'ss': return pad2(date.getSeconds());
        case 's': return String(date.getSeconds());
        
        // Millisecond
        case 'SSS': return pad3(date.getMilliseconds());
        
        // AM/PM (fast path for 'en' locale)
        case 'A': 
            if (!locale || locale.startsWith('en')) {
                return date.getHours() < 12 ? 'AM' : 'PM';
            }
            return getAmPm(date, locale, true);
        case 'a':
            if (!locale || locale.startsWith('en')) {
                return date.getHours() < 12 ? 'am' : 'pm';
            }
            return getAmPm(date, locale, false);
        
        // Timezone
        case 'Z': return getOffset(date, true);
        case 'ZZ': return getOffset(date, false);
    }
    
    // Slow path: locale-dependent tokens (month names, weekday names)
    const opt = T[token];
    if (!opt) return token;

    try {
        return getFormatter(locale, opt).format(date);
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
    
    // Use array join for better string building performance
    const parts = [];
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        // token[0] = type (0=literal, 1=token), token[1] = value
        parts.push(token[0] === 0 ? token[1] : formatToken(token[1], date, locale));
    }
    
    return parts.join('');
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
