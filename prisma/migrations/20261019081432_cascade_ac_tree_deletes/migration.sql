-- DropForeignKey
ALTER TABLE "AssessmentDay" DROP CONSTRAINT "AssessmentDay_assessmentCenterId_fkey";

-- DropForeignKey
ALTER TABLE "Participant" DROP CONSTRAINT "Participant_assessmentCenterId_fkey";

-- DropForeignKey
ALTER TABLE "ParticipantGroup" DROP CONSTRAINT "ParticipantGroup_assessmentCenterId_fkey";

-- DropForeignKey
ALTER TABLE "ParticipantGroupMembership" DROP CONSTRAINT "ParticipantGroupMembership_groupId_fkey";

-- DropForeignKey
ALTER TABLE "ParticipantGroupMembership" DROP CONSTRAINT "ParticipantGroupMembership_participantId_fkey";

-- DropForeignKey
ALTER TABLE "QualitativeRating" DROP CONSTRAINT "QualitativeRating_criteriaId_fkey";

-- DropForeignKey
ALTER TABLE "QualitativeRating" DROP CONSTRAINT "QualitativeRating_reviewerAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "QuantitativeRating" DROP CONSTRAINT "QuantitativeRating_criteriaId_fkey";

-- DropForeignKey
ALTER TABLE "QuantitativeRating" DROP CONSTRAINT "QuantitativeRating_reviewerAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "ReviewCriteria" DROP CONSTRAINT "ReviewCriteria_criteriaGroupId_fkey";

-- DropForeignKey
ALTER TABLE "ReviewCriteria" DROP CONSTRAINT "ReviewCriteria_taskId_fkey";

-- DropForeignKey
ALTER TABLE "ReviewCriteriaGroup" DROP CONSTRAINT "ReviewCriteriaGroup_taskId_fkey";

-- DropForeignKey
ALTER TABLE "Reviewer" DROP CONSTRAINT "Reviewer_assessmentCenterId_fkey";

-- DropForeignKey
ALTER TABLE "ReviewerAssignment" DROP CONSTRAINT "ReviewerAssignment_participantId_fkey";

-- DropForeignKey
ALTER TABLE "ReviewerAssignment" DROP CONSTRAINT "ReviewerAssignment_reviewerId_fkey";

-- DropForeignKey
ALTER TABLE "ReviewerAssignment" DROP CONSTRAINT "ReviewerAssignment_taskId_fkey";

-- DropForeignKey
ALTER TABLE "ScheduleEntry" DROP CONSTRAINT "ScheduleEntry_dayId_fkey";

-- DropForeignKey
ALTER TABLE "ScheduleEntry" DROP CONSTRAINT "ScheduleEntry_groupId_fkey";

-- DropForeignKey
ALTER TABLE "ScheduleEntry" DROP CONSTRAINT "ScheduleEntry_taskId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_assessmentCenterId_fkey";

-- DropForeignKey
ALTER TABLE "TeamTaskObservation" DROP CONSTRAINT "TeamTaskObservation_groupId_fkey";

-- DropForeignKey
ALTER TABLE "TeamTaskObservation" DROP CONSTRAINT "TeamTaskObservation_reviewerId_fkey";

-- DropForeignKey
ALTER TABLE "TeamTaskObservation" DROP CONSTRAINT "TeamTaskObservation_taskId_fkey";

-- AddForeignKey
ALTER TABLE "AssessmentDay" ADD CONSTRAINT "AssessmentDay_assessmentCenterId_fkey" FOREIGN KEY ("assessmentCenterId") REFERENCES "AssessmentCenter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantGroup" ADD CONSTRAINT "ParticipantGroup_assessmentCenterId_fkey" FOREIGN KEY ("assessmentCenterId") REFERENCES "AssessmentCenter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantGroupMembership" ADD CONSTRAINT "ParticipantGroupMembership_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantGroupMembership" ADD CONSTRAINT "ParticipantGroupMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ParticipantGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_assessmentCenterId_fkey" FOREIGN KEY ("assessmentCenterId") REFERENCES "AssessmentCenter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reviewer" ADD CONSTRAINT "Reviewer_assessmentCenterId_fkey" FOREIGN KEY ("assessmentCenterId") REFERENCES "AssessmentCenter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assessmentCenterId_fkey" FOREIGN KEY ("assessmentCenterId") REFERENCES "AssessmentCenter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEntry" ADD CONSTRAINT "ScheduleEntry_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "AssessmentDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEntry" ADD CONSTRAINT "ScheduleEntry_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ParticipantGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEntry" ADD CONSTRAINT "ScheduleEntry_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewCriteriaGroup" ADD CONSTRAINT "ReviewCriteriaGroup_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewCriteria" ADD CONSTRAINT "ReviewCriteria_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewCriteria" ADD CONSTRAINT "ReviewCriteria_criteriaGroupId_fkey" FOREIGN KEY ("criteriaGroupId") REFERENCES "ReviewCriteriaGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewerAssignment" ADD CONSTRAINT "ReviewerAssignment_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "Reviewer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewerAssignment" ADD CONSTRAINT "ReviewerAssignment_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewerAssignment" ADD CONSTRAINT "ReviewerAssignment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuantitativeRating" ADD CONSTRAINT "QuantitativeRating_reviewerAssignmentId_fkey" FOREIGN KEY ("reviewerAssignmentId") REFERENCES "ReviewerAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuantitativeRating" ADD CONSTRAINT "QuantitativeRating_criteriaId_fkey" FOREIGN KEY ("criteriaId") REFERENCES "ReviewCriteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualitativeRating" ADD CONSTRAINT "QualitativeRating_reviewerAssignmentId_fkey" FOREIGN KEY ("reviewerAssignmentId") REFERENCES "ReviewerAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualitativeRating" ADD CONSTRAINT "QualitativeRating_criteriaId_fkey" FOREIGN KEY ("criteriaId") REFERENCES "ReviewCriteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamTaskObservation" ADD CONSTRAINT "TeamTaskObservation_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamTaskObservation" ADD CONSTRAINT "TeamTaskObservation_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ParticipantGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamTaskObservation" ADD CONSTRAINT "TeamTaskObservation_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "Reviewer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
