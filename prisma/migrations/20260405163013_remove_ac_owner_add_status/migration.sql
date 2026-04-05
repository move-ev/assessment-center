/*
  Warnings:

  - You are about to drop the column `ownerId` on the `AssessmentCenter` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "AssessmentCenter" DROP CONSTRAINT "AssessmentCenter_ownerId_fkey";

-- DropIndex
DROP INDEX "AssessmentCenter_ownerId_idx";

-- AlterTable
ALTER TABLE "AssessmentCenter" DROP COLUMN "ownerId";
