-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "scoreWeight" DOUBLE PRECISION NOT NULL DEFAULT 1;

-- Backfill: until now a task's weight in the overall score was the sum of
-- its quantitative criteria weights. Carry that sum over so existing results
-- stay the same. Tasks without weighted criteria keep the default of 1; they
-- have no task score and therefore never entered the overall score.
UPDATE "Task" AS t
SET "scoreWeight" = c.total
FROM (
  SELECT "taskId", SUM("weight") AS total
  FROM "ReviewCriteria"
  WHERE "deletedAt" IS NULL
    AND "type" = 'QUANTITATIVE'
    AND "weight" IS NOT NULL
  GROUP BY "taskId"
) AS c
WHERE c."taskId" = t."id"
  AND c.total > 0;

-- CheckConstraint
ALTER TABLE "Task" ADD CONSTRAINT "Task_scoreWeight_positive" CHECK ("scoreWeight" > 0);
