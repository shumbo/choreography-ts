import { Choreography } from "@choreography-ts/core";

const locations = ["alice", "bob", "carol"] as const;
type Locations = (typeof locations)[number];

// eslint-disable-next-line
const test: Choreography<Locations> = async ({ locally, conclave }) => {
  const msgAtCarol = await locally("carol", () => "I'm Carol");
  try {
    await conclave(
      ["alice", "bob", "carol"],
      async ({ broadcast }) => {
        const _msgAtEveryone = await broadcast("carol", msgAtCarol);
      },
      [],
    );
  } catch (e) {
    console.warn(e);
  }
  return undefined;
};
