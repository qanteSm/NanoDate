import terser from '@rollup/plugin-terser';

const terserConfig = {
    compress: {
        passes: 3,
        pure_getters: true,
        unsafe: true,
        drop_console: true
    },
    mangle: {
        properties: { regex: /^_/ }
    },
    format: {
        comments: false
    }
};

export default [
    // Full bundle
    {
        input: 'src/index.js',
        output: [
            {
                file: 'dist/nanodate.esm.js',
                format: 'esm',
                sourcemap: false
            },
            {
                file: 'dist/nanodate.cjs.js',
                format: 'cjs',
                sourcemap: false
            }
        ],
        plugins: [terser(terserConfig)]
    },
    // Lite bundle (< 1KB target)
    {
        input: 'src/lite.js',
        output: [
            {
                file: 'dist/lite.esm.js',
                format: 'esm',
                sourcemap: false
            },
            {
                file: 'dist/lite.cjs.js',
                format: 'cjs',
                sourcemap: false
            }
        ],
        plugins: [terser(terserConfig)]
    }
];
