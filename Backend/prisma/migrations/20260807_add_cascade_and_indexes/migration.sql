-- Idempotent version: safe to re-run even if part of this already applied.

-- Room.landlord -> User, ON DELETE CASCADE
ALTER TABLE "Room" DROP CONSTRAINT IF EXISTS "Room_landlordId_fkey";
ALTER TABLE "Room" ADD CONSTRAINT "Room_landlordId_fkey"
  FOREIGN KEY ("landlordId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Booking.tenant -> User, ON DELETE CASCADE
ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "Booking_tenantId_fkey";
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Message.sender -> User, ON DELETE CASCADE
ALTER TABLE "Message" DROP CONSTRAINT IF EXISTS "Message_senderId_fkey";
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Message.receiver -> User, ON DELETE CASCADE
ALTER TABLE "Message" DROP CONSTRAINT IF EXISTS "Message_receiverId_fkey";
ALTER TABLE "Message" ADD CONSTRAINT "Message_receiverId_fkey"
  FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Message.room -> Room, ON DELETE SET NULL
ALTER TABLE "Message" DROP CONSTRAINT IF EXISTS "Message_roomId_fkey";
ALTER TABLE "Message" ADD CONSTRAINT "Message_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Notification.user -> User, ON DELETE CASCADE
ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_userId_fkey";
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Performance indexes (IF NOT EXISTS = safe to re-run)
CREATE INDEX IF NOT EXISTS "Room_city_idx" ON "Room"("city");
CREATE INDEX IF NOT EXISTS "Room_price_idx" ON "Room"("price");
CREATE INDEX IF NOT EXISTS "Room_status_idx" ON "Room"("status");
CREATE INDEX IF NOT EXISTS "Booking_status_idx" ON "Booking"("status");
CREATE INDEX IF NOT EXISTS "Complaint_status_idx" ON "Complaint"("status");
