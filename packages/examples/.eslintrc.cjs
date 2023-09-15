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
  // Linting with type information: https://typescript-eslint.io/linting/typed-linting/
  // https://typescript-eslint.io/packages/parser#project: parserOptions.project - "This setting is required if you want to use rules which require type information"
  // Configuring monorepos properly: https://typescript-eslint.io/linting/typed-linting/monorepos
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@choreography-ts/choreography-ts/base",
    "prettier",
  ],
  parserOptions: {
    project: ["./tsconfig.json"], // Required for using rules that need type information!
    tsConfigRootDir: __dirname,
  },
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "@choreography-ts/choreography-ts"],
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
