import { Choreography, HttpBackend } from "..";

const locations = ["alice", "bob", "carol"] as const;
type Locations = (typeof locations)[number];
const backend = new HttpBackend<Locations>({
  alice: ["localhost", 3000],
  bob: ["localhost", 3001],
  carol: ["localhost", 3002],
});

describe("HTTP Backend", () => {
  test("comm", async () => {
    const helloWorld: Choreography<Locations, void> = async ({
      locally,
      comm,
    }) => {
      const msg = await locally("alice", () => "Hello, world!");
      const msgAtBob = await comm("alice", "bob", msg);
      await locally("bob", (unwrap) => {
        expect(unwrap(msgAtBob)).toBe("Hello, world!");
      });
    };
    await Promise.all(locations.map((l) => backend.run(helloWorld, l)));
  });
  test("broadcast", async () => {
    const test: Choreography<Locations, void> = async ({
      locally,
      broadcast,
    }) => {
      const localMsg = await locally("alice", () => "Hello everyone!");
      const msg = await broadcast("alice", localMsg);
      expect(msg).toBe("Hello everyone!");
    };
    await Promise.all(locations.map((l) => backend.run(test, l)));
  });
});
