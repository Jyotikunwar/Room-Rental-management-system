import { z } from "zod";

export const payInvoiceSchema = z.object({
  paymentMethod: z.enum(["ESEWA", "KHALTI", "CASH", "BANK"]),
});

export type PayInvoiceInput = z.infer<typeof payInvoiceSchema>;