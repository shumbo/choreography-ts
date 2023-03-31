import { Choreography, Located, HttpBackend } from "../../src";

type Locations = "buyer" | "seller";

const testChoreography: Choreography<Locations> = async ({
  locally,
  comm,
  broadcast,
}) => {
  const x = await locally("buyer", () => {
    return "TAPL";
  });
  await locally("buyer", (unwrap) => {
    const x2 = unwrap(x);
  });
  await locally<"seller", void>("seller", (unwrap) => {
    // @ts-expect-error
    const x3 = unwrap(x);
  });
  const y = await comm("buyer", "seller", x);

  await locally("buyer", (unwrap) => {
    // @ts-expect-error
    const _ = unwrap(y);
  });

  return [];
};

const bookseller: Choreography<
  Locations,
  [],
  [Located<Date | null, "buyer">]
> = async ({ locally, comm, broadcast }) => {
  const titleAtBuyer = await locally("buyer", () => {
    return "HoTT";
  });
  console.log({ titleAtBuyer });
  const titleAtSeller = await comm("buyer", "seller", titleAtBuyer);
  const priceAtSeller = await locally("seller", (unwrap) => {
    const priceTable = new Map<String, number>([
      ["TAPL", 80],
      ["HoTT", 120],
    ]); // { TAPL: 80, HoTT: 120 }
    return priceTable.get(unwrap(titleAtSeller)) ?? 0;
  });
  const priceAtBuyer = await comm("seller", "buyer", priceAtSeller);
  const decisionAtBuyer = await locally("buyer", (unwrap) => {
    const buyerBudget = 100;
    return unwrap(priceAtBuyer) <= buyerBudget;
  });
  const decision = await broadcast("buyer", decisionAtBuyer);
  if (decision) {
    const deliveryDateAtSeller = await locally("seller", (unwrap) => {
      const deliveryDateTable = new Map<string, Date>([
        ["TAPL", new Date()],
        ["HoTT", new Date()],
      ]);
      return deliveryDateTable.get(unwrap(titleAtSeller))!;
    });
    const deliveryDateAtBuyer = await comm(
      "seller",
      "buyer",
      deliveryDateAtSeller
    );
    await locally("buyer", (unwrap) => {
      console.log(
        `Your book will be delivered on ${unwrap(deliveryDateAtBuyer)}`
      );
    });
    return [deliveryDateAtBuyer];
  } else {
    await locally("buyer", () => {
      console.log("You don't have enough money to buy this book");
    });
    return [await locally("buyer", () => null)];
  }
};

async function main(location: string) {
  const backend = new HttpBackend<Locations>({
    seller: ["localhost", 3000],
    buyer: ["localhost", 3001],
  });
  backend.run(bookseller, location as any, []);
}

main(process.argv[2]!);
