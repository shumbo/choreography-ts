import { ExpressBackend } from "@choreography-ts/backend-express";
import { Choreography, Located } from "@choreography-ts/core";

export type L = "alice" | "bob";

export const concurrentCall: Choreography<
  L,
  [Located<number, "alice">, Located<number, "alice">], // delay for alice
  [Located<number, "bob">, Located<number, "bob">]
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
    return [oneAtBob];
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
    return [twoAtBob];
  }, []);
  const [[oneAtBob], [twoAtBob]] = await Promise.all([p1, p2]);
  return [oneAtBob!, twoAtBob!];
};

async function main() {
  const backend = new ExpressBackend<L>({
    alice: ["localhost", 3000],
    bob: ["localhost", 3001],
  });
  const alice = backend.epp(concurrentCall, "alice");
  const bob = backend.epp(concurrentCall, "bob");
  const [_, ret] = await Promise.all([
    alice([100, 0]),
    bob([undefined, undefined]),
  ]);
  console.log(ret);
  return ret;
}

if (require.main === module) {
  main();
}
