// Prompt the user to add Grid consumption credits before provisioning with an unfunded model.

import { fetchFundedGridModelIds } from "./grid-models.js";
import { resolveGridWebAppOrigin } from "./grid-api.js";
import { asyncTryCatch, unwrapOr } from "./result.js";
import { logAlwaysInfo, logAlwaysStep, logInfo, logWarn, openBrowser, prompt } from "./ui.js";

export interface GridCreditsGuidanceDeps {
  logInfo: typeof logAlwaysInfo;
  logStep: typeof logAlwaysStep;
  logWarn: typeof logWarn;
  openBrowser: typeof openBrowser;
  prompt: typeof prompt;
  fetchFunded: typeof fetchFundedGridModelIds;
}

const defaultDeps: GridCreditsGuidanceDeps = {
  logInfo: logAlwaysInfo,
  logStep: logAlwaysStep,
  logWarn,
  openBrowser,
  prompt,
  fetchFunded: fetchFundedGridModelIds,
};

/**
 * When the chosen model is not in `GET /v1/models`, open The Grid app and wait
 * until credits appear (or the user cancels).
 */
export async function ensureGridModelHasCredits(
  apiKey: string,
  modelId: string,
  deps: GridCreditsGuidanceDeps = defaultDeps,
): Promise<boolean> {
  const funded = await deps.fetchFunded(apiKey);
  if (funded.ids.includes(modelId)) {
    return true;
  }

  const creditsUrl = resolveGridWebAppOrigin();
  process.stderr.write("\n");
  deps.logWarn(`"${modelId}" has no consumption balance on The Grid yet.`);
  deps.logStep("Add credits in The Grid, then return here to continue.");
  deps.logStep(`Opening ${creditsUrl} …`);
  deps.openBrowser(creditsUrl);

  for (;;) {
    process.stderr.write("\n");
    const shouldRetry = unwrapOr(
      await asyncTryCatch(async () => {
        await deps.prompt("Press Enter after adding credits to continue (or Ctrl+C to exit)");
        return true;
      }),
      false,
    );
    if (!shouldRetry) {
      return false;
    }

    const recheck = await deps.fetchFunded(apiKey);
    if (recheck.ids.includes(modelId)) {
      deps.logInfo(`Credits confirmed for ${modelId}.`);
      return true;
    }

    deps.logWarn(`Still no balance for "${modelId}". Add credits in The Grid and press Enter again, or Ctrl+C to exit.`);
  }
}
