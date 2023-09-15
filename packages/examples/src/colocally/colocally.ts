import { Choreography } from "@choreography-ts/core";

const locations = ["alice", "bob", "carol"] as const;
type Locations = (typeof locations)[number];

const test: Choreography<Locations> = async ({ locally, colocally }) => {
  const msgAtCarol = await locally("carol", () => "I'm Carol");
  try {
    await colocally(
      ["alice", "bob", "carol"],
      async ({ broadcast }) => {
        const _msgAtEveryone = await broadcast("carol", msgAtCarol);
        return [];
      },
      [],
    );
  } catch (e) {
    console.warn(e);
  }
  return [];
};
