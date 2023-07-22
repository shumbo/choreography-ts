/* eslint-env node */
module.exports = {
  env: {
    node: true,
    // https://stackoverflow.com/a/60690811
    // https://eslint.org/docs/latest/use/configure/language-options
    es6: true,
    browser: true,
    commonjs: true
  },
  ignorePatterns: ["packages/*/dist"],
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
    ]
  },
  root: true,
};
