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
