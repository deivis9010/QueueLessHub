/**
 * URL Validation Test Script
 * Tests the URL validator middleware for SSRF and security vulnerabilities
 *
 * Run with: node dist/scripts/test-url-validation.js
 */

import path from 'path';

type ValidationResult = {
  isValid: boolean;
  error?: string;
};

let validateUrl: (urlString: string) => ValidationResult;

try {
  ({ validateUrl } = require(path.join(__dirname, '..', 'middlewares', 'urlValidator')) as { validateUrl: (urlString: string) => ValidationResult });
} catch (error) {
  console.error('Build the TypeScript sources first with `npm run build` before running this script.');
  throw error;
}

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const testCases = [
  { name: 'Valid HTTPS URL', url: 'https://api.example.com/webhook', shouldPass: true },
  { name: 'Valid HTTP URL', url: 'http://api.example.com/callback', shouldPass: true },
  { name: 'Valid URL with port', url: 'https://api.example.com:8080/webhook', shouldPass: true },
  { name: 'Valid URL with query params', url: 'https://api.example.com/webhook?token=abc123', shouldPass: true },
  { name: 'SSRF Attack: AWS Metadata', url: 'http://169.254.169.254/latest/meta-data/', shouldPass: false, expectedError: 'metadata endpoints' },
  { name: 'SSRF Attack: AWS Metadata with path', url: 'http://169.254.169.254/latest/meta-data/iam/security-credentials/', shouldPass: false, expectedError: 'metadata endpoints' },
  { name: 'SSRF Attack: Localhost', url: 'http://localhost:27017', shouldPass: false, expectedError: 'private/internal' },
  { name: 'SSRF Attack: 127.0.0.1', url: 'http://127.0.0.1/admin', shouldPass: false, expectedError: 'private/internal' },
  { name: 'SSRF Attack: Private IP 10.x', url: 'http://10.0.0.1/internal', shouldPass: false, expectedError: 'private/internal' },
  { name: 'SSRF Attack: Private IP 192.168.x', url: 'http://192.168.1.1/router', shouldPass: false, expectedError: 'private/internal' },
  { name: 'SSRF Attack: Private IP 172.16.x', url: 'http://172.16.0.1/internal', shouldPass: false, expectedError: 'private/internal' },
  { name: 'SSRF Attack: Link-local', url: 'http://169.254.1.1/internal', shouldPass: false, expectedError: 'private/internal' },
  { name: 'Protocol Attack: file://', url: 'file:///etc/passwd', shouldPass: false, expectedError: 'Protocol file:' },
  { name: 'Protocol Attack: ftp://', url: 'ftp://example.com/file', shouldPass: false, expectedError: 'Protocol ftp:' },
  { name: 'Protocol Attack: gopher://', url: 'gopher://example.com', shouldPass: false, expectedError: 'Protocol gopher:' },
  { name: 'Protocol Attack: data://', url: 'data:text/html,<script>alert(1)</script>', shouldPass: false, expectedError: 'Protocol data:' },
  { name: 'Encoding Attack: Null byte', url: 'https://example.com/webhook%00.evil.com', shouldPass: false, expectedError: 'invalid encoded characters' },
  { name: 'Encoding Attack: Line feed', url: 'https://example.com/webhook%0a', shouldPass: false, expectedError: 'invalid encoded characters' },
  { name: 'Invalid: Empty string', url: '', shouldPass: false, expectedError: 'required' },
  { name: 'Invalid: Not a URL', url: 'not-a-url', shouldPass: false, expectedError: 'Invalid URL format' },
  { name: 'Invalid: Too long URL', url: `https://example.com/${'a'.repeat(3000)}`, shouldPass: false, expectedError: 'too long' },
  { name: 'Invalid: Missing protocol', url: 'example.com/webhook', shouldPass: false, expectedError: 'Invalid URL format' }
];

function runTests(): void {
  console.log(`${colors.blue}╔════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║    URL Validation Security Test Suite         ║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════════════╝${colors.reset}\n`);

  let passed = 0;
  let failed = 0;

  testCases.forEach((testCase) => {
    const result = validateUrl(testCase.url);
    const testPassed = result.isValid === testCase.shouldPass;

    if (testPassed) {
      console.log(`${colors.green}✓${colors.reset} ${testCase.name}`);
      if (!testCase.shouldPass && result.error) {
        console.log(`  ${colors.cyan}  Blocked: ${result.error}${colors.reset}`);
      }
      passed++;
      return;
    }

    console.log(`${colors.red}✗${colors.reset} ${testCase.name}`);
    console.log(`  ${colors.yellow}  Expected: ${testCase.shouldPass ? 'PASS' : 'BLOCK'}${colors.reset}`);
    console.log(`  ${colors.yellow}  Got: ${result.isValid ? 'PASS' : 'BLOCK'}${colors.reset}`);
    if (result.error) {
      console.log(`  ${colors.yellow}  Error: ${result.error}${colors.reset}`);
    }
    failed++;
  });

  console.log(`\n${colors.blue}═══════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}Total tests: ${testCases.length}${colors.reset}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════${colors.reset}\n`);

  if (failed === 0) {
    console.log(`${colors.green}✓ All tests passed! URL validation is working correctly.${colors.reset}\n`);
    return;
  }

  console.log(`${colors.red}✗ Some tests failed. Please review the implementation.${colors.reset}\n`);
  process.exit(1);
}

runTests();