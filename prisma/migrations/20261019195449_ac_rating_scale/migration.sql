-- AlterTable
ALTER TABLE "AssessmentCenter" ADD COLUMN     "ratingScaleMax" INTEGER NOT NULL DEFAULT 6;

-- Existing ACs were rated on 1–5 and keep that scale; only new ACs get 1–6.
UPDATE "AssessmentCenter" SET "ratingScaleMax" = 5;

ALTER TABLE "AssessmentCenter"
    ADD CONSTRAINT chk_ac_rating_scale_max
    CHECK ("ratingScaleMax" IN (5, 6));

-- Ratings may now go up to 6; the per-AC maximum is checked in the router.
ALTER TABLE "QuantitativeRating" DROP CONSTRAINT chk_rating_value;
ALTER TABLE "QuantitativeRating"
    ADD CONSTRAINT chk_rating_value
    CHECK (value >= 0 AND value <= 6);
