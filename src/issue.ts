import { readFileSync } from "node:fs";
import {
  IssueInputSchema,
  type Confidence,
  type Evidence,
  type IssueInput,
  type IssueReport,
  type IssueType,
  type Severity,
  type TriagePilotConfig
} from "./schema.js";
import { sanitizeText, shortSnippet } from "./sanitize.js";

const FIELD_ALIASES: Record<string, string[]> = {
  version: ["version", "package version", "triagepilot version"],
  "operating system": ["operating system", "os", "environment", "platform"],
  "reproduction steps": ["reproduction steps", "steps to reproduce", "minimal reproduction", "reproduction"],
  "expected behavior": ["expected behavior", "expected"],
  "actual behavior": ["actual behavior", "actual"],
  "logs or screenshots": ["logs or screenshots", "logs", "screenshots", "traceback", "stack trace"],
  "use case": ["use case", "problem", "motivation"],
  "proposed behavior": ["proposed behavior", "proposal", "requested behavior"],
  "alternatives considered": ["alternatives considered", "alternatives"],
  "affected page": ["affected page", "page", "url", "docs page"],
  "suggested change": ["suggested change", "suggestion", "fix"]
};

const EMPTY_FIELD_TERMS = [
  "none",
  "n/a",
  "na",
  "not sure",
  "not provided",
  "unknown",
  "tbd",
  "todo"
];

export function loadIssueInput(path: string): IssueInput {
  const raw = readFileSync(path, "utf8");
  return IssueInputSchema.parse(JSON.parse(raw));
}

export function analyzeIssue(input: IssueInput, config: TriagePilotConfig): IssueReport {
  const maxChars = config.safety.max_input_chars;
  const sanitizedTitle = sanitizeText(input.title, Math.min(maxChars, 500));
  const sanitizedBody = sanitizeText(input.body, maxChars);
  const title = sanitizedTitle.text;
  const body = sanitizedBody.text;
  const combined = `${title}\n${body}`;

  const issueType = detectIssueType(title, body, config);
  const severity = detectSeverity(issueType, combined);
  const missingInfo = findMissingFields(issueType, body, config);
  const evidence = collectIssueEvidence(issueType, title, body, missingInfo, input);
  const promptInjectionSignals = [...new Set([
    ...sanitizedTitle.promptInjectionSignals,
    ...sanitizedBody.promptInjectionSignals
  ])];
  const suggestedLabels = suggestLabels(issueType, missingInfo, combined, config);
  const confidence = scoreIssueConfidence(issueType, evidence, missingInfo, promptInjectionSignals);

  return {
    kind: "issue",
    issueType,
    severity,
    missingInfo,
    suggestedLabels,
    maintainerReply: draftMaintainerReply(issueType, missingInfo),
    confidence,
    needsHumanJudgment: issueType === "security-sensitive" || confidence === "low",
    sanitized: sanitizedTitle.changed || sanitizedBody.changed,
    promptInjectionSignals,
    evidence
  };
}

function detectIssueType(title: string, body: string, config: TriagePilotConfig): IssueType {
  const text = `${title}\n${body}`.toLowerCase();
  const version = extractFieldValue(body, "version");

  if (/(vulnerability|security|cve-|exploit|xss|csrf|rce|token leak|secret leak|credential)/i.test(text)) {
    return "security-sensitive";
  }

  if (version && config.project.supported_versions.length > 0) {
    const supported = config.project.supported_versions.some((allowed) => versionMatches(version, allowed));
    if (!supported && /(unsupported|old version|legacy|fails|bug|crash|error)/i.test(text)) {
      return "invalid";
    }
  }

  if (/(documentation|docs|readme|typo|broken link|example is wrong|guide)/i.test(text)) {
    return "docs";
  }

  if (/(feature request|enhancement|proposal|support .*please|add support|use case|new option)/i.test(text)) {
    return "feature";
  }

  if (/(bug|crash|error|fails|failure|regression|expected behavior|actual behavior|steps to reproduce|traceback)/i.test(text)) {
    return "bug";
  }

  if (/(\bquestion\b|how do i|how to|is it possible|help wanted)/i.test(text)) {
    return "question";
  }

  if (text.replace(/\s+/g, "").length < 40) {
    return "invalid";
  }

  return "unclear";
}

function detectSeverity(issueType: IssueType, text: string): Severity {
  if (issueType === "security-sensitive") {
    return "high";
  }
  if (/(data loss|crash|regression|production|cannot install|broken release)/i.test(text)) {
    return "high";
  }
  if (issueType === "bug") {
    return "medium";
  }
  return "low";
}

function findMissingFields(issueType: IssueType, body: string, config: TriagePilotConfig): string[] {
  const requirements = config.issue_requirements[issueType] ?? config.issue_requirements[toConfigIssueKey(issueType)];
  const requiredFields = requirements?.required_fields ?? [];
  return requiredFields.filter((field) => !fieldAppearsWithContent(body, field));
}

function fieldAppearsWithContent(body: string, field: string): boolean {
  const aliases = FIELD_ALIASES[field.toLowerCase()] ?? [field];
  const lines = body.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const normalizedLine = normalizeFieldLine(lines[index] ?? "");
    const alias = aliases.find((candidate) => normalizedLine.startsWith(candidate.toLowerCase()));
    if (!alias) {
      continue;
    }

    const afterLabel = normalizedLine.slice(alias.length).replace(/^[:#*\-\s]+/, "").trim();
    if (hasMeaningfulValue(afterLabel)) {
      return true;
    }

    const nextLines = lines.slice(index + 1, index + 4).map((line) => line.trim()).filter(Boolean);
    const nextContent = nextLines.find((line) => !looksLikeAFieldHeader(line));
    if (nextContent && hasMeaningfulValue(nextContent)) {
      return true;
    }
  }

  return aliases.some((alias) => {
    const pattern = new RegExp(`${escapeRegExp(alias)}[ \\t]*:[ \\t]*([^\\n]+)`, "i");
    const match = body.match(pattern);
    return match?.[1] ? hasMeaningfulValue(match[1]) : false;
  });
}

function extractFieldValue(body: string, field: string): string | undefined {
  const aliases = FIELD_ALIASES[field.toLowerCase()] ?? [field];
  for (const alias of aliases) {
    const pattern = new RegExp(`${escapeRegExp(alias)}[ \\t]*:[ \\t]*([^\\n]+)`, "i");
    const match = body.match(pattern);
    if (match?.[1] && hasMeaningfulValue(match[1])) {
      return match[1].trim();
    }
  }
  return undefined;
}

function hasMeaningfulValue(value: string): boolean {
  const normalized = value.toLowerCase().replace(/[`*_]/g, "").trim();
  if (normalized.length === 0) {
    return false;
  }
  return !EMPTY_FIELD_TERMS.includes(normalized);
}

function looksLikeAFieldHeader(line: string): boolean {
  const normalized = normalizeFieldLine(line);
  return Object.values(FIELD_ALIASES)
    .flat()
    .some((alias) => normalized === alias.toLowerCase() || normalized.startsWith(`${alias.toLowerCase()}:`));
}

function normalizeFieldLine(line: string): string {
  return line
    .toLowerCase()
    .replace(/^#+\s*/, "")
    .replace(/^[*-]\s*/, "")
    .replace(/\*\*/g, "")
    .trim();
}

function suggestLabels(
  issueType: IssueType,
  missingInfo: string[],
  text: string,
  config: TriagePilotConfig
): string[] {
  const labels = new Set<string>();
  const labelKey = toConfigIssueKey(issueType);
  for (const label of config.labels[labelKey] ?? []) {
    labels.add(label);
  }
  if (missingInfo.length > 0) {
    for (const label of config.labels.needs_info) {
      labels.add(label);
    }
  }
  if (/good first issue|small fix|starter/i.test(text)) {
    for (const label of config.labels.good_first_issue) {
      labels.add(label);
    }
  }
  return [...labels];
}

function toConfigIssueKey(issueType: IssueType): keyof TriagePilotConfig["labels"] {
  if (issueType === "security-sensitive") {
    return "security_sensitive";
  }
  if (issueType === "unclear") {
    return "needs_info";
  }
  return issueType;
}

function collectIssueEvidence(
  issueType: IssueType,
  title: string,
  body: string,
  missingInfo: string[],
  input: IssueInput
): Evidence[] {
  const evidence: Evidence[] = [
    { source: "title", text: shortSnippet(title), weight: 0.5 }
  ];
  if (body.trim()) {
    evidence.push({ source: "body", text: shortSnippet(body), weight: 0.5 });
  }
  if (input.labels.length > 0) {
    evidence.push({ source: "existing labels", text: input.labels.join(", "), weight: 0.25 });
  }
  if (missingInfo.length > 0) {
    evidence.push({ source: "missing fields", text: missingInfo.join(", "), weight: 1 });
  }
  evidence.push({ source: "classification", text: `Detected issue type: ${issueType}`, weight: 0.5 });
  return evidence.slice(0, 8);
}

function scoreIssueConfidence(
  issueType: IssueType,
  evidence: Evidence[],
  missingInfo: string[],
  promptInjectionSignals: string[]
): Confidence {
  if (promptInjectionSignals.length > 0 || issueType === "unclear") {
    return "low";
  }
  if (evidence.length >= 3 && missingInfo.length <= 2) {
    return "high";
  }
  return "medium";
}

function draftMaintainerReply(issueType: IssueType, missingInfo: string[]): string {
  if (issueType === "security-sensitive") {
    return [
      "Thanks for the report. This may involve security-sensitive details, so please avoid posting exploit details publicly.",
      "Please use the repository security advisory process or the maintainer security contact so we can review it privately."
    ].join(" ");
  }

  if (missingInfo.length > 0) {
    return [
      "Thanks for opening this. To make this actionable, could you add the missing details below?",
      missingInfo.map((field) => `- ${field}`).join("\n"),
      "Once those are available, a maintainer can reproduce the issue and decide the next step."
    ].join("\n\n");
  }

  if (issueType === "feature") {
    return "Thanks for the thoughtful request. The use case and proposed behavior are clear enough for maintainer review.";
  }

  if (issueType === "docs") {
    return "Thanks for flagging the docs issue. This looks actionable for a maintainer or contributor to review.";
  }

  if (issueType === "invalid") {
    return "Thanks for opening this. Based on the current details, this may be unsupported or not actionable. Please add a supported version and a minimal reproduction if this still reproduces.";
  }

  return "Thanks for the report. This has enough initial detail for maintainer review, but a human maintainer should make the final call.";
}

function versionMatches(version: string, allowed: string): boolean {
  const normalized = version.trim().replace(/^v/, "");
  const allowedNormalized = allowed.trim().replace(/^v/, "");
  if (allowedNormalized.endsWith(".x")) {
    return normalized.startsWith(allowedNormalized.slice(0, -1));
  }
  return normalized === allowedNormalized || normalized.includes(allowedNormalized);
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
