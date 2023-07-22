// Testing: https://typescript-eslint.io/packages/rule-tester
// Three files needed: ../file.ts, ../react.tsx, ../tsconfig.json
import { RuleTester } from '@typescript-eslint/rule-tester'
import noRenameRule from '../src/no-renaming-operator'

const ruleTester = new RuleTester({
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: "tsconfig.json"
  }
});

ruleTester.run("no-renaming-operator", noRenameRule, {
  valid: [
    {
      name: "valid test case 1",
      code: `const test: Choreography<Locations> = async ({
                locally,
              }) => {
                await locally("alice", () => {
                  console.log("Hi from Alice");
                });
                return [];
              };`,
    },
  ],
  invalid: [
    {
      name: "invalid test case 1",
      code: `const test2: Choreography<Locations> = async (operators) => {
                await operators.locally("alice", () => {
                  console.log("Hi from Alice");
                });
                return [];
              };`,
      errors: [
        {
          messageId: "invalid"
        }
      ]

    },
    {
      name: "invalid test case 2",
      code: `const test: Choreography<Locations> = async ({locally: l}) => {
              await l("alice", () => {
                console.log("Hi from Alice");
              });
              return [];
            };`,
      errors: [
        {
          messageId: "rename"
        }
      ]
    },
  ],
});
