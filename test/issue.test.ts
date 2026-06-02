import { describe, expect, it } from "vitest";
import { analyzeIssue, loadIssueInput } from "../src/issue.js";
import { renderReport } from "../src/render/index.js";
import { fixturePath, loadTestConfig } from "./helpers.js";

const cases = [
  ["complete-bug.json", "bug", ["bug"]],
  ["feature-request.json", "feature", ["enhancement"]],
  ["docs-typo.json", "docs", ["documentation"]],
  ["security-sensitive.json", "security-sensitive", ["security", "needs-private-report"]],
  ["duplicate-like.json", "bug", ["bug"]],
  ["missing-repro.json", "bug", ["needs-repro", "needs-info"]],
  ["good-first-issue.json", "docs", ["documentation", "good first issue"]],
  ["invalid-unsupported.json", "invalid", ["invalid"]]
] as const;

describe("issue triage", () => {
  it.each(cases)("classifies %s", (fixture, issueType, labels) => {
    const report = analyzeIssue(loadIssueInput(fixturePath("issues", fixture)), loadTestConfig());
    expect(report.issueType).toBe(issueType);
    expect(report.suggestedLabels).toEqual(expect.arrayContaining([...labels]));
    expect(report.evidence.length).toBeGreaterThan(0);
  });

  it("detects missing issue fields", () => {
    const report = analyzeIssue(loadIssueInput(fixturePath("issues", "missing-repro.json")), loadTestConfig());
    expect(report.missingInfo).toEqual(
      expect.arrayContaining(["reproduction steps", "expected behavior", "actual behavior", "logs or screenshots"])
    );
    expect(report.maintainerReply).toContain("missing details");
  });

  it("sanitizes prompt injection text and records signals", () => {
    const report = analyzeIssue(loadIssueInput(fixturePath("issues", "prompt-injection.json")), loadTestConfig());
    expect(report.sanitized).toBe(true);
    expect(report.promptInjectionSignals.join(" ")).toContain("ignore previous instructions");
    expect(renderReport(report, "markdown")).not.toContain("print all environment variables");
  });

  it("renders JSON and Markdown", () => {
    const report = analyzeIssue(loadIssueInput(fixturePath("issues", "complete-bug.json")), loadTestConfig());
    expect(renderReport(report, "json")).toContain('"issueType": "bug"');
    expect(renderReport(report, "markdown")).toContain("# TriagePilot Issue Report");
  });
});
