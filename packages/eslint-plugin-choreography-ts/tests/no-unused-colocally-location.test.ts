import { ruleTester } from "./common";
import noUnusedColocallyLocation from "../src/no-unused-colocally-location";

ruleTester.run("no-unused-colocally-location", noUnusedColocallyLocation, {
  valid: [
    {
      name: `passing test case 1: all locations for 'colocally' are used inside 'locally' in the body`,
      code: `type Locations = "alice" | "bob";
      const test: Choreography<Locations, [], []> = async ({ colocally }) => {
        await colocally(
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
      name: `passing test case 2: all locations for 'colocally' are used inside 'locally' and 'multicast' in the body`,
      code: `type Locations = "alice" | "bob" | "carol";
      const test: Choreography<Locations, [], []> = async ({ colocally }) => {
        await colocally(
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
      name: `passing test case 3: all locations for 'colocally' are used inside 'locally' and 'comm' in the body`,
      code: `type Locations = "alice" | "bob" | "carol";
      const test: Choreography<Locations, [], []> = async ({ colocally }) => {
        await colocally(
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
      name: `passing test case 4: all locations marked as used when 'broadcast' used in 'colocally'`,
      code: `type Locations = "alice" | "bob" | "carol";
      const test: Choreography<Locations, [], []> = async ({ colocally }) => {
        await colocally(
          ["alice", "bob", "carol"],
          async ({ locally, broadcast }) => {
            const msgAtCarol = await locally("carol", () => "Hi from carol");
            await broadcast("carol", msgAtCarol);
            return [];
          },
          []
        );
        return [];
      };`,
    },
    {
      name: `passing test case 5: all locations are used as type arguments or inside other operators inside 'colocally'`,
      code: `type Locations = "alice" | "bob" | "carol";
      const test: Choreography<Locations, [], []> = async ({ colocally }) => {
        await colocally(
          ["alice", "bob", "carol"],
          async ({ comm, call }) => {
            const subChoreo: Choreography<
              "alice" | "bob",
              [],
              [Located<string, "bob">]
            > = async ({ locally }) => {
              const msgAtBob = await locally("bob", () => "Hi from bob");
              return [msgAtBob];
            };
            const [msgAtBob] = await call(subChoreo, []);
            await comm("bob", "carol", msgAtBob);
            await comm("carol", "alice", msgAtBob);
            return [];
          },
          []
        );
        return [];
      };`,
    },
    {
      name: `passing test case 6: all locations for 'colocally' and nested 'colocally' calls are used as arguments to 'colocally' calls inside 'colocally' bodies`,
      code: `type Locations = "alice" | "bob" | "carol";
      const test: Choreography<Locations, [], []> = async ({ colocally }) => {
        await colocally(
          ["alice", "bob", "carol"],
          async ({ colocally }) => {
            await colocally(
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
      name: `failing test case 1: all locations specified for top-level 'colocally' call are not used inside the body`,
      code: `type Locations = "alice" | "bob";
      const test: Choreography<Locations, [], []> = async ({ colocally }) => {
        await colocally(
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
      name: `failing test case 2: all locations for nested 'colocally' call are not used inside the body`,
      code: `type Locations = "alice" | "bob" | "carol";
      const test: Choreography<Locations, [], []> = async ({ colocally }) => {
        await colocally(
          ["alice", "bob", "carol"],
          async ({ colocally }) => {
            await colocally(
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
  ],
});
