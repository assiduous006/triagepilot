import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { matchesAnyPattern } from "./glob.js";
import {
  type Confidence,
  type DiffFile,
  type Evidence,
  type PrReport,
  type PrRisk,
  type TriagePilotConfig
} from "./schema.js";
import { sanitizeText, shortSnippet } from "./sanitize.js";

export interface GitDiffOptions {
  base: string;
  head: string;
  cwd?: string;
  maxPatchChars: number;
}

export function collectGitDiff(options: GitDiffOptions): string {
  const cwd = options.cwd ?? process.cwd();
  const range = `${options.base}...${options.head}`;
  try {
    return execFileSync("git", ["diff", "--find-renames", "--unified=0", range], {
      cwd,
      encoding: "utf8",
      maxBuffer: Math.max(options.maxPatchChars * 4, 1024 * 1024)
    });
  } catch {
    const fallbackRange = `${options.base}..${options.head}`;
    return execFileSync("git", ["diff", "--find-renames", "--unified=0", fallbackRange], {
      cwd,
      encoding: "utf8",
      maxBuffer: Math.max(options.maxPatchChars * 4, 1024 * 1024)
    });
  }
}

export function loadDiffFixture(path: string): string {
  return readFileSync(path, "utf8");
}

export function analyzePrDiffText(diffText: string, config: TriagePilotConfig): PrReport {
  const sanitized = sanitizeText(diffText, config.safety.max_input_chars);
  const changedFiles = parseUnifiedDiff(sanitized.text);
  return analyzePrFiles(changedFiles, config, sanitized.text, sanitized.changed, sanitized.promptInjectionSignals);
}

export function analyzePrFiles(
  changedFiles: DiffFile[],
  config: TriagePilotConfig,
  sanitizedDiffText = "",
  sanitized = false,
  promptInjectionSignals: string[] = []
): PrReport {
  const surfaces = classifySurfaces(changedFiles, config);
  const runtimeFiles = changedFiles.filter((file) => isRuntimeFile(file.path, config));
  const testFiles = changedFiles.filter((file) => matchesAnyPattern(file.path, config.pr_review.test_patterns));
  const docsFiles = changedFiles.filter((file) => matchesAnyPattern(file.path, config.pr_review.docs_patterns));
  const publicApiFiles = changedFiles.filter((file) => matchesAnyPattern(file.path, config.pr_review.public_api_patterns));
  const releaseNoteFiles = changedFiles.filter((file) =>
    matchesAnyPattern(file.path, config.pr_review.release_note_required_patterns)
  );

  const missingTests = runtimeFiles.length > 0 && testFiles.length === 0;
  const releaseNoteNeeded = releaseNoteFiles.length > 0 && docsFiles.length === 0;
  const risk = scorePrRisk({ publicApiFiles, runtimeFiles, missingTests, releaseNoteNeeded, changedFiles });
  const evidence = collectPrEvidence(changedFiles, surfaces, {
    runtimeFiles,
    publicApiFiles,
    testFiles,
    docsFiles,
    sanitizedDiffText
  });
  const confidence = scorePrConfidence(changedFiles, promptInjectionSignals);

  return {
    kind: "pr",
    changedFiles,
    changedSurfaces: surfaces,
    risk,
    missingTests,
    releaseNoteNeeded,
    reviewChecklist: buildReviewChecklist(risk, missingTests, releaseNoteNeeded, publicApiFiles, runtimeFiles),
    confidence,
    sanitized,
    promptInjectionSignals,
    evidence
  };
}

export function parseUnifiedDiff(diffText: string): DiffFile[] {
  const files = new Map<string, DiffFile>();
  let currentPath: string | undefined;

  for (const line of diffText.split(/\r?\n/)) {
    const fileMatch = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (fileMatch) {
      const oldPath = fileMatch[1];
      const path = fileMatch[2];
      currentPath = path;
      files.set(path, {
        path,
        oldPath: oldPath === path ? undefined : oldPath,
        status: oldPath === path ? "M" : "R",
        additions: 0,
        deletions: 0
      });
      continue;
    }

    if (currentPath && line.startsWith("new file mode")) {
      files.get(currentPath)!.status = "A";
      continue;
    }

    if (currentPath && line.startsWith("deleted file mode")) {
      files.get(currentPath)!.status = "D";
      continue;
    }

    if (!currentPath || line.startsWith("+++") || line.startsWith("---")) {
      continue;
    }

    const file = files.get(currentPath);
    if (!file) {
      continue;
    }

    if (line.startsWith("+")) {
      file.additions += 1;
    } else if (line.startsWith("-")) {
      file.deletions += 1;
    }
  }

  return [...files.values()];
}

function classifySurfaces(files: DiffFile[], config: TriagePilotConfig): string[] {
  const surfaces = new Set<string>();
  for (const file of files) {
    const path = file.path;
    if (matchesAnyPattern(path, config.pr_review.test_patterns)) {
      surfaces.add("tests");
    }
    if (matchesAnyPattern(path, config.pr_review.docs_patterns)) {
      surfaces.add("docs");
    }
    if (matchesAnyPattern(path, config.pr_review.public_api_patterns) || path.startsWith("src/")) {
      surfaces.add("runtime");
    }
    if (/^(package\.json|pnpm-lock\.yaml|package-lock\.json|yarn\.lock)$/.test(path)) {
      surfaces.add("package-metadata");
    }
    if (/(\.ya?ml|\.toml|\.json)$/.test(path) && !path.endsWith("package.json")) {
      surfaces.add("config");
    }
    if (path.startsWith(".github/workflows/") || path === "action.yml") {
      surfaces.add("automation");
    }
  }
  return surfaces.size > 0 ? [...surfaces] : ["unknown"];
}

function isRuntimeFile(filePath: string, config: TriagePilotConfig): boolean {
  if (matchesAnyPattern(filePath, config.pr_review.test_patterns)) {
    return false;
  }
  if (matchesAnyPattern(filePath, config.pr_review.docs_patterns)) {
    return false;
  }
  return filePath.startsWith("src/") || matchesAnyPattern(filePath, config.pr_review.public_api_patterns);
}

function scorePrRisk(input: {
  publicApiFiles: DiffFile[];
  runtimeFiles: DiffFile[];
  missingTests: boolean;
  releaseNoteNeeded: boolean;
  changedFiles: DiffFile[];
}): PrRisk {
  if (input.publicApiFiles.length > 0 && input.missingTests) {
    return "high";
  }
  if (input.runtimeFiles.length > 0 && (input.missingTests || input.releaseNoteNeeded)) {
    return "medium";
  }
  if (input.changedFiles.length > 12) {
    return "medium";
  }
  return "low";
}

function collectPrEvidence(
  files: DiffFile[],
  surfaces: string[],
  context: {
    runtimeFiles: DiffFile[];
    publicApiFiles: DiffFile[];
    testFiles: DiffFile[];
    docsFiles: DiffFile[];
    sanitizedDiffText: string;
  }
): Evidence[] {
  const evidence: Evidence[] = [
    { source: "changed surfaces", text: surfaces.join(", "), weight: 0.5 },
    {
      source: "changed files",
      text: files.map((file) => `${file.status} ${file.path} (+${file.additions}/-${file.deletions})`).join("; "),
      weight: 1
    }
  ];

  if (context.publicApiFiles.length > 0) {
    evidence.push({
      source: "public API patterns",
      text: context.publicApiFiles.map((file) => file.path).join(", "),
      weight: 1
    });
  }

  if (context.runtimeFiles.length > 0 && context.testFiles.length === 0) {
    evidence.push({
      source: "test signal",
      text: "Runtime files changed and no configured test files changed.",
      weight: 1
    });
  }

  if (context.docsFiles.length > 0) {
    evidence.push({
      source: "docs signal",
      text: context.docsFiles.map((file) => file.path).join(", "),
      weight: 0.5
    });
  }

  if (context.sanitizedDiffText.trim()) {
    evidence.push({
      source: "diff snippet",
      text: shortSnippet(context.sanitizedDiffText),
      weight: 0.25
    });
  }

  return evidence.slice(0, 8);
}

function scorePrConfidence(files: DiffFile[], promptInjectionSignals: string[]): Confidence {
  if (promptInjectionSignals.length > 0 || files.length === 0) {
    return "low";
  }
  if (files.length <= 8) {
    return "high";
  }
  return "medium";
}

function buildReviewChecklist(
  risk: PrRisk,
  missingTests: boolean,
  releaseNoteNeeded: boolean,
  publicApiFiles: DiffFile[],
  runtimeFiles: DiffFile[]
): string[] {
  const checklist = new Set<string>();

  if (publicApiFiles.length > 0) {
    checklist.add("Confirm public API and compatibility expectations.");
  }
  if (runtimeFiles.length > 0) {
    checklist.add("Review runtime behavior changes against repo policy.");
  }
  if (missingTests) {
    checklist.add("Ask for focused tests or explain why existing coverage is enough.");
  }
  if (releaseNoteNeeded) {
    checklist.add("Decide whether this needs a changelog or release-note entry.");
  }
  if (risk === "high") {
    checklist.add("Require human maintainer approval before merging.");
  }

  if (checklist.size === 0) {
    checklist.add("Review changed files for intent and keep the report in summary-only mode.");
  }

  return [...checklist];
}
