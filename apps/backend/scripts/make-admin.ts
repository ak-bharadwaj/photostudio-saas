import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  const prisma = new PrismaClient();
  const email = 'dornipaduakshith@gmail.com';
  const name = 'Admin User';
  const temporaryPassword = 'AdminPassword123!';

  console.log(`Checking for admin: ${email}...`);

  const existingAdmin = await prisma.admin.findUnique({
    where: { email },
  });

  if (existingAdmin) {
    console.log('Admin already exists. Updating password...');
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    await prisma.admin.update({
      where: { email },
      data: { passwordHash },
    });
    console.log('Admin password updated.');
  } else {
    console.log('Creating new admin...');
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    await prisma.admin.create({
      data: {
        email,
        name,
        passwordHash,
      },
    });
    console.log('Admin created successfully.');
  }

  // Also ensure User record has OWNER role if it exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
      console.log('User record found. Promoting to OWNER...');
      await prisma.user.update({
          where: { email },
          data: { role: 'OWNER' }
      });
      console.log('User promoted to OWNER.');
  }

  console.log('-----------------------------------');
  console.log(`Email: ${email}`);
  console.log(`Temporary Password: ${temporaryPassword}`);
  console.log('-----------------------------------');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
