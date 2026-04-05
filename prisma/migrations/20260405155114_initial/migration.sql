-- CreateEnum
CREATE TYPE "CriteriaType" AS ENUM ('QUANTITATIVE', 'QUALITATIVE');

-- CreateTable
CREATE TABLE "AssessmentCenter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AssessmentCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentDay" (
    "id" TEXT NOT NULL,
    "assessmentCenterId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipantGroup" (
    "id" TEXT NOT NULL,
    "assessmentCenterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParticipantGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipantGroupMembership" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParticipantGroupMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "assessmentCenterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reviewer" (
    "id" TEXT NOT NULL,
    "assessmentCenterId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reviewer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "assessmentCenterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isTeamTask" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleEntry" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewCriteria" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "CriteriaType" NOT NULL,
    "weight" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ReviewCriteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewerAssignment" (
    "id" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewerAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuantitativeRating" (
    "id" TEXT NOT NULL,
    "reviewerAssignmentId" TEXT NOT NULL,
    "criteriaId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "QuantitativeRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualitativeRating" (
    "id" TEXT NOT NULL,
    "reviewerAssignmentId" TEXT NOT NULL,
    "criteriaId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "QualitativeRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamTaskObservation" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TeamTaskObservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssessmentDay_assessmentCenterId_idx" ON "AssessmentDay"("assessmentCenterId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentDay_assessmentCenterId_date_key" ON "AssessmentDay"("assessmentCenterId", "date");

-- CreateIndex
CREATE INDEX "ParticipantGroup_assessmentCenterId_idx" ON "ParticipantGroup"("assessmentCenterId");

-- CreateIndex
CREATE INDEX "ParticipantGroupMembership_groupId_idx" ON "ParticipantGroupMembership"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantGroupMembership_participantId_groupId_key" ON "ParticipantGroupMembership"("participantId", "groupId");

-- CreateIndex
CREATE INDEX "Participant_assessmentCenterId_idx" ON "Participant"("assessmentCenterId");

-- CreateIndex
CREATE INDEX "Reviewer_userId_idx" ON "Reviewer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Reviewer_assessmentCenterId_userId_key" ON "Reviewer"("assessmentCenterId", "userId");

-- CreateIndex
CREATE INDEX "Task_assessmentCenterId_idx" ON "Task"("assessmentCenterId");

-- CreateIndex
CREATE INDEX "ScheduleEntry_groupId_idx" ON "ScheduleEntry"("groupId");

-- CreateIndex
CREATE INDEX "ScheduleEntry_taskId_idx" ON "ScheduleEntry"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleEntry_dayId_groupId_taskId_key" ON "ScheduleEntry"("dayId", "groupId", "taskId");

-- CreateIndex
CREATE INDEX "ReviewCriteria_taskId_idx" ON "ReviewCriteria"("taskId");

-- CreateIndex
CREATE INDEX "ReviewerAssignment_participantId_taskId_idx" ON "ReviewerAssignment"("participantId", "taskId");

-- CreateIndex
CREATE INDEX "ReviewerAssignment_reviewerId_idx" ON "ReviewerAssignment"("reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewerAssignment_reviewerId_participantId_taskId_key" ON "ReviewerAssignment"("reviewerId", "participantId", "taskId");

-- CreateIndex
CREATE INDEX "QuantitativeRating_criteriaId_idx" ON "QuantitativeRating"("criteriaId");

-- CreateIndex
CREATE UNIQUE INDEX "QuantitativeRating_reviewerAssignmentId_criteriaId_key" ON "QuantitativeRating"("reviewerAssignmentId", "criteriaId");

-- CreateIndex
CREATE INDEX "QualitativeRating_criteriaId_idx" ON "QualitativeRating"("criteriaId");

-- CreateIndex
CREATE UNIQUE INDEX "QualitativeRating_reviewerAssignmentId_criteriaId_key" ON "QualitativeRating"("reviewerAssignmentId", "criteriaId");

-- CreateIndex
CREATE INDEX "TeamTaskObservation_groupId_taskId_idx" ON "TeamTaskObservation"("groupId", "taskId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamTaskObservation_taskId_groupId_reviewerId_key" ON "TeamTaskObservation"("taskId", "groupId", "reviewerId");

-- AddForeignKey
ALTER TABLE "AssessmentDay" ADD CONSTRAINT "AssessmentDay_assessmentCenterId_fkey" FOREIGN KEY ("assessmentCenterId") REFERENCES "AssessmentCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantGroup" ADD CONSTRAINT "ParticipantGroup_assessmentCenterId_fkey" FOREIGN KEY ("assessmentCenterId") REFERENCES "AssessmentCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantGroupMembership" ADD CONSTRAINT "ParticipantGroupMembership_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantGroupMembership" ADD CONSTRAINT "ParticipantGroupMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ParticipantGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_assessmentCenterId_fkey" FOREIGN KEY ("assessmentCenterId") REFERENCES "AssessmentCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reviewer" ADD CONSTRAINT "Reviewer_assessmentCenterId_fkey" FOREIGN KEY ("assessmentCenterId") REFERENCES "AssessmentCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reviewer" ADD CONSTRAINT "Reviewer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assessmentCenterId_fkey" FOREIGN KEY ("assessmentCenterId") REFERENCES "AssessmentCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEntry" ADD CONSTRAINT "ScheduleEntry_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "AssessmentDay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEntry" ADD CONSTRAINT "ScheduleEntry_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ParticipantGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEntry" ADD CONSTRAINT "ScheduleEntry_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewCriteria" ADD CONSTRAINT "ReviewCriteria_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewerAssignment" ADD CONSTRAINT "ReviewerAssignment_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "Reviewer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewerAssignment" ADD CONSTRAINT "ReviewerAssignment_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewerAssignment" ADD CONSTRAINT "ReviewerAssignment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuantitativeRating" ADD CONSTRAINT "QuantitativeRating_reviewerAssignmentId_fkey" FOREIGN KEY ("reviewerAssignmentId") REFERENCES "ReviewerAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuantitativeRating" ADD CONSTRAINT "QuantitativeRating_criteriaId_fkey" FOREIGN KEY ("criteriaId") REFERENCES "ReviewCriteria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualitativeRating" ADD CONSTRAINT "QualitativeRating_reviewerAssignmentId_fkey" FOREIGN KEY ("reviewerAssignmentId") REFERENCES "ReviewerAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualitativeRating" ADD CONSTRAINT "QualitativeRating_criteriaId_fkey" FOREIGN KEY ("criteriaId") REFERENCES "ReviewCriteria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamTaskObservation" ADD CONSTRAINT "TeamTaskObservation_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamTaskObservation" ADD CONSTRAINT "TeamTaskObservation_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ParticipantGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamTaskObservation" ADD CONSTRAINT "TeamTaskObservation_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "Reviewer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ReviewCriteria: weight is required for QUANTITATIVE, must be null for QUALITATIVE
ALTER TABLE "ReviewCriteria"
    ADD CONSTRAINT chk_criteria_weight
    CHECK (type = 'QUALITATIVE' OR weight IS NOT NULL);

-- QuantitativeRating: value must be in [0, 5]
ALTER TABLE "QuantitativeRating"
    ADD CONSTRAINT chk_rating_value
    CHECK (value >= 0 AND value <= 5);