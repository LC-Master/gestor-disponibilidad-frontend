import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  email: z.string().min(1, "El correo es requerido").email("El correo no es válido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  confirmPassword: z.string().min(8, "La confirmación debe tener al menos 8 caracteres"),
  roles: z.array(z.string()).min(1, "Selecciona al menos un rol"),
  permissions: z.array(z.string()).default([]),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  email: z.string().min(1, "El correo es requerido").email("El correo no es válido"),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
  roles: z.array(z.string()).min(1, "Selecciona al menos un rol"),
  permissions: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
}).refine((data) => {
  if (data.password && data.password.trim().length > 0) {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
