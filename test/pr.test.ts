import { describe, expect, it } from "vitest";
import { analyzePrDiffText, loadDiffFixture, parseUnifiedDiff } from "../src/pr.js";
import { renderReport } from "../src/render/index.js";
import { fixturePath, loadTestConfig } from "./helpers.js";

const cases = [
  ["runtime-no-test.diff", "high", true, true],
  ["docs-only.diff", "low", false, false],
  ["public-api-change.diff", "high", true, true],
  ["config-change.diff", "low", false, true],
  ["low-risk-fix.diff", "low", false, false]
] as const;

describe("PR review", () => {
  it.each(cases)("reviews %s", (fixture, risk, missingTests, releaseNoteNeeded) => {
    const diff = loadDiffFixture(fixturePath("diffs", fixture));
    const report = analyzePrDiffText(diff, loadTestConfig());
    expect(report.risk).toBe(risk);
    expect(report.missingTests).toBe(missingTests);
    expect(report.releaseNoteNeeded).toBe(releaseNoteNeeded);
    expect(report.evidence.length).toBeGreaterThan(0);
  });

  it("parses unified diff files", () => {
    const diff = loadDiffFixture(fixturePath("diffs", "config-change.diff"));
    const files = parseUnifiedDiff(diff);
    expect(files.map((file) => file.path)).toEqual(["triagepilot.yml", "package.json"]);
  });

  it("renders PR Markdown and JSON", () => {
    const diff = loadDiffFixture(fixturePath("diffs", "runtime-no-test.diff"));
    const report = analyzePrDiffText(diff, loadTestConfig());
    expect(renderReport(report, "markdown")).toContain("# TriagePilot PR Report");
    expect(renderReport(report, "json")).toContain('"risk": "high"');
  });
});
