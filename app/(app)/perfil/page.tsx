"use client";

import { useEffect, useState, FormEvent } from "react";
import {
  User,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  AlertCircle,
  Mail,
  Shield,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { fetchClient } from "@/lib/fetchClient";
import { useTreasury } from "../tesoreria/context";
import {
  profileSchema,
  changePasswordSchema,
  ProfileFormData,
  ChangePasswordFormData,
} from "@/lib/validations/profile";

export default function PerfilPage() {
  const { user: contextUser, handleRefresh } = useTreasury();

  const [loadingProfile, setLoadingProfile] = useState(!contextUser);
  const [user, setUser] = useState(contextUser);

  const [profileData, setProfileData] = useState<ProfileFormData>({
    name: contextUser?.name || "",
    last_name: contextUser?.last_name || "",
  });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [passwordData, setPasswordData] = useState<ChangePasswordFormData>({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    async function loadUserData() {
      try {
        const res = await fetchClient("/api/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          setProfileData({
            name: data.name || "",
            last_name: data.last_name || "",
          });
        }
      } catch {
        toast.error("No se pudo cargar la información del usuario.");
      } finally {
        setLoadingProfile(false);
      }
    }

    loadUserData();
  }, []);

  useEffect(() => {
    if (contextUser) {
      setUser(contextUser);
      setProfileData((prev) => ({
        name: prev.name || contextUser.name || "",
        last_name: prev.last_name || contextUser.last_name || "",
      }));
    }
  }, [contextUser]);

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setProfileErrors({});

    const result = profileSchema.safeParse(profileData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        if (issue.path[0]) {
          fieldErrors[issue.path[0] as string] = issue.message;
        }
      }
      setProfileErrors(fieldErrors);
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await fetchClient("/api/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });

      const responseData = await res.json();

      if (!res.ok) {
        toast.error(responseData.message || "Error al actualizar el perfil.");
        return;
      }

      toast.success("Perfil actualizado correctamente.");
      setUser((prev) =>
        prev
          ? {
            ...prev,
            name: result.data.name,
            last_name: result.data.last_name,
          }
          : prev
      );
      handleRefresh();
    } catch {
      toast.error("Error de comunicación al actualizar perfil.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordErrors({});

    const result = changePasswordSchema.safeParse(passwordData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        if (issue.path[0]) {
          fieldErrors[issue.path[0] as string] = issue.message;
        }
      }
      setPasswordErrors(fieldErrors);
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetchClient("/api/me/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: result.data.current_password,
          new_password: result.data.new_password,
        }),
      });

      const responseData = await res.json();

      if (!res.ok) {
        if (responseData.error === "INVALID_CURRENT_PASSWORD") {
          setPasswordErrors({
            current_password: responseData.message || "La contraseña actual no es correcta",
          });
        }
        toast.error(responseData.message || "Error al actualizar la contraseña.");
        return;
      }

      toast.success("Contraseña actualizada exitosamente.");
      setPasswordData({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
    } catch {
      toast.error("Error de comunicación al actualizar la contraseña.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3 text-neutral-500 dark:text-neutral-400">
          <Loader2 className="w-8 h-8 animate-spin text-locatel-medio" />
          <p className="text-sm font-medium">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-locatel-medio/15 text-locatel-medio flex items-center justify-center font-bold text-2xl border border-locatel-medio/20">
                {user?.name?.[0]?.toUpperCase() || "U"}
                {user?.last_name?.[0]?.toUpperCase() || ""}
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-neutral-900" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                {user?.name} {user?.last_name}
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {user?.email}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {(user?.roles || ["Usuario"]).map((role) => (
                  <span
                    key={role}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-locatel-medio/10 text-locatel-medio dark:bg-locatel-medio/20 border border-locatel-medio/30"
                  >
                    <Shield className="w-3 h-3" />
                    {role}
                  </span>
                ))}
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60">
                  <CheckCircle2 className="w-3 h-3" />
                  Activo
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800/80 mb-5">
              <div className="w-10 h-10 rounded-xl bg-locatel-medio/10 text-locatel-medio flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Información Personal
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Actualiza tu nombre y apellido visibles en la plataforma
                </p>
              </div>
            </div>

            <form id="profile-form" onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Correo Electrónico (Solo informativo)</span>
                </label>
                <input
                  type="text"
                  value={user?.email || ""}
                  disabled
                  readOnly
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700/60 bg-neutral-100 dark:bg-neutral-800/60 text-neutral-500 dark:text-neutral-400 text-sm font-medium cursor-not-allowed select-none"
                />
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>El correo no puede ser modificado</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Nombre
                </label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => {
                    setProfileData({ ...profileData, name: e.target.value });
                    if (profileErrors.name) {
                      setProfileErrors({ ...profileErrors, name: "" });
                    }
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all outline-hidden bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 ${profileErrors.name
                      ? "border-rose-500 focus:ring-2 focus:ring-rose-500/30"
                      : "border-neutral-200 dark:border-neutral-700 focus:border-locatel-medio focus:ring-2 focus:ring-locatel-medio/20"
                    }`}
                  placeholder="Tu nombre"
                />
                {profileErrors.name && (
                  <p className="text-rose-600 text-xs mt-1">{profileErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Apellido
                </label>
                <input
                  type="text"
                  value={profileData.last_name}
                  onChange={(e) => {
                    setProfileData({ ...profileData, last_name: e.target.value });
                    if (profileErrors.last_name) {
                      setProfileErrors({ ...profileErrors, last_name: "" });
                    }
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all outline-hidden bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 ${profileErrors.last_name
                      ? "border-rose-500 focus:ring-2 focus:ring-rose-500/30"
                      : "border-neutral-200 dark:border-neutral-700 focus:border-locatel-medio focus:ring-2 focus:ring-locatel-medio/20"
                    }`}
                  placeholder="Tu apellido"
                />
                {profileErrors.last_name && (
                  <p className="text-rose-600 text-xs mt-1">{profileErrors.last_name}</p>
                )}
              </div>
            </form>
          </div>

          <div className="pt-5 mt-6 border-t border-neutral-100 dark:border-neutral-800/80 flex justify-end">
            <button
              type="submit"
              form="profile-form"
              disabled={isSavingProfile}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-white bg-locatel-medio hover:bg-locatel-oscuro active:scale-98 transition-all cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingProfile ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isSavingProfile ? "Guardando..." : "Guardar Cambios"}</span>
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800/80 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Seguridad y Contraseña
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Actualiza tu clave de acceso con al menos 8 caracteres
                </p>
              </div>
            </div>

            <form id="password-form" onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Contraseña Actual
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordData.current_password}
                    onChange={(e) => {
                      setPasswordData({
                        ...passwordData,
                        current_password: e.target.value,
                      });
                      if (passwordErrors.current_password) {
                        setPasswordErrors({ ...passwordErrors, current_password: "" });
                      }
                    }}
                    className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl border text-sm transition-all outline-hidden bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 ${passwordErrors.current_password
                        ? "border-rose-500 focus:ring-2 focus:ring-rose-500/30"
                        : "border-neutral-200 dark:border-neutral-700 focus:border-locatel-medio focus:ring-2 focus:ring-locatel-medio/20"
                      }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {passwordErrors.current_password && (
                  <p className="text-rose-600 text-xs mt-1">
                    {passwordErrors.current_password}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={passwordData.new_password}
                    onChange={(e) => {
                      setPasswordData({
                        ...passwordData,
                        new_password: e.target.value,
                      });
                      if (passwordErrors.new_password) {
                        setPasswordErrors({ ...passwordErrors, new_password: "" });
                      }
                    }}
                    className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl border text-sm transition-all outline-hidden bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 ${passwordErrors.new_password
                        ? "border-rose-500 focus:ring-2 focus:ring-rose-500/30"
                        : "border-neutral-200 dark:border-neutral-700 focus:border-locatel-medio focus:ring-2 focus:ring-locatel-medio/20"
                      }`}
                    placeholder="Mínimo 8 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {passwordErrors.new_password && (
                  <p className="text-rose-600 text-xs mt-1">
                    {passwordErrors.new_password}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Confirmar Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordData.confirm_password}
                    onChange={(e) => {
                      setPasswordData({
                        ...passwordData,
                        confirm_password: e.target.value,
                      });
                      if (passwordErrors.confirm_password) {
                        setPasswordErrors({ ...passwordErrors, confirm_password: "" });
                      }
                    }}
                    className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl border text-sm transition-all outline-hidden bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 ${passwordErrors.confirm_password
                        ? "border-rose-500 focus:ring-2 focus:ring-rose-500/30"
                        : "border-neutral-200 dark:border-neutral-700 focus:border-locatel-medio focus:ring-2 focus:ring-locatel-medio/20"
                      }`}
                    placeholder="Repite la nueva contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {passwordErrors.confirm_password && (
                  <p className="text-rose-600 text-xs mt-1">
                    {passwordErrors.confirm_password}
                  </p>
                )}
              </div>
            </form>
          </div>

          <div className="pt-5 mt-6 border-t border-neutral-100 dark:border-neutral-800/80 flex justify-end">
            <button
              type="submit"
              form="password-form"
              disabled={isChangingPassword}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 dark:text-neutral-900 active:scale-98 transition-all cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isChangingPassword ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              <span>
                {isChangingPassword ? "Actualizando..." : "Actualizar Contraseña"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
