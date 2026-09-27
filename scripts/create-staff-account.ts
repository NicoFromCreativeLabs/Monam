import { createAdminClient } from "../lib/supabase/admin";
import { prisma } from "../lib/prisma";

// One-off bootstrap: create a real Supabase Auth user + AppUser row for a
// staff member, and send them a real invite email to set their own
// password — used here to create the very first Owner account (no one is
// logged in yet to use the real "Invitar persona" flow in Personal y
// horarios). Reusable for any future staff member created outside that UI.
//
// Run with: npx tsx --env-file=.env.local scripts/create-staff-account.ts
// (--env-file loads .env.local before any module code runs — importing
// lib/prisma.ts eagerly reads DATABASE_URL at module-evaluation time, so a
// dotenv call inside this file would run too late.)

const NEW_STAFF = {
  name: "Emiliano Alvear Ocampo",
  email: "Emiliano@monam.mx",
  role: "OWNER" as const,
  salaryMxn: 20000,
  locationNames: ["Roma Norte", "Prado Norte"], // Owners see both locations
};

async function main() {
  const admin = createAdminClient();

  // Two separate steps on purpose: creating the account never sends an
  // email and isn't subject to Supabase's auth-email rate limit (2/hour on
  // the default built-in service), so the account exists regardless of
  // whether the password-setup email below succeeds right now.
  const { data, error } = await admin.auth.admin.createUser({
    email: NEW_STAFF.email,
    email_confirm: true,
    user_metadata: { name: NEW_STAFF.name },
  });
  if (error || !data.user) {
    throw new Error(`Supabase user creation failed: ${error?.message}`);
  }

  const appUser = await prisma.appUser.upsert({
    where: { id: data.user.id },
    create: {
      id: data.user.id,
      name: NEW_STAFF.name,
      email: NEW_STAFF.email,
      role: NEW_STAFF.role,
      salaryMxn: NEW_STAFF.salaryMxn,
      status: "ACTIVE",
    },
    update: {
      name: NEW_STAFF.name,
      role: NEW_STAFF.role,
      salaryMxn: NEW_STAFF.salaryMxn,
    },
  });

  const locations = await prisma.location.findMany({
    where: { name: { in: NEW_STAFF.locationNames } },
  });
  for (const location of locations) {
    await prisma.staffLocationAssignment.upsert({
      where: { userId_locationId: { userId: appUser.id, locationId: location.id } },
      create: {
        userId: appUser.id,
        locationId: location.id,
        isPrimary: location.name === NEW_STAFF.locationNames[0],
      },
      update: {},
    });
  }

  console.log(`Created ${NEW_STAFF.email} (auth id ${data.user.id}) as ${NEW_STAFF.role}.`);

  const { error: resetError } = await admin.auth.resetPasswordForEmail(NEW_STAFF.email);
  if (resetError) {
    console.warn(
      `Account created, but the password-setup email could not be sent right now (${resetError.message}). ` +
        "Retry later with: npx tsx --env-file=.env.local scripts/send-password-setup-email.ts",
    );
  } else {
    console.log("Password-setup email sent — they can set their password and sign in at /login.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
