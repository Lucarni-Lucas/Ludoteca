# Ludoteca: decisiones

Lo que se decidió en la etapa técnica (5 y 6 de noviembre de 2026), sobre lo que plantea [`ludoteca-idea.md`](ludoteca-idea.md).

- Si algo de este documento contradice la idea, **manda este documento**.
- El comportamiento de la app está escrito como cambios de OpenSpec en [`openspec/changes/`](../openspec/changes/). Cuando un cambio se archiva, sus specs pasan a [`openspec/specs/`](../openspec/specs/) y desde ahí son la fuente de verdad.
- Las convenciones de código están en [`CLAUDE.md`](../CLAUDE.md).

---

## 1. Metodología

**OpenSpec** (spec-driven development) con Claude Code.

- Descartados: Spec Kit (genera demasiado markdown por cada función) y SpecDD (proyecto muy nuevo, con muy pocos ejemplos).
- Flujo por cambio: `/opsx:explore` (charlar decisiones) → `/opsx:propose` (propuesta, specs, diseño y tareas) → `/opsx:apply` (implementar) → `/opsx:archive` (pasar las specs a `openspec/specs/`).
- **Todo el producto ya está escrito como 8 cambios**, cada uno con su `proposal.md` y sus specs. Al arrancar una etapa se corre `/opsx:propose <nombre-del-cambio>`: detecta que el cambio existe y genera lo que falta (`design.md` y `tasks.md`) mirando el código que haya en ese momento.
- `openspec/specs/` arranca vacío: describe lo que la app ya hace, no lo que falta.
- Los artefactos van en español. Los títulos estructurales de OpenSpec y las palabras clave (SHALL, MUST, WHEN, THEN) quedan en inglés, porque el validador las necesita.
- Cada escenario de una spec tiene al menos un test.
- Antes de implementar un cambio, si hay algo para charlar, primero `/opsx:explore`.

### Etapas, en orden

| # | Cambio | Qué deja andando |
|---|---|---|
| 1 | `01-base` | Login, navegación de PC y celu, tokens de diseño, deploy. |
| 2 | `02-nucleo-biblioteca` | Juegos (de IGDB o a mano), copias, estados, biblioteca con filtros y orden, puntaje, «Sin interés». |
| 3 | `03-importacion` | Importar IGN, Playnite y la cuenta de Steam, con pantalla de revisión. |
| 4 | `04-tiendas-y-steam` | Pantalla de Tiendas, sincronización diaria con Steam y familia de Steam. |
| 5 | `05-lo-tengo` | «¿Lo tengo?», aviso de duplicados y «dónde comprarlo». |
| 6 | `06-diario-y-estados-propios` | Diario y sesiones, horas jugadas, formulario de pausa y abandono, estados y motivos editables, reseña y etiquetas. |
| 7 | `07-pwa` | App instalable y lectura sin conexión. |
| 8 | `08-suscripciones-y-avisos` | Suscripciones, totales por moneda, avisos por notificación y mail. |

Este orden cambia el de la charla en tres puntos:

- La importación va antes que «¿Lo tengo?», porque sin tus juegos cargados «¿Lo tengo?» no sirve.
- La primera conexión con Steam entra por la importación, con su revisión. Así no se cargan cientos de juegos sin revisar, y la revisión puede usar las horas de Steam para detectar los juegos que nunca abriste. La sincronización diaria viene después, en `04-tiendas-y-steam`.
- Las notificaciones necesitan la app instalable, así que la PWA va antes que los avisos.

---

## 2. Stack e infraestructura

Todo con planes gratis.

| Pieza | Elección |
|---|---|
| App | Next.js (App Router) + TypeScript estricto, en Vercel (plan Hobby). |
| Base de datos | Postgres de Supabase (plan gratis). |
| Acceso a la base | Drizzle ORM: tablas con tipos y migraciones SQL generadas. |
| Login | Supabase Auth. |
| Archivos (portadas subidas) | Supabase Storage. |
| Validación en el borde | Zod. |
| Estilos | CSS Modules + `tokens.css`. Radix sin estilos para la ventana emergente, la barra del puntaje y los interruptores (solo aporta teclado y foco). Sin Tailwind ni librerías de componentes con diseño propio. |
| Tests | Vitest + React Testing Library + MSW. PGlite (Postgres en memoria, sin Docker) para los tests de repositorios. Playwright para los e2e, a 390 y 1440 px. |
| Calidad | ESLint estricto + `eslint-plugin-sonarjs`. SonarQube Cloud con el repo público: menos de 10 issues. |
| CI | GitHub Actions: lint, typecheck, tests y build. Deploys de preview en Vercel. |
| Tareas programadas | Cron de Vercel, una vez por día (precisión de ±59 min). Como usa la base todos los días, también evita que Supabase pause el proyecto por inactividad. |
| Notificaciones | Web Push (VAPID). En iPhone solo funcionan con la app instalada. |
| Mails | Resend (plan gratis). |
| Catálogo | IGDB, siempre desde el servidor: no acepta llamadas desde el navegador. Token de Twitch guardado y límite de 4 consultas por segundo. |
| Steam | Steam Web API oficial (`GetOwnedGames`: juegos y horas). |

```
PWA (celu / PC) ── tiene la biblioteca entera: filtros instantáneos, «¿Lo tengo?» sin conexión
   ▼
Vercel / Next.js
   ├─ páginas + Server Actions
   ├─ /api/igdb    → IGDB
   ├─ /api/steam   → Steam Web API
   ├─ /api/import  → archivos de IGN y Playnite
   └─ cron diario  → avisos de cobros y vencimientos, gratis de Epic
   ▼
Supabase: Postgres · Auth · Storage        Web Push · Resend
```

**La biblioteca entera vive en el cliente.** Son cientos o pocos miles de juegos, así que filtros, orden y «¿Lo tengo?» se calculan en memoria, con las mismas funciones del modelo que usa el servidor.

---

## 3. Arquitectura

El detalle está en [`CLAUDE.md`](../CLAUDE.md). En resumen:

- **Capas estrictas, dependencias en un solo sentido:** `app/` (rutas y Server Actions) → `service/` → `persistence/repository/` → base de datos. A las APIs externas se llega solo por `adapter/<proveedor>/`.
- **Modelo rico, pero como funciones puras sobre datos.** No son clases porque las reglas tienen que correr en el servidor y también en el navegador sin conexión, y en Next las instancias de clase no pasan del servidor al navegador.
- **Cada validación en su nivel:** la forma del pedido con Zod en la Server Action, la existencia en el servicio y las invariantes en el modelo, con errores con nombre.
- **Aislamiento por usuario en cada repositorio.** Como Drizzle se conecta directo a la base, las reglas RLS de Supabase no protegen. Cada repositorio filtra por usuario y tiene su test de «el usuario A no ve nada del B».

---

## 4. Modelo de datos

**Pensado para varios usuarios desde el principio**, aunque por ahora el registro queda cerrado (ver §7). Todas las tablas con datos de un usuario llevan `user_id`; además, todas llevan `created_at` y `updated_at`, con ids uuid.

```
catalog_game        compartido: lo que viene de IGDB
  igdb_id (único), title, year, developer, cover_url, page_url,
  estimated_hours, endless (sugerido), parent_id (para ediciones)
  los cargados a mano: source = manual + owner_id (solo los ve quien los creó)

library_game        de cada usuario
  user_id, catalog_game_id (único por usuario), status_id, status_since,
  score (0.0–10.0, opcional), review, not_interested, played_minutes_manual,
  correcciones propias: estimated_hours, endless, cover_url

copy                cómo lo tenés (de 0 a n por juego)
  library_game_id, store_id, kind: purchased | free | subscription | family | physical,
  store_game_id (ej. el appid de Steam), origin: sync | import | manual,
  acquired_on, playtime_minutes (lo que dice la tienda), family_owner,
  subscription_id, intentional_duplicate,
  lost_at, lost_reason: left_family | subscription_ended | sold | other

store               las conocidas son de todos (user_id vacío); las «otra» son de cada usuario
  name, slug, sync: api | import | manual

status              estados de cada usuario
  group: in_progress | not_started | finished | dropped   ← fijo, vive en el código
  name, color, position, hidden, asks_reason, system_key

reason              motivos para pausar o dejar: name, position, archived

journal_entry       el diario
  library_game_id, kind: session | status_change, occurred_on, note,
  duration_minutes (sesión),
  from_status_id, to_status_id, hours, progress_pct, reached (cambio de estado)
journal_entry_reason  muchos a muchos con reason

tag, game_tag       etiquetas libres
price_seen          dónde comprarlo: library_game_id, store_id, url, price, currency, seen_on
subscription        name, price, currency, period_months, renews,
                    next_charge_on, expires_on, started_on, ended_on

user_settings       días de aviso, canal y avisos prendidos
push_subscription   una por dispositivo
notification_log    avisos ya mandados (para que el cron no los repita)
store_connection    cuenta de Steam (SteamID) y última sincronización
import_batch, import_item   importación: fila original, cruce con IGDB, sugerencia y decisión
```

**Reglas del modelo:**

1. **El catálogo es compartido y la biblioteca es de cada uno.**
   - Si corregís la duración, la portada o si el juego es sin fin, la corrección se guarda en tu `library_game`. Se muestra lo tuyo si existe y, si no, lo del catálogo.
   - Vincular un juego cargado a mano con IGDB es apuntar tu `library_game` a otra fila del catálogo. No se pierde ni el puntaje ni el diario.
2. **Un juego por usuario.** Si un juego llega por dos tiendas (ej. Civilization VI desde Epic y desde Steam), queda un juego con dos copias. Las ediciones («Platinum Edition», «GOTY») se guardan como el juego base que indica IGDB.
3. **«Ya no lo tengo» es una marca de la copia, no un tipo.** La copia conserva su tipo original y suma la fecha y el motivo.
   - El puntaje, el estado, las horas, el diario y la reseña son del juego: perder una copia no toca nada de eso.
   - Aunque se pierdan todas las copias, el juego queda en la biblioteca con todo.
4. **«Sin fin» es algo del juego**, no solo un estado. Un juego sin fin no tiene duración estimada, pero sí horas jugadas.
5. **Horas jugadas:** si cargaste un total a mano, vale ese. Si no, se suma lo que dicen las tiendas. Si ninguna tienda lo sabe, se suman las sesiones del diario. Así no se cuentan dos veces.
6. **Estados con `system_key`:** aunque renombres un estado por defecto, la app sabe cuál es (ej. que «Quiero jugarlo» es la wishlist). Que un estado pida motivo depende de su propia marca `asks_reason`.
7. **La importación se guarda en tablas aparte** hasta que la confirmás, así la revisión se puede hacer en varias tandas.

**No se guardan, se calculan:** el veredicto de «¿Lo tengo?», el aviso de duplicado, los totales por moneda, el «vence pronto» y las horas del mes de cada suscripción.

---

## 5. Cambios respecto de la idea y del diseño

| Tema | Decisión |
|---|---|
| Juegos sin fin que ya no jugás | Estado por defecto nuevo **«Jugado»**, en el grupo Terminado. |
| Juegos que tenés pero nunca vas a jugar | Marca **«Sin interés»** (no es un estado). No aparecen en la biblioteca, no suman a pendientes ni a estadísticas, se pueden ver con un filtro y siguen contando para «¿Lo tengo?». Se puede marcar de a muchos juegos a la vez. |
| «Ya no lo tengo» | Marca de la copia, con motivo (salí de la familia, terminó la suscripción, lo vendí u otro). En los filtros sigue apareciendo como «Ya no lo tengo». |
| Comprar algo de «Quiero jugarlo» | Al agregarle una copia propia, el juego pasa solo a «Pendiente» y te avisa. |
| Puntaje | Puede quedar vacío; vacío no es 0.0. Etiquetas: 0.0–1.9 Horrible, 2.0–2.9 Muy malo, 3.0–3.9 Malo, 4.0–4.9 Flojo, 5.0–5.9 Regular, 6.0–6.9 Pasable, 7.0–7.9 Bueno, 8.0–8.9 Muy bueno, 9.0–9.9 Excelente, 10.0 Obra maestra. |
| Filtros en PC | Todos permiten elegir varias opciones, y se suma el rango de puntaje (como en el celu). |
| Estadísticas | Oculta en el menú hasta que exista. |
| Celu | Se agrega un acceso a Ajustes. |
| Revisión de importación | Pantalla nueva. No está en el lienzo y se define en la spec de `03-importacion`. |
| GOG y Microsoft Store | No se sincronizan solas en la v1 (el diseño las mostraba como sincronizadas). GOG entra por la importación de Playnite; Microsoft Store se carga a mano. |
| Fecha en que conseguiste un juego | Opcional: ni Steam ni Playnite la informan. |
| Monedas | Código ISO libre; ARS y USD como sugerencias. Los totales se agrupan por código. |
| Sin conexión | Solo lectura: biblioteca, fichas y «¿Lo tengo?». |

---

## 6. Carga inicial

| Fuente | Qué aporta | Cómo |
|---|---|---|
| **IGN** (303 juegos) | Estado y puntaje de lo que jugaste. | Ya exportado a JSON. Está en el proyecto Ludoteca de claude.ai (`datos/ign-export.json`), **no en el repo** porque el repo es público. |
| **Steam** | Copias de Steam y horas jugadas. | API oficial, se sincroniza sola. |
| **Playnite** (211 juegos de Epic, y GOG si hay) | Copias de las demás tiendas. | Lo instalás en Windows, iniciás sesión en las tiendas, exportás a JSON y lo subís. |
| **A mano** | Microsoft Store, itch.io, Switch, físicos. | Formulario de agregar. |

**Qué trae el export de IGN:** 303 juegos (162 Beat, 76 Backlog, 37 Quit, 18 Paused, 10 Playing), 220 con puntaje entero, 259 con ID de Steam y 274 con duraciones de HowLongToBeat. Ninguno trae plataforma ni reseña.

**Cómo pasan los estados de IGN:**

| IGN | Ludoteca |
|---|---|
| Playing | Jugando |
| Paused | En pausa |
| Beat | Completado (o «Jugado» si confirmás que es sin fin) |
| Quit | Abandonado |
| Backlog | Pendiente si lo tenés en alguna tienda; si no, Quiero jugarlo |
| Wishlist | Quiero jugarlo |
| Beat y Quit a la vez (Overwatch) | Lo decidís en la revisión |

- Los puntajes enteros pasan tal cual: 8 queda como 8.0.
- **Cruce con IGDB:** primero por el ID de tienda (IGDB guarda el ID de cada juego en Steam, Epic, GOG, etc.). Si no hay ID, por título, y los dudosos quedan para revisar.
- **La importación es una revisión, no un volcado.** Separa en grupos:
  - «¿Es sin fin?»: juegos completados que IGDB marca como solo multijugador; sugiere «Jugado».
  - «¿Lo vas a jugar alguna vez?»: pendientes sin puntaje o con 0 h en Steam; podés dejarlos en Pendiente, pasarlos a Quiero jugarlo o marcarlos «Sin interés».
  - «No lo encontré»: sin cruce con IGDB.
- **Reimportar no duplica:** cada copia se reconoce por tienda + ID en la tienda.

---

## 7. Supuestos (revisables)

Decisiones chicas que tomé para poder escribir las specs. Si alguna no te cierra, se cambia en la spec antes de implementar esa etapa.

- **Login:** con Google mediante Supabase Auth. El registro queda cerrado a una lista de mails permitidos, porque el modelo es multiusuario pero varios usuarios sigue fuera de alcance.
- **Duración estimada:** se toma el tiempo «normal» de IGDB. Si IGDB no lo tiene, la duración principal de HowLongToBeat que vino de IGN.
- **Avisos por defecto:** 3 días antes de cada cobro, 7 días antes de cada vencimiento, por notificación.
- **«Vence pronto»:** se marca cuando faltan tantos días como los del aviso de vencimiento o menos.
- **«Dónde comprarlo»:** el aviso de «puede haber cambiado» aparece cuando el precio tiene más de 30 días.
- **Aviso de bajadas de precio:** se muestra deshabilitado, como «Próximamente», porque el seguimiento automático de precios está fuera de alcance.
- **Búsquedas recientes de «¿Lo tengo?»:** se guardan en el dispositivo, no en la base.
- **«Fue a propósito»** en el aviso de duplicado marca como intencional la copia más nueva.
- **Sin conexión:** se puede leer todo, pero las acciones que guardan cambios quedan deshabilitadas, con un aviso.

---

## 8. Fuera de alcance

Igual que en la idea: extensión de navegador, estadísticas y resumen del año, «¿Qué juego juego?», seguimiento automático de precios, perfil público y funciones para varios usuarios (el modelo de datos está preparado, pero no hay registro abierto ni nada para compartir).

También queda para después sincronizar solas Epic, GOG o Xbox. Cada una sería su propio cambio.

---

## 9. Se resuelve dentro de cada cambio, con `/opsx:explore`

- El endpoint de los gratis de Epic y cada cuánto consultarlo (etapa 8).
- El formato exacto del export de Playnite (etapa 3).
- El diseño visual de la pantalla de revisión de importación (etapa 3).
- Cómo detectar «solo multijugador» en IGDB (etapa 3).
