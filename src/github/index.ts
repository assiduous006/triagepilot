export interface GitHubWritePolicy {
  dryRun: true;
  allowPublicComments: false;
  allowLabelWrites: false;
}

export const REPORT_ONLY_POLICY: GitHubWritePolicy = {
  dryRun: true,
  allowPublicComments: false,
  allowLabelWrites: false
};
