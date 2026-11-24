"use client";

import { Suspense, useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileCheck2,
  FileText,
  History,
  Layers,
  RefreshCw,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { fetchClient, sanitizeErrorMessage } from "@/lib/fetchClient";
import { ActionMenuPortal } from "@/components/ui/ActionMenuPortal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Bank, Company } from "@/app/(app)/tesoreria/types";
import { Invoice, PaymentListItem } from "../types";
import { PaymentReceiptModal } from "./PaymentReceiptModal";
import { InvoiceAuditTrailModal } from "./InvoiceAuditTrailModal";
import { InvoiceDetailModal } from "./InvoiceDetailModal";

interface PaymentsHistoryViewProps {
  companies: Company[];
  banks: Bank[];
}

function PaymentsHistoryContent({ companies, banks }: PaymentsHistoryViewProps) {
  const [activeTab, setActiveTab] = useState<"settlements" | "invoices">("settlements");

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(() => companies[0]?.id || "");
  const [selectedBankId, setSelectedBankId] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  useEffect(() => {
    if (
      companies.length > 0 &&
      (!selectedCompanyId || selectedCompanyId === "ALL" || !companies.some((c) => c.id === selectedCompanyId))
    ) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [companies, selectedCompanyId]);

  const [payments, setPayments] = useState<PaymentListItem[]>([]);
  const [loadingPayments, setLoadingPayments] = useState<boolean>(true);

  const [paidInvoices, setPaidInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState<boolean>(false);

  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [selectedInvoiceAudit, setSelectedInvoiceAudit] = useState<Invoice | null>(null);
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState<Invoice | null>(null);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  const fetchPayments = async () => {
    if (!selectedCompanyId || selectedCompanyId === "ALL") {
      setPayments([]);
      setTotalRecords(0);
      setTotalPages(1);
      setLoadingPayments(false);
      return;
    }
    setLoadingPayments(true);
    try {
      const params = new URLSearchParams();
      params.append("company_id", selectedCompanyId);
      params.append("page", String(page));
      params.append("page_size", String(pageSize));
      if (selectedBankId && selectedBankId !== "ALL") {
        params.append("bank_id", selectedBankId);
      }
      if (dateFrom) {
        params.append("date_from", dateFrom);
      }
      if (dateTo) {
        params.append("date_to", dateTo);
      }
      if (search.trim()) {
        params.append("search", search.trim());
      }

      const res = await fetchClient(`/api/cxp/payments?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Error al obtener el historial de liquidaciones");
      }
      const resData = await res.json();
      if (Array.isArray(resData)) {
        setPayments(resData);
        setTotalRecords(resData.length);
        setTotalPages(Math.max(1, Math.ceil(resData.length / pageSize)));
      } else {
        const items = Array.isArray(resData?.data) ? resData.data : [];
        setPayments(items);
        setTotalRecords(resData?.meta?.total_records ?? items.length);
        setTotalPages(Math.max(1, resData?.meta?.total_pages ?? 1));
      }
    } catch (err: any) {
      toast.error(sanitizeErrorMessage(err, "Error al cargar liquidaciones"));
    } finally {
      setLoadingPayments(false);
    }
  };

  const fetchPaidInvoices = async () => {
    if (!selectedCompanyId || selectedCompanyId === "ALL") {
      setPaidInvoices([]);
      setTotalRecords(0);
      setTotalPages(1);
      setLoadingInvoices(false);
      return;
    }
    setLoadingInvoices(true);
    try {
      const params = new URLSearchParams();
      params.append("scope", "paid");
      params.append("company_id", selectedCompanyId);
      params.append("page", String(page));
      params.append("page_size", String(pageSize));
      if (dateFrom) {
        params.append("date_from", dateFrom);
      }
      if (dateTo) {
        params.append("date_to", dateTo);
      }
      if (search.trim()) {
        params.append("search", search.trim());
      }

      const res = await fetchClient(`/api/cxp/invoices?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Error al obtener las facturas pagadas");
      }
      const resData = await res.json();
      if (Array.isArray(resData)) {
        setPaidInvoices(resData);
        setTotalRecords(resData.length);
        setTotalPages(Math.max(1, Math.ceil(resData.length / pageSize)));
      } else {
        const items = Array.isArray(resData?.data) ? resData.data : [];
        setPaidInvoices(items);
        setTotalRecords(resData?.meta?.total_records ?? items.length);
        setTotalPages(Math.max(1, resData?.meta?.total_pages ?? 1));
      }
    } catch (err: any) {
      toast.error(sanitizeErrorMessage(err, "Error al cargar facturas pagadas"));
    } finally {
      setLoadingInvoices(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === "settlements") {
        fetchPayments();
      } else {
        fetchPaidInvoices();
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [activeTab, selectedCompanyId, selectedBankId, dateFrom, dateTo, search, page, pageSize]);

  const formatMoney = (val: number, cur: string = "VES") => {
    return (
      new Intl.NumberFormat("es-VE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(val) +
      " " +
      cur
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const parts = dateStr.split("T")[0].split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const totalSettlementsVES = payments.reduce((sum, p) => sum + (p.total_paid || 0), 0);
  const totalInvoicesVES = paidInvoices.reduce((sum, inv) => {
    const rem = inv.paid_amount || inv.total_amount;
    if (inv.currency === "VES") return sum + rem;
    const rate = inv.exchange_rate > 0 ? inv.exchange_rate : 1;
    return sum + rem * rate;
  }, 0);

  const renderTypeBadge = (inv: Invoice) => {
    const sType = inv.supplier?.supplier_type || "FIRME";
    let colorClasses = "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300";
    if (sType === "CONSIGNACION") {
      colorClasses = "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60";
    } else {
      colorClasses = "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60";
    }

    return (
      <div className="flex flex-col items-start gap-0.5">
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${colorClasses}`}>
          {sType}
        </span>
        {inv.purchase_order_number && (
          <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
            OC: {inv.purchase_order_number}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setActiveTab("settlements");
              setPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "settlements"
                ? "bg-white dark:bg-neutral-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
              }`}
          >
            <Layers className="w-4 h-4" />
            <span>Liquidaciones por Lote</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("invoices");
              setPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "invoices"
                ? "bg-white dark:bg-neutral-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
              }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Facturas Pagadas</span>
          </button>
        </div>

        <div className="px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 text-right">
          <span className="text-[10px] uppercase font-bold text-neutral-400 block">
            {activeTab === "settlements" ? "Total Liquidado Registrado" : "Total en Facturas Pagadas"}
          </span>
          <span className="text-xs font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
            Bs. {formatMoney(activeTab === "settlements" ? totalSettlementsVES : totalInvoicesVES, "VES")}
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-60">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={
                activeTab === "settlements"
                  ? "Buscar por N° Referencia bancaria..."
                  : "Buscar por N° Factura, N° Control o RIF del proveedor..."
              }
              className="w-full pl-9 pr-4 py-2 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/80 rounded-xl text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40 focus:border-locatel-medio"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              if (activeTab === "settlements") fetchPayments();
              else fetchPaidInvoices();
            }}
            disabled={activeTab === "settlements" ? loadingPayments : loadingInvoices}
            className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Refrescar historial"
          >
            <RefreshCw
              className={`w-4 h-4 ${(activeTab === "settlements" ? loadingPayments : loadingInvoices)
                  ? "animate-spin text-locatel-medio"
                  : ""
                }`}
            />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
              Empresa
            </label>
            <SearchableSelect
              value={selectedCompanyId}
              onChange={(val) => {
                setSelectedCompanyId(val);
                setPage(1);
              }}
              placeholder="Seleccionar empresa..."
              searchPlaceholder="Buscar por código, nombre o RIF..."
              buttonClassName="w-full px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 rounded-xl text-xs text-neutral-800 dark:text-neutral-200"
              options={companies.map((c) => ({
                value: c.id,
                label: c.code ? `${c.code} - ${c.name}` : c.name,
                sublabel: c.rif,
                searchTerms: `${c.code || ""} ${c.name} ${c.rif || ""}`,
              }))}
            />
          </div>

          {activeTab === "settlements" ? (
            <div>
              <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
                Banco Pagador
              </label>
              <SearchableSelect
                value={selectedBankId}
                onChange={(val) => {
                  setSelectedBankId(val);
                  setPage(1);
                }}
                placeholder="Todos los Bancos"
                searchPlaceholder="Buscar banco por nombre o código..."
                buttonClassName="w-full px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 rounded-xl text-xs text-neutral-800 dark:text-neutral-200"
                options={[
                  { value: "ALL", label: "Todos los Bancos" },
                  ...banks.map((b) => ({
                    value: b.id,
                    label: b.name,
                    sublabel: b.code,
                    searchTerms: `${b.name} ${b.code || ""}`,
                  })),
                ]}
              />
            </div>
          ) : (
            <div className="hidden sm:block" />
          )}

          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
              Fecha Desde
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 rounded-xl text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
              Fecha Hasta
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 rounded-xl text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40"
            />
          </div>
        </div>
      </div>

      {activeTab === "settlements" ? (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col min-h-[calc(100vh-16rem)]">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs text-neutral-600 dark:text-neutral-400 min-w-[920px]">
              <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300 font-bold uppercase tracking-wider text-[11px] border-b border-neutral-200 dark:border-neutral-800 whitespace-nowrap">
                <tr>
                  <th className="py-3 px-4">Fecha Pago</th>
                  <th className="py-3 px-4">Empresa</th>
                  <th className="py-3 px-4">Cuenta Salida</th>
                  <th className="py-3 px-4">Referencia</th>
                  <th className="py-3 px-4 text-right">Monto Total</th>
                  <th className="py-3 px-4 text-center">Facturas</th>
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-3 w-12 text-center uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 whitespace-nowrap">
                {loadingPayments ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-neutral-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-locatel-medio" />
                        <span>Cargando liquidaciones bancarias...</span>
                      </div>
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-neutral-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FileCheck2 className="w-8 h-8 text-neutral-300 dark:text-neutral-700" />
                        <p className="font-semibold text-neutral-600 dark:text-neutral-400">
                          No se encontraron liquidaciones de pago
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3.5 px-4 text-neutral-900 dark:text-neutral-100 font-semibold">
                        {formatDate(p.payment_date)}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-neutral-900 dark:text-neutral-100">
                        <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[11px]">
                          {p.company_name}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-neutral-600 dark:text-neutral-300 font-mono text-[11px]">
                        {p.bank_name} (•••• {p.account_number.slice(-4)})
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-neutral-900 dark:text-neutral-100">
                        {p.reference_number}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                        Bs. {formatMoney(p.total_paid, "VES")}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                          {p.invoice_count} {p.invoice_count === 1 ? "factura" : "facturas"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-neutral-500 dark:text-neutral-400 text-[11px]">
                        {p.created_by_name || "Sistema"}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <ActionMenuPortal
                          isOpen={activeActionMenuId === p.id}
                          onToggle={() => setActiveActionMenuId(activeActionMenuId === p.id ? null : p.id)}
                          onClose={() => setActiveActionMenuId(null)}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setActiveActionMenuId(null);
                              setSelectedPaymentId(p.id);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Ver Comprobante</span>
                          </button>
                        </ActionMenuPortal>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="py-3 px-4 bg-neutral-50/50 dark:bg-neutral-800/40 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span>
                Total: <strong className="font-mono text-neutral-800 dark:text-neutral-200">{totalRecords.toLocaleString("es-VE")}</strong> {totalRecords === 1 ? "liquidación" : "liquidaciones"}
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none cursor-pointer"
              >
                <option value={25}>25 / pág.</option>
                <option value={50}>50 / pág.</option>
                <option value={100}>100 / pág.</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs">
                Página <strong className="text-neutral-800 dark:text-neutral-200">{page}</strong> de <strong className="text-neutral-800 dark:text-neutral-200">{Math.max(1, totalPages)}</strong>
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loadingPayments}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loadingPayments}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col min-h-[calc(100vh-16rem)]">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs text-neutral-600 dark:text-neutral-400 min-w-[920px]">
              <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300 font-bold uppercase tracking-wider text-[11px] border-b border-neutral-200 dark:border-neutral-800 whitespace-nowrap">
                <tr>
                  <th className="py-3 px-4">Empresa</th>
                  <th className="py-3 px-4">Proveedor</th>
                  <th className="py-3 px-4">RIF</th>
                  <th className="py-3 px-4">N° Factura</th>
                  <th className="py-3 px-4">Tipo SAP</th>
                  <th className="py-3 px-4">F. Emisión</th>
                  <th className="py-3 px-4">F. Vencimiento</th>
                  <th className="py-3 px-4 text-right">Monto Factura</th>
                  <th className="py-3 px-4 text-center">Estatus</th>
                  <th className="py-3 px-3 w-12 text-center uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 whitespace-nowrap">
                {loadingInvoices ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-neutral-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-locatel-medio" />
                        <span>Cargando facturas pagadas...</span>
                      </div>
                    </td>
                  </tr>
                ) : paidInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-neutral-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 className="w-8 h-8 text-neutral-300 dark:text-neutral-700" />
                        <p className="font-semibold text-neutral-600 dark:text-neutral-400">
                          No se encontraron facturas pagadas
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paidInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-neutral-900 dark:text-neutral-100">
                        <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[11px]">
                          {inv.company?.name || "Empresa"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate font-medium text-neutral-900 dark:text-neutral-100 text-[11px]">
                        {inv.supplier?.business_name || "-"}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-neutral-700 dark:text-neutral-300 text-[11px]">
                        {inv.supplier?.rif || "S/R"}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-neutral-900 dark:text-neutral-100">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3.5 px-4">
                        {renderTypeBadge(inv)}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-600 dark:text-neutral-300">
                        {formatDate(inv.issue_date)}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-600 dark:text-neutral-300">
                        {formatDate(inv.due_date)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                        {formatMoney(inv.total_amount, inv.currency)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                          <CheckCircle2 className="w-3 h-3" />
                          PAGADO
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <ActionMenuPortal
                          isOpen={activeActionMenuId === inv.id}
                          onToggle={() => setActiveActionMenuId(activeActionMenuId === inv.id ? null : inv.id)}
                          onClose={() => setActiveActionMenuId(null)}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setActiveActionMenuId(null);
                              setSelectedInvoiceDetail(inv);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-locatel-medio" />
                            <span>Ver Detalle</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveActionMenuId(null);
                              setSelectedInvoiceAudit(inv);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                          >
                            <History className="w-3.5 h-3.5 text-teal-600" />
                            <span>Trazabilidad</span>
                          </button>
                        </ActionMenuPortal>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="py-3 px-4 bg-neutral-50/50 dark:bg-neutral-800/40 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span>
                Total: <strong className="font-mono text-neutral-800 dark:text-neutral-200">{totalRecords.toLocaleString("es-VE")}</strong> {totalRecords === 1 ? "factura" : "facturas"}
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none cursor-pointer"
              >
                <option value={25}>25 / pág.</option>
                <option value={50}>50 / pág.</option>
                <option value={100}>100 / pág.</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs">
                Página <strong className="text-neutral-800 dark:text-neutral-200">{page}</strong> de <strong className="text-neutral-800 dark:text-neutral-200">{Math.max(1, totalPages)}</strong>
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loadingInvoices}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loadingInvoices}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <InvoiceDetailModal
        isOpen={Boolean(selectedInvoiceDetail)}
        onClose={() => setSelectedInvoiceDetail(null)}
        invoice={selectedInvoiceDetail}
      />

      <InvoiceAuditTrailModal
        isOpen={Boolean(selectedInvoiceAudit)}
        onClose={() => setSelectedInvoiceAudit(null)}
        invoice={selectedInvoiceAudit}
      />

      <PaymentReceiptModal
        paymentId={selectedPaymentId}
        onClose={() => setSelectedPaymentId(null)}
      />
    </div>
  );
}

export function PaymentsHistoryView(props: PaymentsHistoryViewProps) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-neutral-400">Cargando histórico de pagos...</div>}>
      <PaymentsHistoryContent {...props} />
    </Suspense>
  );
}
