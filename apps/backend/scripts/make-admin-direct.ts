
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function main() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://neondb_owner:npg_7fJYpZCt1DuE@ep-soft-frost-ak4fp1ti-pooler.c-3.us-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
      }
    }
  });

  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('Connected.');

    const email = 'dornipaduakshith@gmail.com';
    const name = 'Admin User';
    const passwordHash = await bcrypt.hash('AdminPassword123!', 12);

    console.log(`Checking for admin: ${email}...`);
    const existingAdmin = await prisma.admin.findUnique({ where: { email } });

    if (existingAdmin) {
      console.log('Updating existing admin...');
      await prisma.admin.update({
        where: { email },
        data: { passwordHash }
      });
    } else {
      console.log('Creating new admin...');
      await prisma.admin.create({
        data: { email, name, passwordHash }
      });
    }

    console.log('Checking user table...');
    const existingUser = await prisma.user.findUnique({ where: { email: email } });
    if (existingUser) {
      console.log('Promoting user to OWNER...');
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { role: 'OWNER' as any }
      });
    }

    console.log('Success.');
  } catch (err: any) {
    console.error('DATABASE ERROR:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
