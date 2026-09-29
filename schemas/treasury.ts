import { z } from "zod";

export const createCompanySchema = z.object({
  code: z.string().min(1, "El código es requerido"),
  name: z.string().min(1, "El nombre de la empresa es requerido"),
  rif: z.string().min(1, "El RIF es requerido"),
});

export type CreateCompanyFormData = z.infer<typeof createCompanySchema>;

export const createBankSchema = z.object({
  code: z.string().default(""),
  name: z.string().min(1, "El nombre del banco es requerido"),
  is_cash: z.boolean().default(false),
});

export type CreateBankFormData = z.infer<typeof createBankSchema>;

export const createBankAccountSchema = z.object({
  company_id: z.string().min(1, "Selecciona una empresa"),
  bank_id: z.string().min(1, "Selecciona un banco"),
  account_alias: z.string().min(1, "El alias de cuenta es requerido"),
  account_number: z.string().default(""),
  terminal_code: z.string().min(1, "El código de terminal es requerido"),
  currency: z.enum(["VES", "USD", "EUR"]),
  account_type: z.string().min(1, "El tipo de cuenta es requerido"),
  initial_balance: z.number().default(0),
});

export type CreateBankAccountFormData = z.infer<typeof createBankAccountSchema>;

export const setDailyBalanceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  amount: z.number(),
});

export type SetDailyBalanceFormData = z.infer<typeof setDailyBalanceSchema>;

export const saveDailyAvailabilitySchema = z.object({
  company_id: z.string().min(1, "Empresa requerida"),
  availability_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  exchange_rate: z.number().nonnegative(),
  total_liquidity: z.number(),
  supplier_amount: z.number().nonnegative(),
  payroll_amount: z.number().nonnegative(),
  tax_amount: z.number().nonnegative(),
  fx_amount: z.number().nonnegative(),
  refund_amount: z.number().nonnegative(),
});

export type SaveDailyAvailabilityFormData = z.infer<typeof saveDailyAvailabilitySchema>;
