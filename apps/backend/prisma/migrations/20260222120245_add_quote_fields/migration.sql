-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "quote_accepted_at" TIMESTAMP(3),
ADD COLUMN     "quote_amount" DECIMAL(10,2),
ADD COLUMN     "quote_notes" TEXT,
ADD COLUMN     "quoted_at" TIMESTAMP(3);
