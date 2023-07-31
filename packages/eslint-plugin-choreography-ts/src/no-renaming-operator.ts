// no-renaming-operator.js: must NOT rename choreographic operators
// https://github.com/shumbo/choreography-ts/issues/19

// Create custom typescript rules: https://typescript-eslint.io/developers/custom-rules/
// Better: https://medium.com/inato/using-typescript-to-build-custom-eslint-rules-faster-53ad1c9dee2b
"use strict";
import { AST_NODE_TYPES, TSESTree, TSESLint } from "@typescript-eslint/utils";

type MessageIDs = "rename" | "invalid";

const operators = /^(colocally|call)$/; // operators that accept choreography arguments
const choreographySelector = `VariableDeclaration[kind = "const"] > VariableDeclarator[id.typeAnnotation.typeAnnotation.typeName.name = "Choreography"]`;
const operatorSelector = `${choreographySelector} CallExpression[callee.name = ${operators}]`;
// Match top-level explicit choreography, or any operator method call that accepts a choreography argument
const arrowFunctionSelector = `:matches(${choreographySelector} > ArrowFunctionExpression, ${operatorSelector} > ArrowFunctionExpression)`;

const noRenameRule: TSESLint.RuleModule<MessageIDs, []> = {
  defaultOptions: [],
  meta: {
    type: "problem",
    docs: {
      description:
        "First parameter of Choreographic function type must be of object type",
      recommended: "recommended",
      url: "https://github.com/shumbo/choreography-ts/issues/19",
    },
    fixable: undefined, // Not an automatically fixable problem
    messages: {
      rename: "Choreographic operators cannot be renamed.",
      invalid: "Choreographic operators must be destructured.",
    },
    schema: [],
  },
  create(context) {
    return {
      [arrowFunctionSelector]: function (
        node: TSESTree.ArrowFunctionExpression
      ) {
        if (node.params[0]) {
          if (node.params[0].type === AST_NODE_TYPES.ObjectPattern) {
            node.params[0].properties.forEach((property) => {
              // Check for shorthand json format: {locally, colocally, ...}, and no rest element `...rest`
              if (
                property.type === AST_NODE_TYPES.Property
                  ? property.shorthand !== true
                  : true // should always be true if type is "RestElement"
              ) {
                context.report({
                  node: property,
                  messageId: "rename",
                });
              }
            });
          } else {
            context.report({
              node: node.params[0],
              messageId: "invalid",
            });
          }
        }
      },
    };
  },
};

export default noRenameRule;
