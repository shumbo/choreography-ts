/* eslint-env node */
module.exports = {
  ignorePatterns: ["src", "packages/*/dist"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "eslint-plugin-choreography-lint"],
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
    "eslint-plugin-choreography-lint/no-renaming-operator": "error"
  },
  root: true,
};
