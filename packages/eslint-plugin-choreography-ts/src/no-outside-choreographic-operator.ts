// no-outside-choreographic-operator rule
// Must not use operators defined externally inside a choregraphy
// https://github.com/shumbo/choreography-ts/issues/6

"use strict";
import {
  TSESTree,
  TSESLint,
  AST_NODE_TYPES,
  ESLintUtils,
} from "@typescript-eslint/utils";
import ts from "typescript";

type MessageIDs = "error" | "suggestion";

const operators = /^(locally|colocally|multicast|broadcast|comm|call|naked)$/;

const choreographySelector = `VariableDeclaration[kind = "const"] > VariableDeclarator`;
const functionSelector = `${choreographySelector} > :matches(ArrowFunctionExpression, FunctionExpression)`;
const operatorSelector = `${functionSelector} CallExpression[callee.name = ${operators}]`;
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
      error:
        "Choreographic operator '{{ operator }}' must be provided by closest enclosing context.",
      suggestion: "Add missing operator `{{ operator }}` to dependencies",
    },
    schema: [],
  },
  create(context) {
    const services = ESLintUtils.getParserServices(context);
    return {
      [nestedOperatorSelector]: function (node: TSESTree.CallExpression) {
        const variableDeclaratorAncestor: TSESTree.Node = context
          .getAncestors()
          .find(
            (ancestor) => ancestor.type === AST_NODE_TYPES.VariableDeclarator,
          ) as TSESTree.VariableDeclarator;

        const resolvedTypeAlias = services.getTypeAtLocation(
          variableDeclaratorAncestor.id,
        ).aliasSymbol;
        const resolvedTypeAliasName = (
          (resolvedTypeAlias?.declarations?.[0] as ts.TypeAliasDeclaration)
            ?.type as ts.TypeReferenceNode
        )?.typeName as ts.Identifier;

        // Ensure that the topmost variable declaration is a choreography type
        if (
          resolvedTypeAlias?.getName() === "Choreography" ||
          resolvedTypeAliasName?.text === "Choreography"
        ) {
          // Get the name of the nested operator
          const operator = (node.callee as TSESTree.Identifier).name;
          let curr: TSESTree.Node = node;
          // Iterate up through the AST until the ancestor ArrowFunctionExpression node
          // containing the choreography's parameters is found, which is stored in `curr`
          while (
            curr.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
            curr.type !== AST_NODE_TYPES.FunctionExpression &&
            curr.parent
          ) {
            curr = curr.parent;
          }
          const params = (
            curr as
              | TSESTree.ArrowFunctionExpression
              | TSESTree.FunctionExpression
          ).params;
          const param = params[0];
          // if the parameter list isn't empty
          if (param) {
            // if first parameter is a dependencies object
            if (param.type === AST_NODE_TYPES.ObjectPattern) {
              const properties = param.properties; // `properties` is an array containing the keys in the dependecies object
              // if the dependencies object isn't empty
              if (properties.length > 0) {
                let match = false;
                // `propertyRange` tracks the location range of the last encountered
                // operator in the dependencies parameter `{locally, colocally, ...}` so we
                // know where to place the missing operator
                let propertyRange: [number, number];
                // find the matching operator in the dependencies parameter if it exists
                properties.forEach((prop) => {
                  if (prop.type === AST_NODE_TYPES.Property) {
                    // Store the range of the current operator
                    propertyRange = prop.range;
                    if (
                      prop.key.type === AST_NODE_TYPES.Identifier &&
                      prop.key.name === operator
                    ) {
                      match = true;
                    }
                  }
                });
                // if operator not in the dependencies parameter
                if (!match) {
                  // fix to insert missing operator into the dependencies parameter
                  const fix = (fixer: TSESLint.RuleFixer) => {
                    // Insert the missing operator after the last present operator
                    return fixer.insertTextAfterRange(
                      propertyRange,
                      `, ${operator}`,
                    );
                  };
                  // report error and fixes
                  context.report({
                    node: node.callee,
                    messageId: "error",
                    data: {
                      operator,
                    },
                    suggest: [
                      {
                        // suggestion message
                        messageId: "suggestion",
                        data: {
                          operator,
                        },
                        fix, // suggested fix (appears in list of suggestions)
                      },
                    ],
                    fix, // autofix (can be applied with `--fix`)
                  });
                }
                // otherwise if the dependencies parameter object is empty
              } else {
                // fix to replace the empty object with one containing the missing operator
                const fix = (fixture: TSESLint.RuleFixer) => {
                  return fixture.replaceTextRange(
                    param.range,
                    `{ ${operator} }`,
                  );
                };
                // report error and fixes
                context.report({
                  node: node.callee,
                  messageId: "error",
                  data: {
                    operator,
                  },
                  suggest: [
                    {
                      messageId: "suggestion",
                      data: {
                        operator,
                      },
                      fix,
                    },
                  ],
                  fix,
                });
              }
              // otherwise if the dependencies object isn't present in the parameters
              // but there are other parameter(s) present, we should not apply fixes
              // or suggest any in this case, since the operator and parameter use is ambiguous
            } else {
              // report error only
              context.report({
                node: node.callee,
                messageId: "error",
                data: {
                  operator,
                },
              });
            }
            // otherwise if the parameter list is empty
          } else {
            // fix to add dependencies object to empty parameter list
            const fix = (fixer: TSESLint.RuleFixer) => {
              // This replaces the empty parameters token `()` in the source code
              // with one containing the dependencies object and the missing operator
              const sourceCode = context.getSourceCode().getText(curr);
              const paramAdded = sourceCode.replace("()", `({ ${operator} })`);
              return fixer.replaceText(curr, paramAdded);
            };
            // report error with fixes
            context.report({
              node: node.callee,
              messageId: "error",
              data: {
                operator,
              },
              suggest: [
                {
                  messageId: "suggestion",
                  data: {
                    operator,
                  },
                  fix,
                },
              ],
              fix,
            });
          }
        }
      },
    };
  },
};

export default noOutsideOperatorRule;
