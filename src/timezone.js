/**
 * NanoDate Timezone Module
 * Zero-cost timezone handling using native Intl API
 */

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
        return new Intl.DateTimeFormat(locale, {
            dateStyle: format,
            timeZone: timezone
        }).format(ctx._d);
    }

    if (format && format.endsWith('-time')) {
        const style = format.replace('-time', '');
        if (presets.includes(style)) {
            return new Intl.DateTimeFormat(locale, {
                dateStyle: style,
                timeStyle: style,
                timeZone: timezone
            }).format(ctx._d);
        }
    }

    // Default: date and time
    return new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'medium',
        timeZone: timezone
    }).format(ctx._d);
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
 * Get UTC offset in minutes
 * 
 * @param {Object} ctx - NanoDate context
 * @returns {number} UTC offset in minutes (e.g., 180 for UTC+3)
 * 
 * @example
 * utcOffset(ctx)  // 180 (for Istanbul, UTC+3)
 */
export const utcOffset = (ctx) => {
    return -ctx._d.getTimezoneOffset();
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
    getTimezone,
    utcOffset,
    utcOffsetString,
    isValidTimezone,
    COMMON_TIMEZONES
};
