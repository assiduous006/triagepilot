import type { IssueInput, IssueReport, TriagePilotConfig } from "../schema.js";
import { analyzeIssue } from "../issue.js";

export interface IssueModelAdapter {
  name: string;
  analyzeIssue(input: IssueInput, config: TriagePilotConfig): Promise<IssueReport>;
}

export class OfflineIssueAdapter implements IssueModelAdapter {
  name = "offline";

  async analyzeIssue(input: IssueInput, config: TriagePilotConfig): Promise<IssueReport> {
    return analyzeIssue(input, config);
  }
}
