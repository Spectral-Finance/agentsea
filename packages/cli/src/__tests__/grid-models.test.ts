import { describe, expect, it, mock } from "bun:test";
import {
  fetchFundedGridModelIds,
  fetchGridModelCatalog,
  fetchGridModelIds,
  gridInferenceModelsUrl,
  parseGridModelsResponse,
  parsePublicInstrumentsResponse,
} from "../shared/grid-models.js";
import { resolveCortexExchangeApiOrigin } from "../shared/grid-api.js";

describe("grid-models", () => {
  describe("parseGridModelsResponse", () => {
    it("returns sorted unique ids from OpenAI-style envelope", () => {
      expect(
        parseGridModelsResponse({
          data: [
            { id: "b" },
            { id: "a" },
            { id: "b" },
          ],
        }),
      ).toEqual(["a", "b"]);
    });

    it("returns [] for invalid shapes", () => {
      expect(parseGridModelsResponse(null)).toEqual([]);
      expect(parseGridModelsResponse([])).toEqual([]);
      expect(parseGridModelsResponse({})).toEqual([]);
      expect(parseGridModelsResponse({ data: "no" })).toEqual([]);
    });
  });

  describe("parsePublicInstrumentsResponse", () => {
    it("keeps active ai_commodity symbols as lowercase ids", () => {
      expect(
        parsePublicInstrumentsResponse({
          data: [
            {
              symbol: "AGENT-STANDARD",
              status: "active",
              instrument_type: "ai_commodity",
              description: "Fast agent loops",
            },
            {
              symbol: "USD",
              status: "active",
              instrument_type: "currency",
            },
            {
              symbol: "E2E-TEST",
              status: "active",
              instrument_type: "ai_commodity",
            },
          ],
        }),
      ).toEqual([
        {
          id: "agent-standard",
          displayName: "Fast agent loops",
        },
      ]);
    });
  });

  describe("fetchGridModelCatalog", () => {
    it("merges public catalogue with funded status", async () => {
      const originalFetch = global.fetch;
      global.fetch = mock((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/v1/models")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ data: [{ id: "agent-standard" }] }),
          } as Response);
        }
        if (url.includes("/api/v1/instruments")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              data: [
                {
                  symbol: "AGENT-STANDARD",
                  status: "active",
                  instrument_type: "ai_commodity",
                },
                {
                  symbol: "AGENT-MAX",
                  status: "active",
                  instrument_type: "ai_commodity",
                },
              ],
            }),
          } as Response);
        }
        return Promise.reject(new Error(`unexpected fetch: ${url}`));
      });

      try {
        const catalog = await fetchGridModelCatalog("secret");
        expect(catalog.authFailed).toBe(false);
        expect(catalog.entries).toEqual([
          { id: "agent-max", displayName: undefined, funded: false },
          { id: "agent-standard", displayName: undefined, funded: true },
        ]);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("lists public models even when funded list is empty", async () => {
      const originalFetch = global.fetch;
      global.fetch = mock((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/v1/models")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ data: [] }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            data: [
              {
                symbol: "AGENT-STANDARD",
                status: "active",
                instrument_type: "ai_commodity",
              },
            ],
          }),
        } as Response);
      });

      try {
        const catalog = await fetchGridModelCatalog("secret");
        expect(catalog.entries).toEqual([
          { id: "agent-standard", displayName: undefined, funded: false },
        ]);
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe("fetchFundedGridModelIds", () => {
    it("returns [] for empty api key", async () => {
      expect(await fetchFundedGridModelIds("   ")).toEqual({ ids: [], status: null });
    });

    it("maps successful fetch to ids", async () => {
      const originalFetch = global.fetch;
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            data: [{ id: "m1" }],
          }),
        } as Response),
      );
      try {
        const result = await fetchFundedGridModelIds("secret");
        expect(result).toEqual({ ids: ["m1"], status: 200 });
        expect(global.fetch).toHaveBeenCalledWith(
          gridInferenceModelsUrl(),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: "Bearer secret",
            }),
          }),
        );
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe("fetchGridModelIds", () => {
    it("returns public catalogue ids", async () => {
      const originalFetch = global.fetch;
      global.fetch = mock((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/v1/models")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ data: [] }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            data: [
              {
                symbol: "AGENT-STANDARD",
                status: "active",
                instrument_type: "ai_commodity",
              },
            ],
          }),
        } as Response);
      });
      try {
        expect(await fetchGridModelIds("secret")).toEqual(["agent-standard"]);
        expect(String(global.fetch.mock.calls[1]?.[0])).toContain(
          `${resolveCortexExchangeApiOrigin()}/api/v1/instruments`,
        );
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
