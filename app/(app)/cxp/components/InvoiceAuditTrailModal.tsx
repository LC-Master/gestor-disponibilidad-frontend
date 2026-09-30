"use client";

import { useEffect, useState } from "react";
import { Clock, History, Loader2, User, X } from "lucide-react";
import { fetchClient } from "@/lib/fetchClient";
import { Invoice, InvoiceAuditLog } from "../types";

interface InvoiceAuditTrailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

export function InvoiceAuditTrailModal({
  isOpen,
  onClose,
  invoice,
}: InvoiceAuditTrailModalProps) {
  const [logs, setLogs] = useState<InvoiceAuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !invoice) return;

    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await fetchClient(`/api/cxp/invoices/${invoice.id}/audit-trail`);
        if (res.ok) {
          const data = await res.json();
          setLogs(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [isOpen, invoice]);

  if (!isOpen || !invoice) return null;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("es-VE", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase().trim();
    if (act === "CREATED") {
      return "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300";
    }
    if (act === "SCHEDULED") {
      return "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300";
    }
    if (act === "UNSCHEDULED") {
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300";
    }
    if (act === "PAID") {
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300";
    }
    if (act === "CANCELLED") {
      return "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300";
    }
    return "bg-neutral-100 text-neutral-700";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-xl rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-locatel-medio/10 text-locatel-medio">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Trazabilidad de la Factura
              </h3>
              <p className="text-xs text-neutral-400 font-mono">
                {invoice.invoice_number} ({invoice.supplier?.business_name || "Proveedor"})
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

        <div className="p-6 max-h-[65vh] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-neutral-400">
              <Loader2 className="w-6 h-6 animate-spin text-locatel-medio" />
              <span className="text-xs font-semibold">Cargando eventos de auditoría...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-neutral-400 text-xs font-semibold">
              No hay eventos de auditoría registrados para esta factura.
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200 dark:before:bg-neutral-800">
              {logs.map((log) => {
                const userFullName = log.user
                  ? `${log.user.name} ${log.user.last_name}`
                  : "Sistema / Usuario";
                const userRole =
                  log.user?.roles && log.user.roles.length > 0
                    ? log.user.roles[0].name
                    : "Usuario";

                return (
                  <div key={log.id} className="relative group">
                    <div className="absolute -left-7.25 top-1 w-3.5 h-3.5 rounded-full bg-white dark:bg-neutral-900 border-2 border-locatel-medio" />

                    <div className="p-4 rounded-2xl bg-neutral-50/70 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-700/60 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${getActionBadge(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-mono">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatDate(log.created_at)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                        <User className="w-3.5 h-3.5 text-neutral-400" />
                        <span>{userFullName}</span>
                        <span className="text-[10px] font-normal px-2 py-0.2 rounded-md bg-neutral-200/70 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                          {userRole}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs pt-1 border-t border-neutral-200/50 dark:border-neutral-700/50">
                        <span className="text-[11px] text-neutral-400">Transición:</span>
                        {log.previous_status && (
                          <>
                            <span className="font-semibold text-neutral-600 dark:text-neutral-400">
                              {log.previous_status}
                            </span>
                            <span className="text-neutral-400">→</span>
                          </>
                        )}
                        <span className="font-extrabold text-locatel-medio dark:text-emerald-400">
                          {log.new_status}
                        </span>
                      </div>

                      {log.details && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 pt-1">
                          {log.details}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
