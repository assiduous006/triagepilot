import { OutputFormatSchema, type OutputFormat, type TriagePilotReport } from "../schema.js";
import { renderJson } from "./json.js";
import { renderMarkdown } from "./markdown.js";

export function renderReport(report: TriagePilotReport, format: OutputFormat | string): string {
  const parsed = OutputFormatSchema.parse(format);
  return parsed === "json" ? renderJson(report) : renderMarkdown(report);
}
