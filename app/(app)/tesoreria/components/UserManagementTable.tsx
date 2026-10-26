"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Users,
  UserPlus,
  Edit,
  Shield,
  ShieldCheck,
  Search,
  RefreshCw,
  User,
  X,
  Power,
  Key,
  Check,
  Layers,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { fetchClient } from "@/lib/fetchClient";
import { PermissionDetail, RoleDetail, UserProfile, UserWithRoles } from "../types";
import { UserModal, getFriendlyPermission } from "./UserModal";

interface UserManagementTableProps {
  currentUser?: UserProfile | null;
}

export function UserManagementTable({ currentUser }: UserManagementTableProps) {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [availableRoles, setAvailableRoles] = useState<RoleDetail[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<PermissionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const rolesList = useMemo(() => {
    return (currentUser?.roles || []).map((r) => r.toUpperCase().trim());
  }, [currentUser]);

  const isAdmin = useMemo(() => {
    return rolesList.includes("ADMIN") || rolesList.includes("ADMINISTRADOR");
  }, [rolesList]);

  const isCoordTes = useMemo(() => {
    return rolesList.includes("COORD_TESORERIA") && !isAdmin;
  }, [rolesList, isAdmin]);

  const isCoordCxp = useMemo(() => {
    return rolesList.includes("COORD_CXP") && !isAdmin;
  }, [rolesList, isAdmin]);

  const isAnalystOnly = useMemo(() => {
    return (
      (rolesList.includes("ANALISTA_TESORERIA") || rolesList.includes("ANALISTA_CXP")) &&
      !isCoordTes &&
      !isCoordCxp &&
      !isAdmin
    );
  }, [rolesList, isCoordTes, isCoordCxp, isAdmin]);

  const canManageUsers = useMemo(() => {
    if (isAnalystOnly) return false;
    const perms = (currentUser?.permissions || []).map((p) => p.toLowerCase().trim());
    return (
      isAdmin ||
      isCoordTes ||
      isCoordCxp ||
      perms.includes("users.manage")
    );
  }, [isAnalystOnly, isAdmin, isCoordTes, isCoordCxp, currentUser]);

  const fallbackRolesList: RoleDetail[] = [
    { name: "ADMIN", display_name: "Administrador (Acceso Total)", description: "Acceso Total al Sistema y Administrador" },
    { name: "COORD_TESORERIA", display_name: "Coordinador de Tesorería", description: "Coordinador de Tesorería" },
    { name: "COORD_CXP", display_name: "Coordinador de Cuentas por Pagar", description: "Coordinador de Cuentas por Pagar" },
    { name: "ANALISTA_TESORERIA", display_name: "Analista de Tesorería", description: "Analista de Tesorería" },
    { name: "ANALISTA_CXP", display_name: "Analista de Cuentas por Pagar", description: "Analista de Cuentas por Pagar" },
  ];

  const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
    ADMIN: [
      "core.accounts.manage",
      "treasury.accounts.view",
      "treasury.accounts.manage",
      "treasury.balances.view",
      "treasury.balances.record",
      "treasury.balances.edit",
      "treasury.balances.override",
      "treasury.availability.view",
      "treasury.availability.edit",
      "treasury.availability.approve",
      "treasury.history.view",
      "reports.treasury.view",
      "reports.dashboard.view",
      "users.view",
      "users.manage",
      "cxp.suppliers.view",
      "cxp.suppliers.manage",
      "cxp.invoices.view",
      "cxp.invoices.create",
      "cxp.invoices.edit",
      "cxp.invoices.cancel",
      "cxp.calendar.view",
      "cxp.payments.schedule",
      "cxp.payments.approve",
      "cxp.payments.execute",
      "cxp.payments.revert",
      "cxp.reports.view",
      "cxp.proposals.create",
      "cxp.proposals.view",
      "cxp.proposals.review",
    ],
    COORD_TESORERIA: [
      "users.view",
      "users.manage",
      "core.accounts.manage",
      "treasury.accounts.view",
      "treasury.accounts.manage",
      "treasury.balances.view",
      "treasury.balances.edit",
      "treasury.balances.record",
      "treasury.balances.override",
      "treasury.availability.view",
      "treasury.availability.edit",
      "treasury.availability.approve",
      "treasury.history.view",
      "reports.treasury.view",
      "reports.dashboard.view",
    ],
    ANALISTA_TESORERIA: [
      "treasury.accounts.view",
      "treasury.balances.view",
      "treasury.balances.edit",
      "treasury.balances.record",
      "treasury.availability.view",
      "treasury.history.view",
      "reports.treasury.view",
    ],
    COORD_CXP: [
      "users.view",
      "users.manage",
      "cxp.suppliers.view",
      "cxp.suppliers.manage",
      "cxp.invoices.view",
      "cxp.invoices.create",
      "cxp.invoices.edit",
      "cxp.invoices.cancel",
      "cxp.calendar.view",
      "cxp.payments.schedule",
      "cxp.payments.approve",
      "cxp.payments.execute",
      "cxp.payments.revert",
      "cxp.reports.view",
      "cxp.proposals.create",
      "cxp.proposals.view",
      "cxp.proposals.review",
      "reports.dashboard.view",
    ],
    ANALISTA_CXP: [
      "cxp.suppliers.view",
      "cxp.invoices.view",
      "cxp.invoices.create",
      "cxp.invoices.edit",
      "cxp.calendar.view",
      "cxp.payments.schedule",
      "cxp.reports.view",
      "cxp.proposals.create",
      "cxp.proposals.view",
    ],
  };

  const selectableRoles = useMemo(() => {
    const base = availableRoles.length > 0 ? availableRoles : fallbackRolesList;
    if (isAdmin) {
      return base;
    }
    if (isCoordTes) {
      return base.filter((r) => r.name === "ANALISTA_TESORERIA");
    }
    if (isCoordCxp) {
      return base.filter((r) => r.name === "ANALISTA_CXP");
    }
    return base;
  }, [availableRoles, isAdmin, isCoordTes, isCoordCxp]);

  const [createForm, setCreateForm] = useState({
    name: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    roles: ["ANALISTA_TESORERIA"],
    permissions: ROLE_DEFAULT_PERMISSIONS["ANALISTA_TESORERIA"] || [],
  });

  const [editForm, setEditForm] = useState({
    name: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    roles: [] as string[],
    permissions: [] as string[],
    isActive: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [usersRes, rolesRes, permsRes] = await Promise.all([
        fetchClient("/api/v1/users"),
        fetchClient("/api/v1/roles").catch(() => fetchClient("/api/roles")),
        fetchClient("/api/v1/permissions").catch(() => fetchClient("/api/permissions")),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(Array.isArray(data) ? data : []);
      } else if (usersRes.status === 403) {
        const errJson = await usersRes.json().catch(() => null);
        toast.error(errJson?.message || "No tiene autorización para gestionar usuarios fuera de su departamento");
        setUsers([]);
      }

      if (rolesRes && rolesRes.ok) {
        const rolesData = await rolesRes.json();
        if (Array.isArray(rolesData) && rolesData.length > 0) {
          const mapped = rolesData.map((r: any) => ({
            name: r.name,
            display_name: r.display_name || r.name,
            description: r.description || "",
          }));
          setAvailableRoles(mapped);
        }
      }

      if (permsRes && permsRes.ok) {
        const permsData = await permsRes.json();
        if (Array.isArray(permsData) && permsData.length > 0) {
          setAvailablePermissions(permsData);
        }
      }
    } catch {
      toast.error("Error al sincronizar datos de usuarios");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const fullText = `${u.name} ${u.last_name} ${u.email}`.toLowerCase();
      if (searchQuery.trim() && !fullText.includes(searchQuery.toLowerCase().trim())) {
        return false;
      }
      if (statusFilter === "active" && !u.is_active) return false;
      if (statusFilter === "inactive" && u.is_active) return false;
      if (roleFilter !== "all") {
        const hasRole = (u.roles || []).some(
          (r) => r.toUpperCase() === roleFilter.toUpperCase()
        );
        if (!hasRole) return false;
      }
      return true;
    });
  }, [users, searchQuery, statusFilter, roleFilter]);

  const permissionsByModule = useMemo(() => {
    const map = new Map<string, PermissionDetail[]>();
    availablePermissions.forEach((p) => {
      const prefix = (p.code || "").split(".")[0]?.toLowerCase().trim();
      let moduleName = "Otros Permisos";
      if (prefix === "treasury") {
        moduleName = "Tesorería";
      } else if (prefix === "cxp") {
        moduleName = "Cuentas por Pagar";
      } else if (prefix === "users" || prefix === "roles") {
        moduleName = "Administración / Seguridad";
      } else if (p.module) {
        moduleName = p.module;
      } else if (prefix) {
        moduleName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
      }
      const list = map.get(moduleName) || [];
      list.push({
        code: p.code,
        name: p.name || p.code,
        description: p.description || p.code,
        module: moduleName,
      });
      map.set(moduleName, list);
    });
    return map;
  }, [availablePermissions]);

  const handleToggleStatus = async (user: UserWithRoles) => {
    const isTargetAdmin = (user.roles || []).some(
      (r) => r.toUpperCase() === "ADMIN" || r.toUpperCase() === "ADMINISTRADOR"
    );
    if (isTargetAdmin && !isAdmin) {
      toast.error("Acceso denegado: solo un administrador puede modificar a otro administrador");
      return;
    }
    try {
      const res = await fetchClient(`/api/v1/users/${user.id}/toggle-status`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al actualizar estado");
      }
      const data = await res.json();
      toast.success(
        `Usuario ${user.name} ahora está ${data.is_active ? "Activo" : "Inactivo"}`
      );
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: data.is_active } : u))
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al cambiar estado");
    }
  };

  const handleOpenEdit = (user: UserWithRoles) => {
    const isTargetAdmin = (user.roles || []).some(
      (r) => r.toUpperCase() === "ADMIN" || r.toUpperCase() === "ADMINISTRADOR"
    );
    if (isTargetAdmin && !isAdmin) {
      toast.error("Acceso denegado: solo un administrador puede modificar a otro administrador");
      return;
    }
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      lastName: user.last_name,
      email: user.email,
      password: "",
      confirmPassword: "",
      roles: [...(user.roles || [])],
      permissions: [...(user.permissions || [])],
      isActive: user.is_active,
    });
    setIsEditOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.lastName || !createForm.email || !createForm.password) {
      toast.error("Complete todos los campos obligatorios");
      return;
    }

    if (createForm.password !== createForm.confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetchClient("/api/v1/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name,
          last_name: createForm.lastName,
          email: createForm.email,
          password: createForm.password,
          confirm_password: createForm.confirmPassword,
          roles: createForm.roles,
          permissions: createForm.permissions,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al crear usuario");
      }

      toast.success("Usuario creado exitosamente con sus roles y matriz de permisos");
      setIsCreateOpen(false);
      const initialRole = isCoordCxp ? "ANALISTA_CXP" : "ANALISTA_TESORERIA";
      setCreateForm({
        name: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
        roles: [initialRole],
        permissions: [...(ROLE_DEFAULT_PERMISSIONS[initialRole] || [])],
      });
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al registrar usuario");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (editForm.password.trim() && editForm.password !== editForm.confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, any> = {
        name: editForm.name,
        last_name: editForm.lastName,
        email: editForm.email,
        roles: editForm.roles,
        permissions: editForm.permissions,
        is_active: editForm.isActive,
      };

      if (editForm.password.trim()) {
        payload.password = editForm.password.trim();
        payload.confirm_password = editForm.confirmPassword.trim();
      }

      const res = await fetchClient(`/api/v1/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al actualizar usuario");
      }

      toast.success("Usuario, roles y permisos actualizados exitosamente");
      setIsEditOpen(false);
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleRoleSelection = (roleName: string, isCreate: boolean) => {
    const defaultPerms = ROLE_DEFAULT_PERMISSIONS[roleName.toUpperCase().trim()] || [];
    if (isCreate) {
      setCreateForm((prev) => ({
        ...prev,
        roles: [roleName],
        permissions: [...defaultPerms],
      }));
    } else {
      setEditForm((prev) => ({
        ...prev,
        roles: [roleName],
        permissions: [...defaultPerms],
      }));
    }
  };

  const togglePermissionSelection = (code: string, isCreate: boolean) => {
    if (isCreate) {
      setCreateForm((prev) => {
        const perms = prev.permissions || [];
        const has = perms.includes(code);
        return {
          ...prev,
          permissions: has
            ? perms.filter((p) => p !== code)
            : [...perms, code],
        };
      });
    } else {
      setEditForm((prev) => {
        const perms = prev.permissions || [];
        const has = perms.includes(code);
        return {
          ...prev,
          permissions: has
            ? perms.filter((p) => p !== code)
            : [...perms, code],
        };
      });
    }
  };

  const toggleModulePermissions = (moduleName: string, isCreate: boolean) => {
    const modulePerms = availablePermissions
      .filter((p) => {
        const meta = getFriendlyPermission(p.code, p.name, p.description);
        return meta.category === moduleName || p.module === moduleName;
      })
      .map((p) => p.code);

    if (isCreate) {
      setCreateForm((prev) => {
        const perms = prev.permissions || [];
        const allSelected = modulePerms.every((code) => perms.includes(code));
        if (allSelected) {
          return {
            ...prev,
            permissions: perms.filter((c) => !modulePerms.includes(c)),
          };
        } else {
          return {
            ...prev,
            permissions: Array.from(new Set([...perms, ...modulePerms])),
          };
        }
      });
    } else {
      setEditForm((prev) => {
        const perms = prev.permissions || [];
        const allSelected = modulePerms.every((code) => perms.includes(code));
        if (allSelected) {
          return {
            ...prev,
            permissions: perms.filter((c) => !modulePerms.includes(c)),
          };
        } else {
          return {
            ...prev,
            permissions: Array.from(new Set([...perms, ...modulePerms])),
          };
        }
      });
    }
  };

  const getRoleBadge = (roleName: string) => {
    const upper = roleName.toUpperCase().trim();
    if (upper === "ADMIN" || upper === "ADMINISTRADOR") {
      return (
        <span
          key={roleName}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          Administrador Global
        </span>
      );
    }
    if (upper === "COORD_TESORERIA") {
      return (
        <span
          key={roleName}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
        >
          <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          Coordinador de Tesorería
        </span>
      );
    }
    if (upper === "COORD_CXP") {
      return (
        <span
          key={roleName}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
        >
          <Shield className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          Coordinador de CXP
        </span>
      );
    }
    if (upper === "ANALISTA_CXP") {
      return (
        <span
          key={roleName}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60"
        >
          <User className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          Analista de CXP
        </span>
      );
    }
    return (
      <span
        key={roleName}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
      >
        <User className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
        Analista de Tesorería
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por nombre o correo corporativo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-locatel-medio/30"
            />
          </div>

          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/30 cursor-pointer"
            >
              <option value="all">Filtrar por Rol: Todos</option>
              <option value="ADMIN">Administrador Global</option>
              <option value="COORD_TESORERIA">Coordinador de Tesorería</option>
              <option value="ANALISTA_TESORERIA">Analista de Tesorería</option>
              <option value="COORD_CXP">Coordinador de Cuentas por Pagar</option>
              <option value="ANALISTA_CXP">Analista de Cuentas por Pagar</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/30 cursor-pointer"
            >
              <option value="all">Filtrar por Estado: Todos</option>
              <option value="active">Solo Usuarios Activos</option>
              <option value="inactive">Solo Usuarios Inactivos</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 justify-end">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>

          {canManageUsers && (
            <button
              onClick={() => {
                const initialRole = isCoordCxp ? "ANALISTA_CXP" : "ANALISTA_TESORERIA";
                setCreateForm({
                  name: "",
                  lastName: "",
                  email: "",
                  password: "",
                  confirmPassword: "",
                  roles: [initialRole],
                  permissions: [...(ROLE_DEFAULT_PERMISSIONS[initialRole] || [])],
                });
                setIsCreateOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-locatel-medio hover:bg-locatel-oscuro text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Nuevo Usuario</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
            <RefreshCw className="w-8 h-8 animate-spin text-locatel-medio mb-3" />
            <span className="text-xs font-semibold">Cargando directorio de usuarios y permisos...</span>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50/80 dark:bg-neutral-800/60">
                  <th className="px-4 py-3 font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-4 py-3 font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                    Correo Corporativo
                  </th>
                  <th className="px-4 py-3 font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                    Roles Asignados
                  </th>
                  <th className="px-4 py-3 font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                    Permisos Puntuales
                  </th>
                  <th className="px-4 py-3 font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider text-center">
                    Estado
                  </th>
                  <th className="px-4 py-3 font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/80 dark:divide-neutral-800 text-xs">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-neutral-400 dark:text-neutral-500"
                    >
                      No se encontraron usuarios que coincidan con los criterios de búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const permCount = u.permissions?.length || 0;
                    const isRowAdmin = (u.roles || []).some(
                      (r) => r.toUpperCase() === "ADMIN" || r.toUpperCase() === "ADMINISTRADOR"
                    );
                    const isProtected = isRowAdmin && !isAdmin;
                    return (
                      <tr
                        key={u.id}
                        className="even:bg-neutral-50/30 dark:even:bg-neutral-800/20 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                      >
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-locatel-medio/15 text-locatel-medio flex items-center justify-center shadow-xs">
                              <User className="w-4 h-4 text-locatel-medio" />
                            </div>
                            <div>
                              <span>
                                {u.name} {u.last_name}
                              </span>
                              <div className="text-[10px] text-neutral-400">
                                {u.id.substring(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-neutral-600 dark:text-neutral-300 font-mono">
                          {u.email}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-1.5">
                            {u.roles && u.roles.length > 0 ? (
                              u.roles.map((r) => getRoleBadge(r))
                            ) : (
                              <span className="text-[10px] text-neutral-400 italic">
                                Sin roles definidos
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                              <Key className="w-3 h-3 text-locatel-medio" />
                              {permCount} {permCount === 1 ? "permiso" : "permisos"}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          {!canManageUsers || isProtected ? (
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold opacity-75 cursor-not-allowed ${u.is_active
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800"
                                : "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400 border border-red-300 dark:border-red-800"
                                }`}
                              title={isProtected ? "Cuenta protegida: solo un administrador puede modificarla" : "Permiso de administración requerido"}
                            >
                              <Lock className="w-3 h-3 text-amber-500" />
                              <span>{u.is_active ? "Activo" : "Inactivo"}</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleToggleStatus(u)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${u.is_active
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-200"
                                : "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400 border border-red-300 dark:border-red-800 hover:bg-red-200"
                                }`}
                              title={`Click para ${u.is_active ? "desactivar" : "activar"} acceso`}
                            >
                              <Power className="w-3 h-3" />
                              <span>{u.is_active ? "Activo" : "Inactivo"}</span>
                            </button>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          {!canManageUsers ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-400 text-xs font-semibold"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span>Solo Lectura</span>
                            </span>
                          ) : isProtected ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs font-semibold shadow-xs"
                              title="Cuenta protegida: solo un administrador puede modificar a otro administrador"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span>Protegido</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleOpenEdit(u)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5 text-locatel-medio" />
                              <span>Editar / Matriz</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <UserModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
        isEdit={false}
        formData={createForm}
        setFormData={setCreateForm}
        selectableRoles={selectableRoles}
        availablePermissions={availablePermissions}
        isSubmitting={isSubmitting}
        onToggleRole={(roleName) => toggleRoleSelection(roleName, true)}
        onTogglePermission={(code) => togglePermissionSelection(code, true)}
        onToggleModulePermissions={(modName) => toggleModulePermissions(modName, true)}
      />

      {selectedUser && (
        <UserModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onSubmit={handleEditSubmit}
          isEdit={true}
          formData={editForm}
          setFormData={setEditForm}
          selectableRoles={selectableRoles}
          availablePermissions={availablePermissions}
          isSubmitting={isSubmitting}
          onToggleRole={(roleName) => toggleRoleSelection(roleName, false)}
          onTogglePermission={(code) => togglePermissionSelection(code, false)}
          onToggleModulePermissions={(modName) => toggleModulePermissions(modName, false)}
        />
      )}
    </div>
  );
}
