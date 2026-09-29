import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "El correo es obligatorio").email("El correo no es válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  rememberMe: z.boolean(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export type ResponseLoginError = {
  errors?: {
    email?: string | string[];
    password?: string | string[];
  };
  message?: string;
};

export const registerSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  email: z.string().min(1, "El correo es requerido").email("El correo no es válido"),
  role: z.string().min(1, "El rol es requerido"),
  password: z.string().min(1, "La contraseña es requerida").min(8, "La contraseña debe tener al menos 8 caracteres").max(32, "La contraseña debe tener menos de 32 caracteres"),
  confirmPassword: z.string().min(1, "La confirmación de la contraseña es requerida").min(8, "La confirmación de la contraseña debe tener al menos 8 caracteres").max(32, "La confirmación de la contraseña debe tener menos de 32 caracteres"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export type RegisterFormData = z.infer<typeof registerSchema>;

export type ResponseRegisterError = {
  errors?: {
    name?: string | string[];
    last_name?: string | string[];
    lastName?: string | string[];
    email?: string | string[];
    role?: string | string[];
    password?: string | string[];
    confirm_password?: string | string[];
    confirmPassword?: string | string[];
  };
  message?: string;
};

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "El correo es requerido").email("El correo no es válido"),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export type ResponseForgotPasswordError = {
  errors?: {
    email?: string | string[];
  };
  message?: string;
};

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "El token de recuperación es requerido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(32, "La contraseña debe tener menos de 32 caracteres"),
  confirmPassword: z.string().min(8, "La confirmación debe tener al menos 8 caracteres").max(32, "La confirmación debe tener menos de 32 caracteres"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export type ResponseResetPasswordError = {
  errors?: {
    token?: string | string[];
    password?: string | string[];
    confirm_password?: string | string[];
  };
  message?: string;
};
