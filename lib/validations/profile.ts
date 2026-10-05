import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  last_name: z.string().trim().min(2, "El apellido debe tener al menos 2 caracteres").max(100),
});

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Debe ingresar su contraseña actual"),
    new_password: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
    confirm_password: z.string().min(1, "Debe confirmar su nueva contraseña"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Las contraseñas no coinciden",
    path: ["confirm_password"],
  });

export type ProfileFormData = z.infer<typeof profileSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
