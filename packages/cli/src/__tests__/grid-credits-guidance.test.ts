import { describe, expect, it, mock } from "bun:test";
import { ensureGridModelHasCredits } from "../shared/grid-credits-guidance.js";

describe("grid-credits-guidance", () => {
  it("returns true immediately when the model is already funded", async () => {
    const openBrowser = mock(() => {});
    const prompt = mock(async () => "");
    const ok = await ensureGridModelHasCredits("secret", "agent-standard", {
      logInfo: () => {},
      logStep: () => {},
      logWarn: () => {},
      openBrowser,
      prompt,
      fetchFunded: async () => ({ ids: ["agent-standard"], status: 200 }),
    });
    expect(ok).toBe(true);
    expect(openBrowser).not.toHaveBeenCalled();
    expect(prompt).not.toHaveBeenCalled();
  });

  it("opens The Grid and rechecks after the user confirms credits", async () => {
    const openBrowser = mock(() => {});
    const prompt = mock(async () => "");
    let checks = 0;
    const ok = await ensureGridModelHasCredits("secret", "agent-max", {
      logInfo: () => {},
      logStep: () => {},
      logWarn: () => {},
      openBrowser,
      prompt,
      fetchFunded: async () => {
        checks += 1;
        return checks >= 2
          ? { ids: ["agent-max"], status: 200 }
          : { ids: [], status: 200 };
      },
    });
    expect(ok).toBe(true);
    expect(openBrowser).toHaveBeenCalledTimes(1);
    expect(prompt).toHaveBeenCalledTimes(1);
  });
});
