-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'CUSTOMER';

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "global_user_id" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'local',
ADD COLUMN     "provider_id" TEXT,
ALTER COLUMN "studio_id" DROP NOT NULL,
ALTER COLUMN "password_hash" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_global_user_id_fkey" FOREIGN KEY ("global_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
