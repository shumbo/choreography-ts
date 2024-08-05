import { TSESLint } from "@typescript-eslint/utils";
import noRenameRule from "./no-renaming-operator";
import noOutsideOperatorRule from "./no-outside-choreographic-operator";
import noUnusedEnclaveLocation from "./no-unused-enclave-location";

// https://stackoverflow.com/a/63188062
const rules: TSESLint.Linter.Plugin = {
  // The correct type took a lot of work to figure out here...
  configs: {
    base: {
      rules: {
        "@choreography-ts/choreography-ts/no-renaming-operator": "error",
        "@choreography-ts/choreography-ts/no-outside-choreographic-operator":
          "error",
        "@choreography-ts/choreography-ts/no-unused-enclave-location": "warn",
      },
    },
  },
  rules: {
    "no-renaming-operator": noRenameRule,
    "no-outside-choreographic-operator": noOutsideOperatorRule,
    "no-unused-enclave-location": noUnusedEnclaveLocation,
  },
};
export = rules;
