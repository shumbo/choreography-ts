import { Choreography, Located, Projector } from "@choreography-ts/core";
import {
  ExpressTransport,
  HttpConfig,
} from "@choreography-ts/transport-express";

const locations = ["buyer1", "buyer2", "seller"] as const;
export type Locations = (typeof locations)[number];

type MakeDecision = Choreography<
  Locations,
  [Located<number, "buyer1">],
  [Located<boolean, "buyer1">]
>;

const buyer1Budget = 100;
const buyer2Budget = 50;
const priceTable = new Map<string, number>([
  ["TAPL", 80],
  ["HoTT", 120],
]);
const deliveryDateTable = new Map<string, Date>([
  ["TAPL", new Date("2023-04-01")],
  ["HoTT", new Date("2023-05-01")],
]);

export const oneBuyer: MakeDecision = async ({ locally }, [price]) => {
  const decision = await locally(
    "buyer1",
    (unwrap) => unwrap(price) <= buyer1Budget,
  );
  return [decision];
};

export const twoBuyers: MakeDecision = async ({ locally, comm }, [price]) => {
  const remaining_ = await locally(
    "buyer1",
    (unwrap) => unwrap(price) - buyer1Budget,
  );
  const remaining = await comm("buyer1", "buyer2", remaining_);
  const decision_ = await locally(
    "buyer2",
    (unwrap) => unwrap(remaining) <= buyer2Budget,
  );
  const decision = await comm("buyer2", "buyer1", decision_);
  return [decision];
};

export const bookseller: (
  makeDecision: MakeDecision,
) => Choreography<
  Locations,
  [Located<string, "buyer1">],
  [Located<Date | null, "buyer1">]
> = (makeDecision) => {
  const c: Choreography<
    Locations,
    [Located<string, "buyer1">],
    [Located<Date | null, "buyer1">]
  > = async ({ locally, comm, multicast, colocally, call }, [titleAtBuyer]) => {
    const titleAtSeller = await comm("buyer1", "seller", titleAtBuyer);
    const priceAtSeller = await locally("seller", (unwrap) => {
      return priceTable.get(unwrap(titleAtSeller)) ?? 0;
    });
    const priceAtBuyer = await comm("seller", "buyer1", priceAtSeller);
    const [decisionAtBuyer] = await call(makeDecision, [priceAtBuyer]);
    const decision = await multicast("buyer1", ["seller"], decisionAtBuyer);
    const [deliveryDateAtBuyer] = await colocally(
      ["buyer1", "seller"],
      async ({ locally, comm, naked }) => {
        const sharedDecision = naked(decision);
        if (sharedDecision) {
          const deliveryDateAtSeller = await locally(
            "seller",
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            (unwrap) => deliveryDateTable.get(unwrap(titleAtSeller))!,
          );
          const deliveryDateAtBuyer = await comm(
            "seller",
            "buyer1",
            deliveryDateAtSeller,
          );
          locally("buyer1", (unwrap) => {
            console.log(
              `Your book will be delivered on ${unwrap(deliveryDateAtBuyer)}`,
            );
          });
          return [deliveryDateAtBuyer];
        } else {
          await locally("buyer1", () => {
            console.log("You don't have enough money to buy this book");
          });
          return [await locally("buyer1", () => null)];
        }
      },
      [],
    );
    await locally("buyer2", () => {
      console.log(
        "I have no idea what happened to the book purchase, but that's ok",
      );
    });
    return [deliveryDateAtBuyer];
  };
  return c;
};

async function main() {
  const config: HttpConfig<Locations> = {
    seller: ["127.0.0.1", 3000],
    buyer1: ["127.0.0.1", 3001],
    buyer2: ["127.0.0.1", 3002],
  };
  const [sellerTransport, buyer1Transport, buyer2Transport] = await Promise.all(
    [
      ExpressTransport.create(config, "seller"),
      ExpressTransport.create(config, "buyer1"),
      ExpressTransport.create(config, "buyer2"),
    ],
  );
  const sellerProjector = new Projector(sellerTransport, "seller");
  const buyer1Projector = new Projector(buyer1Transport, "buyer1");
  const buyer2Projector = new Projector(buyer2Transport, "buyer2");

  console.log("--- PROTOCOL WITH ONE BUYER ---");
  await Promise.all([
    buyer1Projector.epp(bookseller(oneBuyer))(["HoTT"]),
    buyer2Projector.epp(bookseller(oneBuyer))([undefined]),
    sellerProjector.epp(bookseller(oneBuyer))([undefined]),
  ]);
  console.log("--- PROTOCOL WITH TWO BUYERS ---");
  await Promise.all([
    buyer1Projector.epp(bookseller(twoBuyers))(["TAPL"]),
    buyer2Projector.epp(bookseller(twoBuyers))([undefined]),
    sellerProjector.epp(bookseller(twoBuyers))([undefined]),
  ]);
  await Promise.all([
    buyer1Transport.teardown(),
    buyer2Transport.teardown(),
    sellerTransport.teardown(),
  ]);
}

if (require.main === module) {
  main();
}
