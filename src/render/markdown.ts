import type { Evidence, IssueReport, PrReport, TriagePilotReport } from "../schema.js";

export function renderMarkdown(report: TriagePilotReport): string {
  return report.kind === "issue" ? renderIssueMarkdown(report) : renderPrMarkdown(report);
}

function renderIssueMarkdown(report: IssueReport): string {
  return [
    "# TriagePilot Issue Report",
    "",
    "| Field | Value |",
    "|---|---|",
    `| Type | ${report.issueType} |`,
    `| Severity | ${report.severity} |`,
    `| Confidence | ${report.confidence} |`,
    `| Needs human judgment | ${yesNo(report.needsHumanJudgment)} |`,
    `| Sanitized input | ${yesNo(report.sanitized)} |`,
    "",
    "## Missing Information",
    listOrNone(report.missingInfo),
    "",
    "## Suggested Labels",
    listOrNone(report.suggestedLabels),
    "",
    "## Maintainer Reply Draft",
    "",
    blockquote(report.maintainerReply),
    "",
    "## Prompt Injection Signals",
    listOrNone(report.promptInjectionSignals),
    "",
    "## Evidence",
    renderEvidence(report.evidence)
  ].join("\n");
}

function renderPrMarkdown(report: PrReport): string {
  return [
    "# TriagePilot PR Report",
    "",
    "| Field | Value |",
    "|---|---|",
    `| Risk | ${report.risk} |`,
    `| Confidence | ${report.confidence} |`,
    `| Missing tests | ${yesNo(report.missingTests)} |`,
    `| Release note needed | ${yesNo(report.releaseNoteNeeded)} |`,
    `| Sanitized input | ${yesNo(report.sanitized)} |`,
    "",
    "## Changed Surfaces",
    listOrNone(report.changedSurfaces),
    "",
    "## Changed Files",
    report.changedFiles.length > 0
      ? report.changedFiles.map((file) => `- ${file.status} ${file.path} (+${file.additions}/-${file.deletions})`).join("\n")
      : "- None detected",
    "",
    "## Review Checklist",
    listOrNone(report.reviewChecklist),
    "",
    "## Prompt Injection Signals",
    listOrNone(report.promptInjectionSignals),
    "",
    "## Evidence",
    renderEvidence(report.evidence)
  ].join("\n");
}

function renderEvidence(evidence: Evidence[]): string {
  if (evidence.length === 0) {
    return "- None";
  }
  return evidence.map((item) => `- ${item.source}: ${item.text}`).join("\n");
}

function listOrNone(items: string[]): string {
  if (items.length === 0) {
    return "- None";
  }
  return items.map((item) => `- ${item}`).join("\n");
}

function blockquote(text: string): string {
  return text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

function yesNo(value: boolean): string {
  return value ? "yes" : "no";
}
