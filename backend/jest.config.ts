import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: true,
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  setupFiles: ['<rootDir>/test/setup.ts'],
  testMatch: ['**/?(*.)+(spec|test).ts'],
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  }
}

export default config;