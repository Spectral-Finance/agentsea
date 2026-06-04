import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { AGENTSEA_DEFAULT_CDN, CDN_ORIGIN_FILE, getCdnOrigin } from "../shared/cdn.js";

describe("getCdnOrigin", () => {
  let originalEnv: NodeJS.ProcessEnv;
  let home: string;

  beforeEach(() => {
    originalEnv = { ...process.env };
    home = mkdtempSync(join(tmpdir(), "agentsea-cdn-test-"));
    process.env.AGENTSEA_HOME = home;
    delete process.env.AGENTSEA_CDN;
  });

  afterEach(() => {
    process.env = originalEnv;
    rmSync(home, { recursive: true, force: true });
  });

  it("prefers the AGENTSEA_CDN env var", () => {
    process.env.AGENTSEA_CDN = "https://env.example.com";
    writeFileSync(join(home, CDN_ORIGIN_FILE), "https://pinned.example.com\n");
    expect(getCdnOrigin()).toBe("https://env.example.com");
  });

  it("falls back to the install-time pinned origin when env is unset", () => {
    writeFileSync(join(home, CDN_ORIGIN_FILE), "https://agentsea.dev.thegrid.ai\n");
    expect(getCdnOrigin()).toBe("https://agentsea.dev.thegrid.ai");
  });

  it("falls back to the built-in default when neither is set", () => {
    expect(getCdnOrigin()).toBe(AGENTSEA_DEFAULT_CDN);
  });

  it("strips trailing slashes", () => {
    process.env.AGENTSEA_CDN = "https://env.example.com/";
    expect(getCdnOrigin()).toBe("https://env.example.com");
  });

  it("ignores a malformed pinned origin and uses the default", () => {
    writeFileSync(join(home, CDN_ORIGIN_FILE), "not-a-url\n");
    expect(getCdnOrigin()).toBe(AGENTSEA_DEFAULT_CDN);
  });
});
