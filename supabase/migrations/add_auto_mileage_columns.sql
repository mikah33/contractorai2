-- Add source and status columns to mileage_trips for auto-tracking support
ALTER TABLE mileage_trips
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'auto'));

ALTER TABLE mileage_trips
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'pending'));

-- Index for filtering auto trips
CREATE INDEX IF NOT EXISTS idx_mileage_trips_source
  ON mileage_trips(source);

CREATE INDEX IF NOT EXISTS idx_mileage_trips_status
  ON mileage_trips(user_id, status);
