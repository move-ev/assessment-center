-- AlterEnum
ALTER TYPE "AcStatus" ADD VALUE 'ANONYMIZED';

-- AlterTable
ALTER TABLE "AssessmentCenter" ADD COLUMN     "anonymizedAt" TIMESTAMP(3);
