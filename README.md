# Frontend — Gestor de Disponibilidad

Aplicación web empresarial desarrollada con **Next.js 16 (App Router)**, **React 19**, **TypeScript** y **Tailwind CSS v4** para la administración de tesorería, posición de disponibilidad diaria, sincronización de tasas BCV y conciliación de cuentas por pagar (CxP).

---

## 🚀 Tecnologías Principales

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, Standalone build)
- **Librería UI:** [React 19](https://react.dev/)
- **Lenguaje:** [TypeScript 5](https://www.typescriptlang.org/)
- **Estilos:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Tablas y Virtualización:** [@tanstack/react-table](https://tanstack.com/table) y [@tanstack/react-virtual](https://tanstack.com/virtual)
- **Formularios y Validación:** [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Notificaciones:** [Sonner](https://sonner.emilkowal.ski/)
- **Iconografía:** [Lucide React](https://lucide.dev/)
- **Gestor de Paquetes:** Bun / npm

---

## 📂 Estructura del Proyecto

```text
frontend/
├── app/
│   ├── (app)/                  # Rutas protegidas del sistema
│   │   ├── cxp/                # Módulo de Cuentas por Pagar
│   │   │   ├── facturas/       # Gestión y escaneo de facturas pendientes
│   │   │   ├── propuestas/     # Creación y aprobación de propuestas de pago
│   │   │   ├── programadas/    # Facturas aprobadas programadas para pago
│   │   │   ├── historico/      # Histórico de pagos ejecutados
│   │   │   ├── calendario/     # Calendario de vencimientos
│   │   │   └── proveedores/    # Maestro de proveedores (SAP / Firmes / Consignación)
│   │   ├── tesoreria/          # Módulo de Tesorería
│   │   │   ├── cierre/         # Cierre operativo diario
│   │   │   ├── historico/      # Histórico de cierres y saldos
│   │   │   ├── matriz/         # Matriz mensual consolidada
│   │   │   ├── empresas/       # Maestro de empresas
│   │   │   └── bancos/         # Maestro de bancos y cuentas bancarias
│   │   ├── usuarios/           # Administración de usuarios y permisos (RBAC)
│   │   └── perfil/             # Configuración de cuenta y perfil de usuario
│   ├── (auth)/                 # Autenticación (Login, Registro público de analistas)
│   ├── globals.css             # Estilos globales y tokens de diseño Tailwind v4
│   └── layout.tsx              # Root layout con soporte de tema (claro / oscuro)
├── components/                 # Componentes reutilizables (Sidebar, Badges, Modales)
├── lib/                        # Clientes HTTP (fetchClient), utilidades y formateadores
├── public/                     # Recursos estáticos
├── next.config.ts              # Configuración de Next.js (rewrites de API y standalone)
└── package.json                # Dependencias y scripts
```

---

## 🛠️ Requisitos Previos

- **Node.js:** v20.x o superior LTS (o **Bun** v1.2+)
- **Backend Go:** Ejecutándose en `http://localhost:8000` (o configurado en el proxy inverso)

---

## ⚙️ Instalación y Desarrollo

1. **Instalar dependencias:**
   ```bash
   bun install
   # o alternativamente:
   npm install
   ```

2. **Ejecutar en entorno de desarrollo:**
   ```bash
   bun run dev
   # o:
   npm run dev
   ```

   El servidor iniciará en `http://localhost:3000`. En modo desarrollo, `next.config.ts` reescribe automáticamente las peticiones `/api/*` hacia `http://localhost:8000/api/*`.

3. **Verificación de código:**
   ```bash
   npm run lint
   ```

---

## 📦 Compilación para Producción

El proyecto está configurado con `output: "standalone"`, ideal para despliegues ligeros con Node.js, Docker o IIS:

```bash
bun run build
# o:
npm run build
```

Genera la carpeta `.next/standalone`, la cual contiene una versión mínima de Node.js lista para ejecutarse:

```bash
# Iniciar servidor standalone compilado
node .next/standalone/server.js
```

---

## 🚢 Despliegue en Servidores

### Opción 1: IIS (Internet Information Services + httpPlatformHandler)
- El sitio web apunta a la raíz de la distribución compilada.
- Utiliza `web.config` configurando `httpPlatformHandler` apuntando al ejecutable `node.exe` y al script `.\server.js`.
- Las peticiones `/api/*` se redirigen internamente al servicio del backend en Go.

### Opción 2: Docker / Nginx
- Imagen basada en `node:20-alpine` o precompilada en GHCR (`ghcr.io/lc-master/gestor-disponibilidad-front`).
- Expone el puerto `3000` internamente hacia el proxy inverso (Nginx), quien maneja SSL y el enrutamiento a `/` y `/api/`.

---

## 🔐 Módulos Funcionales

1. **Posición de Disponibilidad & Tesorería:**
   - Registro de saldos operativos bancarios (VES / USD / EUR).
   - Cálculo automático de caja libre neta y cupos aprobados para pagos.
   - Histórico consolidado por fecha y matriz mensual de evolución de saldos.
2. **Cuentas por Pagar (CxP):**
   - Procesamiento e indexación de facturas comerciales vinculadas a tasas oficiales del BCV.
   - Generación de propuestas de pago optimizadas contra cupo disponible de tesorería.
   - Detalle multimoneda: soporte transparente de documentos emitidos en VES y divisas (USD/EUR).
   - Control de estados: Pendiente, Aprobada / Programada y Pagada.
3. **Seguridad y Control de Acceso (RBAC):**
   - Roles predefinidos: `ADMIN`, `COORD_TESORERIA`, `ANALISTA_TESORERIA`, `COORD_CXP`, `ANALISTA_CXP`.
   - Matriz granular de permisos por módulo (`treasury.*`, `cxp.*`, `users.*`).
   - Modo oscuro / claro sincronizado en `localStorage`.
