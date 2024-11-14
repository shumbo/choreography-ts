import {
  HttpConfig,
  ExpressTransport,
} from "@choreography-ts/transport-express";
import {
  Choreography,
  MultiplyLocated,
  Projector,
} from "@choreography-ts/core";
import esMain from "es-main";

export type L = "alice" | "bob";

export const concurrentCall: Choreography<
  L,
  [MultiplyLocated<number, "alice">, MultiplyLocated<number, "alice">], // delay for alice
  [MultiplyLocated<number, "bob">, MultiplyLocated<number, "bob">]
> = async ({ locally, comm, call }, [d1, d2]) => {
  const m1 = await locally("alice", () => "before parallel call");
  await comm("alice", "bob", m1); // [1]
  const p1 = call(async ({ locally, comm }) => {
    // [2]
    await locally("alice", async (unwrap) => {
      new Promise((resolve) => setTimeout(resolve, unwrap(d1)));
    });
    const oneAtAlice = await locally("alice", () => 1);
    const oneAtBob = await comm("alice", "bob", oneAtAlice); // [2, 1]
    const msgAtAlice = await locally("alice", () => "hello 1 from alice");
    const msgAtBob = await comm("alice", "bob", msgAtAlice); // [2, 2]
    await locally("bob", (unwrap) => {
      console.log(unwrap(msgAtBob));
    });
    return [oneAtBob] as const;
  }, []);
  const p2 = call(async ({ locally, comm }) => {
    // [3]
    await locally("alice", async (unwrap) => {
      new Promise((resolve) => setTimeout(resolve, unwrap(d2)));
    });
    const twoAtAlice = await locally("alice", () => 2);
    const twoAtBob = await comm("alice", "bob", twoAtAlice); // [3, 1]
    const msgAtAlice = await locally("alice", () => "hello 2 from alice");
    const msgAtBob = await comm("alice", "bob", msgAtAlice); // [3, 2]
    await locally("bob", (unwrap) => {
      console.log(unwrap(msgAtBob));
    });
    return [twoAtBob] as const;
  }, []);
  const [[oneAtBob], [twoAtBob]] = await Promise.all([p1, p2]);
  return [oneAtBob, twoAtBob];
};

const config: HttpConfig<L> = {
  alice: ["localhost", 3000],
  bob: ["localhost", 3001],
};

async function main() {
  const [aliceTransport, bobTransport] = await Promise.all([
    ExpressTransport.create(config, "alice"),
    ExpressTransport.create(config, "bob"),
  ]);
  const aliceProjector = new Projector(aliceTransport, "alice");
  const bobProjector = new Projector(bobTransport, "bob");

  const alice = aliceProjector.epp(concurrentCall);
  const bob = bobProjector.epp(concurrentCall);
  const [_, ret] = await Promise.all([
    alice([aliceProjector.local(100), aliceProjector.local(0)]),
    bob([bobProjector.remote("alice"), bobProjector.remote("alice")]),
  ]);
  console.log(ret);
  return ret;
}

if (esMain(import.meta)) {
  main();
}
