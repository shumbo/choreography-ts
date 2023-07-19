module.exports = {
  configs: {
    base: {
      rules: {
        "choreography-lint/no-renaming-operator": "error"
      }
    }
  },
  rules: require("./rules/rules")
};
