import { HttpBackend } from "../../src";
import { Locations, bookseller, oneBuyer, twoBuyers } from "./bookseller2";

const backend = new HttpBackend<Locations>({
  buyer1: ["localhost", 3000],
  buyer2: ["localhost", 3001],
  seller: ["localhost", 3002],
});

describe("bookseller2", () => {
  it("cannot buy HoTT with one buyer", async () => {
    const choreography = bookseller(oneBuyer);
    const [[dateForHoTT]] = await Promise.all([
      backend.epp(choreography, "buyer1")(["HoTT"]),
      backend.epp(choreography, "buyer2")([undefined]),
      backend.epp(choreography, "seller")([undefined]),
    ]);
    expect(dateForHoTT).toBeFalsy();
  });
  it("can buy HoTT with two buyers", async () => {
    const choreography = bookseller(twoBuyers);
    const [[dateForHoTT]] = await Promise.all([
      backend.epp(choreography, "buyer1")(["HoTT"]),
      backend.epp(choreography, "buyer2")([undefined]),
      backend.epp(choreography, "seller")([undefined]),
    ]);
    expect(dateForHoTT).toBeTruthy();
  });
});
