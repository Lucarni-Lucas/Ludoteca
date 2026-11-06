# Design

## Context

El repo solo tiene documentación: no hay `package.json` ni código. Las reglas de capas, tests y calidad salen de `CLAUDE.md`; el stack, de `docs/decisiones.md` §2. El motivo del cambio está en `proposal.md`.

Tres hechos verificados en la documentación oficial condicionan el enfoque:

- **Next.js 16 renombró `middleware` a `proxy`.** Corre en Node y va en `src/proxy.ts`. Next pide además verificar la sesión dentro de cada Server Action, sin confiar solo en el proxy.
- **Supabase crea el usuario de Auth al primer ingreso con Google**, salvo que lo frene el hook «Before User Created», disponible en el plan Free.
- **`typescript-eslint` exige TypeScript `<6.1.0`**, y la última versión publicada de TypeScript es la 7.

## Goals / Non-Goals

**Goals:**

- Dejar andando de punta a punta las capas, los tests y el deploy, con un primer caso real: el ingreso.
- Que el registro cerrado no dependa de un solo control.
- Probar el flujo de ingreso en e2e sin Google real y sin ningún atajo en el código de producción.

**Non-Goals:**

- Aislamiento entre usuarios: pasó a `02-nucleo-biblioteca`, porque en esta etapa no hay datos de usuario. Acá queda lista la sesión que ese requisito va a usar.
- Modo sin conexión e instalación (`07-pwa`).
- Filtrar o reconocer juegos: la búsqueda del encabezado solo navega a ¿Lo tengo?.
- Correr los e2e en CI: `decisiones.md` §2 define lint, typecheck, tests y build. Los e2e son parte de la definición de terminado y corren en local.

## Decisions

### 1. Pantallas y diferencias con el diseño

| Pantalla | Referencia | Diferencia |
|---|---|---|
| Encabezado de PC | `design/Main.dc.html` | Sin «Estadísticas». El input del buscador mide 44 px en vez de 40, para que él mismo cumpla la zona táctil. |
| Barra inferior | `design/Movil-Biblioteca.dc.html` | `position: fixed` con `safe-area-inset-bottom`, en lugar del `absolute` y los 26 px que simulan el marco del teléfono. |
| Encabezado de sección en celu | `design/Movil-Biblioteca.dc.html` | Suma el avatar de Ajustes (`decisiones.md` §5). El título queda en 32 px en todas las secciones: el diseño alterna entre 32 y 34. Sin los 60 px de arriba, que simulan la barra de estado. |
| Ajustes › Cuenta | Marco y menú de `design/Escritorio-Estados.dc.html` | El contenido de Cuenta no está diseñado. El menú muestra solo «Cuenta» hasta que existan las demás opciones. |
| Ingreso | No está en el lienzo | Se arma con los tokens: logo, «Ingresar con Google» y mensaje de error. |
| Secciones sin construir | No está en el lienzo | Título y aviso «Próximamente». |

### 2. Rutas

Las carpetas de `app/` son código, así que van en inglés.

| Ruta | Contenido | Sesión |
|---|---|---|
| `/` | Redirige a `/library` | Sí |
| `/login` | Ingreso. Con sesión iniciada, redirige a `/library`. | No |
| `/auth/callback` | Termina el ingreso con Google | No |
| `/library`, `/check`, `/subscriptions`, `/stores`, `/add` | «Próximamente»; cada etapa reemplaza la suya | Sí |
| `/settings` | Redirige a `/settings/account` | Sí |
| `/settings/account` | Mail y «Cerrar sesión» | Sí |

Las rutas con sesión viven en el grupo `app/(app)/`, cuyo layout monta la navegación. Una URL inexistente muestra un `not-found.tsx` en español. Por eso «Vuelve a la pantalla pedida» se prueba en esta etapa con `/games/<id>`: la URL se conserva después del ingreso, y la ficha llega en la etapa 02.

### 3. Archivos y carpetas nuevos fuera del árbol de `CLAUDE.md`

Se proponen con este diseño y se crean al aprobarlo:

- `src/proxy.ts`: Next exige ese lugar.
- `src/persistence/db.ts`: conexión de Drizzle, compartida por los repositorios.
- `src/service/<contexto>/instance.ts`: arma el servicio con sus dependencias reales para que `app/` lo use. `createAccountService({ allowedEmailRepo })` sigue recibiendo todo por parámetro y los tests no pasan por este archivo.
- `components/layout/`, `components/account/` y `components/status/`: agrupan los componentes por tema.
- `tests/e2e/support/`: servidor de Auth falso y base para los e2e.

Contextos que aparecen: `account` y, solo con el tipo de los grupos, `status`.

### 4. Lista de permitidos: tabla y hook, con segundo control en el callback

La tabla `allowed_email` (`id`, `email` único en minúsculas, `created_at`, `updated_at`) se consulta en dos momentos:

1. **Hook «Before User Created»:** una función de Postgres rechaza el alta si el mail no está en la lista. Es lo único que garantiza «no se crea ningún dato», porque actúa antes de que exista el usuario de Auth.
2. **Callback:** después de obtener la sesión, `accountService` vuelve a verificar el mail y, si no está, cierra la sesión. El hook solo corre en el alta, así que este control cubre a quien sacaste de la lista después y a un hook desactivado por error.

La función va en una migración custom de drizzle-kit (`generate --custom`). Es SQL crudo aprobado para este caso: Drizzle no modela funciones. La función es `security definer` con `search_path` vacío, y solo `supabase_auth_admin` puede ejecutarla.

`allowed_email` no tiene dueño, así que su repositorio es una excepción a «cada consulta filtra por usuario», igual que el catálogo compartido. No hay fila ↔ modelo que traducir (el repositorio devuelve un `boolean`), por eso no lleva mapper. El mail no se guarda en el repo, que es público: se inserta a mano en Supabase.

Alternativa descartada: una variable de entorno y borrar al usuario después. Obliga a tener la service role key en Vercel y deja un instante un usuario creado.

### 5. Base cerrada al acceso público

Con el Postgres de Supabase, las tablas de `public` quedan expuestas por la Data API y la publishable key es pública. Las reglas RLS no protegen las consultas de Drizzle (`decisiones.md` §3), pero sí importan para esta otra puerta. Entonces:

- La Data API se apaga en el proyecto de Supabase. La app solo usa Auth desde el cliente de Supabase y Drizzle para los datos.
- Cada tabla habilita RLS sin políticas, como segundo cinturón. Drizzle se conecta con el rol dueño de las tablas, que no queda alcanzado.

### 6. Sesión

- **Cliente:** `@supabase/ssr` con la publishable key. Va en `security/`, junto con el ingreso y el cierre de sesión.
- **Lectura:** `getClaims()`, que verifica la firma del token. `getSession()` no se usa en el servidor porque no valida nada.
- **Proxy:** renueva las cookies y redirige a `/login?next=<ruta>` si no hay sesión. Esa decisión es una función pura en `security/` (`resolveAccess`), probada sin levantar Next.
- **Layout y Server Actions:** llaman a `requireSessionUser()`. Next aclara que el proxy no alcanza, porque un cambio de matcher puede dejar una acción sin cubrir.
- **`next`:** `safeNextPath` (en `model/account/`) acepta solo rutas relativas. Evita que un link armado use el ingreso para mandarte a otro sitio.
- **Cerrar sesión** usa `scope: "local"`: cierra este dispositivo y no los demás. Es un supuesto; la spec no lo distingue.

`app/` llama a `security/` para ingresar y salir. `CLAUDE.md` la define como capa transversal y dueña del cliente de Supabase Auth, así que no es una excepción a «`app/` solo habla con `service/`», que rige para repositorios, Drizzle y adapters.

### 7. Navegación solo con CSS

`TopNav` y `BottomNav` se renderizan siempre, y una media query a 768 px oculta la que no corresponde. Con `display: none` la oculta sale del orden de tabulación. Decidirlo en JavaScript daría un parpadeo y un desajuste de hidratación, porque el servidor no conoce el ancho.

- La lista de secciones y `sectionForPath` viven en `components/layout/sections.ts`: es dato de interfaz, no dominio.
- `hooks/use-active-section.ts` envuelve `usePathname` y un componente de `app/(app)/` le pasa la sección a la navegación por props, como pide la regla de `components/`.
- Los componentes usan `next/link`. Se toma la regla «no conocen el router» como no usar `useRouter` ni `usePathname`: pasar el link por prop agregaría ceremonia sin desacoplar nada real.
- El buscador del encabezado es un formulario GET a `/check?q=`, sin JavaScript. La etapa 05 lee `q`.
- El 768 queda literal en cada CSS Module, porque las media queries no aceptan variables CSS.

### 8. Avatar de Ajustes en el celu

`PageHeader` recibe título y acciones, y agrega el avatar de 44 px a la derecha solo por debajo de 768 px. En PC el avatar está en `TopNav`. Con Filtros y Agregar, el título de Biblioteca entra en 360 px.

### 9. Tokens y tipografías

`styles/tokens.css` define los valores de `design/LEEME.md` y los que aparecen en los `.dc.html` sin figurar ahí (`#C5CCD8`, `#222832`, `#3A414E`, `#7D8696`, los fondos translúcidos de estados). Las fuentes se cargan con `next/font/google`, que las sirve desde el propio sitio: sin pedidos a terceros en cada visita y sin dependencias nuevas. El foco visible es una regla global de `:focus-visible`.

`StatusBadge` llega en esta etapa porque la spec de colores lo necesita, aunque la primera pantalla que lo muestra es de la etapa 02. El grupo se traduce a una variable CSS con un mapa simple. Su test comprueba el mapa y el valor en `tokens.css`: es una excepción puntual a «no se testean colores», porque el escenario pide justamente eso.

### 10. Errores

`shared/` tiene `AppError`, el logger y `toActionResult`, que traduce a `{ ok: false, error: { code, message } }`. `EmailNotAllowedError` vive en `model/account/` y extiende `AppError`, que es TypeScript puro. `clock` no se crea todavía: nada lo usa en esta etapa.

`redirect()` de Next funciona lanzando una excepción, así que se llama fuera del manejador de errores. Si no, el manejador la convertiría en un error para el usuario.

### 11. E2e sin Google y sin atajos

Playwright no puede ni debe pasar por el login real de Google. Un modo de prueba dentro de la app dejaría un bypass en producción, así que la app corre sin cambios contra dos piezas locales, configuradas por variables de entorno:

- **Servidor de Auth falso** (`tests/e2e/support/`): implementa `/authorize`, `/token` y `/user`, y firma tokens. El test elige con qué mail se «ingresa». Se ejercita el flujo real de redirecciones, PKCE y cookies.
- **Base:** PGlite expuesto por socket (`@electric-sql/pglite-socket`), con las migraciones reales.

Los e2e corren con un solo worker, porque el servidor falso guarda en memoria el mail elegido. Lo que esto no cubre (el hook y Google de verdad) se prueba aparte: el hook contra PGlite y el ingreso real en una prueba manual sobre el deploy.

Los escenarios no deben romperse cuando una etapa construya su sección, porque un test no se puede tocar sin tu «sí». Por eso «Sección sin construir» se prueba con React Testing Library sobre `ComingSoon`, y los e2e de navegación miran el título y la marca de la sección, no el aviso.

### 12. Calidad y arquitectura verificable

ESLint usa `no-restricted-imports` por carpeta para que las reglas de capas fallen en `npm run lint`: `model/` sin Next, React, Drizzle, Supabase ni Zod; `app/` sin repositorios, Drizzle ni adapters; `persistence/sql/` importable solo desde `persistence/`. También `no-console` y la prohibición de `any` y `@ts-ignore`. No suma dependencias.

Vitest se organiza en dos proyectos: Node para `model`, `service`, `persistence`, `security` y `shared`; jsdom para `components` y `hooks`. Playwright tiene dos, a 390 × 844 y a 1440 × 900.

### 13. Dependencias

Las del stack (`next`, `react`, `drizzle-orm`, `drizzle-kit`, `zod`, `vitest`, `@testing-library/react`, `@electric-sql/pglite`, `@playwright/test`, `eslint`, `eslint-plugin-sonarjs`) no se justifican de nuevo. Se suman:

| Dependencia | Por qué |
|---|---|
| `@supabase/supabase-js`, `@supabase/ssr` | Cliente oficial de Auth con sesión en cookies para Next. |
| `postgres` | Driver de Drizzle para el Postgres de Supabase. Funciona con el pooler usando `prepare: false`. |
| `typescript` `~6.0` | Fijada por debajo de la última (7.0): `typescript-eslint` no soporta más que `<6.1.0`. |
| `typescript-eslint`, `eslint-config-next` | Reglas de TypeScript y de Next para el ESLint estricto. |
| `@vitejs/plugin-react`, `jsdom` | Vitest los necesita para renderizar componentes. |
| `@testing-library/user-event`, `@testing-library/jest-dom` | Interacciones realistas y aserciones legibles en los tests de componentes. |
| `@electric-sql/pglite-socket` | Solo para e2e: deja que la app se conecte a PGlite sin Docker. |

**No se instalan todavía** Radix y MSW: nada los usa en esta etapa (no hay ventanas emergentes ni adapters). Entran en la 02.

### 14. CI, deploy y SonarQube

- **CI:** `.github/workflows/ci.yml` corre lint, typecheck, tests y build en cada push y PR. El build usa valores de ejemplo en las variables, sin secretos.
- **Deploy:** Vercel conectado al repo: `main` a producción y cada PR a preview. Las URLs de preview entran con un comodín en la lista de redirecciones de Supabase.
- **Conexiones:** la app usa el pooler en modo transacción y drizzle-kit el modo sesión, porque las migraciones necesitan una conexión estable.
- **SonarQube Cloud:** análisis automático, sin workflow ni secretos. No informa cobertura, algo que `CLAUDE.md` no exige.

## Risks / Trade-offs

- **[Riesgo] No está confirmado cómo vuelve el rechazo del hook al navegador** (en qué URL y con qué parámetros); la documentación consultada no lo detalla. → Tanto el callback como `/login` leen `error_description`, y cualquier error desconocido muestra «No pudimos iniciar sesión. Probá de nuevo.». La primera prueba manual con un mail no permitido lo confirma, y la tarea ajusta el mapeo y el servidor falso si hace falta.
- **[Riesgo] PGlite no tiene el rol `supabase_auth_admin`**, y la migración le da permisos. → El helper de tests crea el rol antes de migrar, así los tests usan las migraciones reales sin tocarlas.
- **[Riesgo] `pglite-socket` puede atender mal varias conexiones a la vez.** → En e2e el pool queda en una conexión, configurable por variable de entorno.
- **[Riesgo] La función del hook normaliza mails en SQL y el modelo en TypeScript**, así que hay dos implementaciones. → Los dos tests usan los mismos casos (mayúsculas y espacios).
- **[Limitación] Sacar un mail de la lista no corta una sesión abierta:** el control corre al ingresar. → Para cortarla, se borra el usuario en Supabase. Controlarlo en cada pedido sumaría una consulta por request, que no se justifica en una app personal.
- **[Limitación] Supabase Free pausa el proyecto tras días sin uso**, y el cron que lo evita llega en la etapa 08. → Se reactiva gratis desde el panel.
- **[Trade-off] «Próximamente» queda en la app hasta la etapa 08**, y la app desplegada parece a medias. Se aceptó para que la navegación sea la definitiva desde el principio. Cuando se construya la última sección, ese requisito se debe sacar de la spec con un delta `REMOVED` en esa etapa.
- **[Trade-off] Título largo en 360 px:** cuando la etapa 08 sume «Agregar suscripción», «Suscripciones» más dos botones puede no entrar en una línea. → `PageHeader` deja que el título se parta; se revisa en esa etapa.

## Migration Plan

No hay datos que migrar. El orden de la primera puesta en marcha, con los pasos que requieren tus cuentas, está en la sección 9 de `tasks.md`:

1. Crear el proyecto de Supabase y el cliente OAuth de Google.
2. Correr las migraciones, insertar tu mail en `allowed_email`, activar el hook y apagar la Data API. **El hook se activa recién después de insertar el mail**, o el primer ingreso quedaría rechazado.
3. Crear el proyecto de Vercel con sus variables de entorno.

**Vuelta atrás:** Vercel permite volver a un deploy anterior. Si el hook falla, se desactiva desde el panel de Supabase y el control del callback sigue protegiendo el acceso.
