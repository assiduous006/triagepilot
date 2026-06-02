import { describe, expect, it } from "vitest";
import { validateConfigFile } from "../src/config.js";
import { repoPath } from "./helpers.js";

describe("config", () => {
  it("validates the default config and reports safety settings", () => {
    const output = validateConfigFile(repoPath("triagepilot.yml"));
    expect(output).toContain("Config OK");
    expect(output).toContain("Report-only: true");
  });
});
