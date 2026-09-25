"use client";

import { useEffect, useState } from "react";
import { LogOut, User, Shield, Building2 } from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  last_name: string;
  email: string;
  is_active: boolean;
}

export default function TesoreriaPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch (err) {
        console.error("Error al cargar perfil de usuario:", err);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    } finally {
      window.location.href = "/login";
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col">
      {/* Barra superior */}
      <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/Logo.webp" alt="Logo Locatel" width={140} height={40} className="object-contain" />
            <span className="hidden sm:inline-block h-5 w-px bg-neutral-300 dark:bg-neutral-700" />
            <span className="hidden sm:inline-block text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Tesorería
            </span>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                <div className="w-8 h-8 rounded-full bg-locatel-medio/10 text-locatel-medio flex items-center justify-center font-semibold text-xs">
                  {user.name.charAt(0)}
                  {user.last_name.charAt(0)}
                </div>
                <span className="hidden md:inline font-medium">
                  {user.name} {user.last_name}
                </span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-transparent hover:border-red-200 dark:hover:border-red-900 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Gestor Financiero • Pasivos y Tesorería
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Bienvenido al sistema de administración y control financiero.
          </p>
        </div>

        {/* Tarjeta de bienvenida / resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-locatel-medio/10 text-locatel-medio">
                <User className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
                Sesión Activa
              </h2>
            </div>
            {loading ? (
              <p className="text-sm text-neutral-400">Cargando...</p>
            ) : (
              <div>
                <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  {user?.name} {user?.last_name}
                </p>
                <p className="text-xs text-neutral-500">{user?.email}</p>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400">
                <Shield className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
                Seguridad JWT
              </h2>
            </div>
            <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Sesión Protegida
            </p>
            <p className="text-xs text-neutral-500">Tokens rotativos con validación de proxy activo</p>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Building2 className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
                Módulo
              </h2>
            </div>
            <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              SAP Conector
            </p>
            <p className="text-xs text-neutral-500">Integración con facturas y pasivos</p>
          </div>
        </div>
      </main>
    </div>
  );
}
