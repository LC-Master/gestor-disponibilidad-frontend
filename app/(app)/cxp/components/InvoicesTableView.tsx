"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Calendar,
  Clock,
  Eye,
  FileSpreadsheet,
  History,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { fetchClient } from "@/lib/fetchClient";
import { Company } from "@/app/(app)/tesoreria/types";
import { CxpAvailability, Invoice, InvoiceStatus, Supplier } from "../types";
import { CreateInvoiceModal } from "./CreateInvoiceModal";
import { CreateProposalModal } from "./CreateProposalModal";
import { InvoiceAuditTrailModal } from "./InvoiceAuditTrailModal";
import { InvoiceDetailModal } from "./InvoiceDetailModal";
import { ProposalAiAnalysisModal } from "./ProposalAiAnalysisModal";

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
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cxp_selected_company_id");
      if (saved && (saved === "ALL" || companies.some((c) => c.id === saved))) {
        return saved;
      }
    }
    return searchParams?.get("company_id") || companies[0]?.id || "ALL";
  });
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("TODOS");
  const [selectedStatus, setSelectedStatus] = useState<string>("PENDIENTE");
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
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiSelectedInvoices, setAiSelectedInvoices] = useState<Invoice[]>([]);

  const handleCompanyChange = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setSelectedStatus("PENDIENTE");
    setSelectedInvoiceIds(new Set());
    if (typeof window !== "undefined") {
      localStorage.setItem("cxp_selected_company_id", companyId);
    }
  };

  const hasPermission = (code: string) => {
    const clean = code.toLowerCase().trim();
    const roles = (user?.roles || []).map((r) => r.toUpperCase().trim());
    if (roles.includes("ADMIN") || roles.includes("ADMINISTRADOR")) {
      return true;
    }
    if (roles.includes("COORD_CXP")) {
      return true;
    }
    if (roles.includes("ANALISTA_CXP")) {
      if (
        clean === "cxp.invoices.view" ||
        clean === "cxp.invoices.create" ||
        clean === "cxp.invoices.edit" ||
        clean === "cxp.calendar.view" ||
        clean === "cxp.payments.schedule" ||
        clean === "cxp.reports.view" ||
        clean === "cxp.proposals.create" ||
        clean === "cxp.proposals.view"
      ) {
        return true;
      }
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

  const fetchSuppliers = async () => {
    try {
      const res = await fetchClient("/api/v1/cxp/suppliers");
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
      const res = await fetchClient(`/api/v1/cxp/invoices?${params.toString()}`);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "SELECT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCancelInvoice = async () => {
    if (!invoiceToCancel || !canCancelInvoice) return;
    setIsCancelling(true);
    try {
      const res = await fetchClient(`/api/v1/cxp/invoices/${invoiceToCancel.id}/cancel`, {
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
    setLoadingAvailability(true);
    try {
      const companyParam = selectedCompanyId && selectedCompanyId !== "ALL" ? `&company_id=${selectedCompanyId}` : "";
      const res = await fetchClient(
        `/api/v1/cxp/availability?date=${selectedDate}${companyParam}`
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
  const supplierAmount = Math.max(0, cxpAvailability?.supplier_amount ?? 0);
  const cupoConsumido = Math.max(0, cxpAvailability?.cupo_consumido ?? 0);
  const cupoLibre = Math.max(0, cxpAvailability?.cupo_libre ?? 0);
  const exchangeRate = cxpAvailability?.exchange_rate || 1;

  const displayedInvoices = useMemo(() => {
    if (!selectedSupplierId || selectedSupplierId === "TODOS") {
      return invoices;
    }
    return invoices.filter((inv) => inv.supplier_id === selectedSupplierId);
  }, [invoices, selectedSupplierId]);

  const canSelectRow = (inv: Invoice) => {
    return inv.status === "PENDIENTE" && canCreateProposal;
  };

  const selectableInvoices = useMemo(() => {
    return displayedInvoices.filter((inv) => canSelectRow(inv));
  }, [displayedInvoices, canCreateProposal]);

  const selectedPending = useMemo(() => {
    return displayedInvoices.filter((inv) => selectedInvoiceIds.has(inv.id) && inv.status === "PENDIENTE");
  }, [displayedInvoices, selectedInvoiceIds]);

  const selectedPendingAmountVES = useMemo(() => {
    return selectedPending.reduce((sum, inv) => {
      const remaining = inv.total_amount - (inv.paid_amount || 0);
      if (inv.is_indexed) {
        const usdBase = inv.total_amount_usd || (inv.exchange_rate > 0 ? inv.total_amount / inv.exchange_rate : 0);
        const rate = exchangeRate > 0 ? exchangeRate : (inv.exchange_rate || 1);
        return sum + (usdBase * rate);
      }
      if (inv.currency === "VES") return sum + remaining;
      const rate = exchangeRate > 0 ? exchangeRate : (inv.exchange_rate || 1);
      return sum + remaining * rate;
    }, 0);
  }, [selectedPending, exchangeRate]);

  const selectedPendingAmountUSD = useMemo(() => {
    return selectedPending.reduce((sum, inv) => {
      const remaining = inv.total_amount - (inv.paid_amount || 0);
      if (inv.is_indexed && inv.total_amount_usd) return sum + inv.total_amount_usd;
      if (inv.currency === "USD") return sum + remaining;
      const rate = exchangeRate > 0 ? exchangeRate : (inv.exchange_rate || 1);
      return sum + (rate > 0 ? remaining / rate : 0);
    }, 0);
  }, [selectedPending, exchangeRate]);

  const isWithinQuota = selectedPendingAmountVES <= cupoLibre && cupoLibre > 0 && hasApprovedToday;

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

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedSupplierId !== "TODOS") count++;
    if (selectedStatus !== "PENDIENTE") count++;
    if (selectedInvoiceType !== "TODOS") count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    return count;
  }, [selectedSupplierId, selectedStatus, selectedInvoiceType, dateFrom, dateTo]);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    if (isFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isFilterOpen]);

  const renderStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case "PENDIENTE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-locatel-oro/15 text-locatel-naranja dark:text-locatel-oro border border-locatel-oro/30">
            <span className="w-1.5 h-1.5 rounded-full bg-locatel-oro shrink-0" />
            Pendiente
          </span>
        );
      case "EN_PROPUESTA":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-locatel-morado/15 text-locatel-morado border border-locatel-morado/30">
            <span className="w-1.5 h-1.5 rounded-full bg-locatel-morado shrink-0" />
            En Propuesta
          </span>
        );
      case "PROGRAMADO":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-locatel-guia/15 text-locatel-guia dark:text-locatel-claro border border-locatel-guia/30">
            <span className="w-1.5 h-1.5 rounded-full bg-locatel-guia shrink-0" />
            Programado
          </span>
        );
      case "PAGADO":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-locatel-medio/15 text-locatel-oscuro dark:text-locatel-claro border border-locatel-medio/30">
            <span className="w-1.5 h-1.5 rounded-full bg-locatel-medio shrink-0" />
            Pagado
          </span>
        );
      case "ANULADO":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-500 border border-neutral-200 dark:border-neutral-700">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0" />
            Anulado
          </span>
        );
      default:
        return <span className="text-xs">{status}</span>;
    }
  };

  const renderTypeBadge = (inv: Invoice) => {
    const sType = inv.supplier?.supplier_type || "FIRME";
    return (
      <div className="flex items-center gap-1.5 font-mono text-[10px]">
        <span className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-medium">
          {sType}
        </span>
        {inv.purchase_order_number && (
          <span className="text-neutral-400 truncate max-w-24">
            #{inv.purchase_order_number}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {proposedIdsCount > 0 && canApprove && (
        <div className="flex justify-end px-1">
          <button
            type="button"
            onClick={handleLoadAnalystProposal}
            className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md text-xs font-semibold bg-locatel-medio/10 text-locatel-oscuro dark:text-locatel-claro hover:bg-locatel-medio/20 border border-locatel-medio/30 transition-colors cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-locatel-medio" />
            <span>Cargar Propuesta del Analista ({proposedIdsCount})</span>
          </button>
        </div>
      )}

      <div className="h-10 px-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-4 text-xs overflow-x-auto whitespace-nowrap shadow-xs">
        <div className="flex items-center gap-4 text-neutral-500 dark:text-neutral-400 divide-x divide-neutral-200 dark:divide-neutral-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Aprobado:</span>
            {loadingAvailability ? (
              <span className="w-16 h-4 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse inline-block" />
            ) : (
              <span className="font-mono font-bold text-sm text-neutral-900 dark:text-neutral-100 tabular-nums">
                Bs. {formatMoney(supplierAmount, "VES")}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 pl-4">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Consumido:</span>
            {loadingAvailability ? (
              <span className="w-16 h-4 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse inline-block" />
            ) : (
              <span className="font-mono font-bold text-sm text-neutral-900 dark:text-neutral-100 tabular-nums">
                Bs. {formatMoney(cupoConsumido, "VES")}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 pl-4">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Cupo Libre:</span>
            {loadingAvailability ? (
              <span className="w-16 h-4 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse inline-block" />
            ) : (
              <span
                className={`font-mono font-extrabold text-sm tabular-nums ${cupoLibre > 0 && hasApprovedToday
                  ? "text-locatel-oscuro dark:text-locatel-claro"
                  : "text-rose-600 dark:text-rose-400"
                  }`}
              >
                Bs. {formatMoney(cupoLibre, "VES")}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 px-2 h-7 rounded-md bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-700 dark:text-neutral-300">
            <Calendar className="w-3.5 h-3.5 text-locatel-medio" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-xs font-mono font-medium text-neutral-800 dark:text-neutral-200 focus:outline-none cursor-pointer"
            />
          </div>

          {loadingAvailability ? (
            <span className="text-xs text-neutral-400 flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3 animate-spin text-locatel-medio" />
              <span>Verificando...</span>
            </span>
          ) : hasApprovedToday ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-locatel-medio/15 text-locatel-oscuro dark:text-locatel-claro border border-locatel-medio/30">
              <ShieldCheck className="w-3.5 h-3.5 text-locatel-medio shrink-0" />
              <span>Tesorería Aprobada</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Sin Cierre Aprobado</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="relative flex-1 min-w-60 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por factura, control o proveedor..."
            className="w-full pl-9 pr-12 h-9 border border-neutral-300 dark:border-neutral-700 focus:border-locatel-medio focus:ring-2 focus:ring-locatel-medio/80 bg-white dark:bg-neutral-950 rounded-lg text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none transition-all shadow-2xs"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400 border border-neutral-200 dark:border-neutral-800 rounded px-1 py-0.2 text-[10px] font-mono">
            <span>⌘K</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 h-9 bg-white dark:bg-neutral-950 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs shadow-2xs">
            <Building2 className="w-3.5 h-3.5 text-locatel-medio shrink-0" />
            <select
              value={selectedCompanyId}
              onChange={(e) => handleCompanyChange(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-none cursor-pointer max-w-44 truncate"
            >
              <option value="ALL">Todas las empresas</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code ? `${c.code} · ${c.name}` : c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`h-9 px-3 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs ${activeFilterCount > 0
                ? "border-locatel-medio bg-locatel-medio text-white"
                : "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                }`}
            >
              <span>Filtros</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full text-[10px] font-mono flex items-center justify-center bg-white text-locatel-oscuro font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-80 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xl z-30 space-y-3 animate-in fade-in zoom-in-95 duration-100 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-900">
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    Filtros avanzados
                  </span>
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSupplierId("TODOS");
                        setSelectedStatus("PENDIENTE");
                        setSelectedInvoiceType("TODOS");
                        setDateFrom("");
                        setDateTo("");
                      }}
                      className="text-[11px] text-locatel-medio hover:underline cursor-pointer font-medium"
                    >
                      Restablecer
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                      Proveedor
                    </label>
                    <select
                      value={selectedSupplierId}
                      onChange={(e) => setSelectedSupplierId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-locatel-medio cursor-pointer truncate"
                    >
                      <option value="TODOS">Todos los Proveedores</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.rif} · {s.business_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                      Estatus de Factura
                    </label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-locatel-medio cursor-pointer"
                    >
                      <option value="TODOS">Todas</option>
                      <option value="PENDIENTE">Pendiente</option>
                      <option value="EN_PROPUESTA">En Propuesta</option>
                      <option value="PROGRAMADO">Programada</option>
                      <option value="PAGADO">Pagada</option>
                      <option value="ANULADO">Anulada</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                      Tipo de Documento
                    </label>
                    <select
                      value={selectedInvoiceType}
                      onChange={(e) => setSelectedInvoiceType(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-locatel-medio cursor-pointer"
                    >
                      <option value="TODOS">Todos los Tipos</option>
                      <option value="FIRME">Firme (MIRO)</option>
                      <option value="CONSIGNACION">Consignación (MRKO)</option>
                      <option value="SERVICIOS">Servicios (FB60)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                        Desde
                      </label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-full px-2 py-1 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs font-mono text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-locatel-medio"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                        Hasta
                      </label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-full px-2 py-1 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs font-mono text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-locatel-medio"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-900 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(false)}
                    className="px-3 py-1 bg-locatel-medio text-white hover:bg-locatel-oscuro rounded-md text-xs font-medium cursor-pointer transition-colors"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => fetchInvoices()}
            disabled={loading}
            suppressHydrationWarning
            className="w-9 h-9 flex items-center justify-center text-neutral-500 hover:text-locatel-medio border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900 rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
            title="Actualizar listado"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-locatel-medio" : ""}`} />
          </button>

          {canCreateProposal && (
            <button
              type="button"
              onClick={() => setIsAiModalOpen(true)}
              className="border-locatel-morado border-2 font-semibold px-3 h-9 rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
              title="Generar recomendación inteligente de propuesta con IA"
            >
              <Sparkles className="w-3.5 h-3.5 text-locatel-medio" />
              <span>Propuesta con IA</span>
            </button>
          )}

          {canCreateInvoice && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-locatel-medio hover:bg-locatel-oscuro text-white font-semibold px-3.5 h-9 rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Factura</span>
            </button>
          )}
        </div>
      </div>

      <div className="border border-neutral-200/80 dark:border-neutral-800 rounded-xl overflow-hidden bg-white dark:bg-neutral-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-600 dark:text-neutral-400">
            <thead className="bg-neutral-50/50 dark:bg-neutral-900/50 border-y border-neutral-200/80 dark:border-neutral-800 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap">
              <tr>
                <th className="py-2 px-3 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={
                      selectableInvoices.length > 0 &&
                      selectedInvoiceIds.size === selectableInvoices.length
                    }
                    onChange={toggleSelectAll}
                    disabled={selectableInvoices.length === 0}
                    suppressHydrationWarning
                    className="w-3.5 h-3.5 rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-0 cursor-pointer disabled:opacity-30"
                  />
                </th>
                <th className="py-2 px-3">Empresa</th>
                <th className="py-2 px-3">Proveedor</th>
                <th className="py-2 px-3">N° Factura</th>
                <th className="py-2 px-3">N° Control</th>
                <th className="py-2 px-3">Tipo</th>
                <th className="py-2 px-3">Emisión</th>
                <th className="py-2 px-3">Recepción</th>
                <th className="py-2 px-3">Vencimiento</th>
                <th className="py-2 px-3 text-right">Monto Neto</th>
                <th className="py-2 px-3 text-center">Estatus</th>
                <th className="py-2 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900 whitespace-nowrap">
              {loading ? (
                Array.from({ length: 8 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="animate-pulse h-11">
                    <td className="py-2 px-3 text-center"><div className="w-3.5 h-3.5 bg-neutral-200 dark:bg-neutral-800 rounded mx-auto" /></td>
                    <td className="py-2 px-3"><div className="h-3.5 w-16 bg-neutral-200 dark:bg-neutral-800 rounded" /></td>
                    <td className="py-2 px-3"><div className="h-3.5 w-28 bg-neutral-200 dark:bg-neutral-800 rounded" /></td>
                    <td className="py-2 px-3"><div className="h-3.5 w-20 bg-neutral-200 dark:bg-neutral-800 rounded" /></td>
                    <td className="py-2 px-3"><div className="h-3.5 w-16 bg-neutral-200 dark:bg-neutral-800 rounded" /></td>
                    <td className="py-2 px-3"><div className="h-3.5 w-14 bg-neutral-200 dark:bg-neutral-800 rounded" /></td>
                    <td className="py-2 px-3"><div className="h-3.5 w-16 bg-neutral-200 dark:bg-neutral-800 rounded" /></td>
                    <td className="py-2 px-3"><div className="h-3.5 w-16 bg-neutral-200 dark:bg-neutral-800 rounded" /></td>
                    <td className="py-2 px-3"><div className="h-3.5 w-16 bg-neutral-200 dark:bg-neutral-800 rounded" /></td>
                    <td className="py-2 px-3 text-right"><div className="h-3.5 w-20 bg-neutral-200 dark:bg-neutral-800 rounded ml-auto" /></td>
                    <td className="py-2 px-3 text-center"><div className="h-3.5 w-16 bg-neutral-200 dark:bg-neutral-800 rounded mx-auto" /></td>
                    <td className="py-2 px-3 text-right"><div className="h-3.5 w-12 bg-neutral-200 dark:bg-neutral-800 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : displayedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-neutral-400">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <FileSpreadsheet className="w-7 h-7 text-neutral-300 dark:text-neutral-700" />
                      <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        No se encontraron facturas registradas
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        Ajusta los filtros o realiza una nueva búsqueda
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedInvoices.map((inv) => {
                  const overdue = isOverdue(inv.due_date, inv.status);
                  const isSelected = selectedInvoiceIds.has(inv.id);
                  return (
                    <tr
                      key={inv.id}
                      className={`h-11 hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors ${isSelected ? "bg-neutral-50/90 dark:bg-neutral-900/80" : ""
                        }`}
                    >
                      <td className="py-2 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={!canSelectRow(inv)}
                          onChange={() => toggleSelectInvoice(inv.id)}
                          className={`w-3.5 h-3.5 rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-0 ${canSelectRow(inv) ? "cursor-pointer" : "opacity-30 cursor-not-allowed"
                            }`}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-[10px] font-mono text-neutral-700 dark:text-neutral-300">
                          {inv.company?.alias || getCompanyAlias(inv.company_id)}
                        </span>
                      </td>
                      <td className="py-2 px-3 max-w-50">
                        <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate block">
                          {inv.supplier?.business_name || "-"}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono block">
                          {inv.supplier?.rif || "S/R"}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-xs font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{inv.invoice_number}</span>
                          {inv.is_indexed && (
                            <span className="px-1 py-0.2 rounded text-[9px] font-mono font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                              IDX
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 font-mono text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
                        {inv.control_number || "-"}
                      </td>
                      <td className="py-2 px-3">
                        {renderTypeBadge(inv)}
                      </td>
                      <td className="py-2 px-3 font-mono text-xs text-neutral-600 dark:text-neutral-400 tabular-nums">
                        {formatDate(inv.issue_date)}
                      </td>
                      <td className="py-2 px-3 font-mono text-xs text-neutral-600 dark:text-neutral-400 tabular-nums">
                        {formatDate(inv.reception_date)}
                      </td>
                      <td className="py-2 px-3">
                        {overdue ? (
                          <span className="inline-flex items-center gap-1 font-mono text-xs font-medium text-rose-600 dark:text-rose-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                            {formatDate(inv.due_date)}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-neutral-600 dark:text-neutral-300 tabular-nums">
                            {formatDate(inv.due_date)}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {inv.is_indexed ? (
                          <div className="font-mono text-xs font-semibold tracking-tight tabular-nums text-neutral-900 dark:text-neutral-100">
                            Bs. {formatMoney((inv.total_amount_usd || (inv.exchange_rate > 0 ? inv.total_amount / inv.exchange_rate : 0)) * (exchangeRate > 0 ? exchangeRate : (inv.exchange_rate || 1)), "VES")}
                          </div>
                        ) : (
                          <>
                            <div className="font-mono text-xs font-semibold tracking-tight tabular-nums text-neutral-900 dark:text-neutral-100">
                              {formatMoney(inv.total_amount, inv.currency)}
                            </div>
                            {inv.currency !== "VES" && inv.exchange_rate > 1 && (
                              <div className="text-[10px] text-neutral-400 font-mono tabular-nums">
                                ≈ {formatMoney(inv.total_amount * inv.exchange_rate, "VES")}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {renderStatusBadge(inv.status)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedInvoiceAudit(inv)}
                            className="p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                            title="Trazabilidad y auditoría"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setSelectedInvoiceDetail(inv)}
                            className="p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                            title="Ver detalle del documento"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {canCancelInvoice && inv.status === "PENDIENTE" && (
                            <button
                              onClick={() => setInvoiceToCancel(inv)}
                              className="p-1 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                              title="Anular factura"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

        <div className="py-2 px-3 bg-neutral-50/50 dark:bg-neutral-900/50 border-t border-neutral-200/80 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400 flex items-center justify-between">
          <span>
            {displayedInvoices.length} {displayedInvoices.length === 1 ? "factura" : "facturas"}
          </span>
          {/* <span className="font-mono text-neutral-400 text-[11px] tabular-nums">
            Tasa ref: Bs. {exchangeRate.toFixed(4)}
          </span> */}
        </div>
      </div>

      {selectedInvoiceIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-neutral-900 text-white dark:bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl px-5 py-3 flex flex-wrap items-center justify-between gap-4 max-w-4xl w-[92vw] animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-neutral-200">
              {selectedInvoiceIds.size} {selectedInvoiceIds.size === 1 ? "factura seleccionada" : "facturas seleccionadas"}
            </span>

            {selectedPending.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pl-3 border-l border-neutral-800 text-xs">
                <span className="text-neutral-400 text-xs">Total:</span>
                <span className="font-mono font-bold text-white tabular-nums">
                  Bs. {formatMoney(selectedPendingAmountVES, "VES")}
                </span>
                <span className="text-[11px] font-mono text-neutral-400 tabular-nums">
                  ≈ ${formatMoney(selectedPendingAmountUSD, "USD")}
                </span>

                {!hasApprovedToday ? (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-950/60 text-amber-400 border border-amber-800/80">
                    Sin Cierre de Tesorería
                  </span>
                ) : isWithinQuota ? (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/80">
                    Dentro de Cupo (Resta: Bs. {formatMoney(cupoLibre - selectedPendingAmountVES, "VES")})
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-rose-950/60 text-rose-400 border border-rose-800/80">
                    Excede Cupo por Bs. {formatMoney(selectedPendingAmountVES - cupoLibre, "VES")}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedPending.length > 0 && canCreateProposal && (
              <button
                onClick={() => setIsCreateProposalModalOpen(true)}
                disabled={!isWithinQuota}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-neutral-900 hover:bg-neutral-100 text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title={!isWithinQuota ? "La selección supera el cupo libre aprobado por Tesorería" : "Crear propuesta de pago formal"}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Crear Propuesta de Pago</span>
              </button>
            )}

            <button
              onClick={() => setSelectedInvoiceIds(new Set())}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Deseleccionar
            </button>
          </div>
        </div>
      )}

      {invoiceToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl w-full max-w-sm shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/50">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  ¿Anular Factura?
                </h4>
                <p className="text-xs text-neutral-500">
                  Esta acción no se puede deshacer
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              ¿Estás seguro de que deseas anular la factura N°{" "}
              <strong className="font-mono text-neutral-900 dark:text-neutral-100">
                {invoiceToCancel.invoice_number}
              </strong>{" "}
              por un monto de{" "}
              <strong className="font-mono text-neutral-900 dark:text-neutral-100">
                {formatMoney(invoiceToCancel.total_amount, invoiceToCancel.currency)}
              </strong>
              ?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInvoiceToCancel(null)}
                disabled={isCancelling}
                className="px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCancelInvoice}
                disabled={isCancelling}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isCancelling && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirmar Anulación</span>
              </button>
            </div>
          </div>
        </div>
      )}

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

      <InvoiceDetailModal
        isOpen={Boolean(selectedInvoiceDetail)}
        onClose={() => setSelectedInvoiceDetail(null)}
        invoice={selectedInvoiceDetail}
        onInvoiceUpdated={fetchInvoices}
      />

      <InvoiceAuditTrailModal
        isOpen={Boolean(selectedInvoiceAudit)}
        onClose={() => setSelectedInvoiceAudit(null)}
        invoice={selectedInvoiceAudit}
      />

      <ProposalAiAnalysisModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        companies={companies}
        selectedCompanyId={selectedCompanyId}
        onLoadIntoProposal={(invoices) => {
          setIsAiModalOpen(false);
          setAiSelectedInvoices(invoices);
          setSelectedInvoiceIds(new Set(invoices.map((inv) => inv.id)));
          setIsCreateProposalModalOpen(true);
        }}
      />

      <CreateProposalModal
        isOpen={isCreateProposalModalOpen}
        onClose={() => {
          setIsCreateProposalModalOpen(false);
          setAiSelectedInvoices([]);
        }}
        selectedInvoices={aiSelectedInvoices.length > 0 ? aiSelectedInvoices : selectedPending}
        companies={companies}
        selectedCompanyId={selectedCompanyId}
        exchangeRate={cxpAvailability?.exchange_rate}
        onOpenAiAssistant={() => {
          setIsCreateProposalModalOpen(false);
          setIsAiModalOpen(true);
        }}
        onSuccess={() => {
          setSelectedInvoiceIds(new Set());
          setAiSelectedInvoices([]);
          fetchInvoices();
          fetchAvailability();
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
