/*
  Warnings:

  - Changed the type of `status` on the `parcela` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "parcela" DROP COLUMN "status",
ADD COLUMN     "status" "StatusParcela" NOT NULL;

-- CreateIndex
CREATE INDEX "parcela_status_idx" ON "parcela"("status");
