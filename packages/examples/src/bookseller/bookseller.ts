import { Choreography, Located, Projector } from "@choreography-ts/core";
import {
  ExpressTransport,
  HttpConfig,
} from "@choreography-ts/transport-express";

export type Locations = "buyer" | "seller";

const priceTable = new Map<string, number>([
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
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
  const config: HttpConfig<Locations> = {
    seller: ["127.0.0.1", 3000],
    buyer: ["localhost", 3001],
  };
  const [sellerTransport, buyerTransport] = await Promise.all([
    ExpressTransport.create(config, "seller"),
    ExpressTransport.create(config, "buyer"),
  ]);
  const sellerProjector = new Projector(sellerTransport, "seller");
  const buyerProjector = new Projector(buyerTransport, "buyer");

  const [[dateForTAPL]] = await Promise.all([
    buyerProjector.epp(bookseller)(["TAPL"]),
    sellerProjector.epp(bookseller)([undefined]),
  ]);
  console.log("Delivery date:", dateForTAPL);
  console.log("--- Buying HoTT ---");
  const [[dateForHoTT]] = await Promise.all([
    buyerProjector.epp(bookseller)(["HoTT"]),
    sellerProjector.epp(bookseller)([undefined]),
  ]);
  console.log("Delivery date:", dateForHoTT);
}

if (require.main === module) {
  main();
}
