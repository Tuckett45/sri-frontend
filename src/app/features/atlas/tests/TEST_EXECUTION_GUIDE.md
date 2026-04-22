# ATLAS Test Execution Guide

## Overview

This guide provides instructions for running the comprehensive ATLAS integration test suite.

## Test Structure

```
src/app/features/atlas/tests/
├── integration/          # Backend API integration tests
├── e2e/                 # End-to-end workflow tests
├── performance/         # Performance and optimization tests
├── security/            # Security and authentication tests
├── accessibility/       # WCAG 2.1 AA compliance tests
└── cross-browser/       # Cross-browser compatibility tests
```

## Running Tests

### Run All Tests

```bash
npm test
```

This will:
- Launch Karma test runner
- Open Chrome browser
- Execute all test suites
- Display results in terminal and browser

### Run Specific Test Suite

```bash
# Integration tests
npm test -- --include='**/atlas-backend-integration.spec.ts'

# E2E tests
npm test -- --include='**/atlas-workflows.e2e.spec.ts'

# Performance tests
npm test -- --include='**/atlas-performance.spec.ts'

# Security tests
npm test -- --include='**/atlas-security.spec.ts'

# Accessibility tests
npm test -- --include='**/atlas-accessibility.spec.ts'

# Cross-browser tests
npm test -- --include='**/atlas-cross-browser.spec.ts'
```

### Run Tests with Coverage

```bash
npm test -- --code-coverage
```

Coverage reports will be generated in `coverage/` directory.

### Run Tests in Headless Mode (CI/CD)

```bash
npm test -- --browsers=ChromeHeadless --watch=false
```

## Test Configuration

### Karma Configuration

Tests are configured in `angular.json` under the `test` architect:

```json
{
  "test": {
    "builder": "@angular-devkit/build-angular:karma",
    "options": {
      "main": "src/test.ts",
      "polyfills": "src/polyfills.ts",
      "tsConfig": "tsconfig.spec.json",
      "karmaConfig": "karma.conf.js"
    }
  }
}
```

### Browser Configuration

By default, tests run in Chrome. To test in other browsers:

```bash
# Firefox
npm test -- --browsers=Firefox

# Safari (macOS only)
npm test -- --browsers=Safari

# Edge
npm test -- --browsers=Edge

# Multiple browsers
npm test -- --browsers=Chrome,Firefox,Edge
```

## Test Categories

### 1. Integration Tests

**File**: `integration/atlas-backend-integration.spec.ts`

**Purpose**: Verify ATLAS API integration

**Coverage**:
- Authentication flows
- API endpoint calls
- Error handling
- Request/response validation

**Expected Results**: All API integrations work correctly

---

### 2. End-to-End Tests

**File**: `e2e/atlas-workflows.e2e.spec.ts`

**Purpose**: Test complete user workflows

**Coverage**:
- Deployment lifecycle
- State management
- Real-time updates
- Multi-feature coordination

**Expected Results**: All workflows complete successfully

---

### 3. Performance Tests

**File**: `performance/atlas-performance.spec.ts`

**Purpose**: Verify performance benchmarks

**Coverage**:
- Large dataset handling
- Caching efficiency
- Request batching
- Memory management

**Performance Targets**:
- API response: < 1 second
- Large dataset render: < 2 seconds
- Cache hit: < 10ms
- Virtual scroll render: < 100ms

---

### 4. Security Tests

**File**: `security/atlas-security.spec.ts`

**Purpose**: Verify security measures

**Coverage**:
- Authentication security
- Input sanitization
- Response validation
- HTTPS enforcement
- Token security

**Expected Results**: All security measures pass

---

### 5. Accessibility Tests

**File**: `accessibility/atlas-accessibility.spec.ts`

**Purpose**: Verify WCAG 2.1 AA compliance

**Coverage**:
- Screen reader support
- Keyboard navigation
- Color contrast (4.5:1 for normal text, 3:1 for large text)
- Focus management
- Semantic HTML

**Expected Results**: All accessibility requirements met

---

### 6. Cross-Browser Tests

**File**: `cross-browser/atlas-cross-browser.spec.ts`

**Purpose**: Verify browser compatibility

**Coverage**:
- Chrome, Firefox, Safari, Edge
- Responsive design (mobile, tablet, desktop)
- Modern web features
- CSS Grid/Flexbox

**Expected Results**: Consistent behavior across browsers

## Continuous Integration

### GitHub Actions Example

```yaml
name: ATLAS Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test -- --browsers=ChromeHeadless --watch=false --code-coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v2
        with:
          files: ./coverage/lcov.info
```

## Troubleshooting

### Tests Fail to Start

**Issue**: Karma fails to start

**Solution**:
```bash
# Clear cache
rm -rf node_modules/.cache

# Reinstall dependencies
npm ci

# Try again
npm test
```

### Browser Not Found

**Issue**: Browser not detected

**Solution**:
```bash
# Install Chrome
# Windows: Download from google.com/chrome
# macOS: brew install --cask google-chrome
# Linux: sudo apt-get install google-chrome-stable

# Or use headless mode
npm test -- --browsers=ChromeHeadless
```

### Tests Timeout

**Issue**: Tests exceed timeout

**Solution**:
- Increase timeout in test file
- Check for infinite loops
- Verify async operations complete

### Memory Issues

**Issue**: Out of memory errors

**Solution**:
```bash
# Increase Node memory
export NODE_OPTIONS="--max-old-space-size=4096"
npm test
```

## Test Maintenance

### Adding New Tests

1. Create test file in appropriate directory
2. Follow naming convention: `*.spec.ts`
3. Import required dependencies
4. Write tests using Jasmine syntax
5. Run tests to verify

### Updating Tests

1. Locate test file
2. Update test cases
3. Run affected tests
4. Verify all tests pass

### Debugging Tests

```bash
# Run single test file
npm test -- --include='**/my-test.spec.ts'

# Enable debug mode
npm test -- --browsers=Chrome --watch=true

# Use browser DevTools
# Tests will pause at debugger statements
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up after tests (afterEach)
3. **Mocking**: Use mocks for external dependencies
4. **Assertions**: Use clear, specific assertions
5. **Naming**: Use descriptive test names
6. **Coverage**: Aim for >80% code coverage
7. **Performance**: Keep tests fast (< 5 seconds each)

## Coverage Reports

After running tests with coverage:

```bash
# View HTML report
open coverage/index.html

# View terminal summary
cat coverage/coverage-summary.txt
```

Coverage targets:
- Statements: > 80%
- Branches: > 75%
- Functions: > 80%
- Lines: > 80%

## Resources

- [Angular Testing Guide](https://angular.io/guide/testing)
- [Jasmine Documentation](https://jasmine.github.io/)
- [Karma Documentation](https://karma-runner.github.io/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

## Support

For issues or questions:
1. Check this guide
2. Review test file comments
3. Consult Angular testing documentation
4. Contact development team

---

**Last Updated**: Task 41 Implementation
**Test Suite Version**: 1.0.0
**Status**: Ready for execution
