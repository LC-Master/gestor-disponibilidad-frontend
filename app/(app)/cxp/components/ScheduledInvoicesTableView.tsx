"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  RefreshCw,
  Search,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { fetchClient } from "@/lib/fetchClient";
import { Company } from "@/app/(app)/tesoreria/types";
import { PaymentProposal, ProposalStatus } from "../types";
import { PayProposalDetailModal } from "./PayProposalDetailModal";

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

export function ScheduledInvoicesTableView({ companies, user }: ScheduledInvoicesTableViewProps) {
  const [proposals, setProposals] = useState<PaymentProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingProposalId, setPayingProposalId] = useState<string | null>(null);

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("APROBADO");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [detailModalProposalId, setDetailModalProposalId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [proposalToPay, setProposalToPay] = useState<PaymentProposal | null>(null);
  const [proposalToCancel, setProposalToCancel] = useState<PaymentProposal | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

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

  const canExecutePayment =
    hasPermission("cxp.payments.execute") || isAdmin;

  const canReview =
    hasPermission("cxp.proposals.review") ||
    hasPermission("cxp.proposals.create") ||
    isAdmin;

  const fetchProposals = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCompanyId && selectedCompanyId !== "ALL") {
        params.append("company_id", selectedCompanyId);
      }
      if (selectedStatus && selectedStatus !== "TODAS") {
        params.append("status", selectedStatus);
      }
      if (startDate) {
        params.append("start_date", startDate);
      }
      if (endDate) {
        params.append("end_date", endDate);
      }

      const res = await fetchClient(`/api/v1/cxp/proposals?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Error al obtener las propuestas de pago");
      }
      const data = await res.json();
      setProposals(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err.message || "Error al cargar propuestas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, [selectedCompanyId, selectedStatus, startDate, endDate]);

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

  const filteredProposals = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return proposals;
    return proposals.filter((p) => {
      return (
        p.code?.toLowerCase().includes(q) ||
        p.company_name?.toLowerCase().includes(q) ||
        p.creator_name?.toLowerCase().includes(q) ||
        p.notes?.toLowerCase().includes(q)
      );
    });
  }, [proposals, search]);

  const { totalCount, totalVES, totalUSD } = useMemo(() => {
    let ves = 0;
    let usd = 0;
    for (const p of filteredProposals) {
      ves += p.total_amount_ves || 0;
      usd += p.total_amount_usd || 0;
    }
    return {
      totalCount: filteredProposals.length,
      totalVES: ves,
      totalUSD: usd,
    };
  }, [filteredProposals]);

  const handleConfirmPayModal = async () => {
    if (!proposalToPay) return;
    setPayingProposalId(proposalToPay.id);
    try {
      const res = await fetchClient(`/api/v1/cxp/proposals/${proposalToPay.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || "Error al procesar el pago de la propuesta");
      }

      toast.success(`Propuesta ${proposalToPay.code} pagada exitosamente. Todas sus facturas asociadas han sido liquidadas.`);
      setProposalToPay(null);
      fetchProposals();
    } catch (err: any) {
      toast.error(err.message || "Error al pagar la propuesta");
    } finally {
      setPayingProposalId(null);
    }
  };

  const handleConfirmCancelModal = async () => {
    if (!proposalToCancel) return;
    setIsCancelling(true);
    try {
      const res = await fetchClient(`/api/v1/cxp/proposals/${proposalToCancel.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || "Error al liberar la propuesta");
      }

      toast.success(`Propuesta ${proposalToCancel.code} anulada exitosamente. Las facturas han retornado a PENDIENTE y el cupo de Tesorería ha sido liberado.`);
      setProposalToCancel(null);
      setCancelReason("");
      fetchProposals();
    } catch (err: any) {
      toast.error(err.message || "Error al liberar la propuesta");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleOpenDetail = (id: string) => {
    setDetailModalProposalId(id);
    setIsDetailModalOpen(true);
  };

  const renderStatusBadge = (status: ProposalStatus | string) => {
    switch (status) {
      case "PAGADA":
      case "PAGADO":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
            <CheckCircle2 className="w-3 h-3" />
            PAGADA
          </span>
        );
      case "APROBADO":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
            <Clock className="w-3 h-3" />
            POR PAGAR (APROBADA)
          </span>
        );
      case "PENDIENTE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
            <Clock className="w-3 h-3" />
            PENDIENTE REVISIÓN
          </span>
        );
      case "RECHAZADO":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60">
            <XCircle className="w-3 h-3" />
            RECHAZADO
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-neutral-950 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-3.5 px-4 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
            Propuestas Mostradas
          </span>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-2xl font-bold font-mono text-neutral-900 dark:text-neutral-100 tabular-nums">
              {totalCount}
            </span>
            <span className="text-xs text-neutral-400">registros</span>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-950 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-3.5 px-4 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
            Total a Liquidar (VES)
          </span>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-xl font-bold font-mono text-neutral-900 dark:text-neutral-100 tabular-nums">
              Bs. {formatMoney(totalVES, "VES")}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-950 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-3.5 px-4 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
            Equivalente (USD)
          </span>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-xl font-bold font-mono text-neutral-900 dark:text-neutral-100 tabular-nums">
              ${formatMoney(totalUSD, "USD")}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-950 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-3 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código de propuesta, empresa, creador o notas..."
              className="w-full pl-9 pr-3 py-2 border border-neutral-200 dark:border-neutral-800 focus:border-neutral-400 dark:focus:border-neutral-600 bg-white dark:bg-neutral-950 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => fetchProposals()}
              disabled={loading}
              className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              title="Actualizar propuestas"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-neutral-600 dark:text-neutral-300" : ""}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2.5 border-t border-neutral-100 dark:border-neutral-900 text-xs">
          <div className="min-w-0">
            <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1 truncate">
              Empresa
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full min-w-0 px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-lg text-xs font-medium text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-neutral-400 cursor-pointer truncate"
            >
              <option value="ALL">Todas las Empresas</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code ? `${c.code} · ${c.name}` : c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1 truncate">
              Estatus
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full min-w-0 px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-lg text-xs font-medium text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-neutral-400 cursor-pointer truncate"
            >
              <option value="APROBADO">Por Pagar (Aprobadas)</option>
              <option value="PAGADA">Pagadas</option>
              <option value="TODAS">Todas las Propuestas</option>
              <option value="PENDIENTE">Pendientes de Aprobación</option>
            </select>
          </div>

          <div className="min-w-0">
            <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1 truncate">
              Ejecución Desde
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full min-w-0 px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-lg text-xs font-mono text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-neutral-400 cursor-pointer"
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center justify-between mb-1 min-h-3.75">
              <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider truncate">
                Ejecución Hasta
              </label>
              {(startDate || endDate || selectedCompanyId !== "ALL" || selectedStatus !== "APROBADO") && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCompanyId("ALL");
                    setSelectedStatus("APROBADO");
                    setStartDate("");
                    setEndDate("");
                    setSearch("");
                  }}
                  className="text-[10px] font-medium text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors cursor-pointer shrink-0 ml-1"
                >
                  Limpiar
                </button>
              )}
            </div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full min-w-0 px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-lg text-xs font-mono text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-neutral-400 cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="border border-neutral-200/80 dark:border-neutral-800 rounded-xl overflow-hidden shadow-2xs bg-white dark:bg-neutral-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-600 dark:text-neutral-400">
            <thead className="bg-neutral-50/70 dark:bg-neutral-900/40 border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap">
              <tr>
                <th className="py-3 px-3">Código</th>
                <th className="py-3 px-3">Empresa</th>
                <th className="py-3 px-3">Fecha Ejecución</th>
                <th className="py-3 px-3 text-center">Facturas</th>
                <th className="py-3 px-3 text-right">Monto Total VES</th>
                <th className="py-3 px-3 text-right">Monto Total USD</th>
                <th className="py-3 px-3 text-center">Estatus</th>
                <th className="py-3 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-neutral-400 text-xs">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-locatel-medio" />
                    <span>Cargando propuestas de pago...</span>
                  </td>
                </tr>
              ) : filteredProposals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-neutral-400 text-xs">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2 text-neutral-300 dark:text-neutral-700" />
                    <span>No se encontraron propuestas con los criterios seleccionados</span>
                  </td>
                </tr>
              ) : (
                filteredProposals.map((p) => {
                  const isPaid = p.status === "PAGADA" || p.status === "PAGADO";

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-neutral-50/70 dark:hover:bg-neutral-900/40 transition-colors"
                    >
                      <td className="py-3 px-3 font-semibold text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs">{p.code}</span>
                          {p.has_indexed_invoices && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
                              INDEXADA
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-neutral-400 font-sans">
                          Creado por: {p.creator_name || "-"}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-neutral-800 dark:text-neutral-200">
                        <div className="font-medium line-clamp-1">{p.company_name}</div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-neutral-600 dark:text-neutral-400">
                        {formatDate(p.execution_date)}
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 font-semibold text-neutral-800 dark:text-neutral-200">
                          {p.invoice_count}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap font-mono font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                        {formatMoney(p.total_amount_ves, "VES")}
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap font-mono text-neutral-500 dark:text-neutral-400 tabular-nums">
                        ${formatMoney(p.total_amount_usd, "USD")}
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {renderStatusBadge(p.status)}
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(p.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-neutral-500" />
                            <span>Ver Detalle</span>
                          </button>

                          {!isPaid && canReview && (
                            <button
                              type="button"
                              onClick={() => {
                                setCancelReason("");
                                setProposalToCancel(p);
                              }}
                              disabled={payingProposalId === p.id || isCancelling}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                              title="Liberar propuesta e invalidar lote"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>Liberar</span>
                            </button>
                          )}

                          {!isPaid && canExecutePayment && (
                            <button
                              type="button"
                              onClick={() => setProposalToPay(p)}
                              disabled={payingProposalId === p.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {payingProposalId === p.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Wallet className="w-3.5 h-3.5" />
                              )}
                              <span>Pagar</span>
                            </button>
                          )}
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

      <PayProposalDetailModal
        proposalId={detailModalProposalId}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setDetailModalProposalId(null);
        }}
        onSuccess={() => {
          fetchProposals();
        }}
        canExecutePayment={canExecutePayment}
      />

      {proposalToPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    Confirmar Pago de Propuesta
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                      {proposalToPay.code}
                    </span>
                    {proposalToPay.has_indexed_invoices && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
                        INDEXADA
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProposalToPay(null)}
                disabled={Boolean(payingProposalId)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-900/60 rounded-xl p-4 border border-neutral-200/70 dark:border-neutral-800/80 space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-neutral-200/50 dark:border-neutral-800/50">
                <span className="text-neutral-500">Empresa:</span>
                <span className="font-medium text-neutral-800 dark:text-neutral-200 text-right truncate max-w-60">
                  {proposalToPay.company_name}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-neutral-200/50 dark:border-neutral-800/50">
                <span className="text-neutral-500">Fecha de Ejecución:</span>
                <span className="font-mono text-neutral-800 dark:text-neutral-200">
                  {formatDate(proposalToPay.execution_date)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-neutral-200/50 dark:border-neutral-800/50">
                <span className="text-neutral-500">Cantidad de Facturas:</span>
                <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100 px-2 py-0.5 rounded bg-neutral-200/60 dark:bg-neutral-800">
                  {proposalToPay.invoice_count} facturas
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-neutral-200/50 dark:border-neutral-800/50">
                <span className="text-neutral-500">Equivalente USD:</span>
                <span className="font-mono text-neutral-700 dark:text-neutral-300">
                  ${formatMoney(proposalToPay.total_amount_usd, "USD")}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1.5">
                <span className="text-neutral-900 dark:text-neutral-100 font-semibold">Total a Liquidar:</span>
                <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                  Bs. {formatMoney(proposalToPay.total_amount_ves, "VES")}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Esta acción registrará la propuesta como <strong>PAGADA</strong> y pasará automáticamente todas sus facturas al estatus <strong>PAGADA</strong>.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setProposalToPay(null)}
                disabled={Boolean(payingProposalId)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPayModal}
                disabled={Boolean(payingProposalId)}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {payingProposalId ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Confirmar y Pagar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {proposalToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    Liberar Propuesta de Pago
                  </h3>
                  <p className="text-xs text-neutral-500 font-mono">
                    {proposalToCancel.code} · {proposalToCancel.company_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProposalToCancel(null)}
                disabled={isCancelling}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>¿Estás seguro de invalidar esta propuesta?</span>
              </div>
              <p className="text-[11px] leading-relaxed text-rose-700 dark:text-rose-400 pl-6">
                Todas las <strong>{proposalToCancel.invoice_count} facturas</strong> volverán de inmediato a la lista de <strong>Facturas Pendientes</strong> y el cupo reservado en Tesorería se liberará para el día.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Motivo de Anulación (opcional):
              </label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Escribe el motivo de la anulación (cambio de prioridad, renegociación, etc.)..."
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:border-neutral-400 dark:focus:border-neutral-600 rounded-xl text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setProposalToCancel(null)}
                disabled={isCancelling}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Conservar Propuesta
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelModal}
                disabled={isCancelling}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isCancelling ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Ban className="w-4 h-4" />
                )}
                <span>Confirmar Anulación</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
