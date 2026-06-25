/**
 * Central configuration for Scaffl.
 * All config values are lazy getters so dotenv can be loaded before first access.
 */
export const config = {
  get deploymentMode(): 'selfhosted' | 'cloud' {
    return (process.env.DEPLOYMENT_MODE ?? 'selfhosted') as 'selfhosted' | 'cloud';
  },
  get isSelfHosted(): boolean { return this.deploymentMode === 'selfhosted'; },
  get isCloud(): boolean { return this.deploymentMode === 'cloud'; },
  get jwtSecret(): string { return process.env.JWT_SECRET ?? ''; },
  get masterKey(): string { return process.env.SCAFFL_MASTER_KEY ?? ''; },
  get superAdminEmail(): string { return process.env.SUPER_ADMIN_EMAIL ?? ''; },
  get port(): number { return parseInt(process.env.PORT ?? '3001', 10); },
  get databasePath(): string | undefined { return process.env.DATABASE_PATH; },
  get allowedOrigins(): string[] {
    return process.env.ALLOWED_ORIGINS?.split(',').map(s => s.trim()) ?? [];
  },

  // Cloud billing telemetry — only meaningful in cloud deployments, both default to 0
  get spendCap(): number { return parseFloat(process.env.SCAFFL_SPEND_CAP ?? '0'); },
  get externalInitialSpend(): number { return parseFloat(process.env.SCAFFL_EXTERNAL_SPEND ?? '0'); },

  // Optional: professor WhatsApp contact tool (self-hosted operators set their own number)
  // Format: international number without +, e.g. 5511999999999
  get professorWhatsApp(): string { return process.env.PROFESSOR_WHATSAPP ?? ''; },
};

/**
 * Validates required secrets at server startup.
 * Logs a fatal error and calls process.exit(1) if JWT_SECRET is absent or weak.
 * Call this after dotenv.config() in server/index.ts.
 */
export function validateConfig(): void {
  const errors: string[] = [];

  if (!config.jwtSecret || config.jwtSecret.length < 32) {
    errors.push(
      'JWT_SECRET must be set and at least 32 characters long. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  if (errors.length > 0) {
    for (const e of errors) console.error(`[config] FATAL: ${e}`);
    process.exit(1);
  }
}
