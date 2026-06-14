import bcrypt from "bcryptjs";

const defaultAdminEmail = "superadmin@sentinelle.local";
const defaultAdminPassword = "Sentinelle2026!";

export async function bootstrapMinimal(prisma) {
  const email = process.env.INITIAL_ADMIN_EMAIL || defaultAdminEmail;
  const password = process.env.INITIAL_ADMIN_PASSWORD || defaultAdminPassword;
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      firstName: process.env.INITIAL_ADMIN_FIRST_NAME || "Admin",
      lastName: process.env.INITIAL_ADMIN_LAST_NAME || "Plateforme",
      role: "SUPER_ADMIN",
      status: "ACTIVE"
    },
    create: {
      id: "usr_super_admin",
      email,
      passwordHash,
      firstName: process.env.INITIAL_ADMIN_FIRST_NAME || "Admin",
      lastName: process.env.INITIAL_ADMIN_LAST_NAME || "Plateforme",
      role: "SUPER_ADMIN",
      status: "ACTIVE"
    }
  });

  console.log(`Seed minimal termine: ${user.email}`);
  return user;
}

