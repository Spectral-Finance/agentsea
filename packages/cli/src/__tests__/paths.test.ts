import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  getCacheDir,
  getCacheFile,
  getHistoryPath,
  getSpawnCloudConfigPath,
  getSpawnDir,
  getSshDir,
  getTmpDir,
  getUpdateFailedPath,
  getUserHome,
} from "../shared/paths.js";

describe("paths", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = {
      ...process.env,
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getUserHome", () => {
    it("returns HOME env var when set", () => {
      process.env.HOME = "/custom/home";
      expect(getUserHome()).toBe("/custom/home");
    });

    it("falls back to a non-empty string when HOME is unset", () => {
      delete process.env.HOME;
      const result = getUserHome();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("getSpawnDir", () => {
    it("returns ~/.config/agentsea by default", () => {
      delete process.env.SPAWN_HOME;
      delete process.env.GRID_SPAWN_HOME;
      expect(getSpawnDir()).toBe(join(getUserHome(), ".config", "agentsea"));
    });

    it("uses GRID_SPAWN_HOME when set to valid absolute path", () => {
      const testPath = join(getUserHome(), ".custom-agentsea");
      delete process.env.SPAWN_HOME;
      process.env.GRID_SPAWN_HOME = testPath;
      expect(getSpawnDir()).toBe(testPath);
    });

    it("uses SPAWN_HOME when GRID_SPAWN_HOME unset (legacy)", () => {
      delete process.env.GRID_SPAWN_HOME;
      const testPath = join(getUserHome(), ".legacy-spawn");
      process.env.SPAWN_HOME = testPath;
      expect(getSpawnDir()).toBe(testPath);
    });

    it("rejects relative GRID_SPAWN_HOME", () => {
      delete process.env.SPAWN_HOME;
      process.env.GRID_SPAWN_HOME = "relative/path";
      expect(() => getSpawnDir()).toThrow("must be an absolute path");
    });

    it("rejects dot-relative GRID_SPAWN_HOME", () => {
      delete process.env.SPAWN_HOME;
      process.env.GRID_SPAWN_HOME = "./local/dir";
      expect(() => getSpawnDir()).toThrow("must be an absolute path");
    });

    it("resolves .. segments in absolute GRID_SPAWN_HOME within home", () => {
      delete process.env.SPAWN_HOME;
      const pathWithDots = join(getUserHome(), "foo", "..", "bar");
      process.env.GRID_SPAWN_HOME = pathWithDots;
      expect(getSpawnDir()).toBe(join(getUserHome(), "bar"));
    });

    it("rejects GRID_SPAWN_HOME outside home directory", () => {
      delete process.env.SPAWN_HOME;
      process.env.GRID_SPAWN_HOME = "/tmp/agentsea";
      expect(() => getSpawnDir()).toThrow("must be within your home directory");
    });

    it("accepts home directory itself as GRID_SPAWN_HOME", () => {
      delete process.env.SPAWN_HOME;
      process.env.GRID_SPAWN_HOME = getUserHome();
      expect(getSpawnDir()).toBe(getUserHome());
    });
  });

  describe("getHistoryPath", () => {
    it("returns history.json inside spawn dir", () => {
      delete process.env.SPAWN_HOME;
      delete process.env.GRID_SPAWN_HOME;
      expect(getHistoryPath()).toBe(join(getUserHome(), ".config", "agentsea", "history.json"));
    });
  });

  describe("getSpawnCloudConfigPath", () => {
    it("returns ~/.config/agentsea/{cloud}.json", () => {
      delete process.env.SPAWN_HOME;
      delete process.env.GRID_SPAWN_HOME;
      delete process.env.AGENTSEA_HOME;
      expect(getSpawnCloudConfigPath("aws")).toBe(join(getUserHome(), ".config", "agentsea", "aws.json"));
    });

    it("works for different cloud names", () => {
      delete process.env.SPAWN_HOME;
      delete process.env.GRID_SPAWN_HOME;
      delete process.env.AGENTSEA_HOME;
      expect(getSpawnCloudConfigPath("hetzner")).toBe(join(getUserHome(), ".config", "agentsea", "hetzner.json"));
    });
  });

  describe("getCacheDir", () => {
    it("returns XDG_CACHE_HOME/agentsea when XDG_CACHE_HOME is set", () => {
      process.env.XDG_CACHE_HOME = "/custom/cache";
      expect(getCacheDir()).toBe("/custom/cache/agentsea");
    });

    it("falls back to ~/.cache/agentsea", () => {
      delete process.env.XDG_CACHE_HOME;
      expect(getCacheDir()).toBe(join(getUserHome(), ".cache", "agentsea"));
    });
  });

  describe("getCacheFile", () => {
    it("returns manifest.json inside cache dir", () => {
      delete process.env.XDG_CACHE_HOME;
      expect(getCacheFile()).toBe(join(getUserHome(), ".cache", "agentsea", "manifest.json"));
    });
  });

  describe("getUpdateFailedPath", () => {
    it("returns ~/.config/agentsea/.update-failed", () => {
      delete process.env.SPAWN_HOME;
      delete process.env.GRID_SPAWN_HOME;
      delete process.env.AGENTSEA_HOME;
      expect(getUpdateFailedPath()).toBe(join(getUserHome(), ".config", "agentsea", ".update-failed"));
    });
  });

  describe("getSshDir", () => {
    it("returns ~/.ssh", () => {
      expect(getSshDir()).toBe(join(getUserHome(), ".ssh"));
    });
  });

  describe("getTmpDir", () => {
    it("returns os.tmpdir()", () => {
      expect(getTmpDir()).toBe(tmpdir());
    });
  });
});
