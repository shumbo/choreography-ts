const {RuleTester} = require("eslint");
const noRenameRule = require("../rules/no-renaming-operator");

const ruleTester = new RuleTester({
    parserOptions: { ecmaVersion: 2015 }
})

ruleTester.run(
    "no-renaming-operator",
    noRenameRule,
    {// checks
        valid: [{
            code: `const test: Choreography<Locations> = async ({
                locally,
              }) => {
                await locally("alice", () => {
                  console.log("Hi from Alice");
                });
                return [];
              };`
        }],
        invalid: [{
            code: `const test2: Choreography<Locations> = async (operators) => {
                await operators.locally("alice", () => {
                  console.log("Hi from Alice");
                });
                return [];
              };`
        }],
    }
);

console.log("All eslint tests passed! :)")
