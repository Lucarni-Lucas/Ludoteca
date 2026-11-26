# Ludoteca: decisiones

Lo que se decidió en la etapa técnica (5 y 6 de noviembre de 2026), sobre lo que plantea [`ludoteca-idea.md`](ludoteca-idea.md). El 11 de noviembre se sumaron los idiomas, el tipo de copia «Otro», el formulario de agregar con varias copias y puntaje, las notas del diario y las etiquetas del puntaje opcionales, a partir de la prueba de `02-nucleo-biblioteca`.

- Si algo de este documento contradice la idea, **manda este documento**.
- El comportamiento de la app está escrito como cambios de OpenSpec en [`openspec/changes/`](../openspec/changes/). Cuando un cambio se archiva, sus specs pasan a [`openspec/specs/`](../openspec/specs/) y desde ahí son la fuente de verdad.
- Las convenciones de código están en [`CLAUDE.md`](../CLAUDE.md).

---

## 1. Metodología

**OpenSpec** (spec-driven development) con Claude Code.

- Descartados: Spec Kit (genera demasiado markdown por cada función) y SpecDD (proyecto muy nuevo, con muy pocos ejemplos).
- Flujo por cambio: `/opsx:explore` (charlar decisiones) → `/opsx:propose` (propuesta, specs, diseño y tareas) → `/opsx:apply` (implementar) → `/opsx:archive` (pasar las specs a `openspec/specs/`).
- **Todo el producto ya está escrito como 9 cambios**, cada uno con su `proposal.md` y sus specs. Al arrancar una etapa se corre `/opsx:propose <nombre-del-cambio>`: detecta que el cambio existe y genera lo que falta (`design.md` y `tasks.md`) mirando el código que haya en ese momento.
- `openspec/specs/` arranca vacío: describe lo que la app ya hace, no lo que falta.
- Los artefactos van en español. Los títulos estructurales de OpenSpec y las palabras clave (SHALL, MUST, WHEN, THEN) quedan en inglés, porque el validador las necesita.
- Cada escenario de una spec tiene al menos un test.
- Antes de implementar un cambio, si hay algo para charlar, primero `/opsx:explore`.

### Etapas, en orden

| # | Cambio | Qué deja andando |
|---|---|---|
| 1 | `01-base` | Login, navegación de PC y celu, tokens de diseño, deploy. |
| 2 | `02-nucleo-biblioteca` | Juegos (de IGDB o a mano), copias, estados, biblioteca con filtros y orden, puntaje, horas jugadas a mano, «Sin interés». |
| 3 | `03-idiomas` | Interfaz en español rioplatense y en inglés, con el idioma según el navegador o elegido en Ajustes. |
| 4 | `04-importacion` | Importar IGN, Playnite y la cuenta de Steam, con pantalla de revisión. |
| 5 | `05-tiendas-y-steam` | Pantalla de Tiendas, sincronización diaria con Steam y familia de Steam. |
| 6 | `06-lo-tengo` | «¿Lo tengo?», aviso de duplicados y «dónde comprarlo». |
| 7 | `07-diario-y-estados-propios` | Diario con sesiones y notas, horas jugadas, formulario de pausa y abandono, estados y motivos editables, reseña, etiquetas y etiquetas del puntaje. |
| 8 | `08-pwa` | App instalable y lectura sin conexión. |
| 9 | `09-suscripciones-y-avisos` | Suscripciones, totales por moneda, avisos por notificación y mail. |
| 10 | `10-rediseno` | Rediseño de la interfaz y la navegación con todas las pantallas ya construidas, a partir de `docs/ux-pendientes.md` y de un diseño nuevo. Nombre visible, ícono y dirección nuevos; el proyecto y el repo siguen llamándose Ludoteca. El cambio se escribe cuando esté el diseño. |

Este orden cambia el de la charla en cuatro puntos:

- La importación va antes que «¿Lo tengo?», porque sin tus juegos cargados «¿Lo tengo?» no sirve.
- La primera conexión con Steam entra por la importación, con su revisión. Así no se cargan cientos de juegos sin revisar, y la revisión puede usar las horas de Steam para detectar los juegos que nunca abriste. La sincronización diaria viene después, en `05-tiendas-y-steam`.
- Las notificaciones necesitan la app instalable, así que la PWA va antes que los avisos.
- Los idiomas van apenas termina el núcleo: con dos etapas hechas, pasar los textos a catálogos es barato, y desde ahí cada pantalla nueva nace en los dos idiomas.

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
| Conexión a la base | Transaction pooler de Supabase con `pg` (node-postgres) y `attachDatabasePool` de Vercel, que cierra las conexiones ociosas antes de que la función se suspenda. Pool chico y global, inactividad de 5 s y tiempos máximos de conexión y de consulta: ninguna consulta espera para siempre. |
| Validación en el borde | Zod. |
| Idiomas | next-intl, sin prefijo de idioma en las URL: el idioma sale de la cuenta o, si no hay, del navegador. Un catálogo de mensajes por idioma (español rioplatense e inglés). |
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
  hltb_hours: duración principal de HowLongToBeat que trajo IGN (no es una corrección)

copy                cómo lo tenés (de 0 a n por juego)
  library_game_id, store_id, kind: purchased | free | subscription | family | physical | other,
  kind_detail (texto corto, solo para other: ej. «Regalo»),
  store_game_id (ej. el appid de Steam), origin: sync | import | manual,
  única (user_id, store_id, store_game_id): las copias a mano, sin ID, no chocan,
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
  library_game_id, kind: session | note | status_change, occurred_on, note,
  duration_minutes (sesión),
  from_status_id, to_status_id, hours, progress_pct, reached (cambio de estado)
journal_entry_reason  muchos a muchos con reason

tag, game_tag       etiquetas libres
price_seen          dónde comprarlo: library_game_id, store_id, url, price, currency, seen_on
subscription        name, price, currency, period_months, renews,
                    next_charge_on, expires_on, started_on, ended_on

user_settings       idioma, etiquetas del puntaje prendidas, días de aviso, canal y avisos prendidos
score_label         nombre propio de la etiqueta de un rango del puntaje: user_id, range_start, name
push_subscription   una por dispositivo
notification_log    avisos ya mandados (para que el cron no los repita)
store_connection    una cuenta por tienda y usuario: store_id, account_id (SteamID64), last_synced_at
import_item         una fila por cada fila de cada fuente: source (ign | playnite | steam), source_key,
                    lo leído (título, año, tienda, ID en la tienda, horas, estados y puntaje de IGN,
                    HowLongToBeat), el cruce (match_state, candidates) y la decisión sobre su copia
                    (copy_kind, excluded); única (user_id, source, source_key)
import_entry        un juego a revisar por cada juego de IGDB (o por fila que no cruzó): igdb_id,
                    catalog_game_id, multiplayer_only y las respuestas (status_key, endless_answer,
                    play_answer, excluded, manual_title); única (user_id, igdb_id)
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
7. **La importación se guarda en tablas aparte** hasta que la confirmás, así la revisión se puede hacer en varias tandas. No hay `import_batch`: la revisión abierta son las filas sin `confirmed_at`, y las confirmadas quedan como historia para reconocerlas al reimportar (`04` design.md §4).

**No se guardan, se calculan:** el veredicto de «¿Lo tengo?», el aviso de duplicado, los totales por moneda, el «vence pronto» y las horas del mes de cada suscripción.

---

## 5. Cambios respecto de la idea y del diseño

| Tema | Decisión |
|---|---|
| Juegos sin fin que ya no jugás | Estado por defecto nuevo **«Jugado»**, en el grupo Terminado. |
| Juegos que tenés pero nunca vas a jugar | Marca **«Sin interés»** (no es un estado). No aparecen en la biblioteca, no suman a pendientes ni a estadísticas, se pueden ver con un filtro y siguen contando para «¿Lo tengo?». Se puede marcar de a muchos juegos a la vez. |
| «Ya no lo tengo» | Marca de la copia, con motivo (salí de la familia, terminó la suscripción, lo vendí u otro). En los filtros sigue apareciendo como «Ya no lo tengo». |
| Comprar algo de «Quiero jugarlo» | Al agregarle una copia propia, el juego pasa solo a «Pendiente» y te avisa. |
| Puntaje | Puede quedar vacío; vacío no es 0.0. Se muestra solo el número. Las etiquetas por rango (0.0–1.9 Horrible, 2.0–2.9 Muy malo, 3.0–3.9 Malo, 4.0–4.9 Flojo, 5.0–5.9 Regular, 6.0–6.9 Pasable, 7.0–7.9 Bueno, 8.0–8.9 Muy bueno, 9.0–9.9 Excelente, 10.0 Obra maestra) se prenden en Ajustes, apagadas por defecto, con rangos fijos y nombres editables (`07`). |
| Tipo de copia «Otro» | Para lo que no entra en los demás tipos, con un detalle opcional (ej. «Regalo»). Cuenta como propio, igual que Comprado, Gratis y Físico. |
| Formulario de agregar | Varias copias, una fila por copia con «Agregar otra copia»; puntaje y horas jugadas opcionales; «Año de lanzamiento» opcional, entre 1950 y el año que viene; los campos opcionales lo dicen. Nota opcional desde `07`. |
| Ayuda «?» | Junto a los términos propios: Sin interés, Año de lanzamiento, Duración, Familia, Otro, A mano, Ya no lo tengo y Sin fin. |
| Notas del diario | Entradas con fecha y texto, sin duración. El diario va de la entrada más nueva a la más vieja (`07`). |
| Idiomas | Español rioplatense e inglés (`03`). Por defecto, español si el navegador está en español y si no inglés; se cambia en Ajustes. |
| Filtros en PC | Todos permiten elegir varias opciones, y se suma el rango de puntaje (como en el celu). |
| Estadísticas | Oculta en el menú hasta que exista. |
| Celu | Se agrega un acceso a Ajustes. |
| Revisión de importación | Pantalla nueva, diseñada en `04-importacion`: `design/Escritorio-Importar.dc.html` y `design/Movil-Importar.dc.html`. Se llega desde Ajustes y desde la biblioteca vacía. |
| GOG y Microsoft Store | No se sincronizan solas en la v1 (el diseño las mostraba como sincronizadas). GOG entra por la importación de Playnite; Microsoft Store se carga a mano. |
| Fecha en que conseguiste un juego | Opcional: ni Steam ni Playnite la informan. |
| Monedas | Código ISO libre; ARS y USD como sugerencias. Los totales se agrupan por código. |
| Sin conexión | Solo lectura: biblioteca, fichas y «¿Lo tengo?». |

---

## 6. Carga inicial

| Fuente | Qué aporta | Cómo |
|---|---|---|
| **IGN** (303 juegos) | Estado y puntaje de lo que jugaste. | Ya exportado a JSON. Está en el proyecto Ludoteca de claude.ai (`datos/ign-export.json`), **no en el repo** porque el repo es público. Para volver a sacarlo, la guía «¿Cómo lo saco?» de `/import` ofrece un marcador del navegador (ver abajo). |
| **Steam** | Copias de Steam y horas jugadas. | API oficial, se sincroniza sola. |
| **Playnite** (211 juegos de Epic, y GOG si hay) | Copias de las demás tiendas. | Lo instalás en Windows, iniciás sesión en las tiendas, exportás a JSON y lo subís. Los pasos del exportador están en la guía «¿Cómo lo saco?» de `/import`. |
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
- **Cruce con IGDB:** primero por el ID de tienda: Steam y GOG. El ID de Epic que trae Playnite no es el que guarda IGDB, así que Epic cruza por título (verificado, `04` design.md §7). Por título, primero el nombre exacto de a 10 por pedido y después la búsqueda de a uno. Un solo resultado con el mismo nombre cruza aunque el año no coincida: el año de Epic suele ser el de la tienda (20XX llega con 2020 y en IGDB es de 2017). Varios con el mismo nombre, o uno solo con otro nombre, quedan para elegir.
- **Sin la edición:** si por título no aparece nada igual ni parecido y el título nombra una edición («Deluxe Edition», «Game of the Year Edition», «Complete»…), se busca de nuevo sin ella. Lo que aparezca así nunca cruza solo: «Styx: Shards of Darkness - Deluxe Edition» pregunta «¿Es este juego?» con «Styx: Shards of Darkness».
- **Mismo nombre desde varias fuentes:** lo que no cruzó solo y llega con el mismo nombre de IGN y de una tienda (Fortnite, Snakebird Complete) es una sola pregunta, que muestra cada origen, y una sola respuesta vale para todos. Si ese nombre ya tenía una respuesta cuando llega el otro archivo, el nuevo tiene su propia pregunta.
- **Lo que no es un juego** (demo, beta, Open Beta, Closed Beta, playtest, soundtrack, servidor…, por el final del título) se cuelga de su juego base si llega de la misma tienda o ya está en la biblioteca con esa tienda, y le suma sus horas. Si no, queda en «Listos para importar» como «No se importa · no es un juego», se puede traer con «Volver a revisar» y cuenta en el «sin importar» del resumen. Un título entre corchetes es un juego más: [REDACTED] es de 2024.
- **La importación es una revisión, no un volcado.** Cada juego está en un solo grupo, el primero que le toca. Cada grupo es una pregunta corta y **sus opciones son respuestas en palabras, sin ninguna marcada**: tocar una contesta solo esa pregunta, y el juego sigue al próximo grupo que le toque o, si no le queda ninguno, a «Listos para importar». No hay «Pasar a Listos». **Decir qué juego es** (elegir un candidato, «¿Es este juego?», buscarlo con otro nombre o cargarlo a mano) también es solo una respuesta: LOVE, con 0 h y sin puntaje, sigue a «¿Lo vas a jugar alguna vez?», y uno solo multijugador que llegó como terminado, a «¿Es sin fin?».
  - **Preguntas de a un juego** (1 a 3): la respuesta depende de cada juego, así que en lote solo vale «No importar». Cada juego dice cómo llegó («En Epic: Castlevania Anniversary Collection · 2019») y los candidatos se ven con portada, nombre completo y año.
  - **Grupos de lote** (4 a 7): se seleccionan varios y se toca la misma respuesta en la barra de selección.

  | # | Grupo | Le toca si… | Respuestas |
  |---|---|---|---|
  | 1 | ¿Cuál de estos es? | Varios candidatos de IGDB, o uno solo con otro nombre | Un candidato por tarjeta, «Ninguno, lo busco yo» y No importar. Con un solo candidato de otro nombre: «¿Es este juego?» con Sí · No, lo busco yo · No importar |
  | 2 | ¿Cómo lo dejaste? | Dos estados de IGN (Overwatch) | Un botón por estado en palabras («Lo terminaste», «Lo abandonaste») · Otro estado · No importar |
  | 3 | No lo encontré | Sin cruce con IGDB | Buscar con otro nombre · Cargar a mano · No importar; a lo que no parece un juego se le suma una línea que lo dice |
  | 4 | ¿Es de tu familia? | Steam de tu PC que tu cuenta no tiene | Sí, es de mi familia (Familia) · No, es mío (Comprado) · No importar |
  | 5 | ¿Es sin fin? | Completado y solo multijugador en IGDB | Sí, no se termina (Jugado · sin fin) · No, lo terminé (Completado) · No importar |
  | 6 | ¿Lo vas a jugar alguna vez? | Pendiente de IGN sin puntaje, o con 0 h en todas sus copias | Sí, algún día (Pendiente) · No (Sin interés: no se ve en la biblioteca, pero cuenta para «¿Lo tengo?») · No importar |
  | 7 | Elegí un estado | No vino de IGN y tiene horas jugadas | Lo estoy jugando · Lo terminé · Lo abandoné · Lo probé · Otro estado (la lista con todos) · No importar |
  | 8 | Listos para importar | Nada dudoso, o ya decidido | Cómo va a entrar («Entra como Pendiente · Epic Games · Gratis», o «No se importa · no es un juego») y «Volver a revisar» |

- **«No importar» deja afuera el juego entero** en todos los grupos, también en «¿Es de tu familia?». El juego no desaparece: queda en «Listos para importar» como «No se importa», y «Volver a revisar» lo trae a su primera pregunta sin respuesta, por si se tocó sin querer. Al confirmar cuenta en «sin importar». El tipo de una copia se cambia, de a uno o en lote, con «¿Cómo lo conseguiste?». El aviso de cada respuesta dice cómo va a entrar («Beholder pasó a «Listos para importar» con «Sin interés».»). «Confirmar importación» suma todo lo que está en «Listos para importar» y lo demás sigue esperando.
- **El aviso dice adónde fue el juego:** «LOVE pasó a «¿Lo vas a jugar alguna vez?».», o cómo va a entrar si fue a «Listos para importar». En lote, si fueron a grupos distintos, cuántos fueron a cada uno.
- **«Volver a revisar»** aparece en cualquier grupo en un juego que tiene alguna respuesta (nunca en «¿Cuál de estos es?» ni en «No lo encontré») y lo devuelve a su primera pregunta sin ninguna, también un candidato elegido o un juego cargado a mano. El aviso dice adónde volvió. Los avisos de cada acción son flotantes, abajo de la pantalla.
- **«Empezar de nuevo»** borra, previa confirmación, los archivos subidos, lo traído de Steam y lo decidido sin confirmar. No toca la biblioteca, lo ya importado ni la cuenta de Steam conectada.
- **La revisión vence a los 7 días sin tocarla** (subir un archivo, traer de Steam, decidir, buscar con otro nombre o confirmar). Se chequea al abrir `/import`: si venció, se descarta como «Empezar de nuevo» y la pantalla lo avisa. No hay cron.
- **Al confirmar**, de cada juego confirmado queda solo lo que necesita reimportar sin duplicar: la fuente, su ID en la fuente y en qué quedó. El resto de lo que usó la revisión se borra.
- **Guías «¿Cómo lo saco?»:** cada fuente de archivo tiene la suya. La de Playnite explica el exportador (link a la página de su autor, Ludoteca no lo hospeda). La de IGN ofrece un **marcador del navegador** que, en www.ign.com con la sesión abierta, pide la biblioteca y los puntajes a la API de IGN (`mollusk.apis.ign.com/graphql`) y descarga `ign-export.json` con el mismo formato de siempre. Corre solo en el navegador y no manda nada a Ludoteca ni a terceros; la guía avisa que puede dejar de andar si IGN cambia su página.
- **Un juego que ya está en tu biblioteca** solo suma las copias que le falten: ni el estado ni el puntaje cambian.
- **Reimportar no duplica:** cada copia se reconoce por tienda + ID en la tienda, y un juego nunca recibe dos copias de la misma tienda desde la importación.

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
- **Detalle de una copia «Otro»:** hasta 40 caracteres.
- **Nombre propio de una etiqueta del puntaje:** hasta 20 caracteres; vacío vuelve al nombre por defecto.
- **Base que no responde:** la pantalla avisa y ofrece «Reintentar» en menos de 15 segundos.

---

## 8. Fuera de alcance

Igual que en la idea: extensión de navegador, estadísticas y resumen del año, «¿Qué juego juego?», seguimiento automático de precios, perfil público y funciones para varios usuarios (el modelo de datos está preparado, pero no hay registro abierto ni nada para compartir).

También queda para después sincronizar solas Epic, GOG o Xbox. Cada una sería su propio cambio.

---

## 9. Se resuelve dentro de cada cambio, con `/opsx:explore`

- El endpoint de los gratis de Epic y cada cuánto consultarlo (etapa 9).
- ~~El formato exacto del export de Playnite (etapa 4).~~ Resuelto en `04-importacion` (design.md §5): PlayniteLibraryExporter con `schemaVersion = 1`; cada juego trae `sourceName`, `providerGameId`, `playtimeSeconds` y `releaseDate`, y los de Steam son solo los instalados, con 0 h.
- ~~El diseño visual de la pantalla de revisión de importación (etapa 4).~~ Resuelto en `04-importacion` (design.md §15): `design/Escritorio-Importar.dc.html` y `design/Movil-Importar.dc.html`.
- ~~Cómo detectar «solo multijugador» en IGDB (etapa 4).~~ Resuelto en `04-importacion` (design.md §7): IGDB lista modos de juego y ninguno es `single-player`; un juego sin modos cargados no cuenta.
- ~~Cómo mostrar en el idioma elegido los nombres por defecto que hoy se guardan en la base, sin pisar los que renombre el usuario (etapa 3).~~ Resuelto en `03-idiomas` (design.md §8): un estado con `system_key` que conserva su nombre de fábrica se muestra con el nombre por defecto del idioma elegido; cualquier otro nombre, tal cual. Sin migración.
