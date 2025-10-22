module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/tests/**',
    '!src/server.js'
  ],
  testMatch: [
    '**/src/tests/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  verbose: true,
  forceExit: true,
  detectOpenHandles: true
};