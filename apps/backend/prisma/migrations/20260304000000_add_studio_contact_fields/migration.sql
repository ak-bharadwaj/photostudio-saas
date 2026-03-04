-- AddColumn: address, city, state, zip_code, website, description to studios table
ALTER TABLE "studios" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "studios" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "studios" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "studios" ADD COLUMN IF NOT EXISTS "zip_code" TEXT;
ALTER TABLE "studios" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "studios" ADD COLUMN IF NOT EXISTS "description" TEXT;
