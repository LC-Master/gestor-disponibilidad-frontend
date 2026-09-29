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
import { PermissionDetail, RoleDetail, UserProfile, UserWithRoles } from "../types";

interface UserManagementTableProps {
  currentUser?: UserProfile | null;
}

const DEFAULT_ROLES: RoleDetail[] = [
  {
    name: "ADMIN",
    display_name: "Administrador Global",
    description: "Acceso total al sistema, auditoría y control de usuarios.",
  },
  {
    name: "COORD_TESORERIA",
    display_name: "Coordinador de Tesorería",
    description: "Aprobación de disponibilidad, distribución de presupuesto y edición de saldos.",
  },
  {
    name: "ANALISTA_TESORERIA",
    display_name: "Analista de Tesorería",
    description: "Carga diaria de saldos bancarios por cuenta con bloqueo operativo.",
  },
];

const DEFAULT_PERMISSIONS: PermissionDetail[] = [
  {
    code: "treasury.accounts.view",
    name: "Ver Cuentas y Terminales",
    description: "Consultar catálogo de bancos, cuentas y terminales activas",
    module: "Cuentas Bancarias",
  },
  {
    code: "treasury.accounts.manage",
    name: "Gestionar Cuentas y Bancos",
    description: "Crear y dar de alta nuevas cuentas, bancos y empresas",
    module: "Cuentas Bancarias",
  },
  {
    code: "treasury.balances.record",
    name: "Cargar Saldos Operativos",
    description: "Ingresar montos de cierre diario por banco y cuenta operativa",
    module: "Posición Diaria",
  },
  {
    code: "treasury.balances.override",
    name: "Modificar Saldos Fijados",
    description: "Editar y ajustar saldos previamente cerrados en el día",
    module: "Posición Diaria",
  },
  {
    code: "treasury.availability.approve",
    name: "Aprobar Disponibilidad Diaria",
    description: "Aprobar y consolidar disponibilidad diaria con rubros de pago",
    module: "Disponibilidad",
  },
  {
    code: "treasury.history.view",
    name: "Consultar Historial Mensual",
    description: "Visualizar matriz histórica de movimientos y análisis acumulado",
    module: "Historial y Reportes",
  },
  {
    code: "users.view",
    name: "Visualizar Directorio de Usuarios",
    description: "Consultar lista de usuarios, estados y asignaciones actuales",
    module: "Control de Usuarios",
  },
  {
    code: "users.manage",
    name: "Administrar Usuarios y Roles",
    description: "Crear usuarios, modificar credenciales y elevar roles o permisos",
    module: "Control de Usuarios",
  },
];

export function UserManagementTable({ currentUser }: UserManagementTableProps) {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [availableRoles, setAvailableRoles] = useState<RoleDetail[]>(DEFAULT_ROLES);
  const [availablePermissions, setAvailablePermissions] = useState<PermissionDetail[]>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const canManageUsers = useMemo(() => {
    const perms = currentUser?.permissions || [];
    const roles = currentUser?.roles || [];
    return (
      perms.includes("users.manage") ||
      roles.some((r) => r.toUpperCase() === "ADMIN" || r.toUpperCase() === "ADMINISTRADOR")
    );
  }, [currentUser]);

  const isAdmin = useMemo(() => {
    const roles = currentUser?.roles || [];
    return roles.some((r) => r.toUpperCase() === "ADMIN" || r.toUpperCase() === "ADMINISTRADOR");
  }, [currentUser]);

  const selectableRoles = useMemo(() => {
    if (canManageUsers) return availableRoles;
    return availableRoles.filter(
      (r) => r.name.toUpperCase() !== "ADMIN" && r.name.toUpperCase() !== "ADMINISTRADOR"
    );
  }, [availableRoles, canManageUsers]);

  const [createForm, setCreateForm] = useState({
    name: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    roles: ["ANALISTA_TESORERIA"],
    permissions: [] as string[],
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
        fetch("/api/v1/users"),
        fetch("/api/v1/roles"),
        fetch("/api/v1/permissions"),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(Array.isArray(data) ? data : []);
      }

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        if (Array.isArray(rolesData) && rolesData.length > 0) {
          const mapped = rolesData.map((r: any) => ({
            name: r.name,
            display_name: r.display_name || (
              r.name === "ADMIN" ? "Administrador Global" :
              r.name === "COORD_TESORERIA" ? "Coordinador de Tesorería" :
              r.name === "ANALISTA_TESORERIA" ? "Analista de Tesorería" : r.name
            ),
            description: r.description || "",
          }));
          setAvailableRoles(mapped);
        }
      }

      if (permsRes.ok) {
        const permsData = await permsRes.json();
        if (Array.isArray(permsData) && permsData.length > 0) {
          setAvailablePermissions(permsData);
        }
      }
    } catch (err) {
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
      const list = map.get(p.module) || [];
      list.push(p);
      map.set(p.module, list);
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
      const res = await fetch(`/api/v1/users/${user.id}/toggle-status`, {
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
      const res = await fetch("/api/v1/users", {
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
      setCreateForm({
        name: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
        roles: ["ANALISTA_TESORERIA"],
        permissions: [],
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

      const res = await fetch(`/api/v1/users/${selectedUser.id}`, {
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
    if (isCreate) {
      setCreateForm((prev) => {
        const has = prev.roles.includes(roleName);
        return {
          ...prev,
          roles: has ? prev.roles.filter((r) => r !== roleName) : [...prev.roles, roleName],
        };
      });
    } else {
      setEditForm((prev) => {
        const has = prev.roles.includes(roleName);
        return {
          ...prev,
          roles: has ? prev.roles.filter((r) => r !== roleName) : [...prev.roles, roleName],
        };
      });
    }
  };

  const togglePermissionSelection = (code: string, isCreate: boolean) => {
    if (isCreate) {
      setCreateForm((prev) => {
        const has = prev.permissions.includes(code);
        return {
          ...prev,
          permissions: has
            ? prev.permissions.filter((p) => p !== code)
            : [...prev.permissions, code],
        };
      });
    } else {
      setEditForm((prev) => {
        const has = prev.permissions.includes(code);
        return {
          ...prev,
          permissions: has
            ? prev.permissions.filter((p) => p !== code)
            : [...prev.permissions, code],
        };
      });
    }
  };

  const toggleModulePermissions = (moduleName: string, isCreate: boolean) => {
    const modulePerms = (permissionsByModule.get(moduleName) || []).map((p) => p.code);
    if (isCreate) {
      setCreateForm((prev) => {
        const allSelected = modulePerms.every((code) => prev.permissions.includes(code));
        if (allSelected) {
          return {
            ...prev,
            permissions: prev.permissions.filter((c) => !modulePerms.includes(c)),
          };
        } else {
          return {
            ...prev,
            permissions: Array.from(new Set([...prev.permissions, ...modulePerms])),
          };
        }
      });
    } else {
      setEditForm((prev) => {
        const allSelected = modulePerms.every((code) => prev.permissions.includes(code));
        if (allSelected) {
          return {
            ...prev,
            permissions: prev.permissions.filter((c) => !modulePerms.includes(c)),
          };
        } else {
          return {
            ...prev,
            permissions: Array.from(new Set([...prev.permissions, ...modulePerms])),
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
    return (
      <span
        key={roleName}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
      >
        <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        Analista de Tesorería
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-locatel-medio" />
              Gestión Integral de Usuarios y Permisos
            </h2>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Administración centralizada de identidades, elevación de privilegios a Coordinador/Admin y asignación de matriz de permisos puntuales.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-locatel-medio hover:bg-locatel-oscuro text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo Usuario</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
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
                          {isProtected ? (
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold opacity-75 cursor-not-allowed ${
                                u.is_active
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800"
                                  : "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400 border border-red-300 dark:border-red-800"
                              }`}
                              title="Cuenta protegida: solo un administrador puede modificarla"
                            >
                              <Lock className="w-3 h-3 text-amber-500" />
                              <span>{u.is_active ? "Activo" : "Inactivo"}</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleToggleStatus(u)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                                u.is_active
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
                          {isProtected ? (
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

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-locatel-medio" />
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Crear Nuevo Usuario en el Sistema
                </h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, name: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-locatel-medio"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Apellido *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.lastName}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, lastName: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-locatel-medio"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Correo Electrónico Corporativo *
                </label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, email: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-locatel-medio"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Contraseña * (mínimo 8 caracteres)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={createForm.password}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, password: e.target.value })
                      }
                      className="w-full pl-3 pr-9 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-locatel-medio"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Confirmación de Contraseña *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={createForm.confirmPassword}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, confirmPassword: e.target.value })
                      }
                      className={`w-full pl-3 pr-9 py-2 text-xs rounded-xl border bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 transition-all ${
                        createForm.confirmPassword &&
                        createForm.password !== createForm.confirmPassword
                          ? "border-red-500 focus:ring-red-400"
                          : "border-neutral-300 dark:border-neutral-700 focus:ring-locatel-medio"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {createForm.confirmPassword &&
                    createForm.password !== createForm.confirmPassword && (
                      <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Las contraseñas no coinciden
                      </p>
                    )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                  Selección de Roles del Sistema
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {selectableRoles.map((role) => {
                    const isChecked = createForm.roles.includes(role.name);
                    return (
                      <div
                        key={role.name}
                        onClick={() => toggleRoleSelection(role.name, true)}
                        className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all ${
                          isChecked
                            ? "border-locatel-medio bg-locatel-medio/5 dark:bg-locatel-medio/10 shadow-xs"
                            : "border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                          <span>{role.display_name}</span>
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                              isChecked
                                ? "bg-locatel-medio border-locatel-medio text-white"
                                : "border-neutral-300 dark:border-neutral-600"
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3" />}
                          </div>
                        </div>
                        <p className="text-[11px] text-neutral-500 leading-relaxed">
                          {role.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      Matriz de Permisos Puntuales
                    </label>
                    <span className="text-[11px] text-neutral-400">
                      Permite otorgar o restringir accesos granulares independientemente de los roles.
                    </span>
                  </div>
                  <span className="text-xs font-bold font-mono text-locatel-medio">
                    {createForm.permissions.length} de {availablePermissions.length} seleccionados
                  </span>
                </div>

                <div className="space-y-3 bg-neutral-50 dark:bg-neutral-800/40 p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                  {Array.from(permissionsByModule.entries()).map(([moduleName, perms]) => {
                    const allSelected = perms.every((p) =>
                      createForm.permissions.includes(p.code)
                    );
                    return (
                      <div
                        key={moduleName}
                        className="bg-white dark:bg-neutral-900 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-2"
                      >
                        <div className="flex items-center justify-between pb-1.5 border-b border-neutral-100 dark:border-neutral-800">
                          <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-locatel-medio" />
                            {moduleName}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleModulePermissions(moduleName, true)}
                            className="text-[11px] text-locatel-medio font-semibold hover:underline cursor-pointer"
                          >
                            {allSelected ? "Deseleccionar módulo" : "Seleccionar todo"}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {perms.map((p) => {
                            const isPermChecked = createForm.permissions.includes(p.code);
                            return (
                              <label
                                key={p.code}
                                className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                                  isPermChecked
                                    ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30"
                                    : "border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isPermChecked}
                                  onChange={() => togglePermissionSelection(p.code, true)}
                                  className="mt-0.5 rounded text-locatel-medio focus:ring-locatel-medio cursor-pointer"
                                />
                                <div className="min-w-0">
                                  <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                                    {p.name}
                                  </div>
                                  <div className="text-[10px] text-neutral-500 leading-tight">
                                    {p.description}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    (!!createForm.confirmPassword &&
                      createForm.password !== createForm.confirmPassword)
                  }
                  className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-locatel-medio hover:bg-locatel-oscuro text-white cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Crear Usuario</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-locatel-medio" />
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    Editar Usuario y Matriz de Permisos
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Modificación de credenciales, elevación a Coordinador/Admin y asignación granular.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-locatel-medio"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Apellido
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.lastName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, lastName: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-locatel-medio"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Correo Electrónico Corporativo
                </label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-locatel-medio"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Nueva Contraseña (opcional)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={editForm.password}
                      onChange={(e) =>
                        setEditForm({ ...editForm, password: e.target.value })
                      }
                      className="w-full pl-3 pr-9 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-locatel-medio"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Confirmar Nueva Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={editForm.confirmPassword}
                      onChange={(e) =>
                        setEditForm({ ...editForm, confirmPassword: e.target.value })
                      }
                      className={`w-full pl-3 pr-9 py-2 text-xs rounded-xl border bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 transition-all ${
                        editForm.password &&
                        editForm.confirmPassword &&
                        editForm.password !== editForm.confirmPassword
                          ? "border-red-500 focus:ring-red-400"
                          : "border-neutral-300 dark:border-neutral-700 focus:ring-locatel-medio"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {editForm.password &&
                    editForm.confirmPassword &&
                    editForm.password !== editForm.confirmPassword && (
                      <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Las contraseñas no coinciden
                      </p>
                    )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                  Roles Asignados (Elevar a Coordinador o Administrador)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {selectableRoles.map((role) => {
                    const isChecked = editForm.roles.includes(role.name);
                    return (
                      <div
                        key={role.name}
                        onClick={() => toggleRoleSelection(role.name, false)}
                        className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all ${
                          isChecked
                            ? "border-locatel-medio bg-locatel-medio/5 dark:bg-locatel-medio/10 shadow-xs"
                            : "border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                          <span>{role.display_name}</span>
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                              isChecked
                                ? "bg-locatel-medio border-locatel-medio text-white"
                                : "border-neutral-300 dark:border-neutral-600"
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3" />}
                          </div>
                        </div>
                        <p className="text-[11px] text-neutral-500 leading-relaxed">
                          {role.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      Matriz de Permisos Puntuales
                    </label>
                    <span className="text-[11px] text-neutral-400">
                      Permisos asignados directamente al usuario independientemente de sus roles.
                    </span>
                  </div>
                  <span className="text-xs font-bold font-mono text-locatel-medio">
                    {editForm.permissions.length} de {availablePermissions.length} seleccionados
                  </span>
                </div>

                <div className="space-y-3 bg-neutral-50 dark:bg-neutral-800/40 p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                  {Array.from(permissionsByModule.entries()).map(([moduleName, perms]) => {
                    const allSelected = perms.every((p) =>
                      editForm.permissions.includes(p.code)
                    );
                    return (
                      <div
                        key={moduleName}
                        className="bg-white dark:bg-neutral-900 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-2"
                      >
                        <div className="flex items-center justify-between pb-1.5 border-b border-neutral-100 dark:border-neutral-800">
                          <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-locatel-medio" />
                            {moduleName}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleModulePermissions(moduleName, false)}
                            className="text-[11px] text-locatel-medio font-semibold hover:underline cursor-pointer"
                          >
                            {allSelected ? "Deseleccionar módulo" : "Seleccionar todo"}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {perms.map((p) => {
                            const isPermChecked = editForm.permissions.includes(p.code);
                            return (
                              <label
                                key={p.code}
                                className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                                  isPermChecked
                                    ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30"
                                    : "border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isPermChecked}
                                  onChange={() => togglePermissionSelection(p.code, false)}
                                  className="mt-0.5 rounded text-locatel-medio focus:ring-locatel-medio cursor-pointer"
                                />
                                <div className="min-w-0">
                                  <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                                    {p.name}
                                  </div>
                                  <div className="text-[10px] text-neutral-500 leading-tight">
                                    {p.description}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) =>
                      setEditForm({ ...editForm, isActive: e.target.checked })
                    }
                    className="rounded text-locatel-medio focus:ring-locatel-medio cursor-pointer"
                  />
                  <span>Usuario Activo en el Sistema</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    (!!editForm.password &&
                      editForm.password !== editForm.confirmPassword)
                  }
                  className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-locatel-medio hover:bg-locatel-oscuro text-white cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
