import { createAdminClient } from "../lib/supabase/admin";

// Retry helper for when create-staff-account.ts's password-setup email
// failed (almost always Supabase's default 2-emails/hour rate limit).
// Edit EMAIL below and re-run:
//   npx tsx --env-file=.env.local scripts/send-password-setup-email.ts

const EMAIL = "Emiliano@monam.mx";

async function main() {
  const admin = createAdminClient();
  const { error } = await admin.auth.resetPasswordForEmail(EMAIL);
  if (error) {
    console.error(`Still failed: ${error.message}`);
    process.exit(1);
  }
  console.log(`Password-setup email sent to ${EMAIL}.`);
}

main();
