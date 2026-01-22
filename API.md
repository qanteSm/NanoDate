# 📖 NanoDate Master API Reference (v0.2.1)

NanoDate is a 100% immutable, Intl-native library with zero locale payload. This document provides the full technical reference for all available modules.

---

## 📘 TypeScript Integration

NanoDate is written with first-class TypeScript support. Definitions are bundled with the package.

```typescript
import { 
  nano, 
  NanoDate, 
  TimeUnit, 
  DateInput, 
  Duration 
} from '@qantesm/nanodate';

// Fully typed instance
const date: NanoDate = nano('2026-01-21');

// Typed duration
const dur: Duration = nano.duration(1, 'hour');
```

---

## 🏗️ Core Factory & Configuration

### `nano(input?: DateInput, locale?: string): NanoDate`
The main factory. Uses `ultraFastParse` (regex-free) for ISO strings.
- **input**: `Date | string | number | NanoDate | null`
- **locale**: `string` (e.g., 'tr', 'en-GB', 'ja')

### `nano.strict(input: DateInput, locale?: string): NanoDate`
Enforces strict calendar validation. Throws `InvalidDateError` for invalid dates (e.g., February 30th).

### `nano.config(options: NanoDateConfig): void`
Sets global defaults for the factory.
```javascript
nano.config({
  strict: true,
  locale: 'en-US',
  timezone: 'America/New_York'
});
```

### `nano.resetConfig(): void`
Resets global configuration to defaults.

### `utc(input?: DateInput): NanoDate`
Creates an instance in UTC mode. All subsequent manipulations remain in UTC.

---

## 🎨 Formatting

### `.format(pattern?: string | PresetFormat): string`
| Token | Meaning | Output (Example) |
| :--- | :--- | :--- |
| `YYYY` \| `YY` | Year | 2026 \| 26 |
| `MMMM` \| `MMM` | Month | January \| Jan |
| `MM` \| `M` | Month No | 01 \| 1 |
| `DD` \| `D` | Day | 21 \| 21 |
| `Do` | Ordinal | 21st |
| `dddd` \| `ddd` | Weekday | Wednesday \| Wed |
| `HH` \| `H` | 24h | 14 \| 14 |
| `hh` \| `h` | 12h | 02 \| 2 |
| `mm` \| `m` | Minute | 05 \| 5 |
| `ss` \| `s` | Second | 09 \| 9 |
| `SSS` | Millisecond | 123 |
| `A` \| `a` | AM/PM | PM \| pm |
| `Z` \| `ZZ` | Offset | +03:00 \| +0300 |

**Presets (Zero-cost, uses Browser Native Intl):**
- `'short'` (1/21/26)
- `'medium'` (Jan 21, 2026)
- `'long'` (January 21, 2026)
- `'full'` (Wednesday, January 21, 2026)
- `'short-time'`, `'full-time'` etc.

---

## 🚀 Performance Helpers

### `.chain(): ChainContext`
The recommended way for multiple operations. Reuses internal context to minimize object creation overhead.
```javascript
const result = nano().chain()
  .add(7, 'days')
  .subtract(1, 'hour')
  .startOf('day')
  .value(); // Final NanoDate instance
```

### `.batch(): BatchContext` (Turbo mode)
Bypasses the Proxy overhead entirely. Best for high-frequency data processing.
```javascript
const result = nano().batch()
  .add(1, 'month')
  .set('date', 15)
  .done(); // Final NanoDate instance
```

---

## ➕ Manipulation (Immutable)

### `.add(val: number, unit: TimeUnit): NanoDate`
### `.subtract(val: number, unit: TimeUnit): NanoDate`
**Units:** `year(y)`, `quarter(Q)`, `month(M)`, `week(w)`, `day(d)`, `hour(h)`, `minute(m)`, `second(s)`, `ms`.

### `.startOf(unit: TimeUnit): NanoDate`
### `.endOf(unit: TimeUnit): NanoDate`

---

## 📊 Business Days

### `.isBusinessDay(holidays?: string[]): boolean`
### `.addBusinessDays(n: number, holidays?: string[]): NanoDate`
### `.diffBusinessDays(other: DateInput, holidays?: string[]): number`
### `.nextBusinessDay() / .prevBusinessDay()`

---

## ⏳ Duration Module

### `nano.duration(input: number | object | string, unit?: TimeUnit): Duration`
Creates a rich duration object. Supports ISO 8601 duration strings (e.g., `"P1DT2H"`).

### `nano.durationBetween(start: DateInput, end: DateInput): Duration`
Calculates the duration between two points in time.

### Duration Methods
- `.humanize(locale?)`: Zero-locale-payload humanization (e.g., "5 days").
- `.asMinutes() / .asHours()` (and other `asUnit` methods): Returns total as float.
- `.years() / .months() / .days()`: Returns component values.
- `.format(pattern?)`: Custom formatting (e.g., `HH:mm:ss`).
- `.add / .subtract / .multiply / .divide`: Chainable math.

---

## 🔍 Query & Comparison

### `.diff(other: DateInput, unit?: TimeUnit, precise?: boolean): number`
Calculates difference. Set `precise: true` for float results.

### `.isBefore / .isAfter / .isSame (other, unit?)`
### `.isSameOrBefore / .isSameOrAfter (other, unit?)`
### `.isBetween(start, end, unit?, inclusivity?): boolean`
**Inclusivity:** `'()'` (exclusive), `'[]'` (inclusive), `'(]'`, `'[)'`.

### `.isValid(): boolean`
Full calendar validation (e.g., checks leap years, month lengths).

---

## 📡 Timezone & UTC

### `.tz(zone: string, format?: string): string`
Formatted string in specific IANA zone.

### `.toTz(zone: string): NanoDate` (Chainable)
Returns instance with specified timezone context.

### `.utcOffset(zone?: string): number`
Returns UTC offset in minutes.

---

## 🔧 Setters & Getters

Supports both modes: `date.year()` (get) and `date.year(2027)` (set - returns new instance).
- `.year()`, `.month()` (0-11), `.date()` (1-31), `.day()` (0-6)
- `.hour()`, `.minute()`, `.second()`, `.millisecond()`
- `.isoWeekday()`, `.isoWeek()`, `.quarter()`, `.dayOfYear()`

---

## 🛠️ High-Performance Static Methods

These methods bypass the `NanoDate` wrapper entirely for maximum performance in hot loops.

### `nano.format(input: DateInput, pattern: string, locale?: string): string`
Up to 2x faster than instance formatting for one-shot operations.

### `nano.addTs / .subtractTs (ts: number, val: number, unit: string): number`
Performs math on raw timestamps and returns a number.

### `nano.diffTs(ts1, ts2, unit?): number`
Calculates difference between two timestamps.

### `nano.isValidDate(input: any): boolean`
Validates any input without creating an instance.

### `nano.raw: RawOperations`
Low-level math operations (`addMs`, `startOfDay`, etc.).

---

## 🔧 Utility & Environment

### `checkIntlSupport(): boolean`
Checks if the environment has full ICU support. Warns if only English is available (Node.js without ICU).

### `nano.cacheSize: number`
Adjust the LRU cache size for `Intl` formatters (default: 50).

---

## 📦 Conversion & Clone

- `.toISOString()`, `.toJSON()`, `.valueOf()`, `.unix()`
- `.toArray()` -> `[2026, 0, 21, ...]`
- `.toObject()` -> `{ year, month, date, ... }`
- `.toDate()` -> Returns native `Date`
- `.clone()` & `.locale(newLocale)`

---

## 🔌 Plugins

### `nano.extend(name: string, fn: Function): void`
```javascript
nano.extend('isWeekend', (ctx) => {
  const day = ctx._d.getDay();
  return day === 0 || day === 6;
});
```
