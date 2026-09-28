import { randomBytes } from "crypto";
import { writeFileSync } from "fs";
import { createAdminClient } from "../lib/supabase/admin";
import { prisma } from "../lib/prisma";

// One-off, throwaway accounts for the persona-based security/UX test pass —
// never real people. Passwords are generated here and written only to a
// gitignored scratch file, never printed to any log a human reads over
// someone's shoulder. Run with:
//   npx tsx --env-file=.env.local scripts/create-persona-test-accounts.ts

function genPassword() {
  return randomBytes(12).toString("base64url");
}

const ACCOUNTS = [
  { kind: "client" as const, name: "Persona Test Newbie", email: "persona-newbie@test.monam.invalid", phone: "+520000000001" },
  { kind: "client" as const, name: "Persona Test Buyer", email: "persona-buyer@test.monam.invalid", phone: "+520000000002" },
  { kind: "staff" as const, name: "Persona Test FrontDesk", email: "persona-frontdesk@test.monam.invalid", role: "FRONT_DESK" as const },
  { kind: "staff" as const, name: "Persona Test Esteticista", email: "persona-esteticista@test.monam.invalid", role: "ESTHETICIAN" as const },
  { kind: "staff" as const, name: "Persona Test Owner QA", email: "persona-owner-qa@test.monam.invalid", role: "OWNER" as const },
  { kind: "staff" as const, name: "Persona Test Admin Review", email: "persona-admin-review@test.monam.invalid", role: "OWNER" as const },
];

async function main() {
  const admin = createAdminClient();
  const results: Record<string, { email: string; password: string }> = {};

  for (const acct of ACCOUNTS) {
    const password = genPassword();
    let userId: string;
    const created = await admin.auth.admin.createUser({
      email: acct.email,
      password,
      email_confirm: true,
      user_metadata: { name: acct.name },
    });
    if (created.error || !created.data.user) {
      // Re-running this script after an earlier persona test pass — the
      // account already exists, so just rotate its password instead of
      // failing. Still a throwaway test account, never a real person.
      if (created.error?.message.includes("already been registered")) {
        const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
        if (listErr) throw new Error(`Failed listing users for ${acct.email}: ${listErr.message}`);
        const existing = list.users.find((u) => u.email === acct.email);
        if (!existing) throw new Error(`${acct.email} reported as registered but not found in listUsers`);
        const { error: updateErr } = await admin.auth.admin.updateUserById(existing.id, { password });
        if (updateErr) throw new Error(`Failed rotating password for ${acct.email}: ${updateErr.message}`);
        userId = existing.id;
      } else {
        throw new Error(`Failed creating ${acct.email}: ${created.error?.message}`);
      }
    } else {
      userId = created.data.user.id;
    }

    if (acct.kind === "client") {
      await prisma.client.upsert({
        where: { phone: acct.phone },
        create: { authUserId: userId, name: acct.name, phone: acct.phone, email: acct.email },
        update: { authUserId: userId },
      });
    } else {
      const appUser = await prisma.appUser.upsert({
        where: { id: userId },
        create: { id: userId, name: acct.name, email: acct.email, role: acct.role, status: "ACTIVE" },
        update: { role: acct.role, status: "ACTIVE" },
      });
      const romaNorte = await prisma.location.findFirst({ where: { name: "Roma Norte" } });
      if (romaNorte) {
        await prisma.staffLocationAssignment.upsert({
          where: { userId_locationId: { userId: appUser.id, locationId: romaNorte.id } },
          create: { userId: appUser.id, locationId: romaNorte.id, isPrimary: true },
          update: {},
        });
      }
    }

    // Keyed by email's local part, not role — two accounts can share a role
    // (e.g. two OWNER test accounts), and role alone would silently
    // overwrite one's saved credentials with the other's.
    const key = acct.email.split("@")[0].toUpperCase().replace(/-/g, "_");
    results[key] = { email: acct.email, password };
    console.log(`Created ${acct.email} (${acct.kind === "staff" ? acct.role : "CLIENT"})`);
  }

  writeFileSync(
    "C:/Users/nicos/AppData/Local/Temp/claude/C--Users-nicos-Desktop-CreativeLabs-CreativeLabs-Business-OS-Clients-MONAM/e1999da5-2913-4733-9de1-38dad5861b0e/scratchpad/persona-test-accounts.json",
    JSON.stringify(results, null, 2),
  );
  console.log("Credentials written to scratchpad (gitignored, session-local).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
