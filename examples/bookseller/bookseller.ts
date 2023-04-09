import { Choreography, Located, HttpBackend } from "../../src";

export type Locations = "buyer" | "seller";

const priceTable = new Map<String, number>([
  ["TAPL", 80],
  ["HoTT", 120],
]);

const deliveryDateTable = new Map<string, Date>([
  ["TAPL", new Date()],
  ["HoTT", new Date()],
]);

const buyerBudget = 100;

export const bookseller: Choreography<
  Locations,
  [Located<string, "buyer">],
  [Located<Date | null, "buyer">]
> = async ({ locally, comm, broadcast }, [titleAtBuyer]) => {
  // move the title from buyer to seller
  const titleAtSeller = await comm("buyer", "seller", titleAtBuyer);
  // seller looks up the price
  const priceAtSeller = await locally(
    "seller",
    (unwrap) => priceTable.get(unwrap(titleAtSeller)) ?? Number("Infinity") // can't buy a book that doesn't exist
  );
  // send the price back to the buyer
  const priceAtBuyer = await comm("seller", "buyer", priceAtSeller);
  // buyer decides whether to buy the book
  const decisionAtBuyer = await locally(
    "buyer",
    (unwrap) => unwrap(priceAtBuyer) <= buyerBudget
  );
  // broadcast the decision
  const decision = await broadcast("buyer", decisionAtBuyer);
  if (decision) {
    // if the buyer decides to buy the book, seller looks up the delivery date
    const deliveryDateAtSeller = await locally(
      "seller",
      (unwrap) => deliveryDateTable.get(unwrap(titleAtSeller))!
    );
    // send the delivery date back to the buyer
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
    // return null on the buyer side
    return [await locally("buyer", () => null)];
  }
};

async function main() {
  const backend = new HttpBackend<Locations>({
    seller: ["localhost", 3000],
    buyer: ["localhost", 3001],
  });
  console.log("--- Buying TAPL ---");
  const [[dateForTAPL]] = await Promise.all([
    backend.epp(bookseller, "buyer")(["TAPL"]),
    backend.epp(bookseller, "seller")([undefined]),
  ]);
  console.log("Delivery date:", dateForTAPL);
  console.log("--- Buying HoTT ---");
  const [[dateForHoTT]] = await Promise.all([
    backend.epp(bookseller, "buyer")(["HoTT"]),
    backend.epp(bookseller, "seller")([undefined]),
  ]);
  console.log("Delivery date:", dateForHoTT);
}

if (require.main === module) {
  main();
}
