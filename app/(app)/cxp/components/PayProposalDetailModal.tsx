"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  CreditCard,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { fetchClient } from "@/lib/fetchClient";
import { ProposalDetailsResponse } from "../types";

interface PayProposalDetailModalProps {
  proposalId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  canExecutePayment?: boolean;
}

export function PayProposalDetailModal({
  proposalId,
  isOpen,
  onClose,
  onSuccess,
  canExecutePayment = true,
}: PayProposalDetailModalProps) {
  const [data, setData] = useState<ProposalDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && proposalId) {
      fetchDetails();
      setSearch("");
    } else {
      setData(null);
      setSelectedInvoiceIds(new Set());
    }
  }, [isOpen, proposalId]);

  const fetchDetails = async () => {
    if (!proposalId) return;
    setLoading(true);
    try {
      const res = await fetchClient(`/api/v1/cxp/proposals/${proposalId}`);
      if (!res.ok) {
        throw new Error("Error al obtener los detalles de la propuesta");
      }
      const json: ProposalDetailsResponse = await res.json();
      setData(json);
      if (Array.isArray(json.invoices)) {
        setSelectedInvoiceIds(new Set(json.invoices.map((inv) => inv.invoice_id)));
      }
    } catch (err: any) {
      toast.error(err.message || "Error al cargar los datos de la propuesta");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (val: number, cur: string = "VES") => {
    return (
      new Intl.NumberFormat("es-VE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(val || 0) +
      " " +
      cur
    );
  };

  const formatDate = (str?: string) => {
    if (!str) return "-";
    const parts = str.split("T")[0].split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return str;
  };

  const invoices = data?.invoices || [];

  const filteredInvoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter((inv) => {
      return (
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.control_number?.toLowerCase().includes(q) ||
        inv.supplier_name?.toLowerCase().includes(q) ||
        inv.supplier_rif?.toLowerCase().includes(q)
      );
    });
  }, [invoices, search]);

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
    if (selectedInvoiceIds.size === invoices.length) {
      setSelectedInvoiceIds(new Set());
    } else {
      setSelectedInvoiceIds(new Set(invoices.map((inv) => inv.invoice_id)));
    }
  };

  const { selectedTotalVES, selectedTotalUSD, selectedCount, unselectedCount } = useMemo(() => {
    let ves = 0;
    let usd = 0;
    let count = 0;
    for (const inv of invoices) {
      if (selectedInvoiceIds.has(inv.invoice_id)) {
        ves += inv.amount_ves || 0;
        usd += inv.amount_usd || 0;
        count++;
      }
    }
    return {
      selectedTotalVES: ves,
      selectedTotalUSD: usd,
      selectedCount: count,
      unselectedCount: invoices.length - count,
    };
  }, [invoices, selectedInvoiceIds]);

  const handleConfirmPayment = async () => {
    if (!proposalId) return;
    if (selectedCount === 0) {
      toast.error("Debe seleccionar al menos una factura para pagar");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetchClient(`/api/v1/cxp/proposals/${proposalId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_ids: Array.from(selectedInvoiceIds),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || "Error al procesar el pago de la propuesta");
      }

      toast.success(
        unselectedCount > 0
          ? `Pago confirmado por ${formatMoney(selectedTotalVES, "VES")}. Las ${unselectedCount} facturas desmarcadas retornaron a pendientes.`
          : `Propuesta liquidada exitosamente por ${formatMoney(selectedTotalVES, "VES")}.`
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Error al ejecutar el pago");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-4 bg-neutral-50/50 dark:bg-neutral-900/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-locatel-medio dark:bg-locatel-claro/95 text-white dark:text-text-white flex items-center justify-center shrink-0 shadow-xs">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                  Liquidación de Propuesta
                </h2>
                {data?.proposal?.code && (
                  <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-neutral-200/70 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold">
                    {data.proposal.code}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 uppercase">
                  <CheckCircle2 className="w-3 h-3" />
                  {data?.proposal?.status || "APROBADO"}
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                {data?.proposal?.company_name || "Empresa"} · Ejecución: {formatDate(data?.proposal?.execution_date)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-neutral-400">
            <RefreshCw className="w-8 h-8 animate-spin text-locatel-medio mb-3" />
            <span className="text-xs font-semibold">Cargando facturas de la propuesta...</span>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-neutral-100 dark:border-neutral-900 bg-white dark:bg-neutral-950 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar factura por número, control o proveedor..."
                  className="w-full pl-9 pr-3 py-1.5 border border-neutral-200 dark:border-neutral-800 focus:border-neutral-400 dark:focus:border-neutral-600 bg-neutral-50 dark:bg-neutral-900 rounded-lg text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
                <span className="text-neutral-500 text-[11px]">
                  Seleccionadas: <strong className="text-neutral-900 dark:text-neutral-100 font-mono">{selectedCount}</strong> / {invoices.length}
                </span>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                >
                  {selectedInvoiceIds.size === invoices.length ? "Deseleccionar Todas" : "Marcar Todas"}
                </button>
              </div>
            </div>

            {unselectedCount > 0 && (
              <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  Hay <strong>{unselectedCount}</strong> factura(s) desmarcada(s). Al confirmar, quedarán fuera de esta propuesta y regresarán automáticamente al estatus <strong>PENDIENTE</strong> para volver a ser programadas.
                </span>
              </div>
            )}

            <div className="overflow-y-auto flex-1 divide-y divide-neutral-100 dark:divide-neutral-900">
              <table className="w-full text-left text-xs text-neutral-600 dark:text-neutral-400">
                <thead className="sticky top-0 bg-neutral-50/90 dark:bg-neutral-900/90 backdrop-blur-xs text-[11px] font-semibold text-neutral-500 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800 z-10 whitespace-nowrap">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={invoices.length > 0 && selectedInvoiceIds.size === invoices.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="py-2.5 px-3">Factura</th>
                    <th className="py-2.5 px-3">Proveedor</th>
                    <th className="py-2.5 px-3">Emisión / Vence</th>
                    <th className="py-2.5 px-3 text-right">Monto Original</th>
                    <th className="py-2.5 px-3 text-right">Monto VES</th>
                    <th className="py-2.5 px-3 text-right">Monto USD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-neutral-400 text-xs">
                        No se encontraron facturas coincidentes
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const isChecked = selectedInvoiceIds.has(inv.invoice_id);
                      return (
                        <tr
                          key={inv.invoice_id}
                          onClick={() => toggleSelectInvoice(inv.invoice_id)}
                          className={`hover:bg-neutral-50/80 dark:hover:bg-neutral-900/50 cursor-pointer transition-colors ${!isChecked ? "opacity-50 bg-neutral-50/30 dark:bg-neutral-950" : ""
                            }`}
                        >
                          <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelectInvoice(inv.invoice_id)}
                              className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap font-medium text-neutral-900 dark:text-neutral-100">
                            <div className="font-mono text-xs font-semibold">{inv.invoice_number}</div>
                            {inv.control_number && (
                              <div className="text-[10px] text-neutral-400 font-mono">
                                Ctrl: {inv.control_number}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-neutral-800 dark:text-neutral-200 line-clamp-1">
                              {inv.supplier_name}
                            </div>
                            <div className="text-[10px] text-neutral-400 font-mono">
                              {inv.supplier_rif}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap text-[11px] text-neutral-500 font-mono">
                            <div>{formatDate(inv.issue_date)}</div>
                            <div className="text-neutral-400 text-[10px]">Vence: {formatDate(inv.due_date)}</div>
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono text-neutral-700 dark:text-neutral-300 tabular-nums">
                            {formatMoney(inv.total_amount, inv.currency || "VES")}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
                            {formatMoney(inv.amount_ves, "VES")}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono text-neutral-500 dark:text-neutral-400 tabular-nums">
                            ${formatMoney(inv.amount_usd, "USD")}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-neutral-500 tracking-wider block">
                    Total a Liquidar (VES)
                  </span>
                  <span className="text-base sm:text-lg font-bold font-mono text-neutral-900 dark:text-neutral-100 tabular-nums">
                    Bs. {formatMoney(selectedTotalVES, "VES")}
                  </span>
                </div>
                <div className="border-l border-neutral-200 dark:border-neutral-800 pl-4">
                  <span className="text-[10px] uppercase font-semibold text-neutral-500 tracking-wider block">
                    Equivalente USD
                  </span>
                  <span className="text-sm font-semibold font-mono text-neutral-600 dark:text-neutral-400 tabular-nums">
                    ${formatMoney(selectedTotalUSD, "USD")}
                  </span>
                </div>
                <div className="border-l border-neutral-200 dark:border-neutral-800 pl-4 text-xs text-neutral-500">
                  <span>Facturas a pagar: </span>
                  <strong className="text-neutral-900 dark:text-neutral-100 font-mono">{selectedCount}</strong>
                </div>
              </div>

              <div className="flex items-center gap-2.5 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                {canExecutePayment && (
                  <button
                    type="button"
                    onClick={handleConfirmPayment}
                    disabled={isSubmitting || selectedCount === 0}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-locatel-medio text-white hover:bg-locatel-medio/95 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {selectedCount === invoices.length
                        ? "Confirmar Pago Total"
                        : `Confirmar Pago (${selectedCount})`}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

