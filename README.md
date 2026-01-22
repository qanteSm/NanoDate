<p align="center">
  <img src="https://img.shields.io/npm/v/@qantesm/nanodate?style=for-the-badge&color=blue" alt="npm version" />
  <img src="https://img.shields.io/bundlephobia/minzip/@qantesm/nanodate?style=for-the-badge&color=brightgreen&label=size" alt="Bundle Size" />
  <img src="https://img.shields.io/badge/zero--locale--payload-✓-purple?style=for-the-badge" alt="Zero Locale Payload" />
  <img src="https://img.shields.io/badge/immutable-100%25-orange?style=for-the-badge" alt="100% Immutable" />
  <img src="https://img.shields.io/npm/l/@qantesm/nanodate?style=for-the-badge&color=green" alt="MIT License" />
</p>

<h1 align="center">🕐 NanoDate</h1>

<p align="center">
  <strong>Stop teaching your browser how to speak.</strong><br>
  <em>Dünyanın ilk "Zero-Locale" tarih kütüphanesi.</em>
</p>

<p align="center">
  <a href="#-the-size-difference">Size Comparison</a> •
  <a href="#-why-nanodate">Why NanoDate</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="./API.md">Full API Reference</a> •
  <a href="#-runtime-support">Runtime Support</a>
</p>

---

## 📊 The Size Difference

| | Moment.js | Day.js | Luxon | 🏆 NanoDate |
|---|---|---|---|---|
| **Core Size** | ❌ 72 KB | ⚠️ 2 KB | ❌ 23 KB | ✅ **0.69 KB (Lite)** |
| **+ Turkish** | + 3 KB | + 1 KB | + 0 KB | **+ 0 KB** |
| **+ Japanese** | + 4 KB | + 1 KB | + 0 KB | **+ 0 KB** |
| **All 400+ Langs** | 😱 ~350 KB | 😰 ~100 KB | ⚠️ ~23 KB | 🎉 **0.69 KB** |
| **Timezone Data** | + 40 KB | + 40 KB | Built-in | ✅ **0 KB (Native)** |

> **How is this possible?** NanoDate uses the browser's built-in `Intl` API instead of bundling locale data. Your browser already knows how to say "January" in 400+ languages! 🌍

---

## ⚡ Performance

NanoDate is engineered for extreme performance, consistently outperforming popular libraries in real-world scenarios.

| Category | Winner | NanoDate | vs Day.js | Memory |
| :--- | :--- | :--- | :--- | :--- |
| **Formatting** | 🥇 **NanoDate** | **~9.8M ops/s** | **19x faster** | 0 B (Static) |
| **Diffing** | 🥇 **NanoDate** | **~8.9M ops/s** | **4.4x faster** | 0 B (Static) |
| **Chained Ops** | 🥇 **NanoDate** | **~5.8M ops/s** | **12x faster** | Optimized |
| **Object Creation**| Native | ~6.2M ops/s | 1.3x faster | 177 B |

> Benchmarks run on Node.js v24, 100,000 iterations. [See full benchmarks →](./benchmarks/comprehensive.js)

---

## 🧪 The V8 Philosophy: How are we so fast?

NanoDate isn't just small; it's optimized for the V8 engine's internal mechanics.

### 1. Regex-Free Parsing
Most libraries use complex RegEx for ISO parsing, which is slow and memory-intensive. NanoDate uses a **pure character-code indexing** parser (`ultraFastParse`) that achieves 5M+ ops/sec by avoiding regex overhead.

### 2. Hidden Classes & Monomorphism
We ensure all `NanoDate` contexts have a consistent shape. By avoiding dynamic property additions after initialization, we help V8 keep the objects in "Fast Mode" with optimized hidden classes.

### 3. Zero-Allocation Patterns
Our `.chain()` and `.batch()` helpers reuse internal context objects to minimize Garbage Collection (GC) pressure. In high-frequency operations (like rendering a 10,000-row table), this prevents "jank" caused by memory churn.

---

## 🚀 Key Features

- ✅ **< 0.7KB** Core (Lite bundle, brotlied)
- ✅ **Zero Locale Payload** - 400+ languages with 0 bytes extra.
- ✅ **Intl-Native** - Uses the platform, doesn't reinvent it.
- ✅ **100% Immutable** - No mutation bugs, ever.
- ✅ **Tree-shakable** - Pay only for what you use.

---

## 📦 Installation

```bash
npm install @qantesm/nanodate
```

```javascript
import { nano } from '@qantesm/nanodate';

// Standard Usage
nano('2026-01-21', 'tr').format('dddd'); // "Çarşamba"

// 🚀 Performance Mode: Chain (Zero-allocation)
const ts = nano().chain().add(7, 'days').subtract(2, 'hours').value();

// 📅 Calendar View
nano().calendar(); // "Today at 2:30 PM"
nano().subtract(1, 'day').calendar(); // "Yesterday at 2:30 PM"

// 🕒 Durations
nano.duration(5000).humanize(); // "5 seconds"
```


---

## 📦 Installation

```bash
npm install @qantesm/nanodate
```

```bash
yarn add @qantesm/nanodate
```

```bash
pnpm add @qantesm/nanodate
```

### Choose Your Bundle

```javascript
// Full features (~2.5KB gzipped)
import { nano } from '@qantesm/nanodate';

// Minimal core (< 1KB gzipped)
import { nano } from '@qantesm/nanodate/lite';
```

---

## ⚡ Quick Start

```javascript
import { nano } from '@qantesm/nanodate';

// Current date
nano().format('YYYY-MM-DD');  // "2026-01-21"

// With Turkish locale - NO extra bundle!
nano('2026-01-21', 'tr').format('dddd, MMMM Do YYYY');
// "Çarşamba, Ocak 21. 2026"

// With Japanese locale - STILL no extra bundle!
nano('2026-01-21', 'ja').format('dddd');
// "水曜日"

// Relative time (zero locale payload!)
nano('2026-01-20').fromNow();       // "1 day ago"
nano('2026-01-20', 'tr').fromNow(); // "1 gün önce"
nano('2026-01-20', 'ja').fromNow(); // "1日前"
nano('2026-01-20', 'ar').fromNow(); // "منذ يوم واحد"

// Immutable manipulation
nano()
  .add(7, 'days')
  .startOf('month')
  .format('DD MMMM YYYY');  // "01 Şubat 2026"

// Timezone (zero-cost!)
nano().tz('America/New_York');  // NYC time
nano().tz('Asia/Tokyo');        // Tokyo time
```

---

## 📖 API

### Creating Dates

```javascript
import { nano, utc, fromUnix } from '@qantesm/nanodate';

nano()                      // Now
nano('2026-01-21')          // ISO string
nano(1737452400000)         // Unix timestamp (ms)
nano(new Date())            // Date object
nano('2026-01-21', 'tr')    // With locale

utc()                       // Now in UTC
fromUnix(1737452400)        // Unix timestamp (seconds)
```

### Formatting

```javascript
// Token-based formatting
nano().format('YYYY-MM-DD');           // "2026-01-21"
nano().format('dddd, MMMM Do YYYY');   // "Wednesday, January 21st 2026"
nano().format('HH:mm:ss');             // "12:36:33"
nano().format('hh:mm A');              // "12:36 PM"

// Preset formats (uses native Intl dateStyle - zero extra bytes!)
nano().format('short');                // "1/21/26"
nano().format('medium');               // "Jan 21, 2026"
nano().format('long');                 // "January 21, 2026"
nano().format('full');                 // "Wednesday, January 21, 2026"
nano().format('full-time');            // Full date with time

// Escape characters with brackets
nano().format('[Today is] dddd');      // "Today is Wednesday"
```

#### Format Tokens

| Token | Output | Description |
|-------|--------|-------------|
| `YYYY` | 2026 | 4-digit year |
| `YY` | 26 | 2-digit year |
| `MMMM` | January | Full month name |
| `MMM` | Jan | Short month name |
| `MM` | 01 | 2-digit month |
| `M` | 1 | Month number |
| `DD` | 21 | 2-digit day |
| `D` | 21 | Day number |
| `Do` | 21st | Day with ordinal |
| `dddd` | Wednesday | Full weekday |
| `ddd` | Wed | Short weekday |
| `HH` | 09 | 24-hour (2-digit) |
| `H` | 9 | 24-hour |
| `hh` | 09 | 12-hour (2-digit) |
| `h` | 9 | 12-hour |
| `mm` | 05 | Minutes (2-digit) |
| `ss` | 30 | Seconds (2-digit) |
| `A` | AM/PM | Uppercase |
| `a` | am/pm | Lowercase |
| `Z` | +03:00 | UTC offset |
| `ZZ` | +0300 | UTC offset (no colon) |

### Relative Time

```javascript
nano('2026-01-20').fromNow();     // "1 day ago"
nano('2026-01-28').fromNow();     // "in 7 days"
nano('2026-01-21T11:00').fromNow(); // "1 hour ago"

// Works in ANY language without extra bundles!
nano('2026-01-20', 'tr').fromNow(); // "1 gün önce"
nano('2026-01-20', 'de').fromNow(); // "vor 1 Tag"
nano('2026-01-20', 'ja').fromNow(); // "1日前"
nano('2026-01-20', 'ar').fromNow(); // "منذ يوم واحد"
nano('2026-01-20', 'ko').fromNow(); // "1일 전"
nano('2026-01-20', 'ru').fromNow(); // "1 день назад"
```

### Manipulation (Immutable)

```javascript
// All operations return NEW instances - no mutation bugs!
const today = nano();
const nextWeek = today.add(7, 'days');
const lastMonth = today.subtract(1, 'month');

console.log(today.date());     // 21 (unchanged!)
console.log(nextWeek.date());  // 28

// Chain operations
nano()
  .add(1, 'month')
  .subtract(3, 'days')
  .startOf('week')
  .format('YYYY-MM-DD');

// Start/End of units
nano().startOf('month');   // First day of month, 00:00:00.000
nano().startOf('year');    // Jan 1st, 00:00:00.000
nano().endOf('day');       // 23:59:59.999
nano().endOf('month');     // Last day of month, 23:59:59.999
```

### Comparison

```javascript
const date1 = nano('2026-01-21');
const date2 = nano('2026-01-28');

date1.isBefore(date2);           // true
date1.isAfter(date2);            // false
date1.isSame(date2, 'month');    // true (same month)
date1.diff(date2, 'days');       // -7
date1.isValid();                 // true
```

### Timezone (Zero-Cost)

```javascript
// Format in any timezone WITHOUT extra timezone bundles!
nano().tz('America/New_York');    // NYC time
nano().tz('Asia/Tokyo');          // Tokyo time
nano().tz('Europe/London', 'full'); // Full format in London

// Get current timezone
import { getTimezone } from '@qantesm/nanodate';
getTimezone();  // "Europe/Istanbul"

// Get UTC offset
nano().utcOffset();  // 180 (for UTC+3)
```

---

## 🌐 Runtime Support

NanoDate uses the native `Intl` API which is available in all modern environments.

### ✅ Fully Supported

| Environment | Version | Intl Support |
|-------------|---------|--------------|
| **Chrome** | 71+ | Full |
| **Firefox** | 65+ | Full |
| **Safari** | 14+ | Full |
| **Edge** | 79+ | Full |
| **Node.js** | 18+ | Full (built-in ICU) |
| **Deno** | All | Full |
| **Bun** | All | Full |

### ⚠️ Edge Cases

<details>
<summary><strong>Node.js < 18 or Alpine Linux (Docker)</strong></summary>

Some minimal environments may have limited Intl support:

```bash
# Check if full ICU is available
node -e "console.log(new Intl.DateTimeFormat('tr').format(new Date()))"
```

If you see English instead of Turkish, install full ICU:

```bash
# For Node.js < 18
npm install full-icu
node --icu-data-dir=./node_modules/full-icu your-script.js

# For Alpine Docker
apk add icu-data-full
```

**Recommendation:** Use **Node.js 18+** which includes full ICU by default.

</details>

<details>
<summary><strong>Checking Intl Support Programmatically</strong></summary>

```javascript
import { checkIntlSupport } from '@qantesm/nanodate';

if (!checkIntlSupport()) {
  console.warn('Limited locale support detected');
}
```

</details>

---

## 🔬 Philosophy

### "Zero-Locale-Payload"

Traditional date libraries ship megabytes of locale data because they don't trust the browser. In 2026, every modern browser ships with full `Intl` support including:

- `Intl.DateTimeFormat` - 400+ locales for date/time formatting
- `Intl.RelativeTimeFormat` - "3 days ago" in any language
- Built-in timezone database (IANA)

**NanoDate trusts the platform.** We use what's already there.

### Immutable by Design

Every operation returns a new instance. No more bugs from accidentally mutating dates:

```javascript
// ❌ Moment.js (mutable - dangerous!)
const date = moment();
const tomorrow = date.add(1, 'day');  // date is ALSO modified!
console.log(date.date());  // 22 - unexpected!

// ✅ NanoDate (immutable - safe!)
const date = nano();
const tomorrow = date.add(1, 'day');  // date is UNCHANGED
console.log(date.date());  // 21 - expected!
```

### Tree-Shakable

Only import what you need:

```javascript
// Only format? ~500 bytes
import { nano } from '@qantesm/nanodate/lite';
nano().format('YYYY-MM-DD');

// Full library with relative time, timezone, etc.? ~2.5KB
import { nano } from '@qantesm/nanodate';
```

---

## � Real-World Examples

### 📅 Calendar Application

```javascript
import { nano } from '@qantesm/nanodate';

// Get all days in current month
const today = nano();
const firstDay = today.startOf('month');
const lastDay = today.endOf('month');

console.log(`Month: ${today.format('MMMM YYYY')}`);
console.log(`Days: ${firstDay.date()} - ${lastDay.date()}`);

// Generate week headers in user's locale
const weekDays = [];
for (let i = 0; i < 7; i++) {
  weekDays.push(nano().startOf('week').add(i, 'days').format('ddd'));
}
console.log(weekDays); // ["Sun", "Mon", "Tue", ...] or localized
```

### 🛒 E-Commerce: Order Tracking

```javascript
import { nano } from '@qantesm/nanodate';

const order = {
  createdAt: '2026-01-18T10:30:00Z',
  estimatedDelivery: '2026-01-25T18:00:00Z'
};

// Show relative time for order status
const created = nano(order.createdAt, 'tr');
const delivery = nano(order.estimatedDelivery, 'tr');

console.log(`Sipariş verildi: ${created.fromNow()}`);
// "Sipariş verildi: 3 gün önce"

console.log(`Tahmini teslimat: ${delivery.fromNow()}`);
// "Tahmini teslimat: 4 gün içinde"

// Format for display
console.log(`Teslimat: ${delivery.format('DD MMMM dddd')}`);
// "Teslimat: 25 Ocak Pazar"
```

### 💬 Chat Application: Message Timestamps

```javascript
import { nano } from '@qantesm/nanodate';

function formatMessageTime(timestamp, userLocale) {
  const msg = nano(timestamp, userLocale);
  const now = nano();
  
  // Today: show time only
  if (msg.isSame(now, 'day')) {
    return msg.format('HH:mm');
  }
  
  // This week: show day name
  if (msg.isSame(now, 'week')) {
    return msg.format('dddd HH:mm');
  }
  
  // Older: show full date
  return msg.format('DD MMM YYYY');
}

// User in Turkey
formatMessageTime('2026-01-21T08:30:00', 'tr'); // "08:30"
formatMessageTime('2026-01-19T14:00:00', 'tr'); // "Pazar 14:00"
formatMessageTime('2026-01-10T10:00:00', 'tr'); // "10 Oca 2026"
```

### 📊 Dashboard: Analytics Date Ranges

```javascript
import { nano } from '@qantesm/nanodate';

function getDateRange(period) {
  const now = nano();
  
  switch (period) {
    case 'today':
      return {
        start: now.startOf('day'),
        end: now.endOf('day')
      };
    case 'this-week':
      return {
        start: now.startOf('week'),
        end: now.endOf('week')
      };
    case 'this-month':
      return {
        start: now.startOf('month'),
        end: now.endOf('month')
      };
    case 'last-30-days':
      return {
        start: now.subtract(30, 'days').startOf('day'),
        end: now.endOf('day')
      };
    case 'this-year':
      return {
        start: now.startOf('year'),
        end: now.endOf('year')
      };
  }
}

const range = getDateRange('last-30-days');
console.log(`${range.start.format('YYYY-MM-DD')} to ${range.end.format('YYYY-MM-DD')}`);
// "2025-12-22 to 2026-01-21"
```

### 🌍 Multi-Timezone Meeting Scheduler

```javascript
import { nano } from '@qantesm/nanodate';

function showMeetingTimes(meetingTimeUTC) {
  const meeting = nano(meetingTimeUTC);
  
  const timezones = [
    { name: 'New York', tz: 'America/New_York' },
    { name: 'London', tz: 'Europe/London' },
    { name: 'Istanbul', tz: 'Europe/Istanbul' },
    { name: 'Tokyo', tz: 'Asia/Tokyo' }
  ];
  
  console.log('📅 Meeting scheduled:');
  timezones.forEach(({ name, tz }) => {
    console.log(`  ${name}: ${meeting.tz(tz)}`);
  });
}

showMeetingTimes('2026-01-25T15:00:00Z');
// 📅 Meeting scheduled:
//   New York: Jan 25, 2026, 10:00 AM
//   London: Jan 25, 2026, 3:00 PM
//   Istanbul: Jan 25, 2026, 6:00 PM
//   Tokyo: Jan 26, 2026, 12:00 AM
```

### 🎂 Birthday/Age Calculator

```javascript
import { nano } from '@qantesm/nanodate';

function getAge(birthdate) {
  const birth = nano(birthdate);
  const today = nano();
  return today.diff(birth, 'years');
}

function getNextBirthday(birthdate, locale) {
  const birth = nano(birthdate);
  const today = nano();
  
  let nextBday = nano()
    .startOf('year')
    .add(birth.month(), 'months')
    .add(birth.date() - 1, 'days');
  
  // If birthday passed this year, use next year
  if (nextBday.isBefore(today)) {
    nextBday = nextBday.add(1, 'year');
  }
  
  return {
    date: nextBday.format('DD MMMM', locale),
    daysUntil: nextBday.diff(today, 'days')
  };
}

console.log(getAge('1990-05-15')); // 35
console.log(getNextBirthday('1990-05-15', 'tr')); 
// { date: "15 Mayıs", daysUntil: 114 }
```

### ⏰ Countdown Timer

```javascript
import { nano } from '@qantesm/nanodate';

function countdown(targetDate, locale) {
  const target = nano(targetDate);
  const now = nano();
  
  if (target.isBefore(now)) {
    return 'Event has passed';
  }
  
  const days = target.diff(now, 'days');
  const hours = target.diff(now, 'hours') % 24;
  const minutes = target.diff(now, 'minutes') % 60;
  
  return {
    days,
    hours,
    minutes,
    formatted: target.format('full', locale),
    relative: target.fromNow()
  };
}

countdown('2026-12-31T23:59:59', 'tr');
// {
//   days: 344,
//   hours: 10,
//   minutes: 23,
//   formatted: "31 Aralık 2026 Perşembe",
//   relative: "11 ay içinde"
// }
```

---

## �🚀 Perfect for Edge

NanoDate is optimized for serverless edge environments where size matters:

| Platform | Status | Notes |
|----------|--------|-------|
| **Cloudflare Workers** | ✅ Perfect | < 1KB is ideal for 1MB limit |
| **Vercel Edge Functions** | ✅ Perfect | Minimal cold start |
| **Deno Deploy** | ✅ Native | Full Intl support |
| **AWS Lambda@Edge** | ✅ Recommended | Fast initialization |
| **Fastly Compute** | ✅ Great | WASM-compatible |

---

## 📄 License

MIT © [Muhammet Ali Büyük](https://github.com/qantesm)

---

<p align="center">
  <strong>🕐 NanoDate</strong><br>
  <em>Less code. More languages. Zero payload.</em>
</p>

<p align="center">
  <a href="https://github.com/qantesm/nanodate">GitHub</a> •
  <a href="https://www.npmjs.com/package/@qantesm/nanodate">npm</a> •
  <a href="https://stackblitz.com/edit/nanodate-playground?file=src%2Fmain.js">Playground</a>
</p>




