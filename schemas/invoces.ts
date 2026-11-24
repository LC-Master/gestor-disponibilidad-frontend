import { z } from "zod"

export const invoiceSchema = z
    .object({
        company_id: z.string().min(1, "Seleccione una empresa"),
        supplier_id: z.string().min(1, "Seleccione un proveedor"),
        invoice_number: z.string().trim().min(1, "Ingrese el número de factura").max(50, "El número de factura es demasiado largo"),
        control_number: z.string().trim().max(50, "El número de control es demasiado largo").optional(),
        purchase_order_number: z.string().trim().max(50, "La orden de compra es demasiado larga").optional(),
        issue_date: z.string().min(1, "Ingrese la fecha de emisión"),
        reception_date: z.string().min(1, "Ingrese la fecha de recepción"),
        due_date: z.string().min(1, "Ingrese la fecha de vencimiento"),
        currency: z.enum(["VES", "USD", "EUR"]),
        exchange_rate: z.number().positive("La tasa de cambio debe ser mayor a cero"),
        subtotal: z.number().positive("El subtotal debe ser mayor a cero"),
        discount_amount: z.number().min(0, "El descuento no puede ser negativo"),
        exempt_amount: z.number().min(0, "El monto exento no puede ser negativo"),
        vat_retention_pct: z.number().min(0).max(100, "Retención IVA inválida"),
        islr_retention_pct: z.number().min(0).max(100, "Retención ISLR debe estar entre 0 y 100"),
        early_payment_pct: z.number().min(0).max(100, "Pronto pago debe estar entre 0 y 100"),
        total_amount: z.number().positive("El total de la factura debe ser mayor a cero"),
    })
    .refine((d) => d.due_date >= d.issue_date, {
        path: ["due_date"],
        message: "El vencimiento no puede ser anterior a la emisión",
    })
    .refine((d) => d.discount_amount <= d.subtotal, {
        path: ["discount_amount"],
        message: "El descuento no puede exceder el subtotal",
    });