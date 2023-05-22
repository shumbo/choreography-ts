/**
 * Base Jest configuration for all projects.
 *
 * Run `pnpm add --save-dev jest typescript ts-jest @types/jest` to install the necessary dependencies and
 * import this file in the `jest.config.ts` file.
 */

import type { JestConfigWithTsJest } from "ts-jest";

export const JestConfigBase: JestConfigWithTsJest = {
  // [...]
  maxWorkers: 1,
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    // '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
    // '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
  },
};
