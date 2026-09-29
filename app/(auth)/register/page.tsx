"use client";

import { useState } from "react";
import Link from "next/link";
import { User, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, AlertCircle, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterFormData, type ResponseRegisterError } from "@/schemas/auth";

export default function RegisterPage() {
    const {
        register,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            name: "",
            lastName: "",
            email: "",
            role: "ANALISTA_TESORERIA",
            password: "",
            confirmPassword: "",
        },
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const onSubmit = async (data: RegisterFormData) => {
        setErrorMessage("");

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: data.name,
                    last_name: data.lastName,
                    email: data.email,
                    role: data.role || "ANALISTA_TESORERIA",
                    password: data.password,
                    confirm_password: data.confirmPassword,
                }),
            });

            if (!response.ok) {
                const errorData = (await response.json().catch(() => null)) as ResponseRegisterError | null;

                if (response.status === 422 && errorData?.errors) {
                    const getErrorMsg = (err?: string | string[]) =>
                        Array.isArray(err) ? err[0] : err;

                    if (errorData.errors.name) {
                        const msg = getErrorMsg(errorData.errors.name);
                        if (msg) setError("name", { message: msg });
                    }
                    const lastNameError = errorData.errors.last_name ?? errorData.errors.lastName;
                    if (lastNameError) {
                        const msg = getErrorMsg(lastNameError);
                        if (msg) setError("lastName", { message: msg });
                    }
                    if (errorData.errors.email) {
                        const msg = getErrorMsg(errorData.errors.email);
                        if (msg) setError("email", { message: msg });
                    }
                    if (errorData.errors.password) {
                        const msg = getErrorMsg(errorData.errors.password);
                        if (msg) setError("password", { message: msg });
                    }
                    const confirmPasswordError =
                        errorData.errors.confirm_password ?? errorData.errors.confirmPassword;
                    if (confirmPasswordError) {
                        const msg = getErrorMsg(confirmPasswordError);
                        if (msg) setError("confirmPassword", { message: msg });
                    }
                    return;
                }

                if (response.status === 409) {
                    setErrorMessage("El correo electrónico ya se encuentra registrado.");
                    return;
                }

                setErrorMessage(errorData?.message || "Error al procesar la solicitud en el servidor.");
                return;
            }

            window.location.href = "/login";
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
                        Crear Cuenta
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

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label
                            htmlFor="name"
                            className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5"
                        >
                            Nombre
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                                <User className="w-5 h-5" />
                            </div>
                            <input
                                {...register("name")}
                                type="text"
                                placeholder="ej. Juan Pérez"
                                autoComplete="name"
                                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 text-sm focus:outline-none focus:border-locatel-medio focus:ring-2 focus:ring-locatel-medio/30 transition-all"
                            />
                        </div>
                        {errors.name && (
                            <span className="text-xs text-red-500 mt-1 block">
                                {errors.name.message}
                            </span>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="lastName"
                            className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5"
                        >
                            Apellido
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                                <User className="w-5 h-5" />
                            </div>
                            <input
                                {...register("lastName")}
                                type="text"
                                placeholder="ej. Pérez"
                                required
                                autoComplete="family-name"
                                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 text-sm focus:outline-none focus:border-locatel-medio focus:ring-2 focus:ring-locatel-medio/30 transition-all"
                            />
                        </div>
                        {errors.lastName && (
                            <span className="text-xs text-red-500 mt-1 block">
                                {errors.lastName.message}
                            </span>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="email"
                            className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5"
                        >
                            Correo Corporativo
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                                <Mail className="w-5 h-5" />
                            </div>
                            <input
                                {...register("email")}
                                type="email"
                                placeholder="Correo corporativo"
                                required
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
                        <label
                            htmlFor="role"
                            className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5"
                        >
                            Rol en el Sistema
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <select
                                {...register("role")}
                                id="role"
                                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-none focus:border-locatel-medio focus:ring-2 focus:ring-locatel-medio/30 transition-all cursor-pointer"
                            >
                                <option value="ANALISTA_TESORERIA">Analista de Tesorería</option>
                            </select>
                        </div>
                        <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">
                            El rol de Coordinador de Tesorería o Administrador solo puede ser elevado por un Administrador del sistema.
                        </p>
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5"
                        >
                            Contraseña
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                                <Lock className="w-5 h-5" />
                            </div>
                            <input
                                {...register("password")}
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                required
                                autoComplete="new-password"
                                className="w-full pl-11 pr-11 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 text-sm focus:outline-none focus:border-locatel-medio focus:ring-2 focus:ring-locatel-medio/30 transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                                aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                            >
                                {showPassword ? (
                                    <EyeOff className="w-5 h-5" />
                                ) : (
                                    <Eye className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                        {errors.password && (
                            <span className="text-xs text-red-500 mt-1 block">
                                {errors.password.message}
                            </span>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="confirmPassword"
                            className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5"
                        >
                            Confirmar Contraseña
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                {...register("confirmPassword")}
                                placeholder="••••••••"
                                required
                                autoComplete="new-password"
                                className="w-full pl-11 pr-11 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 text-sm focus:outline-none focus:border-locatel-medio focus:ring-2 focus:ring-locatel-medio/30 transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                                aria-label={showConfirmPassword ? "Ocultar contraseña" : "Ver contraseña"}
                            >
                                {showConfirmPassword ? (
                                    <EyeOff className="w-5 h-5" />
                                ) : (
                                    <Eye className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                        {errors.confirmPassword && (
                            <span className="text-xs text-red-500 mt-1 block">
                                {errors.confirmPassword.message}
                            </span>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 px-4 rounded-xl font-medium text-sm text-white bg-locatel-medio hover:bg-locatel-oscuro active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-locatel-medio/50 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                                Registrando cuenta...
                            </>
                        ) : (
                            <>
                                Registrarse
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800 text-center">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        ¿Ya tienes una cuenta?{" "}
                        <Link
                            href="/login"
                            className="font-semibold text-locatel-medio dark:text-locatel-claro hover:text-locatel-oscuro transition-colors"
                        >
                            Inicia sesión aquí
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}