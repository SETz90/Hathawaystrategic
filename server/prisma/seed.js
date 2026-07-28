import bcrypt from "bcrypt";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@hathawaystrategic.com";

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.log("✅ Admin already exists.");
    return;
  }

  const passwordHash = await bcrypt.hash("ChangeThisPassword123!", 12);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: "System",
      lastName: "Administrator",
      role: Role.ADMIN,
      emailVerified: true,
      isActive: true,
    },
  });

  console.log("✅ Admin account created!");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
