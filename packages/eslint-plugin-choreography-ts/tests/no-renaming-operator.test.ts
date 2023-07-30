// Testing: https://typescript-eslint.io/packages/rule-tester
// Three files needed: ../file.ts, ../react.tsx, ../tsconfig.json
import { RuleTester } from "@typescript-eslint/rule-tester";
import noRenameRule from "../src/no-renaming-operator";

// So freaking annoying to fix this issue: https://typescript-eslint.io/linting/troubleshooting/#i-get-errors-telling-me-eslint-was-configured-to-run--however-that-tsconfig-does-not--none-of-those-tsconfigs-include-this-file
const ruleTester = new RuleTester({
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "tsconfig.json",
    tsconfigRootDir: __dirname + "/fixtures", // This directiory and its files needed to test with type information
  },
});

ruleTester.run("no-renaming-operator", noRenameRule, {
  valid: [
    {
      name: "valid test case 1",
      code: `const test: Choreography<Locations> = async ({locally}) => {
                await locally("alice", () => {
                  console.log("Hi from Alice");
                });
                return [];
              };`,
    },
  ],
  invalid: [
    {
      name: "test for invalid dependencies destructuring",
      code: `const test2: Choreography<Locations> = async (operators) => {
                await operators.locally("alice", () => {
                  console.log("Hi from Alice");
                });
                return [];
              };`,
      errors: [
        {
          messageId: "invalid",
        },
      ],
    },
    {
      name: "test for invalid dependency operator renaming",
      code: `const test: Choreography<Locations> = async ({locally: l}) => {
              await l("alice", () => {
                console.log("Hi from Alice");
              });
              return [];
            };`,
      errors: [
        {
          messageId: "rename",
        },
      ],
    },
    {
      name: "test to make sure `...rest` element isn't in the dependencies parameter",
      code: `const test: Choreography<Locations> = async ({locally, ...rest}) => {
              await l("alice", () => {
                console.log("Hi from Alice");
              });
              return [];
            };`,
      errors: [
        {
          messageId: "rename",
        },
      ],
    },
  ],
});
