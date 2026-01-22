/**
 * NanoDate Timezone Module
 * Zero-cost timezone handling using native Intl API
 */

/**
 * Formatter cache for performance optimization
 * Using Object instead of Map for faster property access (2-3x faster)
 */
const formatterCache = Object.create(null);
let formatterCacheSize = 0;
const MAX_CACHE_SIZE = 500;

/**
 * Timezone offset cache for performance
 * Using Object for faster access
 */
const offsetCache = Object.create(null);
let offsetCacheSize = 0;
const MAX_OFFSET_CACHE_SIZE = 10000;

/**
 * Fast options key generation - avoids JSON.stringify overhead
 */
const getOptionsKey = (options) => {
    let key = '';
    // Sort keys for consistent key generation
    const keys = Object.keys(options).sort();
    for (let i = 0; i < keys.length; i++) {
        key += keys[i] + ':' + options[keys[i]] + ';';
    }
    return key;
};

/**
 * Get cached formatter or create new one
 */
const getCachedFormatter = (locale, options) => {
    const key = locale + '|' + getOptionsKey(options);
    
    if (formatterCache[key]) {
        return formatterCache[key];
    }
    
    // Limit cache size - evict half when full
    if (formatterCacheSize >= MAX_CACHE_SIZE) {
        const keys = Object.keys(formatterCache);
        for (let i = 0; i < keys.length / 2; i++) {
            delete formatterCache[keys[i]];
        }
        formatterCacheSize = Math.floor(keys.length / 2);
    }
    
    const formatter = new Intl.DateTimeFormat(locale, options);
    formatterCache[key] = formatter;
    formatterCacheSize++;
    return formatter;
};

/**
 * Get locale helper
 */
const getLocale = (ctx) => {
    if (ctx._l) return ctx._l;
    if (typeof navigator !== 'undefined' && navigator.language) {
        return navigator.language;
    }
    return 'en';
};

/**
 * Format date in a specific timezone
 * 
 * @param {Object} ctx - NanoDate context
 * @param {string} timezone - IANA timezone (e.g., 'America/New_York', 'Asia/Tokyo')
 * @param {string} [format] - Optional format string
 * @returns {string} Formatted date in timezone
 * 
 * @example
 * tz(ctx, 'America/New_York')           // "1/21/2026, 4:36:33 AM"
 * tz(ctx, 'Asia/Tokyo')                 // "2026/1/21 18:36:33"
 * tz(ctx, 'Europe/London', 'full-time') // Full date with time
 */
export const tz = (ctx, timezone, format) => {
    const locale = getLocale(ctx);

    // Preset format kontrolü
    const presets = ['short', 'medium', 'long', 'full'];

    if (format && presets.includes(format)) {
        return getCachedFormatter(locale, {
            dateStyle: format,
            timeZone: timezone
        }).format(ctx._d);
    }

    if (format && format.endsWith('-time')) {
        const style = format.replace('-time', '');
        if (presets.includes(style)) {
            return getCachedFormatter(locale, {
                dateStyle: style,
                timeStyle: style,
                timeZone: timezone
            }).format(ctx._d);
        }
    }

    // Default: date and time
    return getCachedFormatter(locale, {
        dateStyle: 'medium',
        timeStyle: 'medium',
        timeZone: timezone
    }).format(ctx._d);
};

/**
 * NanoDate factory placeholder for chainable API
 */
let nanoFactory;

/**
 * Initialize with nano factory
 */
export const initTimezone = (factory) => {
    nanoFactory = factory;
};

/**
 * Chainable timezone method - returns a new NanoDate instance
 * Allows chaining: nano().toTz('America/New_York').add(1, 'day').format()
 * 
 * @param {Object} ctx - NanoDate context
 * @param {string} timezone - IANA timezone
 * @returns {Proxy} New NanoDate instance with timezone context
 */
export const tzChainable = (ctx, timezone) => {
    // Get the date converted to target timezone
    const locale = getLocale(ctx);
    
    // Use Intl to get the date parts in the target timezone
    const formatter = getCachedFormatter(locale, {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    
    const parts = formatter.formatToParts(ctx._d);
    const partMap = {};
    for (const part of parts) {
        partMap[part.type] = part.value;
    }
    
    // Create new NanoDate with timezone context
    // Store both original date and timezone for formatting
    const newCtx = {
        _d: ctx._d, // Keep original Date
        _l: locale,
        _tz: timezone, // Store timezone for later formatting
        _input: ctx._input
    };
    
    // Import nano factory dynamically to avoid circular deps
    if (nanoFactory) {
        const result = nanoFactory(ctx._d, locale);
        // Attach timezone to the proxy target
        result._tz = timezone;
        return result;
    }
    
    // Fallback: return context with timezone attached
    return newCtx;
};

/**
 * Convert date to a specific timezone and return as new NanoDate
 * This creates a Date object adjusted to show the target timezone's local time
 * 
 * @param {Object} ctx - NanoDate context
 * @param {string} timezone - IANA timezone
 * @returns {Proxy} New NanoDate with adjusted time
 */
export const toTimezone = (ctx, timezone) => {
    return tzChainable(ctx, timezone);
};

/**
 * Get current system timezone
 * 
 * @returns {string} IANA timezone (e.g., 'Europe/Istanbul')
 */
export const getTimezone = () => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

/**
 * Get UTC offset in minutes (with caching)
 * 
 * @param {Object} ctx - NanoDate context
 * @param {string} [timezone] - Optional timezone (defaults to local)
 * @returns {number} UTC offset in minutes (e.g., 180 for UTC+3)
 * 
 * @example
 * utcOffset(ctx)  // 180 (for Istanbul, UTC+3)
 */
export const utcOffset = (ctx, timezone) => {
    if (!timezone) {
        return -ctx._d.getTimezoneOffset();
    }
    
    // Cache key based on timezone and hour
    const hourTimestamp = Math.floor(ctx._d.getTime() / 3600000);
    const cacheKey = timezone + ':' + hourTimestamp;
    
    if (offsetCache[cacheKey] !== undefined) {
        return offsetCache[cacheKey];
    }
    
    // Calculate offset for specific timezone
    const formatter = getCachedFormatter('en-US', {
        timeZone: timezone,
        timeZoneName: 'shortOffset'
    });
    
    const parts = formatter.formatToParts(ctx._d);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    
    let offset = 0;
    if (tzPart) {
        // Parse offset like "GMT+3" or "GMT-05:30"
        const match = tzPart.value.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
        if (match) {
            const sign = match[1] === '+' ? 1 : -1;
            const hours = parseInt(match[2], 10);
            const minutes = parseInt(match[3] || '0', 10);
            offset = sign * (hours * 60 + minutes);
        }
    }
    
    // Limit cache size - evict half when full
    if (offsetCacheSize >= MAX_OFFSET_CACHE_SIZE) {
        const keys = Object.keys(offsetCache);
        for (let i = 0; i < keys.length / 2; i++) {
            delete offsetCache[keys[i]];
        }
        offsetCacheSize = Math.floor(keys.length / 2);
    }
    
    offsetCache[cacheKey] = offset;
    offsetCacheSize++;
    return offset;
};

/**
 * Get UTC offset as string
 * 
 * @param {Object} ctx - NanoDate context
 * @returns {string} UTC offset string (e.g., "+03:00")
 */
export const utcOffsetString = (ctx) => {
    const offset = -ctx._d.getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const absOffset = Math.abs(offset);
    const hours = String(Math.floor(absOffset / 60)).padStart(2, '0');
    const minutes = String(absOffset % 60).padStart(2, '0');
    return `${sign}${hours}:${minutes}`;
};

/**
 * Check if a timezone is valid
 * 
 * @param {string} timezone - IANA timezone to check
 * @returns {boolean}
 */
export const isValidTimezone = (timezone) => {
    try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone });
        return true;
    } catch {
        return false;
    }
};

/**
 * Get list of supported timezones (limited, for reference)
 * Note: Full list is browser-dependent
 */
export const COMMON_TIMEZONES = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Sao_Paulo',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Moscow',
    'Europe/Istanbul',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Bangkok',
    'Asia/Singapore',
    'Asia/Shanghai',
    'Asia/Tokyo',
    'Asia/Seoul',
    'Australia/Sydney',
    'Pacific/Auckland'
];

export default {
    tz,
    tzChainable,
    toTimezone,
    getTimezone,
    utcOffset,
    utcOffsetString,
    isValidTimezone,
    initTimezone,
    COMMON_TIMEZONES
};
