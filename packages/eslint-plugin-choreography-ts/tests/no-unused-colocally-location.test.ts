import { ruleTester } from "./common";
import noUnusedColocallyLocation from "../src/no-unused-colocally-location";

ruleTester.run("no-unused-colocally-location", noUnusedColocallyLocation, {
  valid: [
    {
      name: `passing test case 1: all locations for 'colocally' are used operationally inside the body`,
      code: `type Locations = "alice" | "bob";
      const test: Choreography<Locations, [], []> = async ({ colocally }) => {
        await colocally(
          ["alice", "bob"],
          async ({ locally }) => {
            await locally("alice", () => "bob");
            await locally("bob", () => "alice");
            return [];
          },
          []
        );
        return [];
      };`,
    },
  ],
  invalid: [
    {
      name: `failing test case 1: all locations specified for 'colocally' are not used operationally inside the body`,
      code: `type Locations = "alice" | "bob";
      const test: Choreography<Locations, [], []> = async ({ colocally }) => {
        await colocally(
          ["alice", "bob"],
          async ({ locally }) => {
            await locally("alice", () => "bob");
            return [];
          },
          []
        );
        return [];
      };`,
      errors: [
        {
          messageId: "warning",
        }
      ]
    },
  ],
});
