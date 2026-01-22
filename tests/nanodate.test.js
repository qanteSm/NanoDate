/**
 * NanoDate Test Suite
 * Using Vitest
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { nano, utc, fromUnix, checkIntlSupport } from '../src/index.js';

describe('NanoDate Core', () => {
    describe('nano() factory', () => {
        it('should create a NanoDate with current time', () => {
            const now = nano();
            expect(now.isValid()).toBe(true);
            const diff = Math.abs(now.valueOf() - Date.now());
            expect(diff).toBeLessThan(100); // Within 100ms
        });

        it('should create from ISO string', () => {
            const date = nano('2026-01-21');
            expect(date.year()).toBe(2026);
            expect(date.month()).toBe(0); // January = 0
            expect(date.date()).toBe(21);
        });

        it('should create from timestamp', () => {
            const ts = 1737452400000;
            const date = nano(ts);
            expect(date.valueOf()).toBe(ts);
        });

        it('should create from Date object', () => {
            const jsDate = new Date(2026, 0, 21);
            const date = nano(jsDate);
            expect(date.year()).toBe(2026);
            expect(date.month()).toBe(0);
            expect(date.date()).toBe(21);
        });

        it('should clone from another NanoDate', () => {
            const original = nano('2026-01-21', 'tr');
            const cloned = nano(original);
            expect(cloned.valueOf()).toBe(original.valueOf());
        });

        it('should set locale', () => {
            const date = nano('2026-01-21', 'tr');
            // Locale is internal, test via format output
            const formatted = date.format('MMMM');
            expect(formatted).toBe('Ocak'); // Turkish for January
        });
    });

    describe('fromUnix()', () => {
        it('should create from Unix timestamp (seconds)', () => {
            const ts = 1737452400; // seconds
            const date = fromUnix(ts);
            expect(date.unix()).toBe(ts);
        });
    });
});

describe('NanoDate Format', () => {
    const date = nano('2026-01-21T12:30:45.123');

    describe('Token formatting', () => {
        it('should format year tokens', () => {
            expect(date.format('YYYY')).toBe('2026');
            expect(date.format('YY')).toBe('26');
        });

        it('should format month tokens', () => {
            expect(date.format('MM')).toBe('01');
            expect(date.format('M')).toBe('1');
        });

        it('should format day tokens', () => {
            expect(date.format('DD')).toBe('21');
            expect(date.format('D')).toBe('21');
        });

        it('should format ordinal day (Do)', () => {
            const expected = date.format('Do');
            expect(expected).toBe('21st');

            // Test other ordinals
            expect(nano('2026-01-01').format('Do')).toBe('1st');
            expect(nano('2026-01-02').format('Do')).toBe('2nd');
            expect(nano('2026-01-03').format('Do')).toBe('3rd');
            expect(nano('2026-01-04').format('Do')).toBe('4th');
            expect(nano('2026-01-11').format('Do')).toBe('11th');
            expect(nano('2026-01-22').format('Do')).toBe('22nd');
        });

        it('should format weekday tokens', () => {
            // 2026-01-21 is Wednesday
            const weekday = date.format('dddd');
            expect(weekday.toLowerCase()).toContain('wednesday');
        });

        it('should format time tokens', () => {
            expect(date.format('HH')).toMatch(/^12$/);
            expect(date.format('mm')).toMatch(/^30$/);
            expect(date.format('ss')).toMatch(/^45$/);
        });

        it('should format combined patterns', () => {
            const result = date.format('YYYY-MM-DD');
            expect(result).toBe('2026-01-21');
        });

        it('should escape text in brackets', () => {
            const result = date.format('[Today is] YYYY-MM-DD');
            expect(result).toBe('Today is 2026-01-21');
        });
    });

    describe('Preset formats', () => {
        it('should format with "short" preset', () => {
            const result = date.format('short');
            expect(result).toBeTruthy();
            expect(typeof result).toBe('string');
        });

        it('should format with "long" preset', () => {
            const result = date.format('long');
            expect(result).toContain('2026');
        });

        it('should format with "full" preset', () => {
            const result = date.format('full');
            expect(result).toContain('2026');
        });
    });

    describe('Locale formatting', () => {
        it('should format in Turkish', () => {
            const tr = nano('2026-01-21', 'tr');
            expect(tr.format('MMMM')).toBe('Ocak');
        });

        it('should format in German', () => {
            const de = nano('2026-01-21', 'de');
            expect(de.format('MMMM')).toBe('Januar');
        });

        it('should format in Japanese', () => {
            const ja = nano('2026-01-21', 'ja');
            const month = ja.format('MMMM');
            expect(month).toContain('月'); // Contains "月" (month in Japanese)
        });
    });
});

describe('NanoDate Manipulation', () => {
    describe('add()', () => {
        it('should add days', () => {
            const date = nano('2026-01-21');
            const result = date.add(7, 'days');
            expect(result.date()).toBe(28);
        });

        it('should add months', () => {
            const date = nano('2026-01-21');
            const result = date.add(1, 'month');
            expect(result.month()).toBe(1); // February
        });

        it('should add years', () => {
            const date = nano('2026-01-21');
            const result = date.add(1, 'year');
            expect(result.year()).toBe(2027);
        });

        it('should handle month edge cases', () => {
            // Jan 31 + 1 month = Feb 28 or 29
            const date = nano('2026-01-31');
            const result = date.add(1, 'month');
            expect(result.month()).toBe(1);
            expect(result.date()).toBeLessThanOrEqual(28);
        });

        it('should be immutable', () => {
            const original = nano('2026-01-21');
            const modified = original.add(1, 'day');
            expect(original.date()).toBe(21);
            expect(modified.date()).toBe(22);
        });
    });

    describe('subtract()', () => {
        it('should subtract days', () => {
            const date = nano('2026-01-21');
            const result = date.subtract(7, 'days');
            expect(result.date()).toBe(14);
        });

        it('should subtract months', () => {
            const date = nano('2026-01-21');
            const result = date.subtract(1, 'month');
            expect(result.month()).toBe(11); // December
            expect(result.year()).toBe(2025);
        });
    });

    describe('startOf()', () => {
        it('should get start of day', () => {
            const date = nano('2026-01-21T12:30:45');
            const result = date.startOf('day');
            expect(result.hour()).toBe(0);
            expect(result.minute()).toBe(0);
            expect(result.second()).toBe(0);
        });

        it('should get start of month', () => {
            const date = nano('2026-01-21');
            const result = date.startOf('month');
            expect(result.date()).toBe(1);
            expect(result.hour()).toBe(0);
        });

        it('should get start of year', () => {
            const date = nano('2026-06-15');
            const result = date.startOf('year');
            expect(result.month()).toBe(0);
            expect(result.date()).toBe(1);
        });
    });

    describe('endOf()', () => {
        it('should get end of day', () => {
            const date = nano('2026-01-21T12:30:00');
            const result = date.endOf('day');
            expect(result.hour()).toBe(23);
            expect(result.minute()).toBe(59);
            expect(result.second()).toBe(59);
        });

        it('should get end of month', () => {
            const date = nano('2026-01-15');
            const result = date.endOf('month');
            expect(result.date()).toBe(31);
            expect(result.hour()).toBe(23);
        });

        it('should get end of February (leap year)', () => {
            const date = nano('2024-02-15'); // 2024 is leap year
            const result = date.endOf('month');
            expect(result.date()).toBe(29);
        });

        it('should get end of February (non-leap year)', () => {
            const date = nano('2026-02-15');
            const result = date.endOf('month');
            expect(result.date()).toBe(28);
        });
    });
});

describe('NanoDate Comparison', () => {
    const date1 = nano('2026-01-21');
    const date2 = nano('2026-01-28');

    describe('isBefore()', () => {
        it('should return true if before', () => {
            expect(date1.isBefore(date2)).toBe(true);
        });

        it('should return false if after', () => {
            expect(date2.isBefore(date1)).toBe(false);
        });

        it('should compare with granularity', () => {
            const jan = nano('2026-01-15');
            const feb = nano('2026-02-01');
            expect(jan.isBefore(feb, 'month')).toBe(true);
        });
    });

    describe('isAfter()', () => {
        it('should return true if after', () => {
            expect(date2.isAfter(date1)).toBe(true);
        });
    });

    describe('isSame()', () => {
        it('should return true for same date', () => {
            const a = nano('2026-01-21');
            const b = nano('2026-01-21');
            expect(a.isSame(b)).toBe(true);
        });

        it('should compare with unit granularity', () => {
            const a = nano('2026-01-21T10:00:00');
            const b = nano('2026-01-21T20:00:00');
            expect(a.isSame(b, 'day')).toBe(true);
            expect(a.isSame(b, 'hour')).toBe(false);
        });
    });

    describe('diff()', () => {
        it('should calculate difference in days', () => {
            expect(date2.diff(date1, 'days')).toBe(7);
            expect(date1.diff(date2, 'days')).toBe(-7);
        });

        it('should calculate difference in months', () => {
            const jan = nano('2026-01-15');
            const mar = nano('2026-03-15');
            expect(mar.diff(jan, 'months')).toBe(2);
        });

        it('should calculate difference in years', () => {
            const y2026 = nano('2026-01-01');
            const y2030 = nano('2030-01-01');
            expect(y2030.diff(y2026, 'years')).toBe(4);
        });
    });
});

describe('NanoDate Relative Time', () => {
    it('should format relative time in English', () => {
        // This test depends on current time
        const yesterday = nano().subtract(1, 'day');
        const result = yesterday.fromNow();
        expect(result.toLowerCase()).toContain('day');
    });

    it('should format relative time in Turkish', () => {
        const yesterday = nano(Date.now() - 86400000, 'tr');
        const result = yesterday.fromNow();
        // Should contain Turkish relative time
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
    });
});

describe('NanoDate Timezone', () => {
    it('should format in specific timezone', () => {
        const date = nano('2026-01-21T12:00:00Z');
        const nyTime = date.tz('America/New_York');
        expect(typeof nyTime).toBe('string');
        expect(nyTime.length).toBeGreaterThan(0);
    });

    it('should get UTC offset', () => {
        const date = nano();
        const offset = date.utcOffset();
        expect(typeof offset).toBe('number');
    });
});

describe('NanoDate Getters', () => {
    const date = nano('2026-06-15T14:30:45.123');

    it('should get year', () => {
        expect(date.year()).toBe(2026);
    });

    it('should get month (0-indexed)', () => {
        expect(date.month()).toBe(5); // June = 5
    });

    it('should get date', () => {
        expect(date.date()).toBe(15);
    });

    it('should get day of week', () => {
        // June 15, 2026 is Monday = 1
        expect(date.day()).toBe(1);
    });

    it('should get hour', () => {
        expect(date.hour()).toBe(14);
    });

    it('should get minute', () => {
        expect(date.minute()).toBe(30);
    });

    it('should get second', () => {
        expect(date.second()).toBe(45);
    });

    it('should get millisecond', () => {
        expect(date.millisecond()).toBe(123);
    });
});

describe('NanoDate Conversion', () => {
    const date = nano('2026-01-21T12:30:00.000Z');

    it('should convert to ISO string', () => {
        const iso = date.toISOString();
        expect(iso).toContain('2026-01-21');
    });

    it('should convert to JSON', () => {
        const json = date.toJSON();
        expect(json).toContain('2026-01-21');
    });

    it('should get Unix timestamp', () => {
        const unix = date.unix();
        expect(typeof unix).toBe('number');
        expect(unix).toBeGreaterThan(0);
    });

    it('should get valueOf (timestamp)', () => {
        const ts = date.valueOf();
        expect(typeof ts).toBe('number');
        expect(ts).toBeGreaterThan(0);
    });

    it('should convert to Date', () => {
        const jsDate = date.toDate();
        expect(jsDate instanceof Date).toBe(true);
    });
});

describe('NanoDate Utility', () => {
    it('should check validity', () => {
        expect(nano('2026-01-21').isValid()).toBe(true);
        expect(nano('invalid').isValid()).toBe(false);
    });

    it('should clone with new locale', () => {
        const en = nano('2026-01-21', 'en');
        const tr = en.locale('tr');
        expect(tr.format('MMMM')).toBe('Ocak');
    });

    it('should clone', () => {
        const original = nano('2026-01-21');
        const cloned = original.clone();
        expect(cloned.valueOf()).toBe(original.valueOf());
    });
});

describe('Intl Support Check', () => {
    it('should check Intl support', () => {
        const supported = checkIntlSupport();
        expect(typeof supported).toBe('boolean');
    });
});

// ============================================
// EDGE CASES & VALIDATION TESTS
// ============================================

describe('Date Validation Edge Cases', () => {
    describe('Invalid calendar dates', () => {
        it('should reject February 30', () => {
            expect(nano('2026-02-30').isValid()).toBe(false);
        });

        it('should reject February 31', () => {
            expect(nano('2026-02-31').isValid()).toBe(false);
        });

        it('should reject January 32', () => {
            expect(nano('2026-01-32').isValid()).toBe(false);
        });

        it('should reject April 31', () => {
            expect(nano('2026-04-31').isValid()).toBe(false);
        });

        it('should reject June 31', () => {
            expect(nano('2026-06-31').isValid()).toBe(false);
        });

        it('should reject September 31', () => {
            expect(nano('2026-09-31').isValid()).toBe(false);
        });

        it('should reject November 31', () => {
            expect(nano('2026-11-31').isValid()).toBe(false);
        });

        it('should reject month 13', () => {
            expect(nano('2026-13-01').isValid()).toBe(false);
        });

        it('should reject month 0', () => {
            expect(nano('2026-00-15').isValid()).toBe(false);
        });

        it('should reject day 0', () => {
            expect(nano('2026-01-00').isValid()).toBe(false);
        });
    });

    describe('Leap year validation', () => {
        it('should accept Feb 29 in leap year (2024)', () => {
            expect(nano('2024-02-29').isValid()).toBe(true);
        });

        it('should accept Feb 29 in leap year (2028)', () => {
            expect(nano('2028-02-29').isValid()).toBe(true);
        });

        it('should reject Feb 29 in non-leap year (2026)', () => {
            expect(nano('2026-02-29').isValid()).toBe(false);
        });

        it('should reject Feb 29 in non-leap year (2025)', () => {
            expect(nano('2025-02-29').isValid()).toBe(false);
        });

        it('should accept Feb 29 in year 2000 (century leap year)', () => {
            expect(nano('2000-02-29').isValid()).toBe(true);
        });

        it('should reject Feb 29 in year 1900 (century non-leap year)', () => {
            expect(nano('1900-02-29').isValid()).toBe(false);
        });
    });

    describe('Valid boundary dates', () => {
        it('should accept January 31', () => {
            expect(nano('2026-01-31').isValid()).toBe(true);
        });

        it('should accept February 28 in non-leap year', () => {
            expect(nano('2026-02-28').isValid()).toBe(true);
        });

        it('should accept March 31', () => {
            expect(nano('2026-03-31').isValid()).toBe(true);
        });

        it('should accept April 30', () => {
            expect(nano('2026-04-30').isValid()).toBe(true);
        });

        it('should accept December 31', () => {
            expect(nano('2026-12-31').isValid()).toBe(true);
        });
    });
});

// ============================================
// STRICT MODE TESTS
// ============================================

import { strict, config, resetConfig, InvalidDateError } from '../src/index.js';

describe('Strict Mode', () => {
    afterEach(() => {
        resetConfig();
    });

    describe('nano.strict()', () => {
        it('should throw InvalidDateError for February 30', () => {
            expect(() => strict('2026-02-30')).toThrow(InvalidDateError);
        });

        it('should throw InvalidDateError for invalid dates', () => {
            expect(() => strict('2026-02-31')).toThrow(InvalidDateError);
            expect(() => strict('2026-04-31')).toThrow(InvalidDateError);
            expect(() => strict('2026-13-01')).toThrow(InvalidDateError);
        });

        it('should accept valid dates', () => {
            expect(() => strict('2026-01-21')).not.toThrow();
            expect(strict('2026-01-21').year()).toBe(2026);
        });

        it('should accept leap year Feb 29', () => {
            expect(() => strict('2024-02-29')).not.toThrow();
        });

        it('should throw for non-leap year Feb 29', () => {
            expect(() => strict('2026-02-29')).toThrow(InvalidDateError);
        });
    });

    describe('Global strict mode via config', () => {
        it('should throw when strict mode is enabled globally', () => {
            config({ strict: true });
            expect(() => nano('2026-02-30')).toThrow(InvalidDateError);
        });

        it('should work normally after resetConfig', () => {
            config({ strict: true });
            resetConfig();
            expect(() => nano('2026-02-30')).not.toThrow();
        });
    });
});

// ============================================
// BUSINESS DAY TESTS
// ============================================

describe('Business Day Functions', () => {
    describe('isBusinessDay()', () => {
        it('should return true for Monday', () => {
            // 2026-01-19 is Monday
            expect(nano('2026-01-19').isBusinessDay()).toBe(true);
        });

        it('should return true for Friday', () => {
            // 2026-01-23 is Friday
            expect(nano('2026-01-23').isBusinessDay()).toBe(true);
        });

        it('should return false for Saturday', () => {
            // 2026-01-24 is Saturday
            expect(nano('2026-01-24').isBusinessDay()).toBe(false);
        });

        it('should return false for Sunday', () => {
            // 2026-01-25 is Sunday
            expect(nano('2026-01-25').isBusinessDay()).toBe(false);
        });

        it('should return false for holidays', () => {
            const holidays = ['2026-01-19'];
            expect(nano('2026-01-19').isBusinessDay(holidays)).toBe(false);
        });
    });

    describe('addBusinessDays()', () => {
        it('should add business days skipping weekends', () => {
            // 2026-01-22 is Thursday, +2 business days = Monday 26th
            const result = nano('2026-01-22').addBusinessDays(2);
            expect(result.date()).toBe(26);
            expect(result.day()).toBe(1); // Monday
        });

        it('should subtract business days', () => {
            // 2026-01-26 is Monday, -2 business days = Thursday 22nd
            const result = nano('2026-01-26').addBusinessDays(-2);
            expect(result.date()).toBe(22);
            expect(result.day()).toBe(4); // Thursday
        });

        it('should skip holidays', () => {
            const holidays = ['2026-01-26'];
            // 2026-01-22 is Thursday, +2 business days with Jan 26 as holiday = Tuesday 27th
            const result = nano('2026-01-22').addBusinessDays(2, holidays);
            expect(result.date()).toBe(27);
        });
    });

    describe('nextBusinessDay()', () => {
        it('should get next business day from Friday', () => {
            // 2026-01-23 is Friday, next business day is Monday 26th
            const result = nano('2026-01-23').nextBusinessDay();
            expect(result.date()).toBe(26);
            expect(result.day()).toBe(1);
        });

        it('should get next business day from Saturday', () => {
            // 2026-01-24 is Saturday, next business day is Monday 26th
            const result = nano('2026-01-24').nextBusinessDay();
            expect(result.date()).toBe(26);
        });
    });

    describe('prevBusinessDay()', () => {
        it('should get previous business day from Monday', () => {
            // 2026-01-26 is Monday, prev business day is Friday 23rd
            const result = nano('2026-01-26').prevBusinessDay();
            expect(result.date()).toBe(23);
            expect(result.day()).toBe(5); // Friday
        });
    });
});

// ============================================
// TIMEZONE CHAINABLE API TESTS
// ============================================

describe('Chainable Timezone API', () => {
    it('should return NanoDate from toTz()', () => {
        const result = nano('2026-01-22T12:00:00').toTz('America/New_York');
        expect(result.format).toBeDefined();
        expect(typeof result.format).toBe('function');
    });

    it('should allow chaining after toTz()', () => {
        const result = nano('2026-01-22T12:00:00')
            .toTz('America/New_York')
            .add(1, 'day');
        expect(result.date()).toBe(23);
    });

    it('should have timezone alias', () => {
        const result = nano('2026-01-22').timezone('Europe/London');
        expect(result.format).toBeDefined();
    });
});

// ============================================
// PERFORMANCE OPTIMIZATION TESTS
// ============================================

describe('Performance Optimizations', () => {
    describe('Format caching', () => {
        it('should handle repeated formatting efficiently', () => {
            const date = nano('2026-01-22');
            const start = Date.now();
            
            for (let i = 0; i < 1000; i++) {
                date.format('YYYY-MM-DD');
            }
            
            const elapsed = Date.now() - start;
            expect(elapsed).toBeLessThan(500); // Should be fast
        });

        it('should use precompiled formats', () => {
            const date = nano('2026-01-22T12:30:45');
            expect(date.format('YYYY-MM-DD')).toBe('2026-01-22');
            expect(date.format('HH:mm:ss')).toBe('12:30:45');
        });
    });
});

// ============================================
// NEW FEATURES v0.1.6 TESTS
// ============================================

describe('NanoDate v0.1.6 New Features', () => {
    describe('toArray()', () => {
        it('should convert to array format', () => {
            const date = nano('2026-01-21T14:30:45.123');
            const arr = date.toArray();
            expect(arr).toEqual([2026, 0, 21, 14, 30, 45, 123]);
        });

        it('should return array with correct length', () => {
            const arr = nano().toArray();
            expect(arr.length).toBe(7);
        });
    });

    describe('toObject()', () => {
        it('should convert to object format', () => {
            const date = nano('2026-01-21T14:30:45.123');
            const obj = date.toObject();
            expect(obj).toEqual({
                year: 2026,
                month: 0,
                date: 21,
                hour: 14,
                minute: 30,
                second: 45,
                millisecond: 123
            });
        });

        it('should have all required properties', () => {
            const obj = nano().toObject();
            expect(obj).toHaveProperty('year');
            expect(obj).toHaveProperty('month');
            expect(obj).toHaveProperty('date');
            expect(obj).toHaveProperty('hour');
            expect(obj).toHaveProperty('minute');
            expect(obj).toHaveProperty('second');
            expect(obj).toHaveProperty('millisecond');
        });
    });

    describe('calendar()', () => {
        it('should format today correctly', () => {
            const result = nano().calendar();
            expect(result).toContain('Today');
        });

        it('should format yesterday correctly', () => {
            const yesterday = nano().subtract(1, 'day');
            const result = yesterday.calendar();
            expect(result).toContain('Yesterday');
        });

        it('should format tomorrow correctly', () => {
            const tomorrow = nano().add(1, 'day');
            const result = tomorrow.calendar();
            expect(result).toContain('Tomorrow');
        });

        it('should format in Turkish locale', () => {
            const today = nano(undefined, 'tr');
            const result = today.calendar();
            expect(result).toContain('Bugün');
        });
    });

    describe('batch()', () => {
        it('should create batch context', () => {
            const batch = nano('2026-01-21').batch();
            expect(batch.add).toBeDefined();
            expect(batch.subtract).toBeDefined();
            expect(batch.startOf).toBeDefined();
            expect(batch.endOf).toBeDefined();
            expect(batch.done).toBeDefined();
        });

        it('should chain operations and return NanoDate', () => {
            const result = nano('2026-01-21')
                .batch()
                .add(1, 'day')
                .add(2, 'hours')
                .done();
            
            expect(result.date()).toBe(22);
            expect(result.hour()).toBe(2);
        });

        it('should support startOf in batch', () => {
            const result = nano('2026-01-21T14:30:45')
                .batch()
                .startOf('day')
                .done();
            
            expect(result.hour()).toBe(0);
            expect(result.minute()).toBe(0);
        });

        it('should support endOf in batch', () => {
            const result = nano('2026-01-21T14:30:45')
                .batch()
                .endOf('day')
                .done();
            
            expect(result.hour()).toBe(23);
            expect(result.minute()).toBe(59);
        });

        it('should be faster for multiple operations', () => {
            const date = nano('2026-01-21');
            
            // Batch mode
            const batchStart = Date.now();
            for (let i = 0; i < 1000; i++) {
                date.batch()
                    .add(1, 'day')
                    .add(2, 'hours')
                    .startOf('hour')
                    .done();
            }
            const batchTime = Date.now() - batchStart;
            
            // Normal mode
            const normalStart = Date.now();
            for (let i = 0; i < 1000; i++) {
                date.add(1, 'day').add(2, 'hours').startOf('hour');
            }
            const normalTime = Date.now() - normalStart;
            
            // Batch should be comparable or faster
            expect(batchTime).toBeLessThan(normalTime * 2);
        });
    });

    describe('nano.parse()', () => {
        it('should parse DD-MM-YYYY format', () => {
            const date = nano.parse('21-01-2026', 'DD-MM-YYYY');
            expect(date.year()).toBe(2026);
            expect(date.month()).toBe(0);
            expect(date.date()).toBe(21);
        });

        it('should parse YYYY/MM/DD HH:mm format', () => {
            const date = nano.parse('2026/01/21 14:30', 'YYYY/MM/DD HH:mm');
            expect(date.year()).toBe(2026);
            expect(date.month()).toBe(0);
            expect(date.date()).toBe(21);
            expect(date.hour()).toBe(14);
            expect(date.minute()).toBe(30);
        });

        it('should parse MM/DD/YY format', () => {
            const date = nano.parse('01/21/26', 'MM/DD/YY');
            expect(date.year()).toBe(2026);
            expect(date.month()).toBe(0);
            expect(date.date()).toBe(21);
        });

        it('should parse h:mm A format (12-hour)', () => {
            const date = nano.parse('3:30 PM', 'h:mm A');
            expect(date.hour()).toBe(15);
            expect(date.minute()).toBe(30);
        });

        it('should parse 12:00 AM correctly', () => {
            const date = nano.parse('12:00 AM', 'h:mm A');
            expect(date.hour()).toBe(0);
        });

        it('should parse 12:00 PM correctly', () => {
            const date = nano.parse('12:00 PM', 'h:mm A');
            expect(date.hour()).toBe(12);
        });

        it('should return invalid date for non-matching format', () => {
            const date = nano.parse('invalid', 'YYYY-MM-DD');
            expect(date.isValid()).toBe(false);
        });
    });

    describe('nano.raw operations', () => {
        const ts = new Date(2026, 0, 21, 12, 0, 0).getTime();

        it('should add days to timestamp', () => {
            const result = nano.raw.addDays(ts, 7);
            const d = new Date(result);
            expect(d.getDate()).toBe(28);
        });

        it('should add hours to timestamp', () => {
            const result = nano.raw.addHours(ts, 3);
            const d = new Date(result);
            expect(d.getHours()).toBe(15);
        });

        it('should get start of hour', () => {
            const testTs = new Date(2026, 0, 21, 12, 30, 45).getTime();
            const result = nano.raw.startOfHour(testTs);
            const d = new Date(result);
            expect(d.getMinutes()).toBe(0);
            expect(d.getSeconds()).toBe(0);
        });

        it('should calculate diff in days', () => {
            const ts1 = new Date(2026, 0, 28).getTime();
            const ts2 = new Date(2026, 0, 21).getTime();
            expect(nano.raw.diffDays(ts1, ts2)).toBe(7);
        });

        it('should be faster than wrapped operations', () => {
            const timestamps = Array.from({ length: 10000 }, () => Date.now());
            
            // Raw mode
            const rawStart = performance.now();
            for (const ts of timestamps) {
                nano.raw.addDays(ts, 7);
            }
            const rawTime = performance.now() - rawStart;
            
            // Normal mode
            const normalStart = performance.now();
            for (const ts of timestamps) {
                nano(ts).add(7, 'days').valueOf();
            }
            const normalTime = performance.now() - normalStart;
            
            // Raw should be faster (or at least not significantly slower)
            // Using a generous margin since test environments can vary
            expect(rawTime).toBeLessThan(normalTime * 1.5);
        });
    });

    describe('Locale-aware precompiled formats', () => {
        it('should format dddd, MMMM D YYYY in English', () => {
            const date = nano('2026-01-21');
            const result = date.format('dddd, MMMM D YYYY');
            expect(result).toContain('Wednesday');
            expect(result).toContain('January');
            expect(result).toContain('21');
            expect(result).toContain('2026');
        });

        it('should format dddd, MMMM D YYYY in Turkish', () => {
            const date = nano('2026-01-21', 'tr');
            const result = date.format('dddd, MMMM D YYYY');
            expect(result).toContain('Çarşamba');
            expect(result).toContain('Ocak');
        });

        it('should format hh:mm A', () => {
            const date = nano('2026-01-21T14:30:00');
            const result = date.format('hh:mm A');
            expect(result).toBe('02:30 PM');
        });

        it('should format MMMM YYYY', () => {
            const date = nano('2026-01-21', 'en');
            const result = date.format('MMMM YYYY');
            expect(result).toBe('January 2026');
        });
    });

    // ============================================
    // NEW FEATURE TESTS
    // ============================================

    describe('Chainable Setters', () => {
        it('should set year and return NanoDate', () => {
            const date = nano('2026-01-21').year(2030);
            expect(date.year()).toBe(2030);
            expect(date.month()).toBe(0);
            expect(date.date()).toBe(21);
        });

        it('should chain multiple setters', () => {
            const date = nano('2026-01-21')
                .year(2030)
                .month(5)
                .date(15);
            expect(date.year()).toBe(2030);
            expect(date.month()).toBe(5);
            expect(date.date()).toBe(15);
        });

        it('should chain setter with manipulation', () => {
            const date = nano('2026-01-21')
                .month(3)
                .startOf('month');
            expect(date.month()).toBe(3);
            expect(date.date()).toBe(1);
            expect(date.hour()).toBe(0);
        });

        it('should set time components', () => {
            const date = nano('2026-01-21T10:30:00')
                .hour(14)
                .minute(45)
                .second(30);
            expect(date.hour()).toBe(14);
            expect(date.minute()).toBe(45);
            expect(date.second()).toBe(30);
        });

        it('getter should still work without argument', () => {
            const date = nano('2026-03-15');
            expect(date.year()).toBe(2026);
            expect(date.month()).toBe(2);
            expect(date.date()).toBe(15);
        });
    });

    describe('Quarter Support', () => {
        it('should return correct quarter', () => {
            expect(nano('2026-01-15').quarter()).toBe(1);
            expect(nano('2026-04-15').quarter()).toBe(2);
            expect(nano('2026-07-15').quarter()).toBe(3);
            expect(nano('2026-10-15').quarter()).toBe(4);
        });

        it('should get start of quarter', () => {
            // Q1
            let date = nano('2026-02-15').startOf('quarter');
            expect(date.month()).toBe(0);
            expect(date.date()).toBe(1);
            
            // Q2
            date = nano('2026-05-20').startOf('quarter');
            expect(date.month()).toBe(3);
            expect(date.date()).toBe(1);
            
            // Q3
            date = nano('2026-08-10').startOf('quarter');
            expect(date.month()).toBe(6);
            expect(date.date()).toBe(1);
            
            // Q4
            date = nano('2026-11-25').startOf('quarter');
            expect(date.month()).toBe(9);
            expect(date.date()).toBe(1);
        });

        it('should get end of quarter', () => {
            // Q1 ends March 31
            let date = nano('2026-02-15').endOf('quarter');
            expect(date.month()).toBe(2);
            expect(date.date()).toBe(31);
            expect(date.hour()).toBe(23);
            
            // Q2 ends June 30
            date = nano('2026-05-20').endOf('quarter');
            expect(date.month()).toBe(5);
            expect(date.date()).toBe(30);
            
            // Q3 ends September 30
            date = nano('2026-08-10').endOf('quarter');
            expect(date.month()).toBe(8);
            expect(date.date()).toBe(30);
            
            // Q4 ends December 31
            date = nano('2026-11-25').endOf('quarter');
            expect(date.month()).toBe(11);
            expect(date.date()).toBe(31);
        });
    });

    describe('ISO Weekday', () => {
        it('should return ISO weekday (1-7)', () => {
            // 2026-01-19 is Monday
            expect(nano('2026-01-19').isoWeekday()).toBe(1);
            // 2026-01-20 is Tuesday
            expect(nano('2026-01-20').isoWeekday()).toBe(2);
            // 2026-01-21 is Wednesday
            expect(nano('2026-01-21').isoWeekday()).toBe(3);
            // 2026-01-25 is Sunday
            expect(nano('2026-01-25').isoWeekday()).toBe(7);
        });

        it('should set ISO weekday', () => {
            // Start from Wednesday 2026-01-21
            const wed = nano('2026-01-21');
            
            // Set to Monday (1)
            const mon = wed.isoWeekday(1);
            expect(mon.isoWeekday()).toBe(1);
            expect(mon.date()).toBe(19);
            
            // Set to Friday (5)
            const fri = wed.isoWeekday(5);
            expect(fri.isoWeekday()).toBe(5);
            expect(fri.date()).toBe(23);
            
            // Set to Sunday (7)
            const sun = wed.isoWeekday(7);
            expect(sun.isoWeekday()).toBe(7);
            expect(sun.date()).toBe(25);
        });
    });

    describe('ISO Week', () => {
        it('should get ISO week number', () => {
            // Week 1 of 2026
            expect(nano('2026-01-01').isoWeek()).toBe(1);
            expect(nano('2026-01-04').isoWeek()).toBe(1);
            
            // Week 4
            expect(nano('2026-01-21').isoWeek()).toBe(4);
        });

        it('should set ISO week', () => {
            const date = nano('2026-01-21'); // Week 4
            const week1 = date.isoWeek(1);
            expect(week1.isoWeek()).toBe(1);
        });

        it('should get start of ISO week (Monday)', () => {
            // 2026-01-21 is Wednesday
            const date = nano('2026-01-21').startOf('isoWeek');
            expect(date.isoWeekday()).toBe(1);
            expect(date.date()).toBe(19); // Monday
        });

        it('should get end of ISO week (Sunday)', () => {
            // 2026-01-21 is Wednesday
            const date = nano('2026-01-21').endOf('isoWeek');
            expect(date.isoWeekday()).toBe(7);
            expect(date.date()).toBe(25); // Sunday
        });
    });

    describe('Duration', () => {
        it('should create duration from object', () => {
            const d = nano.duration({ hours: 2, minutes: 30 });
            expect(d.asMinutes()).toBe(150);
            expect(d.hours()).toBe(2);
            expect(d.minutes()).toBe(30);
        });

        it('should create duration from number with unit', () => {
            const d = nano.duration(2, 'hours');
            expect(d.asHours()).toBe(2);
            expect(d.asMinutes()).toBe(120);
        });

        it('should create duration from milliseconds', () => {
            const d = nano.duration(3600000);
            expect(d.asHours()).toBe(1);
        });

        it('should parse ISO 8601 duration', () => {
            const d = nano.duration('P1DT2H30M');
            expect(d.days()).toBe(1);
            expect(d.hours()).toBe(2);
            expect(d.minutes()).toBe(30);
        });

        it('should add durations', () => {
            const d1 = nano.duration({ hours: 1 });
            const d2 = d1.add({ minutes: 30 });
            expect(d2.asMinutes()).toBe(90);
        });

        it('should subtract durations', () => {
            const d1 = nano.duration({ hours: 2 });
            const d2 = d1.subtract({ minutes: 30 });
            expect(d2.asMinutes()).toBe(90);
        });

        it('should humanize duration', () => {
            const d = nano.duration({ hours: 2 });
            const humanized = d.humanize('en');
            expect(humanized).toContain('2');
            expect(humanized.toLowerCase()).toContain('hour');
        });

        it('should format as ISO 8601', () => {
            const d = nano.duration({ days: 1, hours: 2, minutes: 30 });
            expect(d.toISOString()).toBe('P1DT2H30M');
        });

        it('should calculate duration between dates', () => {
            const start = nano('2026-01-01');
            const end = nano('2026-01-21');
            const d = nano.durationBetween(start, end);
            expect(d.asDays()).toBe(20);
        });

        it('should multiply duration', () => {
            const d = nano.duration({ hours: 2 }).multiply(3);
            expect(d.asHours()).toBe(6);
        });

        it('should divide duration', () => {
            const d = nano.duration({ hours: 6 }).divide(2);
            expect(d.asHours()).toBe(3);
        });

        it('should get absolute value', () => {
            const d = nano.duration({ hours: -2 });
            expect(d.isNegative()).toBe(true);
            expect(d.abs().asHours()).toBe(2);
        });

        it('should compare durations', () => {
            const d1 = nano.duration({ hours: 2 });
            const d2 = nano.duration({ hours: 3 });
            expect(d1.lessThan(d2)).toBe(true);
            expect(d2.greaterThan(d1)).toBe(true);
        });

        it('should format duration with custom pattern', () => {
            const d = nano.duration({ hours: 1, minutes: 30, seconds: 45 });
            expect(d.format('HH:mm:ss')).toBe('01:30:45');
        });
    });
});
