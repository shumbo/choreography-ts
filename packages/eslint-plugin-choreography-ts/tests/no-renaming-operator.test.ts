// Testing: https://typescript-eslint.io/packages/rule-tester
// Three files needed: ../file.ts, ../react.tsx, ../tsconfig.json
import { ruleTester } from "./common";
import noRenameRule from "../src/no-renaming-operator";

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
