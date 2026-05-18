import { describe, expect, it, mock } from "bun:test";
import { fetchGridModelIds, GRID_OPENAI_MODELS_URL, parseGridModelsResponse } from "../shared/grid-models.js";

describe("grid-models", () => {
  describe("parseGridModelsResponse", () => {
    it("returns sorted unique ids from OpenAI-style envelope", () => {
      expect(
        parseGridModelsResponse({
          data: [
            {
              id: "b",
            },
            {
              id: "a",
            },
            {
              id: "b",
            },
          ],
        }),
      ).toEqual([
        "a",
        "b",
      ]);
    });

    it("returns [] for invalid shapes", () => {
      expect(parseGridModelsResponse(null)).toEqual([]);
      expect(parseGridModelsResponse([])).toEqual([]);
      expect(parseGridModelsResponse({})).toEqual([]);
      expect(parseGridModelsResponse({ data: "no" })).toEqual([]);
    });
  });

  describe("fetchGridModelIds", () => {
    it("returns [] for empty api key", async () => {
      expect(await fetchGridModelIds("   ")).toEqual([]);
    });

    it("maps successful fetch to ids", async () => {
      const originalFetch = global.fetch;
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            data: [
              {
                id: "m1",
              },
            ],
          }),
        } as Response),
      );
      try {
        const ids = await fetchGridModelIds("secret");
        expect(ids).toEqual([
          "m1",
        ]);
        expect(global.fetch).toHaveBeenCalledWith(
          GRID_OPENAI_MODELS_URL,
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
});
