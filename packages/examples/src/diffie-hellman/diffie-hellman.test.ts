import { diffieHellman, Location } from "./diffie-hellman";
import { ExpressBackend } from "@choreography-ts/backend-express";

// Test the diffie hellman implementation using Jest
describe("Diffie Hellman", () => {
  it("should return the same shared key", async () => {
    const backend = new ExpressBackend<Location>({
      alice: ["localhost", 3000],
      bob: ["localhost", 3001],
    });
    const keyExchange = diffieHellman("alice", "bob");
    const [[s1, _a], [_b, s2]] = await Promise.all([
      backend.epp(keyExchange, "alice")([false]),
      backend.epp(keyExchange, "bob")([undefined]),
    ]);
    expect(s1).toEqual(s2); // The shared key should be the same
  });
});
