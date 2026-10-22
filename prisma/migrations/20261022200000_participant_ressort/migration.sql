-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "ressortId" TEXT;

-- CreateIndex
CREATE INDEX "Participant_ressortId_idx" ON "Participant"("ressortId");

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_ressortId_fkey" FOREIGN KEY ("ressortId") REFERENCES "Ressort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

