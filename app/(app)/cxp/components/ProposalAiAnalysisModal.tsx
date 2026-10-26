"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BrainCircuit,
  CheckCircle2,
  Info,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { fetchClient } from "@/lib/fetchClient";
import { Company } from "@/app/(app)/tesoreria/types";
import {
  AiProposalRecommendationsResponse,
  Invoice,
} from "../types";

interface ProposalAiAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: Company[];
  selectedCompanyId?: string;
  onLoadIntoProposal: (selectedInvoices: Invoice[]) => void;
}

export function ProposalAiAnalysisModal({
  isOpen,
  onClose,
  companies,
  selectedCompanyId = "ALL",
  onLoadIntoProposal,
}: ProposalAiAnalysisModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [companyId, setCompanyId] = useState<string>(selectedCompanyId || "ALL");
  const [targetDate, setTargetDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [data, setData] = useState<AiProposalRecommendationsResponse | null>(null);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    setCompanyId(selectedCompanyId || "ALL");
  }, [selectedCompanyId]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading) {
      setLoadingStep(0);
      timer = setInterval(() => {
        setLoadingStep((prev) => (prev < 2 ? prev + 1 : 0));
      }, 1600);
    }
    return () => {
      clearInterval(timer);
    };
  }, [loading]);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const payload: Record<string, any> = {
        target_date: targetDate,
      };
      if (companyId && companyId !== "ALL") {
        payload.company_id = companyId;
      }

      const res = await fetchClient("/api/cxp/proposals/ai-recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(
          errData?.message || "Error al generar la propuesta optimizada con IA"
        );
      }

      const resData: AiProposalRecommendationsResponse = await res.json();
      setData(resData);

      const allRecommendedIds = new Set(
        (resData.recommendations || []).map((r) => r.invoice_id)
      );
      setSelectedInvoiceIds(allRecommendedIds);
    } catch (err: any) {
      toast.error(err.message || "Fallo en el motor de optimización de pagos");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runAnalysis();
    } else {
      setData(null);
      setSelectedInvoiceIds(new Set());
    }
  }, [isOpen]);

  const toggleInvoice = (id: string) => {
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

  const toggleAll = () => {
    if (!data?.recommendations) return;
    if (selectedInvoiceIds.size === data.recommendations.length) {
      setSelectedInvoiceIds(new Set());
    } else {
      setSelectedInvoiceIds(new Set(data.recommendations.map((r) => r.invoice_id)));
    }
  };

  const computedTotals = useMemo(() => {
    const quotaVES = data?.quota_available_ves || 0;
    if (!data?.recommendations) {
      return {
        totalVES: 0,
        totalUSD: 0,
        remanenteVES: quotaVES,
        usagePct: 0,
        count: 0,
      };
    }

    let sumVES = 0;
    let count = 0;
    for (const rec of data.recommendations) {
      if (selectedInvoiceIds.has(rec.invoice_id)) {
        sumVES += rec.net_amount_ves;
        count += 1;
      }
    }

    const remanenteVES = Math.max(0, quotaVES - sumVES);
    const usagePct = quotaVES > 0 ? (sumVES / quotaVES) * 100 : 0;
    const exchangeRate =
      data.total_recommended_ves > 0 && data.total_recommended_usd > 0
        ? data.total_recommended_ves / data.total_recommended_usd
        : 1.0;
    const sumUSD = exchangeRate > 0 ? sumVES / exchangeRate : 0;

    return {
      totalVES: sumVES,
      totalUSD: sumUSD,
      remanenteVES,
      usagePct,
      count,
    };
  }, [data, selectedInvoiceIds]);

  const invoiceMap = useMemo(() => {
    const map = new Map<string, Invoice>();
    (data?.eligible_invoices || []).forEach((inv) => {
      map.set(inv.id, inv);
    });
    return map;
  }, [data?.eligible_invoices]);

  const handleApply = () => {
    if (selectedInvoiceIds.size === 0) {
      toast.error("Debe seleccionar al menos una factura para transferir");
      return;
    }

    const selectedInvoices: Invoice[] = [];
    const targetComp = companyId && companyId !== "ALL" ? companyId : "";

    for (const id of Array.from(selectedInvoiceIds)) {
      const matched = data?.eligible_invoices?.find((inv) => inv.id === id);
      if (matched) {
        selectedInvoices.push(matched);
      } else {
        const rec = data?.recommendations?.find((r) => r.invoice_id === id);
        if (rec) {
          selectedInvoices.push({
            id: rec.invoice_id,
            company_id: targetComp,
            invoice_number: rec.invoice_number,
            supplier_id: "",
            supplier: {
              id: "",
              rif: rec.supplier_rif,
              business_name: rec.supplier_name,
              supplier_type: "FIRME",
              credit_days: 0,
              is_active: true,
            },
            reception_date: rec.due_date,
            issue_date: rec.due_date,
            due_date: rec.due_date,
            currency: (rec.currency as any) || "VES",
            exchange_rate: 1.0,
            subtotal: rec.net_amount,
            discount_amount: 0,
            exempt_amount: 0,
            taxable_base_16: 0,
            tax_amount_16: 0,
            taxable_base_8: 0,
            tax_amount_8: 0,
            taxable_base_31: 0,
            tax_amount_31: 0,
            tax_amount: 0,
            igtf_amount: 0,
            vat_retention_pct: 0,
            vat_retention_amount: 0,
            islr_retention_pct: 0,
            islr_retention_amount: 0,
            total_amount: rec.net_amount,
            total_amount_usd: 0,
            equivalent_amount: rec.net_amount,
            net_amount: rec.net_amount,
            net_amount_usd: 0,
            paid_amount: 0,
            is_indexed: false,
            early_payment_pct: 0,
            status: "PENDIENTE",
          } as Invoice);
        }
      }
    }

    onLoadIntoProposal(selectedInvoices);
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

  const renderPriorityBadge = (priority: string) => {
    const p = (priority || "").toUpperCase();
    if (p === "ALTA") {
      return (
        <span className="bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0">
          ALTA
        </span>
      );
    }
    if (p === "MEDIA") {
      return (
        <span className="bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0">
          MEDIA
        </span>
      );
    }
    return (
      <span className="bg-neutral-100 text-neutral-600 dark:bg-neutral-800/50 dark:text-neutral-400 text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0">
        BAJA
      </span>
    );
  };

  const loadingMessages = [
    "Verificando cupo libre asignado por Tesorería...",
    "Evaluando vencimientos y condiciones comerciales de proveedores...",
    "Construyendo propuesta optimizada...",
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="max-w-5xl w-full h-[85vh] md:h-[80vh] flex flex-col bg-white dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden transition-all">
        <div className="px-6 py-3.5 border-b border-neutral-100 dark:border-neutral-900 flex items-center justify-between gap-4 bg-white dark:bg-neutral-950 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-locatel-medio text-white text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded">
                IA
              </span>
              <h2 className="text-base font-semibold text-neutral-950 dark:text-neutral-50 tracking-tight">
                Análisis y Optimización de Pagos
              </h2>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Propuesta recomendada de manera automatizada según disponibilidad, prioridades y plazos de crédito
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-neutral-50/50 dark:bg-neutral-900/30 border-b border-neutral-100 dark:border-neutral-900 px-6 py-2.5 flex items-center justify-between gap-4 shrink-0 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500 font-medium text-[11px]">Empresa:</span>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                disabled={loading}
                className="px-2.5 py-1 rounded bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium text-xs focus:outline-none focus:ring-1 focus:ring-neutral-400 cursor-pointer"
              >
                <option value="ALL">Todas las Empresas (Global)</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code ? `${c.code} · ${c.name}` : c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500 font-medium text-[11px]">Fecha de Propuesta:</span>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                disabled={loading}
                className="px-2.5 py-1 rounded bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-neutral-400 cursor-pointer"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={runAnalysis}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-locatel-medio text-white dark:bg-locatel-claro/95 dark:text-text-white hover:bg-locatel-medio/95 dark:hover:bg-locatel-claro text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>Recalcular</span>
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="relative mb-4">
              <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center">
                <BrainCircuit className="w-6 h-6 text-neutral-700 dark:text-neutral-300 animate-pulse" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center">
                <Loader2 className="w-2.5 h-2.5 text-neutral-700 dark:text-neutral-300 animate-spin" />
              </div>
            </div>
            <h4 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-0.5">
              Optimizando asignación de liquidez
            </h4>
            <p className="text-[11px] text-neutral-500 max-w-sm">
              {loadingMessages[loadingStep]}
            </p>
          </div>
        ) : !data ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-neutral-400">
            <Info className="w-7 h-7 mx-auto mb-2 opacity-40" />
            <p className="text-xs">Haga clic en Recalcular para generar el análisis financiero</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="bg-transparent grid grid-cols-1 md:grid-cols-4 gap-4 px-6 py-4 border-b border-neutral-100 dark:border-neutral-900 divide-y md:divide-y-0 md:divide-x divide-neutral-100 dark:divide-neutral-900/80 shrink-0">
              <div className="flex flex-col justify-between">
                <span className="text-[10px] font-semibold tracking-wider text-neutral-400 dark:text-neutral-500 uppercase">
                  Cupo Proveedores Hoy
                </span>
                <span className="text-sm md:text-base font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-50 mt-1">
                  {formatMoney(data.quota_available_ves, "VES")}
                </span>
              </div>

              <div className="flex flex-col justify-between md:pl-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold tracking-wider text-neutral-400 dark:text-neutral-500 uppercase">
                    Total Propuesta IA
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400">
                    {computedTotals.count} fact.
                  </span>
                </div>
                <span className="text-sm md:text-base font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-50 mt-1">
                  {formatMoney(computedTotals.totalVES, "VES")}
                </span>
              </div>

              <div className="flex flex-col justify-between md:pl-4">
                <span className="text-[10px] font-semibold tracking-wider text-neutral-400 dark:text-neutral-500 uppercase">
                  Cupo Remanente
                </span>
                <span className="text-sm md:text-base font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-50 mt-1">
                  {formatMoney(computedTotals.remanenteVES, "VES")}
                </span>
              </div>

              <div className="flex flex-col justify-between md:pl-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold tracking-wider text-neutral-400 dark:text-neutral-500 uppercase">
                    % de Uso Cupo
                  </span>
                  <span className="text-xs font-mono font-bold tabular-nums text-neutral-900 dark:text-neutral-50">
                    {computedTotals.usagePct.toFixed(1)}%
                  </span>
                </div>
                <div className="h-1 bg-neutral-100 dark:bg-neutral-900 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-locatel-medio rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, computedTotals.usagePct)}%` }}
                  />
                </div>
              </div>
            </div>

            {data.quota_available_ves <= 0 ? (
              <div className="mx-6 mt-3.5 mb-1 bg-amber-50/60 dark:bg-amber-950/20 rounded-lg p-3 border border-amber-200/40 dark:border-amber-900/40 flex items-start gap-2.5 shrink-0">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-xs font-semibold text-amber-900 dark:text-amber-200 block mb-0.5">
                    Sin cupo aprobado para proveedores hoy
                  </span>
                  <p className="text-xs text-amber-700/90 dark:text-amber-400/90 font-normal leading-relaxed">
                    Tesorería no ha aprobado disponibilidad para proveedores en el cierre operativo de esta fecha. La IA trabaja estrictamente sobre los fondos cerrados del día y no puede aconsejar cupos de dinero.
                  </p>
                </div>
              </div>
            ) : data.executive_summary ? (
              <div className="mx-6 mt-3.5 mb-1 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-3 border border-neutral-200/50 dark:border-neutral-800/50 flex items-start gap-2.5 shrink-0">
                <Sparkles className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block mb-0.5">
                    Diagnóstico Financiero Estratégico
                  </span>
                  <p className="text-xs text-neutral-500 font-normal leading-relaxed">
                    {data.executive_summary}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="px-6 py-2.5 bg-neutral-50/40 dark:bg-neutral-900/20 border-b border-neutral-100 dark:border-neutral-900 flex items-center justify-between text-xs shrink-0 mt-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={
                    data.recommendations.length > 0 &&
                    selectedInvoiceIds.size === data.recommendations.length
                  }
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-neutral-50 focus:ring-neutral-400 cursor-pointer"
                />
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Facturas Sugeridas ({selectedInvoiceIds.size} de {data.recommendations.length} seleccionadas)
                </span>
              </div>

              <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                Marca o desmarca para recalcular el cupo
              </span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-900/50">
              {data.recommendations.length === 0 ? (
                <div className="py-14 text-center text-xs text-neutral-400">
                  {data.quota_available_ves <= 0
                    ? "Sin fondos cerrados de Tesorería para proveedores en este día."
                    : "No se encontraron facturas elegibles dentro del cupo disponible."}
                </div>
              ) : (
                data.recommendations.map((rec) => {
                  const isSelected = selectedInvoiceIds.has(rec.invoice_id);
                  const matchedInv = invoiceMap.get(rec.invoice_id);

                  return (
                    <div
                      key={rec.invoice_id}
                      onClick={() => toggleInvoice(rec.invoice_id)}
                      className={`flex flex-col gap-1 py-2.5 px-6 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 transition-colors cursor-pointer select-none ${isSelected ? "bg-white dark:bg-neutral-950" : "opacity-50"
                        }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center shrink-0"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleInvoice(rec.invoice_id)}
                              className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-neutral-50 focus:ring-neutral-400 cursor-pointer"
                            />
                          </div>

                          {renderPriorityBadge(rec.priority)}

                          <div className="flex items-center gap-1.5 min-w-0 truncate">
                            <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                              {rec.supplier_name}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono shrink-0">
                              {rec.supplier_rif}
                            </span>
                            {(!companyId || companyId === "ALL") && matchedInv?.company && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200/50 dark:border-neutral-700/50 shrink-0">
                                {matchedInv.company.code || matchedInv.company.name}
                              </span>
                            )}
                          </div>

                          <span className="font-mono text-xs text-neutral-700 dark:text-neutral-300 shrink-0 ml-1">
                            {rec.invoice_number}
                          </span>

                          {matchedInv?.is_indexed && (
                            <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/40 shrink-0">
                              INDEXADA
                            </span>
                          )}

                          <div className="flex items-center gap-1 shrink-0 ml-1">
                            <span className="font-mono text-xs text-neutral-500">
                              {formatDate(rec.due_date)}
                            </span>
                            {rec.days_overdue > 0 ? (
                              <span className="text-[10px] text-red-500 font-medium font-sans">
                                ({rec.days_overdue}d mora)
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 text-right">
                          <span className="font-mono text-xs text-neutral-500 tabular-nums">
                            {formatMoney(rec.net_amount, rec.currency)}
                          </span>

                          <span className="font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                            {formatMoney(rec.net_amount_ves, "VES")}
                          </span>

                          {rec.early_payment_discount > 0 && (
                            <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded shrink-0">
                              -{formatMoney(rec.early_payment_discount, "VES")}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pl-7 text-[11px] text-neutral-500 dark:text-neutral-400 font-normal leading-relaxed italic border-l-2 border-neutral-100 dark:border-neutral-900 ml-2 py-0.5">
                        {rec.reasoning || "Seleccionada por encaje financiero y optimización de vencimiento."}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        <div className="px-6 py-3.5 border-t border-neutral-100 dark:border-neutral-900 bg-neutral-50/10 dark:bg-neutral-950 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-[13px] text-neutral-400 dark:text-neutral-500 italic flex items-center gap-1">
            <Info className="w-3 h-3 text-neutral-400 shrink-0" />
            <span>
              La IA puede cometer errores. Verifique los datos financieros antes de procesar la propuesta.
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-300 px-4 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={loading || selectedInvoiceIds.size === 0 || (data?.quota_available_ves || 0) <= 0}
              className="bg-locatel-medio text-white hover:bg-locatel-medio/95 dark:bg-locatel-claro/95 dark:text-text-white px-4 py-2 text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Cargar en Nueva Propuesta de Pago ({selectedInvoiceIds.size})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
