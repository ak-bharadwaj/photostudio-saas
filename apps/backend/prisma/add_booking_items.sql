ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_quotes JSONB;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS group_id TEXT;
CREATE INDEX IF NOT EXISTS bookings_group_id_idx ON bookings(group_id);

CREATE TABLE IF NOT EXISTS booking_items (
  id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  booking_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  original_price DECIMAL(10,2) NOT NULL,
  quoted_amount DECIMAL(10,2),
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT booking_items_pkey PRIMARY KEY (id),
  CONSTRAINT booking_items_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT booking_items_service_id_fkey FOREIGN KEY (service_id) REFERENCES services(id)
);
CREATE INDEX IF NOT EXISTS booking_items_booking_id_idx ON booking_items(booking_id);
CREATE INDEX IF NOT EXISTS booking_items_service_id_idx ON booking_items(service_id);
