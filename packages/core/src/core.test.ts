import { describe, test, expect } from "vitest";

import { Choreography, Located, Runner } from "./core";

const runner = new Runner();

const locations = ["alice", "bob", "carol", "dave"] as const;
type Locations = (typeof locations)[number];

describe("core", () => {
  describe("Runner", () => {
    test("hello, world", async () => {
      const choreography: Choreography<
        "alice" | "bob",
        [],
        [Located<string, "bob">]
      > = async ({ locally, comm }) => {
        const msg = await locally("alice", () => "Hello, world!");
        const msgAtBob = await comm("alice", "bob", msg);
        return [msgAtBob];
      };

      const f = runner.compile(choreography);
      const [msgAtBob] = await f([]);
      expect(msgAtBob).toEqual("Hello, world!");
    });
    test("Global arguments", async () => {
      const p = "GLOBAL ARGUMENT";
      const f = (q: string) => {
        const c: Choreography<Locations, [], []> = async () => {
          expect(q).toBe(p);
          return [];
        };
        return c;
      };
      const g = runner.compile(f(p));
      await g([]);
    });
    test("Located arguments", async () => {
      const p = "Alice's Secret Message";
      const c: Choreography<Locations, [Located<string, "alice">]> = async (
        { locally },
        [msg],
      ) => {
        await locally("alice", (unwrap) => {
          expect(unwrap(msg)).toBe(p);
        });
        return [];
      };
      const g = runner.compile(c);
      await g([p]);
    });
    test("Async locally", async () => {
      let count = 0;
      const c: Choreography<Locations> = async ({ locally }) => {
        const msg = await locally("alice", () => {
          return Promise.resolve(5);
        });
        await locally("alice", (unwrap) => {
          expect(unwrap(msg)).toBe(5);
          count += 1;
        });
        return [];
      };
      const g = runner.compile(c);
      await g([]);
      expect(count).toBe(1);
    });
    test("multicast", async () => {
      let count = 0;
      const test: Choreography<Locations> = async ({ locally, multicast }) => {
        const msg = await locally("alice", () => "Hello, world!");
        const msgAtSelectedTwo = await multicast(
          "alice",
          ["bob", "carol"],
          msg,
        );
        await locally("bob", (unwrap) => {
          expect(unwrap(msgAtSelectedTwo)).toBe("Hello, world!");
          count += 1;
        });
        await locally("carol", (unwrap) => {
          expect(unwrap(msgAtSelectedTwo)).toBe("Hello, world!");
          count += 1;
        });
        return [];
      };
      const g = runner.compile(test);
      await g([]);
      expect(count).toBe(2);
    });
    test("broadcast", async () => {
      let count = 0;
      const test: Choreography<Locations> = async ({ locally, broadcast }) => {
        const localMsg = await locally("alice", () => "Hello everyone!");
        const msg = await broadcast("alice", localMsg);
        expect(msg).toBe("Hello everyone!");
        count += 1;
        return [];
      };
      const g = runner.compile(test);
      await g([]);
      expect(count).toBe(1);
    });
    test("enclave", async () => {
      let count = 0;
      const test: Choreography<Locations> = async ({ enclave }) => {
        await enclave(
          ["bob", "carol"],
          async ({ locally, broadcast }) => {
            const msgAtBob = await locally("bob", () => "Hello, world!");
            const msg = await broadcast("bob", msgAtBob);
            expect(msg).toBe("Hello, world!");
            count += 1;
            return [];
          },
          [],
        );
        return [];
      };
      const g = runner.compile(test);
      await g([]);
      expect(count).toBe(1);
    });
  });
});
