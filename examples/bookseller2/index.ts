import { Choreography, HttpBackend } from "../../src";

const locations = ["buyer1", "buyer2", "seller"] as const;
type Location = (typeof locations)[number];

type MakeDecision = Choreography<
  Location,
  { buyer1: boolean },
  null,
  { buyer1: number }
>;

const buyer1Budget = 100;
const buyer2Budget = 50;
const priceTable = new Map<String, number>([
  ["TAPL", 80],
  ["HoTT", 120],
]);
const deliveryDateTable = new Map<string, Date>([
  ["TAPL", new Date("2023-04-01")],
  ["HoTT", new Date("2023-05-01")],
]);

const oneBuyer: MakeDecision = async ({ locally }, _, { buyer1: price }) => {
  const decision = await locally(
    "buyer1",
    (unwrap) => unwrap(price) <= buyer1Budget
  );
  return { buyer1: decision };
};

const twoBuyers: MakeDecision = async (
  { locally, comm },
  _,
  { buyer1: price }
) => {
  const remaining_ = await locally(
    "buyer1",
    (unwrap) => unwrap(price) - buyer1Budget
  );
  const remaining = await comm("buyer1", "buyer2", remaining_);
  const decision_ = await locally(
    "buyer2",
    (unwrap) => unwrap(remaining) <= buyer2Budget
  );
  const decision = await comm("buyer2", "buyer1", decision_);
  return { buyer1: decision };
};

const bookseller: Choreography<
  Location,
  { buyer1: Date | null },
  MakeDecision
> = async ({ locally, comm, broadcast, call }, makeDecision) => {
  const titleAtBuyer = await locally("buyer1", () => {
    return "HoTT";
  });
  console.log({ titleAtBuyer });
  const titleAtSeller = await comm("buyer1", "seller", titleAtBuyer);
  const priceAtSeller = await locally("seller", (unwrap) => {
    return priceTable.get(unwrap(titleAtSeller)) ?? 0;
  });
  const priceAtBuyer = await comm("seller", "buyer1", priceAtSeller);
  const { buyer1: decisionAtBuyer } = await call<
    "seller" | "buyer1" | "buyer2",
    { buyer1: boolean },
    null,
    { buyer1: number }
  >(makeDecision, null, { buyer1: priceAtBuyer });
  const decision = await broadcast("buyer1", decisionAtBuyer);
  if (decision) {
    const deliveryDateAtSeller = await locally("seller", (unwrap) => {
      return deliveryDateTable.get(unwrap(titleAtSeller))!;
    });
    const deliveryDateAtBuyer = await comm(
      "seller",
      "buyer1",
      deliveryDateAtSeller
    );
    await locally("buyer1", (unwrap) => {
      console.log(
        `Your book will be delivered on ${unwrap(deliveryDateAtBuyer)}`
      );
    });
    return { buyer1: deliveryDateAtBuyer };
  } else {
    await locally("buyer1", () => {
      console.log("You don't have enough money to buy this book");
    });
    return { buyer1: await locally("buyer1", () => null) };
  }
};

async function main() {
  const backend = new HttpBackend<Location>({
    buyer1: ["localhost", 3000],
    buyer2: ["localhost", 3001],
    seller: ["localhost", 3002],
  });
  console.log("--- PROTOCOL WITH ONE BUYER ---");
  await Promise.all(
    locations.map((l) => backend.run(bookseller, l, oneBuyer, {}))
  );
  console.log("--- PROTOCOL WITH TWO BUYERS ---");
  await Promise.all(
    locations.map((l) => backend.run(bookseller, l, twoBuyers, {}))
  );
}

main();
