import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.spec.ts'],
  coverageProvider: 'v8',                        // fix: sem Babel/caniuse-lite
  collectCoverageFrom: [
    'src/domain/entities/**/*.ts',               // fix: só arquivos com lógica
    'src/domain/errors/**/*.ts',
    'src/domain/value-objects/**/*.ts',
    'src/application/use-cases/**/*.ts',
    'src/application/mappers/**/*.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
      },
    }],
  },
  setupFiles: ['<rootDir>/tests/setup.ts'],
};

export default config;