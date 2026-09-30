"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Lock, Eye, EyeOff, Loader2, ArrowRight, AlertCircle } from "lucide-react";
import { loginSchema, type LoginFormData, type ResponseLoginError } from "@/schemas/auth";

export default function LoginPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const {
        register,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
            rememberMe: false,
        },
    });

    const onSubmit = async (data: LoginFormData) => {
        setErrorMessage("");

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: data.email,
                    password: data.password,
                    remember_me: data.rememberMe,
                }),
            });

            if (!response.ok) {
                const errorData = (await response.json().catch(() => null)) as ResponseLoginError | null;

                const getErrorMsg = (err?: string | string[]) =>
                    Array.isArray(err) ? err[0] : err;

                if (errorData?.errors) {
                    if (errorData.errors.email) {
                        const msg = getErrorMsg(errorData.errors.email);
                        if (msg) setError("email", { message: msg });
                    }
                    if (errorData.errors.password) {
                        const msg = getErrorMsg(errorData.errors.password);
                        if (msg) setError("password", { message: msg });
                    }
                    return;
                }

                if (response.status === 401) {
                    setErrorMessage(errorData?.message || "Credenciales inválidas. Verifica tu correo y contraseña.");
                    return;
                }

                setErrorMessage(errorData?.message || "Error al procesar la solicitud en el servidor.");
                return;
            }

            const resData = await response.json().catch(() => null);
            if (resData?.access_token) {
                localStorage.setItem("access_token", resData.access_token);
            }
            if (resData?.refresh_token) {
                localStorage.setItem("refresh_token", resData.refresh_token);
            }

            window.location.href = "/tesoreria";
        } catch (err: unknown) {
            if (err instanceof Error) {
                setErrorMessage(err.message);
            } else {
                setErrorMessage("Error de conexión con el servidor.");
            }
        }
    };

    return (
        <div className="w-full max-w-md px-4 sm:px-0 py-8">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 sm:p-10 shadow-xl shadow-neutral-950/5 dark:shadow-black/40">
                <div className="flex flex-col items-center text-center mb-8">
                    <img src="/Logo.webp" alt="Logo Locatel" width={250} height={250} />
                    <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 mt-2">
                        Iniciar Sesión
                    </h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                        Gestor de Facturación • Pasivos y Tesorería
                    </p>
                </div>

                {errorMessage && (
                    <div className="mb-6 p-3.5 rounded-xl bg-locatel-naranja/10 border border-locatel-naranja/30 text-locatel-naranja text-sm flex items-center gap-2.5">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <div>
                        <label
                            htmlFor="email"
                            className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5"
                        >
                            Correo
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                                <User className="w-5 h-5" />
                            </div>
                            <input
                                {...register("email")}
                                type="text"
                                id="email"
                                placeholder="correo"
                                autoComplete="email"
                                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 text-sm focus:outline-none focus:border-locatel-medio focus:ring-2 focus:ring-locatel-medio/30 transition-all"
                            />
                        </div>
                        {errors.email && (
                            <span className="text-xs text-red-500 mt-1 block">
                                {errors.email.message}
                            </span>
                        )}
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label
                                htmlFor="password"
                                className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300"
                            >
                                Contraseña
                            </label>
                            <Link
                                href="/forgot-password"
                                className="text-xs font-medium text-locatel-medio hover:text-locatel-oscuro dark:text-locatel-claro transition-colors"
                            >
                                ¿Olvidaste tu clave?
                            </Link>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                                <Lock className="w-5 h-5" />
                            </div>
                            <input
                                {...register("password")}
                                type={showPassword ? "text" : "password"}
                                id="password"
                                placeholder="••••••••"
                                autoComplete="current-password"
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
                        {errors.password && (
                            <span className="text-xs text-red-500 mt-1 block">
                                {errors.password.message}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center">
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                            <input
                                {...register("rememberMe")}
                                type="checkbox"
                                className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 accent-locatel-medio text-locatel-medio focus:ring-locatel-medio cursor-pointer"
                            />
                            <span className="text-sm text-neutral-600 dark:text-neutral-300">
                                Recordar mi sesión en este equipo
                            </span>
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 px-4 rounded-xl font-medium text-sm text-white bg-locatel-medio hover:bg-locatel-oscuro active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-locatel-medio/50 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                                Iniciando sesión...
                            </>
                        ) : (
                            <>
                                Iniciar sesión
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800 text-center">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        ¿No tienes una cuenta?{" "}
                        <Link
                            href="/register"
                            className="font-semibold text-locatel-medio dark:text-locatel-claro hover:text-locatel-oscuro transition-colors"
                        >
                            Regístrate aquí
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}