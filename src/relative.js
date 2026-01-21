/**
 * NanoDate Relative Time Module
 * Uses Intl.RelativeTimeFormat for zero-locale-payload relative times
 */

/**
 * Time units and their divisors
 * Units are ordered from smallest to largest
 */
const UNITS = [
    { unit: 'second', ms: 1000, max: 60 },
    { unit: 'minute', ms: 60 * 1000, max: 60 },
    { unit: 'hour', ms: 60 * 60 * 1000, max: 24 },
    { unit: 'day', ms: 24 * 60 * 60 * 1000, max: 7 },
    { unit: 'week', ms: 7 * 24 * 60 * 60 * 1000, max: 4.35 },
    { unit: 'month', ms: 30.44 * 24 * 60 * 60 * 1000, max: 12 },
    { unit: 'year', ms: 365.25 * 24 * 60 * 60 * 1000, max: Infinity }
];

/**
 * Get default locale
 */
const getLocale = (ctx) => {
    if (ctx._l) return ctx._l;
    if (typeof navigator !== 'undefined' && navigator.language) {
        return navigator.language;
    }
    return Intl.DateTimeFormat().resolvedOptions().locale || 'en';
};

/**
 * Format relative time from now
 * 
 * @param {Object} ctx - NanoDate context
 * @param {boolean} [withoutSuffix=false] - If true, returns "3 days" instead of "3 days ago"
 * @returns {string} Relative time string (e.g., "3 days ago", "in 2 hours")
 * 
 * @example
 * // Past dates
 * fromNow({ _d: new Date('2026-01-20'), _l: 'en' })  // "1 day ago"
 * fromNow({ _d: new Date('2026-01-14'), _l: 'tr' })  // "1 hafta önce"
 * 
 * // Future dates
 * fromNow({ _d: new Date('2026-01-28'), _l: 'en' })  // "in 7 days"
 */
export const fromNow = (ctx, withoutSuffix = false) => {
    const locale = getLocale(ctx);
    const now = Date.now();
    const diff = ctx._d.getTime() - now;
    const absDiff = Math.abs(diff);

    // Intl.RelativeTimeFormat kullan
    const rtf = new Intl.RelativeTimeFormat(locale, {
        numeric: withoutSuffix ? 'always' : 'auto',
        style: 'long'
    });

    // En uygun birimi bul
    for (const { unit, ms, max } of UNITS) {
        const value = absDiff / ms;
        if (value < max) {
            const roundedValue = Math.round(value);
            // diff pozitifse gelecek, negatifse geçmiş
            return rtf.format(diff > 0 ? roundedValue : -roundedValue, unit);
        }
    }

    // Default to years
    const years = Math.round(absDiff / UNITS[6].ms);
    return rtf.format(diff > 0 ? years : -years, 'year');
};

/**
 * Format relative time to a specific date
 * 
 * @param {Object} ctx - NanoDate context (source date)
 * @param {Object|Date} other - Target date
 * @returns {string} Relative time string
 * 
 * @example
 * toNow({ _d: new Date('2026-01-25') })  // "in 4 days"
 */
export const toNow = (ctx, withoutSuffix = false) => {
    // toNow, fromNow'un tersidir
    const locale = getLocale(ctx);
    const now = Date.now();
    const diff = now - ctx._d.getTime();
    const absDiff = Math.abs(diff);

    const rtf = new Intl.RelativeTimeFormat(locale, {
        numeric: withoutSuffix ? 'always' : 'auto',
        style: 'long'
    });

    for (const { unit, ms, max } of UNITS) {
        const value = absDiff / ms;
        if (value < max) {
            const roundedValue = Math.round(value);
            return rtf.format(diff > 0 ? roundedValue : -roundedValue, unit);
        }
    }

    const years = Math.round(absDiff / UNITS[6].ms);
    return rtf.format(diff > 0 ? years : -years, 'year');
};

/**
 * Get relative time between two dates
 * 
 * @param {Object} ctx - NanoDate context (source date)
 * @param {Object|Date|string} other - Target date
 * @returns {string} Relative time string
 */
export const from = (ctx, other) => {
    const locale = getLocale(ctx);
    const otherDate = other._d || new Date(other);
    const diff = ctx._d.getTime() - otherDate.getTime();
    const absDiff = Math.abs(diff);

    const rtf = new Intl.RelativeTimeFormat(locale, {
        numeric: 'auto',
        style: 'long'
    });

    for (const { unit, ms, max } of UNITS) {
        const value = absDiff / ms;
        if (value < max) {
            const roundedValue = Math.round(value);
            return rtf.format(diff > 0 ? roundedValue : -roundedValue, unit);
        }
    }

    const years = Math.round(absDiff / UNITS[6].ms);
    return rtf.format(diff > 0 ? years : -years, 'year');
};

export default fromNow;
