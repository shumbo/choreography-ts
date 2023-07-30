// common.ts: File containing exports for common testing variables
import { RuleTester } from "@typescript-eslint/rule-tester";

// It was so freaking annoying trying to fix this issue:
// https://typescript-eslint.io/linting/troubleshooting/#i-get-errors-telling-me-eslint-was-configured-to-run--however-that-tsconfig-does-not--none-of-those-tsconfigs-include-this-file
export const ruleTester = new RuleTester({
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "tsconfig.json",
    // The following directory and its files are needed to test with type information
    // https://typescript-eslint.io/packages/rule-tester/#type-aware-testing
    tsconfigRootDir: __dirname + "/fixtures",
  },
});
