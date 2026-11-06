# Proposal

## Why

Ludoteca todavía no existe como app. Antes de construir la biblioteca hace falta la base sobre la que se apoyan todas las etapas: entrar con una cuenta, moverse entre secciones en la PC y en el celu, y el estilo visual del diseño.

## What Changes

- Ingreso con Google y registro cerrado a una lista de mails permitidos.
- Aislamiento entre usuarios desde el día uno: cada usuario ve y cambia solo sus datos.
- Navegación de PC (menú de arriba) y de celu (barra de abajo), con acceso a Ajustes en los dos.
- Tema oscuro con los colores por significado, tipografías y zonas táctiles de 44 px del diseño.
- Textos en español rioplatense.
- Deploy en Vercel y CI en GitHub Actions (lint, typecheck, tests y build).

## Capabilities

### New Capabilities
- `acceso`: ingreso, cierre de sesión, registro cerrado y aislamiento de los datos de cada usuario.
- `navegacion`: estructura de navegación en PC y celu, Ajustes, estilo visual y accesibilidad base.

### Modified Capabilities
Ninguna.

## Impact

- Proyecto nuevo: Next.js + TypeScript, Supabase (Auth y Postgres), Drizzle, CSS Modules.
- Infraestructura: Vercel (Hobby), Supabase (plan gratis), GitHub Actions, SonarQube Cloud.
- Referencias de diseño: `design/Main.dc.html` (encabezado de PC) y `design/Movil-Biblioteca.dc.html` (barra inferior del celu). Tokens en `design/LEEME.md`.
