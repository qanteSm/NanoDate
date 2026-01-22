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
 * Pre-computed locale name cache
 * Stores weekday names and month names for fast lookup
 * Structure: { locale: { weekdays: [...], weekdaysShort: [...], months: [...], monthsShort: [...] } }
 */
const localeNameCache = Object.create(null);

/**
 * Reference date for extracting locale names (Jan 1, 2024 - a Monday)
 */
const REF_YEAR = 2024;
const REF_DATES = {
    // Monday = 1, so we start from Monday (Jan 1, 2024)
    weekdays: [1, 2, 3, 4, 5, 6, 7].map(d => new Date(2024, 0, d)), // Mon-Sun
    months: Array.from({ length: 12 }, (_, i) => new Date(2024, i, 15))
};

/**
 * Warm up locale cache - extract all names for a locale
 * @param {string} locale - Locale string
 */
const warmLocaleCache = (locale) => {
    if (localeNameCache[locale]) return localeNameCache[locale];
    
    const cache = {
        weekdays: [],      // dddd - Sunday, Monday...
        weekdaysShort: [], // ddd - Sun, Mon...
        weekdaysMin: [],   // dd - Su, Mo...
        months: [],        // MMMM - January, February...
        monthsShort: []    // MMM - Jan, Feb...
    };
    
    try {
        // Weekday formatters
        const wdLong = new Intl.DateTimeFormat(locale, { weekday: 'long' });
        const wdShort = new Intl.DateTimeFormat(locale, { weekday: 'short' });
        const wdNarrow = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
        
        // Month formatters  
        const mLong = new Intl.DateTimeFormat(locale, { month: 'long' });
        const mShort = new Intl.DateTimeFormat(locale, { month: 'short' });
        
        // Pre-computed reference dates for weekday extraction
        // Order: Sunday(0), Monday(1), Tuesday(2), Wednesday(3), Thursday(4), Friday(5), Saturday(6)
        // Using Jan 2024 dates: Sun=7th, Mon=1st, Tue=2nd, Wed=3rd, Thu=4th, Fri=5th, Sat=6th
        const weekdayDates = [
            new Date(2024, 0, 7),  // Sunday (index 0)
            new Date(2024, 0, 1),  // Monday (index 1)
            new Date(2024, 0, 2),  // Tuesday (index 2)
            new Date(2024, 0, 3),  // Wednesday (index 3)
            new Date(2024, 0, 4),  // Thursday (index 4)
            new Date(2024, 0, 5),  // Friday (index 5)
            new Date(2024, 0, 6)   // Saturday (index 6)
        ];
        
        // Extract weekday names
        for (let i = 0; i < 7; i++) {
            cache.weekdays[i] = wdLong.format(weekdayDates[i]);
            cache.weekdaysShort[i] = wdShort.format(weekdayDates[i]);
            cache.weekdaysMin[i] = wdNarrow.format(weekdayDates[i]);
        }
        
        // Extract month names (index 0 = January)
        for (let i = 0; i < 12; i++) {
            const d = REF_DATES.months[i];
            cache.months[i] = mLong.format(d);
            cache.monthsShort[i] = mShort.format(d);
        }
    } catch {
        // Fallback to English
        cache.weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        cache.weekdaysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        cache.weekdaysMin = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
        cache.months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        cache.monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    }
    
    localeNameCache[locale] = cache;
    return cache;
};

/**
 * Get locale names from cache
 * @param {string} locale - Locale string
 * @returns {Object} Cache object with weekdays and months
 */
const getLocaleNames = (locale) => {
    return localeNameCache[locale] || warmLocaleCache(locale);
};

// Note: Removed eager locale warming at module load
// Locales are now warmed lazily on first access for faster startup
// This improves initial load time by ~50-100ms

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
    'hh:mm A': (d) => pad2(d.getHours() % 12 || 12) + ':' + pad2(d.getMinutes()) + ' ' + (d.getHours() < 12 ? 'AM' : 'PM'),
    'h:mm A': (d) => (d.getHours() % 12 || 12) + ':' + pad2(d.getMinutes()) + ' ' + (d.getHours() < 12 ? 'AM' : 'PM'),
    'hh:mm:ss A': (d) => pad2(d.getHours() % 12 || 12) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()) + ' ' + (d.getHours() < 12 ? 'AM' : 'PM'),
    
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
 * Locale-aware precompiled format functions
 * Returns formatter function for locale-dependent formats
 */
const getLocalePrecompiled = (fmt, locale) => {
    const key = fmt + '|' + locale;
    if (compiledCache[key]) return compiledCache[key];
    
    const names = getLocaleNames(locale);
    let fn = null;
    
    switch (fmt) {
        case 'dddd, MMMM D YYYY':
            fn = (d) => names.weekdays[d.getDay()] + ', ' + names.months[d.getMonth()] + ' ' + d.getDate() + ' ' + d.getFullYear();
            break;
        case 'dddd, MMMM Do YYYY':
            fn = (d) => names.weekdays[d.getDay()] + ', ' + names.months[d.getMonth()] + ' ' + ord(d.getDate()) + ' ' + d.getFullYear();
            break;
        case 'dddd, D MMMM YYYY':
            fn = (d) => names.weekdays[d.getDay()] + ', ' + d.getDate() + ' ' + names.months[d.getMonth()] + ' ' + d.getFullYear();
            break;
        case 'ddd, MMM D YYYY':
            fn = (d) => names.weekdaysShort[d.getDay()] + ', ' + names.monthsShort[d.getMonth()] + ' ' + d.getDate() + ' ' + d.getFullYear();
            break;
        case 'ddd, D MMM YYYY':
            fn = (d) => names.weekdaysShort[d.getDay()] + ', ' + d.getDate() + ' ' + names.monthsShort[d.getMonth()] + ' ' + d.getFullYear();
            break;
        case 'MMMM D, YYYY':
            fn = (d) => names.months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
            break;
        case 'D MMMM YYYY':
            fn = (d) => d.getDate() + ' ' + names.months[d.getMonth()] + ' ' + d.getFullYear();
            break;
        case 'MMM D, YYYY':
            fn = (d) => names.monthsShort[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
            break;
        case 'D MMM YYYY':
            fn = (d) => d.getDate() + ' ' + names.monthsShort[d.getMonth()] + ' ' + d.getFullYear();
            break;
        case 'dddd':
            fn = (d) => names.weekdays[d.getDay()];
            break;
        case 'ddd':
            fn = (d) => names.weekdaysShort[d.getDay()];
            break;
        case 'MMMM':
            fn = (d) => names.months[d.getMonth()];
            break;
        case 'MMM':
            fn = (d) => names.monthsShort[d.getMonth()];
            break;
        case 'MMMM YYYY':
            fn = (d) => names.months[d.getMonth()] + ' ' + d.getFullYear();
            break;
        case 'MMM YYYY':
            fn = (d) => names.monthsShort[d.getMonth()] + ' ' + d.getFullYear();
            break;
    }
    
    if (fn) {
        // Cache the compiled function
        if (compiledCacheSize >= MAX_COMPILED_CACHE) {
            const keys = Object.keys(compiledCache);
            for (let i = 0; i < keys.length / 2; i++) {
                delete compiledCache[keys[i]];
            }
            compiledCacheSize = keys.length / 2;
        }
        compiledCache[key] = fn;
        compiledCacheSize++;
    }
    
    return fn;
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
        
        // Fast path: locale-dependent tokens using cached names
        case 'dddd': {
            const names = getLocaleNames(locale);
            return names.weekdays[date.getDay()];
        }
        case 'ddd': {
            const names = getLocaleNames(locale);
            return names.weekdaysShort[date.getDay()];
        }
        case 'dd': {
            const names = getLocaleNames(locale);
            return names.weekdaysMin[date.getDay()];
        }
        case 'MMMM': {
            const names = getLocaleNames(locale);
            return names.months[date.getMonth()];
        }
        case 'MMM': {
            const names = getLocaleNames(locale);
            return names.monthsShort[date.getMonth()];
        }
    }
    
    // Slow path: other locale-dependent tokens
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
    
    // Check for locale-aware precompiled format (second fastest path)
    const localePrecompiled = getLocalePrecompiled(fmt, locale);
    if (localePrecompiled) {
        return localePrecompiled(date);
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
 * Supports common format patterns
 * 
 * @param {string} dateStr - Date string to parse
 * @param {string} fmt - Format string
 * @param {string} [locale] - Locale
 * @param {Function} nanoFactory - nano factory function
 * @returns {Proxy} NanoDate instance
 */
export const parse = (dateStr, fmt, locale, nanoFactory) => {
    if (!dateStr || !fmt) {
        return nanoFactory(new Date(NaN), locale);
    }
    
    // Token definitions with regex patterns
    const tokenDefs = {
        YYYY: { pattern: '(\\d{4})', type: 'year4' },
        YY: { pattern: '(\\d{2})', type: 'year2' },
        MM: { pattern: '(\\d{2})', type: 'month' },
        M: { pattern: '(\\d{1,2})', type: 'month' },
        DD: { pattern: '(\\d{2})', type: 'day' },
        D: { pattern: '(\\d{1,2})', type: 'day' },
        HH: { pattern: '(\\d{2})', type: 'hour24' },
        H: { pattern: '(\\d{1,2})', type: 'hour24' },
        hh: { pattern: '(\\d{2})', type: 'hour12' },
        h: { pattern: '(\\d{1,2})', type: 'hour12' },
        mm: { pattern: '(\\d{2})', type: 'minute' },
        m: { pattern: '(\\d{1,2})', type: 'minute' },
        ss: { pattern: '(\\d{2})', type: 'second' },
        s: { pattern: '(\\d{1,2})', type: 'second' },
        SSS: { pattern: '(\\d{3})', type: 'ms' },
        A: { pattern: '(AM|PM)', type: 'ampm' },
        a: { pattern: '(am|pm)', type: 'ampm' }
    };
    
    // Find all tokens in the format string and their positions
    const tokens = [];
    let tempFmt = fmt;
    
    // Token search order - longest first to avoid partial matches
    const searchOrder = ['YYYY', 'SSS', 'MM', 'DD', 'HH', 'hh', 'mm', 'ss', 'YY', 'M', 'D', 'H', 'h', 'm', 's', 'A', 'a'];
    
    for (const token of searchOrder) {
        let idx = tempFmt.indexOf(token);
        while (idx !== -1) {
            tokens.push({ token, pos: idx, ...tokenDefs[token] });
            // Replace with placeholder to avoid re-matching
            tempFmt = tempFmt.substring(0, idx) + '\x00'.repeat(token.length) + tempFmt.substring(idx + token.length);
            idx = tempFmt.indexOf(token);
        }
    }
    
    // Sort by position
    tokens.sort((a, b) => a.pos - b.pos);
    
    // Build regex from format string
    let regexStr = '';
    let lastEnd = 0;
    
    for (const t of tokens) {
        // Add literal text before this token (escaped)
        if (t.pos > lastEnd) {
            const literal = fmt.substring(lastEnd, t.pos);
            regexStr += literal.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        }
        // Add token pattern
        regexStr += t.pattern;
        lastEnd = t.pos + t.token.length;
    }
    
    // Add remaining literal text
    if (lastEnd < fmt.length) {
        const literal = fmt.substring(lastEnd);
        regexStr += literal.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }
    
    try {
        const regex = new RegExp('^' + regexStr + '$', 'i');
        const match = dateStr.match(regex);
        
        if (!match) {
            return nanoFactory(new Date(NaN), locale);
        }
        
        // Extract values
        const values = {
            year: new Date().getFullYear(),
            month: 0,
            day: 1,
            hour: 0,
            minute: 0,
            second: 0,
            millisecond: 0,
            isPM: null,
            is12Hour: false
        };
        
        for (let i = 0; i < tokens.length; i++) {
            const { type } = tokens[i];
            const value = match[i + 1];
            
            switch (type) {
                case 'year4':
                    values.year = parseInt(value, 10);
                    break;
                case 'year2':
                    values.year = 2000 + parseInt(value, 10);
                    break;
                case 'month':
                    values.month = parseInt(value, 10) - 1;
                    break;
                case 'day':
                    values.day = parseInt(value, 10);
                    break;
                case 'hour24':
                    values.hour = parseInt(value, 10);
                    break;
                case 'hour12':
                    values.hour = parseInt(value, 10);
                    values.is12Hour = true;
                    break;
                case 'minute':
                    values.minute = parseInt(value, 10);
                    break;
                case 'second':
                    values.second = parseInt(value, 10);
                    break;
                case 'ms':
                    values.millisecond = parseInt(value, 10);
                    break;
                case 'ampm':
                    values.isPM = value.toLowerCase() === 'pm';
                    break;
            }
        }
        
        // Handle 12-hour format with AM/PM
        if (values.is12Hour && values.isPM !== null) {
            if (values.isPM && values.hour < 12) {
                values.hour += 12;
            } else if (!values.isPM && values.hour === 12) {
                values.hour = 0;
            }
        }
        
        const d = new Date(
            values.year,
            values.month,
            values.day,
            values.hour,
            values.minute,
            values.second,
            values.millisecond
        );
        
        return nanoFactory(d, locale);
    } catch {
        return nanoFactory(new Date(NaN), locale);
    }
};

export default format;
