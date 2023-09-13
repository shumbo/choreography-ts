import { Choreography, Located, Projector, Transport } from "..";

export namespace TransportTestSuite {
  export const locations = ["alice", "bob", "carol", "dave"] as const;
  export type Locations = (typeof locations)[number];
  export type TransportFactory = () => Promise<{
    transports: readonly [
      Transport<Locations, "alice">,
      Transport<Locations, "bob">,
      Transport<Locations, "carol">,
      Transport<Locations, "dave">
    ];
    teardown: () => Promise<void>;
  }>;
  export function transportTestSuite(factory: TransportFactory) {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    let pa: Projector<Locations, "alice">;
    let pb: Projector<Locations, "bob">;
    let pc: Projector<Locations, "carol">;
    let pd: Projector<Locations, "dave">;
    let teardown: any;
    /* eslint-enable @typescript-eslint/no-explicit-any */

    beforeAll(async () => {
      const {
        transports: [ta, tb, tc, td],
        teardown: t,
      } = await factory();
      pa = new Projector(ta, "alice");
      pb = new Projector(tb, "bob");
      pc = new Projector(tc, "carol");
      pd = new Projector(td, "dave");
      teardown = t;
    });
    afterAll(async () => {
      await teardown();
    });

    test("locally", async () => {
      let count = 0;
      const c: Choreography<Locations, [], []> = async ({ locally }) => {
        await locally("alice", () => {
          count += 1;
        });
        await locally("bob", () => {
          count += 2;
        });
        await locally("carol", () => {
          count += 4;
        });
        await locally("dave", () => {
          count += 8;
        });
        return [];
      };
      await Promise.all([
        pa.epp(c)([]),
        pb.epp(c)([]),
        pc.epp(c)([]),
        pd.epp(c)([]),
      ]);
      expect(count).toEqual(15);
    });
    test("comm", async () => {
      const c: Choreography<
        Locations,
        [Located<number, "alice">],
        [Located<number, "dave">]
      > = async ({ locally, comm }, [a]) => {
        const a2 = await locally("alice", (unwrap) => {
          return unwrap(a) + 1;
        });
        const b1 = await comm("alice", "bob", a2);
        const b2 = await locally("bob", (unwrap) => {
          return unwrap(b1) + 2;
        });
        const c1 = await comm("bob", "carol", b2);
        const c2 = await locally("carol", (unwrap) => {
          return unwrap(c1) + 4;
        });
        const d1 = await comm("carol", "dave", c2);
        const d2 = await locally("dave", (unwrap) => {
          return unwrap(d1) + 8;
        });
        return [d2];
      };
      const [, , , [count]] = await Promise.all([
        pa.epp(c)([0]),
        pb.epp(c)([undefined]),
        pc.epp(c)([undefined]),
        pd.epp(c)([undefined]),
      ]);
      expect(count).toEqual(15);
    });
    test("multicast", async () => {
      const test: Choreography<
        Locations,
        [],
        [Located<string, "bob">, Located<string, "carol">]
      > = async ({ locally, multicast }) => {
        const msg = await locally("alice", () => "Hello, world!");
        const msgAtSelectedTwo = await multicast(
          "alice",
          ["carol", "bob"],
          msg
        );
        const msgAtBob = await locally("bob", (unwrap) => {
          return unwrap(msgAtSelectedTwo);
        });
        const msgAtCarol = await locally("carol", (unwrap) => {
          return unwrap(msgAtSelectedTwo);
        });
        return [msgAtBob, msgAtCarol];
      };
      const [, [msgAtBob], [, msgAtCarol]] = await Promise.all([
        pa.epp(test)([]),
        pb.epp(test)([]),
        pc.epp(test)([]),
        pd.epp(test)([]),
      ]);
      expect(msgAtBob).toEqual("Hello, world!");
      expect(msgAtCarol).toEqual("Hello, world!");
    });
    test("broadcast", async () => {
      let count = 0;
      const t = "Hello, world!";
      const test: Choreography<Locations, [], []> = async ({
        locally,
        broadcast,
      }) => {
        const msg = await locally("alice", () => t);
        const msgAtAll = await broadcast("alice", msg);
        locally("alice", () => {
          expect(msgAtAll).toEqual(t);
          count += 1;
        });
        locally("bob", () => {
          expect(msgAtAll).toEqual(t);
          count += 1;
        });
        locally("carol", () => {
          expect(msgAtAll).toEqual(t);
          count += 1;
        });
        locally("dave", () => {
          expect(msgAtAll).toEqual(t);
          count += 1;
        });
        return [];
      };
      await Promise.all([
        pa.epp(test)([]),
        pb.epp(test)([]),
        pc.epp(test)([]),
        pd.epp(test)([]),
      ]);
      expect(count).toEqual(4);
    });
    test("colocally", async () => {
      let count = 0;
      const test: Choreography<Locations, [], []> = async ({ colocally }) => {
        await colocally(
          ["alice", "bob"],
          async ({ locally, broadcast }) => {
            const bAtAlice = await locally("alice", () => "SECRET");
            const b = await broadcast("alice", bAtAlice);
            expect(b).toBe("SECRET");
            count += 1;
            return [];
          },
          []
        );
        return [];
      };
      await Promise.all([
        pa.epp(test)([]),
        pb.epp(test)([]),
        pc.epp(test)([]),
        pd.epp(test)([]),
      ]);
      expect(count).toEqual(2);
    });

    test("colocally changes context", async () => {
      const test: Choreography<Locations> = async ({
        locally,
        broadcast,
        colocally,
      }) => {
        const msgAtCarol = await locally("carol", () => "I'm Carol");
        await colocally(
          ["alice", "bob"],
          async () => {
            const _msgAtEveryone = await broadcast("carol", msgAtCarol);
            return [];
          },
          []
        );
        return [];
      };
      const p = pa.epp(test)([]);
      await expect(p).rejects.toThrow();
    });
  }
}
