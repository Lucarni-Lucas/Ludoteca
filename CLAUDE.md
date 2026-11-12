# Ludoteca

Web personal (PWA) para llevar la biblioteca de videojuegos, en qué tienda está cada juego y las suscripciones. **Restricción dura: costo cero**, solo servicios con plan gratis.

Este archivo manda sobre la preferencia del agente, los tutoriales y el código existente. Se cambia con un commit que explique por qué.

## Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Decisiones técnicas y de producto, y supuestos | `docs/decisiones.md` (manda sobre la idea) |
| Idea original del producto | `docs/ludoteca-idea.md` |
| Cuentas, claves y paneles que configura el usuario en cada etapa | `docs/configuracion-externa.md` |
| Diseño de referencia (1440 px PC, 390 px celu) | `design/*.dc.html`, cómo leerlos en `design/LEEME.md` |
| Comportamiento que falta construir | `openspec/changes/<nn-nombre>/` |
| Comportamiento ya construido | `openspec/specs/` |

## Cómo se trabaja

- Spec-driven con OpenSpec. Cada etapa ya tiene su cambio con `proposal.md` y specs.
- Para arrancar una etapa, `/opsx:propose <nn-nombre>`: genera `design.md` y `tasks.md` del cambio existente. Si hay algo para charlar antes, `/opsx:explore`.
- Después `/opsx:apply` para implementar y `/opsx:archive` al terminar.
- Las etapas se hacen en orden (01 → 09) y cada una se archiva antes de empezar la siguiente.

## Stack

Next.js (App Router) + TypeScript estricto en Vercel Hobby · Supabase (Postgres, Auth, Storage) · Drizzle ORM con `pg` · Zod · next-intl (desde `03-idiomas`) · CSS Modules + `tokens.css` · Radix sin estilos · Vitest, React Testing Library, MSW, PGlite y Playwright · ESLint + `eslint-plugin-sonarjs` · SonarQube Cloud. El detalle y el porqué de cada uno está en `docs/decisiones.md` §2.

## I. Arquitectura en capas (NO NEGOCIABLE)

Las dependencias van en un solo sentido:

```
app/ (rutas, Server Actions, /api)  →  service/  →  persistence/repository/  →  base de datos
                                          │                  │
                                          ▼                  ▼
                                        model/   ←   persistence/mapper/   →   persistence/sql/

service/  →  adapter/<proveedor>/  →  API externa (IGDB, Steam, Epic)
```

```
src/
  app/                       páginas, layouts, Server Actions y Route Handlers (/api)
  model/<contexto>/          tipos y funciones puras del dominio + errores del contexto
  service/<contexto>/        orquesta los casos de uso
  persistence/
    sql/<contexto>/          tablas de Drizzle: lo único que conoce la base
    mapper/<contexto>/       fila ↔ modelo, campo a campo
    repository/<contexto>/   recibe y devuelve modelo; usa Drizzle y el mapper
  adapter/<proveedor>/       igdb, steam, epic, playnite, ign
    dto/                     forma de los datos del proveedor; nunca sale del adapter
  components/                componentes visuales
  hooks/                     estado y llamadas a Server Actions
  styles/                    tokens.css y estilos globales
  security/                  sesión y cliente de Supabase Auth
  config/                    variables de entorno validadas con Zod
  shared/                    AppError, formato de error, logger, clock
tests/                       copia la estructura de src/; e2e en tests/e2e/
drizzle/                     migraciones SQL generadas
```

Reglas verificables:

- `model/` no importa nada de Next, React, Drizzle, Supabase ni Zod. Solo TypeScript.
- Las tablas de Drizzle viven únicamente en `persistence/sql/`. Nada fuera de `persistence/` las importa.
- El mapper traduce campo a campo y no contiene lógica de negocio. Lo usa el repositorio, nunca el servicio.
- **Cada consulta de un repositorio filtra por el usuario de la sesión.** Cada repositorio tiene un test de «el usuario A no ve ni cambia nada del B».
- `app/` solo habla con `service/`. Una Server Action valida con Zod, llama al servicio y devuelve el resultado; nunca importa un repositorio, Drizzle ni un adapter.
- El servicio recibe y devuelve tipos de `model/`. No conoce Drizzle ni los DTO de los proveedores.
- A una API externa se llega solo por su adapter. El adapter traduce con su propio mapper, no persiste y convierte los errores del proveedor (timeout, 4xx, 5xx, límite de consultas) en errores propios. Nunca se propaga un error crudo de `fetch`.
- Los servicios reciben sus dependencias por parámetro: `createGameService({ gameRepo, igdb, clock })`. Nada de importar instancias globales dentro de un servicio.
- Las fechas de «hoy» salen de `clock` (`shared/`), nunca de `new Date()` en `model/` ni en `service/`.

Contextos: carpetas dentro de cada capa, con un sustantivo del dominio en inglés y en singular (`game`, `copy`, `store`, `status`, `journal`, `subscription`, `notification`, `import`, `account`). Un contexto aparece solo en las capas donde tiene archivos. `adapter/` se organiza por proveedor, no por contexto. `shared/`, `config/` y `security/` son transversales.

El árbol no es una lista cerrada: se puede proponer una carpeta nueva, pero se espera el aval antes de crearla.

## II. Modelo rico, como funciones puras

- La lógica de negocio vive en `model/`, no en los servicios. Un `if` en un servicio que decide algo del dominio es un defecto.
- Son **funciones puras sobre datos, no clases**, porque las mismas reglas corren en el servidor y en el navegador (filtros, veredicto de «¿Lo tengo?», sin conexión), y en Next las instancias de clase no pasan del servidor al navegador.
- El servicio orquesta: resuelve ids, pide al repositorio, delega la decisión en el modelo y persiste el resultado.

## III. Cada validación en su nivel

- **Forma del pedido:** esquema Zod en la Server Action o el Route Handler, con trim y normalización.
- **Que lo pedido exista y sea del usuario:** en el servicio, a través del repositorio.
- **Invariantes del dominio:** en `model/`, lanzando errores con nombre (`ScoreOutOfRangeError`, `GameNotFoundError`). Prohibido `throw new Error("...")` para reglas del dominio.
- Un único manejador en `shared/` traduce los errores a `{ ok: false, error: { code, message } }`, con el mensaje en el idioma del usuario (desde `03-idiomas`; antes, en español). Nunca llegan stack traces ni mensajes internos al navegador.

## IV. Tests (NO NEGOCIABLE)

Niveles:

- **Modelo:** sin base de datos ni framework. Rápidos.
- **Servicio:** con repositorios y adapters falsos pasados por parámetro.
- **Repositorio:** contra PGlite en memoria, con las migraciones reales. Sin Docker.
- **Adapter:** con MSW simulando al proveedor; nunca contra la API real.
- **Componentes y hooks:** React Testing Library.
- **End to end:** Playwright en `tests/e2e/`, a 390 y a 1440 px.

Convenciones:

- Cada escenario de la spec tiene al menos un test con su mismo nombre.
- Siempre casos felices y casos borde. Nada de tests triviales para subir el coverage.
- Nombres en español que describen el comportamiento: `it("devuelve «Prestado por tu familia» cuando solo hay copias Familia")`.
- Tres bloques separados por una línea en blanco: **setup** (datos y estado previo), **execute** (una sola acción, la que se prueba) y **verify** (las aserciones).
- Los tests no dependen del orden ni comparten estado.
- `tests/` copia la estructura de `src/`: el test de `src/model/copy/ownership.ts` es `tests/model/copy/ownership.test.ts`.
- **No trabajamos con TDD.** Los tests se escriben junto con la implementación de cada tarea; al terminarla, existen y pasan.
- No se testean detalles de estilo (colores, tamaños) salvo las zonas táctiles de 44 px.

**REGLA INNEGOCIABLE:** no se modifica ni se borra un test existente sin un «sí» explícito del usuario. Un test que falla se arregla arreglando el código, no el test. Mover un test de carpeta y ajustar solo sus imports no cuenta como modificarlo.

## V. Calidad

SonarQube Cloud con menos de 10 issues. El código se escribe así desde el principio:

- TypeScript `strict`. Prohibido `any` y `@ts-ignore`.
- Sin código duplicado, sin imports, variables ni parámetros sin usar.
- Complejidad baja: nada de cuatro niveles de `if` anidados. Funciones cortas, con una sola responsabilidad.
- Sin `catch` vacíos ni `catch` que se traguen el error.
- Sin `console.log`: se usa el logger de `shared/`.
- Sin números mágicos: constantes con nombre (`DIAS_AVISO_COBRO_POR_DEFECTO`).
- Sin secretos en el código: van en variables de entorno, validadas en `config/`. `.env.local` no se versiona.
- Los comentarios explican el porqué, no el qué.

## VI. Persistencia explícita

- Migraciones generadas con drizzle-kit y versionadas en `drizzle/`. Nunca se edita una migración ya aplicada.
- Nombres de tablas y columnas explícitos, en snake_case. Nada de palabras reservadas de Postgres (`user`, `order`, `group`): se usa `app_user`, `status_group`, etc.
- Ids uuid. Toda tabla tiene `created_at` y `updated_at`; las de datos de un usuario, `user_id`.
- SQL crudo (`sql` de Drizzle) solo si de verdad hace falta, avisando y con aprobación antes de escribirlo.
- La conexión a la base tiene tiempos máximos de conexión, de consulta y de inactividad. Ninguna consulta puede esperar para siempre: si la base no responde, falla rápido con un error con nombre y la pantalla ofrece reintentar.

## VII. Idioma

- Código (archivos, tipos, funciones, variables, rutas de la API): en inglés y sin acentos ni eñe.
- Specs, docs y comentarios: en español.
- Textos de la interfaz y mensajes de error: en español rioplatense con voseo («Agregá», «¿Lo tengo?») y en inglés. Desde `03-idiomas` salen de los catálogos de mensajes, nunca escritos sueltos en un componente, un hook o un servicio, y cada texto nuevo entra en los dos catálogos a la vez.
- Lo que escribe el usuario y los datos de IGDB no se traducen.
- Términos técnicos: en inglés.

## Frontend

- Los componentes de `components/` no conocen la API ni el router: reciben datos y callbacks por props.
- La lógica con estado y las llamadas a Server Actions viven en `hooks/`. Los componentes nunca llaman a `fetch` directo.
- Estilos con CSS Modules. Colores, tipografías, espaciados y radios salen de `styles/tokens.css`, nunca de valores sueltos.
- Los valores exactos (colores, tamaños, textos) se toman de `design/*.dc.html`. Esos archivos son referencia: no se importan desde `src/`.
- Radix sin estilos solo para la ventana emergente, la barra deslizable y los interruptores. Otra primitiva se consulta antes.
- Accesible: todo lo que se acciona es un `button` o un link, con foco visible y zona táctil de al menos 44 px.
- Usable desde 360 px de ancho, sin desplazamiento horizontal.

## Definición de terminado

Una tarea o un cambio están terminados cuando:

1. `npm test` pasa, con casos felices y de borde, y cada escenario de la spec tiene su test.
2. `npm run lint`, `npm run typecheck` y `npm run build` terminan sin errores.
3. `npm run test:e2e` pasa para las pantallas tocadas, a 390 y a 1440 px.
4. Cada pantalla tocada se comparó con su `.dc.html` de `design/`.
5. No aparecen issues nuevos en SonarQube.
6. Las tareas de `tasks.md` están marcadas.
7. Desde `03-idiomas`: los textos nuevos están en los dos catálogos, y los e2e de las pantallas tocadas pasan también en inglés.

## Cómo trabaja el agente

- Antes de cada tarea, releer la spec del cambio y `docs/decisiones.md`.
- Si algo es ambiguo o contradice la spec, las decisiones o este archivo, **preguntar antes de escribir código**.
- Explicar en dos líneas cada decisión de diseño no obvia.
- No agregar dependencias sin avisar y justificar.
- No hacer refactors grandes que no se pidieron.
- No inventar APIs, opciones ni métodos: ante la duda, revisar la documentación oficial (Next, Drizzle, Supabase, IGDB, Steam).
- Prohibido entregar código con `// TODO: implementar`.
- No crear carpetas vacías ni `.gitkeep`.
- Un archivo nuevo va en `<capa>/<contexto>/` o en `adapter/<proveedor>/`. Si no está claro dónde va, preguntar.
