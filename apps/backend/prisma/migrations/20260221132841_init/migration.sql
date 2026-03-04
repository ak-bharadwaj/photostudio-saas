-- CreateEnum
CREATE TYPE "BillingModel" AS ENUM ('SUBSCRIPTION', 'COMMISSION');

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'COLLECTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "accepted_terms" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contract_url" TEXT;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "cover_image" TEXT,
ADD COLUMN     "occasion" TEXT;

-- AlterTable
ALTER TABLE "studios" ADD COLUMN     "billing_model" "BillingModel" NOT NULL DEFAULT 'SUBSCRIPTION',
ADD COLUMN     "commission_rate" DECIMAL(10,2),
ADD COLUMN     "commission_type" "CommissionType" DEFAULT 'PERCENTAGE',
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN     "default_terms" TEXT,
ADD COLUMN     "tax_rate" DECIMAL(5,2) DEFAULT 18.00;

-- CreateTable
CREATE TABLE "commissions" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "booking_id" TEXT,
    "invoice_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "commissions_studio_id_idx" ON "commissions"("studio_id");

-- CreateIndex
CREATE INDEX "commissions_invoice_id_idx" ON "commissions"("invoice_id");

-- CreateIndex
CREATE INDEX "commissions_status_idx" ON "commissions"("status");

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
