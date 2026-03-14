import * as dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const existingUser = await prisma.user.findFirst({
    where: { email: "nandyal@example.com" },
  });

  if (existingUser) {
    console.log("Nandyal studio already exists");
    return;
  }

  const passwordHash = await bcrypt.hash("password123", 10);

  const studio = await prisma.studio.create({
    data: {
      name: "Nandyal Photography",
      slug: "nandyal-photography",
      email: "nandyal@example.com",
      phone: "9876543210",
      city: "Nandyal",
      address: "Main Road, Nandyal",
      state: "Andhra Pradesh",
      subscriptionTier: "PRO",
      status: "ACTIVE",
      services: {
        create: [
          {
            name: "Wedding Photography",
            description: "Full day coverage of your special day",
            price: 50000,
            durationMinutes: 480,
            sortOrder: 1,
            occasion: "Wedding",
            isActive: true,
          },
          {
            name: "Pre-Wedding Shoot",
            description: "Beautiful outdoor shoot before the wedding",
            price: 15000,
            durationMinutes: 240,
            sortOrder: 2,
            occasion: "Pre-Wedding",
            isActive: true,
          },
          {
            name: "Birthday Party Coverage",
            description: "Capture the fun and joy of birthday parties",
            price: 8000,
            durationMinutes: 180,
            sortOrder: 3,
            occasion: "Birthday",
            isActive: true,
          },
          {
            name: "Maternity Photoshoot",
            description: "Cherish your pregnancy journey",
            price: 10000,
            durationMinutes: 120,
            sortOrder: 4,
            occasion: "Maternity",
            isActive: true,
          },
          {
            name: "Candid Portraits",
            description: "Professional candid portrait sessions",
            price: 5000,
            durationMinutes: 60,
            sortOrder: 5,
            occasion: "Portrait",
            isActive: true,
          },
        ],
      },
      users: {
        create: {
          name: "Nandyal Owner",
          email: "nandyal@example.com",
          phone: "9876543210",
          passwordHash,
          role: "OWNER",
          provider: "local",
          isActive: true,
        },
      },
      brandingConfig: {
        primaryColor: "#000000",
        secondaryColor: "#1A1A1A",
        accentColor: "#D4AF37",
        fontFamily: "Plus Jakarta Sans",
        themePreset: "monochrome-pro",
        headerText: "Nandyal Photography",
        tagline: "Capturing moments in Nandyal",
        heroStyle: "cinematic",
      },
    },
  });

  console.log("Successfully created Nandyal studio and services!", studio.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
