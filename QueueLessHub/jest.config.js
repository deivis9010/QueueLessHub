module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/tests/**',
    '!src/server.js',
    '!src/server.vercel.js',
    '!src/swagger.js',
    '!src/swagger-components.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],
  coverageThreshold: {
    global: {
      statements: 50,
      branches: 30,
      functions: 65,
      lines: 50
    }
  },
  testMatch: [
    '**/src/tests/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  maxWorkers: '50%'
};