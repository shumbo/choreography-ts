import { Choreography, HttpBackend, Located } from "..";

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
    const f = (q: string) => {
      const c: Choreography<Locations, [], []> = async ({}) => {
        expect(q).toBe(p);
        return [];
      };
      return c;
    };
    await Promise.all(locations.map((l) => backend.epp(f(p), l)([])));
  });
  test("local arguments", async () => {
    const p = "Alice's Secret Message";
    const c: Choreography<Locations, [Located<string, "alice">]> = async (
      { locally },
      [msg]
    ) => {
      await locally("alice", (unwrap) => {
        expect(unwrap(msg)).toBe(p);
      });
      return [];
    };
    if (false) {
      // @ts-expect-error
      await backend.epp(c, "alice", null)(1); // wrong type
    }
    await Promise.all([
      backend.epp(c, "alice")([p]),
      backend.epp(c, "bob")([undefined]),
      backend.epp(c, "carol")([undefined]),
    ]);
  });
  test("local return values", async () => {
    const c: Choreography<Locations, [], [Located<string, "bob">]> = async ({
      locally,
      comm,
    }) => {
      const a = await locally("alice", () => "Hello, world!");
      const b = await comm("alice", "bob", a);
      return [b];
    };
    const alicePromise = backend.epp(c, "alice")([]);
    const [bobMessage] = await backend.epp(c, "bob")([]);
    await alicePromise;
    expect(bobMessage).toEqual("Hello, world!");
  });
  test("comm", async () => {
    const helloWorld: Choreography<Locations> = async ({ locally, comm }) => {
      const msg = await locally("alice", () => "Hello, world!");
      const msgAtBob = await comm("alice", "bob", msg);
      await locally("bob", (unwrap) => {
        expect(unwrap(msgAtBob)).toBe("Hello, world!");
      });
      return [];
    };
    await Promise.all(locations.map((l) => backend.epp(helloWorld, l)([])));
  });
  test("broadcast", async () => {
    const test: Choreography<Locations> = async ({ locally, broadcast }) => {
      const localMsg = await locally("alice", () => "Hello everyone!");
      const msg = await broadcast("alice", localMsg);
      expect(msg).toBe("Hello everyone!");
      return [];
    };
    await Promise.all(locations.map((l) => backend.epp(test, l)([])));
  });
  test("colocally changes context", async () => {
    const test: Choreography<Locations> = async ({
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
    };
    const p = backend.run(test, "alice", []);
    await expect(p).rejects.toThrow();
  });
});
