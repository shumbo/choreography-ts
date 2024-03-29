/* eslint-env node */
module.exports = {
  env: {
    node: true,
    // https://stackoverflow.com/a/60690811
    // https://eslint.org/docs/latest/use/configure/language-options
    es6: true,
    browser: true,
    commonjs: true,
  },
  ignorePatterns: ["packages/*/dist"],
  // Linting with type information: https://typescript-eslint.io/linting/typed-linting/
  // https://typescript-eslint.io/packages/parser#project: parserOptions.project - "This setting is required if you want to use rules which require type information"
  // Configuring monorepos properly: https://typescript-eslint.io/linting/typed-linting/monorepos
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
  },
  root: true,
};
