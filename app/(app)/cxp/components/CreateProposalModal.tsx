"use client";

import { useState } from "react";
import { AlertCircle, FileText, Send, X } from "lucide-react";
import { toast } from "sonner";
import { fetchClient } from "@/lib/fetchClient";
import { Company } from "@/app/(app)/tesoreria/types";
import { Invoice } from "../types";

interface CreateProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedInvoices: Invoice[];
  companies: Company[];
  selectedCompanyId: string;
  exchangeRate?: number;
  onSuccess: () => void;
}

export function CreateProposalModal({
  isOpen,
  onClose,
  selectedInvoices,
  companies,
  selectedCompanyId,
  exchangeRate = 1.0,
  onSuccess,
}: CreateProposalModalProps) {
  const [executionDate, setExecutionDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const targetCompanyId =
    selectedCompanyId !== "ALL"
      ? selectedCompanyId
      : selectedInvoices[0]?.company_id || "";

  const company = companies.find((c) => c.id === targetCompanyId);

  const formatMoney = (val: number, cur: string) => {
    return (
      new Intl.NumberFormat("es-VE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(val) +
      " " +
      cur
    );
  };

  const totalEstimatedVES = selectedInvoices.reduce((sum, inv) => {
    const remaining = inv.total_amount - (inv.paid_amount || 0);
    if (inv.currency === "VES") return sum + remaining;
    const rate = exchangeRate > 0 ? exchangeRate : inv.exchange_rate || 1;
    return sum + remaining * rate;
  }, 0);

  const totalEstimatedUSD = selectedInvoices.reduce((sum, inv) => {
    const remaining = inv.total_amount - (inv.paid_amount || 0);
    if (inv.currency === "USD") return sum + remaining;
    const rate = exchangeRate > 0 ? exchangeRate : inv.exchange_rate || 1;
    return sum + (rate > 0 ? remaining / rate : 0);
  }, 0);

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

    setIsSubmitting(true);
    try {
      const res = await fetchClient("/api/cxp/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: targetCompanyId,
          execution_date: executionDate,
          notes: notes.trim(),
          invoice_ids: selectedInvoices.map((inv) => inv.id),
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Crear Propuesta de Pago
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Remisión formal de lote de facturas para aprobación del Coordinador
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/60 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-500 dark:text-neutral-400">Empresa:</span>
              <span className="font-bold text-neutral-900 dark:text-neutral-100">
                {company?.name || "No definida"}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-500 dark:text-neutral-400">
                Facturas seleccionadas:
              </span>
              <span className="px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-bold font-mono">
                {selectedInvoices.length}
              </span>
            </div>

            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700/60 grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                  Monto Estimado VES
                </span>
                <span className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                  Bs. {formatMoney(totalEstimatedVES, "VES")}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                  Monto Estimado USD
                </span>
                <span className="text-sm font-extrabold font-mono text-neutral-700 dark:text-neutral-300">
                  ≈ ${formatMoney(totalEstimatedUSD, "USD")}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Fecha de Ejecución Estimada <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={executionDate}
                onChange={(e) => setExecutionDate(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-neutral-100 font-semibold focus:outline-none focus:ring-2 focus:ring-locatel-medio/40"
              />
            </div>
            <p className="text-[11px] text-neutral-400">
              Fecha para la cual se validará el cupo disponible asignado por Tesorería.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Notas u Observaciones (Opcional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Indique justificación de pago, prioridad o detalles para el Coordinador..."
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40"
            />
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <span>
              Al crear la propuesta, las facturas cambiarán su estatus a <strong>EN_PROPUESTA</strong> y quedarán reservadas para la revisión y aprobación formal del Coordinador.
            </span>
          </div>

          <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-locatel-medio hover:bg-locatel-oscuro text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Crear Propuesta de Pago</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
