// Testing: https://typescript-eslint.io/packages/rule-tester
// Three files needed: ../file.ts, ../react.tsx, ../tsconfig.json
import { ruleTester } from "./common";
import noRenameRule from "../src/no-renaming-operator";

ruleTester.run("no-renaming-operator", noRenameRule, {
  valid: [
    {
      name: "valid test case 1",
      code: /* ts */ `const test: Choreography<Locations> = async ({locally}) => {
                await locally("alice", () => {
                  console.log("Hi from Alice");
                });
                return [];
              };`,
    },
    {
      name: "non-choreography arrow function test - this should return no errors",
      code: /* ts */ `
      const nonChoreo = (operators) => {};
      `,
    },
  ],
  invalid: [
    {
      name: "test for invalid dependencies destructuring",
      code: /* ts */ `const test2: Choreography<Locations> = async (operators) => {
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
      code: /* ts */ `const test: Choreography<Locations> = async ({locally: l}) => {
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
      code: /* ts */ `const test: Choreography<Locations> = async ({locally, ...rest}) => {
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
      name: "test for error in choreography as a `colocally` argument",
      code: /* ts */ `
      type Locations = "alice" | "bob" | "carol";
      const _test: Choreography<Locations> = async ({ colocally }) => {
        await colocally(
          ["alice", "bob"],
          async ({ locally: l }) => {
            await l("alice", () => {
              console.log("Alice here");
              return [];
            });
            return [];
          },
          []
        );
        return [];
      };`,
      errors: [
        {
          messageId: "rename",
        },
      ],
    },
    {
      name: "test for error in choreography as a `call` argument",
      code: /* ts */ `
      type Locations = "alice" | "bob" | "carol";
      const _test: Choreography<Locations> = async ({ call }) => {
        await call(async ({ locally: l }) => {
          await l("alice", () => {
            console.log("Alice here");
            return [];
          });
          return [];
        }, []);
        return [];
      };`,
      errors: [
        {
          messageId: "rename",
        },
      ],
    },
    {
      name: "detects errors for type-aliased choreographies",
      code: /* ts */ `
      type Locations = "alice" | "bob";
      type MyType = Choreography<Locations, [], []>;
      const _test: MyType = async (operators) => {
        await operators.locally("alice", () => 1);
        return [];
      };`,
      errors: [
        {
          messageId: "invalid",
        },
      ],
    },
    {
      name: "detects errors with multi-level type-aliased choreographies",
      code: /* ts */ `
      type Locations = "alice" | "bob";
      type MyType = Choreography<Locations, [], []>;
      type MyType2 = MyType;
      const _test: MyType2 = async (operators) => {
        await operators.locally("alice", () => 1);
        return [];
      };`,
      errors: [
        {
          messageId: "invalid",
        },
      ],
    },
  ],
});
