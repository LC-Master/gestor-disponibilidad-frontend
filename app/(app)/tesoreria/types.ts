export interface Company {
  id: string;
  code: string;
  name: string;
  rif: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Bank {
  id: string;
  code?: string;
  name: string;
  is_cash: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BankAccount {
  id: string;
  company_id: string;
  bank_id: string;
  account_alias: string;
  account_number?: string;
  terminal_code: string;
  currency: "VES" | "USD" | "EUR";
  account_type: string;
  current_balance: number;
  is_active: boolean;
  company?: Company;
  bank?: Bank;
  created_at?: string;
  updated_at?: string;
}

export interface DailyAccountBalance {
  id: string;
  bank_account_id: string;
  balance_date: string;
  balance_amount: number;
  bank_account?: BankAccount;
  created_at?: string;
  updated_at?: string;
}

export interface DailyAvailability {
  id?: string;
  company_id: string;
  availability_date: string;
  exchange_rate: number;
  total_liquidity: number;
  supplier_amount: number;
  payroll_amount: number;
  tax_amount: number;
  fx_amount: number;
  refund_amount: number;
  status: "PENDIENTE" | "APROBADO" | "CERRADO";
  approved_by?: string;
  created_at?: string;
  updated_at?: string;
  company?: Company;
}

export interface UserProfile {
  id: string;
  name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  roles?: string[];
  permissions?: string[];
  created_at?: string;
}

export interface UserWithRoles {
  id: string;
  name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  roles: string[];
  permissions?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Role {
  id?: string;
  name: string;
  description?: string;
}

export interface RoleDetail {
  name: string;
  display_name: string;
  description: string;
}

export interface PermissionDetail {
  code: string;
  name: string;
  description: string;
  module: string;
}

export interface CreateCompanyInput {
  code: string;
  name: string;
  rif: string;
}

export interface CreateBankInput {
  code: string;
  name: string;
  is_cash: boolean;
}

export interface CreateBankAccountInput {
  company_id: string;
  bank_id: string;
  account_alias: string;
  account_number: string;
  terminal_code: string;
  currency: "VES" | "USD" | "EUR";
  account_type: string;
  initial_balance: number;
}
