// no-unused-colocated-location rule
// Messages sent should be unwrapped by all recipients
// https://github.com/shumbo/choreography-ts/issues/8

"use strict";
import { TSESTree, TSESLint, AST_NODE_TYPES } from "@typescript-eslint/utils";

type MessageIDs = "error";

// A message is received depending on its type if any of the following are true:
// For a `Colocated` ('multicast') message, if:
// * the message is passed to `unwrap` in `locally` or `peel` in any following choreography
// For a `Located` ('comm') message, if:
// * the message is passed in the arguments parameter for `colocally` or `call`
// * the message is passed to `unwrap` in `locally` in any following choreography
// For either message type ('multicast' or 'comm'):
// * the message is returned by the choreography

// Regex for matching messaging operators
// 'comm' for `Located` messages
// 'multicast' for `Colocated` messages
const messageOperators = /^(comm|multicast)$/;
type messageTypes = "Located" | "Colocated";

// Selector for top-level choreography
const choreographySelector = `VariableDeclaration[kind = "const"] > VariableDeclarator[id.typeAnnotation.typeAnnotation.typeName.name = "Choreography"]`;
// Selector for all operators calls that send messages and have their output saved in variables
const messageSelector = `${choreographySelector} VariableDeclarator > AwaitExpression > CallExpression[callee.name = ${messageOperators}]`;
// Selector for any `locally` operator
const locallySelector = `${choreographySelector} CallExpression[callee.name = "locally"]`;
// Selector for any `colocally` operator usage
const colocallySelector = `${choreographySelector} CallExpression[callee.name = "colocally"]`;
// Selector for any `call` operator usage
const callSelector = `${choreographySelector} CallExpression[callee.name = "call"]`;
// Selector for choreography return statements
const returnSelector = `${choreographySelector} ArrowFunctionExpression > BlockStatement > ReturnStatement[argument.type = "ArrayExpression"]`;
// Selector for when AST traversal finishes for the choreography function body
const choreographyExitSelector = `${choreographySelector} > ArrowFunctionExpression:exit`;

const noUnusedColocatedLocation: TSESLint.RuleModule<MessageIDs, []> = {
  defaultOptions: [],
  meta: {
    type: "problem",
    docs: {
      description: "Messages must be unwrapped by all recipients",
      recommended: "recommended",
      url: "https://github.com/shumbo/choreography-ts/issues/8",
    },
    fixable: undefined, // not automatically fixable
    hasSuggestions: false, // don't provide suggestions for fixes
    messages: {
      error: "Message `{{ message }}` not unwrapped by `{{ recipient }}`.",
    },
    schema: [],
  },
  create(context) {
    // `recipientsList[i].recipient` is the recipient
    // `recipientsList[i].message` is the message variable name
    // `recipientsList[i].report` is the error to report
    // `recipientsList[i].type` is the type of the message ("Located" or "Colocated")
    let recipientsList: {
      recipient: string;
      message: string;
      report: TSESLint.ReportDescriptor<MessageIDs>;
      type: messageTypes;
    }[] = [];
    return {
      // First match the messages being sent to obtain recipients and message variable names
      [messageSelector]: function (node: TSESTree.CallExpression) {
        let curr: TSESTree.Node | undefined = node;
        // Find the VariableDeclarator ancestor for the CallExpression node
        // to obtain the message variable name
        while (curr && curr.type !== AST_NODE_TYPES.VariableDeclarator) {
          curr = curr.parent;
        }
        const variableIdentifier = curr.id as TSESTree.Identifier;
        const msgName = variableIdentifier.name; // variable name for the message being sent
        const recipients = node.arguments[1];
        if (recipients) {
          // if the recipients are given in an array (which denotes a `multicast` call)
          if (recipients.type === AST_NODE_TYPES.ArrayExpression) {
            // add each recipient to `recipientsList`, along with the message name
            // and the error to report if the recipient doesn't unwrap the message
            recipients.elements.forEach((element) => {
              if (element?.type === AST_NODE_TYPES.Literal) {
                const recipient = element.value as string;
                recipientsList.push({
                  recipient,
                  message: msgName,
                  report: {
                    node: element,
                    messageId: "error",
                    data: {
                      message: msgName,
                      recipient,
                    },
                  },
                  type: "Colocated",
                });
              }
            });
            // otherwise if the message is sent using a `comm` call
          } else if (recipients.type === AST_NODE_TYPES.Literal) {
            // add the recipient along with the message name and the error to report
            // to `recipientsList`
            const recipient = recipients.value as string;
            recipientsList.push({
              recipient,
              message: msgName,
              report: {
                node: recipients,
                messageId: "error",
                data: {
                  message: msgName,
                  recipient,
                },
              },
              type: "Located",
            });
          }
        }
      },
      // Matches `locally` usages and filters out recipients from `recipientsList` as necessary
      [locallySelector]: function (node: TSESTree.CallExpression) {
        const location = node.arguments[0];
        if (location && location.type === AST_NODE_TYPES.Literal) {
          // filter out the recipients from the `recipientsList` that have unwrapped their message using `unwrap`
          // which works regardless of the message type
          recipientsList = recipientsList.filter((recipient) => {
            // if the `locally` location matches the recipient
            if (location.value === recipient.recipient) {
              const arrowFunction = node.arguments[1];
              // and if the message appears as an argument to `unwrap` in the callback parameter
              if (
                arrowFunction &&
                arrowFunction.type === AST_NODE_TYPES.ArrowFunctionExpression
              ) {
                const arrowFunctonSource = context
                  .getSourceCode()
                  .getText(arrowFunction);
                if (
                  arrowFunctonSource.includes(`unwrap(${recipient.message})`)
                ) {
                  return false; // filter the recipient out of `recipientsList`
                }
              }
            }
            return true; // otherwise keep the recipient in `recipientsList`
          });
        }
      },
      // Matches `colocally` usages and filters out recipients from `recipientsList` as necessary
      [colocallySelector]: function (node: TSESTree.CallExpression) {
        const args = node.arguments; // CallExpression arguments
        recipientsList = recipientsList.filter((recipient) => {
          if (args[0]?.type === AST_NODE_TYPES.ArrayExpression) {
            // If the recipient appears in the list of `colocally` locations
            if (
              args[0].elements.find(
                (arg) =>
                  arg?.type === AST_NODE_TYPES.Literal &&
                  arg.value === recipient.recipient
              )
            ) {
              // if the message appears as an argument to `peel` in the choreography parameter
              if (
                recipient.type === "Colocated" &&
                args[1]?.type === AST_NODE_TYPES.ArrowFunctionExpression
              ) {
                if (
                  context
                    .getSourceCode()
                    .getText(args[1])
                    .includes(`peel(${recipient.message})`)
                ) {
                  return false; // filter the recipient out of `recipientsList`
                }
                // otherwise if the `Located` message is passed as an argument to the choreography
              } else if (
                recipient.type === "Located" &&
                args[2]?.type === AST_NODE_TYPES.ArrayExpression
              ) {
                if (
                  args[2].elements.find(
                    (element) =>
                      element?.type === AST_NODE_TYPES.Identifier &&
                      element.name === recipient.message
                  )
                ) {
                  return false; // filter the recipient out of `recipientsList`
                }
              }
            }
          }
          return true; // otherwise keep the recipient in `recipientsList`
        });
      },
      // Matches `call` operator usages and filters out recipients from `recipientsList` as necessary
      [callSelector]: function (node: TSESTree.CallExpression) {
        const args = node.arguments;
        recipientsList = recipientsList.filter((recipient) => {
          // If the `Colocated` message appears as an argument to `peel` in the choreography parameter
          if (
            recipient.type === "Colocated" &&
            args[0]?.type === AST_NODE_TYPES.ArrowFunctionExpression
          ) {
            // if the message appears inside the `call` arguments parameter
            if (
              context
                .getSourceCode()
                .getText(args[0])
                .includes(`peel(${recipient.message})`)
            ) {
              return false; // filter the recipient out of `recipientsList
            }
            // otherwise if the `Located` message is passed as an argument to the choreography
          } else if (
            recipient.type === "Located" &&
            args[1]?.type === AST_NODE_TYPES.ArrayExpression
          ) {
            if (
              args[1].elements.find(
                (element) =>
                  element?.type === AST_NODE_TYPES.Identifier &&
                  element.name === recipient.message
              )
            ) {
              return false; // filter the recipient out of `recipientsList`
            }
          }
          return true; // otherwise keep the recipient in `recipientsList`
        });
      },
      // Matches choreography return statements to check if 'Located' messages are returned
      [returnSelector]: function (node: TSESTree.ReturnStatement) {
        const returned = node.argument as TSESTree.ArrayExpression;
        recipientsList = recipientsList.filter((recipient) => {
          // filter out recipients whose messages are returned if the message is of type "Located"
          return !returned.elements.find(
            (element) =>
              recipient.type === "Located" &&
              element?.type === AST_NODE_TYPES.Identifier &&
              element.name === recipient.message
          );
        });
      },
      // Upon exiting the choreography, report errors for messages not received
      // by the recipients remaining in `recipientsList`
      [choreographyExitSelector]: function () {
        recipientsList.forEach((recipient) => {
          context.report(recipient.report);
        });
      },
    };
  },
};

export default noUnusedColocatedLocation;
