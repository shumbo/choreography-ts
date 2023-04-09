import { HttpBackend } from "../../src";
import { Locations, bookseller } from "./bookseller";

const backend = new HttpBackend<Locations>({
  buyer: ["localhost", 3000],
  seller: ["localhost", 3001],
});

describe("bookseller", () => {
  it("buyer can buy TAPL", async () => {
    const [[dateForTAPL]] = await Promise.all([
      backend.epp(bookseller, "buyer")(["TAPL"]),
      backend.epp(bookseller, "seller")([undefined]),
    ]);
    expect(dateForTAPL).toBeTruthy();
  });
  it("buyer cannot buy HoTT", async () => {
    const [[dateForHoTT]] = await Promise.all([
      backend.epp(bookseller, "buyer")(["HoTT"]),
      backend.epp(bookseller, "seller")([undefined]),
    ]);
    expect(dateForHoTT).toBeFalsy();
  });
});
