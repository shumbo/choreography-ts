/* eslint-disable @typescript-eslint/no-non-null-assertion */

import {
  Choreography,
  MultiplyLocated,
  Projector,
} from "@choreography-ts/core";
import {
  HttpConfig,
  ExpressTransport,
} from "@choreography-ts/transport-express";

const locations = ["primary", "worker1", "worker2"];
export type Location = (typeof locations)[number];

function divide<T>(arr: T[]): [T[], T[]] {
  const mid = Math.floor(arr.length / 2);
  return [arr.slice(0, mid), arr.slice(mid)];
}

export const sort = <
  A extends Location,
  B extends Location,
  C extends Location,
>(
  a: A,
  b: B,
  c: C,
) => {
  const choreography: Choreography<
    Location,
    [MultiplyLocated<number[], A>],
    [MultiplyLocated<number[], A>]
  > = async ({ locally, broadcast, comm, call }, [arr]) => {
    const conditionAtA = await locally(a, (unwrap) => unwrap(arr).length > 1);
    const condition = await broadcast(a, conditionAtA);
    if (condition) {
      const divided = await locally(a, (unwrap) => divide(unwrap(arr)));
      const lhs = await locally(a, (unwrap) => unwrap(divided)[0]);
      const rhs = await locally(a, (unwrap) => unwrap(divided)[1]);
      const lhsAtB = await comm(a, b, lhs);
      const rhsAtC = await comm(a, c, rhs);
      const [sortedLhs] = await call(sort(b, c, a), [lhsAtB]);
      const [sortedRhs] = await call(sort(c, a, b), [rhsAtC]);
      const merger = merge(a, b, c);
      const [merged] = await call(merger, [sortedLhs, sortedRhs]);
      return [merged];
    } else {
      return [arr];
    }
  };
  return choreography;
};

const merge = <A extends Location, B extends Location, C extends Location>(
  a: A,
  b: B,
  c: C,
) => {
  const choreography: Choreography<
    Location,
    [MultiplyLocated<number[], B>, MultiplyLocated<number[], C>],
    [MultiplyLocated<number[], A>]
  > = async ({ locally, broadcast, comm, call }, [lhs, rhs]) => {
    const lhsHasElementsAtB = await locally(
      b,
      (unwrap) => !!unwrap(lhs).length,
    );
    const lhsHasElements = await broadcast(b, lhsHasElementsAtB);
    if (lhsHasElements) {
      const rhsHasElementsAtC = await locally(
        c,
        (unwrap) => !!unwrap(rhs).length,
      );
      const rhsHasElements = await broadcast(c, rhsHasElementsAtC);
      if (rhsHasElements) {
        const rhsHeadAtC = await locally(c, (unwrap) => unwrap(rhs)[0]!);
        const rhsHeadAtB = await comm(c, b, rhsHeadAtC);
        const takeLhsAtB = await locally(
          b,
          (unwrap) => unwrap(lhs)[0]! < unwrap(rhsHeadAtB),
        );
        const takeLhs = await broadcast(b, takeLhsAtB);
        if (takeLhs) {
          const lhsTailAtB = await locally(b, (unwrap) => unwrap(lhs).slice(1));
          const [merged] = await call(merge(a, b, c), [lhsTailAtB, rhs]);
          const lhsHeadAtB = await locally(b, (unwrap) => unwrap(lhs)[0]!);
          const lhsHeadAtA = await comm(b, a, lhsHeadAtB);
          return [
            await locally(a, (unwrap) => [
              unwrap(lhsHeadAtA),
              ...unwrap(merged),
            ]),
          ];
        } else {
          const rhsTailAtC = await locally(c, (unwrap) => unwrap(rhs).slice(1));
          const [merged] = await call(merge(a, b, c), [lhs, rhsTailAtC]);
          const rhsHeadAtC = await locally(c, (unwrap) => unwrap(rhs)[0]!);
          const rhsHeadAtA = await comm(c, a, rhsHeadAtC);
          return [
            await locally(a, (unwrap) => [
              unwrap(rhsHeadAtA),
              ...unwrap(merged),
            ]),
          ];
        }
      } else {
        return [await comm(b, a, lhs)];
      }
    } else {
      return [await comm(c, a, rhs)];
    }
  };
  return choreography;
};

async function main() {
  const config: HttpConfig<Location> = {
    primary: ["localhost", 3000],
    worker1: ["localhost", 3001],
    worker2: ["localhost", 3002],
  };

  const [primaryTransport, worker1Transport, worker2Transport] =
    await Promise.all([
      ExpressTransport.create(config, "primary"),
      ExpressTransport.create(config, "worker1"),
      ExpressTransport.create(config, "worker2"),
    ]);

  const primaryProjector = new Projector(primaryTransport, "primary");
  const worker1Projector = new Projector(worker1Transport, "worker1");
  const worker2Projector = new Projector(worker2Transport, "worker2");

  const mergesort = sort("primary", "worker1", "worker2");
  const [[sorted]] = await Promise.all([
    primaryProjector.epp(mergesort)([
      primaryProjector.local([1, 4, 6, 2, 3, 5, 7, 8, 9, 10]),
    ]),
    worker1Projector.epp(mergesort)([worker1Projector.remote("primary")]),
    worker2Projector.epp(mergesort)([worker2Projector.remote("primary")]),
  ]);
  console.log(primaryProjector.unwrap(sorted));
}

if (require.main === module) {
  main();
}
