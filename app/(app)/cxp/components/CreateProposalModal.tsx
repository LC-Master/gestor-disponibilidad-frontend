"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Plus,
  Send,
  Trash2,
  X,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { fetchClient } from "@/lib/fetchClient";
import { Company } from "@/app/(app)/tesoreria/types";
import { CxpAvailability, Invoice } from "../types";

interface InvoiceAdjustmentItem {
  id: string;
  type: "DEBITO" | "CREDITO";
  description: string;
  amount: string;
}

interface CreateProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedInvoices: Invoice[];
  companies: Company[];
  selectedCompanyId: string;
  exchangeRate?: number;
  onSuccess: () => void;
  onOpenAiAssistant?: () => void;
}

export function CreateProposalModal({
  isOpen,
  onClose,
  selectedInvoices,
  companies,
  selectedCompanyId,
  exchangeRate = 1.0,
  onSuccess,
  onOpenAiAssistant,
}: CreateProposalModalProps) {
  const [executionDate, setExecutionDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availability, setAvailability] = useState<CxpAvailability | null>(null);
  const [_, setLoadingAvailability] = useState(false);
  const [adjustments, setAdjustments] = useState<Record<string, InvoiceAdjustmentItem[]>>({});
  const [expandedInvoiceIds, setExpandedInvoiceIds] = useState<Set<string>>(new Set());

  const targetCompanyId = useMemo(() => {
    if (selectedCompanyId && selectedCompanyId !== "ALL") {
      return selectedCompanyId;
    }
    return selectedInvoices[0]?.company_id || "";
  }, [selectedCompanyId, selectedInvoices]);

  const company = useMemo(() => {
    return companies.find((c) => c.id === targetCompanyId);
  }, [companies, targetCompanyId]);

  useEffect(() => {
    if (!isOpen || !targetCompanyId) return;

    let isMounted = true;
    setLoadingAvailability(true);

    fetchClient(`/api/v1/cxp/availability?company_id=${targetCompanyId}&date=${executionDate}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: CxpAvailability | null) => {
        if (isMounted) {
          setAvailability(data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setAvailability(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoadingAvailability(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, targetCompanyId, executionDate]);

  const effectiveRate = useMemo(() => {
    if (availability && availability.exchange_rate > 0) {
      return availability.exchange_rate;
    }
    return exchangeRate > 0 ? exchangeRate : 1.0;
  }, [availability, exchangeRate]);

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

  const addAdjustment = (invoiceId: string) => {
    const newItem: InvoiceAdjustmentItem = {
      id: crypto.randomUUID(),
      type: "DEBITO",
      description: "",
      amount: "",
    };
    setAdjustments((prev) => ({
      ...prev,
      [invoiceId]: [...(prev[invoiceId] || []), newItem],
    }));
    setExpandedInvoiceIds((prev) => new Set(prev).add(invoiceId));
  };

  const removeAdjustment = (invoiceId: string, adjId: string) => {
    setAdjustments((prev) => ({
      ...prev,
      [invoiceId]: (prev[invoiceId] || []).filter((a) => a.id !== adjId),
    }));
  };

  const updateAdjustment = (
    invoiceId: string,
    adjId: string,
    field: keyof InvoiceAdjustmentItem,
    value: string
  ) => {
    setAdjustments((prev) => ({
      ...prev,
      [invoiceId]: (prev[invoiceId] || []).map((a) => {
        if (a.id !== adjId) return a;
        return { ...a, [field]: value };
      }),
    }));
  };

  const toggleExpand = (invoiceId: string) => {
    setExpandedInvoiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(invoiceId)) {
        next.delete(invoiceId);
      } else {
        next.add(invoiceId);
      }
      return next;
    });
  };

  const calculatedInvoices = useMemo(() => {
    return selectedInvoices.map((inv) => {
      const baseRemaining = Math.max(0, inv.total_amount - (inv.paid_amount || 0));
      const invoiceAdjs = adjustments[inv.id] || [];

      let debitSum = 0;
      let creditSum = 0;

      invoiceAdjs.forEach((a) => {
        const amt = parseFloat(a.amount.replace(",", ".")) || 0;
        if (a.type === "DEBITO") {
          debitSum += amt;
        } else if (a.type === "CREDITO") {
          creditSum += amt;
        }
      });

      const finalAmount = Math.max(0, baseRemaining + debitSum - creditSum);

      let amountVES = 0;
      let amountUSD = 0;
      const usdBase =
        inv.total_amount_usd ||
        (inv.currency === "USD"
          ? inv.total_amount
          : inv.exchange_rate > 0
            ? inv.total_amount / inv.exchange_rate
            : 0);
      const indexedBaseVES = usdBase * effectiveRate;
      const originalEmissionVES =
        inv.currency === "VES"
          ? inv.total_amount
          : inv.total_amount * (inv.exchange_rate || 1);

      if (inv.is_indexed) {
        amountUSD = usdBase;
        amountVES = Math.max(0, indexedBaseVES + debitSum - creditSum);
      } else if (inv.currency === "VES") {
        amountVES = finalAmount;
        amountUSD = effectiveRate > 0 ? finalAmount / effectiveRate : finalAmount;
      } else {
        amountUSD = finalAmount;
        amountVES = finalAmount * effectiveRate;
      }

      return {
        invoice: inv,
        baseRemaining,
        debitSum,
        creditSum,
        finalAmount,
        amountVES,
        amountUSD,
        indexedBaseVES,
        originalEmissionVES,
        adjustments: invoiceAdjs,
      };
    });
  }, [selectedInvoices, adjustments, effectiveRate]);

  const totalPropuestaVES = useMemo(() => {
    return calculatedInvoices.reduce((sum, item) => sum + item.amountVES, 0);
  }, [calculatedInvoices]);

  const totalPropuestaUSD = useMemo(() => {
    return calculatedInvoices.reduce((sum, item) => sum + item.amountUSD, 0);
  }, [calculatedInvoices]);

  const supplierQuota = useMemo(() => {
    return Math.max(0, availability?.supplier_amount ?? 0);
  }, [availability]);

  const consumedQuota = useMemo(() => {
    return Math.max(0, availability?.cupo_consumido ?? 0);
  }, [availability]);

  const freeQuota = useMemo(() => {
    return Math.max(0, availability?.cupo_libre ?? supplierQuota - consumedQuota);
  }, [availability, supplierQuota, consumedQuota]);

  const remainingQuota = freeQuota - totalPropuestaVES;
  const isOverQuota = totalPropuestaVES > freeQuota || freeQuota <= 0;
  const hasNoApprovedAvailability = !availability?.has_approved_today;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!targetCompanyId) {
      toast.error("Debe seleccionarse una empresa para la propuesta.");
      return;
    }
    if (!executionDate) {
      toast.error("Debe indicar la fecha estimada de ejecución.");
      return;
    }
    if (selectedInvoices.length === 0) {
      toast.error("Debe seleccionar al menos una factura.");
      return;
    }
    if (hasNoApprovedAvailability) {
      toast.error("Tesorería no ha aprobado la disponibilidad para esta fecha.");
      return;
    }
    if (isOverQuota) {
      toast.error("El monto propuesto supera el cupo libre disponible de Tesorería.");
      return;
    }

    const payloadAdjustments: Array<{
      invoice_id: string;
      adjustment_type: "DEBITO" | "CREDITO";
      description: string;
      amount: number;
    }> = [];

    for (const [invId, adjs] of Object.entries(adjustments)) {
      for (const a of adjs) {
        const desc = a.description.trim();
        const amt = parseFloat(a.amount.replace(",", ".")) || 0;
        if (!desc) {
          toast.error("Todos los ajustes deben tener una descripción obligatoria.");
          return;
        }
        if (amt <= 0) {
          toast.error("El monto de cada ajuste debe ser mayor a cero.");
          return;
        }
        payloadAdjustments.push({
          invoice_id: invId,
          adjustment_type: a.type,
          description: desc,
          amount: amt,
        });
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetchClient("/api/v1/cxp/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: targetCompanyId,
          daily_availability_id: (availability as any)?.id,
          execution_date: executionDate,
          notes: notes.trim(),
          invoice_ids: selectedInvoices.map((inv) => inv.id),
          adjustments: payloadAdjustments,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Error al crear la propuesta de pago");
      }

      toast.success("Propuesta de pago creada exitosamente y remitida a revisión.");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Error al procesar la propuesta de pago");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const quotaProgress =
    supplierQuota > 0
      ? Math.min(100, Math.max(0, ((consumedQuota + totalPropuestaVES) / supplierQuota) * 100))
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="max-w-4xl w-full max-h-[90vh] flex flex-col bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-start justify-between bg-white dark:bg-neutral-950">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Crear Propuesta de Pago
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Consolidación de facturas seleccionadas y asignación de fondos según cupo de tesorería
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onOpenAiAssistant && (
              <button
                type="button"
                onClick={onOpenAiAssistant}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-neutral-500" />
                <span>Sugerir con IA</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-6 pt-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 block">
                Empresa Compradora
              </label>
              <div className="bg-neutral-50 dark:bg-neutral-900 text-xs font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 flex items-center justify-between">
                <span className="truncate">{company?.name || "Sin empresa seleccionada"}</span>
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold ml-2">
                  Fija
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 block">
                Fecha Estimada de Ejecución
              </label>
              <input
                type="date"
                value={executionDate}
                onChange={(e) => setExecutionDate(e.target.value)}
                className="w-full bg-white dark:bg-neutral-950 text-xs font-medium text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600 cursor-pointer"
              />
            </div>
          </div>

          <div className="px-6">
            <div className="grid grid-cols-3 divide-x divide-neutral-200 dark:divide-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 my-4">
              <div className="px-3 first:pl-0">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 block">
                  Cupo Proveedores Aprobado
                </span>
                <span className="font-mono tabular-nums text-sm font-bold text-neutral-900 dark:text-neutral-100 block mt-1">
                  {formatMoney(supplierQuota, "VES")}
                </span>
                <span className="text-[10px] text-neutral-400 font-mono tabular-nums block mt-0.5">
                  Consumido: {formatMoney(consumedQuota, "VES")}
                </span>
              </div>

              <div className="px-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 block">
                  Total Propuesta Actual
                </span>
                <span className="font-mono tabular-nums text-sm font-bold text-neutral-900 dark:text-neutral-100 block mt-1">
                  {formatMoney(totalPropuestaVES, "VES")}
                </span>
                <span className="font-mono tabular-nums text-[10px] text-neutral-500 block mt-0.5">
                  ≈ {formatMoney(totalPropuestaUSD, "USD")}
                </span>
              </div>

              <div className="px-3 last:pr-0">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 block">
                  Remanente Proyectado
                </span>
                <span
                  className={`font-mono tabular-nums text-sm font-bold block mt-1 ${remainingQuota < 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-emerald-600 dark:text-emerald-400"
                    }`}
                >
                  {formatMoney(remainingQuota, "VES")}
                </span>
                <div className="w-full h-0.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden mt-1.5">
                  <div
                    className={`h-full transition-all duration-300 ${remainingQuota < 0
                      ? "bg-rose-500"
                      : "bg-emerald-500 dark:bg-emerald-400"
                      }`}
                    style={{ width: `${quotaProgress}%` }}
                  />
                </div>
              </div>
            </div>

            {hasNoApprovedAvailability && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-400 text-xs mb-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Atención: La fecha seleccionada no cuenta con una posición diaria de Tesorería aprobada.
                </span>
              </div>
            )}

            {isOverQuota && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-400 text-xs mb-3">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  El monto acumulado excede el cupo disponible por{" "}
                  {formatMoney(Math.abs(remainingQuota), "VES")}.
                </span>
              </div>
            )}
          </div>

          <div className="px-6 flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                Facturas Seleccionadas ({calculatedInvoices.length})
              </span>
              <span className="font-mono tabular-nums text-[10px] text-neutral-400">
                Tasa ref: Bs. {effectiveRate.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </span>
            </div>

            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-100/50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-800">
                    <tr>
                      <th className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-3 py-2">
                        Factura / Proveedor
                      </th>
                      <th className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-3 py-2">
                        Emisión
                      </th>
                      <th className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-3 py-2 text-right">
                        Monto Base
                      </th>
                      <th className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-3 py-2 text-center">
                        Descuentos/Ajustes
                      </th>
                      <th className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-3 py-2 text-right">
                        Total Final
                      </th>
                      <th className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-3 py-2 text-center">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {calculatedInvoices.map((item) => {
                      const inv = item.invoice;
                      const isExpanded = expandedInvoiceIds.has(inv.id);
                      const adjCount = item.adjustments.length;

                      return (
                        <tr key={inv.id} className="group">
                          <td colSpan={6} className="p-0">
                            <div className="flex items-center px-3 py-2 hover:bg-neutral-50/60 dark:hover:bg-neutral-900/40 transition-colors">
                              <div className="w-[30%] min-w-0 pr-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono tabular-nums font-semibold text-xs text-neutral-900 dark:text-neutral-100">
                                    {inv.invoice_number}
                                  </span>
                                  {inv.is_indexed && (
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30">
                                      Indexada
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-neutral-500 truncate max-w-45 block">
                                  {inv.supplier?.business_name || "Proveedor"}
                                </span>
                              </div>

                              <div className="w-[14%] font-mono tabular-nums text-xs text-neutral-500">
                                {formatDate(inv.issue_date)}
                              </div>

                              <div className="w-[20%] text-right font-mono tabular-nums text-xs text-neutral-600 dark:text-neutral-400">
                                {inv.is_indexed ? (
                                  <div>
                                    <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                                      {formatMoney(item.indexedBaseVES, "VES")}
                                    </div>
                                    <div className="text-[10px] text-neutral-400">
                                      Ref: {formatMoney(item.originalEmissionVES, "VES")}
                                    </div>
                                  </div>
                                ) : (
                                  formatMoney(item.baseRemaining, inv.currency)
                                )}
                              </div>

                              <div className="w-[16%] text-center">
                                {adjCount > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => toggleExpand(inv.id)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono tabular-nums font-medium bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors cursor-pointer"
                                  >
                                    <SlidersHorizontal className="w-2.5 h-2.5" />
                                    <span>
                                      {adjCount} adj ({item.debitSum > 0 ? `+${item.debitSum}` : ""}
                                      {item.creditSum > 0 ? ` -${item.creditSum}` : ""})
                                    </span>
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-neutral-400 font-mono tabular-nums">
                                    -
                                  </span>
                                )}
                              </div>

                              <div className="w-[20%] text-right font-mono tabular-nums font-semibold text-xs text-neutral-900 dark:text-neutral-100">
                                <div>{formatMoney(item.amountVES, "VES")}</div>
                                {inv.is_indexed && (
                                  <div className="text-[10px] font-normal text-neutral-400 font-mono tabular-nums">
                                    ≈ {formatMoney(item.amountUSD, "USD")}
                                  </div>
                                )}
                              </div>

                              <div className="w-[10%] text-center">
                                <button
                                  type="button"
                                  onClick={() => addAdjustment(inv.id)}
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 px-2 py-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
                                  title="Agregar ajuste"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Ajuste</span>
                                </button>
                              </div>
                            </div>

                            {item.adjustments.length > 0 && isExpanded && (
                              <div className="bg-neutral-50/50 dark:bg-neutral-900/30 border-l-2 border-neutral-300 dark:border-neutral-700 pl-4 py-2 my-1 mx-3 space-y-2">
                                <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 flex items-center justify-between pr-2">
                                  <span>Ajustes sobre Factura {inv.invoice_number}</span>
                                  <button
                                    type="button"
                                    onClick={() => addAdjustment(inv.id)}
                                    className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Otro ajuste</span>
                                  </button>
                                </div>

                                <div className="space-y-1.5 pr-2">
                                  {item.adjustments.map((adj) => (
                                    <div
                                      key={adj.id}
                                      className="flex items-center gap-2"
                                    >
                                      <select
                                        value={adj.type}
                                        onChange={(e) =>
                                          updateAdjustment(
                                            inv.id,
                                            adj.id,
                                            "type",
                                            e.target.value as "DEBITO" | "CREDITO"
                                          )
                                        }
                                        className="text-xs rounded-lg py-1 px-2 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:outline-none cursor-pointer"
                                      >
                                        <option value="DEBITO">DÉBITO (+)</option>
                                        <option value="CREDITO">CRÉDITO (-)</option>
                                      </select>

                                      <input
                                        type="text"
                                        placeholder="Motivo del ajuste..."
                                        value={adj.description}
                                        onChange={(e) =>
                                          updateAdjustment(inv.id, adj.id, "description", e.target.value)
                                        }
                                        className="text-xs py-1 px-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex-1 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none"
                                        required
                                      />

                                      <div className="relative w-36">
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          placeholder="0.00"
                                          value={adj.amount}
                                          onChange={(e) =>
                                            updateAdjustment(inv.id, adj.id, "amount", e.target.value)
                                          }
                                          className="w-full text-right font-mono tabular-nums text-xs pr-9 pl-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:outline-none"
                                          required
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 font-mono tabular-nums">
                                          VES
                                        </span>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => removeAdjustment(inv.id, adj.id)}
                                        className="text-neutral-400 hover:text-red-500 transition-colors p-1 rounded cursor-pointer"
                                        title="Eliminar ajuste"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="px-6 pt-3 pb-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-1.5">
              Notas para Tesorería (Opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones o instrucciones para la mesa de dinero / tesorería..."
              className="w-full text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-2 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600 resize-none"
            />
          </div>

          <div className="border-t border-neutral-200 dark:border-neutral-800 px-6 py-4 flex items-center justify-between bg-neutral-50/30 dark:bg-neutral-900/30 mt-auto">
            <div className="text-xs text-neutral-500">
              <span>
                {calculatedInvoices.length}{" "}
                {calculatedInvoices.length === 1 ? "factura seleccionada" : "facturas seleccionadas"}
              </span>
              <span className="mx-2 text-neutral-300 dark:text-neutral-700">•</span>
              <span>
                Total:{" "}
                <strong className="font-mono tabular-nums font-semibold text-neutral-900 dark:text-neutral-100">
                  {formatMoney(totalPropuestaVES, "VES")}
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 px-4 py-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  selectedInvoices.length === 0 ||
                  isOverQuota ||
                  hasNoApprovedAvailability
                }
                className="bg-locatel-medio hover:bg-locatel-medio/80 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 font-semibold text-xs px-5 py-2.5 rounded-lg shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? "Procesando..." : "Confirmar y Crear Propuesta"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
