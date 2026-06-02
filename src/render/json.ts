import type { TriagePilotReport } from "../schema.js";

export function renderJson(report: TriagePilotReport): string {
  return JSON.stringify(report, null, 2);
}
