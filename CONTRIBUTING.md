# Contributing to NanoDate

Element of surprise! We're thrilled that you'd like to contribute to NanoDate. Your help is essential for keeping it great.

## ⚡ Philosophy

1. **Zero-Locale-Payload:** We never bundle locale data. Use `Intl` API.
2. **Immutable:** All operations must return a new instance.
3. **Tiny:** Every byte counts. Keep it under 1KB (lite) / 3KB (full).
4. **Tree-Shakable:** Everything must be tree-shakable.

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Check bundle size
npm run size

# Run benchmarks
npm run bench
```

## 🧪 Testing

We use [Vitest](https://vitest.dev/). Please add tests for any new features.

```bash
npm run test:run
```

## 📝 Pull Request Process

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. Ensure the test suite passes.
4. Make sure your code is cleaner than you found it.
5. Check `npm run size` to ensure no massive size increase.

## 🐛 Bug Reports

Please check existing issues before opening a new one. Provide a minimal reproduction case.

## 📜 License

By contributing, you agree that your contributions will be licensed under its MIT License.
