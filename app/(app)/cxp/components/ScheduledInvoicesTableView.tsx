"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  History,
  RefreshCw,
  RotateCcw,
  Search,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { fetchClient } from "@/lib/fetchClient";
import { Company } from "@/app/(app)/tesoreria/types";
import { Invoice, InvoiceStatus, InvoiceType, SAPDocumentType } from "../types";
import { ExecutePaymentModal } from "./ExecutePaymentModal";
import { InvoiceAuditTrailModal } from "./InvoiceAuditTrailModal";

interface UserProfile {
  id: string;
  name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  roles?: string[];
  permissions?: string[];
}

interface ScheduledInvoicesTableViewProps {
  companies: Company[];
  user?: UserProfile | null;
}

function ScheduledInvoicesContent({ companies, user }: ScheduledInvoicesTableViewProps) {
  const searchParams = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(() => {
    return searchParams?.get("company_id") || companies[0]?.id || "ALL";
  });
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState<Invoice | null>(null);
  const [selectedInvoiceAudit, setSelectedInvoiceAudit] = useState<Invoice | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [invoicesToPay, setInvoicesToPay] = useState<Invoice[]>([]);
  const [isUnprogramming, setIsUnprogramming] = useState(false);

  const hasPermission = (code: string) => {
    const clean = code.toLowerCase().trim();
    if (
      user?.roles?.some((r) => {
        const u = r.toUpperCase().trim();
        return u === "ADMIN" || u === "ADMINISTRADOR";
      })
    ) {
      return true;
    }
    return (user?.permissions || []).some(
      (p) => p.toLowerCase().trim() === clean
    );
  };

  const isAdmin = Boolean(
    user?.roles?.some((r) => {
      const u = r.toUpperCase().trim();
      return u === "ADMIN" || u === "ADMINISTRADOR";
    })
  );

  const canExecutePayment = hasPermission("cxp.payments.execute") || isAdmin;
  const canRevert = hasPermission("cxp.payments.revert") || isAdmin;

  const fetchScheduledInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("scope", "scheduled");
      if (selectedCompanyId && selectedCompanyId !== "ALL") {
        params.append("company_id", selectedCompanyId);
      }
      if (search.trim()) {
        params.append("search", search.trim());
      }
      if (dateFrom) {
        params.append("date_from", dateFrom);
      }
      if (dateTo) {
        params.append("date_to", dateTo);
      }

      const res = await fetchClient(`/api/cxp/invoices?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Error al obtener las facturas programadas");
      }
      const data = await res.json();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err.message || "Error al cargar facturas programadas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchScheduledInvoices();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedCompanyId, dateFrom, dateTo]);

  const selectedInvoicesList = useMemo(() => {
    return invoices.filter((inv) => selectedInvoiceIds.has(inv.id));
  }, [invoices, selectedInvoiceIds]);

  const selectedAmountVES = useMemo(() => {
    return selectedInvoicesList.reduce((sum, inv) => {
      const remaining = inv.total_amount - (inv.paid_amount || 0);
      if (inv.currency === "VES") return sum + remaining;
      const rate = inv.exchange_rate > 0 ? inv.exchange_rate : 1;
      return sum + remaining * rate;
    }, 0);
  }, [selectedInvoicesList]);

  const selectedAmountUSD = useMemo(() => {
    return selectedInvoicesList.reduce((sum, inv) => {
      const remaining = inv.total_amount - (inv.paid_amount || 0);
      if (inv.currency === "USD") return sum + remaining;
      const rate = inv.exchange_rate > 0 ? inv.exchange_rate : 1;
      return sum + (rate > 0 ? remaining / rate : 0);
    }, 0);
  }, [selectedInvoicesList]);

  const toggleSelectInvoice = (id: string) => {
    setSelectedInvoiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (invoices.length === 0) return;
    if (selectedInvoiceIds.size === invoices.length) {
      setSelectedInvoiceIds(new Set());
    } else {
      setSelectedInvoiceIds(new Set(invoices.map((i) => i.id)));
    }
  };

  const handleUnprogramSingle = async (id: string) => {
    setIsUnprogramming(true);
    try {
      const res = await fetchClient(`/api/cxp/invoices/${id}/unprogram`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Error al desprogramar factura");
      }
      toast.success("Factura desprogramada exitosamente y restituida a pendiente");
      fetchScheduledInvoices();
    } catch (err: any) {
      toast.error(err.message || "Error al desprogramar factura");
    } finally {
      setIsUnprogramming(false);
    }
  };

  const handleUnprogramBatch = async () => {
    const ids = Array.from(selectedInvoiceIds);
    if (ids.length === 0) {
      toast.error("Seleccione al menos una factura para desprogramar");
      return;
    }

    setIsUnprogramming(true);
    try {
      const res = await fetchClient("/api/cxp/invoices/unprogram-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_ids: ids }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Error al desprogramar facturas");
      }
      toast.success(`${ids.length} facturas desprogramadas y restituidas a pendientes`);
      setSelectedInvoiceIds(new Set());
      fetchScheduledInvoices();
    } catch (err: any) {
      toast.error(err.message || "Error al desprogramar en lote");
    } finally {
      setIsUnprogramming(false);
    }
  };

  const handleOpenPaymentSingle = (inv: Invoice) => {
    setInvoicesToPay([inv]);
    setIsPaymentModalOpen(true);
  };

  const handleOpenPaymentBatch = () => {
    if (selectedInvoicesList.length === 0) {
      toast.error("Seleccione al menos una factura programada");
      return;
    }
    const firstCompanyId = selectedInvoicesList[0].company_id;
    const allSameCompany = selectedInvoicesList.every((i) => i.company_id === firstCompanyId);
    if (!allSameCompany) {
      toast.error("Todas las facturas a liquidar deben pertenecer a la misma empresa");
      return;
    }
    setInvoicesToPay(selectedInvoicesList);
    setIsPaymentModalOpen(true);
  };

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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const parts = dateStr.split("T")[0].split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const getCompanyAlias = (companyId: string) => {
    const c = companies.find((comp) => comp.id === companyId);
    return c?.code || c?.name || "Empresa";
  };

  const renderTypeBadge = (sapType: SAPDocumentType, invoiceType: InvoiceType) => {
    let colorClasses = "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300";
    if (sapType === "MIRO") {
      colorClasses = "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60";
    } else if (sapType === "MRKO") {
      colorClasses = "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60";
    } else if (sapType === "FB60") {
      colorClasses = "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60";
    }

    return (
      <div className="flex flex-col items-start gap-0.5">
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${colorClasses}`}>
          {sapType}
        </span>
        <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
          {invoiceType}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              Empresa:
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40 cursor-pointer"
            >
              <option value="ALL">Todas las Empresas</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code ? `${c.code} - ${c.name}` : c.name}
                </option>
              ))}
            </select>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border border-violet-200 dark:border-violet-800/60">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Compromisos Aprobados
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 text-right">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">
              Total Programado
            </span>
            <span className="text-xs font-extrabold font-mono text-violet-700 dark:text-violet-300">
              {invoices.length} {invoices.length === 1 ? "factura" : "facturas"}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-60">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por N° Factura, N° Control o RIF del proveedor..."
              className="w-full pl-9 pr-4 py-2 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/80 rounded-xl text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40 focus:border-locatel-medio"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => fetchScheduledInvoices()}
              disabled={loading}
              className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-xl transition-colors cursor-pointer"
              title="Refrescar facturas programadas"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-locatel-medio" : ""}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
              Fecha Vencimiento Desde
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 rounded-xl text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
              Fecha Vencimiento Hasta
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 rounded-xl text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40"
            />
          </div>
        </div>
      </div>

      {selectedInvoiceIds.size > 0 && (
        <div className="sticky bottom-4 z-40 bg-neutral-900 text-white p-3.5 rounded-2xl shadow-xl border border-neutral-700 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in slide-in-from-bottom-3 duration-200">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse" />
              <span className="font-semibold text-xs">
                {selectedInvoiceIds.size}{" "}
                {selectedInvoiceIds.size === 1
                  ? "factura programada seleccionada"
                  : "facturas programadas seleccionadas"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pl-3 border-l border-neutral-700 text-xs">
              <span className="text-neutral-400">Total a Liquidar:</span>
              <span className="font-extrabold font-mono text-emerald-400">
                Bs. {formatMoney(selectedAmountVES, "VES")}
              </span>
              <span className="text-xs font-mono text-neutral-400">
                ≈ ${formatMoney(selectedAmountUSD, "USD")}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canExecutePayment && (
              <button
                type="button"
                onClick={handleOpenPaymentBatch}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Liquidar / Registrar Pago Bancario</span>
              </button>
            )}

            {canRevert && (
              <button
                type="button"
                onClick={handleUnprogramBatch}
                disabled={isUnprogramming}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isUnprogramming ? "animate-spin" : ""}`} />
                <span>Desprogramar Lote</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedInvoiceIds(new Set())}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Deseleccionar
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-600 dark:text-neutral-400">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300 font-bold uppercase tracking-wider text-[11px] border-b border-neutral-200 dark:border-neutral-800 whitespace-nowrap">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      invoices.length > 0 &&
                      selectedInvoiceIds.size === invoices.length
                    }
                    onChange={toggleSelectAll}
                    disabled={invoices.length === 0}
                    className="w-4 h-4 rounded text-locatel-medio focus:ring-locatel-medio cursor-pointer disabled:opacity-30"
                  />
                </th>
                <th className="py-3 px-4">Empresa</th>
                <th className="py-3 px-4">Proveedor</th>
                <th className="py-3 px-4">RIF</th>
                <th className="py-3 px-4">N° Factura</th>
                <th className="py-3 px-4">Tipo SAP</th>
                <th className="py-3 px-4">Fecha Vencimiento</th>
                <th className="py-3 px-4 text-right">Monto Original</th>
                <th className="py-3 px-4 text-right">Monto en VES</th>
                <th className="py-3 px-4 text-center">Estatus</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 whitespace-nowrap">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-neutral-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-locatel-medio" />
                      <span>Cargando facturas programadas...</span>
                    </div>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-neutral-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CheckCircle2 className="w-8 h-8 text-neutral-300 dark:text-neutral-700" />
                      <p className="font-semibold text-neutral-600 dark:text-neutral-400">
                        No hay facturas programadas para pago
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        Las facturas aprobadas en las propuestas aparecerán en esta bandeja
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const isSelected = selectedInvoiceIds.has(inv.id);
                  const amountVES =
                    inv.currency === "VES"
                      ? inv.total_amount
                      : inv.total_amount * (inv.exchange_rate || 1);

                  return (
                    <tr
                      key={inv.id}
                      className={`hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors ${
                        isSelected
                          ? "bg-violet-50/40 dark:bg-violet-950/20"
                          : ""
                      }`}
                    >
                      <td className="py-3.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectInvoice(inv.id)}
                          className="w-4 h-4 rounded text-locatel-medio focus:ring-locatel-medio cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-neutral-900 dark:text-neutral-100">
                        <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[11px]">
                          {inv.company?.alias || getCompanyAlias(inv.company_id)}
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
                        {renderTypeBadge(inv.sap_document_type, inv.invoice_type)}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-600 dark:text-neutral-300">
                        {formatDate(inv.due_date)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                        {formatMoney(inv.total_amount, inv.currency)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-violet-700 dark:text-violet-400">
                        {formatMoney(amountVES, "VES")}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800/60">
                          <CheckCircle2 className="w-3 h-3" />
                          PROGRAMADO
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canExecutePayment && (
                            <button
                              type="button"
                              onClick={() => handleOpenPaymentSingle(inv)}
                              className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                              title="Liquidar / Registrar Pago Bancario"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          {canRevert && (
                            <button
                              type="button"
                              onClick={() => handleUnprogramSingle(inv.id)}
                              disabled={isUnprogramming}
                              className="p-1.5 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                              title="Desprogramar y restituir cupo"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedInvoiceAudit(inv)}
                            className="p-1.5 rounded-lg text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors cursor-pointer"
                            title="Ver trazabilidad y auditoría"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedInvoiceDetail(inv)}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                            title="Ver detalle del documento"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedInvoiceDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Detalle de Factura Programada N° {selectedInvoiceDetail.invoice_number}
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Tipo SAP: {selectedInvoiceDetail.sap_document_type} ({selectedInvoiceDetail.invoice_type})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoiceDetail(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-800">
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400">
                    Empresa
                  </span>
                  <p className="font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5">
                    {selectedInvoiceDetail.company?.name ||
                      getCompanyAlias(selectedInvoiceDetail.company_id)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400">
                    Estatus
                  </span>
                  <p className="font-bold text-violet-600 dark:text-violet-400 mt-0.5">
                    PROGRAMADO
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] uppercase font-bold text-neutral-400">
                    Proveedor
                  </span>
                  <p className="font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5">
                    {selectedInvoiceDetail.supplier?.rif} -{" "}
                    {selectedInvoiceDetail.supplier?.business_name}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <span className="text-[10px] uppercase font-bold text-neutral-400">
                    F. Emisión
                  </span>
                  <p className="font-medium text-neutral-800 dark:text-neutral-200 mt-0.5">
                    {formatDate(selectedInvoiceDetail.issue_date)}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <span className="text-[10px] uppercase font-bold text-neutral-400">
                    F. Vencimiento
                  </span>
                  <p className="font-medium text-neutral-800 dark:text-neutral-200 mt-0.5">
                    {formatDate(selectedInvoiceDetail.due_date)}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-2">
                <div className="flex justify-between items-center text-neutral-500">
                  <span>Monto Total:</span>
                  <span className="font-mono text-neutral-900 dark:text-neutral-100 font-bold">
                    {formatMoney(selectedInvoiceDetail.total_amount, selectedInvoiceDetail.currency)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceDetail(null)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <InvoiceAuditTrailModal
        isOpen={Boolean(selectedInvoiceAudit)}
        onClose={() => setSelectedInvoiceAudit(null)}
        invoice={selectedInvoiceAudit}
      />

      <ExecutePaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setInvoicesToPay([]);
        }}
        invoices={invoicesToPay}
        companyId={
          invoicesToPay.length > 0
            ? invoicesToPay[0].company_id
            : selectedCompanyId !== "ALL"
              ? selectedCompanyId
              : companies[0]?.id || ""
        }
        onSuccess={() => {
          setSelectedInvoiceIds(new Set());
          fetchScheduledInvoices();
        }}
      />
    </div>
  );
}

export function ScheduledInvoicesTableView(props: ScheduledInvoicesTableViewProps) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-neutral-400">Cargando facturas programadas...</div>}>
      <ScheduledInvoicesContent {...props} />
    </Suspense>
  );
}
