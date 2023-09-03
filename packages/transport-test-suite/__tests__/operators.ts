import {
  Choreography,
  Located,
  Projector,
  Transport,
} from "@choreography-ts/core";
import {
  ExpressTransport,
  HttpConfig,
} from "@choreography-ts/transport-express";
import { LocalTransport } from "@choreography-ts/transport-local";

const locations = ["alice", "bob", "carol", "dave"] as const;
type Locations = (typeof locations)[number];

type TransportFactory = () => Promise<{
  transports: readonly [
    Transport<Locations, "alice">,
    Transport<Locations, "bob">,
    Transport<Locations, "carol">,
    Transport<Locations, "dave">
  ];
  teardown: () => Promise<void>;
}>;

const localTransportFactory: TransportFactory = async () => {
  const channel = LocalTransport.createChannel(locations);
  const transports = [
    new LocalTransport<Locations, "alice">(locations, "alice", channel),
    new LocalTransport<Locations, "bob">(locations, "bob", channel),
    new LocalTransport<Locations, "carol">(locations, "carol", channel),
    new LocalTransport<Locations, "dave">(locations, "dave", channel),
  ] as const;
  return {
    transports,
    teardown: async () => {
      await Promise.all(transports.map((t) => t.teardown()));
      channel.emitter.all.clear();
    },
  };
};

const expressTransportFactory: TransportFactory = async () => {
  const config: HttpConfig<Locations> = {
    alice: ["127.0.0.1", 3020],
    bob: ["127.0.0.1", 3021],
    carol: ["127.0.0.1", 3022],
    dave: ["127.0.0.1", 3023],
  };
  const transports = [
    await ExpressTransport.create(config, "alice"),
    await ExpressTransport.create(config, "bob"),
    await ExpressTransport.create(config, "carol"),
    await ExpressTransport.create(config, "dave"),
  ] as const;
  return {
    transports,
    teardown: async () => {
      await Promise.all(transports.map((t) => t.teardown()));
    },
  };
};

/* eslint-disable @typescript-eslint/no-explicit-any */
let pa: Projector<Locations, "alice">;
let pb: Projector<Locations, "bob">;
let pc: Projector<Locations, "carol">;
let pd: Projector<Locations, "dave">;
let teardown: any;
/* eslint-enable @typescript-eslint/no-explicit-any */

describe.each([localTransportFactory, expressTransportFactory])(
  "operators",
  (factory) => {
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
  }
);
