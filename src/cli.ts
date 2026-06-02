#!/usr/bin/env node
import { Command } from "commander";
import { loadConfig, validateConfigFile } from "./config.js";
import { analyzeIssue, loadIssueInput } from "./issue.js";
import { analyzePrDiffText, collectGitDiff, loadDiffFixture } from "./pr.js";
import { renderReport } from "./render/index.js";
import { OutputFormatSchema } from "./schema.js";

const program = new Command();

program
  .name("triagepilot")
  .description("Evidence-based issue and PR triage for open-source maintainers.")
  .version("0.1.0");

program
  .command("doctor")
  .description("Validate triagepilot.yml and print safety defaults.")
  .requiredOption("--config <path>", "Path to triagepilot.yml")
  .action((options: { config: string }) => {
    console.log(validateConfigFile(options.config));
  });

program
  .command("issue")
  .description("Generate an issue triage report from fixture or GitHub issue JSON.")
  .requiredOption("--input <path>", "Path to issue JSON")
  .requiredOption("--config <path>", "Path to triagepilot.yml")
  .option("--format <format>", "markdown or json", "markdown")
  .action((options: { input: string; config: string; format: string }) => {
    const format = OutputFormatSchema.parse(options.format);
    const config = loadConfig(options.config);
    const input = loadIssueInput(options.input);
    const report = analyzeIssue(input, config);
    console.log(renderReport(report, format));
  });

program
  .command("pr")
  .description("Generate a PR review report from git diff or stored diff fixture.")
  .option("--base <ref>", "Base git ref", "main")
  .option("--head <ref>", "Head git ref", "HEAD")
  .option("--diff <path>", "Read a stored unified diff instead of invoking git")
  .requiredOption("--config <path>", "Path to triagepilot.yml")
  .option("--format <format>", "markdown or json", "markdown")
  .action((options: { base: string; head: string; diff?: string; config: string; format: string }) => {
    const format = OutputFormatSchema.parse(options.format);
    const config = loadConfig(options.config);
    const diffText = options.diff
      ? loadDiffFixture(options.diff)
      : collectGitDiff({
          base: options.base,
          head: options.head,
          maxPatchChars: config.safety.max_input_chars
        });
    const report = analyzePrDiffText(diffText, config);
    console.log(renderReport(report, format));
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`triagepilot: ${message}`);
  process.exitCode = 1;
});
