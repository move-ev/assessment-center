/*
  Warnings:

  - You are about to drop the column `participantDashboardSnapshot` on the `AssessmentCenter` table. All the data in the column will be lost.
  - You are about to drop the column `factorType` on the `ReviewCriteriaGroup` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AssessmentCenter" DROP COLUMN "participantDashboardSnapshot";

-- AlterTable
ALTER TABLE "ReviewCriteriaGroup" DROP COLUMN "factorType";

-- DropEnum
DROP TYPE "CriteriaGroupFactorType";
