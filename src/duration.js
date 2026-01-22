/**
 * NanoDate Duration Module
 * High-performance duration representation and manipulation
 * 
 * Optimizations:
 * - Pre-computed millisecond constants
 * - Inline calculations
 * - Lazy formatting
 * - Zero-allocation arithmetic
 */

// ============================================
// CONSTANTS
// ============================================

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60000;
const MS_PER_HOUR = 3600000;
const MS_PER_DAY = 86400000;
const MS_PER_WEEK = 604800000;
const MS_PER_MONTH = 2629746000; // Average month (30.44 days)
const MS_PER_YEAR = 31556952000; // Average year (365.25 days)

/**
 * Unit names cache by locale
 */
const unitNamesCache = Object.create(null);

/**
 * Get localized unit names
 * @param {string} locale - Locale string
 * @returns {Object} Unit names
 */
const getUnitNames = (locale) => {
    if (unitNamesCache[locale]) return unitNamesCache[locale];
    
    const lang = locale.split('-')[0];
    
    const names = {
        en: {
            year: 'year', years: 'years',
            month: 'month', months: 'months',
            week: 'week', weeks: 'weeks',
            day: 'day', days: 'days',
            hour: 'hour', hours: 'hours',
            minute: 'minute', minutes: 'minutes',
            second: 'second', seconds: 'seconds'
        },
        tr: {
            year: 'yıl', years: 'yıl',
            month: 'ay', months: 'ay',
            week: 'hafta', weeks: 'hafta',
            day: 'gün', days: 'gün',
            hour: 'saat', hours: 'saat',
            minute: 'dakika', minutes: 'dakika',
            second: 'saniye', seconds: 'saniye'
        },
        de: {
            year: 'Jahr', years: 'Jahre',
            month: 'Monat', months: 'Monate',
            week: 'Woche', weeks: 'Wochen',
            day: 'Tag', days: 'Tage',
            hour: 'Stunde', hours: 'Stunden',
            minute: 'Minute', minutes: 'Minuten',
            second: 'Sekunde', seconds: 'Sekunden'
        },
        fr: {
            year: 'an', years: 'ans',
            month: 'mois', months: 'mois',
            week: 'semaine', weeks: 'semaines',
            day: 'jour', days: 'jours',
            hour: 'heure', hours: 'heures',
            minute: 'minute', minutes: 'minutes',
            second: 'seconde', seconds: 'secondes'
        },
        es: {
            year: 'año', years: 'años',
            month: 'mes', months: 'meses',
            week: 'semana', weeks: 'semanas',
            day: 'día', days: 'días',
            hour: 'hora', hours: 'horas',
            minute: 'minuto', minutes: 'minutos',
            second: 'segundo', seconds: 'segundos'
        },
        ja: {
            year: '年', years: '年',
            month: 'ヶ月', months: 'ヶ月',
            week: '週間', weeks: '週間',
            day: '日', days: '日',
            hour: '時間', hours: '時間',
            minute: '分', minutes: '分',
            second: '秒', seconds: '秒'
        },
        zh: {
            year: '年', years: '年',
            month: '个月', months: '个月',
            week: '周', weeks: '周',
            day: '天', days: '天',
            hour: '小时', hours: '小时',
            minute: '分钟', minutes: '分钟',
            second: '秒', seconds: '秒'
        },
        ko: {
            year: '년', years: '년',
            month: '개월', months: '개월',
            week: '주', weeks: '주',
            day: '일', days: '일',
            hour: '시간', hours: '시간',
            minute: '분', minutes: '분',
            second: '초', seconds: '초'
        },
        ar: {
            year: 'سنة', years: 'سنوات',
            month: 'شهر', months: 'أشهر',
            week: 'أسبوع', weeks: 'أسابيع',
            day: 'يوم', days: 'أيام',
            hour: 'ساعة', hours: 'ساعات',
            minute: 'دقيقة', minutes: 'دقائق',
            second: 'ثانية', seconds: 'ثواني'
        },
        ru: {
            year: 'год', years: 'лет',
            month: 'месяц', months: 'месяцев',
            week: 'неделя', weeks: 'недель',
            day: 'день', days: 'дней',
            hour: 'час', hours: 'часов',
            minute: 'минута', minutes: 'минут',
            second: 'секунда', seconds: 'секунд'
        }
    };
    
    unitNamesCache[locale] = names[lang] || names.en;
    return unitNamesCache[locale];
};

/**
 * Duration class for representing time intervals
 * Immutable and chainable
 */
class Duration {
    /**
     * Create a Duration from milliseconds or duration object
     * @param {number|Object} input - Milliseconds or duration object
     */
    constructor(input) {
        if (typeof input === 'number') {
            this._ms = input;
        } else if (input && typeof input === 'object') {
            this._ms = Duration.toMilliseconds(input);
        } else {
            this._ms = 0;
        }
    }

    /**
     * Convert duration object to milliseconds
     * @param {Object} obj - Duration object
     * @returns {number} Total milliseconds
     */
    static toMilliseconds(obj) {
        let ms = 0;
        
        if (obj.years || obj.year || obj.y) {
            ms += (obj.years || obj.year || obj.y) * MS_PER_YEAR;
        }
        if (obj.months || obj.month || obj.M) {
            ms += (obj.months || obj.month || obj.M) * MS_PER_MONTH;
        }
        if (obj.weeks || obj.week || obj.w) {
            ms += (obj.weeks || obj.week || obj.w) * MS_PER_WEEK;
        }
        if (obj.days || obj.day || obj.d) {
            ms += (obj.days || obj.day || obj.d) * MS_PER_DAY;
        }
        if (obj.hours || obj.hour || obj.h) {
            ms += (obj.hours || obj.hour || obj.h) * MS_PER_HOUR;
        }
        if (obj.minutes || obj.minute || obj.m) {
            ms += (obj.minutes || obj.minute || obj.m) * MS_PER_MINUTE;
        }
        if (obj.seconds || obj.second || obj.s) {
            ms += (obj.seconds || obj.second || obj.s) * MS_PER_SECOND;
        }
        if (obj.milliseconds || obj.millisecond || obj.ms) {
            ms += (obj.milliseconds || obj.millisecond || obj.ms);
        }
        
        return ms;
    }

    // ============================================
    // GETTERS - Return specific unit values
    // ============================================

    /**
     * Get total milliseconds
     */
    asMilliseconds() {
        return this._ms;
    }

    /**
     * Get total seconds (float)
     */
    asSeconds() {
        return this._ms / MS_PER_SECOND;
    }

    /**
     * Get total minutes (float)
     */
    asMinutes() {
        return this._ms / MS_PER_MINUTE;
    }

    /**
     * Get total hours (float)
     */
    asHours() {
        return this._ms / MS_PER_HOUR;
    }

    /**
     * Get total days (float)
     */
    asDays() {
        return this._ms / MS_PER_DAY;
    }

    /**
     * Get total weeks (float)
     */
    asWeeks() {
        return this._ms / MS_PER_WEEK;
    }

    /**
     * Get total months (float, approximate)
     */
    asMonths() {
        return this._ms / MS_PER_MONTH;
    }

    /**
     * Get total years (float, approximate)
     */
    asYears() {
        return this._ms / MS_PER_YEAR;
    }

    // ============================================
    // COMPONENT GETTERS - Get individual components
    // ============================================

    /**
     * Get years component
     */
    years() {
        return Math.floor(Math.abs(this._ms) / MS_PER_YEAR) * Math.sign(this._ms);
    }

    /**
     * Get months component (0-11)
     */
    months() {
        return Math.floor((Math.abs(this._ms) % MS_PER_YEAR) / MS_PER_MONTH) * Math.sign(this._ms);
    }

    /**
     * Get days component (0-29/30)
     */
    days() {
        return Math.floor((Math.abs(this._ms) % MS_PER_MONTH) / MS_PER_DAY) * Math.sign(this._ms);
    }

    /**
     * Get hours component (0-23)
     */
    hours() {
        return Math.floor((Math.abs(this._ms) % MS_PER_DAY) / MS_PER_HOUR) * Math.sign(this._ms);
    }

    /**
     * Get minutes component (0-59)
     */
    minutes() {
        return Math.floor((Math.abs(this._ms) % MS_PER_HOUR) / MS_PER_MINUTE) * Math.sign(this._ms);
    }

    /**
     * Get seconds component (0-59)
     */
    seconds() {
        return Math.floor((Math.abs(this._ms) % MS_PER_MINUTE) / MS_PER_SECOND) * Math.sign(this._ms);
    }

    /**
     * Get milliseconds component (0-999)
     */
    milliseconds() {
        return Math.floor(Math.abs(this._ms) % MS_PER_SECOND) * Math.sign(this._ms);
    }

    // ============================================
    // MANIPULATION - Chainable operations
    // ============================================

    /**
     * Add to this duration
     * @param {number|Object|Duration} value - Value to add
     * @param {string} [unit] - Unit if value is number
     * @returns {Duration} New duration
     */
    add(value, unit) {
        if (value instanceof Duration) {
            return new Duration(this._ms + value._ms);
        }
        if (typeof value === 'object') {
            return new Duration(this._ms + Duration.toMilliseconds(value));
        }
        if (unit) {
            const obj = { [unit]: value };
            return new Duration(this._ms + Duration.toMilliseconds(obj));
        }
        return new Duration(this._ms + value);
    }

    /**
     * Subtract from this duration
     * @param {number|Object|Duration} value - Value to subtract
     * @param {string} [unit] - Unit if value is number
     * @returns {Duration} New duration
     */
    subtract(value, unit) {
        if (value instanceof Duration) {
            return new Duration(this._ms - value._ms);
        }
        if (typeof value === 'object') {
            return new Duration(this._ms - Duration.toMilliseconds(value));
        }
        if (unit) {
            const obj = { [unit]: value };
            return new Duration(this._ms - Duration.toMilliseconds(obj));
        }
        return new Duration(this._ms - value);
    }

    /**
     * Multiply duration
     * @param {number} factor - Multiplication factor
     * @returns {Duration} New duration
     */
    multiply(factor) {
        return new Duration(this._ms * factor);
    }

    /**
     * Divide duration
     * @param {number} divisor - Division factor
     * @returns {Duration} New duration
     */
    divide(divisor) {
        return new Duration(this._ms / divisor);
    }

    /**
     * Get absolute value
     * @returns {Duration} New duration with positive value
     */
    abs() {
        return new Duration(Math.abs(this._ms));
    }

    /**
     * Negate duration
     * @returns {Duration} New duration with opposite sign
     */
    negate() {
        return new Duration(-this._ms);
    }

    // ============================================
    // COMPARISON
    // ============================================

    /**
     * Check if duration is negative
     */
    isNegative() {
        return this._ms < 0;
    }

    /**
     * Check if duration is zero
     */
    isZero() {
        return this._ms === 0;
    }

    /**
     * Check if duration is positive
     */
    isPositive() {
        return this._ms > 0;
    }

    /**
     * Compare with another duration
     * @param {Duration|number} other - Duration to compare
     * @returns {number} -1, 0, or 1
     */
    compare(other) {
        const otherMs = other instanceof Duration ? other._ms : other;
        if (this._ms < otherMs) return -1;
        if (this._ms > otherMs) return 1;
        return 0;
    }

    /**
     * Check if equal to another duration
     */
    equals(other) {
        return this.compare(other) === 0;
    }

    /**
     * Check if greater than another duration
     */
    greaterThan(other) {
        return this.compare(other) > 0;
    }

    /**
     * Check if less than another duration
     */
    lessThan(other) {
        return this.compare(other) < 0;
    }

    // ============================================
    // FORMATTING
    // ============================================

    /**
     * Convert to object representation
     * @returns {Object} Duration components
     */
    toObject() {
        const abs = Math.abs(this._ms);
        const sign = this._ms < 0 ? -1 : 1;
        
        return {
            years: Math.floor(abs / MS_PER_YEAR) * sign,
            months: Math.floor((abs % MS_PER_YEAR) / MS_PER_MONTH) * sign,
            days: Math.floor((abs % MS_PER_MONTH) / MS_PER_DAY) * sign,
            hours: Math.floor((abs % MS_PER_DAY) / MS_PER_HOUR) * sign,
            minutes: Math.floor((abs % MS_PER_HOUR) / MS_PER_MINUTE) * sign,
            seconds: Math.floor((abs % MS_PER_MINUTE) / MS_PER_SECOND) * sign,
            milliseconds: Math.floor(abs % MS_PER_SECOND) * sign
        };
    }

    /**
     * Format as ISO 8601 duration string
     * @returns {string} ISO duration string (e.g., "P1DT2H30M")
     */
    toISOString() {
        const obj = this.toObject();
        let result = this._ms < 0 ? '-P' : 'P';
        
        // Date components
        if (obj.years) result += Math.abs(obj.years) + 'Y';
        if (obj.months) result += Math.abs(obj.months) + 'M';
        if (obj.days) result += Math.abs(obj.days) + 'D';
        
        // Time components
        const hasTime = obj.hours || obj.minutes || obj.seconds || obj.milliseconds;
        if (hasTime) {
            result += 'T';
            if (obj.hours) result += Math.abs(obj.hours) + 'H';
            if (obj.minutes) result += Math.abs(obj.minutes) + 'M';
            if (obj.seconds || obj.milliseconds) {
                const secs = Math.abs(obj.seconds) + Math.abs(obj.milliseconds) / 1000;
                result += secs + 'S';
            }
        }
        
        // Handle zero duration
        if (result === 'P' || result === '-P') {
            return 'PT0S';
        }
        
        return result;
    }

    /**
     * Human-readable format
     * @param {string} [locale='en'] - Locale for formatting
     * @returns {string} Human readable string
     */
    humanize(locale = 'en') {
        const abs = Math.abs(this._ms);
        const prefix = this._ms < 0 ? '-' : '';
        
        // Use Intl.NumberFormat for pluralization support
        const nf = new Intl.NumberFormat(locale);
        
        // Unit names by locale
        const units = getUnitNames(locale);
        
        if (abs >= MS_PER_YEAR) {
            const years = Math.round(abs / MS_PER_YEAR);
            return prefix + nf.format(years) + ' ' + (years === 1 ? units.year : units.years);
        }
        if (abs >= MS_PER_MONTH) {
            const months = Math.round(abs / MS_PER_MONTH);
            return prefix + nf.format(months) + ' ' + (months === 1 ? units.month : units.months);
        }
        if (abs >= MS_PER_WEEK) {
            const weeks = Math.round(abs / MS_PER_WEEK);
            return prefix + nf.format(weeks) + ' ' + (weeks === 1 ? units.week : units.weeks);
        }
        if (abs >= MS_PER_DAY) {
            const days = Math.round(abs / MS_PER_DAY);
            return prefix + nf.format(days) + ' ' + (days === 1 ? units.day : units.days);
        }
        if (abs >= MS_PER_HOUR) {
            const hours = Math.round(abs / MS_PER_HOUR);
            return prefix + nf.format(hours) + ' ' + (hours === 1 ? units.hour : units.hours);
        }
        if (abs >= MS_PER_MINUTE) {
            const minutes = Math.round(abs / MS_PER_MINUTE);
            return prefix + nf.format(minutes) + ' ' + (minutes === 1 ? units.minute : units.minutes);
        }
        if (abs >= MS_PER_SECOND) {
            const seconds = Math.round(abs / MS_PER_SECOND);
            return prefix + nf.format(seconds) + ' ' + (seconds === 1 ? units.second : units.seconds);
        }
        
        return prefix + abs + ' ms';
    }

    /**
     * Format with custom pattern
     * @param {string} format - Format pattern (HH:mm:ss, etc.)
     * @returns {string} Formatted string
     */
    format(format = 'HH:mm:ss') {
        const obj = this.toObject();
        const abs = {
            y: Math.abs(obj.years),
            M: Math.abs(obj.months),
            d: Math.abs(obj.days),
            h: Math.abs(obj.hours),
            m: Math.abs(obj.minutes),
            s: Math.abs(obj.seconds),
            S: Math.abs(obj.milliseconds)
        };
        
        return format
            .replace(/YYYY|YY/g, String(abs.y).padStart(4, '0'))
            .replace(/MM/g, String(abs.M).padStart(2, '0'))
            .replace(/DD/g, String(abs.d).padStart(2, '0'))
            .replace(/HH/g, String(abs.h).padStart(2, '0'))
            .replace(/H/g, String(abs.h))
            .replace(/mm/g, String(abs.m).padStart(2, '0'))
            .replace(/ss/g, String(abs.s).padStart(2, '0'))
            .replace(/SSS/g, String(abs.S).padStart(3, '0'));
    }

    /**
     * Get timestamp value
     */
    valueOf() {
        return this._ms;
    }

    /**
     * String representation
     */
    toString() {
        return this.toISOString();
    }

    /**
     * JSON representation
     */
    toJSON() {
        return this.toISOString();
    }
}

// ============================================
// FACTORY FUNCTIONS
// ============================================

/**
 * Create a duration from various inputs
 * 
 * @param {number|Object|string} input - Duration input
 * @param {string} [unit] - Unit if input is number
 * @returns {Duration} Duration instance
 * 
 * @example
 * duration(5000)                    // 5 seconds in ms
 * duration(2, 'hours')              // 2 hours
 * duration({ hours: 2, minutes: 30 }) // 2 hours 30 minutes
 * duration('P1DT2H30M')             // ISO 8601 duration
 */
export const duration = (input, unit) => {
    // Number with unit
    if (typeof input === 'number' && unit) {
        const obj = { [unit]: input };
        return new Duration(obj);
    }
    
    // ISO 8601 string parsing
    if (typeof input === 'string') {
        return parseISO8601Duration(input);
    }
    
    return new Duration(input);
};

/**
 * Parse ISO 8601 duration string
 * @param {string} str - ISO duration string (e.g., "P1DT2H30M")
 * @returns {Duration} Duration instance
 */
const parseISO8601Duration = (str) => {
    const regex = /^(-)?P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;
    const match = str.match(regex);
    
    if (!match) {
        return new Duration(0);
    }
    
    const sign = match[1] ? -1 : 1;
    const years = parseInt(match[2] || 0, 10);
    const months = parseInt(match[3] || 0, 10);
    const weeks = parseInt(match[4] || 0, 10);
    const days = parseInt(match[5] || 0, 10);
    const hours = parseInt(match[6] || 0, 10);
    const minutes = parseInt(match[7] || 0, 10);
    const seconds = parseFloat(match[8] || 0);
    
    const ms = sign * (
        years * MS_PER_YEAR +
        months * MS_PER_MONTH +
        weeks * MS_PER_WEEK +
        days * MS_PER_DAY +
        hours * MS_PER_HOUR +
        minutes * MS_PER_MINUTE +
        seconds * MS_PER_SECOND
    );
    
    return new Duration(ms);
};

/**
 * Calculate duration between two dates
 * @param {Date|NanoDate} start - Start date
 * @param {Date|NanoDate} end - End date
 * @returns {Duration} Duration between dates
 */
export const between = (start, end) => {
    const startMs = start._d ? start._d.getTime() : start.getTime();
    const endMs = end._d ? end._d.getTime() : end.getTime();
    return new Duration(endMs - startMs);
};

// Export Duration class for instanceof checks
export { Duration };

export default duration;
