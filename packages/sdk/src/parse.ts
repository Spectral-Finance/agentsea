import * as v from "valibot";

import { isPlainObject } from "./type-guards";

/** Parse JSON and validate against a valibot schema; returns null on failure. */
export function parseJsonWith<T extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(
  text: string,
  schema: T,
): v.InferOutput<T> | null {
  try {
    return v.parse(schema, JSON.parse(text));
  } catch {
    return null;
  }
}

/** Parse JSON and require a plain object root. */
export function parseJsonObj(text: string): Record<string, unknown> | null {
  try {
    const val: unknown = JSON.parse(text);
    if (isPlainObject(val)) {
      return val;
    }
    return null;
  } catch {
    return null;
  }
}
