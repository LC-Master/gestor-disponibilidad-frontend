"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Eye,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { fetchClient } from "@/lib/fetchClient";
import { Company } from "@/app/(app)/tesoreria/types";
import { PaymentProposal, ProposalStatus } from "../types";
import { ReviewProposalModal } from "./ReviewProposalModal";

interface UserProfile {
  id: string;
  name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  roles?: string[];
  permissions?: string[];
}

interface ProposalsTableViewProps {
  companies: Company[];
  user?: UserProfile | null;
}

export function ProposalsTableView({ companies, user }: ProposalsTableViewProps) {
  const [proposals, setProposals] = useState<PaymentProposal[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("TODAS");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [reviewProposalId, setReviewProposalId] = useState<string | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

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

  const canReview = hasPermission("cxp.proposals.review") || isAdmin;

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

      const res = await fetchClient(`/api/cxp/proposals?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Error al obtener el listado de propuestas de pago");
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

  const renderStatusBadge = (status: ProposalStatus) => {
    switch (status) {
      case "PENDIENTE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
            <Clock className="w-3 h-3" />
            PENDIENTE
          </span>
        );
      case "APROBADO":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
            <CheckCircle2 className="w-3 h-3" />
            APROBADO
          </span>
        );
      case "RECHAZADO":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60">
            <XCircle className="w-3 h-3" />
            RECHAZADO
          </span>
        );
      case "ANULADO":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
            <XCircle className="w-3 h-3" />
            ANULADO
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const handleOpenReview = (id: string) => {
    setReviewProposalId(id);
    setIsReviewOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-locatel-medio" />
            <span>Bandeja de Propuestas de Pago</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Revisión, auditoría y aprobación formal de lotes de pago contra cupo de Tesorería
          </p>
        </div>

        <button
          onClick={() => fetchProposals()}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-locatel-medio" : ""}`} />
          <span>Refrescar</span>
        </button>
      </div>

      <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
              Empresa
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40 cursor-pointer"
            >
              <option value="ALL">Todas las Empresas</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code ? `${c.code} - ${c.name}` : c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
              Estatus
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40 cursor-pointer"
            >
              <option value="TODAS">Todos los Estatus</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="APROBADO">Aprobado</option>
              <option value="RECHAZADO">Rechazado</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
              Ejecución Desde
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
              Ejecución Hasta
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-600 dark:text-neutral-400">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300 font-bold uppercase tracking-wider text-[11px] border-b border-neutral-200 dark:border-neutral-800 whitespace-nowrap">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">F. Ejecución</th>
                <th className="py-3 px-4">Empresa</th>
                <th className="py-3 px-4">Analista Creador</th>
                <th className="py-3 px-4 text-center">Facturas</th>
                <th className="py-3 px-4 text-right">Total USD</th>
                <th className="py-3 px-4 text-right">Total VES</th>
                <th className="py-3 px-4 text-center">Estatus</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 whitespace-nowrap">
              {loading && proposals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-locatel-medio" />
                      <span>Cargando propuestas de pago...</span>
                    </div>
                  </td>
                </tr>
              ) : proposals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
                      <span>No se encontraron propuestas con los filtros seleccionados</span>
                    </div>
                  </td>
                </tr>
              ) : (
                proposals.map((prop) => (
                  <tr
                    key={prop.id}
                    className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/30 transition-colors"
                  >
                    <td className="py-3 px-4 font-bold font-mono text-neutral-900 dark:text-neutral-100">
                      {prop.code}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                      {formatDate(prop.execution_date)}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-neutral-700 dark:text-neutral-300">
                      {prop.company_name || "-"}
                    </td>
                    <td className="py-3 px-4 font-semibold text-neutral-900 dark:text-neutral-100">
                      {prop.creator_name || "-"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 font-bold font-mono text-[11px] text-neutral-700 dark:text-neutral-300">
                        {prop.invoice_count}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-neutral-700 dark:text-neutral-300">
                      ≈ ${formatMoney(prop.total_amount_usd, "USD")}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-extrabold text-neutral-900 dark:text-neutral-100">
                      Bs. {formatMoney(prop.total_amount_ves, "VES")}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {renderStatusBadge(prop.status)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenReview(prop.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-locatel-medio/10 hover:bg-locatel-medio/20 text-locatel-medio dark:text-emerald-400 font-semibold text-xs transition-colors cursor-pointer"
                        title="Revisar detalles y verificación de Tesorería"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Revisar Propuesta</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ReviewProposalModal
        proposalId={reviewProposalId}
        isOpen={isReviewOpen}
        onClose={() => {
          setIsReviewOpen(false);
          setReviewProposalId(null);
        }}
        onSuccess={() => {
          fetchProposals();
        }}
        canReview={canReview}
        companies={companies}
      />
    </div>
  );
}
