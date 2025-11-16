module.exports = {
  preset: 'ts-jest',
  // Use jsdom to support React Testing Library hooks
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        moduleResolution: 'node',
        module: 'commonjs',
      },
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(nanoid)/)',
  ],
  collectCoverageFrom: [
    '**/*.ts',
    '**/*.d.ts',
    '/app/**/*.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  extensionsToTreatAsEsm: [],
};
