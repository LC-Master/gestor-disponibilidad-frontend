export interface Supplier {
  id: string;
  rif: string;
  business_name: string;
  sap_vendor_code?: string;
  credit_days: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateSupplierPayload {
  rif: string;
  business_name: string;
  sap_vendor_code?: string;
  credit_days: number;
}

export interface UpdateSupplierPayload {
  business_name: string;
  sap_vendor_code?: string;
  credit_days: number;
}

export type InvoiceType = "FIRME" | "CONSIGNACION" | "SERVICIOS";
export type SAPDocumentType = "MIRO" | "MRKO" | "FB60";
export type InvoiceStatus = "PENDIENTE" | "EN_PROPUESTA" | "PROGRAMADO" | "PAGADO" | "ANULADO";

export interface Invoice {
  id: string;
  company_id: string;
  company?: {
    id: string;
    name: string;
    alias?: string;
    code?: string;
  };
  supplier_id: string;
  supplier?: Supplier;
  invoice_number: string;
  control_number?: string;
  invoice_type: InvoiceType;
  sap_document_type: SAPDocumentType;
  reception_date: string;
  issue_date: string;
  due_date: string;
  currency: "VES" | "USD" | "EUR";
  exchange_rate: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  status: InvoiceStatus;
  created_at?: string;
  updated_at?: string;
}

export interface CalendarDayAggregate {
  date: string;
  total_invoices: number;
  total_ves: number;
  total_usd: number;
  has_overdue: boolean;
  invoices: Invoice[];
}

export interface CreateInvoicePayload {
  company_id: string;
  supplier_id: string;
  invoice_number: string;
  control_number?: string;
  invoice_type: InvoiceType;
  sap_document_type: SAPDocumentType;
  reception_date: string;
  issue_date: string;
  due_date: string;
  currency: string;
  exchange_rate: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
}

export interface PaymentProposalPayload {
  company_id: string;
  proposal_date: string;
  invoice_ids: string[];
}

export interface ExecutePaymentPayload {
  company_id: string;
  bank_account_id: string;
  reference_number: string;
  payment_date: string;
  invoice_ids: string[];
}

export interface UnprogramBatchPayload {
  invoice_ids: string[];
}

export interface InvoiceAuditLog {
  id: string;
  invoice_id: string;
  user_id: string;
  user?: {
    id: string;
    name: string;
    last_name: string;
    email: string;
    roles?: { name: string }[];
  };
  action: string;
  previous_status?: string;
  new_status: string;
  details?: string;
  created_at: string;
}

export interface SupplierPaymentHistory {
  payment_id: string;
  reference_number: string;
  payment_date: string;
  bank_name: string;
  account_number: string;
  invoice_number: string;
  amount_paid: number;
  currency: string;
}

export interface SupplierStatement {
  supplier: Supplier;
  total_debt_ves: number;
  total_debt_usd: number;
  total_overdue_ves: number;
  total_overdue_usd: number;
  total_current_ves: number;
  total_current_usd: number;
  total_paid_ves: number;
  total_paid_usd: number;
  open_invoices: Invoice[];
  payment_history: SupplierPaymentHistory[];
}

export interface AgingBucket {
  current_ves: number;
  current_usd: number;
  days_1_15_ves: number;
  days_1_15_usd: number;
  days_16_30_ves: number;
  days_16_30_usd: number;
  days_31_45_ves: number;
  days_31_45_usd: number;
  days_over_45_ves: number;
  days_over_45_usd: number;
  total_debt_ves: number;
  total_debt_usd: number;
}

export interface SupplierAgingItem {
  supplier_id: string;
  rif: string;
  business_name: string;
  sap_vendor_code?: string;
  credit_days: number;
  buckets: AgingBucket;
}

export interface AgingReportResponse {
  summary: AgingBucket;
  items: SupplierAgingItem[];
}

export interface SupplierBankAccount {
  id: string;
  supplier_id: string;
  bank_id?: string;
  bank_name: string;
  account_number: string;
  account_type: "CORRIENTE" | "AHORRO";
  currency: "VES" | "USD";
  holder_name: string;
  holder_rif: string;
  is_default: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SupplierDetailsResponse {
  id: string;
  rif: string;
  business_name: string;
  sap_vendor_code?: string;
  credit_days: number;
  is_active: boolean;
  supplier?: Supplier;
  bank_accounts: SupplierBankAccount[];
  invoices: Invoice[];
}

export type ProposalStatus = "PENDIENTE" | "APROBADO" | "RECHAZADO" | "ANULADO";

export interface PaymentProposal {
  id: string;
  code: string;
  company_id: string;
  company_name?: string;
  execution_date: string;
  status: ProposalStatus;
  total_amount_ves: number;
  total_amount_usd: number;
  invoice_count: number;
  notes?: string;
  rejection_reason?: string;
  created_by: string;
  creator_name: string;
  reviewed_by?: string;
  reviewer_name?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface ProposalInvoiceDetail {
  invoice_id: string;
  supplier_id: string;
  supplier_rif: string;
  supplier_name: string;
  invoice_number: string;
  control_number?: string;
  sap_document_type: string;
  issue_date: string;
  due_date: string;
  currency: string;
  total_amount: number;
  amount_ves: number;
  amount_usd: number;
}

export interface ProposalDailyAvailability {
  id: string;
  company_id: string;
  availability_date: string;
  exchange_rate: number;
  total_liquidity: number;
  supplier_amount: number;
  payroll_amount: number;
  tax_amount: number;
  fx_amount: number;
  refund_amount: number;
  status: string;
}

export interface ProposalDetailsResponse {
  proposal: PaymentProposal;
  invoices: ProposalInvoiceDetail[];
  daily_availability?: ProposalDailyAvailability;
  consumed_quota: number;
}

export interface CreateProposalPayload {
  company_id: string;
  execution_date: string;
  notes?: string;
  invoice_ids: string[];
}

export interface RejectProposalPayload {
  reason: string;
}

export interface CxpAvailability {
  company_id: string;
  target_date: string;
  has_approved_today: boolean;
  is_rollover: boolean;
  rollover_date?: string | null;
  supplier_amount: number;
  cupo_consumido: number;
  cupo_libre: number;
  exchange_rate: number;
  status: string;
}

export interface PaymentListItem {
  id: string;
  company_id: string;
  company_name: string;
  bank_account_id: string;
  bank_name: string;
  account_number: string;
  reference_number: string;
  payment_date: string;
  total_paid: number;
  invoice_count: number;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

export interface PaymentInvoiceDetailItem {
  invoice_id: string;
  invoice_number: string;
  control_number?: string;
  supplier_rif: string;
  supplier_name: string;
  sap_document_type: string;
  currency: string;
  total_amount: number;
  amount_paid: number;
}

export interface PaymentDetailResponse {
  payment: PaymentListItem;
  invoices: PaymentInvoiceDetailItem[];
}

