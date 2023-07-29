import { RuleTester } from "@typescript-eslint/rule-tester";
import noOutsideOperatorRule from "../src/no-outside-choreographic-operator";

const ruleTester = new RuleTester({
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "tsconfig.json",
    tsconfigRootDir: __dirname + "/fixtures", // This directiory and its files needed to test with type information
  },
});

ruleTester.run("no-outside-choreographic-operator", noOutsideOperatorRule, {
  valid: [
    {
      name: "valid test case 1",
      code: `
      const test: Choreography<Locations> = async ({
        locally,
        broadcast,
        colocally,
      }) => {
        const msg = await colocally(["bob", "carol"], () => "I'm Carol");
        return [];
      };`,
    },
    {
      name: "valid test case 2",
      code: `
      const test2: Choreography<Locations> = async ({
        locally,
        broadcast,
        colocally,
      }) => {
        const [deliveryDateAtBuyer] = await colocally(
          ["buyer1", "seller"],
          async ({ locally, comm, peel }) => {
            const sharedDecision = peel(decision);
            if (sharedDecision) {
              const deliveryDateAtSeller = await locally(
                "seller",
                (unwrap) => deliveryDateTable.get(unwrap(titleAtSeller))
              );
            }
          }
        )
      }`,
    },
  ],
  invalid: [
    {
      // check for empty argument list and proper insertion of missing nested operator
      name: "invalid test case 1",
      code: `
      const test1: Choreography<Locations> = async ({
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
      output: `
      const test1: Choreography<Locations> = async ({
        locally,
        broadcast,
        colocally,
      }) => {
        const msgAtCarol = await locally("carol", () => "I'm Carol");
        await colocally(["alice", "bob"], async ({ broadcast }) => {
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
    {
      // check for proper addition of missing operator
      name: "invalid test case 2",
      code: `
      const test2: Choreography<Locations> = async ({
        locally,
        broadcast,
        colocally,
      }) => {
        const [deliveryDateAtBuyer] = await colocally(
          ["buyer1", "seller"],
          async ({ peel }) => {
            const sharedDecision = peel(decision);
            if (sharedDecision) {
              const deliveryDateAtSeller = await locally(
                "seller",
                (unwrap) => deliveryDateTable.get(unwrap(titleAtSeller))
              );
            }
          }
        )
      }`,
      output: `
      const test2: Choreography<Locations> = async ({
        locally,
        broadcast,
        colocally,
      }) => {
        const [deliveryDateAtBuyer] = await colocally(
          ["buyer1", "seller"],
          async ({ peel, locally }) => {
            const sharedDecision = peel(decision);
            if (sharedDecision) {
              const deliveryDateAtSeller = await locally(
                "seller",
                (unwrap) => deliveryDateTable.get(unwrap(titleAtSeller))
              );
            }
          }
        )
      }`,
      errors: [
        {
          messageId: "error",
          suggestions: [
            {
              messageId: "suggestion",
              output: `
      const test2: Choreography<Locations> = async ({
        locally,
        broadcast,
        colocally,
      }) => {
        const [deliveryDateAtBuyer] = await colocally(
          ["buyer1", "seller"],
          async ({ peel, locally }) => {
            const sharedDecision = peel(decision);
            if (sharedDecision) {
              const deliveryDateAtSeller = await locally(
                "seller",
                (unwrap) => deliveryDateTable.get(unwrap(titleAtSeller))
              );
            }
          }
        )
      }`,
            },
          ],
        },
      ],
    },
    {
      // check for non-object parameter type in argument list and proper insertion of missing operators
      name: "invalid test case 3",
      code: `
      const test2: Choreography<Locations> = async ({
        locally,
        broadcast,
        colocally,
      }) => {
        const [deliveryDateAtBuyer] = await colocally(
          ["buyer1", "seller"],
          async (arg) => {
            const sharedDecision = peel(decision);
            if (sharedDecision) {
              const deliveryDateAtSeller = await locally(
                "seller",
                (unwrap) => deliveryDateTable.get(unwrap(titleAtSeller))
              );
            }
          }
        )
      }`,
      output: `
      const test2: Choreography<Locations> = async ({
        locally,
        broadcast,
        colocally,
      }) => {
        const [deliveryDateAtBuyer] = await colocally(
          ["buyer1", "seller"],
          async ({ peel }, arg) => {
            const sharedDecision = peel(decision);
            if (sharedDecision) {
              const deliveryDateAtSeller = await locally(
                "seller",
                (unwrap) => deliveryDateTable.get(unwrap(titleAtSeller))
              );
            }
          }
        )
      }`,
      errors: [
        {
          // error for missing `peel` operator, with suggestion output already checked above
          messageId: "error",
        },
        {
          // suggestion for missing `locally` operator
          messageId: "error",
          suggestions: [
            {
              messageId: "suggestion",
              output: `
      const test2: Choreography<Locations> = async ({
        locally,
        broadcast,
        colocally,
      }) => {
        const [deliveryDateAtBuyer] = await colocally(
          ["buyer1", "seller"],
          async ({ locally }, arg) => {
            const sharedDecision = peel(decision);
            if (sharedDecision) {
              const deliveryDateAtSeller = await locally(
                "seller",
                (unwrap) => deliveryDateTable.get(unwrap(titleAtSeller))
              );
            }
          }
        )
      }`,
            },
          ],
        },
      ],
    },
  ],
});
