"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Loader2,
  Plus,
  Power,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { fetchClient, isTechnicalError, sanitizeErrorMessage } from "@/lib/fetchClient";
import { useFormState } from "@/hooks/useFormState";
import { bankSchema } from "@/schemas/treasury";
import { Bank } from "../types";
import { useTreasury } from "../context";

interface BanksManagementProps {
  onChanged?: () => void;
}

const INITIAL_BANK_FORM = {
  code: "",
  name: "",
  is_cash: false,
};

function getSafeBackendErrorMessage(err: any, fallback: string): string {
  const rawMsg = err?.data?.message || err?.message;
  if (
    typeof rawMsg === "string" &&
    rawMsg.trim() &&
    !rawMsg.startsWith("Error ") &&
    !isTechnicalError(rawMsg)
  ) {
    return rawMsg;
  }
  return sanitizeErrorMessage(err, fallback);
}

export function BanksManagement({ onChanged }: BanksManagementProps) {
  const { user, handleRefresh } = useTreasury();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [confirmToggleBank, setConfirmToggleBank] = useState<Bank | null>(null);
  const [isToggling, setIsToggling] = useState<boolean>(false);

  const bankForm = useFormState(INITIAL_BANK_FORM);

  const roles = useMemo(
    () => (user?.roles || []).map((r) => r.toUpperCase().trim()),
    [user]
  );
  const perms = useMemo(
    () => (user?.permissions || []).map((p) => p.toLowerCase().trim()),
    [user]
  );

  const isPrivilegedRole = useMemo(
    () =>
      roles.includes("ADMIN") ||
      roles.includes("ADMINISTRADOR") ||
      roles.includes("COORD_TESORERIA"),
    [roles]
  );

  const canCreateBank = useMemo(
    () =>
      isPrivilegedRole ||
      perms.includes("treasury.banks.manage") ||
      perms.includes("treasury.accounts.manage"),
    [isPrivilegedRole, perms]
  );

  const canEditBank = useMemo(
    () =>
      isPrivilegedRole ||
      perms.includes("treasury.banks.edit") ||
      perms.includes("treasury.banks.manage") ||
      perms.includes("treasury.accounts.manage"),
    [isPrivilegedRole, perms]
  );

  const canToggleStatus = useMemo(
    () =>
      isPrivilegedRole ||
      perms.includes("treasury.banks.status") ||
      perms.includes("treasury.banks.manage") ||
      perms.includes("treasury.accounts.manage"),
    [isPrivilegedRole, perms]
  );

  const fetchBanks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("page_size", String(pageSize));
      if (search.trim()) {
        params.set("search", search.trim());
      }
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const res = await fetchClient(`/api/v1/banks?${params.toString()}`);
      if (!res.ok) {
        throw new Error("No se pudo cargar el listado de bancos");
      }
      const json = await res.json();
      if (json && Array.isArray(json.data) && json.meta) {
        setBanks(json.data);
        setTotalRecords(Number(json.meta.total_records || 0));
        setTotalPages(Math.max(1, Number(json.meta.total_pages || 1)));
      } else if (Array.isArray(json)) {
        setBanks(json);
        setTotalRecords(json.length);
        setTotalPages(Math.max(1, Math.ceil(json.length / pageSize)));
      } else {
        setBanks([]);
        setTotalRecords(0);
        setTotalPages(1);
      }
    } catch (err: any) {
      toast.error(getSafeBackendErrorMessage(err, "Error al cargar bancos"));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBanks();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchBanks]);

  const handleFieldChange = <K extends keyof typeof INITIAL_BANK_FORM>(
    field: K,
    value: (typeof INITIAL_BANK_FORM)[K]
  ) => {
    const nextValues = {
      ...bankForm.values,
      [field]: value,
      ...(field === "is_cash" && value === true ? { code: "" } : {}),
    };
    bankForm.setValues(nextValues);

    const parsed = bankSchema.safeParse({
      code: nextValues.is_cash ? "" : nextValues.code.trim(),
      name: nextValues.name.trim(),
      is_cash: nextValues.is_cash,
    });

    if (!parsed.success) {
      const flattened = z.flattenError(parsed.error);
      if (field === "is_cash") {
        bankForm.setErrors((prev) => ({
          ...prev,
          code: flattened.fieldErrors.code || [],
        }));
      } else {
        bankForm.setErrors((prev) => ({
          ...prev,
          [field]: flattened.fieldErrors[field as "code" | "name"] || [],
        }));
      }
    } else {
      bankForm.setErrors({});
    }
  };

  const openCreateModal = () => {
    setEditingBank(null);
    bankForm.reset();
    setIsModalOpen(true);
  };

  const openEditModal = (bank: Bank) => {
    setEditingBank(bank);
    bankForm.setValues({
      code: bank.code || "",
      name: bank.name || "",
      is_cash: Boolean(bank.is_cash),
    });
    bankForm.setErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBank(null);
    bankForm.reset();
  };

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    bankForm.setErrors({});

    const parsed = bankSchema.safeParse({
      code: bankForm.values.is_cash ? "" : bankForm.values.code.trim(),
      name: bankForm.values.name.trim(),
      is_cash: bankForm.values.is_cash,
    });

    if (!parsed.success) {
      const flattened = z.flattenError(parsed.error);
      bankForm.setErrors(flattened.fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingBank ? `/api/v1/banks/${editingBank.id}` : "/api/v1/banks";
      const method = editingBank ? "PUT" : "POST";

      const res = await fetchClient(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (res && !res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.errors && typeof data.errors === "object") {
          bankForm.setErrors(data.errors);
          return;
        }
        toast.error(getSafeBackendErrorMessage({ data }, "No se pudo guardar el banco"));
        return;
      }

      toast.success(
        editingBank ? "Banco actualizado exitosamente" : "Banco registrado exitosamente"
      );
      closeModal();
      await fetchBanks();
      handleRefresh();
      onChanged?.();
    } catch (err: any) {
      const fieldErrors = err?.data?.errors;
      if (fieldErrors && typeof fieldErrors === "object" && Object.keys(fieldErrors).length > 0) {
        bankForm.setErrors(fieldErrors);
        return;
      }
      toast.error(
        getSafeBackendErrorMessage(
          err,
          editingBank
            ? "No se pudo actualizar el banco. Verifique los datos e intente nuevamente."
            : "No se pudo registrar el banco. Verifique los datos e intente nuevamente."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmToggleStatus = async () => {
    if (!confirmToggleBank) return;
    setIsToggling(true);
    try {
      const nextStatus = !confirmToggleBank.is_active;
      const res = await fetchClient(`/api/v1/banks/${confirmToggleBank.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextStatus }),
      });

      const updated: Bank = await res.json();
      setBanks((prev) =>
        prev.map((b) => (b.id === updated.id ? { ...b, is_active: updated.is_active } : b))
      );
      toast.success(
        `Banco ${confirmToggleBank.name} ${updated.is_active ? "activado" : "desactivada"
        } exitosamente`
      );
      setConfirmToggleBank(null);
      await fetchBanks();
      handleRefresh();
      onChanged?.();
    } catch (err: any) {
      toast.error(getSafeBackendErrorMessage(err, "No se pudo cambiar el estado del banco"));
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white dark:bg-neutral-900 p-2.5 sm:p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-2xs">
        <div className="relative flex-1 min-w-60 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar banco por código SUDEBAN o nombre..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 h-9 border border-neutral-300 dark:border-neutral-700 focus:border-locatel-medio focus:ring-2 focus:ring-locatel-medio/80 bg-neutral-50/50 dark:bg-neutral-950 rounded-lg text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none transition-all shadow-2xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "all" | "active" | "inactive");
              setPage(1);
            }}
            className="h-9 px-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-950 text-xs font-semibold text-neutral-700 dark:text-neutral-200 focus:outline-none focus:border-locatel-medio cursor-pointer"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>

          <button
            type="button"
            onClick={fetchBanks}
            disabled={loading}
            className="h-9 px-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-200 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>

          {canCreateBank && (
            <button
              type="button"
              onClick={openCreateModal}
              className="h-9 px-3.5 text-xs font-semibold bg-locatel-medio hover:bg-locatel-oscuro text-white rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Banco</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col min-h-[calc(100vh-16rem)]">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50/80 dark:bg-neutral-800/60">
                <th className="px-4 py-3.5 text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                  Código Bancario
                </th>
                <th className="px-4 py-3.5 text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                  Nombre Institucional
                </th>
                <th className="px-4 py-3.5 text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                  Modalidad
                </th>
                <th className="px-4 py-3.5 text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3.5 text-right text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/80 dark:divide-neutral-800 text-sm">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-xs text-neutral-400 dark:text-neutral-500"
                  >
                    <div className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-locatel-medio" />
                      <span>Cargando bancos...</span>
                    </div>
                  </td>
                </tr>
              ) : banks.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-xs text-neutral-400 dark:text-neutral-500"
                  >
                    No se encontraron bancos registrados con los filtros actuales.
                  </td>
                </tr>
              ) : (
                banks.map((bank) => (
                  <tr
                    key={bank.id}
                    className="even:bg-neutral-50/30 dark:even:bg-neutral-800/20 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-xs font-mono font-semibold text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700">
                        {bank.is_cash ? "CAJA" : bank.code || "S/C"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {bank.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${bank.is_cash
                          ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                          : "bg-locatel-claro/20 dark:bg-locatel-claro/50 text-red border-locatel-claro dark:border-locatel-medio"
                          }`}
                      >
                        {bank.is_cash ? "Efectivo / Custodia" : "Institución Bancaria"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${bank.is_active
                          ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300"
                          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
                          }`}
                      >
                        {bank.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {canEditBank && (
                          <button
                            type="button"
                            onClick={() => openEditModal(bank)}
                            className="px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-200 inline-flex items-center gap-1 transition-colors cursor-pointer"
                            title="Editar banco"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-locatel-medio" />
                            <span>Editar</span>
                          </button>
                        )}

                        {canToggleStatus && (
                          <button
                            type="button"
                            onClick={() => setConfirmToggleBank(bank)}
                            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer ${bank.is_active
                              ? "border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/50"
                              : "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/50"
                              }`}
                            title={bank.is_active ? "Desactivar banco" : "Activar banco"}
                          >
                            <Power className="w-3.5 h-3.5" />
                            <span>{bank.is_active ? "Desactivar" : "Activar"}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
          <div className="flex items-center gap-3">
            <span>
              Mostrando {banks.length} de {totalRecords} bancos
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none cursor-pointer"
            >
              <option value={10}>10 por página</option>
              <option value={15}>15 por página</option>
              <option value={25}>25 por página</option>
              <option value={50}>50 por página</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={closeModal}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4">
              {editingBank ? "Editar Banco" : "Registrar Banco"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
                <div>
                  <span className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    ¿Es Caja / Efectivo?
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    Active si corresponde a custodia física sin código SUDEBAN
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={bankForm.values.is_cash}
                  onChange={(e) => handleFieldChange("is_cash", e.target.checked)}
                  className="w-4 h-4 accent-locatel-medio rounded cursor-pointer"
                />
              </div>

              {!bankForm.values.is_cash && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                    Código Bancario (4 dígitos) *
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="Ej. 0134"
                    value={bankForm.values.code}
                    onChange={(e) =>
                      handleFieldChange("code", e.target.value.replace(/\D/g, ""))
                    }
                    className="w-full px-3 py-2 border rounded-xl text-sm bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 focus:outline-none focus:border-locatel-medio font-mono"
                  />
                  {bankForm.errors.code?.[0] && (
                    <p className="mt-1 text-xs text-red-500">{bankForm.errors.code[0]}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                  Nombre Institucional *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Banesco Banco Universal"
                  value={bankForm.values.name}
                  onChange={(e) => handleFieldChange("name", e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 focus:outline-none focus:border-locatel-medio"
                />
                {bankForm.errors.name?.[0] && (
                  <p className="mt-1 text-xs text-red-500">{bankForm.errors.name[0]}</p>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-locatel-medio hover:bg-locatel-oscuro text-white disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting
                    ? "Guardando..."
                    : editingBank
                      ? "Guardar Cambios"
                      : "Guardar Banco"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmToggleBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${confirmToggleBank.is_active
                  ? "bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400"
                  : "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
                  }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  {confirmToggleBank.is_active ? "Desactivar Banco" : "Activar Banco"}
                </h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  ¿Está seguro que desea{" "}
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {confirmToggleBank.is_active ? "desactivar" : "activar"}
                  </span>{" "}
                  el banco{" "}
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {confirmToggleBank.code ? `${confirmToggleBank.code} · ` : ""}
                    {confirmToggleBank.name}
                  </span>
                  ?
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isToggling}
                onClick={() => setConfirmToggleBank(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isToggling}
                onClick={handleConfirmToggleStatus}
                className={`px-4 py-2 text-xs font-semibold rounded-xl text-white disabled:opacity-50 cursor-pointer ${confirmToggleBank.is_active
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-locatel-medio hover:bg-locatel-oscuro"
                  }`}
              >
                {isToggling
                  ? "Procesando..."
                  : confirmToggleBank.is_active
                    ? "Confirmar Desactivación"
                    : "Confirmar Activación"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
