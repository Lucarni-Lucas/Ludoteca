# Tasks

Los nombres entre comillas son escenarios de las specs: cada uno lleva un test con ese mismo nombre. Las tareas marcadas **[Usuario]** requieren tus cuentas y credenciales, así que las hacés vos; el agente te pasa los pasos exactos.

## 1. Proyecto base

- [ ] 1.1 Crear `package.json`, `tsconfig.json` (`strict`), `next.config.ts`, `.env.example` y una página mínima en `src/app/`, con las dependencias de `design.md` §13 y TypeScript `~6.0`; ampliar `.gitignore` (`.env.local`, `.next`, `node_modules`, reportes de tests). Verificar: `npm run typecheck` y `npm run build` terminan sin errores.
- [ ] 1.2 Configurar ESLint con `eslint-config-next`, `typescript-eslint`, `eslint-plugin-sonarjs`, `no-console` y las reglas de capas por carpeta (`design.md` §12). Verificar: `npm run lint` pasa, y falla si se prueba a mano un import de `next` en `src/model/`.
- [ ] 1.3 Configurar Vitest con los proyectos Node y jsdom, y React Testing Library. Verificar: `npm test` encuentra y corre los tests de `tests/` en ambos entornos con los de la sección 2.

## 2. Transversales

- [ ] 2.1 Crear `shared/`: `AppError`, logger y `toActionResult`, con tests de error con nombre, error desconocido sin filtrar mensajes internos y éxito. Verificar: `npm test`.
- [ ] 2.2 Crear `config/` con las variables validadas por Zod, separando las públicas de las de servidor, con tests de variable faltante y de URL inválida. Verificar: `npm test`.

## 3. Estilo visual

- [ ] 3.1 Crear `styles/tokens.css` y los estilos globales (`design.md` §9), con las tres fuentes por `next/font`, `lang="es"`, `:focus-visible` y `not-found.tsx` en español. Verificar: comparar los valores con `design/LEEME.md` y `design/Main.dc.html`; `npm run build`.
- [ ] 3.2 Crear el tipo de grupos en `model/status/` y `StatusBadge` en `components/status/`, con los tests «Color de un estado terminado» y de los otros tres grupos. Verificar: `npm test`.
- [ ] 3.3 Crear `ComingSoon` en `components/layout/`, con el test «Sección sin construir». Verificar: `npm test`.

## 4. Persistencia

- [ ] 4.1 Configurar drizzle-kit y `persistence/db.ts`, crear la tabla `allowed_email` en `persistence/sql/account/` con RLS habilitada (revisando en la documentación la API vigente de Drizzle) y generar la migración. Verificar: el archivo queda en `drizzle/`, con ids uuid, `created_at` y `updated_at`.
- [ ] 4.2 Crear el helper de tests que levanta PGlite, crea el rol `supabase_auth_admin` y aplica las migraciones reales. Implementar el repositorio `allowed-email` con tests de mail presente, ausente y distinto en mayúsculas. Verificar: `npm test`.
- [ ] 4.3 Escribir la función del hook en una migración custom, con sus permisos (`design.md` §4), y testearla contra PGlite: permite un mail de la lista y rechaza otro con error 403, con los mismos casos de normalización del modelo. Verificar: `npm test`.

## 5. Dominio de la cuenta

- [ ] 5.1 Crear en `model/account/` `normalizeEmail`, `safeNextPath`, la inicial del avatar y `EmailNotAllowedError`, con tests de bordes: mayúsculas y espacios, `next` externo (`//sitio.com`, `https://…`), `next` vacío, y usuario sin nombre. Verificar: `npm test`.
- [ ] 5.2 Crear `createAccountService` y su `instance.ts`, con tests de mail permitido y no permitido usando un repositorio falso. Verificar: `npm test`.

## 6. Sesión

- [ ] 6.1 Crear en `security/` el cliente de servidor, `getSessionUser`, `requireSessionUser` y las funciones de ingreso y cierre, con tests sobre cliente falso de sesión válida, ausente y `getClaims` con error. Verificar: `npm test`.
- [ ] 6.2 Crear `resolveAccess` y `src/proxy.ts` con su matcher, con tests de la decisión: sin sesión a `/login?next=`, con sesión en `/login` a `/library`, y `/auth/callback` libre. Verificar: `npm test` y `npm run build`.

## 7. Pantalla de ingreso

- [ ] 7.1 Crear `/login`, con `LoginCard` en `components/account/`, `use-google-sign-in` en `hooks/` y la Server Action con Zod, con tests de componente de botón, estado pendiente y mensajes de error. Verificar: `npm test`.
- [ ] 7.2 Crear `/auth/callback`: valida con Zod, canjea el código, verifica el mail con el servicio y traduce los rechazos, con tests de código ausente, mail no permitido (cierra la sesión) y error del proveedor. Verificar: `npm test`.
- [ ] 7.3 Crear el soporte de e2e (`design.md` §11): Playwright a 390 y 1440 px con un worker, servidor de Auth falso y PGlite por socket. Verificar: `npm run test:e2e` levanta todo y pasa «Acceso sin sesión».
- [ ] 7.4 Sumar en e2e «Ingreso de un usuario permitido», «Vuelve a la pantalla pedida» y «Mail no permitido», en los dos anchos. Verificar: `npm run test:e2e`.

## 8. Navegación y Ajustes

- [ ] 8.1 Crear `sections.ts`, `TopNav`, `BottomNav` y `use-active-section`, con tests de componente de sección marcada y de que no aparece Estadísticas (RTL). Verificar: `npm test`.
- [ ] 8.2 Crear `PageHeader` con el avatar, el layout de `app/(app)/` con `requireSessionUser` y las páginas `/library`, `/check`, `/subscriptions`, `/stores` y `/add`, con `/` redirigiendo a `/library`. La Biblioteca invita a agregar juegos con voseo. Verificar con e2e: «Encabezado en la PC», «Navegación en el celu», «Estadísticas oculta» y «Llamado a la acción».
- [ ] 8.3 Crear `/settings/account` con `SettingsNav`, `AccountPanel` y `use-sign-out`, con su Server Action y test de componente. Verificar con e2e: «Abrir Ajustes desde el celu» y «Cierre de sesión».
- [ ] 8.4 Sumar los e2e de accesibilidad y ancho sobre todas las pantallas de esta etapa: «Botón chico», «Pantalla angosta» y «Recorrido con tabulador». Verificar: `npm run test:e2e`, corrigiendo los componentes si algo no cumple.

## 9. Puesta en marcha

- [ ] 9.1 Crear `.github/workflows/ci.yml` (lint, typecheck, tests y build, sin secretos) y `sonar-project.properties`, y documentar en `README.md` cómo correr el proyecto y la puesta en marcha. Verificar: los comandos del workflow pasan en local con valores de ejemplo y el README se sigue tal cual.
- [ ] 9.2 **[Usuario]** Crear el proyecto de Supabase y el cliente OAuth de Google, activar el proveedor Google, cargar las redirecciones permitidas y apagar la Data API. Verificar: el panel muestra Google activo y la Data API apagada.
- [ ] 9.3 **[Usuario]** Correr `npm run db:migrate` contra Supabase, insertar tu mail en `allowed_email` y, recién después, activar el hook «Before User Created». Verificar: la tabla tiene tu mail y el hook figura activo.
- [ ] 9.4 **[Usuario]** Crear el proyecto de Vercel conectado al repo, cargar las variables de entorno y activar el análisis automático en SonarQube Cloud. Verificar: un push a `main` despliega, y el CI y el análisis de SonarQube corren.
- [ ] 9.5 Prueba manual sobre el deploy: ingresar con tu cuenta, cerrar sesión e intentar con un mail no permitido. Verificar: ves «Esta cuenta no tiene acceso a Ludoteca» y Supabase no muestra ningún usuario nuevo. Si el rechazo llega distinto a lo previsto, ajustar el mapeo y el servidor falso de e2e según `design.md` (Risks).

## 10. Verificación final

- [ ] 10.1 Revisar la definición de terminado de `CLAUDE.md` completa: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` y `npm run test:e2e` sin errores; cada escenario de las specs con su test de igual nombre; pantallas comparadas con `design/Main.dc.html`, `design/Movil-Biblioteca.dc.html` y `design/Escritorio-Estados.dc.html`; sin issues nuevos en SonarQube; y todas las tareas marcadas.

## Workflow follow-up

- Archivar con `/opsx:archive` una vez cumplida la definición de terminado, antes de empezar `02-nucleo-biblioteca`.
