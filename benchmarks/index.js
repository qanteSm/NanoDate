/**
 * NanoDate Benchmark Suite
 * Compares performance against Day.js and native Date
 */

// Note: Install day.js for comparison: npm install dayjs --save-dev

const runBenchmarks = async () => {
    console.log('\n🕐 NanoDate Benchmark Suite\n');
    console.log('━'.repeat(60));

    // Dynamic import for ESM
    const { nano } = await import('../src/index.js');

    let dayjs;
    try {
        dayjs = (await import('dayjs')).default;
    } catch {
        console.log('⚠️  Day.js not installed. Install with: npm install dayjs --save-dev');
        dayjs = null;
    }

    const iterations = 10000;
    const testDate = '2026-01-21T12:30:45.123Z';

    // Helper function
    const benchmark = (name, fn) => {
        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
            fn();
        }
        const end = performance.now();
        const time = (end - start).toFixed(2);
        const opsPerSec = Math.floor(iterations / ((end - start) / 1000));
        return { name, time, opsPerSec };
    };

    const results = [];

    // 1. Creation
    console.log('\n📌 Creation (10,000 iterations)\n');

    results.push(benchmark('NanoDate: nano()', () => nano()));
    results.push(benchmark('NanoDate: nano(string)', () => nano(testDate)));
    results.push(benchmark('Native: new Date()', () => new Date()));
    results.push(benchmark('Native: new Date(string)', () => new Date(testDate)));

    if (dayjs) {
        results.push(benchmark('Day.js: dayjs()', () => dayjs()));
        results.push(benchmark('Day.js: dayjs(string)', () => dayjs(testDate)));
    }

    results.forEach(r => {
        console.log(`  ${r.name.padEnd(30)} ${r.time}ms (${r.opsPerSec.toLocaleString()} ops/sec)`);
    });
    results.length = 0;

    // 2. Formatting
    console.log('\n📌 Formatting (10,000 iterations)\n');

    const nanoDate = nano(testDate);
    const jsDate = new Date(testDate);
    const dayjsDate = dayjs ? dayjs(testDate) : null;

    results.push(benchmark('NanoDate: format(YYYY-MM-DD)', () => nanoDate.format('YYYY-MM-DD')));
    results.push(benchmark('NanoDate: format(short)', () => nanoDate.format('short')));
    results.push(benchmark('Native: toLocaleDateString()', () => jsDate.toLocaleDateString()));
    results.push(benchmark('Native: Intl.DateTimeFormat', () =>
        new Intl.DateTimeFormat('en', { dateStyle: 'short' }).format(jsDate)
    ));

    if (dayjs) {
        results.push(benchmark('Day.js: format(YYYY-MM-DD)', () => dayjsDate.format('YYYY-MM-DD')));
    }

    results.forEach(r => {
        console.log(`  ${r.name.padEnd(40)} ${r.time}ms (${r.opsPerSec.toLocaleString()} ops/sec)`);
    });
    results.length = 0;

    // 3. Manipulation
    console.log('\n📌 Manipulation (10,000 iterations)\n');

    results.push(benchmark('NanoDate: add(7, days)', () => nanoDate.add(7, 'days')));
    results.push(benchmark('NanoDate: subtract(1, month)', () => nanoDate.subtract(1, 'month')));
    results.push(benchmark('NanoDate: startOf(month)', () => nanoDate.startOf('month')));

    if (dayjs) {
        results.push(benchmark('Day.js: add(7, day)', () => dayjsDate.add(7, 'day')));
        results.push(benchmark('Day.js: subtract(1, month)', () => dayjsDate.subtract(1, 'month')));
        results.push(benchmark('Day.js: startOf(month)', () => dayjsDate.startOf('month')));
    }

    results.forEach(r => {
        console.log(`  ${r.name.padEnd(40)} ${r.time}ms (${r.opsPerSec.toLocaleString()} ops/sec)`);
    });
    results.length = 0;

    // 4. Relative Time
    console.log('\n📌 Relative Time (10,000 iterations)\n');

    const pastDate = nano(Date.now() - 86400000); // 1 day ago

    results.push(benchmark('NanoDate: fromNow()', () => pastDate.fromNow()));

    if (dayjs) {
        const dayjsPast = dayjs(Date.now() - 86400000);
        // Note: Day.js requires relativeTime plugin
        try {
            const relativeTime = (await import('dayjs/plugin/relativeTime.js')).default;
            dayjs.extend(relativeTime);
            results.push(benchmark('Day.js: fromNow()', () => dayjsPast.fromNow()));
        } catch {
            console.log('  Day.js: relativeTime plugin not available');
        }
    }

    results.forEach(r => {
        console.log(`  ${r.name.padEnd(40)} ${r.time}ms (${r.opsPerSec.toLocaleString()} ops/sec)`);
    });
    results.length = 0;

    // 5. Timezone
    console.log('\n📌 Timezone Formatting (10,000 iterations)\n');

    results.push(benchmark('NanoDate: tz(America/New_York)', () => nanoDate.tz('America/New_York')));
    results.push(benchmark('Native: Intl with timeZone', () =>
        new Intl.DateTimeFormat('en', { timeZone: 'America/New_York', dateStyle: 'medium' }).format(jsDate)
    ));

    results.forEach(r => {
        console.log(`  ${r.name.padEnd(40)} ${r.time}ms (${r.opsPerSec.toLocaleString()} ops/sec)`);
    });

    console.log('\n' + '━'.repeat(60));
    console.log('✅ Benchmark complete!\n');
};

runBenchmarks().catch(console.error);
