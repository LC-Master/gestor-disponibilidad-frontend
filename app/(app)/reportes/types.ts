import { Company, UserProfile } from "../tesoreria/types";

export interface AnalyticsDashboardViewProps {
  companies: Company[];
  user?: UserProfile | null;
}

export interface KPIData {
  total_debt_ves: number;
  total_debt_usd: number;
  total_paid_ves: number;
  total_paid_usd: number;
  paid_invoices_count: number;
  overdue_amount_ves: number;
  treasury_cupo_efficiency: number;
}

export interface SAPTypeMetric {
  type: string;
  description: string;
  total_ves: number;
  total_usd: number;
  count: number;
  percentage: number;
}

export interface SAPDistributionData {
  miro: SAPTypeMetric;
  mrko: SAPTypeMetric;
  fb60: SAPTypeMetric;
  total_ves: number;
}

export interface TopSupplierItem {
  supplier_id: string;
  rif: string;
  business_name: string;
  total_debt_ves: number;
  total_debt_usd: number;
  percentage: number;
  open_invoices_count: number;
}

export interface TopSuppliersData {
  total_debt_ves: number;
  suppliers: TopSupplierItem[];
}

export interface AgingBucketDetail {
  label: string;
  total_ves: number;
  total_usd: number;
  count: number;
  percentage: number;
}

export interface AgingSummaryData {
  current: AgingBucketDetail;
  days_1_15: AgingBucketDetail;
  days_16_30: AgingBucketDetail;
  days_31_45: AgingBucketDetail;
  days_over_45: AgingBucketDetail;
  total_debt_ves: number;
  total_debt_usd: number;
}