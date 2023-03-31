import { HttpBackend } from "../../src";
import { Locations, bookseller } from "./bookseller";

const backend = new HttpBackend<Locations>({
  buyer: ["localhost", 3000],
  seller: ["localhost", 3001],
});

describe("bookseller", () => {
  it("buyer can buy TAPL", async () => {
    const [[dateForTAPL]] = await Promise.all([
      backend.run(bookseller, "buyer", ["TAPL"]),
      backend.run(bookseller, "seller", [undefined]),
    ]);
    expect(dateForTAPL).toBeTruthy();
  });
  it("buyer cannot buy HoTT", async () => {
    const [[dateForHoTT]] = await Promise.all([
      backend.run(bookseller, "buyer", ["HoTT"]),
      backend.run(bookseller, "seller", [undefined]),
    ]);
    expect(dateForHoTT).toBeFalsy();
  });
});
