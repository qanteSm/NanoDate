/**
 * NanoDate Lite - Ultra minimal core (~500 bytes gzipped)
 * For basic date formatting with zero locale payload
 * 
 * Import full version for all features:
 * import { nano } from 'nanodate';
 * 
 * Import lite for minimal bundle:
 * import { nano } from 'nanodate/lite';
 */

// Token map - minimal
const T = {
    YYYY: { year: 'numeric' },
    MM: { month: '2-digit' },
    DD: { day: '2-digit' },
    HH: { hour: '2-digit', hour12: false },
    mm: { minute: '2-digit' },
    ss: { second: '2-digit' }
};

// Ordinal suffix
const ord = n => n + (['', 'st', 'nd', 'rd'][(n % 100 >> 3) ^ 1 && n % 10] || 'th');

// Get locale
const loc = l => l || (typeof navigator !== 'undefined' ? navigator.language : 'en');

// Token regex
const R = /\[([^\]]+)]|YYYY|MMMM|MMM|MM|M|Do|DD|D|dddd|ddd|HH|H|mm|m|ss|s/g;

// Extended tokens (lazy)
const ext = {
    MMMM: { month: 'long' },
    MMM: { month: 'short' },
    M: { month: 'numeric' },
    D: { day: 'numeric' },
    dddd: { weekday: 'long' },
    ddd: { weekday: 'short' },
    H: { hour: 'numeric', hour12: false },
    m: { minute: 'numeric' },
    s: { second: 'numeric' }
};

// Format
const format = (d, l, f = 'YYYY-MM-DD') => {
    const locale = loc(l);
    return f.replace(R, m => {
        if (m[0] === '[') return m.slice(1, -1);
        if (m === 'Do') return ord(d.getDate());
        const o = T[m] || ext[m];
        return o ? new Intl.DateTimeFormat(locale, o).format(d) : m;
    });
};

// MS per unit
const MS = { d: 864e5, h: 36e5, m: 6e4, s: 1e3 };

// Methods
const methods = {
    format: (ctx, f) => format(ctx._d, ctx._l, f),
    add: (ctx, v, u) => {
        const d = new Date(ctx._d);
        const k = u[0];
        if (k === 'y') d.setFullYear(d.getFullYear() + v);
        else if (k === 'M') d.setMonth(d.getMonth() + v);
        else d.setTime(d.getTime() + v * (MS[k] || 1));
        return nano(d, ctx._l);
    },
    subtract: (ctx, v, u) => methods.add(ctx, -v, u),
    year: ctx => ctx._d.getFullYear(),
    month: ctx => ctx._d.getMonth(),
    date: ctx => ctx._d.getDate(),
    day: ctx => ctx._d.getDay(),
    hour: ctx => ctx._d.getHours(),
    minute: ctx => ctx._d.getMinutes(),
    second: ctx => ctx._d.getSeconds(),
    valueOf: ctx => ctx._d.getTime(),
    toISOString: ctx => ctx._d.toISOString(),
    toDate: ctx => new Date(ctx._d),
    isValid: ctx => !isNaN(ctx._d)
};

// Proxy handler
const handler = {
    get: (t, p) => p in methods ? (...a) => methods[p](t, ...a) :
        p === Symbol.toPrimitive ? h => h === 'number' ? t._d.getTime() : '' + t._d :
            p === 'toString' ? () => '' + t._d : t[p]
};

/**
 * Create NanoDate instance
 * @param {*} input - Date input
 * @param {string} locale - Locale
 */
export const nano = (input, locale) => {
    const d = input?._d ? new Date(input._d) : input ? new Date(input) : new Date();
    return new Proxy({ _d: d, _l: locale || input?._l }, handler);
};

export default nano;
