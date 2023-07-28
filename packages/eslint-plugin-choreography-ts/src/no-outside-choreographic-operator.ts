// no-outside-choreographic-operator rule
// Must not use operators defined externally inside a choregraphic operation
// https://github.com/shumbo/choreography-ts/issues/6

"use strict";
import { TSESTree, TSESLint } from "@typescript-eslint/utils";

type MessageIDs = "error";

const operators = /^(locally|colocally|multicast|broadcast|comm|call|peel)$/;
const selector = `VariableDeclaration[kind = "const"] > VariableDeclarator[id.typeAnnotation.typeAnnotation.typeName.name = "Choreography"] > ArrowFunctionExpression CallExpression[callee.name = ${operators}] CallExpression[callee.name = ${operators}]`;

const noOutsideOperatorRule: TSESLint.RuleModule<MessageIDs, []> = {
  defaultOptions: [],
  meta: {
    type: "problem",
    docs: {
      description: "Choreographic operators cannot be nested",
      recommended: "recommended",
      url: "https://github.com/shumbo/choreography-ts/issues/6",
    },
    fixable: undefined, // Not an automatically fixable problem
    messages: {
      error: "choreographic operators cannot be nested",
    },
    schema: [],
  },
  create(context) {
    return {
      [selector]: function (node: TSESTree.CallExpression) {
        context.report({
          node: node,
          messageId: "error",
        });
      },
    };
  },
};

export default noOutsideOperatorRule;
