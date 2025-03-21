import { ruleTester } from "./common";
import noUnusedConclaveLocation from "../src/no-unused-conclave-location";

ruleTester.run("no-unused-conclave-location", noUnusedConclaveLocation, {
  valid: [
    {
      name: `passing test case 1: all locations for 'conclave' are used operationally with 'locally' in the body`,
      code: /* ts */ `type Locations = "alice" | "bob";
      const test: Choreography<Locations, [], []> = async ({ conclave }) => {
        await conclave(
          ["alice", "bob"],
          async ({ locally }) => {
            await locally("alice", () => "bob");
            await locally("bob", () => "alice");
            return [];
          },
          []
        );
        return [];
      };`,
    },
    {
      name: `passing test case 2: all locations for 'conclave' are used with 'locally' and 'multicast' in the body`,
      code: /* ts */ `type Locations = "alice" | "bob" | "carol";
      const test: Choreography<Locations, [], []> = async ({ conclave }) => {
        await conclave(
          ["alice", "bob", "carol"],
          async ({ locally, multicast }) => {
            const msgAtCarol = await locally("carol", () => "Hi from carol");
            await multicast("bob", ["alice"], msgAtCarol);
            return [];
          },
          []
        );
        return [];
      };`,
    },
    {
      name: `passing test case 3: all locations for 'conclave' are used with 'locally' and 'comm' in the body`,
      code: /* ts */ `type Locations = "alice" | "bob" | "carol";
      const test: Choreography<Locations, [], []> = async ({ conclave }) => {
        await conclave(
          ["alice", "bob", "carol"],
          async ({ locally, comm }) => {
            const msgAtCarol = await locally("carol", () => "Hi from carol");
            await comm("carol", "alice", msgAtCarol);
            await comm("carol", "bob", msgAtCarol);
            return [];
          },
          []
        );
        return [];
      };`,
    },
    {
      name: `passing test case 4: all locations marked as used when 'broadcast' is used, and then using the same locations with other operators in 'conclave' causes no problems`,
      code: /* ts */ `type Locations = "alice" | "bob" | "carol";
      const test: Choreography<Locations, [], []> = async ({ conclave }) => {
        await conclave(
          ["alice", "bob", "carol"],
          async ({ locally, conclave, comm, broadcast, multicast, call }) => {
            const msgAtCarol = await locally("carol", () => "Hi from carol");
            await broadcast("carol", msgAtCarol);
            const [msgAtBob] = await conclave(
              ["bob", "carol"],
              async ({ locally, broadcast }) => {
                const msgAtBob = await locally("bob", () => "Hi at bob");
                await broadcast("bob", msgAtBob);
                return [msgAtBob];
              },
              []
            );
            await multicast("bob", ["alice"], msgAtBob);
            const subChoreo: Choreography<
              "alice",
              [],
              [Located<string, "alice">]
            > = async ({ locally }) => {
              const msgAtAlice = await locally("alice", () => "Hi at alice");
              return [msgAtAlice];
            };
            await comm("carol", "bob", msgAtCarol);
            const [msgAtAlice] = await call(subChoreo, []);
            return [msgAtAlice];
          },
          []
        );
        return [];
      };`,
    },
    {
      name: `passing test case 5: all locations marked as used when 'call' is used in 'conclave'`,
      code: /* ts */ `type Locations = "alice" | "bob" | "carol";
      const subChoreo: Choreography<Locations, [], []> = async ({ locally }) => {
        await locally("alice", () => "Hi from alice");
        await locally("bob", () => "Hi from bob");
        await locally("carol", () => "Hi from carol");
        return [];
      };
      const test: Choreography<Locations, [], []> = async ({ conclave }) => {
        await conclave(
          ["alice", "bob", "carol"],
          async ({ locally, call }) => {
            await locally("carol", () => "Hi from carol");
            await call(subChoreo, []);
            return [];
          },
          []
        );
        return [];
      };`,
    },
    {
      name: `passing test case 6: all locations are used as type arguments and with 'locally' inside 'conclave'`,
      code: /* ts */ `type Locations = "alice" | "bob" | "carol";
      const test: Choreography<Locations, [], []> = async ({ conclave }) => {
        await conclave(
          ["alice", "bob", "carol"],
          async ({ call }) => {
            const subChoreo: Choreography<
              "alice" | "bob" | "carol",
              [],
              []
            > = async ({ locally, call }) => {
              await locally("carol", () => "Hi from carol");
              return [];
            };
            return [];
          },
          []
        );
        return [];
      };`,
    },
    {
      name: `passing test case 7: all locations for 'conclave' and nested 'conclave' calls are used as arguments inside the 'conclave' bodies`,
      code: /* ts */ `type Locations = "alice" | "bob" | "carol";
      const test: Choreography<Locations, [], []> = async ({ conclave }) => {
        await conclave(
          ["alice", "bob", "carol"],
          async ({ conclave }) => {
            await conclave(
              ["alice", "bob", "carol"],
              async ({ locally }) => {
                await locally("alice", () => "Hi from alice");
                await locally("bob", () => "Hiyo from bob");
                await locally("carol", () => "Hi from carol");
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
    },
  ],
  invalid: [
    {
      name: `failing test case 1: not all locations specified for top-level 'conclave' call are used inside the body`,
      code: /* ts */ `type Locations = "alice" | "bob";
      const test: Choreography<Locations, [], []> = async ({ conclave }) => {
        await conclave(
          ["alice", "bob"],
          async ({ locally }) => {
            await locally("alice", () => "bob");
            return [];
          },
          []
        );
        return [];
      };`,
      errors: [
        {
          messageId: "warning",
        },
      ],
    },
    {
      name: `failing test case 2: not all locations for nested 'conclave' call are used inside the body`,
      code: /* ts */ `type Locations = "alice" | "bob" | "carol";
      const test: Choreography<Locations, [], []> = async ({ conclave }) => {
        await conclave(
          ["alice", "bob", "carol"],
          async ({ conclave }) => {
            await conclave(
              ["alice", "bob", "carol"],
              async ({ locally }) => {
                await locally("alice", () => "Hi from alice");
                await locally("bob", () => "Hiyo from bob");
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
          messageId: "warning",
        },
      ],
    },
    {
      name: `failing test case 3: locations are correctly marked as not used in nested 'conclave' call where 'broadcast' is left unused`,
      code: /* ts */ `type Locations = "alice" | "bob" | "carol";
        const test: Choreography<Locations, [], []> = async ({ conclave }) => {
          await conclave(
            ["alice", "bob", "carol"],
            async ({ locally, conclave, comm, broadcast, multicast, call }) => {
              const msgAtCarol = await locally("carol", () => "Hi from carol");
              await broadcast("carol", msgAtCarol);
              const [msgAtBob] = await conclave(
                ["bob", "carol"],
                async ({ locally, broadcast }) => {
                  const msgAtBob = await locally("bob", () => "Hi at bob");
                  return [msgAtBob];
                },
                [],
              );
              await multicast("bob", ["alice"], msgAtBob);
              const subChoreo: Choreography<
                "alice",
                [],
                [Located<string, "alice">]
              > = async ({ locally }) => {
                const msgAtAlice = await locally("alice", () => "Hi at alice");
                return [msgAtAlice];
              };
              await comm("carol", "bob", msgAtCarol);
              const [msgAtAlice] = await call(subChoreo, []);
              return [msgAtAlice];
            },
            [],
          );
          return [];
        };`,
      errors: [
        {
          messageId: "warning",
        },
      ],
    },
    {
      name: `failing test case 4: location use warnings are correctly reported for 'conclave' expressions in choreographies declared with a type alias`,
      code: /* ts */ `type Locations = "alice" | "bob" | "carol";
      type TypeAlias = Choreography<Locations, [], []>;
      const subtleChoreo: TypeAlias = async ({ conclave }) => {
        conclave(
          ["alice", "bob"],
          async ({ locally }) => {
            await locally("alice", () => "Hi from alice");
            return [];
          },
          []
        );
        return [];
      };`,
      errors: [
        {
          messageId: "warning",
        },
      ],
    },
  ],
});
