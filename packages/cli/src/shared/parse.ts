import * as v from "valibot";
import { parseJsonObj, parseJsonWith } from "@agentsea/sdk";

export { parseJsonObj, parseJsonWith };

/** Schema for responses containing a `version` field (npm registry, GitHub releases). */
export const PkgVersionSchema = v.object({
  version: v.string(),
});
