// no-unused-colocated-location rule
// Messages sent should be unwrapped by all recipients
// https://github.com/shumbo/choreography-ts/issues/8

"use strict";
import { TSESTree, TSESLint, AST_NODE_TYPES } from "@typescript-eslint/utils";

type MessageIDs = "error";

// A message is `unwrapped` by the recipient(s) if any of the following are true:
// * Any following `locally` calls explicitly invoke `unwrap` with the message as an argument for the recipient(s)
// * Any following `colocally` calls either explicitly invokes `peel` with the message or has the message as
// an argument for the recipient(s)
// * Any following `call` calls either explicitely invokes `peel` with the message or has the message as
// an argument for the recipient(s)

// Regex for matching messaging operators
const messageOperators = /^(comm|multicast)$/;

// Selector for top-level choreography
const choreographySelector = `VariableDeclaration[kind = "const"] > VariableDeclarator[id.typeAnnotation.typeAnnotation.typeName.name = "Choreography"]`;
// Selector for all operators calls that send messages and have their output saved in variables
const messageSelector = `${choreographySelector} VariableDeclarator > AwaitExpression > CallExpression[callee.name = ${messageOperators}]`;
// Selector for all `locally` operator calls
const locallySelector = `${choreographySelector} CallExpression[callee.name = "locally"]`;
// Selector for all `colocally` operator calls
const colocallySelector = `${choreographySelector} CallExpression[callee.name = "colocally"]`;
// Selector for all `call` operator calls
const callSelector = `${choreographySelector} CallExpression[callee.name = "call"]`;
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
    // recipientsList[0] is the recipient
    // recipientsList[1] is the message name
    // recipientsList[2] is the error to report
    let recipientsList: [
      string,
      string,
      TSESLint.ReportDescriptor<MessageIDs>
    ][] = [];
    return {
      // First match the messages being sent to obtain recipient(s) and message variable names
      [messageSelector]: function (node: TSESTree.CallExpression) {
        let curr: TSESTree.Node | undefined = node;
        // Find the VariableDeclarator ancestor for the CallExpression node
        // to obtain the message name for locating later
        while (curr && curr.type !== AST_NODE_TYPES.VariableDeclarator) {
          curr = curr.parent;
        }
        const variableIdentifier = curr.id as TSESTree.Identifier;
        const msgName = variableIdentifier.name; // variable name for the message being sent
        const recipients = node.arguments[1];
        if (recipients) {
          // if the recipients are given in an array (which denotes a `multicast` call)
          if (recipients.type === AST_NODE_TYPES.ArrayExpression) {
            // for `multicast` calls
            // Add each recipient to `recipientsList`, along with the message name
            // and the error to report if the recipient doesn't unwrap the message
            recipients.elements.forEach((element) => {
              if (element?.type === AST_NODE_TYPES.Literal) {
                const recipient = element.value as string;
                recipientsList.push([
                  recipient,
                  msgName,
                  {
                    node: element,
                    messageId: "error",
                    data: {
                      message: msgName,
                      recipient,
                    },
                  },
                ]);
              }
            });
            // otherwise if the message is sent using a `comm` call
          } else if (recipients.type === AST_NODE_TYPES.Literal) {
            // for `comm` calls
            // add the recipient along with the message name and the error to report
            // to `recipientsList`]
            const recipient = recipients.value as string;
            recipientsList.push([
              recipient,
              msgName,
              {
                node: recipients,
                messageId: "error",
                data: {
                  message: msgName,
                  recipient,
                },
              },
            ]);
          }
        }
      },
      // Match all `locally` calls and remove from `recipientsList` those recipients that have
      // unwrapped the message
      [locallySelector]: function (node: TSESTree.CallExpression) {
        const location = node.arguments[0];
        if (location && location.type === AST_NODE_TYPES.Literal) {
          // filter out the recipient from the `recipientsList` who has unwrapped the message
          recipientsList = recipientsList.filter((recipient) => {
            // if the `locally` location matches the recipient and the message name appears
            // as an argument to the `unwrap` operator
            if (location.value === recipient[0]) {
              const arrowFunction = node.arguments[1];
              if (
                arrowFunction &&
                arrowFunction.type === AST_NODE_TYPES.ArrowFunctionExpression
              ) {
                const arrowFunctonSource = context
                  .getSourceCode()
                  .getText(arrowFunction);
                if (arrowFunctonSource.includes(`unwrap(${recipient[1]})`)) {
                  return false;
                }
              }
            }
            return true;
          });
        }
      },
      // For matching all `colocally` and `call` operator calls and then filitering out recipients
      // that unwrap their messages
      [colocallySelector]: function (node: TSESTree.CallExpression) {
        const args = node.arguments;
        recipientsList = recipientsList.filter((recipient) => {
          if (args[0]?.type === AST_NODE_TYPES.ArrayExpression) {
            // if the recipient appears in the list of `colocally` locations
            if (
              args[0].elements.find(
                (arg) =>
                  arg?.type === AST_NODE_TYPES.Literal &&
                  arg.value === recipient[0]
              )
            ) {
              // if the message appears in the `colocally` arguments parameter
              if (args[2]?.type === AST_NODE_TYPES.ArrayExpression) {
                if (
                  args[2].elements.find(
                    (arg) =>
                      arg?.type === AST_NODE_TYPES.Identifier &&
                      arg.name === recipient[1]
                  )
                ) {
                  return false; // filter the recipient out of `recipientsList`
                } else {
                  // otherwise if the message is `peeled` inside the chireography argument
                  if (
                    args[1]?.type === AST_NODE_TYPES.ArrowFunctionExpression
                  ) {
                    const colocallySource = context
                      .getSourceCode()
                      .getText(args[1]);
                    if (colocallySource.includes(`peel(${recipient[1]})`)) {
                      return false; // filter the recipient out of `recipientsList`
                    }
                  }
                }
              }
            }
          }
          return true; // otherwise keep the recipient inside `recipientsList`
        });
      },
      [callSelector]: function (node: TSESTree.CallExpression) {
        const args = node.arguments;
        recipientsList = recipientsList.filter((recipient) => {
          if (args[1]?.type === AST_NODE_TYPES.ArrayExpression) {
            // if the message name appears inside the `call` argument list
            if (
              args[1].elements.find(
                (arg) =>
                  arg?.type === AST_NODE_TYPES.Identifier &&
                  arg.name === recipient[1]
              )
            ) {
              return false; // filter the recipient out of `recipientsList
            } else {
              // otherwise if the message name is `peeled` inside the choreography argument
              if (args[0]?.type === AST_NODE_TYPES.ArrowFunctionExpression) {
                const callSource = context.getSourceCode().getText(args[0]);
                if (callSource.includes(`peel(${recipient[1]})`)) {
                  return false; // filter the recipient out of `recipientsList`
                }
              }
            }
          }
          return true; // otherwise keep the recipient inside `recipientsList`
        });
      },
      // Upon exiting ArrowFunctionExpression, report errors for messages not received
      // by the recipients remaining in `recipientsList`
      [choreographyExitSelector]: function () {
        recipientsList.forEach((recipient) => {
          context.report(recipient[2]);
        });
      },
    };
  },
};

export default noUnusedColocatedLocation;
