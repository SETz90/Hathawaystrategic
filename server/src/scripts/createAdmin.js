import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma.js";

export async function createDefaultAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log("No admin credentials configured.");
    return;
  }

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: {
        role: "ADMIN",
        emailVerified: true,
        isActive: true,
      },
    });

    console.log("Admin already exists.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: process.env.ADMIN_FIRST_NAME || "Admin",
      lastName: process.env.ADMIN_LAST_NAME || "User",
      role: "ADMIN",
      emailVerified: true,
      isActive: true,
    },
  });

  console.log("Default admin created.");
}
