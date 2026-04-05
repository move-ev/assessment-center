/*
  Warnings:

  - Added the required column `ownerId` to the `AssessmentCenter` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AcStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED');

-- AlterTable
ALTER TABLE "AssessmentCenter" ADD COLUMN     "ownerId" TEXT NOT NULL,
ADD COLUMN     "status" "AcStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateIndex
CREATE INDEX "AssessmentCenter_ownerId_idx" ON "AssessmentCenter"("ownerId");

-- AddForeignKey
ALTER TABLE "AssessmentCenter" ADD CONSTRAINT "AssessmentCenter_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
