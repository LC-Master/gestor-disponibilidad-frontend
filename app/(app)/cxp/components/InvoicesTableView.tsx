"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  FileSpreadsheet,
  FileText,
  History,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

import { toast } from "sonner";
import { fetchClient } from "@/lib/fetchClient";
import { Company } from "@/app/(app)/tesoreria/types";
import { CxpAvailability, Invoice, InvoiceStatus, InvoiceType, SAPDocumentType, Supplier } from "../types";
import { CreateInvoiceModal } from "./CreateInvoiceModal";
import { CreateProposalModal } from "./CreateProposalModal";
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

interface InvoicesTableViewProps {
  companies: Company[];
  user?: UserProfile | null;
}

export function InvoicesTableViewContent({ companies, user }: InvoicesTableViewProps) {
  const searchParams = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(() => {
    return searchParams?.get("company_id") || companies[0]?.id || "ALL";
  });
  const [selectedStatus, setSelectedStatus] = useState<string>("TODOS");
  const [selectedInvoiceType, setSelectedInvoiceType] = useState<string>("TODOS");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return searchParams?.get("date") || new Date().toISOString().split("T")[0];
  });

  const [cxpAvailability, setCxpAvailability] = useState<CxpAvailability | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [proposedIdsCount, setProposedIdsCount] = useState<number>(0);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState<Invoice | null>(null);
  const [invoiceToCancel, setInvoiceToCancel] = useState<Invoice | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [selectedInvoiceAudit, setSelectedInvoiceAudit] = useState<Invoice | null>(null);
  const [isCreateProposalModalOpen, setIsCreateProposalModalOpen] = useState(false);


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

  const canCreateInvoice = hasPermission("cxp.invoices.create");
  const canCancelInvoice = hasPermission("cxp.invoices.cancel");
  const canApprove = hasPermission("cxp.payments.approve") || isAdmin;
  const canCreateProposal = hasPermission("cxp.proposals.create") || hasPermission("cxp.payments.schedule") || isAdmin;
  const canExecutePayment = hasPermission("cxp.payments.execute");
  const canRevert = hasPermission("cxp.payments.revert");

  const fetchSuppliers = async () => {
    try {
      const res = await fetchClient("/api/cxp/suppliers");
      if (res.ok) {
        const data = await res.json();
        setSuppliers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCompanyId && selectedCompanyId !== "ALL") {
        params.append("company_id", selectedCompanyId);
      }
      if (selectedStatus && selectedStatus !== "TODOS") {
        params.append("status", selectedStatus);
      }
      if (selectedInvoiceType && selectedInvoiceType !== "TODOS") {
        params.append("invoice_type", selectedInvoiceType);
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
      params.append("scope", "pending");
      const res = await fetchClient(`/api/cxp/invoices?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Error al obtener la lista de facturas");
      }
      const data = await res.json();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err.message || "Error al cargar facturas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInvoices();
    }, 250);
    return () => clearTimeout(timer);
  }, [
    search,
    selectedCompanyId,
    selectedStatus,
    selectedInvoiceType,
    dateFrom,
    dateTo,
  ]);

  const handleCancelInvoice = async () => {
    if (!invoiceToCancel || !canCancelInvoice) return;
    setIsCancelling(true);
    try {
      const res = await fetchClient(`/api/cxp/invoices/${invoiceToCancel.id}/cancel`, {
        method: "PATCH",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Error al anular la factura");
      }

      toast.success(
        `Factura N° ${invoiceToCancel.invoice_number} anulada correctamente`
      );
      setInvoiceToCancel(null);
      fetchInvoices();
    } catch (err: any) {
      toast.error(err.message || "Error al procesar anulación");
    } finally {
      setIsCancelling(false);
    }
  };

  const fetchAvailability = async () => {
    if (!selectedCompanyId || selectedCompanyId === "ALL") {
      setCxpAvailability(null);
      return;
    }
    setLoadingAvailability(true);
    try {
      const res = await fetchClient(
        `/api/cxp/availability?company_id=${selectedCompanyId}&date=${selectedDate}`
      );
      if (res.ok) {
        const data: CxpAvailability = await res.json();
        setCxpAvailability(data);
      } else {
        setCxpAvailability(null);
      }
    } catch {
      setCxpAvailability(null);
    } finally {
      setLoadingAvailability(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, [selectedCompanyId, selectedDate]);

  useEffect(() => {
    if (selectedCompanyId && selectedCompanyId !== "ALL") {
      try {
        const raw = localStorage.getItem(`cxp_proposal_${selectedCompanyId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setProposedIdsCount(parsed.length);
            return;
          }
        }
      } catch { }
    }
    setProposedIdsCount(0);
  }, [selectedCompanyId]);

  const hasApprovedToday = cxpAvailability?.has_approved_today ?? false;
  const isRollover = cxpAvailability?.is_rollover ?? false;
  const rolloverDate = cxpAvailability?.rollover_date;
  const supplierAmount = Math.max(0, cxpAvailability?.supplier_amount ?? 0);
  const cupoConsumido = Math.max(0, cxpAvailability?.cupo_consumido ?? 0);
  const cupoLibre = Math.max(0, cxpAvailability?.cupo_libre ?? 0);
  const exchangeRate = cxpAvailability?.exchange_rate || 1;

  const selectedPending = useMemo(() => {
    return invoices.filter((inv) => selectedInvoiceIds.has(inv.id) && inv.status === "PENDIENTE");
  }, [invoices, selectedInvoiceIds]);

  const selectedPendingAmountVES = useMemo(() => {
    return selectedPending.reduce((sum, inv) => {
      const remaining = inv.total_amount - (inv.paid_amount || 0);
      if (inv.currency === "VES") return sum + remaining;
      const rate = exchangeRate > 0 ? exchangeRate : (inv.exchange_rate || 1);
      return sum + remaining * rate;
    }, 0);
  }, [selectedPending, exchangeRate]);

  const selectedPendingAmountUSD = useMemo(() => {
    return selectedPending.reduce((sum, inv) => {
      const remaining = inv.total_amount - (inv.paid_amount || 0);
      if (inv.currency === "USD") return sum + remaining;
      const rate = exchangeRate > 0 ? exchangeRate : (inv.exchange_rate || 1);
      return sum + (rate > 0 ? remaining / rate : 0);
    }, 0);
  }, [selectedPending, exchangeRate]);

  const isWithinQuota = selectedPendingAmountVES <= cupoLibre && cupoLibre > 0 && (hasApprovedToday || isRollover);

  const canSelectRow = (inv: Invoice) => {
    return inv.status === "PENDIENTE" && canCreateProposal;
  };

  const selectableInvoices = useMemo(() => {
    return invoices.filter((inv) => canSelectRow(inv));
  }, [invoices, canCreateProposal]);

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
    if (selectableInvoices.length === 0) return;
    if (selectedInvoiceIds.size === selectableInvoices.length) {
      setSelectedInvoiceIds(new Set());
    } else {
      setSelectedInvoiceIds(new Set(selectableInvoices.map((i) => i.id)));
    }
  };

  const handleLoadAnalystProposal = () => {
    try {
      const raw = localStorage.getItem(`cxp_proposal_${selectedCompanyId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const newSet = new Set(selectedInvoiceIds);
          parsed.forEach((id: string) => newSet.add(id));
          setSelectedInvoiceIds(newSet);
          toast.info(`Se cargaron ${parsed.length} facturas de la propuesta del analista.`);
        }
      }
    } catch { }
  };


  const isOverdue = (dueDateStr: string, status: InvoiceStatus): boolean => {
    if (status !== "PENDIENTE") return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);
    return due < today;
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

  const renderStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case "PENDIENTE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
            <Clock className="w-3 h-3" />
            PENDIENTE
          </span>
        );
      case "EN_PROPUESTA":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50/80 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/60">
            <Clock className="w-3 h-3" />
            EN PROPUESTA
          </span>
        );
      case "PROGRAMADO":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800/60">
            <CheckCircle2 className="w-3 h-3" />
            PROGRAMADO
          </span>
        );
      case "PAGADO":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
            <CheckCircle2 className="w-3 h-3" />
            PAGADO
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

  const renderTypeBadge = (sapType: SAPDocumentType, invoiceType: InvoiceType) => {
    let colorClasses = "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300";
    if (sapType === "MIRO") {
      colorClasses = "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60";
    } else if (sapType === "MRKO") {
      colorClasses = "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60";
    } else if (sapType === "FB60") {
      colorClasses = "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60";
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

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              Fecha de Ejecución:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40"
            />
          </div>

          {selectedCompanyId === "ALL" ? (
            <span className="text-xs text-neutral-400 italic">
              Seleccione una empresa para consultar cupo de Tesorería
            </span>
          ) : loadingAvailability ? (
            <span className="text-xs text-neutral-400 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-locatel-medio" />
              Consultando Tesorería...
            </span>
          ) : hasApprovedToday ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Tesorería Aprobada
            </span>
          ) : isRollover ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Operando con Remanente del {formatDate(rolloverDate || "")} (Cierre de hoy pendiente)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              Sin disponibilidad de Tesorería
            </span>
          )}

          {proposedIdsCount > 0 && canApprove && (
            <button
              type="button"
              onClick={handleLoadAnalystProposal}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              Cargar Propuesta del Analista ({proposedIdsCount})
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 shrink-0">
          <div className="px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">
              {hasApprovedToday ? "Asignado Hoy" : isRollover ? "Remanente Rollover" : "Cupo Asignado"}
            </span>
            <span className="text-xs font-extrabold font-mono text-neutral-900 dark:text-neutral-100">
              Bs. {formatMoney(supplierAmount, "VES")}
            </span>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">
              {hasApprovedToday ? "Consumido Hoy" : "Cupo Consumido"}
            </span>
            <span className="text-xs font-extrabold font-mono text-amber-600 dark:text-amber-400">
              Bs. {formatMoney(cupoConsumido, "VES")}
            </span>
          </div>

          <div
            className={`px-3.5 py-2 rounded-xl border ${cupoLibre > 0 && (hasApprovedToday || isRollover)
                ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                : "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300"
              }`}
          >
            <span className="text-[10px] uppercase font-bold opacity-80 block">
              {hasApprovedToday ? "Cupo Libre Hoy" : "Cupo Libre"}
            </span>
            <span className="text-xs font-extrabold font-mono">
              Bs. {formatMoney(cupoLibre, "VES")}
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
              onClick={() => fetchInvoices()}
              disabled={loading}
              className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-xl transition-colors cursor-pointer"
              title="Refrescar facturas"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-locatel-medio" : ""}`} />
            </button>

            {canCreateInvoice && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-locatel-medio hover:bg-locatel-oscuro text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Factura</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
              Empresa
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 rounded-xl text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40 cursor-pointer"
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
              className="w-full px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 rounded-xl text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40 cursor-pointer"
            >
              <option value="TODOS">Todas las Pendientes</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="EN_PROPUESTA">En Propuesta</option>
            </select>

          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
              Tipo de Documento
            </label>
            <select
              value={selectedInvoiceType}
              onChange={(e) => setSelectedInvoiceType(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 rounded-xl text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40 cursor-pointer"
            >
              <option value="TODOS">Todos los Tipos</option>
              <option value="FIRME">Firme (MIRO)</option>
              <option value="CONSIGNACION">Consignación (MRKO)</option>
              <option value="SERVICIOS">Servicios (FB60)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
                Vence Desde
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 rounded-xl text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
                Vence Hasta
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
      </div>

      {selectedInvoiceIds.size > 0 && (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 rounded-2xl bg-neutral-900 text-white shadow-xl dark:bg-neutral-800 dark:border dark:border-neutral-700 animate-in fade-in">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-xs font-bold">
              <span>
                {selectedInvoiceIds.size}{" "}
                {selectedInvoiceIds.size === 1
                  ? "factura seleccionada"
                  : "facturas seleccionadas"}
              </span>
            </div>

            {selectedPending.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pl-3 border-l border-neutral-700 text-xs">
                <span className="text-neutral-400">Total Pendiente:</span>
                <span className="font-extrabold font-mono text-emerald-400">
                  Bs. {formatMoney(selectedPendingAmountVES, "VES")}
                </span>
                <span className="text-xs font-mono text-neutral-400">
                  ≈ ${formatMoney(selectedPendingAmountUSD, "USD")}
                </span>
                {selectedCompanyId !== "ALL" && (
                  (!hasApprovedToday && !isRollover) ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Sin Cierre de Tesorería Aprobado
                    </span>
                  ) : isWithinQuota ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Dentro de Cupo Libre (Resta: Bs. {formatMoney(cupoLibre - selectedPendingAmountVES, "VES")})
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Excede Cupo Libre por Bs. {formatMoney(selectedPendingAmountVES - cupoLibre, "VES")}
                    </span>
                  )
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedPending.length > 0 && canCreateProposal && (
              <button
                onClick={() => setIsCreateProposalModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-locatel-medio hover:bg-locatel-oscuro text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                title="Crear propuesta de pago formal para el Coordinador"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Crear Propuesta de Pago</span>
              </button>
            )}


            <button
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
                      selectableInvoices.length > 0 &&
                      selectedInvoiceIds.size === selectableInvoices.length
                    }
                    onChange={toggleSelectAll}
                    disabled={selectableInvoices.length === 0}
                    className="w-4 h-4 rounded text-locatel-medio focus:ring-locatel-medio cursor-pointer disabled:opacity-30"
                  />
                </th>
                <th className="py-3 px-4">Empresa</th>
                <th className="py-3 px-4">Proveedor</th>
                <th className="py-3 px-4">N° Factura</th>
                <th className="py-3 px-4">N° Control</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">F. Emisión</th>
                <th className="py-3 px-4">F. Recepción (MIGO)</th>
                <th className="py-3 px-4">F. Vencimiento</th>
                <th className="py-3 px-4 text-right">Monto Neto</th>
                <th className="py-3 px-4 text-center">Estatus</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 whitespace-nowrap">
              {loading && invoices.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-neutral-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-locatel-medio" />
                      <span>Cargando bandeja de facturas...</span>
                    </div>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-neutral-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileSpreadsheet className="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
                      <span>No se encontraron facturas registradas con los filtros seleccionados</span>
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const overdue = isOverdue(inv.due_date, inv.status);
                  const isSelected = selectedInvoiceIds.has(inv.id);
                  return (
                    <tr
                      key={inv.id}
                      className={`hover:bg-neutral-50/70 dark:hover:bg-neutral-800/30 transition-colors ${isSelected ? "bg-locatel-medio/5 dark:bg-emerald-950/20" : ""
                        }`}
                    >
                      <td className="py-3.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={!canSelectRow(inv)}
                          onChange={() => toggleSelectInvoice(inv.id)}
                          className={`w-4 h-4 rounded text-locatel-medio focus:ring-locatel-medio ${canSelectRow(inv)
                              ? "cursor-pointer"
                              : "opacity-30 cursor-not-allowed"
                            }`}
                        />
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-neutral-900 dark:text-neutral-100">
                        <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[11px]">
                          {inv.company?.alias || getCompanyAlias(inv.company_id)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-neutral-900 dark:text-neutral-100 font-mono text-[11px]">
                          {inv.supplier?.rif || "S/R"}
                        </div>
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                          {inv.supplier?.business_name || "-"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-neutral-900 dark:text-neutral-100">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-neutral-500 dark:text-neutral-400">
                        {inv.control_number || "-"}
                      </td>
                      <td className="py-3.5 px-4">
                        {renderTypeBadge(inv.sap_document_type, inv.invoice_type)}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-600 dark:text-neutral-300">
                        {formatDate(inv.issue_date)}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-600 dark:text-neutral-300">
                        {formatDate(inv.reception_date)}
                      </td>
                      <td className="py-3.5 px-4">
                        {overdue ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 font-bold border border-red-200 dark:border-red-900/60">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            <span>{formatDate(inv.due_date)}</span>
                          </div>
                        ) : (
                          <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                            {formatDate(inv.due_date)}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-bold text-neutral-900 dark:text-neutral-100 font-mono">
                          {formatMoney(inv.total_amount, inv.currency)}
                        </div>
                        {inv.currency !== "VES" && inv.exchange_rate > 1 && (
                          <div className="text-[10px] text-neutral-400 font-mono">
                            ≈ {formatMoney(inv.total_amount * inv.exchange_rate, "VES")}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {renderStatusBadge(inv.status)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedInvoiceAudit(inv)}

                            className="p-1.5 rounded-lg text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors cursor-pointer"
                            title="Ver trazabilidad y bitácora de auditoría"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setSelectedInvoiceDetail(inv)}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                            title="Ver detalle del documento"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canCancelInvoice && inv.status === "PENDIENTE" && (
                            <button
                              onClick={() => setInvoiceToCancel(inv)}
                              className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                              title="Anular factura"
                            >
                              <Trash2 className="w-4 h-4" />
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

      <CreateInvoiceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        companies={companies}
        suppliers={suppliers}
        onSuccess={() => {
          fetchInvoices();
          setIsCreateModalOpen(false);
        }}
      />

      {selectedInvoiceDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-locatel-medio/10 text-locatel-medio">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    Detalle de Factura N° {selectedInvoiceDetail.invoice_number}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Tipo de documento SAP: {selectedInvoiceDetail.sap_document_type} (
                    {selectedInvoiceDetail.invoice_type})
                  </p>
                </div>
              </div>
              <button
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
                  <div className="mt-0.5">
                    {renderStatusBadge(selectedInvoiceDetail.status)}
                  </div>
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

              <div className="grid grid-cols-3 gap-3">
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
                    F. Recepción (MIGO)
                  </span>
                  <p className="font-medium text-neutral-800 dark:text-neutral-200 mt-0.5">
                    {formatDate(selectedInvoiceDetail.reception_date)}
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
                  <span>Subtotal:</span>
                  <span className="font-mono text-neutral-800 dark:text-neutral-200">
                    {formatMoney(selectedInvoiceDetail.subtotal, selectedInvoiceDetail.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-neutral-500">
                  <span>Impuesto (IVA):</span>
                  <span className="font-mono text-neutral-800 dark:text-neutral-200">
                    {formatMoney(selectedInvoiceDetail.tax_amount, selectedInvoiceDetail.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-neutral-500">
                  <span>Tasa de Cambio:</span>
                  <span className="font-mono text-neutral-800 dark:text-neutral-200">
                    {selectedInvoiceDetail.exchange_rate.toFixed(4)}
                  </span>
                </div>
                <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex justify-between items-center font-bold text-sm">
                  <span>Monto Total:</span>
                  <span className="font-mono text-locatel-medio">
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

      {invoiceToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-500">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  ¿Anular Factura?
                </h4>
                <p className="text-[11px] text-neutral-500">
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              ¿Estás seguro de que deseas anular la factura N°{" "}
              <strong className="font-mono text-neutral-900 dark:text-neutral-100">
                {invoiceToCancel.invoice_number}
              </strong>{" "}
              por un monto de{" "}
              <strong>
                {formatMoney(invoiceToCancel.total_amount, invoiceToCancel.currency)}
              </strong>
              ?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInvoiceToCancel(null)}
                disabled={isCancelling}
                className="px-3.5 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCancelInvoice}
                disabled={isCancelling}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isCancelling && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirmar Anulación</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <InvoiceAuditTrailModal
        isOpen={Boolean(selectedInvoiceAudit)}
        onClose={() => setSelectedInvoiceAudit(null)}
        invoice={selectedInvoiceAudit}
      />

      <CreateProposalModal
        isOpen={isCreateProposalModalOpen}
        onClose={() => setIsCreateProposalModalOpen(false)}
        selectedInvoices={selectedPending}
        companies={companies}
        selectedCompanyId={selectedCompanyId}
        exchangeRate={cxpAvailability?.exchange_rate}
        onSuccess={() => {
          setSelectedInvoiceIds(new Set());
          fetchInvoices();
        }}
      />
    </div>
  );
}


export function InvoicesTableView(props: InvoicesTableViewProps) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-neutral-400">Cargando bandeja de facturas...</div>}>
      <InvoicesTableViewContent {...props} />
    </Suspense>
  );
}

