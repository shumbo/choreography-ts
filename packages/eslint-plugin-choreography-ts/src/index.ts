import { TSESLint } from "@typescript-eslint/utils";
import noRenameRule from "./no-renaming-operator";
// https://stackoverflow.com/a/63188062
const rules: TSESLint.Linter.Plugin = {
  // The correct type took a lot of work to figure out here...
  configs: {
    base: {
      rules: {
        "@choreography-ts/choreography-ts/no-renaming-operator": "error",
      },
    },
  },
  rules: {
    "no-renaming-operator": noRenameRule,
  },
};
export = rules;
