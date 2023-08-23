import { Colocated, Choreography } from "@choreography-ts/core";

type Locations = "alice" | "bob" | "carol" | "dave";

const dualResponse: Choreography<
  Locations,
  [
    Colocated<string, "alice" | "bob" | "dave">,
    Colocated<string, "carol" | "bob" | "dave">
  ], // Covariance works! Type Colocated<`"alice" | "bob" | "dave"> is a subtype of Colocated<"alice" | "bob"  | "dave" | "carol">!
  | [
      Colocated<string, "bob" | "alice" | "carol">,
      Colocated<string, "dave" | "alice" | "carol">
    ]
  | []
> = async ({ locally, peel, multicast }, [msgAlice, msgCarol]) => {
  const aliceMsg = peel(msgAlice);
  const carolMsg = peel(msgCarol);
  await locally("bob", (unwrap) => unwrap(msgAlice)); // Contravariance works! Type Colocated<"alice" | "bob" | "dave"> is a subtype of Colocated<"bob">!
  if (aliceMsg.length > 0 && carolMsg.length > 0) {
    const responseBob = await locally("bob", () => "hi, this is bob");
    const colocatedBob = await multicast(
      "bob",
      ["alice", "carol"],
      responseBob
    );
    const responseDave = await locally("dave", () => "hi, this is dave");
    const colocatedDave = await multicast(
      "dave",
      ["alice", "carol"],
      responseDave
    );
    return [colocatedBob, colocatedDave];
  }
  return [];
};

const _test: Choreography<
  Locations,
  [],
  | [
      Colocated<string, "bob" | "alice" | "carol">,
      Colocated<string, "dave" | "alice" | "carol">
    ]
  | []
> = async ({ locally, multicast, colocally }) => {
  const msgAtAlice = await locally("alice", () => "hi from alice");
  const colocatedAlice = await multicast("alice", ["bob", "dave"], msgAtAlice);
  const msgAtCarol = await locally("carol", () => "hi from carol");
  const colocatedCarol = await multicast("carol", ["bob", "dave"], msgAtCarol);
  const responses = await colocally(["bob", "dave"], dualResponse, [
    colocatedAlice,
    colocatedCarol,
  ]);
  return responses;
};
