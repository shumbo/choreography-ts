// no-renaming-operator.js: must NOT rename choreographic operators
// https://github.com/shumbo/choreography-ts/issues/19

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "First parameter of Choreographic function type must be of object type",
      url: "https://github.com/shumbo/choreography-ts/issues/19"
    },
    fixable: false, // Not an automatically fixable problem
    schema: []
  },
  create(context) {
    return {
      'VariableDeclaration[kind = "const"] > VariableDeclarator[id.typeAnnotation.typeAnnotation.typeName.name = "Choreography"] > ArrowFunctionExpression': function (
        node
      ) {
        if (node.params.length > 0) {
          if (node.params[0].type === "ObjectPattern") {
            node.params[0].properties.forEach(property => {
              // Check for shorthand json format: {locally, colocally, ...}
              if (property.shorthand !== true) {
                context.report({
                  node: property,
                  message: "invalid operator rename: choreographic operators must not be renamed"
                })
              }
            });
          } else {
            context.report({
              node: node.params[0],
              message: "invalid parameter type: must be in destructered form {locally, colocally, ...}",
              /* fix(fixer) {
                return fixer.replaceText(node, "node");
              }*/
            });
          }
        }
      }
    };
  }
};
