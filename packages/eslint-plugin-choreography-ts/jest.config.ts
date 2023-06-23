import { JestConfigWithTsJest } from "ts-jest";
import { JestConfigBase } from "../../jest.config.base";

const jestConfig: JestConfigWithTsJest = {
  ...JestConfigBase,
};

export default jestConfig;
