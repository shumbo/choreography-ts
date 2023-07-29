// no-outside-choreographic-operator rule
// Must not use operators defined externally inside a choregraphic operation
// https://github.com/shumbo/choreography-ts/issues/6

"use strict";
import { TSESTree, TSESLint, AST_NODE_TYPES } from "@typescript-eslint/utils";

type MessageIDs = "error" | "suggestion";

const operators = /^(locally|colocally|multicast|broadcast|comm|call|peel)$/;

const choreographySelector = `VariableDeclaration[kind = "const"] > VariableDeclarator[id.typeAnnotation.typeAnnotation.typeName.name = "Choreography"]`;
const arrowFunctionSelector = `${choreographySelector} > ArrowFunctionExpression`;
const operatorSelector = `${arrowFunctionSelector} CallExpression[callee.name = ${operators}]`;
const nestedOperatorSelector = `${operatorSelector} CallExpression[callee.name = ${operators}]`;

const noOutsideOperatorRule: TSESLint.RuleModule<MessageIDs, []> = {
  defaultOptions: [],
  meta: {
    type: "problem",
    docs: {
      description:
        "Choreographic operators must be defined in the enclosing context if nested",
      recommended: "recommended",
      url: "https://github.com/shumbo/choreography-ts/issues/6",
    },
    fixable: "code", // automatically fixable issue
    hasSuggestions: true, // provide suggestions for fixes
    messages: {
      error: "choreographic operator undefined in enclosing context",
      suggestion: "add missing operator to parameter list",
    },
    schema: [],
  },
  create(context) {
    return {
      [nestedOperatorSelector]: function (node: TSESTree.CallExpression) {
        const operator =
          node.callee.type === AST_NODE_TYPES.Identifier
            ? node.callee.name
            : "";
        let curr: TSESTree.Node = node;
        while (
          curr.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
          curr.parent
        ) {
          curr = curr.parent;
        }
        if (curr.type === AST_NODE_TYPES.ArrowFunctionExpression) {
          const params = curr.params;
          const param = params[0];
          if (param) {
            if (param.type === AST_NODE_TYPES.ObjectPattern) {
              let match = false;
              let propertyRange: [number, number];
              const properties = param.properties;
              properties.forEach((prop) => {
                if (prop.type === AST_NODE_TYPES.Property) {
                  propertyRange = prop.range;
                  if (prop.key.type === AST_NODE_TYPES.Identifier) {
                    if (prop.key.name === operator) {
                      match = true;
                    }
                  }
                }
              });
              if (!match) {
                const fix = (fixer: TSESLint.RuleFixer) => {
                  return fixer.insertTextAfterRange(
                    propertyRange,
                    `, ${operator}`
                  );
                };
                context.report({
                  node: node,
                  messageId: "error",
                  suggest: [
                    {
                      messageId: "suggestion",
                      fix: fix, // suggested fix
                    },
                  ],
                  fix: fix, // main fix (can be applied with --fix)
                });
              }
            } else {
              const fix = (fixer: TSESLint.RuleFixer) => {
                return fixer.insertTextBeforeRange(
                  param.range,
                  `{ ${operator} }, `
                );
              };
              context.report({
                node: node,
                messageId: "error",
                suggest: [
                  {
                    messageId: "suggestion",
                    fix: fix,
                  },
                ],
                fix: fix,
              });
            }
          } else {
            const fix = (fixer: TSESLint.RuleFixer) => {
              const sourceCode = context.getSourceCode().getText(curr);
              const paramAdded = sourceCode.replace("()", `({ ${operator} })`);
              return fixer.replaceText(curr, paramAdded);
            };
            context.report({
              node: node,
              messageId: "error",
              suggest: [
                {
                  messageId: "suggestion",
                  fix: fix,
                },
              ],
              fix: fix,
            });
          }
        }
      },
    };
  },
};

export default noOutsideOperatorRule;
