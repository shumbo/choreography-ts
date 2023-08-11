// no-unused-colocally-location rule
// All locations specified for a `colocally` call must be used inside the body
// https://github.com/shumbo/choreography-ts/issues/7

"use strict";
import { AST_NODE_TYPES, TSESLint, TSESTree } from "@typescript-eslint/utils";

type MessageIDs = "error";

const choreographySelector = `VariableDeclaration[kind = "const"] > VariableDeclarator[id.typeAnnotation.typeAnnotation.typeName.name = "Choreography"]`;
const colocallySelector = `${choreographySelector} CallExpression[callee.name = "colocally"]`;

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
      error: "Location `{{ location }}` not used inside body.",
    },
    schema: [],
  },
  create(context) {
    return {
      [colocallySelector]: function (node: TSESTree.CallExpression) {
        const args = node.arguments;
        if (args[0]?.type === AST_NODE_TYPES.ArrayExpression) {
          if (args[1]?.type === AST_NODE_TYPES.ArrowFunctionExpression) {
            const choreographyBodySource = context
              .getSourceCode()
              .getText(args[1]);
            args[0].elements.forEach((arg) => {
              if (arg?.type === AST_NODE_TYPES.Literal) {
                if (!choreographyBodySource.match(`('|")${arg.value}('|")`)) {
                  // Return error if the location isn't found anywhere inside double quotes ("") in
                  // the body of the `colocally` choreography argument
                  context.report({
                    node: arg,
                    messageId: "error",
                    data: {
                      location: arg.value,
                    },
                  });
                }
              }
            });
          }
        }
      },
    };
  },
};

export default noUnusedColocallyLocation;
