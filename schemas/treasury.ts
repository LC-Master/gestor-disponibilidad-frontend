import { z } from "zod";

export const companySchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "El código debe tener al menos 2 caracteres")
    .max(20, "El código no puede exceder 20 caracteres"),
  name: z
    .string()
    .trim()
    .min(3, "La razón social debe tener al menos 3 caracteres")
    .max(150, "La razón social no puede exceder 150 caracteres"),
  rif: z
    .string()
    .trim()
    .regex(
      /^[JjGgVvEePp]-[0-9]{8,9}-[0-9]$/,
      "Formato de RIF inválido (ej. J-12345678-9)"
    ),
});

export type CompanyFormData = z.infer<typeof companySchema>;
export const createCompanySchema = companySchema;
export type CreateCompanyFormData = CompanyFormData;

export const bankSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "El nombre del banco debe tener al menos 3 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  code: z
    .string()
    .trim()
    .regex(/^[0-9]{4}$/, "El código bancario debe tener exactamente 4 dígitos (ej. 0102)")
    .optional()
    .or(z.literal("")),
  is_cash: z.boolean().default(false),
}).refine(
  (data) => {
    if (!data.is_cash && !data.code) {
      return false;
    }
    return true;
  },
  {
    message: "El código bancario es requerido",
    path: ["code"],
  }
);

export type BankFormData = z.infer<typeof bankSchema>;
export const createBankSchema = bankSchema;
export type CreateBankFormData = BankFormData;

export const bankAccountSchema = z
  .object({
    company_id: z.uuid("Debe seleccionar una empresa válida"),
    bank_id: z.uuid("Debe seleccionar un banco válido"),
    account_alias: z
      .string()
      .trim()
      .min(3, "El alias debe tener al menos 3 caracteres")
      .max(100, "El alias no puede exceder 100 caracteres"),
    account_number: z.string().trim(),
    terminal_code: z
      .string()
      .trim()
      .min(1, "El código de terminal es requerido")
      .max(20, "Máximo 20 caracteres"),
    currency: z.enum(["VES", "USD", "EUR"], {
      message: "Seleccione una moneda válida (VES, USD, EUR)",
    }),
    account_type: z
      .string()
      .trim()
      .min(3, "Seleccione el tipo de cuenta (CORRIENTE, AHORRO, CUSTODIA)"),
    is_cash: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (!data.is_cash) {
      const cleanNumber = data.account_number.replace(/\s+/g, "");
      if (!/^[0-9]{20}$/.test(cleanNumber)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["account_number"],
          message: "El número de cuenta bancaria debe contener exactamente 20 dígitos numéricos",
        });
      }
    }
  });

export type BankAccountFormData = z.infer<typeof bankAccountSchema>;
export const createBankAccountSchema = bankAccountSchema;
export type CreateBankAccountFormData = BankAccountFormData;

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
