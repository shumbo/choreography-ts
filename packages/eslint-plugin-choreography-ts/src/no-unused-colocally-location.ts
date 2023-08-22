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
    // Each new `colocally` node generates a new array of locations that is appended to `locations` and then removed once the `colocally` node is exited
    const locations: {
      location: string; // name of the location
      report: TSESLint.ReportDescriptor<MessageIDs>; // the error to report
    }[][] = [];
    return {
      // Gather locations passed to a `colocally` call
      [colocallySelector]: function (node: TSESTree.CallExpression) {
        const array = locations.pop() ?? []; // This is the only case where `locations` can be empty
        const args = node.arguments;
        if (args[0]?.type === AST_NODE_TYPES.ArrayExpression) {
          // To ensure that only `colocally` calls are checked for which the inner choreography is defined as an
          // arrow function where the use of the locations can be easily verified
          if (args[1]?.type === AST_NODE_TYPES.ArrowFunctionExpression) {
            args[0].elements.forEach((arg) => {
              if (arg?.type === AST_NODE_TYPES.Literal) {
                // Push all locations passed to the `colocally` call
                array.push({
                  location: arg.value as string,
                  report: {
                    node: arg,
                    messageId: "warning",
                    data: {
                      location: arg.value,
                    },
                  },
                });
              }
            });
          }
        }
        locations.push(array);
      },
      // Check whether any location is used an argument to a nested `colocally` expression
      // and also add the locations to `locations` for checking their use inside the nested `colocally` body
      [colocallyColocallyUseLocater]: function (node: TSESTree.CallExpression) {
        let array = locations.pop()!; // There will always be at least one array in `Locations` for any nested operator node
        const newArray: (typeof locations)[number] = [];
        const args = node.arguments;
        if (args[0]?.type === AST_NODE_TYPES.ArrayExpression) {
          args[0].elements.forEach((location) => {
            if (location?.type === AST_NODE_TYPES.Literal) {
              array = array.filter(
                (value) => value.location !== location.value,
              ); // Remove locations seen in the nested `colocally` call from a potential parent `colocally` call
              newArray.push({
                location: location.value as string,
                report: {
                  node: location,
                  messageId: "warning",
                  data: {
                    location: location.value,
                  },
                },
              });
            }
          });
        }
        // Push two new arrays to `locations`: one for the outer `colocally` and another for the current nested `colocally`
        locations.push(array);
        locations.push(newArray);
      },
      // Check whether any location is used as an argument to a nested `locally expression
      [colocallyLocallyUseLocater]: function (node: TSESTree.CallExpression) {
        let array = locations.pop()!;
        const args = node.arguments;
        if (args[0]?.type === AST_NODE_TYPES.Literal) {
          array = array.filter(
            (value) => value.location !== (args[0] as TSESTree.Literal).value,
          ); // Remove locations seen in nested `locally` call
        }
        locations.push(array);
      },
      // Check whether any location is used as an argument to a nested `multicast` expression
      [colocallyMulticastUseLocater]: function (node: TSESTree.CallExpression) {
        let array = locations.pop()!;
        const args = node.arguments;
        // Check whether any location is the sender
        if (args[0]?.type === AST_NODE_TYPES.Literal) {
          array = array.filter(
            (value) => value.location !== (args[0] as TSESTree.Literal).value,
          ); // Remove locations used as the sender
        }
        // Check whether any location is a receiver
        if (args[1]?.type == AST_NODE_TYPES.ArrayExpression) {
          args[1].elements.forEach((receiver) => {
            if (receiver?.type === AST_NODE_TYPES.Literal) {
              array = array.filter(
                (value) => value.location !== receiver.value,
              ); // Remove locations used as a receiver
            }
          });
        }
        locations.push(array);
      },
      // Check whether any `broadcast` is used inside the `colocally` call, which instantly designates the locations as being used
      [colocallyBroadcastUseLocater]: function () {
        locations.pop(); // Mark all locations as used in the last array
        locations.push([]); // This ensures that once the `colocally` node is exited, the list for the previous `colocally` node isnt popped
      },
      // Check for any use of `call`, which should also mark all the locations as being used
      [colocallyCallUseLocater]: function () {
        locations.pop(); // Mark all locations as used in the last array
        locations.push([]);
      },
      // Check whether any location is used as an argument to a nested `comm` expression
      [colocallyCommUseLocater]: function (node: TSESTree.CallExpression) {
        let array = locations.pop()!;
        const args = node.arguments;
        // Check whether any location is the sender
        if (args[0]?.type === AST_NODE_TYPES.Literal) {
          array = array.filter(
            (value) => value.location !== (args[0] as TSESTree.Literal).value,
          );
        }
        // Check whether any location is the receiver
        if (args[1]?.type === AST_NODE_TYPES.Literal) {
          array = array.filter(
            (value) => value.location !== (args[1] as TSESTree.Literal).value,
          );
        }
        locations.push(array);
      },
      // Check whether any location is used as a type argument in the inner choreography
      [colocallyTypeUseLocater]: function (node: TSESTree.TSLiteralType) {
        let array = locations.pop()!;
        if (node.literal.type === AST_NODE_TYPES.Literal) {
          array = array.filter(
            (value) =>
              value.location !== (node.literal as TSESTree.Literal).value,
          );
        }
        locations.push(array);
      },
      // Report errors for unused location arguments once any `colocally` node is exited in the AST traversal
      // and then remove the locations from the list
      [colocallyAtExit]: function () {
        const array = locations.pop()!;
        array.forEach((location) => context.report(location.report));
      },
    };
  },
};

export default noUnusedColocallyLocation;
