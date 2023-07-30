import { ruleTester } from "./common";
import noOutsideOperatorRule from "../src/no-outside-choreographic-operator";

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
      name: `test for proper insertion of missing depedencies parameter 
      into empty parameter list`,
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
      // no fixes should be applied or suggested in this case
      name: `test for error on missing nested operator in
      non-empty parameter list with no object parameter`,
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
      output: null, // assert that no autofix is suggested
      errors: [
        {
          // error for missing `peel` operator, with no suggestions
          messageId: "error",
          suggestions: null,
        },
        {
          // error for missing `locally` operator
          messageId: "error",
          suggestions: null,
        },
      ],
    },
    {
      name: `test for proper insertion of missing nested operator into 
      non-empty dependencies object parameter`,
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
      name: `test for proper insertion of missing nested operator 
      into empty dependencies object parameter`,
      code: `
      const test2: Choreography<Locations> = async ({
        locally,
        broadcast,
        colocally,
      }) => {
        const [deliveryDateAtBuyer] = await colocally(
          ["buyer1", "seller"],
          async ({}) => {
            const sharedDecision = peel(decision);
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
          async ({ peel }) => {
            const sharedDecision = peel(decision);
          }
        )
      }`,
      errors: [
        {
          messageId: "error",
        },
      ],
    },
    {
      name: `test for insertion of missing nested operator in 
      correct nested context`,
      code: `
      type Locations = "alice" | "bob" | "carol";
      const _test2: Choreography<Locations> = async ({ colocally }) => {
        await colocally(
          ["alice", "bob", "carol"],
          async ({ colocally }) => {
            await colocally(
              ["alice", "bob"],
              async ({}) => {
                await locally("alice", () => {
                  console.log("Hi, I'm Alice!");
                });
                return [];
              },
              []
            );
            return [];
          },
          []
        );
        return [];
      };`,
      output: `
      type Locations = "alice" | "bob" | "carol";
      const _test2: Choreography<Locations> = async ({ colocally }) => {
        await colocally(
          ["alice", "bob", "carol"],
          async ({ colocally }) => {
            await colocally(
              ["alice", "bob"],
              async ({ locally }) => {
                await locally("alice", () => {
                  console.log("Hi, I'm Alice!");
                });
                return [];
              },
              []
            );
            return [];
          },
          []
        );
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
