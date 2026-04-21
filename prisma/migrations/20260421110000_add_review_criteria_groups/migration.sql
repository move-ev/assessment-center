-- CreateEnum
CREATE TYPE "CriteriaGroupFactorType" AS ENUM ('POTENTIAL', 'COMPETENCE');

-- CreateTable
CREATE TABLE "ReviewCriteriaGroup" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "factorType" "CriteriaGroupFactorType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ReviewCriteriaGroup_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ReviewCriteria" ADD COLUMN "criteriaGroupId" TEXT;

-- Backfill existing criteria into a default group per task
INSERT INTO "ReviewCriteriaGroup" ("id", "taskId", "title", "factorType", "createdAt", "updatedAt")
SELECT
    'rcg_' || md5(task_ids."taskId" || clock_timestamp()::text),
    task_ids."taskId",
    'Allgemein',
    'COMPETENCE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT "taskId"
    FROM "ReviewCriteria"
    WHERE "deletedAt" IS NULL
) AS task_ids;

UPDATE "ReviewCriteria" AS criteria
SET "criteriaGroupId" = groups."id"
FROM "ReviewCriteriaGroup" AS groups
WHERE criteria."taskId" = groups."taskId"
  AND criteria."criteriaGroupId" IS NULL;

-- AlterTable
ALTER TABLE "ReviewCriteria" ALTER COLUMN "criteriaGroupId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "ReviewCriteriaGroup_taskId_idx" ON "ReviewCriteriaGroup"("taskId");

-- CreateIndex
CREATE INDEX "ReviewCriteria_criteriaGroupId_idx" ON "ReviewCriteria"("criteriaGroupId");

-- AddForeignKey
ALTER TABLE "ReviewCriteriaGroup" ADD CONSTRAINT "ReviewCriteriaGroup_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewCriteria" ADD CONSTRAINT "ReviewCriteria_criteriaGroupId_fkey" FOREIGN KEY ("criteriaGroupId") REFERENCES "ReviewCriteriaGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
