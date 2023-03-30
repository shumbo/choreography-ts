import { Choreography, HttpBackend } from "..";

const locations = ["alice", "bob", "carol"] as const;
type Locations = (typeof locations)[number];

const backend = new HttpBackend<Locations>({
  alice: ["localhost", 3000],
  bob: ["localhost", 3001],
  carol: ["localhost", 3002],
});

describe("HTTP Backend", () => {
  test("global arguments", async () => {
    const p = "GLOBAL ARGUMENT";
    const c: Choreography<Locations, {}, string> = async ({}, q) => {
      expect(q).toBe(p);
      return {};
    };
    await Promise.all(locations.map((l) => backend.run(c, l, p, {})));
  });
  test("local arguments", async () => {
    const p = "Alice's Secret Message";
    const c: Choreography<Locations, {}, null, { alice: string }> = async (
      { locally },
      _,
      l
    ) => {
      await locally("alice", (unwrap) => {
        expect(unwrap(l.alice)).toBe(p);
      });
      return {};
    };
    if (false) {
      // @ts-expect-error
      await backend.run(c, "alice", null, 1); // wrong type
    }
    await Promise.all([
      backend.run(c, "alice", null, { alice: p }),
      backend.run(c, "bob", null, {}),
      backend.run(c, "carol", null, {}),
    ]);
  });
  test("local return values", async () => {
    const c: Choreography<Locations, { bob: string }, null> = async ({
      locally,
      comm,
    }) => {
      const a = await locally("alice", () => "Hello, world!");
      const b = await comm("alice", "bob", a);
      return { bob: b };
    };
    const alicePromise = backend.run(c, "alice", null, {});
    const bobPromise = backend.run(c, "bob", null, {});
    await alicePromise;
    expect(await bobPromise).toBe("Hello, world!");
  });
  test("comm", async () => {
    const helloWorld: Choreography<Locations> = async ({ locally, comm }) => {
      const msg = await locally("alice", () => "Hello, world!");
      const msgAtBob = await comm("alice", "bob", msg);
      await locally("bob", (unwrap) => {
        expect(unwrap(msgAtBob)).toBe("Hello, world!");
      });
      return {};
    };
    await Promise.all(
      locations.map((l) => backend.run(helloWorld, l, null, {}))
    );
  });
  test("broadcast", async () => {
    const test: Choreography<Locations, {}, null, {}> = async ({
      locally,
      broadcast,
    }) => {
      const localMsg = await locally("alice", () => "Hello everyone!");
      const msg = await broadcast("alice", localMsg);
      expect(msg).toBe("Hello everyone!");
      return {};
    };
    await Promise.all(locations.map((l) => backend.run(test, l, null, {})));
  });
});
