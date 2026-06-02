import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { TriagePilotConfigSchema, type TriagePilotConfig } from "./schema.js";

export function loadConfig(path: string): TriagePilotConfig {
  const raw = readFileSync(path, "utf8");
  const parsed = parse(raw) ?? {};
  return TriagePilotConfigSchema.parse(parsed);
}

export function validateConfigFile(path: string): string {
  const config = loadConfig(path);
  const unsafe: string[] = [];

  if (!config.safety.dry_run) {
    unsafe.push("safety.dry_run should remain true for the v0.1.0 workflow");
  }
  if (config.safety.allow_public_comments) {
    unsafe.push("safety.allow_public_comments is true, but v0.1.0 is report-only");
  }
  if (config.safety.allow_label_writes) {
    unsafe.push("safety.allow_label_writes is true, but v0.1.0 is report-only");
  }

  const lines = [
    `Config OK for ${config.project.name}`,
    `Default branch: ${config.project.default_branch}`,
    `Max input chars: ${config.safety.max_input_chars}`,
    `Report-only: ${String(config.safety.dry_run)}`
  ];

  if (unsafe.length > 0) {
    lines.push("", "Warnings:");
    lines.push(...unsafe.map((warning) => `- ${warning}`));
  }

  return lines.join("\n");
}
