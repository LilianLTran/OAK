-- Hard database-level guarantees against double booking.
-- Prisma cannot express EXCLUDE constraints, so they are applied as raw SQL
-- (npm run db:constraints). Idempotent.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- A technician can never hold two overlapping active appointments.
ALTER TABLE "Appointment"
  DROP CONSTRAINT IF EXISTS technician_no_overlap;
ALTER TABLE "Appointment"
  ADD CONSTRAINT technician_no_overlap
  EXCLUDE USING gist (
    "technicianId" WITH =,
    tsrange("startAt", "endAt") WITH &&
  )
  WHERE (status IN ('PENDING', 'CONFIRMED'));

-- A customer can never hold two overlapping active appointments.
ALTER TABLE "Appointment"
  DROP CONSTRAINT IF EXISTS customer_no_overlap;
ALTER TABLE "Appointment"
  ADD CONSTRAINT customer_no_overlap
  EXCLUDE USING gist (
    "customerId" WITH =,
    tsrange("startAt", "endAt") WITH &&
  )
  WHERE (status IN ('PENDING', 'CONFIRMED'));

-- Sanity: appointments must end after they start.
ALTER TABLE "Appointment"
  DROP CONSTRAINT IF EXISTS appointment_valid_range;
ALTER TABLE "Appointment"
  ADD CONSTRAINT appointment_valid_range CHECK ("endAt" > "startAt");
