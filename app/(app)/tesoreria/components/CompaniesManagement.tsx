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
import { companySchema } from "@/schemas/treasury";
import { Company } from "../types";
import { useTreasury } from "../context";

interface CompaniesManagementProps {
  onChanged?: () => void;
}

const INITIAL_COMPANY_FORM = {
  code: "",
  name: "",
  rif: "",
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

export function CompaniesManagement({ onChanged }: CompaniesManagementProps) {
  const { user, handleRefresh } = useTreasury();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [confirmToggleCompany, setConfirmToggleCompany] = useState<Company | null>(null);
  const [isToggling, setIsToggling] = useState<boolean>(false);

  const companyForm = useFormState(INITIAL_COMPANY_FORM);

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

  const canCreateCompany = useMemo(
    () =>
      isPrivilegedRole ||
      perms.includes("treasury.companies.manage") ||
      perms.includes("treasury.accounts.manage"),
    [isPrivilegedRole, perms]
  );

  const canEditCompany = useMemo(
    () =>
      isPrivilegedRole ||
      perms.includes("treasury.companies.edit") ||
      perms.includes("treasury.companies.manage") ||
      perms.includes("treasury.accounts.manage"),
    [isPrivilegedRole, perms]
  );

  const canToggleStatus = useMemo(
    () =>
      isPrivilegedRole ||
      perms.includes("treasury.companies.status") ||
      perms.includes("treasury.companies.manage") ||
      perms.includes("treasury.accounts.manage"),
    [isPrivilegedRole, perms]
  );

  const fetchCompanies = useCallback(async () => {
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

      const res = await fetchClient(`/api/v1/companies?${params.toString()}`);
      if (!res.ok) {
        throw new Error("No se pudo cargar el listado de empresas");
      }
      const json = await res.json();
      if (json && Array.isArray(json.data) && json.meta) {
        setCompanies(json.data);
        setTotalRecords(Number(json.meta.total_records || 0));
        setTotalPages(Math.max(1, Number(json.meta.total_pages || 1)));
      } else if (Array.isArray(json)) {
        setCompanies(json);
        setTotalRecords(json.length);
        setTotalPages(Math.max(1, Math.ceil(json.length / pageSize)));
      } else {
        setCompanies([]);
        setTotalRecords(0);
        setTotalPages(1);
      }
    } catch (err: any) {
      toast.error(getSafeBackendErrorMessage(err, "Error al cargar empresas"));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCompanies();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchCompanies]);

  const handleFieldChange = (field: keyof typeof INITIAL_COMPANY_FORM, value: string) => {
    const nextValues = {
      ...companyForm.values,
      [field]: value,
    };
    companyForm.setValues(nextValues);

    const parsed = companySchema.safeParse({
      code: nextValues.code.trim().toUpperCase(),
      name: nextValues.name.trim(),
      rif: nextValues.rif.trim().toUpperCase(),
    });

    if (!parsed.success) {
      const flattened = z.flattenError(parsed.error);
      const fieldMsg = flattened.fieldErrors[field];
      companyForm.setErrors((prev) => ({
        ...prev,
        [field]: fieldMsg || [],
      }));
    } else {
      companyForm.setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const openCreateModal = () => {
    setEditingCompany(null);
    companyForm.reset();
    setIsModalOpen(true);
  };

  const openEditModal = (company: Company) => {
    setEditingCompany(company);
    companyForm.setValues({
      code: company.code || "",
      name: company.name || "",
      rif: company.rif || "",
    });
    companyForm.setErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCompany(null);
    companyForm.reset();
  };

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    companyForm.setErrors({});

    const normalizedPayload = {
      code: companyForm.values.code.trim().toUpperCase(),
      name: companyForm.values.name.trim(),
      rif: companyForm.values.rif.trim().toUpperCase(),
    };

    const parsed = companySchema.safeParse(normalizedPayload);
    if (!parsed.success) {
      const flattened = z.flattenError(parsed.error);
      companyForm.setErrors(flattened.fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingCompany
        ? `/api/v1/companies/${editingCompany.id}`
        : "/api/v1/companies";
      const method = editingCompany ? "PUT" : "POST";

      const res = await fetchClient(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (res && !res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.errors && typeof data.errors === "object") {
          companyForm.setErrors(data.errors);
          return;
        }
        toast.error(getSafeBackendErrorMessage({ data }, "No se pudo guardar la empresa"));
        return;
      }

      toast.success(
        editingCompany
          ? "Empresa actualizada exitosamente"
          : "Empresa registrada exitosamente"
      );
      closeModal();
      await fetchCompanies();
      handleRefresh();
      onChanged?.();
    } catch (err: any) {
      const fieldErrors = err?.data?.errors;
      if (fieldErrors && typeof fieldErrors === "object" && Object.keys(fieldErrors).length > 0) {
        companyForm.setErrors(fieldErrors);
        return;
      }
      toast.error(
        getSafeBackendErrorMessage(
          err,
          editingCompany
            ? "No se pudo actualizar la empresa. Verifique los datos e intente nuevamente."
            : "No se pudo registrar la empresa. Verifique los datos e intente nuevamente."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmToggleStatus = async () => {
    if (!confirmToggleCompany) return;
    setIsToggling(true);
    try {
      const nextStatus = !confirmToggleCompany.is_active;
      const res = await fetchClient(`/api/v1/companies/${confirmToggleCompany.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextStatus }),
      });

      const updated: Company = await res.json();
      setCompanies((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, is_active: updated.is_active } : c))
      );
      toast.success(
        `Empresa ${confirmToggleCompany.name} ${updated.is_active ? "activada" : "desactivada"
        } exitosamente`
      );
      setConfirmToggleCompany(null);
      await fetchCompanies();
      handleRefresh();
      onChanged?.();
    } catch (err: any) {
      toast.error(
        getSafeBackendErrorMessage(err, "No se pudo cambiar el estado de la empresa")
      );
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
            placeholder="Buscar empresa por código, nombre o RIF..."
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
            onClick={fetchCompanies}
            disabled={loading}
            className="h-9 px-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-200 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>

          {canCreateCompany && (
            <button
              type="button"
              onClick={openCreateModal}
              className="h-9 px-3.5 text-xs font-semibold bg-locatel-medio hover:bg-locatel-oscuro text-white rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Empresa</span>
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
                  Código
                </th>
                <th className="px-4 py-3.5 text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                  Razón Social / Nombre
                </th>
                <th className="px-4 py-3.5 text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                  RIF
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
                      <span>Cargando empresas...</span>
                    </div>
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-xs text-neutral-400 dark:text-neutral-500"
                  >
                    No se encontraron empresas registradas con los filtros actuales.
                  </td>
                </tr>
              ) : (
                companies.map((company) => (
                  <tr
                    key={company.id}
                    className="even:bg-neutral-50/30 dark:even:bg-neutral-800/20 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-xs font-mono font-semibold text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700">
                        {company.code}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {company.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs text-neutral-600 dark:text-neutral-300">
                        {company.rif}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${company.is_active
                          ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300"
                          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
                          }`}
                      >
                        {company.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {canEditCompany && (
                          <button
                            type="button"
                            onClick={() => openEditModal(company)}
                            className="px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-200 inline-flex items-center gap-1 transition-colors cursor-pointer"
                            title="Editar empresa"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-locatel-medio" />
                            <span>Editar</span>
                          </button>
                        )}

                        {canToggleStatus && (
                          <button
                            type="button"
                            onClick={() => setConfirmToggleCompany(company)}
                            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer ${company.is_active
                              ? "border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/50"
                              : "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/50"
                              }`}
                            title={company.is_active ? "Desactivar empresa" : "Activar empresa"}
                          >
                            <Power className="w-3.5 h-3.5" />
                            <span>{company.is_active ? "Desactivar" : "Activar"}</span>
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
              Mostrando {companies.length} de {totalRecords} empresas
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
              {editingCompany ? "Editar Empresa" : "Registrar Empresa"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                  Código de Empresa *
                </label>
                <input
                  type="text"
                  placeholder="Ej. LCT-018"
                  value={companyForm.values.code}
                  onChange={(e) => handleFieldChange("code", e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border rounded-xl text-sm bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 focus:outline-none focus:border-locatel-medio font-mono uppercase"
                />
                {companyForm.errors.code?.[0] && (
                  <p className="mt-1 text-xs text-red-500">{companyForm.errors.code[0]}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                  Razón Social / Nombre *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Farmacia LCT 18 C.A."
                  value={companyForm.values.name}
                  onChange={(e) => handleFieldChange("name", e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 focus:outline-none focus:border-locatel-medio"
                />
                {companyForm.errors.name?.[0] && (
                  <p className="mt-1 text-xs text-red-500">{companyForm.errors.name[0]}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                  RIF *
                </label>
                <input
                  type="text"
                  placeholder="Ej. J-30512845-6"
                  value={companyForm.values.rif}
                  onChange={(e) => handleFieldChange("rif", e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border rounded-xl text-sm bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 focus:outline-none focus:border-locatel-medio font-mono uppercase"
                />
                {companyForm.errors.rif?.[0] && (
                  <p className="mt-1 text-xs text-red-500">{companyForm.errors.rif[0]}</p>
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
                    : editingCompany
                      ? "Guardar Cambios"
                      : "Guardar Empresa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmToggleCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${confirmToggleCompany.is_active
                  ? "bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400"
                  : "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
                  }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  {confirmToggleCompany.is_active
                    ? "Desactivar Empresa"
                    : "Activar Empresa"}
                </h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  ¿Está seguro que desea{" "}
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {confirmToggleCompany.is_active ? "desactivar" : "activar"}
                  </span>{" "}
                  la empresa{" "}
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {confirmToggleCompany.code} · {confirmToggleCompany.name}
                  </span>
                  ?
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isToggling}
                onClick={() => setConfirmToggleCompany(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isToggling}
                onClick={handleConfirmToggleStatus}
                className={`px-4 py-2 text-xs font-semibold rounded-xl text-white disabled:opacity-50 cursor-pointer ${confirmToggleCompany.is_active
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-locatel-medio hover:bg-locatel-oscuro"
                  }`}
              >
                {isToggling
                  ? "Procesando..."
                  : confirmToggleCompany.is_active
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
