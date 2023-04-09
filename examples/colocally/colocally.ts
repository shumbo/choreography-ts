import { Choreography, HttpBackend } from "../../src";

const locations = ["alice", "bob", "carol"] as const;
type Locations = (typeof locations)[number];

const backend = new HttpBackend<Locations>({
  alice: ["localhost", 3000],
  bob: ["localhost", 3001],
  carol: ["localhost", 3002],
});

const test: Choreography<Locations> = async ({
  locally,
  broadcast,
  colocally,
}) => {
  const msgAtCarol = await locally("carol", () => "I'm Carol");
  try {
    await colocally(["alice", "bob"], async () => {
      const msgAtEveryone = await broadcast("carol", msgAtCarol);
      return [];
    });
  } catch (e) {
    console.warn(e);
  }
  return [];
};

backend
  .epp(
    test,
    "alice"
  )([])
  .then(() => {
    console.log("success");
  })
  .catch((e) => {
    console.log(e);
  });
