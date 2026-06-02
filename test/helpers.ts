import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../src/config.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

export function fixturePath(...parts: string[]): string {
  return join(root, "test", "fixtures", ...parts);
}

export function repoPath(...parts: string[]): string {
  return join(root, ...parts);
}

export function loadTestConfig() {
  return loadConfig(repoPath("triagepilot.yml"));
}
