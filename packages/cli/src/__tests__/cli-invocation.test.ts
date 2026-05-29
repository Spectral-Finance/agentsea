import { describe, expect, it } from "bun:test";
import { AGENTSEA_CLI } from "../shared/cli-invocation.js";

describe("cli-invocation", () => {
  it("AGENTSEA_CLI matches npm exec binary name", () => {
    expect(AGENTSEA_CLI).toBe("agentsea");
  });
});
