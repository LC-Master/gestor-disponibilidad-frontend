"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Lock, Eye, EyeOff, Loader2, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");

    if (!token) {
      setErrorMessage("El enlace de recuperación es inválido o no incluye el token de seguridad.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Las contraseñas no coinciden.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          confirm_password: confirmPassword,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const tokenErr = data?.errors?.token;
        const passErr = data?.errors?.password;
        const msg = (Array.isArray(tokenErr) ? tokenErr[0] : tokenErr) ||
                    (Array.isArray(passErr) ? passErr[0] : passErr) ||
                    data?.message ||
                    "Error al restablecer la contraseña.";
        setErrorMessage(msg);
        return;
      }

      setIsSuccess(true);
    } catch {
      setErrorMessage("Error de conexión con el servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center space-y-5">
        <div className="w-12 h-12 rounded-2xl bg-locatel-naranja/10 text-locatel-naranja flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Enlace inválido o incompleto
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            No se encontró el token de seguridad en la URL. Asegúrate de abrir el enlace completo que recibiste por correo.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/forgot-password"
            className="w-full py-3 px-4 rounded-xl font-medium text-sm text-white bg-locatel-medio hover:bg-locatel-oscuro active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Solicitar nuevo enlace
          </Link>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="text-center space-y-5">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            ¡Contraseña actualizada!
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Tu contraseña ha sido restablecida con éxito y tus sesiones anteriores han sido revocadas por seguridad.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/login"
            className="w-full py-3 px-4 rounded-xl font-medium text-sm text-white bg-locatel-medio hover:bg-locatel-oscuro active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            Iniciar sesión ahora
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {errorMessage && (
        <div className="mb-6 p-3.5 rounded-xl bg-locatel-naranja/10 border border-locatel-naranja/30 text-locatel-naranja text-sm flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nueva Contraseña */}
        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5"
          >
            Nueva Contraseña
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
              <Lock className="w-5 h-5" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full pl-11 pr-11 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 text-sm focus:outline-none focus:border-locatel-medio focus:ring-2 focus:ring-locatel-medio/30 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
              aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Confirmar Nueva Contraseña */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5"
          >
            Confirmar Nueva Contraseña
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <input
              type={showConfirmPassword ? "text" : "password"}
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full pl-11 pr-11 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 text-sm focus:outline-none focus:border-locatel-medio focus:ring-2 focus:ring-locatel-medio/30 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
              aria-label={showConfirmPassword ? "Ocultar contraseña" : "Ver contraseña"}
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 rounded-xl font-medium text-sm text-white bg-locatel-medio hover:bg-locatel-oscuro active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-locatel-medio/50 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
              Actualizando contraseña...
            </>
          ) : (
            <>
              Restablecer Contraseña
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-semibold text-locatel-medio dark:text-locatel-claro hover:text-locatel-oscuro transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Iniciar Sesión
        </Link>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="w-full max-w-md px-4 sm:px-0 py-8">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 sm:p-10 shadow-xl shadow-neutral-950/5 dark:shadow-black/40">
        <div className="flex flex-col items-center text-center mb-8">
          <img src="/Logo.webp" alt="Logo Locatel" width={250} height={250} />
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 mt-2">
            Nueva Contraseña
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Ingresa tu nueva clave de acceso
          </p>
        </div>

        <Suspense fallback={<div className="text-center py-6 text-neutral-400">Cargando formulario...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
