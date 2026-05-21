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
    it("returns ~/.config/grid-spawn by default", () => {
      delete process.env.SPAWN_HOME;
      delete process.env.GRID_SPAWN_HOME;
      expect(getSpawnDir()).toBe(join(getUserHome(), ".config", "grid-spawn"));
    });

    it("uses GRID_SPAWN_HOME when set to valid absolute path", () => {
      const testPath = join(getUserHome(), ".custom-grid-spawn");
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
      process.env.GRID_SPAWN_HOME = "/tmp/grid-spawn";
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
      expect(getHistoryPath()).toBe(join(getUserHome(), ".config", "grid-spawn", "history.json"));
    });
  });

  describe("getSpawnCloudConfigPath", () => {
    it("returns ~/.config/grid-spawn/{cloud}.json", () => {
      expect(getSpawnCloudConfigPath("aws")).toBe(join(getUserHome(), ".config", "grid-spawn", "aws.json"));
    });

    it("works for different cloud names", () => {
      expect(getSpawnCloudConfigPath("hetzner")).toBe(join(getUserHome(), ".config", "grid-spawn", "hetzner.json"));
    });
  });

  describe("getCacheDir", () => {
    it("returns XDG_CACHE_HOME/grid-spawn when XDG_CACHE_HOME is set", () => {
      process.env.XDG_CACHE_HOME = "/custom/cache";
      expect(getCacheDir()).toBe("/custom/cache/grid-spawn");
    });

    it("falls back to ~/.cache/grid-spawn", () => {
      delete process.env.XDG_CACHE_HOME;
      expect(getCacheDir()).toBe(join(getUserHome(), ".cache", "grid-spawn"));
    });
  });

  describe("getCacheFile", () => {
    it("returns manifest.json inside cache dir", () => {
      delete process.env.XDG_CACHE_HOME;
      expect(getCacheFile()).toBe(join(getUserHome(), ".cache", "grid-spawn", "manifest.json"));
    });
  });

  describe("getUpdateFailedPath", () => {
    it("returns ~/.config/grid-spawn/.update-failed", () => {
      expect(getUpdateFailedPath()).toBe(join(getUserHome(), ".config", "grid-spawn", ".update-failed"));
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
