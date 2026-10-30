type Rules = Record<string, any>;

/**
 * System-workspace projects may replace fetched rules with a config override.
 * When the override key is absent, keep the fetched map so callers (notably
 * ruleSnapshots.record → Object.keys) never see undefined.
 */
export function applySystemWorkspaceProjectRules(
  rules: Rules,
  workspace: string | undefined,
  systemWorkspace: string | undefined,
  systemWorkspaceProjectRules: Rules | undefined,
): Rules {
  if (workspace === systemWorkspace) {
    return systemWorkspaceProjectRules ?? rules;
  }
  return rules;
}
