import dotenv from 'dotenv';

dotenv.config({ path: new URL('../.env', import.meta.url) });

function resolveApplyFlag() {
  return process.argv.includes('--apply');
}

async function main() {
  const [
    { AuthUserReconciliationService },
    { assertServiceRoleConfigured },
    { config },
    { SupabaseAuthService },
    { UserRepository }
  ] = await Promise.all([
    import('../src/application/services/AuthUserReconciliationService.js'),
    import('../src/infrastructure/database/supabase/supabaseClient.js'),
    import('../src/config/app.js'),
    import('../src/infrastructure/auth/SupabaseAuthService.js'),
    import('../src/infrastructure/database/supabase/UserRepository.js')
  ]);

  assertServiceRoleConfigured('auth user reconciliation');

  const apply = resolveApplyFlag();
  const reconciliationService = new AuthUserReconciliationService({
    userRepository: new UserRepository(),
    supabaseAuthService: new SupabaseAuthService(),
    allowedDomain: config.microsoftAllowedDomain
  });

  const report = await reconciliationService.reconcile({ apply });

  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'dry-run',
    allowedDomain: config.microsoftAllowedDomain,
    aligned: report.aligned.length,
    missingAuthUser: report.missingAuthUser.length,
    conflictingIds: report.conflictingIds.length,
    skipped: report.skipped.length,
    provisioned: report.provisioned.length,
    report
  }, null, 2));
}

main().catch((error) => {
  console.error('[reconcile-auth-users] erro:', error);
  process.exit(1);
});
