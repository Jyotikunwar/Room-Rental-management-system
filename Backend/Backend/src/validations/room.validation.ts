import { z } from "zod";

export const createRoomSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  city: z.string().min(2, "City is required"),
  location: z.string().min(2, "Location is required"),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  roomType: z.enum(["SINGLE", "DOUBLE", "FLAT", "APARTMENT"]),
  price: z.number().positive("Price must be positive"),
  securityDeposit: z.number().nonnegative().optional(),
  availableFrom: z.string().optional(), // ISO date string from frontend
  amenityIds: z.array(z.number()).optional(),
});

export const updateRoomSchema = createRoomSchema.partial().extend({
  status: z.enum(["AVAILABLE", "BOOKED", "UNDER_MAINTENANCE"]).optional(),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;