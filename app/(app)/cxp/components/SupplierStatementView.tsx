"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  History,
  Loader2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { fetchClient } from "@/lib/fetchClient";
import { Company } from "@/app/(app)/tesoreria/types";
import { SupplierStatement } from "../types";

interface SupplierStatementViewProps {
  supplierId: string;
  onBack: () => void;
  companies: Company[];
}

export function SupplierStatementView({
  supplierId,
  onBack,
  companies,
}: SupplierStatementViewProps) {
  const [statement, setStatement] = useState<SupplierStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"OPEN" | "HISTORY">("OPEN");

  const fetchStatement = async () => {
    setLoading(true);
    try {
      let url = `/api/cxp/suppliers/${supplierId}/statement`;
      if (selectedCompanyId && selectedCompanyId !== "ALL") {
        url += `?company_id=${selectedCompanyId}`;
      }
      const res = await fetchClient(url);
      if (res.ok) {
        const data = await res.json();
        setStatement(data);
      } else {
        toast.error("Error al cargar estado de cuenta del proveedor");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error de conexión al cargar estado de cuenta");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatement();
  }, [supplierId, selectedCompanyId]);

  const formatNumber = (num: number) => {
    return num.toLocaleString("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-neutral-400">
        <Loader2 className="w-8 h-8 animate-spin text-locatel-medio" />
        <span className="text-xs font-semibold">Cargando estado de cuenta del proveedor...</span>
      </div>
    );
  }

  if (!statement) {
    return (
      <div className="p-8 text-center bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800">
        <p className="text-sm font-semibold text-neutral-500 mb-4">
          No se pudo encontrar el estado de cuenta del proveedor.
        </p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-locatel-medio hover:bg-locatel-oscuro cursor-pointer"
        >
          Volver
        </button>
      </div>
    );
  }

  const { supplier } = statement;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                {supplier.business_name}
              </h2>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-locatel-medio/10 text-locatel-medio dark:bg-emerald-950/40 dark:text-emerald-400">
                {supplier.rif}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Código SAP: {supplier.sap_vendor_code || "Sin código"} • Plazo de Crédito: {supplier.credit_days} días
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-semibold text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-locatel-medio/20 cursor-pointer"
          >
            <option value="ALL">Todas las Empresas</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold">Total Deuda Acumulada</span>
            <Wallet className="w-4 h-4 text-teal-500" />
          </div>
          <p className="text-lg font-extrabold font-mono text-neutral-900 dark:text-neutral-100">
            Bs. {formatNumber(statement.total_debt_ves)}
          </p>
          <p className="text-xs font-mono text-neutral-400">
            ≈ ${formatNumber(statement.total_debt_usd)}
          </p>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold">Deuda Vencida</span>
            <AlertCircle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-lg font-extrabold font-mono text-red-600 dark:text-red-400">
            Bs. {formatNumber(statement.total_overdue_ves)}
          </p>
          <p className="text-xs font-mono text-neutral-400">
            ≈ ${formatNumber(statement.total_overdue_usd)}
          </p>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold">Por Vencer (Corriente)</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-lg font-extrabold font-mono text-neutral-900 dark:text-neutral-100">
            Bs. {formatNumber(statement.total_current_ves)}
          </p>
          <p className="text-xs font-mono text-neutral-400">
            ≈ ${formatNumber(statement.total_current_usd)}
          </p>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold">Total Pagado Histórico</span>
            <CheckCircle2 className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-lg font-extrabold font-mono text-purple-600 dark:text-purple-400">
            Bs. {formatNumber(statement.total_paid_ves)}
          </p>
          <p className="text-xs font-mono text-neutral-400">
            ≈ ${formatNumber(statement.total_paid_usd)}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-3">
          <button
            onClick={() => setActiveTab("OPEN")}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${activeTab === "OPEN"
              ? "bg-locatel-medio text-white shadow-xs"
              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
          >
            <FileText className="w-4 h-4" />
            <span>Deuda Activa ({statement.open_invoices.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("HISTORY")}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${activeTab === "HISTORY"
              ? "bg-locatel-medio text-white shadow-xs"
              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
          >
            <History className="w-4 h-4" />
            <span>Historial de Pagos ({statement.payment_history.length})</span>
          </button>
        </div>

        {activeTab === "OPEN" ? (
          <div className="overflow-x-auto">
            {statement.open_invoices.length === 0 ? (
              <div className="py-16 text-center text-neutral-400 text-xs font-semibold">
                No hay facturas pendientes ni programadas para este proveedor.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-100 dark:border-neutral-800 text-[11px] font-bold text-neutral-400 uppercase tracking-wider bg-neutral-50/50 dark:bg-neutral-800/40">
                    <th className="py-3 px-4">Empresa</th>
                    <th className="py-3 px-4">N° Factura</th>
                    <th className="py-3 px-4">Emisión</th>
                    <th className="py-3 px-4">Vencimiento</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4 text-right">Monto Total</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                  {statement.open_invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-neutral-800 dark:text-neutral-200">
                        {inv.company?.name || "Empresa"}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-neutral-900 dark:text-neutral-100">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3 px-4 font-mono text-neutral-500">
                        {inv.issue_date?.split("T")[0] || inv.issue_date}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                        {inv.due_date?.split("T")[0] || inv.due_date}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                          {inv.invoice_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-neutral-900 dark:text-neutral-100">
                        {inv.currency} {formatNumber(inv.total_amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${inv.status === "PROGRAMADO"
                            ? "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                            }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {statement.payment_history.length === 0 ? (
              <div className="py-16 text-center text-neutral-400 text-xs font-semibold">
                No hay historial de pagos registrados para este proveedor.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-100 dark:border-neutral-800 text-[11px] font-bold text-neutral-400 uppercase tracking-wider bg-neutral-50/50 dark:bg-neutral-800/40">
                    <th className="py-3 px-4">Fecha de Pago</th>
                    <th className="py-3 px-4">Referencia</th>
                    <th className="py-3 px-4">Banco Pagador</th>
                    <th className="py-3 px-4">Cuenta</th>
                    <th className="py-3 px-4">Factura Cancelada</th>
                    <th className="py-3 px-4 text-right">Monto Pagado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                  {statement.payment_history.map((p, idx) => (
                    <tr
                      key={`${p.payment_id}-${idx}`}
                      className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                        {p.payment_date}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-locatel-medio dark:text-emerald-400">
                        {p.reference_number}
                      </td>
                      <td className="py-3 px-4 font-semibold text-neutral-900 dark:text-neutral-100">
                        {p.bank_name}
                      </td>
                      <td className="py-3 px-4 font-mono text-neutral-500">
                        •••• {p.account_number ? p.account_number.slice(-4) : "0000"}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-neutral-800 dark:text-neutral-200">
                        {p.invoice_number}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                        {p.currency} {formatNumber(p.amount_paid)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
