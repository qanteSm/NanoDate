/**
 * NanoDate Comprehensive Benchmark Suite V2.0
 * Compares performance against: date-fns, Day.js, Moment.js, and Native Date
 * 
 * Run: node benchmarks/comprehensive.js
 * 
 * Install dependencies:
 * npm install dayjs date-fns moment --save-dev
 */

const ITERATIONS = 100_000;
const WARMUP_ITERATIONS = 1000;

// ANSI colors for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    red: '\x1b[31m',
    bold: '\x1b[1m',
    dim: '\x1b[2m'
};

const log = {
    header: (msg) => console.log(`\n${colors.bold}${colors.cyan}${msg}${colors.reset}`),
    subheader: (msg) => console.log(`${colors.yellow}${msg}${colors.reset}`),
    result: (name, time, ops, isWinner = false) => {
        const prefix = isWinner ? `${colors.green}🏆` : '  ';
        console.log(`${prefix} ${name.padEnd(35)} ${time.padStart(10)} ${ops.padStart(18)}${colors.reset}`);
    },
    separator: () => console.log(colors.dim + '─'.repeat(70) + colors.reset),
    error: (msg) => console.log(`${colors.red}⚠️  ${msg}${colors.reset}`)
};

// Stats calculation
const calcStats = (times) => {
    const sorted = [...times].sort((a, b) => a - b);
    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const stdDev = Math.sqrt(times.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / times.length);
    const cv = ((stdDev / mean) * 100).toFixed(2);
    return { mean, median, min, max, stdDev, cv };
};

// Benchmark runner with warmup and multiple runs
const benchmark = (name, fn, iterations = ITERATIONS) => {
    // Warmup
    for (let i = 0; i < WARMUP_ITERATIONS; i++) fn();

    // Force GC if available
    if (global.gc) global.gc();

    // Multiple runs for stability
    const runs = 5;
    const times = [];

    for (let r = 0; r < runs; r++) {
        const start = performance.now();
        for (let i = 0; i < iterations; i++) fn();
        times.push(performance.now() - start);
    }

    const stats = calcStats(times);
    const opsPerSec = Math.floor(iterations / (stats.median / 1000));

    return {
        name,
        time: stats.median.toFixed(2) + 'ms',
        opsPerSec: opsPerSec.toLocaleString() + ' ops/sec',
        cv: stats.cv + '%',
        rawOps: opsPerSec,
        rawTime: stats.median
    };
};

// Memory measurement
const measureMemory = () => {
    if (global.gc) global.gc();
    return process.memoryUsage().heapUsed;
};

const formatBytes = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

const runBenchmarks = async () => {
    console.log('\n' + colors.bold + '═'.repeat(70) + colors.reset);
    console.log(colors.bold + colors.cyan + '  NanoDate V3.0 Comprehensive Benchmark Suite' + colors.reset);
    console.log(colors.bold + '═'.repeat(70) + colors.reset);
    console.log(`\n  Iterations: ${ITERATIONS.toLocaleString()} | Warmup: ${WARMUP_ITERATIONS.toLocaleString()} | Runs: 5 (median used)`);
    console.log(`  Node.js: ${process.version}`);
    console.log(`  Date: ${new Date().toISOString()}\n`);

    // Dynamic imports
    const { nano } = await import('../src/index.js');

    let dayjs, dateFns, moment;

    try {
        dayjs = (await import('dayjs')).default;
        console.log('  ✅ Day.js loaded');
    } catch {
        log.error('Day.js not installed: npm install dayjs --save-dev');
    }

    try {
        dateFns = await import('date-fns');
        console.log('  ✅ date-fns loaded');
    } catch {
        log.error('date-fns not installed: npm install date-fns --save-dev');
    }

    try {
        moment = (await import('moment')).default;
        console.log('  ✅ Moment.js loaded');
    } catch {
        log.error('Moment.js not installed: npm install moment --save-dev');
    }

    const testDate = '2026-01-21T12:30:45.123Z';
    const testTimestamp = 1737459045123;

    log.separator();

    // ============================================
    // TEST 1: Object Creation
    // ============================================
    log.header('📦 TEST 1: Object Creation');
    log.subheader(`Creating date objects ${ITERATIONS.toLocaleString()} times`);
    console.log('  Library'.padEnd(35) + '  Time'.padStart(10) + '  Throughput'.padStart(18));
    log.separator();

    const creationResults = [];

    creationResults.push(benchmark('NanoDate: nano()', () => nano()));
    creationResults.push(benchmark('NanoDate: nano(timestamp)', () => nano(testTimestamp)));
    creationResults.push(benchmark('NanoDate: nano(string)', () => nano(testDate)));
    creationResults.push(benchmark('Native: new Date()', () => new Date()));
    creationResults.push(benchmark('Native: new Date(timestamp)', () => new Date(testTimestamp)));
    creationResults.push(benchmark('Native: new Date(string)', () => new Date(testDate)));

    if (dayjs) {
        creationResults.push(benchmark('Day.js: dayjs()', () => dayjs()));
        creationResults.push(benchmark('Day.js: dayjs(timestamp)', () => dayjs(testTimestamp)));
        creationResults.push(benchmark('Day.js: dayjs(string)', () => dayjs(testDate)));
    }

    if (dateFns) {
        creationResults.push(benchmark('date-fns: parseISO()', () => dateFns.parseISO(testDate)));
    }

    if (moment) {
        creationResults.push(benchmark('Moment: moment()', () => moment()));
        creationResults.push(benchmark('Moment: moment(string)', () => moment(testDate)));
    }

    const maxOps1 = Math.max(...creationResults.map(r => r.rawOps));
    creationResults.forEach(r => log.result(r.name, r.time, r.opsPerSec, r.rawOps === maxOps1));

    // ============================================
    // TEST 2: Formatting
    // ============================================
    log.header('🎨 TEST 2: Formatting');
    log.subheader(`Formatting dates ${ITERATIONS.toLocaleString()} times`);
    console.log('  Library'.padEnd(35) + '  Time'.padStart(10) + '  Throughput'.padStart(18));
    log.separator();

    const nanoDate = nano(testDate);
    const jsDate = new Date(testDate);
    const dayjsDate = dayjs ? dayjs(testDate) : null;
    const momentDate = moment ? moment(testDate) : null;

    const formatResults = [];

    formatResults.push(benchmark('NanoDate: format(YYYY-MM-DD)', () => nanoDate.format('YYYY-MM-DD')));
    formatResults.push(benchmark('NanoDate: format(complex)', () => nanoDate.format('dddd, MMMM D YYYY HH:mm:ss')));
    formatResults.push(benchmark('NanoDate: nano.format() [static]', () => nano.format(testTimestamp, 'YYYY-MM-DD')));
    formatResults.push(benchmark('Native: toISOString()', () => jsDate.toISOString()));
    formatResults.push(benchmark('Native: toLocaleDateString()', () => jsDate.toLocaleDateString()));

    if (dayjs) {
        formatResults.push(benchmark('Day.js: format(YYYY-MM-DD)', () => dayjsDate.format('YYYY-MM-DD')));
        formatResults.push(benchmark('Day.js: format(complex)', () => dayjsDate.format('dddd, MMMM D YYYY HH:mm:ss')));
    }

    if (dateFns) {
        formatResults.push(benchmark('date-fns: format()', () => dateFns.format(jsDate, 'yyyy-MM-dd')));
        formatResults.push(benchmark('date-fns: format(complex)', () => dateFns.format(jsDate, 'EEEE, MMMM d yyyy HH:mm:ss')));
    }

    if (moment) {
        formatResults.push(benchmark('Moment: format(YYYY-MM-DD)', () => momentDate.format('YYYY-MM-DD')));
        formatResults.push(benchmark('Moment: format(complex)', () => momentDate.format('dddd, MMMM D YYYY HH:mm:ss')));
    }

    const maxOps2 = Math.max(...formatResults.map(r => r.rawOps));
    formatResults.forEach(r => log.result(r.name, r.time, r.opsPerSec, r.rawOps === maxOps2));

    // ============================================
    // TEST 3: Manipulation (Add/Subtract)
    // ============================================
    log.header('➕ TEST 3: Manipulation (Add/Subtract)');
    log.subheader(`Manipulating dates ${ITERATIONS.toLocaleString()} times`);
    console.log('  Library'.padEnd(35) + '  Time'.padStart(10) + '  Throughput'.padStart(18));
    log.separator();

    const manipResults = [];

    manipResults.push(benchmark('NanoDate: add(7, days)', () => nanoDate.add(7, 'days')));
    manipResults.push(benchmark('NanoDate: add(1, month)', () => nanoDate.add(1, 'month')));
    manipResults.push(benchmark('NanoDate: nano.addTs() [static]', () => nano.addTs(testTimestamp, 7, 'days')));
    manipResults.push(benchmark('NanoDate: chain().add().value()', () => nanoDate.chain().add(7, 'days').add(2, 'hours').value()));
    manipResults.push(benchmark('NanoDate: batch().add().done()', () => nanoDate.batch().add(7, 'days').add(2, 'hours').done()));

    if (dayjs) {
        manipResults.push(benchmark('Day.js: add(7, day)', () => dayjsDate.add(7, 'day')));
        manipResults.push(benchmark('Day.js: add(1, month)', () => dayjsDate.add(1, 'month')));
    }

    if (dateFns) {
        manipResults.push(benchmark('date-fns: addDays()', () => dateFns.addDays(jsDate, 7)));
        manipResults.push(benchmark('date-fns: addMonths()', () => dateFns.addMonths(jsDate, 1)));
    }

    if (moment) {
        // Note: Moment mutations, so we clone
        manipResults.push(benchmark('Moment: add(7, days) [clone]', () => momentDate.clone().add(7, 'days')));
        manipResults.push(benchmark('Moment: add(1, month) [clone]', () => momentDate.clone().add(1, 'month')));
    }

    const maxOps3 = Math.max(...manipResults.map(r => r.rawOps));
    manipResults.forEach(r => log.result(r.name, r.time, r.opsPerSec, r.rawOps === maxOps3));

    // ============================================
    // TEST 4: Chained Operations
    // ============================================
    log.header('🔗 TEST 4: Chained Operations (3 ops)');
    log.subheader(`Chaining add().subtract().startOf() ${ITERATIONS.toLocaleString()} times`);
    console.log('  Library'.padEnd(35) + '  Time'.padStart(10) + '  Throughput'.padStart(18));
    log.separator();

    const chainResults = [];

    chainResults.push(benchmark('NanoDate: method chain', () =>
        nanoDate.add(7, 'days').subtract(2, 'hours').startOf('day')
    ));
    chainResults.push(benchmark('NanoDate: chain() helper', () =>
        nanoDate.chain().add(7, 'days').subtract(2, 'hours').value()
    ));
    chainResults.push(benchmark('NanoDate: batch() mutable', () =>
        nanoDate.batch().add(7, 'days').subtract(2, 'hours').startOf('day').done()
    ));

    if (dayjs) {
        chainResults.push(benchmark('Day.js: method chain', () =>
            dayjsDate.add(7, 'day').subtract(2, 'hour').startOf('day')
        ));
    }

    if (dateFns) {
        chainResults.push(benchmark('date-fns: pipe ops', () => {
            let d = dateFns.addDays(jsDate, 7);
            d = dateFns.subHours(d, 2);
            return dateFns.startOfDay(d);
        }));
    }

    if (moment) {
        chainResults.push(benchmark('Moment: method chain [clone]', () =>
            momentDate.clone().add(7, 'days').subtract(2, 'hours').startOf('day')
        ));
    }

    const maxOps4 = Math.max(...chainResults.map(r => r.rawOps));
    chainResults.forEach(r => log.result(r.name, r.time, r.opsPerSec, r.rawOps === maxOps4));

    // ============================================
    // TEST 5: Diff Calculation
    // ============================================
    log.header('📊 TEST 5: Diff Calculation');
    log.subheader(`Calculating date differences ${ITERATIONS.toLocaleString()} times`);
    console.log('  Library'.padEnd(35) + '  Time'.padStart(10) + '  Throughput'.padStart(18));
    log.separator();

    const otherDate = nano('2026-06-15');
    const otherJs = new Date('2026-06-15');
    const otherDayjs = dayjs ? dayjs('2026-06-15') : null;
    const otherMoment = moment ? moment('2026-06-15') : null;

    const diffResults = [];

    diffResults.push(benchmark('NanoDate: diff(days)', () => nanoDate.diff(otherDate, 'days')));
    diffResults.push(benchmark('NanoDate: diff(months)', () => nanoDate.diff(otherDate, 'months')));
    diffResults.push(benchmark('NanoDate: nano.diffTs() [static]', () => nano.diffTs(testTimestamp, otherJs.getTime(), 'days')));

    if (dayjs) {
        diffResults.push(benchmark('Day.js: diff(days)', () => dayjsDate.diff(otherDayjs, 'day')));
        diffResults.push(benchmark('Day.js: diff(months)', () => dayjsDate.diff(otherDayjs, 'month')));
    }

    if (dateFns) {
        diffResults.push(benchmark('date-fns: differenceInDays()', () => dateFns.differenceInDays(otherJs, jsDate)));
        diffResults.push(benchmark('date-fns: differenceInMonths()', () => dateFns.differenceInMonths(otherJs, jsDate)));
    }

    if (moment) {
        diffResults.push(benchmark('Moment: diff(days)', () => momentDate.diff(otherMoment, 'days')));
        diffResults.push(benchmark('Moment: diff(months)', () => momentDate.diff(otherMoment, 'months')));
    }

    const maxOps5 = Math.max(...diffResults.map(r => r.rawOps));
    diffResults.forEach(r => log.result(r.name, r.time, r.opsPerSec, r.rawOps === maxOps5));

    // ============================================
    // TEST 6: Memory Usage
    // ============================================
    log.header('💾 TEST 6: Memory Usage (100,000 objects)');
    log.subheader('Creating and measuring heap after 100,000 object creations');
    console.log('  Library'.padEnd(35) + '  Memory Delta'.padStart(15) + '  Per Object'.padStart(15));
    log.separator();

    const memoryTest = async (name, creator) => {
        if (global.gc) global.gc();
        await new Promise(r => setTimeout(r, 100));

        const before = measureMemory();
        const objects = [];
        for (let i = 0; i < 100_000; i++) {
            objects.push(creator());
        }
        const after = measureMemory();
        const delta = after - before;
        const perObject = delta / 100_000;

        // Keep reference to prevent GC
        objects.length = 0;

        return { name, delta: formatBytes(delta), perObject: perObject.toFixed(1) + ' B' };
    };

    const memResults = [];
    memResults.push(await memoryTest('NanoDate: nano()', () => nano()));
    memResults.push(await memoryTest('NanoDate: nano(timestamp)', () => nano(testTimestamp)));
    memResults.push(await memoryTest('Native: new Date()', () => new Date()));
    if (dayjs) memResults.push(await memoryTest('Day.js: dayjs()', () => dayjs()));
    if (dateFns) memResults.push(await memoryTest('date-fns: parseISO()', () => dateFns.parseISO(testDate)));
    if (moment) memResults.push(await memoryTest('Moment: moment()', () => moment()));

    memResults.forEach(r => {
        console.log(`  ${r.name.padEnd(35)} ${r.delta.padStart(15)} ${r.perObject.padStart(15)}`);
    });

    // ============================================
    // Summary
    // ============================================
    log.header('📈 Summary');
    log.separator();
    console.log(colors.green + '  ✅ Benchmark complete!' + colors.reset);
    console.log(`\n  Total tests: ${creationResults.length + formatResults.length + manipResults.length + chainResults.length + diffResults.length + memResults.length}`);
    console.log(`  Libraries compared: NanoDate, Native Date${dayjs ? ', Day.js' : ''}${dateFns ? ', date-fns' : ''}${moment ? ', Moment.js' : ''}`);
    console.log('\n' + colors.bold + '═'.repeat(70) + colors.reset + '\n');
};

// Run with garbage collection enabled
// node --expose-gc benchmarks/comprehensive.js
runBenchmarks().catch(console.error);
