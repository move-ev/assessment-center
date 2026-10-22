-- CreateTable
CREATE TABLE "Ressort" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ressort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcRessortCapacity" (
    "id" TEXT NOT NULL,
    "assessmentCenterId" TEXT NOT NULL,
    "ressortId" TEXT NOT NULL,
    "registered" INTEGER NOT NULL,
    "active" INTEGER NOT NULL,
    "toAdmit" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcRessortCapacity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ressort_name_key" ON "Ressort"("name");

-- CreateIndex
CREATE INDEX "AcRessortCapacity_ressortId_idx" ON "AcRessortCapacity"("ressortId");

-- CreateIndex
CREATE UNIQUE INDEX "AcRessortCapacity_assessmentCenterId_ressortId_key" ON "AcRessortCapacity"("assessmentCenterId", "ressortId");

-- AddForeignKey
ALTER TABLE "AcRessortCapacity" ADD CONSTRAINT "AcRessortCapacity_assessmentCenterId_fkey" FOREIGN KEY ("assessmentCenterId") REFERENCES "AssessmentCenter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcRessortCapacity" ADD CONSTRAINT "AcRessortCapacity_ressortId_fkey" FOREIGN KEY ("ressortId") REFERENCES "Ressort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Whole numbers from 0, and no more active members than registered ones
-- (same rule as getCapacityError in src/lib/ressort-capacity.ts).
ALTER TABLE "AcRessortCapacity"
    ADD CONSTRAINT chk_ressort_capacity_values
    CHECK ("registered" >= 0 AND "active" >= 0 AND "toAdmit" >= 0 AND "active" <= "registered");
