import { RuleTester } from "@typescript-eslint/rule-tester";
import noOutsideOperatorRule from "../src/no-outside-choreographic-operator";

const ruleTester = new RuleTester({
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "tsconfig.json",
    tsconfigRootDir: __dirname + "/fixtures", // This directiory and its files needed to test with type information
  },
});

ruleTester.run("no-renaming-operator", noOutsideOperatorRule, {
  valid: [
    {
      name: "valid test case 1",
      code: `const test: Choreography<Locations> = async ({
            locally,
            broadcast,
            colocally,
          }) => {
            const msg = await colocally(["bob", "carol"], () => "I'm Carol");
            return [];
          };`,
    },
  ],
  invalid: [
    {
      name: "invalid test case 1",
      code: `const test1: Choreography<Locations> = async ({
            locally,
            broadcast,
            colocally,
          }) => {
            const msgAtCarol = await locally("carol", () => "I'm Carol");
            await colocally(["alice", "bob"], async () => {
              const msgAtEveryone = await broadcast("carol", msgAtCarol);
              return [];
            });
            return [];
          };`,
      errors: [
        {
          messageId: "error",
        },
      ],
    },
  ],
});
