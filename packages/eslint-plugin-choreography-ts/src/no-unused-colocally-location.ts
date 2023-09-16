// no-unused-colocally-location rule
// All locations specified for a `colocally` call must be used inside the body
// https://github.com/shumbo/choreography-ts/issues/7

"use strict";
import { AST_NODE_TYPES, TSESLint, TSESTree } from "@typescript-eslint/utils";

type MessageIDs = "warning";

const colocallySelector = `CallExpression[callee.name = "colocally"]`;
const colocallyColocallyUseLocater = `${colocallySelector} CallExpression[callee.name = "colocally"]`;
const colocallyLocallyUseLocater = `${colocallySelector} CallExpression[callee.name = "locally"]`;
const colocallyMulticastUseLocater = `${colocallySelector} CallExpression[callee.name = "multicast"]`;
const colocallyCommUseLocater = `${colocallySelector} CallExpression[callee.name = "comm"]`;
const colocallyBroadcastUseLocater = `${colocallySelector} CallExpression[callee.name = "broadcast"]`;
const colocallyCallUseLocater = `${colocallySelector} CallExpression[callee.name = "call"]`;
const colocallyTypeUseLocater = `${colocallySelector} TSLiteralType`;
const colocallyAtExit = `${colocallySelector}:exit`;

// Implementation: Check whether each location passed to `colocally` is present inside the body of the choreography argument
// as an argument to any operator that accepts or uses location parameters (locally, colocally, comm, multicast, broadcast, call)
// or as a type argument
const noUnusedColocallyLocation: TSESLint.RuleModule<MessageIDs, []> = {
  defaultOptions: [],
  meta: {
    type: "problem",
    docs: {
      description:
        "All locations specified for `colocally` must be used inside the body of the call",
      recommended: "recommended",
      url: "https://github.com/shumbo/choreography-ts/issues/7",
    },
    fixable: undefined, // not automatically fixable
    hasSuggestions: false, // no suggested fixes available
    messages: {
      warning: "Location `{{ location }}` is not used inside the body.",
    },
    schema: [],
  },
  create(context) {
    // Store locations for each `colocally` usage
    // This is a `Map` where each location name is associated with its error to report if it goes unsued throughout the `colocally` choreography
    // Each new `colocally` node replaces the previous rpeort associated with the location
    const locations: Map<string, TSESLint.ReportDescriptor<MessageIDs>>[] = [];
    return {
      // Gather locations passed to a `colocally` call
      [colocallySelector]: function (node: TSESTree.CallExpression) {
        const map = new Map(); // Create a new mapping for the `colocally` context
        const args = node.arguments;
        if (args[0]?.type === AST_NODE_TYPES.ArrayExpression) {
          // To ensure that only `colocally` calls are checked for which the inner choreography is defined as an
          // arrow function where the use of the locations can be easily verified
          if (args[1]?.type === AST_NODE_TYPES.ArrowFunctionExpression) {
            args[0].elements.forEach((arg) => {
              if (
                arg?.type === AST_NODE_TYPES.Literal &&
                typeof arg.value === "string"
              ) {
                // Set error reports for locations passed to the `colocally` call
                map.set(arg.value, {
                  node: arg,
                  messageId: "warning",
                  data: {
                    location: arg.value,
                  },
                });
              }
            });
          }
        }
        locations.push(map);
      },
      // Check whether any location is used an argument to a nested `colocally` expression
      // and also add the locations to `locations` for checking their use inside the nested `colocally` body
      [colocallyColocallyUseLocater]: function (node: TSESTree.CallExpression) {
        const map = locations.pop()!; // Get the mapping from the end of the `locations` array - there will be at least one mapping in `locations` at this point
        const newMap = new Map(); // Create a new mapping for the nested `colocally` context
        const args = node.arguments;
        if (args[0]?.type === AST_NODE_TYPES.ArrayExpression) {
          args[0].elements.forEach((location) => {
            if (
              location?.type === AST_NODE_TYPES.Literal &&
              typeof location.value === "string"
            ) {
              // Remove locations used from the outer `colocally` mapping
              map.delete(location.value);
              // Add error reports for locations for the nested `colocally` context
              newMap.set(location.value, {
                node: location,
                messageId: "warning",
                data: {
                  location: location.value,
                },
              });
            }
          });
        }
        locations.push(map); // Push mapping for outer `colocally` context
        locations.push(newMap); // Push new mapping for nested `colocally` context
      },
      // Check whether any location is used as an argument to a nested `locally` expression
      [colocallyLocallyUseLocater]: function (node: TSESTree.CallExpression) {
        const map = locations.pop()!;
        const args = node.arguments;
        if (
          args[0]?.type === AST_NODE_TYPES.Literal &&
          typeof args[0].value === "string"
        ) {
          map.delete(args[0].value); // Remove locations from the mapping as seen in the nested `locally` call
        }
        locations.push(map);
      },
      // Check whether any location is used as an argument to a nested `multicast` expression
      [colocallyMulticastUseLocater]: function (node: TSESTree.CallExpression) {
        const map = locations.pop()!;
        const args = node.arguments;
        // Check whether any location is the sender
        if (
          args[0]?.type === AST_NODE_TYPES.Literal &&
          typeof args[0].value === "string"
        ) {
          map.delete(args[0].value); // Remove locations use as a `multicast` sender
        }
        // Check whether any location is a receiver
        if (args[1]?.type == AST_NODE_TYPES.ArrayExpression) {
          args[1].elements.forEach((receiver) => {
            if (
              receiver?.type === AST_NODE_TYPES.Literal &&
              typeof receiver.value === "string"
            ) {
              map.delete(receiver.value); // Remove locations used as a `multicast`receiver
            }
          });
        }
        locations.push(map);
      },
      // Check whether any `broadcast` is used inside the `colocally` call, which instantly designates the locations as being used
      [colocallyBroadcastUseLocater]: function () {
        const map = locations.pop()!;
        map.clear(); // Remove all locations from the mapping for the current `colocally` context
        locations.push(map);
      },
      // Check for any use of `call`, which should also mark all the locations as being used
      [colocallyCallUseLocater]: function () {
        const map = locations.pop()!;
        map.clear(); // Remove all locations from the mapping for the current `colocally` context
        locations.push(map);
      },
      // Check whether any location is used as an argument to a nested `comm` expression
      [colocallyCommUseLocater]: function (node: TSESTree.CallExpression) {
        const map = locations.pop()!;
        const args = node.arguments;
        // Check whether any location is the sender
        if (
          args[0]?.type === AST_NODE_TYPES.Literal &&
          typeof args[0].value === "string"
        ) {
          map.delete(args[0].value); // Remove locations used as a `comm` sender
        }
        // Check whether any location is the receiver
        if (
          args[1]?.type === AST_NODE_TYPES.Literal &&
          typeof args[1].value === "string"
        ) {
          map.delete(args[1].value); // Remove locations used as a `comm` receiver
        }
        locations.push(map);
      },
      // Check whether any location is used as a type argument in the inner choreography
      [colocallyTypeUseLocater]: function (node: TSESTree.TSLiteralType) {
        const map = locations.pop()!;
        if (
          node.literal.type === AST_NODE_TYPES.Literal &&
          typeof node.literal.value === "string"
        ) {
          map.delete(node.literal.value); // Remove locations being used as type arguments
        }
        locations.push(map);
      },
      // Report errors for unused location arguments once the AST for the entire program is traversed
      [colocallyAtExit]: function () {
        const map = locations.pop()!; // Remove the unused locations mapping for the current `colocally` context
        map.forEach((report) => context.report(report)); // Report warnings for the unused locations
      },
    };
  },
};

export default noUnusedColocallyLocation;
