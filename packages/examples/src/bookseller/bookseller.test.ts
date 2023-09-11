import {
  ExpressTransport,
  HttpConfig,
} from "@choreography-ts/transport-express";
import { bookseller } from "./bookseller";
import { Projector } from "@choreography-ts/core";

const config: HttpConfig<"buyer" | "seller"> = {
  buyer: ["127.0.0.1", 3000],
  seller: ["127.0.0.1", 3001],
};

let buyerProjector: Projector<"buyer" | "seller", "buyer">;
let sellerProjector: Projector<"buyer" | "seller", "seller">;

describe("bookseller", () => {
  beforeAll(async () => {
    const buyerTransport = await ExpressTransport.create(config, "buyer");
    const sellerTransport = await ExpressTransport.create(config, "seller");
    buyerProjector = new Projector(buyerTransport, "buyer");
    sellerProjector = new Projector(sellerTransport, "seller");
  });
  afterAll(async () => {
    await Promise.all([
      buyerProjector.transport.teardown(),
      sellerProjector.transport.teardown(),
    ]);
  });
  it("buyer can buy TAPL", async () => {
    const [[dateForTAPL]] = await Promise.all([
      buyerProjector.epp(bookseller)(["TAPL"]),
      sellerProjector.epp(bookseller)([undefined]),
    ]);
    expect(dateForTAPL).toBeTruthy();
  });
  it("buyer cannot buy HoTT", async () => {
    const [[dateForHoTT]] = await Promise.all([
      buyerProjector.epp(bookseller)(["HoTT"]),
      sellerProjector.epp(bookseller)([undefined]),
    ]);
    expect(dateForHoTT).toBeFalsy();
  });
});
