import { ruleTester } from "./common";
import noUnusedColocatedLocation from "../src/no-unused-colocated-location";

ruleTester.run("no-unused-colocated-location", noUnusedColocatedLocation, {
  valid: [
    {
      name: `passing test case 1: colocated 'multicast' message unwrapped by all recipients using 'locally'`,
      code: `type Locations = "alice" | "bob" | "carol";
      const test: Choreography<Locations> = async ({ locally, multicast }) => {
        const msgAtAlice = await locally("alice", () => "Hi from alice!");
        const colocatedMsg = await multicast("alice", ["bob", "carol"], msgAtAlice);
        await locally("bob", (unwrap) => {
          console.log("bob received:", unwrap(colocatedMsg));
        });
        await locally("carol", (unwrap) => {
          console.log("carol received:", unwrap(colocatedMsg));
        });
        return [];
      };`,
    },
    {
      name: `passing test case 2: 'located' message sent using 'comm' unwrapped by recipient using 'locally'`,
      code: `type Locations = "alice" | "bob";
      const test: Choreography<Locations> = async ({ locally, comm }) => {
        const msgAtAlice = await locally("alice", () => "Hi from alice!");
        const locatedMsg = await comm("alice", "bob", msgAtAlice);
        await locally("bob", (unwrap) => {
          console.log("bob received:", unwrap(locatedMsg));
        });
        return [];
      };`,
    },
    {
      name: `passing test case 3: colocated 'multicast' message unwrapped using 'peel' in 'colocally' with all recipients specified`,
      code: `type Locations = "alice" | "bob" | "carol";
      const test: Choreography<Locations> = async ({
        locally,
        multicast,
        colocally,
      }) => {
        const msgAtAlice = await locally("alice", () => "Hi from alice!");
        const colocatedMsg = await multicast("alice", ["bob", "carol"], msgAtAlice);
        await colocally(
          ["bob", "carol"],
          async ({ peel }) => {
            console.log("bob and carol received:", peel(colocatedMsg));
            return [];
          },
          []
        );
        return [];
      };`,
    },
    {
      name: `passing test case 4: colocated 'multicast' message unwrapped by 'peel' in 'call'`,
      code: `type Locations = "alice" | "bob" | "carol";
      const test: Choreography<Locations> = async ({
        locally,
        multicast,
        call,
      }) => {
        const msgAtAlice = await locally("alice", () => "Hi from alice!");
        const colocatedMsg = await multicast("alice", ["bob", "carol"], msgAtAlice);
        await call(async ({ peel }) => {
          peel(colocatedMsg);
          return [];
        }, []);
        return [];
      };`,
    },
    {
      name: `passing test case 5: 'located' message sent using 'comm' passed to 'call' in the arguments parameter`,
      code: `type Locations = "alice" | "bob" | "carol";
      const subChoreography: Choreography<
        Locations,
        [Located<string, "bob">],
        []
      > = async ({ locally }, [msg]) => {
        await locally("bob", (unwrap) => unwrap(msg));
        return [];
      };
      const test: Choreography<Locations> = async ({ locally, comm, call }) => {
        const msgAtAlice = await locally("alice", () => "Hi from alice!");
        const locatedMsg = await comm("alice", "bob", msgAtAlice);
        await call(subChoreography, [locatedMsg]);
        return [];
      };`,
    },
    {
      name: `passing test case 6: 'located' messages sent using 'comm' passed to 'colocally' in the arguments parameter with all recipients specified`,
      code: `type Locations = "alice" | "bob" | "carol";
      const subChoreography: Choreography<
        Locations,
        [Located<string, "bob">, Located<string, "carol">],
        []
      > = async ({ locally }, [bobMsg, carolMsg]) => {
        await locally("bob", (unwrap) => unwrap(bobMsg));
        await locally("carol", (unwrap) => unwrap(carolMsg));
        return [];
      };
      const test: Choreography<Locations> = async ({
        locally,
        comm,
        colocally,
      }) => {
        const msgAtAlice = await locally("alice", () => "Hi from alice!");
        const bobLocatedMsg = await comm("alice", "bob", msgAtAlice);
        const carolLocatedMsg = await comm("alice", "carol", msgAtAlice);
        await colocally(["bob", "carol"], subChoreography, [
          bobLocatedMsg,
          carolLocatedMsg,
        ]);
        return [];
      };`,
    },
    {
      name: `passing test case 7: 'located' message is returned by the choreography`,
      code: `type Locations = "alice" | "bob";
      const test: Choreography<Locations, [], [Located<string, "bob">]> = async ({
        locally,
        comm,
      }) => {
        const msgAtAlice = await locally("alice", () => "Hi from alice");
        const locatedMsg = await comm("alice", "bob", msgAtAlice);
        return [locatedMsg];
      }; `,
    },
  ],
  invalid: [
    {
      name: `failing test case 1: colocated 'multicast' message not unwrapped by all recipients`,
      code: `type Locations = "alice" | "bob" | "carol";
      const test: Choreography<Locations> = async ({ locally, multicast }) => {
        const msgAtAlice = await locally("alice", () => "Hi from alice!");
        const colocatedMsg = await multicast("alice", ["bob", "carol"], msgAtAlice);
        await locally("bob", (unwrap) => {
          console.log("bob received:", unwrap(colocatedMsg));
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
      name: `failing test case 2: 'located' message sent using 'comm' not unwrapped by recipient`,
      code: `type Locations = "alice" | "bob";
      const test: Choreography<Locations> = async ({ locally, comm }) => {
        const msgAtAlice = await locally("alice", () => "Hi from alice!");
        const colocatedMsg = await comm("alice", "bob", msgAtAlice);
        return [];
      };`,
      errors: [
        {
          messageId: "error",
        },
      ],
    },
    {
      name: `failing test case 3: colocated 'multicast' message unwrapped by 'peel' in 'colocally', but not all recipients are used by 'colocally'`,
      code: `  type Locations = "alice" | "bob" | "carol";
      const test: Choreography<Locations> = async ({
        locally,
        multicast,
        colocally,
      }) => {
        const msgAtAlice = await locally("alice", () => "Hi from alice!");
        const colocatedMsg = await multicast("alice", ["bob", "carol"], msgAtAlice);
        await colocally(
          ["bob"],
          async ({ peel }) => {
            peel(colocatedMsg);
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
    {
      name: `failing test case 4: 'located' messages sent using 'comm' passed to 'colocally' in the arguments parameter, but not all the recipients are used by 'colocally'`,
      code: `type Locations = "alice" | "bob" | "carol";
      const subChoreography: Choreography<
        Locations,
        [Located<string, "bob">, Located<string, "carol">],
        []
      > = async ({ locally }, [bobMsg, carolMsg]) => {
        await locally("bob", (unwrap) => unwrap(bobMsg));
        await locally("carol", (unwrap) => unwrap(carolMsg));
        return [];
      };
      const test: Choreography<Locations> = async ({
        locally,
        comm,
        colocally,
      }) => {
        const msgAtAlice = await locally("alice", () => "Hi from alice!");
        const bobLocatedMsg = await comm("alice", "bob", msgAtAlice);
        const carolLocatedMsg = await comm("alice", "carol", msgAtAlice);
        await colocally(["bob"], subChoreography, [bobLocatedMsg, carolLocatedMsg]);
        return [];
      };`,
      errors: [
        {
          messageId: "error",
        },
      ],
    },
    {
      // for complete test coverage with 'call' statements
      name: `failing test case 5: colocated message not unwrapped in 'call' or passed in the arguments parameter`,
      code: `  type Locations = "alice" | "bob";
      const test: Choreography<Locations, [], []> = async ({
        locally,
        comm,
        call,
      }) => {
        const msgAtAlice = await locally("alice", () => "Hi from alice");
        const locatedMsg = await comm("alice", "bob", msgAtAlice);
        call(async ({ locally }) => {
          return [];
        }, []);
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
