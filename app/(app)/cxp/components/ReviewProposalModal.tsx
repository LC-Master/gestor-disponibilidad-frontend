"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileSpreadsheet,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { fetchClient } from "@/lib/fetchClient";
import { Company } from "@/app/(app)/tesoreria/types";
import { ProposalDetailsResponse } from "../types";
import { SupplierDetailModal } from "./SupplierDetailModal";
import { InvoiceDetailModal } from "./InvoiceDetailModal";

interface ReviewProposalModalProps {
  proposalId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  canReview: boolean;
  companies?: Company[];
}

export function ReviewProposalModal({
  proposalId,
  isOpen,
  onClose,
  onSuccess,
  canReview,
  companies = [],
}: ReviewProposalModalProps) {
  const [data, setData] = useState<ProposalDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && proposalId) {
      fetchDetails();
      setShowRejectInput(false);
      setRejectionReason("");
      setShowCancelModal(false);
      setCancelReason("");
      setSelectedSupplierId(null);
      setSelectedInvoiceId(null);
    } else {
      setData(null);
      setShowCancelModal(false);
      setCancelReason("");
      setSelectedSupplierId(null);
      setSelectedInvoiceId(null);
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

      if (!json.daily_availability && json.proposal?.company_id && json.proposal?.execution_date) {
        try {
          const availRes = await fetchClient(
            `/api/v1/cxp/availability?company_id=${json.proposal.company_id}&date=${json.proposal.execution_date}`
          );
          if (availRes.ok) {
            const availData = await availRes.json();
            if (availData) {
              setData((prev) => (prev ? {
                ...prev,
                daily_availability: {
                  id: "",
                  company_id: json.proposal.company_id,
                  availability_date: json.proposal.execution_date,
                  exchange_rate: availData.exchange_rate,
                  total_liquidity: 0,
                  supplier_amount: availData.supplier_amount,
                  payroll_amount: 0,
                  tax_amount: 0,
                  fx_amount: 0,
                  refund_amount: 0,
                  status: availData.status,
                }
              } : null));
            }
          }
        } catch { }
      }
    } catch (err: any) {
      toast.error(err.message || "Error al cargar la propuesta");
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
      }).format(val) +
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

  const filteredInvoices = useMemo(() => {
    if (!data?.invoices) return [];
    if (!search.trim()) return data.invoices;
    const s = search.toLowerCase().trim();
    return data.invoices.filter(
      (inv) =>
        inv.invoice_number.toLowerCase().includes(s) ||
        (inv.control_number && inv.control_number.toLowerCase().includes(s)) ||
        inv.supplier_rif.toLowerCase().includes(s) ||
        inv.supplier_name.toLowerCase().includes(s)
    );
  }, [data?.invoices, search]);

  if (!isOpen || !proposalId) return null;

  const proposal = data?.proposal;
  const availability = data?.daily_availability;
  const hasTreasuryApproved = availability?.status === "APROBADO";
  const supplierQuota = availability?.supplier_amount || 0;
  const consumedQuota = data?.consumed_quota || 0;
  const freeQuotaAvailable = hasTreasuryApproved ? Math.max(0, supplierQuota - consumedQuota) : 0;
  const proposedAmountVES = proposal?.total_amount_ves || 0;
  const remnantAfterApproval = freeQuotaAvailable - proposedAmountVES;
  const fitsInQuota = hasTreasuryApproved && proposedAmountVES <= freeQuotaAvailable;
  const excessAmount = proposedAmountVES - freeQuotaAvailable;

  const handleApprove = async () => {
    if (!canReview || !proposal) return;
    if (!hasTreasuryApproved) {
      toast.error("Tesorería no tiene posición diaria aprobada para esta fecha.");
      return;
    }
    if (!fitsInQuota) {
      toast.error("La propuesta excede el cupo disponible asignado por Tesorería.");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetchClient(`/api/v1/cxp/proposals/${proposal.id}/approve`, {
        method: "POST",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Error al aprobar la propuesta");
      }

      toast.success("Propuesta aprobada exitosamente y facturas programadas para pago.");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Error al procesar la aprobación");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!canReview || !proposal) return;
    if (!rejectionReason.trim()) {
      toast.error("Debe ingresar el motivo de rechazo.");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetchClient(`/api/v1/cxp/proposals/${proposal.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectionReason.trim() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Error al rechazar la propuesta");
      }

      toast.success("Propuesta rechazada y facturas devueltas al estatus PENDIENTE.");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Error al procesar el rechazo");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!canReview || !proposal) return;

    setIsProcessing(true);
    try {
      const res = await fetchClient(`/api/v1/cxp/proposals/${proposal.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason.trim() || undefined }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Error al anular la propuesta");
      }

      toast.success("Propuesta anulada exitosamente. Facturas devueltas a Pendiente y cupo liberado.");
      setShowCancelModal(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Error al anular la propuesta");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs animate-in fade-in">
        <div className="relative w-full max-w-4xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/70 dark:bg-neutral-800/40">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-locatel-medio/10 text-locatel-medio border border-locatel-medio/20">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 font-mono">
                    {proposal?.code || "Cargando..."}
                  </h2>
                  {proposal && (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${proposal.status === "PENDIENTE"
                          ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60"
                          : proposal.status === "APROBADO"
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                            : proposal.status === "ANULADO"
                              ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700"
                              : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60"
                        }`}
                    >
                      {proposal.status === "PENDIENTE" && <Clock className="w-3 h-3" />}
                      {proposal.status === "APROBADO" && <CheckCircle2 className="w-3 h-3" />}
                      {proposal.status === "RECHAZADO" && <XCircle className="w-3 h-3" />}
                      {proposal.status === "ANULADO" && <XCircle className="w-3 h-3" />}
                      {proposal.status}
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Creada por <strong className="text-neutral-700 dark:text-neutral-300">{proposal?.creator_name || "-"}</strong> el{" "}
                  {formatDate(proposal?.created_at)} • Para ejecución el{" "}
                  <strong className="text-neutral-700 dark:text-neutral-300 font-mono">{formatDate(proposal?.execution_date)}</strong>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            {loading ? (
              <div className="py-16 text-center text-neutral-400 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-locatel-medio" />
                <span className="text-xs font-semibold">Cargando desglose de la propuesta...</span>
              </div>
            ) : (
              <>
                {proposal?.notes && (
                  <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/60 text-xs">
                    <span className="font-bold text-neutral-500 dark:text-neutral-400 block mb-0.5">
                      Notas del Analista:
                    </span>
                    <p className="text-neutral-800 dark:text-neutral-200 italic">{proposal.notes}</p>
                  </div>
                )}

                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/70 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 dark:border-neutral-700 pb-2.5">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-locatel-medio" />
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                        Verificación en Tiempo Real contra Tesorería
                      </span>
                    </div>

                    {hasTreasuryApproved ? (
                      fitsInQuota ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Dentro de Cupo Aprobado
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Excede cupo de Tesorería por Bs. {formatMoney(excessAmount, "VES")}
                        </span>
                      )
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 inline-flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Sin Cierre Diario Aprobado por Tesorería
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                        Cupo Aprobado por Tesorería
                      </span>
                      <span className="text-sm font-extrabold font-mono text-neutral-900 dark:text-neutral-100">
                        Bs. {formatMoney(supplierQuota, "VES")}
                      </span>
                      <span className="text-[10px] text-neutral-400 block mt-0.5">
                        {hasTreasuryApproved ? "Posición diaria aprobada" : "Pendiente de aprobación"}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                        Total Exigido por esta Propuesta
                      </span>
                      <span className="text-sm font-extrabold font-mono text-amber-600 dark:text-amber-400">
                        Bs. {formatMoney(proposedAmountVES, "VES")}
                      </span>
                      <span className="text-[10px] text-neutral-400 block mt-0.5">
                        ≈ ${formatMoney(proposal?.total_amount_usd || 0, "USD")} ({proposal?.invoice_count} facturas)
                      </span>
                    </div>

                    <div
                      className={`p-3 rounded-xl border ${remnantAfterApproval >= 0 && hasTreasuryApproved
                          ? "bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                          : "bg-rose-500/5 dark:bg-rose-950/20 border-rose-500/30 text-rose-800 dark:text-rose-300"
                        }`}
                    >
                      <span className="text-[10px] uppercase font-bold block mb-1 opacity-80">
                        Cupo Libre Remanente tras Aprobar
                      </span>
                      <span className="text-sm font-extrabold font-mono">
                        Bs. {formatMoney(remnantAfterApproval, "VES")}
                      </span>
                      <span className="text-[10px] block mt-0.5 opacity-80">
                        {remnantAfterApproval >= 0
                          ? "Saldo disponible restante"
                          : "Déficit sobre el cupo del día"}
                      </span>
                    </div>
                  </div>
                </div>

                {proposal?.status !== "PENDIENTE" && (
                  <div
                    className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${proposal?.status === "APROBADO"
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                        : proposal?.status === "ANULADO"
                          ? "bg-neutral-100 dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
                          : "bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-300"
                      }`}
                  >
                    {proposal?.status === "APROBADO" ? (
                      <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                    )}
                    <div className="space-y-1">
                      <p className="font-bold">
                        Propuesta {proposal?.status === "APROBADO" ? "aprobada formalmente" : proposal?.status === "ANULADO" ? "anulada" : "rechazada"} por{" "}
                        {proposal?.reviewer_name || "Coordinador"} el {formatDate(proposal?.reviewed_at)}
                      </p>
                      {proposal?.rejection_reason && (
                        <p className="text-xs">
                          <strong>Motivo:</strong> {proposal.rejection_reason}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      Desglose de Facturas Incluidas ({data?.invoices?.length || 0})
                    </span>

                    <div className="relative w-full sm:w-72">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Filtrar por N°, Control o RIF..."
                        className="w-full pl-8 pr-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto max-h-64">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-neutral-50 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300 font-bold uppercase tracking-wider text-[10px] border-b border-neutral-200 dark:border-neutral-800 sticky top-0 whitespace-nowrap">
                          <tr>
                            <th className="py-2.5 px-3">Proveedor</th>
                            <th className="py-2.5 px-3">N° Factura</th>
                            <th className="py-2.5 px-3 text-center">N° OC</th>
                            <th className="py-2.5 px-3">Vencimiento</th>
                            <th className="py-2.5 px-3 text-right">Monto Original</th>
                            <th className="py-2.5 px-3 text-right">Monto VES</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 whitespace-nowrap">
                          {filteredInvoices.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-neutral-400 text-xs">
                                No hay facturas coincidentes con la búsqueda
                              </td>
                            </tr>
                          ) : (
                            filteredInvoices.map((inv) => (
                              <tr
                                key={inv.invoice_id}
                                className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/30 transition-colors"
                              >
                                <td className="py-2 px-3 max-w-xs truncate">
                                  {inv.supplier_id ? (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedSupplierId(inv.supplier_id)}
                                      className="group inline-flex items-center gap-1.5 text-left text-neutral-900 dark:text-neutral-100 hover:text-locatel-medio dark:hover:text-emerald-400 transition-colors cursor-pointer max-w-full"
                                      title="Ver ficha y cuentas bancarias del proveedor"
                                    >
                                      <span className="font-bold font-mono text-[11px] group-hover:underline underline-offset-2 shrink-0">
                                        {inv.supplier_rif}
                                      </span>
                                      <span className="text-neutral-500 dark:text-neutral-400 group-hover:text-locatel-medio dark:group-hover:text-emerald-400 truncate">
                                        {inv.supplier_name}
                                      </span>
                                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-locatel-medio dark:text-emerald-400" />
                                    </button>
                                  ) : (
                                    <>
                                      <span className="font-bold font-mono text-[11px] text-neutral-900 dark:text-neutral-100">
                                        {inv.supplier_rif}
                                      </span>{" "}
                                      <span className="text-neutral-500 dark:text-neutral-400 truncate">
                                        {inv.supplier_name}
                                      </span>
                                    </>
                                  )}
                                </td>
                                <td className="py-2 px-3 font-semibold text-neutral-900 dark:text-neutral-100">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedInvoiceId(inv.invoice_id)}
                                      className="group inline-flex items-center gap-1 font-mono text-locatel-medio hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors cursor-pointer"
                                      title="Ver datos y desglose de la factura"
                                    >
                                      <span className="underline underline-offset-2 font-bold">{inv.invoice_number}</span>
                                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                    </button>
                                    {inv.is_indexed && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                        INDEXADA
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-center font-mono text-[11px] text-neutral-600 dark:text-neutral-400">
                                  {inv.purchase_order_number || "-"}
                                </td>
                                <td className="py-2 px-3 font-mono text-[11px] text-neutral-600 dark:text-neutral-400">
                                  {formatDate(inv.due_date)}
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-semibold text-neutral-700 dark:text-neutral-300">
                                  <div>{formatMoney(inv.total_amount, inv.currency)}</div>
                                  {inv.is_indexed && inv.exchange_rate && inv.exchange_rate > 0 && (
                                    <div className="text-[10px] text-neutral-400 font-normal">
                                      Tasa Emisión: {inv.exchange_rate.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-neutral-900 dark:text-neutral-100">
                                  <div>Bs. {formatMoney(inv.amount_ves, "VES")}</div>
                                  {inv.is_indexed && inv.original_amount_ves && (
                                    <div className="text-[10px] text-neutral-400 font-normal">
                                      Ref: Bs. {formatMoney(inv.original_amount_ves, "VES")}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        <tfoot className="bg-neutral-50 dark:bg-neutral-800/80 font-bold border-t border-neutral-200 dark:border-neutral-800 text-[11px] sticky bottom-0">
                          <tr>
                            <td colSpan={4} className="py-2 px-3 text-neutral-600 dark:text-neutral-400">
                              Total de esta propuesta ({filteredInvoices.length} docs):
                            </td>
                            <td className="py-2 px-3 text-right text-neutral-600 dark:text-neutral-400 font-mono">
                              ≈ ${formatMoney(proposal?.total_amount_usd || 0, "USD")}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-extrabold">
                              Bs. {formatMoney(proposedAmountVES, "VES")}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>

                {canReview && proposal?.status === "PENDIENTE" && (
                  <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
                    {showRejectInput ? (
                      <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2">
                        <label className="block text-xs font-bold text-rose-700 dark:text-rose-300">
                          Motivo de Rechazo Formal <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          rows={2}
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Indique la causa por la cual se rechaza la propuesta (falta de cupo, ajuste de fecha, etc.)..."
                          className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                        />
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setShowRejectInput(false)}
                            disabled={isProcessing}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleReject}
                            disabled={isProcessing || !rejectionReason.trim()}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <ThumbsDown className="w-3.5 h-3.5" />
                            )}
                            <span>Confirmar Rechazo</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setShowRejectInput(true)}
                          disabled={isProcessing}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                          <span>Rechazar Propuesta</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleApprove}
                          disabled={!fitsInQuota || !hasTreasuryApproved || isProcessing}
                          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-locatel-medio hover:bg-locatel-oscuro text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          title={
                            !hasTreasuryApproved
                              ? "Tesorería no ha aprobado la disponibilidad para esta fecha"
                              : !fitsInQuota
                                ? "El monto excede el cupo disponible asignado por Tesorería"
                                : "Aprobar lote y cambiar facturas a PROGRAMADO"
                          }
                        >
                          {isProcessing ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <ThumbsUp className="w-3.5 h-3.5" />
                          )}
                          <span>Aprobar y Programar Lote</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {canReview && proposal?.status === "APROBADO" && (
                  <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowCancelModal(true)}
                      disabled={isProcessing}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Anular Propuesta Aprobada</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showCancelModal && proposal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Anular Propuesta de Pago
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                  {proposal.code}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-800 dark:text-rose-300 space-y-1.5">
              <p className="font-semibold">
                ¿Está seguro de que desea invalidar o anular esta propuesta?
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] opacity-90">
                <li>La propuesta pasará a estatus <strong>ANULADO</strong>.</li>
                <li>Todas las facturas volverán a estatus <strong>PENDIENTE</strong> para poder ser incluidas en futuras propuestas.</li>
                <li>El cupo de Tesorería retenido se liberará automáticamente.</li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Motivo de la anulación (opcional)
              </label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Especifique el motivo de la anulación..."
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason("");
                }}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                <span>Confirmar Anulación</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <SupplierDetailModal
        isOpen={Boolean(selectedSupplierId)}
        onClose={() => setSelectedSupplierId(null)}
        supplierId={selectedSupplierId}
        companies={companies}
      />

      <InvoiceDetailModal
        isOpen={Boolean(selectedInvoiceId)}
        onClose={() => setSelectedInvoiceId(null)}
        invoiceId={selectedInvoiceId}
        onOpenSupplier={(supId) => {
          setSelectedInvoiceId(null);
          setSelectedSupplierId(supId);
        }}
      />
    </>
  );
}
