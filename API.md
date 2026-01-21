# 📖 NanoDate API Reference

Full documentation for Every NanoDate method. All methods are immutable and support tree-shaking.

## Table of Contents

- [Parsing](#parsing)
- [Formatting](#formatting)
- [Manipulation](#manipulation)
- [Query / Comparison](#query--comparison)
- [Getters / Setters](#getters--setters)
- [Timezone](#timezone)
- [Relative Time](#relative-time)
- [Display / Conversion](#display--conversion)
- [Plugins](#plugins)

---

## Parsing

### `nano(input?, locale?)`
The main factory function to create a NanoDate instance.
- **input**: `Date | string | number | NanoDate` (optional)
- **locale**: `string` (optional, e.g., 'tr-TR', 'en-US')

```javascript
nano()                      // Current time
nano('2026-01-21')          // ISO String
nano(1737452400000)         // Timestamp
nano(new Date())            // Native Date
```

### `utc(input?)`
Create a NanoDate instance in UTC mode.

### `fromUnix(timestamp, locale?)`
Create an instance from a Unix timestamp (seconds).

---

## Formatting

### `.format(pattern?)`
Formats the date using tokens or presets.
- **Default**: `YYYY-MM-DDTHH:mm:ssZ`

#### Tokens
| Group | Token | Output |
| --- | --- | --- |
| **Year** | `YYYY` | 2026 |
| | `YY` | 26 |
| **Month** | `MMMM` | January |
| | `MMM` | Jan |
| | `MM` | 01 |
| | `M` | 1 |
| **Day** | `DD` | 21 |
| | `D` | 21 |
| | `Do` | 21st |
| **Weekday**| `dddd` | Wednesday |
| | `ddd` | Wed |
| | `dd` | W |
| **Hour** | `HH` | 14 (24h) |
| | `H` | 14 (24h) |
| | `hh` | 02 (12h) |
| | `h` | 2 (12h) |
| **Minute** | `mm` | 05 |
| | `m` | 5 |
| **Second** | `ss` | 09 |
| | `s` | 9 |
| **A/P** | `A` | PM |
| | `a` | pm |
| **Offset** | `Z` | +03:00 |
| | `ZZ` | +0300 |

#### Presets (Zero Cost)
Uses `Intl` dateStyle/timeStyle.
- `short`: `1/21/26`
- `medium`: `Jan 21, 2026`
- `long`: `January 21, 2026`
- `full`: `Wednesday, January 21, 2026`
- `short-time`, `full-time`, etc.

---

## Manipulation

All methods return a **NEW** NanoDate instance.

### `.add(value, unit)` / `.subtract(value, unit)`
- **unit**: `year`, `month`, `week`, `day`, `hour`, `minute`, `second`, `ms`

### `.startOf(unit)` / `.endOf(unit)`
- **unit**: `year`, `month`, `week`, `day`, `hour`, `minute`, `second`

### `.set(unit, value)`
Sets a specific unit value.
- **unit**: `year`, `month`, `day`, `hour`, `minute`, `second`, `millisecond`

---

## Query / Comparison

### `.isBefore(date, unit?)`
### `.isAfter(date, unit?)`
### `.isSame(date, unit?)`
### `.isSameOrBefore(date, unit?)`
### `.isSameOrAfter(date, unit?)`
### `.isBetween(start, end, unit?, inclusivity?)`
- **inclusivity**: `'()'`, `'[]'`, `'(]'`, `'[)'` (default: `'()'`)

### `.isValid()`
Checks if the date is valid.

### `.isLeapYear()`
Checks if the year is a leap year.

### `.daysInMonth()`
Returns the number of days in the month.

---

## Getters / Setters

### Getters
- `.year()`
- `.month()` (0-11)
- `.date()` (1-31)
- `.day()` (0-6, Sunday is 0)
- `.hour()`
- `.minute()`
- `.second()`
- `.millisecond()`
- `.dayOfYear()`
- `.week()`
- `.quarter()`

---

## Timezone

### `.tz(timezone, format?)`
Displays the date in a specific IANA timezone.
- **timezone**: e.g., `'America/New_York'`, `'Europe/Istanbul'`

### `.utcOffset()`
Returns the UTC offset in minutes.

---

## Relative Time

### `.fromNow(withoutSuffix?)`
"3 hours ago", "in 2 days"

### `.toNow(withoutSuffix?)`
"in 3 hours", "2 days ago"

---

## Display / Conversion

- `.toISOString()`
- `.toJSON()`
- `.valueOf()` (Unix timestamp ms)
- `.unix()` (Unix timestamp seconds)
- `.toDate()` (Returns native Date object)
- `.toString()`

---

## Plugins

### `extend(name, fn)`
Extend NanoDate with custom methods.

```javascript
import { extend } from '@qantesm/nanodate';

extend('isWeekend', (ctx) => {
  const day = ctx._d.getDay();
  return day === 0 || day === 6;
});

nano().isWeekend();
```
