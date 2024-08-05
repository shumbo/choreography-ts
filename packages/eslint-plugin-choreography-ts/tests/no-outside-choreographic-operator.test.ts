import { ruleTester } from "./common";
import noOutsideOperatorRule from "../src/no-outside-choreographic-operator";

ruleTester.run("no-outside-choreographic-operator", noOutsideOperatorRule, {
  valid: [
    {
      name: "valid test case 1",
      code: /* ts */ `
      const test: Choreography<Locations> = async ({
        locally,
        broadcast,
        enclave,
      }) => {
        const msg = await enclave(["bob", "carol"], () => "I'm Carol");
        return [];
      };`,
    },
    {
      name: "valid test case 2",
      code: /* ts */ `
      const test2: Choreography<Locations> = async ({
        locally,
        broadcast,
        enclave,
      }) => {
        const [deliveryDateAtBuyer] = await enclave(
          ["buyer1", "seller"],
          async ({ locally, comm, naked }) => {
            const sharedDecision = naked(decision);
            if (sharedDecision) {
              const deliveryDateAtSeller = await locally(
                "seller",
                (unwrap) => deliveryDateTable.get(unwrap(titleAtSeller))
              );
            }
          }
        )
      };`,
    },
    {
      name: "no error thrown on non-Choreography type",
      code: /* ts */ `
      const nonChoreo = async (enclave) => {
        await enclave(
          "alice",
          async (locally) => {
            await locally("alice", () => "hi");
            return [];
          },
          []
        );
        return [];
      };`,
    },
  ],
  invalid: [
    {
      name: `test for proper insertion of missing depedencies parameter 
      into empty parameter list`,
      code: /* ts */ `
      const test1: Choreography<Locations> = async ({
        locally,
        broadcast,
        enclave,
      }) => {
        const msgAtCarol = await locally("carol", () => "I'm Carol");
        await enclave(["alice", "bob"], async () => {
          const msgAtEveryone = await broadcast("carol", msgAtCarol);
          return [];
        });
        return [];
      };`,
      output: /* ts */ `
      const test1: Choreography<Locations> = async ({
        locally,
        broadcast,
        enclave,
      }) => {
        const msgAtCarol = await locally("carol", () => "I'm Carol");
        await enclave(["alice", "bob"], async ({ broadcast }) => {
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
      code: /* ts */ `
      const test2: Choreography<Locations> = async ({
        locally,
        broadcast,
        enclave,
      }) => {
        const [deliveryDateAtBuyer] = await enclave(
          ["buyer1", "seller"],
          async (arg) => {
            const sharedDecision = naked(decision);
            if (sharedDecision) {
              const deliveryDateAtSeller = await locally(
                "seller",
                (unwrap) => deliveryDateTable.get(unwrap(titleAtSeller))
              );
            }
          }
        )
      };`,
      output: null, // assert that no autofix is suggested
      errors: [
        {
          // error for missing `naked` operator, with no suggestions
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
      name: `test for error on missing nested operators in non-empty parameter list with no object parameter,
      the choreography defined using a type alias, and the sub-choreography argument defined using a normal function expression`,
      code: /* ts */ `
      type Locations = "buyer1" | "seller";
      type MyType = Choreography<Locations>
      const _test2: MyType = async ({
        locally,
        broadcast,
        enclave,
      }) => {
        const msg = await locally("buyer1", () => 1);
        const decision = await broadcast("buyer1", msg);
        await enclave(
          ["buyer1", "seller"],
          async function (arg) {
            const sharedDecision = naked(decision);
            await locally("seller", () => sharedDecision);
            return [];
          },
          []
        );
        return [];
      };`,
      errors: [
        {
          messageId: "error",
          suggestions: null,
        },
        {
          messageId: "error",
          suggestions: null,
        },
      ],
    },
    {
      name: `test for proper insertion of missing nested operator into 
      non-empty dependencies object parameter`,
      code: /* ts */ `
      const test2: Choreography<Locations> = async ({
        locally,
        broadcast,
        enclave,
      }) => {
        const [deliveryDateAtBuyer] = await enclave(
          ["buyer1", "seller"],
          async ({ naked }) => {
            const sharedDecision = naked(decision);
            if (sharedDecision) {
              const deliveryDateAtSeller = await locally(
                "seller",
                (unwrap) => deliveryDateTable.get(unwrap(titleAtSeller))
              );
            }
          }
        )
      };`,
      output: /* ts */ `
      const test2: Choreography<Locations> = async ({
        locally,
        broadcast,
        enclave,
      }) => {
        const [deliveryDateAtBuyer] = await enclave(
          ["buyer1", "seller"],
          async ({ naked, locally }) => {
            const sharedDecision = naked(decision);
            if (sharedDecision) {
              const deliveryDateAtSeller = await locally(
                "seller",
                (unwrap) => deliveryDateTable.get(unwrap(titleAtSeller))
              );
            }
          }
        )
      };`,
      errors: [
        {
          messageId: "error",
          suggestions: [
            {
              messageId: "suggestion",
              output: /* ts */ `
      const test2: Choreography<Locations> = async ({
        locally,
        broadcast,
        enclave,
      }) => {
        const [deliveryDateAtBuyer] = await enclave(
          ["buyer1", "seller"],
          async ({ naked, locally }) => {
            const sharedDecision = naked(decision);
            if (sharedDecision) {
              const deliveryDateAtSeller = await locally(
                "seller",
                (unwrap) => deliveryDateTable.get(unwrap(titleAtSeller))
              );
            }
          }
        )
      };`,
            },
          ],
        },
      ],
    },
    {
      name: `test for proper insertion of missing nested operator 
      into empty dependencies object parameter`,
      code: /* ts */ `
      const test2: Choreography<Locations> = async ({
        locally,
        broadcast,
        enclave,
      }) => {
        const [deliveryDateAtBuyer] = await enclave(
          ["buyer1", "seller"],
          async ({}) => {
            const sharedDecision = naked(decision);
          }
        )
      };`,
      output: /* ts */ `
      const test2: Choreography<Locations> = async ({
        locally,
        broadcast,
        enclave,
      }) => {
        const [deliveryDateAtBuyer] = await enclave(
          ["buyer1", "seller"],
          async ({ naked }) => {
            const sharedDecision = naked(decision);
          }
        )
      };`,
      errors: [
        {
          messageId: "error",
        },
      ],
    },
    {
      name: `test for insertion of missing nested operator in 
      correct nested context`,
      code: /* ts */ `
      type Locations = "alice" | "bob" | "carol";
      const _test2: Choreography<Locations> = async ({ enclave }) => {
        await enclave(
          ["alice", "bob", "carol"],
          async ({ enclave }) => {
            await enclave(
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
      output: /* ts */ `
      type Locations = "alice" | "bob" | "carol";
      const _test2: Choreography<Locations> = async ({ enclave }) => {
        await enclave(
          ["alice", "bob", "carol"],
          async ({ enclave }) => {
            await enclave(
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
