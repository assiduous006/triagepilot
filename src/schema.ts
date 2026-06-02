import { z } from "zod";

export const OutputFormatSchema = z.enum(["markdown", "json"]);
export type OutputFormat = z.infer<typeof OutputFormatSchema>;

export const IssueTypeSchema = z.enum([
  "bug",
  "feature",
  "docs",
  "question",
  "security-sensitive",
  "invalid",
  "unclear"
]);
export type IssueType = z.infer<typeof IssueTypeSchema>;

export const SeveritySchema = z.enum(["low", "medium", "high"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const ConfidenceSchema = z.enum(["low", "medium", "high"]);
export type Confidence = z.infer<typeof ConfidenceSchema>;

const stringArray = z.array(z.string());

export const ProjectConfigSchema = z.object({
  name: z.string().default("TriagePilot"),
  default_branch: z.string().default("main"),
  supported_versions: stringArray.default([])
});

export const SafetyConfigSchema = z.object({
  dry_run: z.boolean().default(true),
  max_input_chars: z.number().int().positive().max(200_000).default(12_000),
  allow_public_comments: z.boolean().default(false),
  allow_label_writes: z.boolean().default(false)
});

export const LabelsConfigSchema = z.object({
  bug: stringArray.default(["bug"]),
  feature: stringArray.default(["enhancement"]),
  docs: stringArray.default(["documentation"]),
  question: stringArray.default(["question"]),
  invalid: stringArray.default(["invalid"]),
  needs_info: stringArray.default(["needs-info"]),
  good_first_issue: stringArray.default(["good first issue"]),
  security_sensitive: stringArray.default(["security", "needs-private-report"])
});

export const IssueRequirementSchema = z.object({
  required_fields: stringArray.default([])
});

export const PrReviewConfigSchema = z.object({
  public_api_patterns: stringArray.default(["src/**"]),
  test_patterns: stringArray.default(["test/**", "**/*.test.ts"]),
  docs_patterns: stringArray.default(["docs/**", "README.md", "CHANGELOG.md"]),
  release_note_required_patterns: stringArray.default(["src/**", "package.json"])
});

export const TriagePilotConfigSchema = z.object({
  project: ProjectConfigSchema.default({}),
  safety: SafetyConfigSchema.default({}),
  labels: LabelsConfigSchema.default({}),
  issue_requirements: z.record(IssueRequirementSchema).default({}),
  pr_review: PrReviewConfigSchema.default({})
});
export type TriagePilotConfig = z.infer<typeof TriagePilotConfigSchema>;

export const EvidenceSchema = z.object({
  source: z.string(),
  text: z.string(),
  weight: z.number().optional()
});
export type Evidence = z.infer<typeof EvidenceSchema>;

export const IssueInputSchema = z.object({
  number: z.number().int().positive().optional(),
  title: z.string(),
  body: z.string().default(""),
  labels: z.array(z.string()).default([]),
  author_association: z.string().optional(),
  url: z.string().optional()
});
export type IssueInput = z.infer<typeof IssueInputSchema>;

export const IssueReportSchema = z.object({
  kind: z.literal("issue"),
  issueType: IssueTypeSchema,
  severity: SeveritySchema,
  missingInfo: stringArray,
  suggestedLabels: stringArray,
  maintainerReply: z.string(),
  confidence: ConfidenceSchema,
  needsHumanJudgment: z.boolean(),
  sanitized: z.boolean(),
  promptInjectionSignals: stringArray,
  evidence: z.array(EvidenceSchema)
});
export type IssueReport = z.infer<typeof IssueReportSchema>;

export const DiffFileSchema = z.object({
  path: z.string(),
  oldPath: z.string().optional(),
  status: z.string().default("M"),
  additions: z.number().int().nonnegative().default(0),
  deletions: z.number().int().nonnegative().default(0)
});
export type DiffFile = z.infer<typeof DiffFileSchema>;

export const PrRiskSchema = z.enum(["low", "medium", "high"]);
export type PrRisk = z.infer<typeof PrRiskSchema>;

export const PrReportSchema = z.object({
  kind: z.literal("pr"),
  changedFiles: z.array(DiffFileSchema),
  changedSurfaces: stringArray,
  risk: PrRiskSchema,
  missingTests: z.boolean(),
  releaseNoteNeeded: z.boolean(),
  reviewChecklist: stringArray,
  confidence: ConfidenceSchema,
  sanitized: z.boolean(),
  promptInjectionSignals: stringArray,
  evidence: z.array(EvidenceSchema)
});
export type PrReport = z.infer<typeof PrReportSchema>;

export type TriagePilotReport = IssueReport | PrReport;
