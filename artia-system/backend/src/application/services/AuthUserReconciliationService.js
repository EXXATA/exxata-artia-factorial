import crypto from 'node:crypto';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function buildTemporaryPassword() {
  return `Tmp!${crypto.randomBytes(24).toString('hex')}aA1`;
}

export class AuthUserReconciliationService {
  constructor({ userRepository, supabaseAuthService, allowedDomain = 'exxata.com.br' }) {
    this.userRepository = userRepository;
    this.supabaseAuthService = supabaseAuthService;
    this.allowedDomain = normalizeEmail(allowedDomain);
  }

  async analyze() {
    const [profiles, authUsers] = await Promise.all([
      this.userRepository.findAll(),
      this.supabaseAuthService.listAllUsers()
    ]);

    const authUsersByEmail = new Map(
      authUsers
        .filter((user) => normalizeEmail(user.email))
        .map((user) => [normalizeEmail(user.email), user])
    );

    const report = {
      aligned: [],
      missingAuthUser: [],
      conflictingIds: [],
      skipped: []
    };

    for (const profile of profiles) {
      const email = normalizeEmail(profile.email);

      if (!email || !email.endsWith(`@${this.allowedDomain}`)) {
        report.skipped.push({
          id: profile.id,
          email: profile.email,
          reason: 'outside_allowed_domain'
        });
        continue;
      }

      const authUser = authUsersByEmail.get(email);
      if (!authUser) {
        report.missingAuthUser.push({
          id: profile.id,
          email: profile.email,
          name: profile.name
        });
        continue;
      }

      if (authUser.id !== profile.id) {
        report.conflictingIds.push({
          profileId: profile.id,
          authUserId: authUser.id,
          email: profile.email,
          name: profile.name
        });
        continue;
      }

      report.aligned.push({
        id: profile.id,
        email: profile.email,
        name: profile.name
      });
    }

    return report;
  }

  async reconcile({ apply = false } = {}) {
    const report = await this.analyze();

    if (!apply) {
      return {
        ...report,
        provisioned: []
      };
    }

    const provisioned = [];

    for (const profile of report.missingAuthUser) {
      await this.supabaseAuthService.createUser({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        password: buildTemporaryPassword()
      });

      provisioned.push(profile);
    }

    return {
      ...report,
      provisioned
    };
  }
}
