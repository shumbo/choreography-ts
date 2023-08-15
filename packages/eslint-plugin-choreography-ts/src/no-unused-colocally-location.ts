// no-unused-colocally-location rule
// All locations specified for a `colocally` call must be used inside the body
// https://github.com/shumbo/choreography-ts/issues/7

"use strict";
import { AST_NODE_TYPES, TSESLint, TSESTree } from "@typescript-eslint/utils";

type MessageIDs = "warning";

const choreographySelector = `VariableDeclaration[kind = "const"] > VariableDeclarator[id.typeAnnotation.typeAnnotation.typeName.name = "Choreography"]`;
const colocallySelector = `${choreographySelector} CallExpression[callee.name = "colocally"]`;

// Implementation: Check whether each location passed to `colocally` is present inside the body of the choreography argument
// as an argument to any operator that accepts location parameters (locally, colocally, comm, multicast, broadcast)
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
      warning: "Location `{{ location }}` not used inside body.",
    },
    schema: [],
  },
  create(context) {
    // Store locations for each `colocally` usage
    const Locations: {
      location: string; // name of the location
      ancestor: TSESTree.CallExpression; // the `colocally` ancestor node
      report: TSESLint.ReportDescriptor<MessageIDs>; // the error to report
    }[] = [];
    return {
      [colocallySelector]: function (node: TSESTree.CallExpression) {
        const args = node.arguments;
        if (args[0]?.type === AST_NODE_TYPES.ArrayExpression) {
          if (args[1]?.type === AST_NODE_TYPES.ArrowFunctionExpression) {
            args[0].elements.forEach((arg) => {
              if (arg?.type === AST_NODE_TYPES.Literal) {
                Locations.push({
                  location: arg.value as string,
                  ancestor: node,
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
      },
    };
  },
};

export default noUnusedColocallyLocation;
