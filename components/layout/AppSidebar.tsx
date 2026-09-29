"use client";

import { useState } from "react";
import {
  BarChart3,
  Building2,
  CalendarCheck2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  History,
  Landmark,
  LogOut,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Bank, BankAccount, Company } from "@/app/(app)/tesoreria/types";

export type TabType = "accounts" | "closing" | "closing_history" | "history" | "users";

interface UserProfile {
  id: string;
  name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  roles?: string[];
  permissions?: string[];
}

export interface AppSidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  user: UserProfile | null;
  accounts: BankAccount[];
  companies: Company[];
  banks: Bank[];
  onLogout: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export function AppSidebar({
  activeTab,
  onTabChange,
  user,
  accounts = [],
  companies = [],
  banks = [],
  onLogout,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}: AppSidebarProps) {
  const [isTreasuryOpen, setIsTreasuryOpen] = useState(true);

  const isAdminOrCoord =
    (user?.roles || []).some((r) => {
      const u = r.toUpperCase().trim();
      return u === "ADMIN" || u === "ADMINISTRADOR" || u === "COORD_TESORERIA";
    }) ||
    (user?.permissions || []).some((p) => {
      const u = p.toLowerCase().trim();
      return u === "users.manage" || u === "admin";
    });

  const getRoleLabel = (roles?: string[]) => {
    if (!roles || roles.length === 0) return "Usuario";
    const r = roles[0].toUpperCase().trim();
    if (r === "ADMIN" || r === "ADMINISTRADOR") return "Administrador";
    if (r === "COORD_TESORERIA") return "Coordinador de Tesorería";
    if (r === "ANALISTA_TESORERIA") return "Analista de Tesorería";
    return r;
  };

  const treasuryItems = [
    {
      id: "accounts" as TabType,
      label: "Gestión de Cuentas",
      description: "Cuentas, empresas y bancos",
      icon: Wallet,
      badge: accounts.length.toString(),
    },
    {
      id: "closing" as TabType,
      label: "Cierre Operativo",
      description: "Saldos diarios y variaciones",
      icon: CalendarCheck2,
    },
    {
      id: "closing_history" as TabType,
      label: "Histórico de Cierres",
      description: "Posiciones guardadas y edición",
      icon: FileCheck2,
    },
    {
      id: "history" as TabType,
      label: "Historial Mensual",
      description: "Matriz histórica de balances",
      icon: History,
    },
  ];

  const adminItems = isAdminOrCoord
    ? [
        {
          id: "users" as TabType,
          label: "Control de Usuarios",
          description: "Gestión de usuarios y roles",
          icon: Users,
        },
      ]
    : [];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 transition-all duration-300 select-none">
      <div className="h-18 px-4 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-3 overflow-hidden">
          {!isCollapsed && (
            <div className="flex items-center gap-3 min-w-0">
              <img
                src="/Logo.webp"
                alt="Locatel"
                className="h-11 sm:h-12 w-auto object-contain shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100 truncate">
                  Gestor de Facturación
                </span>
                <span className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                  Sistema Corporativo
                </span>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="flex items-center justify-center w-full">
              <img
                src="/Logo.webp"
                alt="Locatel"
                className="h-9 w-auto object-contain"
              />
            </div>
          )}
        </div>

        <button
          onClick={onCloseMobile}
          className="md:hidden p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <button
          onClick={onToggleCollapse}
          className="hidden md:flex p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          title={isCollapsed ? "Expandir barra" : "Colapsar barra"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>

      <div className="flex-1 py-4 px-3 space-y-5 overflow-y-auto">
        <div>
          {!isCollapsed ? (
            <button
              onClick={() => setIsTreasuryOpen(!isTreasuryOpen)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hover:text-neutral-900 dark:hover:text-neutral-100 rounded-lg transition-colors cursor-pointer mb-1.5"
            >
              <span className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-locatel-medio" />
                <span>Tesorería</span>
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isTreasuryOpen ? "rotate-0" : "-rotate-90"
                }`}
              />
            </button>
          ) : (
            <div className="text-center py-1 mb-1">
              <Landmark className="w-4 h-4 text-locatel-medio mx-auto" />
            </div>
          )}

          {(isTreasuryOpen || isCollapsed) && (
            <nav className="space-y-1.5">
              {treasuryItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onTabChange(item.id);
                      onCloseMobile();
                    }}
                    className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-left transition-all cursor-pointer group relative ${
                      isActive
                        ? "bg-locatel-medio/10 text-locatel-medio font-semibold dark:bg-emerald-950/40 dark:text-emerald-400"
                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-neutral-200"
                    }`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <div
                      className={`p-2 rounded-xl transition-colors ${
                        isActive
                          ? "bg-locatel-medio text-white shadow-sm"
                          : "text-neutral-500 group-hover:text-neutral-800 dark:text-neutral-400 dark:group-hover:text-neutral-200"
                      }`}
                    >
                      <Icon className="w-4.5 h-4.5" />
                    </div>

                    {!isCollapsed && (
                      <div className="flex-1 min-w-0 flex items-center justify-between">
                        <div className="truncate">
                          <p className="text-xs font-semibold leading-tight">
                            {item.label}
                          </p>
                          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                            {item.description}
                          </p>
                        </div>
                        {item.badge && (
                          <span
                            className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isActive
                                ? "bg-locatel-medio text-white"
                                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}

                    {isActive && (
                      <div className="absolute left-0 top-2 bottom-2 w-1.5 bg-locatel-medio rounded-r-full" />
                    )}
                  </button>
                );
              })}
            </nav>
          )}
        </div>

        {adminItems.length > 0 && (
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
            {!isCollapsed && (
              <div className="px-3 mb-2 text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                Administración
              </div>
            )}
            <nav className="space-y-1.5">
              {adminItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onTabChange(item.id);
                      onCloseMobile();
                    }}
                    className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-left transition-all cursor-pointer group relative ${
                      isActive
                        ? "bg-locatel-medio/10 text-locatel-medio font-semibold dark:bg-emerald-950/40 dark:text-emerald-400"
                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-neutral-200"
                    }`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <div
                      className={`p-2 rounded-xl transition-colors ${
                        isActive
                          ? "bg-locatel-medio text-white shadow-sm"
                          : "text-neutral-500 group-hover:text-neutral-800 dark:text-neutral-400 dark:group-hover:text-neutral-200"
                      }`}
                    >
                      <Icon className="w-4.5 h-4.5" />
                    </div>

                    {!isCollapsed && (
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold leading-tight">
                          {item.label}
                        </p>
                        <p className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    )}

                    {isActive && (
                      <div className="absolute left-0 top-2 bottom-2 w-1.5 bg-locatel-medio rounded-r-full" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        )}

        {!isCollapsed && (
          <div className="p-3.5 rounded-2xl bg-neutral-50/50 dark:bg-neutral-800/30 border border-neutral-200/80 dark:border-neutral-800 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              <BarChart3 className="w-4 h-4 text-locatel-medio" />
              <span>Resumen Global</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 shadow-xs">
                <Building2 className="w-4 h-4 text-neutral-400 mx-auto mb-1" />
                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {companies.length}
                </p>
                <p className="text-[10px] text-neutral-400 truncate">Empresas</p>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 shadow-xs">
                <Landmark className="w-4 h-4 text-neutral-400 mx-auto mb-1" />
                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {banks.length}
                </p>
                <p className="text-[10px] text-neutral-400 truncate">Bancos</p>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 shadow-xs">
                <Wallet className="w-4 h-4 text-neutral-400 mx-auto mb-1" />
                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {accounts.length}
                </p>
                <p className="text-[10px] text-neutral-400 truncate">Cuentas</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-3.5 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 mt-auto">
        {user && (
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/60 shadow-xs mb-2.5">
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-locatel-medio/15 text-locatel-medio flex items-center justify-center">
                <User className="w-4.5 h-4.5 text-locatel-medio" />
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-neutral-900" />
            </div>

            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                  {user.name} {user.last_name}
                </p>
                <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                  {getRoleLabel(user.roles)}
                </p>
                <p className="text-[10px] text-neutral-400 truncate">
                  {user.email}
                </p>
              </div>
            )}
          </div>
        )}

        <button
          onClick={onLogout}
          className={`w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs sm:text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-transparent hover:border-red-200 dark:border-red-900 transition-all cursor-pointer ${
            isCollapsed ? "px-0" : "px-3"
          }`}
          title="Cerrar Sesión"
        >
          <LogOut className="w-4.5 h-4.5 flex-shrink-0" />
          {!isCollapsed && <span>Cerrar Sesión</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={`hidden md:block sticky top-0 h-screen z-30 transition-all duration-300 ${
          isCollapsed ? "w-20" : "w-72"
        }`}
      >
        {sidebarContent}
      </aside>

      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs transition-opacity"
          />
          <div className="relative w-72 max-w-[80vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
