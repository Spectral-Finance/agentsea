// Fetch model ids from The Grid consumption API and the public Cortex instrument catalogue.

import {
  gridInferenceModelsUrl,
  resolveCortexExchangeApiOrigin,
} from "./grid-api.js";
import { asyncTryCatchIf, isNetworkError } from "./result.js";

export type GridModelCatalogEntry = {
  id: string;
  displayName?: string;
  /** Model appears in authenticated `GET /v1/models` (user has credits or auto top-up). */
  funded: boolean;
};

export type GridModelCatalogResult = {
  entries: GridModelCatalogEntry[];
  /** Consumption API rejected the API key. */
  authFailed: boolean;
  /** Public instrument catalogue could not be loaded. */
  publicCatalogFailed: boolean;
};

export type FundedModelsFetchResult = {
  ids: string[];
  status: number | null;
};

/** Parse `{ data: [ { id: string }, … ] }` (OpenAI-style) or return []. */
export function parseGridModelsResponse(body: unknown): string[] {
  if (!body || typeof body !== "object") {
    return [];
  }
  const data = (body as { data?: unknown }).data;
  if (!Array.isArray(data)) {
    return [];
  }
  const ids: string[] = [];
  for (const row of data) {
    if (row && typeof row === "object" && typeof (row as { id?: unknown }).id === "string") {
      const id = (row as { id: string }).id.trim();
      if (id.length > 0) {
        ids.push(id);
      }
    }
  }
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
}

/** Parse Cortex `GET /api/v1/instruments` rows into catalogue model ids. */
export function parsePublicInstrumentsResponse(body: unknown): Array<{ id: string; displayName?: string }> {
  if (!body || typeof body !== "object") {
    return [];
  }
  const data = (body as { data?: unknown }).data;
  if (!Array.isArray(data)) {
    return [];
  }

  const models: Array<{ id: string; displayName?: string }> = [];
  for (const row of data) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const record = row as {
      symbol?: unknown;
      status?: unknown;
      instrument_type?: unknown;
      description?: unknown;
      name?: unknown;
    };
    if (record.instrument_type !== "ai_commodity" || record.status !== "active") {
      continue;
    }
    if (typeof record.symbol !== "string") {
      continue;
    }
    const id = record.symbol.trim().toLowerCase();
    if (!id || /^e2e-/i.test(id)) {
      continue;
    }
    const displayName =
      typeof record.description === "string" && record.description.trim()
        ? record.description.trim()
        : typeof record.name === "string" && record.name.trim()
          ? record.name.trim()
          : undefined;
    models.push({ id, displayName });
  }

  const byId = new Map<string, { id: string; displayName?: string }>();
  for (const model of models) {
    byId.set(model.id, model);
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/** Models the user can consume right now (`GET /v1/models`). */
export async function fetchFundedGridModelIds(apiKey: string): Promise<FundedModelsFetchResult> {
  const key = apiKey.trim();
  if (!key) {
    return { ids: [], status: null };
  }

  const result = await asyncTryCatchIf(isNetworkError, async () => {
    const resp = await fetch(gridInferenceModelsUrl(), {
      headers: {
        Authorization: `Bearer ${key}`,
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) {
      return { ids: [] as string[], status: resp.status };
    }
    const json: unknown = await resp.json();
    return { ids: parseGridModelsResponse(json), status: resp.status };
  });

  if (!result.ok) {
    return { ids: [], status: null };
  }
  return result.data;
}

/** All active AI commodity instruments from the public Cortex exchange API. */
export async function fetchPublicCatalogModels(): Promise<Array<{ id: string; displayName?: string }>> {
  const url = `${resolveCortexExchangeApiOrigin()}/api/v1/instruments?page_size=200`;
  const result = await asyncTryCatchIf(isNetworkError, async () => {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) {
      return [];
    }
    const json: unknown = await resp.json();
    return parsePublicInstrumentsResponse(json);
  });
  return result.ok ? result.data : [];
}

/** Merge public catalogue with funded status from the consumption API. */
export async function fetchGridModelCatalog(apiKey: string): Promise<GridModelCatalogResult> {
  const [fundedResult, publicModels] = await Promise.all([
    fetchFundedGridModelIds(apiKey),
    fetchPublicCatalogModels(),
  ]);

  const fundedSet = new Set(fundedResult.ids);
  const byId = new Map<string, GridModelCatalogEntry>();

  for (const model of publicModels) {
    byId.set(model.id, {
      id: model.id,
      displayName: model.displayName,
      funded: fundedSet.has(model.id),
    });
  }

  for (const id of fundedResult.ids) {
    if (!byId.has(id)) {
      byId.set(id, { id, funded: true });
    }
  }

  return {
    entries: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id)),
    authFailed: fundedResult.status === 401 || fundedResult.status === 403,
    publicCatalogFailed: publicModels.length === 0,
  };
}

/** Returns sorted catalogue ids (public list when available, else funded-only). */
export async function fetchGridModelIds(apiKey: string): Promise<string[]> {
  const catalog = await fetchGridModelCatalog(apiKey);
  return catalog.entries.map((entry) => entry.id);
}

export { gridInferenceModelsUrl };
