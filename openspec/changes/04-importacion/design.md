# Design

## Context

La motivación está en `proposal.md` (Why) y los comportamientos en `specs/importacion/spec.md`. Lo que condiciona el cómo:

- **La biblioteca ya existe** (`02-nucleo-biblioteca`): `catalog_game` compartido, `library_game`, `copy`, `store` y `status` con `system_key`. Agregar un juego de IGDB ya hace upsert del catálogo y crea el juego con sus copias y su puntaje en una transacción (`game-repository.ts`, `addIgdbGame`). La importación reutiliza esas piezas; no inventa otra forma de crear juegos.
- **`copy` todavía no tiene `store_game_id` ni `origin`** (`02` §4 los dejó para esta etapa). Sin `store_game_id` no hay forma de cumplir «Reimportar sin duplicar».
- **IGDB:** 4 pedidos por segundo y hasta 8 abiertos; `multiquery` acepta hasta 10 consultas por pedido y cada consulta hasta 500 resultados (verificado en `api-docs.igdb.com`). `external_games` tiene `uid`, `game` y `external_game_source` (`category` está deprecado). La doc no dice qué contiene el `uid` de Epic.
- **Steam Web API:** `IPlayerService/GetOwnedGames/v1` (con `include_appinfo` e `include_played_free_games`) y `ISteamUser/ResolveVanityURL/v1` para los links con nombre (verificado en `partner.steamgames.com`). La doc dice que devuelve los juegos «siempre y cuando puedas ver los detalles de sus juegos».
- **Vercel Hobby y la base:** las páginas y acciones con base declaran `maxDuration = 20` y cada consulta corta a los 8 s (`02` §17). Cruzar 500 juegos con IGDB no entra en un solo pedido de 20 s si algo se demora: el trabajo tiene que ir en tandas que se puedan retomar.
- **El export real de Playnite** (PlayniteLibraryExporter 1.0, `schemaVersion: 1`), leído fuera del repo: 233 juegos, 209 de Epic y 24 de Steam. Cada juego trae `name`, `sourceName` («Epic», «Steam»), `providerGameId` (el ID en la tienda), `playtimeSeconds`, `isInstalled`, `hidden` y `releaseDate` (`«2020-4-23»`, sin ceros). Los de Steam traen además `steamAppId` y son solo los instalados en la PC, todos con `playtimeSeconds: 0` porque la biblioteca de Steam de Playnite no tiene sesión iniciada. Los IDs de Epic son el «app name» de Epic: hexadecimales de 32 caracteres o palabras («Fortnite», «Sugar» para Rocket League, «Auk» para Q.U.B.E. 2).
- **Entradas que no son juegos en ese archivo:** «Barony (Beta)», «Chivalry 2 - Public Testing», «KillingFloor2Beta», «Mortal Shell Tech Beta», «Nightingale - Legacy Mode», «Q.U.B.E. 2 Soundtrack» (todas de Epic y con su juego base en el mismo archivo), «Ubisoft Connect Services» (Steam, sin juego base) y «[REDACTED]» (Epic oculta el nombre de algunos productos).
- **El export de IGN** no está en el repo. Se diseña con la muestra de `tests/adapter/ign/ign-export-sample.json` (7 juegos inventados con el formato real): `records[]` con `ignId`, `name`, `alt`, `year`, `status`, `flags`, `score` entero, `steamId` y `hltb` (`[principal, extras, completo]` en horas). Lucas revisó el export real: `status` usa `playing`, `paused`, `backlog`, `beat` y `quit`; `flags` usa `playing`, `paused`, `backlog`, `completed` y `archived`. No hay ningún `wishlist` en sus datos.

## Goals / Non-Goals

**Goals:**

- Un solo lugar, `/import`, para subir los dos archivos, conectar Steam, revisar y confirmar, que se puede dejar a la mitad y retomar.
- El cruce con IGDB en tandas chicas, con progreso visible, que no dependa del tiempo máximo de una función.
- Todas las reglas (cruce por título, grupos, sugerencias, juntar fuentes, qué se suma al confirmar) como funciones puras de `model/import/`, probadas sin base ni red.
- Que reimportar el mismo archivo no cambie nada y que un archivo nuevo sume solo lo nuevo.

**Non-Goals:**

- Sincronización diaria de Steam, pantalla de Tiendas y «Salí de la familia» (`05`). Acá se conecta la cuenta y se trae su lista una vez, o de nuevo con un botón.
- Leer GOG, Ubisoft u otras tiendas de Playnite más allá de lo que el archivo traiga: si trae otra tienda, se importa igual (§5), pero no se prueba con datos reales porque el archivo de Lucas no las tiene.
- Detectar duplicados intencionales, «dónde comprarlo» ni avisos (`06`).
- Fecha en que se consiguió cada copia: ninguna fuente la informa (`decisiones.md` §5).
- Deshacer una importación ya confirmada. Cada juego importado se puede editar o quitar desde su ficha, como cualquier otro.

## Decisions

### 1. Pantallas y diferencias con el diseño

| Pantalla | Referencia | Diferencias |
|---|---|---|
| Importar (PC y celu) | `design/Escritorio-Importar.dc.html` y `design/Movil-Importar.dc.html`, **nuevas en este cambio** (§15) | Es la referencia de esta etapa: se arma con el estilo de Tiendas y Ajustes. El título del celu mide 32 px como en las demás pantallas (sale de `PageHeader`); el lienzo dice 34. Los grupos son botones y no links: cambian lo que se ve, no la ruta. |
| Ajustes | `design/Escritorio-Estados.dc.html` (el marco) | El menú suma «Importar», que lleva a `/import`. Las demás opciones del lienzo siguen llegando con sus etapas. |
| Biblioteca vacía | `design/Escritorio-Importar.dc.html` (el ejemplo del final; `Main.dc.html` no la muestra) | El aviso «Todavía no cargaste ningún juego.» ofrece «Agregá tu primer juego» (principal, como hoy) e «Importar tu biblioteca»: son dos acciones distintas. |
| Ficha | `design/Escritorio-Juego.dc.html`, `design/Movil-Juego.dc.html` | Una duración que vino de HowLongToBeat se ve «unas 2.3 h · HowLongToBeat», como hoy «· IGDB» y «· tuya» (§11). |

### 2. Rutas

| Ruta | Contenido |
|---|---|
| `/import` | Fuentes, progreso del cruce, revisión y confirmación. `?source=playnite`, `?source=ign` o `?source=steam` lleva el foco a esa fuente (lo usa `05` desde Tiendas). |
| `POST /api/import/file` | Recibe un archivo (`multipart/form-data`), lo reconoce y guarda sus filas. Devuelve la fuente y cuántos juegos leyó. |

- **El archivo va por Route Handler, no por Server Action.** Las acciones tienen 1 MB de cuerpo por defecto en Next y el export de IGN con 303 juegos ronda ese tamaño; el Route Handler acepta hasta 4,5 MB en Vercel. El tope propio es `MAX_IMPORT_FILE_BYTES` = 4 MB, con un error con nombre si se pasa. Así lo preveía `decisiones.md` §2 (`/api/import`).
- **El resto son Server Actions** en `app/(app)/import/actions.ts`: `connectSteamAction`, `refreshSteamAction`, `advanceMatchingAction`, `decideAction` (de a uno o en lote), `searchAgainAction`, `confirmImportAction` y `getImportOverviewAction`, que trae la revisión después de subir un archivo por el Route Handler. Cada una valida con Zod y llama al servicio.
- `/import` y la ruta del archivo declaran `maxDuration = 20`, como las demás con base.
- `isSettingsPath` incluye `/import`: es una opción de Ajustes y el avatar se marca igual.

### 3. Carpetas nuevas

Se proponen con este diseño y se crean al aprobarlo:

- `model/import/`, `service/import/`, `persistence/sql/import/`, `persistence/mapper/import/` y `persistence/repository/import/`: contexto `import`, ya previsto en `CLAUDE.md`.
- `adapter/ign/` y `adapter/playnite/` (con `dto/`): leen los archivos. Son proveedores, como prevé `CLAUDE.md`, aunque no sean APIs.
- `adapter/steam/` (con `dto/`).
- `model/store/steam-account.ts`, `persistence/sql/store/store-connection.ts` y su mapper y repositorio: la cuenta conectada es del contexto `store`, y `05` la reutiliza.
- `components/import/`, `hooks/use-import-review.ts` y `hooks/use-import-matching.ts`.
- `tests/adapter/playnite/`, `tests/adapter/steam/`, `tests/e2e/support/steam-server.mts` y `tests/e2e/import.spec.ts`. `tests/adapter/ign/ign-export-sample.json` ya existe (sin versionar) y entra al repo: sus datos son inventados.

### 4. Modelo de datos

Todas las tablas con id uuid, `created_at`, `updated_at`, `user_id` y RLS sin políticas, como las de `02`.

| Tabla | Columnas | Restricciones |
|---|---|---|
| `store_connection` | `store_id`, `account_id` (SteamID64, texto), `last_synced_at` (vacío hasta `05`) | Única `(user_id, store_id)` |
| `import_item` | `source` (`ign` · `playnite` · `steam`), `source_key`, `title`, `alt_titles` (text[]), `year`, `store_id`, `store_game_id`, `playtime_minutes`, `ign_statuses` (text[]), `ign_score`, `hltb_main_hours`, `steam_app_id` (el de IGN, para cruzar), `match_state` (`pending` · `matched` · `candidates` · `not_found` · `absorbed`), `candidates` (jsonb), `entry_id`, `copy_kind` (vacío = el sugerido), `excluded`, `confirmed_at` | Única `(user_id, source, source_key)`; `entry_id` con `on delete set null` |
| `import_entry` | `igdb_id`, `catalog_game_id`, `multiplayer_only`, `manual_title`, `status_key`, `endless_answer`, `play_answer` (`keep` · `not_interested`), `excluded`, `library_game_id`, `confirmed_at` | Única `(user_id, igdb_id)`; `library_game_id` con `on delete set null` |
| `library_game` (cambia) | suma `hltb_hours` (`numeric(6,1)`, vacío si no vino de IGN) | — |
| `copy` (cambia) | suma `store_game_id` (texto) y `origin` (`manual` · `import` · `sync`, por defecto `manual`) | Única `(user_id, store_id, store_game_id)`: Postgres no compara los vacíos, así que las copias a mano no chocan |

- **Una fila por cada fila de cada fuente (`import_item`) y un juego a revisar por cada juego de IGDB (`import_entry`).** Es lo que permite juntar fuentes en cualquier orden: Hollow Knight de IGN y de Steam son dos `import_item` que apuntan al mismo `import_entry`.
- **Sin `import_batch`.** `decisiones.md` §4 lo nombraba, pero una revisión abierta por usuario se deduce de los `import_item` sin `confirmed_at`, y las filas confirmadas quedan como historia para reimportar (§10). Una tabla más obligaba a un índice único parcial («una sola abierta»), que en Drizzle es SQL crudo.
- **`source_key`**: el `ignId` en IGN, `<slug de la tienda>:<providerGameId>` en Playnite y el appid en Steam.
- **`candidates`** guarda hasta 5 candidatos de IGDB (id, nombre, año, portada) para mostrarlos sin volver a consultar.
- **El cruce ya escribe el catálogo.** Al cruzar un juego se hace el upsert de `catalog_game` con lo de IGDB (`upsertIgdbCatalog` de `02`), y `import_entry` apunta ahí. El catálogo es compartido: un juego que al final no se importa deja una fila de catálogo, igual que una búsqueda que agrega y después quita.
- **Las decisiones son las columnas de respuesta** (`status_key`, `endless_answer`, `play_answer`, `excluded`, el `copy_kind` de cada fila y el candidato elegido, que pasa a `igdb_id` con `match_state = matched`). Vacías, el juego muestra la sugerencia marcada y sigue en su grupo; con valor, está en «Listos» (§9). No hace falta otra marca de «revisado».
- **`hltb_hours`** va aparte de `estimated_hours`: la duración de HowLongToBeat no es una corrección del usuario (§16).
- **`multiplayer_only`** va en `import_entry` y no en el catálogo: solo sirve para sugerir «sin fin» en la revisión.
- **Enumerados con `pgEnum`**: `import_source`, `import_match_state`, `import_play_answer` y `copy_origin`. Las migraciones las genera drizzle-kit; ninguna usa SQL crudo.

### 5. Lectura de los archivos

`POST /api/import/file` pasa el texto al servicio, que prueba los dos adapters. Cada uno valida la forma con un esquema Zod de su DTO y la traduce con su mapper a `ImportRow` de `model/import/`. Si ninguno lo reconoce, `UnknownImportFileError`: «No reconozco este archivo», y no se guarda nada. Un JSON roto da el mismo error.

**Playnite** (`adapter/playnite/`): se reconoce por `generator.name = "Playnite Library Exporter"`, `schemaVersion = 1` y `games[]`.

| Campo | Pasa a |
|---|---|
| `sourceName` | La tienda: «Epic» → Epic Games, «Steam» → Steam, «GOG» → GOG; otro nombre, con `findStoreByName` sobre las tiendas conocidas, y si no está, una tienda «Otra» del usuario, como al agregar a mano |
| `providerGameId` | `store_game_id` |
| `playtimeSeconds` | `playtime_minutes`, redondeado. En las filas de Steam queda vacío: Playnite sin sesión siempre dice 0, y 0 haría creer que nunca lo abriste |
| `releaseDate` | `year` (los cuatro primeros dígitos) |
| `name` | `title`; `sortingName` no se usa |

Una fila sin `sourceName` o sin `providerGameId` (un juego agregado a mano en Playnite) se saltea y se cuenta aparte: «2 juegos sin tienda no se leyeron». `hidden` no cambia nada: un juego oculto en Playnite sigue siendo tuyo.

**IGN** (`adapter/ign/`): se reconoce por `records[]` con `ignId`. Los estados de un juego son la unión de su `status` y sus `flags`, con los nombres que usa el export real:

| Estado de IGN | En `status` | En `flags` |
|---|---|---|
| Playing | `playing` | `playing` |
| Paused | `paused` | `paused` |
| Backlog | `backlog` | `backlog` |
| Beat | `beat` | `completed` |
| Quit | `quit` | `archived` |
| Wishlist | `wishlist` | `wishlist` |

Dos flags que nombran estados distintos son dos estados: Overwatch (`status: beat`, `flags: [completed, archived]`) llega con Beat y Quit, y 20 Minutes Till Dawn (`status: quit`, `flags: [archived]`) solo con Quit. Los datos de Lucas no tienen ningún `wishlist`, pero se soporta igual y se prueba con una fila inventada. Un valor desconocido se ignora con `logger.warn`. `hltb[0]` es la duración principal. IGN no da copias: su `steamId` solo sirve para cruzar.

### 6. Steam

- **Variable:** `STEAM_API_KEY` en `.env.local` y en Vercel, validada en `config/` con `getSteamEnv()`, aparte de `getServerEnv()` como IGDB: sin la clave, el resto de la app anda y la fuente Steam dice «Falta configurar la clave de Steam». `STEAM_API_URL` es opcional (por defecto `https://api.steampowered.com`), para el servidor falso de los e2e.
- **Qué acepta el campo** (`model/store/steam-account.ts`, puro): un SteamID64 (17 dígitos que empiezan con `7656119`), `steamcommunity.com/profiles/<id>` o `steamcommunity.com/id/<nombre>` (con o sin `https://` y barra final), o el nombre solo. Un nombre se resuelve con `ResolveVanityURL`; si Steam no lo encuentra, `SteamProfileNotFoundError`.
- **Perfil privado:** `GetOwnedGames` responde sin `game_count` cuando no puede ver los juegos. Eso es `SteamGamesPrivateError`, con el mensaje de la spec: poner «Detalles del juego» como público en la privacidad de Steam. La cuenta no queda conectada. La forma exacta de esa respuesta se confirma con una llamada real al implementar el adapter (`tasks.md`), y esa respuesta, sin datos personales, es la que usa MSW.
- **Juegos:** cada `appid` es un `import_item` de Steam con `title = name` y `playtime_minutes = playtime_forever`.
- **La clave va en la query** (Steam no acepta otra forma): el adapter nunca registra la URL ni la respuesta cruda.
- Errores de red, timeout (8 s), 429 y 5xx pasan a `SteamUnavailableError` y `SteamTimeoutError`, como en IGDB.

### 7. Cruce con IGDB

El cruce va en tandas que maneja el navegador: `useImportMatching` llama a `advanceMatchingAction` mientras queden filas `pending`, y cada llamada cruza hasta `MATCHING_BATCH_SIZE` = 60 filas y devuelve el progreso («Cruzando con IGDB · 120 de 540»). Si se cierra la pestaña, la próxima visita sigue donde quedó.

Cada tanda, en este orden:

1. **Por ID de tienda**, de a muchos: `external_games` con `uid = (…)` y `external_game_source` de Steam, Epic o GOG. Un solo pedido por tienda cubre la tanda. Las filas de IGN usan su `steamId`.
2. **Las entradas que no son juegos** (§8) buscan su juego base y no van a IGDB.
3. **Por título** el resto, en dos pasos (`multiquery` no acepta `search`, ver abajo):
   1. **Nombre exacto, de a 10 por pedido** con `multiquery`: `where name ~ "<título>"` (sin distinguir mayúsculas) con el mismo filtro de tipos que la búsqueda de `02` §6. La mayoría de los títulos de las tiendas son el nombre exacto.
   2. **`search` de a uno** para los que no dieron nada, con la misma consulta que la búsqueda de `02` §6. Cada tanda busca así hasta `MAX_TITLE_SEARCHES` = 30 títulos; los demás quedan pendientes para la tanda siguiente, así una llamada no pasa de los 20 s.
4. **Los datos de los juegos cruzados**, de a muchos: `games` con `id = (…)` (nombre, año, portada, URL, desarrollador, `version_parent` y `game_modes.slug`) y `game_time_to_beats` con `game_id = (…)`. Una edición pasa a su juego base, como al agregar.

Son 4 a 10 pedidos por tanda, más uno por cada título que no tenga nombre exacto (hasta 30). El adapter los espacia al menos 250 ms (`MIN_REQUEST_INTERVAL_MS`) para no pasar de 4 por segundo; con un 429, la tanda falla con `IgdbRateLimitError` y el hook reintenta una vez después de 2 s antes de mostrar el error.

**Cuándo un título cruza** (`model/import/title-match.ts`, puro). Se compara la clave del título: sin acentos, mayúsculas ni nada que no sea letra o número («KillingFloor2» y «Killing Floor 2» dan lo mismo). Cuentan el título y los `alt` de IGN.

| Resultado de IGDB | Queda |
|---|---|
| Uno solo con la misma clave, y el año coincide (±1) o la fila no tiene año | `matched` |
| Varios con la misma clave, o uno con la misma clave y otro año | `candidates` (Overwatch de IGN es de 2022 y el Overwatch de IGDB, de 2016) |
| Ninguno igual, pero alguno contiene todas las palabras del título o al revés | `candidates`, hasta 5 |
| Nada parecido | `not_found` |

**Solo multijugador:** IGDB lista modos y ninguno es `single-player`. Un juego sin modos cargados no cuenta como solo multijugador.

**Lo que no dice la doc y se verifica contra IGDB real** al implementar el adapter, antes de fijar los fixtures de MSW (`tasks.md`): los ids de `external_game_sources` de Steam, Epic y GOG (la doc solo lista los del `category` deprecado: 1, 26 y 5), los slugs de `game_modes`, y si el `uid` de Epic es el mismo «app name» que trae Playnite. Si no lo es, los juegos de Epic cruzan por título: más filas en «Para revisar», pero ningún cambio de diseño.

**Verificado contra IGDB real (23 nov 2026):**

- `external_game_sources`: Steam = 1, GOG = 5, Epic Games Store = 26 (los mismos números que el `category` deprecado).
- `game_modes`: `single-player`, `multiplayer`, `co-operative`, `split-screen`, `massively-multiplayer-online-mmo`, `battle-royale`. «Solo multijugador» es tener modos y que ninguno sea `single-player`.
- `external_games` con `uid = "1966900"` y fuente 1 da el juego 199748, 20 Minutes Till Dawn.
- **El `uid` de Epic no es el app name de Playnite.** IGDB guarda el ID de catálogo de Epic (32 hexadecimales o un UUID, dos filas por juego): «Sugar» (Rocket League), «Fortnite», «Auk» (Q.U.B.E. 2) y el app name hexadecimal de GTA V no dan nada. Los juegos de Epic cruzan por título y no se gasta un pedido en buscarlos por ID.
- El `uid` de GOG es el ID numérico del producto (Q.U.B.E. 2: `1199381642`), el mismo que usa Playnite para GOG.
- `game_time_to_beats` acepta `game_id = (…)` de a muchos.
- **`multiquery` no acepta `search`**: con `where name = "…"` devuelve resultados, y con `search "…"` una lista vacía, en cualquier orden de los campos.

### 8. Entradas que no son juegos

`model/import/non-game.ts` reconoce dos cosas por el título:

- **Un sufijo de algo que no es el juego**, con o sin separador ni paréntesis: `Beta`, `Tech Beta`, `Public Test`, `Public Testing`, `Test Server`, `Playtest`, `Demo`, `Soundtrack`, `OST`, `Dedicated Server`, `Legacy Mode` y `Services`. Es una constante con nombre (`NON_GAME_SUFFIXES`): una nueva se suma ahí.
- **Un nombre tapado por la tienda**: un título que es solo una palabra entre corchetes («[REDACTED]»).

Una fila así no busca en IGDB por su título. Le saca el sufijo y busca su juego base, primero entre las filas **de la misma tienda** en la revisión abierta (por la clave del título) y después entre los juegos de la biblioteca que ya tienen una copia de esa tienda. Si lo encuentra, queda `absorbed`: se cuelga del juego base, no suma juego ni copia, y sus horas se suman a la copia del base. Si no, va a «No lo encontré».

Con el archivo real: Barony (Beta), Chivalry 2 - Public Testing, KillingFloor2Beta, Mortal Shell Tech Beta, Nightingale - Legacy Mode y Q.U.B.E. 2 Soundtrack se cuelgan de su juego base; Ubisoft Connect Services y [REDACTED] van a «No lo encontré».

Un soundtrack cuyo juego tenés solo en otra tienda no cuelga: tener el soundtrack en Epic no es tener el juego en Epic. Es la lectura de «si se cruzan con su juego base, no generan dos copias de la misma tienda».

**Regla general, también fuera de los no-juegos:** al confirmar, un juego nunca recibe dos copias de la misma tienda desde la importación. The Outer Worlds y The Outer Worlds: Spacer's Choice Edition (las dos de Epic) son el mismo juego base en IGDB y dejan una sola copia de Epic Games. La copia se queda con el `store_game_id` de la fila cuyo juego de IGDB es el base y no una edición; las otras filas quedan como confirmadas y colgadas de esa copia, para que reimportar las reconozca (§10).

### 9. Grupos y sugerencias

`model/import/review.ts` arma la revisión a partir de los `import_entry`, sus `import_item`, si la cuenta de Steam está conectada y los juegos que ya están en la biblioteca. Nada de los grupos se guarda: se recalcula con cada decisión.

**Sugerencias de cada juego:**

- **Estado:** el de IGN según la tabla de la spec (Backlog es Pendiente si queda alguna copia sin excluir, y si no, Quiero jugarlo). Sin IGN: Pendiente. Con `status_key` elegido, ese.
- **Puntaje:** el de IGN con un decimal. IGN ya es entero, así que es el mismo número.
- **Copias:** una por tienda (§8). Steam de la cuenta y Epic → Comprado y Gratis; Steam de Playnite que la cuenta tiene → se junta con la de la cuenta; Steam de Playnite que la cuenta no tiene → Familia; el resto → Comprado. `copy_kind` pisa la sugerencia.
- **Horas de cada copia:** las de su tienda, sumando las filas colgadas de ella. En Steam manda la cuenta.
- **Duración:** si IGDB no la tiene y la fila de IGN trae `hltb`, la principal de HowLongToBeat (§11).

**Cada juego está en un solo grupo**, el primero que le toca en este orden. Las opciones de cada juego son una elección de una sola opción (radio) con la sugerencia ya marcada: nada queda sin decidir.

| # | Grupo | Le toca si… | Opciones (**marcada**) |
|---|---|---|---|
| 1 | Para revisar | Alguna fila está en `candidates`, o IGN trae dos estados y no hay `status_key` | Los candidatos (**el primero**, el más parecido) y «Ninguno: buscar con otro nombre»; o los dos estados de IGN (**el de `status`**) y «Otro estado» |
| 2 | No lo encontré | La fila está en `not_found` | **«Cargar a mano»** (o **«No importar»** si es una entrada que no es juego, §8) y «No importar»; «Buscar con otro nombre» es un botón aparte, porque pide escribir |
| 3 | ¿Es de tu familia? | Tiene una copia sugerida como Familia sin `copy_kind` elegido, o una fila de Steam de Playnite con la cuenta sin conectar | **Familia**, Comprado, «Otro tipo» y «No importar» (esa copia) |
| 4 | ¿Es sin fin? | Sugiere Completado, `multiplayer_only` y sin `endless_answer` | **«Jugado · sin fin»** y «Completado» |
| 5 | ¿Lo vas a jugar alguna vez? | Sugiere Pendiente, sin `play_answer`, y vino de IGN sin puntaje, o todas sus copias con horas conocidas (al menos una) dicen 0 | **Pendiente**, «Sin interés» y «No importar» |
| 6 | Elegí un estado | No vino de IGN, alguna copia tiene horas y no hay `status_key` | Un selector de estado con **Pendiente** |
| 7 | Listos | Nada de lo anterior, o ya decidido | Lo que va a entrar, y «Volver a revisar» en los que decidió el usuario |

«Sin puntaje» cuenta solo para lo que vino de IGN: lo que no vino de IGN nunca tiene puntaje, y si contara, ningún juego llegaría a «Elegí un estado». Un juego sin ninguna copia con horas conocidas (Steam desde Playnite) no cumple «0 h».

**Todo lo decidido pasa a «Listos».** Elegir otra opción en un juego guarda esa respuesta y lo lleva a «Listos»; para pasar lo marcado sin cambiarlo, se selecciona y se toca «Pasar a Listos», que guarda la sugerencia como respuesta. La pantalla lo dice en una línea con `role="status"` («Beholder pasó a «Listos» con «Sin interés».») y el foco pasa a la fila siguiente, para que la lista no salte bajo el dedo. Cada grupo explica la regla arriba de la lista, y la tarjeta de confirmar dice que «Confirmar importación» suma todo lo que está en «Listos». «Volver a revisar» borra las respuestas de ese juego y lo devuelve a su grupo.

- **Un juego que ya está en la biblioteca** no pasa por 4, 5 ni 6: su estado y su puntaje no se tocan. Si le faltan copias, va a «Listos» con la marca «Ya está en tu biblioteca · suma 1 copia». Si no le falta nada, no aparece, y el encabezado dice «312 ya estaban al día».
- **Un juego excluido** («No importar») no aparece en ningún grupo y se cuenta en el resumen.
- **La cuenta de Steam sin conectar:** las filas de Steam de Playnite esperan en «¿Es de tu familia?» con el aviso «Conectá tu cuenta de Steam para saber cuáles son tuyos» y sin acciones. Al conectarla se recalculan: las que la cuenta tiene se juntan con su copia y salen del grupo.
- **Acciones en lote, en PC y en el celu:** cada grupo tiene «Seleccionar» por fila y «Seleccionar todos», y la barra de selección ofrece «Pasar a Listos» y las mismas opciones que cada fila; elegir una lleva los seleccionados a «Listos» con esa opción. En cualquier grupo, «Tipo de copia» cambia el tipo de las copias de una tienda en los juegos elegidos (si la selección tiene más de una tienda, se elige cuál). `decideAction` recibe una lista de ids y una decisión, y el servicio la aplica en una sola consulta.

### 10. Reimportar y juntar fuentes

- **Guardar filas** es un upsert por `(user_id, source, source_key)`. Una fila que ya estaba y no está confirmada se actualiza (título, horas, estados de IGN) sin perder sus decisiones. Una fila ya confirmada no se toca ni vuelve a la revisión: «el resto queda igual».
- **Una fila nueva** cruza con IGDB y cae en el `import_entry` de su juego. Si ese juego ya se confirmó antes, el `import_entry` vuelve a abrirse solo para sumar las copias que falten.
- **Las copias se reconocen** por tienda más `store_game_id`, y además una tienda en la que el juego ya tiene copia no recibe otra (§8). Una copia cargada a mano antes de importar (sin `store_game_id`) cuenta igual: Hades con Steam a mano no recibe otra copia de Steam.
- **«No pisar lo que ya está»:** si el juego de IGDB ya está en la biblioteca, al confirmar solo se suman copias. Ni el estado ni el puntaje ni las correcciones cambian.
- **Los juegos de IGN se reconocen por su `ignId`** porque es el `source_key` de su fila: aunque IGDB cambie, una fila confirmada no se vuelve a importar.
- **«Traer de nuevo» de Steam** vuelve a pedir la lista y guarda las filas con la misma regla.

### 11. Confirmar

`confirmImportAction` confirma todo lo que está en «Listos» en ese momento; los demás grupos siguen esperando. Es el único botón que confirma.

1. El servicio pide la revisión al repositorio, `planImportConfirmation` (`model/import/confirm.ts`) arma la lista de juegos nuevos, copias nuevas y marcas, y el repositorio la aplica en **una transacción**, con inserts en lote.
2. **Juego nuevo:** `library_game` con el estado sugerido o elegido, `status_since` = `clock.today()`, el puntaje, `not_interested` si se eligió «Sin interés», `endless = true` y el estado Jugado si se aceptó «sin fin», y la duración principal de HowLongToBeat en `hltb_hours` cuando la fila de IGN la trae (§16). Sin entrada del diario: el estado inicial no es un cambio (`02` §8). Si el usuario todavía no tiene estados, se crean los por defecto antes, como al agregar.
3. **Juego cargado a mano** desde «No lo encontré»: `catalog_game` manual con el título y el año de la fila, como «Agregar a mano».
4. **Copias:** con `origin = import`, `store_game_id`, el tipo y las horas; sin fecha.
5. **Marcas:** `confirmed_at` en las filas y los juegos, y `library_game_id` en cada `import_entry`.
6. **Resumen:** «Entraron 480 juegos y 520 copias · 60 marcados «Sin interés» · 4 sin importar», con plurales ICU. «Sin importar» cuenta los juegos y las copias excluidos en esta confirmación. Si no había nada en «Listos», el botón está deshabilitado y lo dice.

Son unas 1000 filas en el peor caso (480 juegos y 520 copias): en lote, muy por debajo de los 8 s por consulta. Si el plan pasara de `MAX_CONFIRM_ENTRIES` = 600 juegos, se confirma en tandas de ese tamaño, cada una en su transacción y con el resumen sumado.

### 12. Validación y errores

- **Zod** en las acciones y en el Route Handler: ids uuid, decisiones de una lista cerrada, el texto de Steam con trim y hasta 200 caracteres, el archivo con tipo `application/json` o sin tipo.
- **El servicio** verifica que cada id de la decisión sea del usuario (el repositorio filtra por `user_id`; un id ajeno o inexistente da `ImportEntryNotFoundError`).
- **El modelo** decide si una decisión vale para ese juego: elegir «Familia» en un juego sin copia de Steam o un candidato que no está en su lista da `InvalidImportDecisionError`.
- Errores nuevos, cada uno con su código y su texto en `errors` de los dos catálogos: `UnknownImportFileError`, `ImportFileTooLargeError`, `InvalidSteamProfileError` (lo pegado no es un link ni un SteamID; en `model/store/errors.ts`), `SteamProfileNotFoundError`, `SteamGamesPrivateError`, `SteamNotConfiguredError`, `SteamUnavailableError`, `SteamTimeoutError`, `ImportEntryNotFoundError` e `InvalidImportDecisionError`.

### 13. Idiomas

Todo texto nuevo va en `import` (pantalla) y `errors` (errores) de `es.json` y `en.json` en la misma tarea que lo usa. Los nombres de los grupos son los de la spec y en inglés se definen al implementar. Los títulos que vienen de los archivos, de Steam o de IGDB no se traducen.

### 14. Tests

- **Modelo:** cruce por título, no-juegos, grupos, sugerencias, juntar fuentes, la regla de una copia por tienda y el plan de confirmación, con filas armadas en el test. Acá viven la mayoría de los escenarios de la spec.
- **Adapters:** IGN y Playnite con muestras chicas inventadas con el formato real: `tests/adapter/ign/ign-export-sample.json` (ya existe) y `tests/adapter/playnite/playnite-export-sample.json`, nueva, con unos 8 juegos (Epic con horas y sin horas, un ID con palabras, un Steam instalado que la cuenta tiene, uno que no, una beta, un soundtrack y un nombre tapado). Steam e IGDB con MSW (`multiquery`, `external_games` y las respuestas de perfil privado y nombre inexistente).
- **Repositorios:** contra PGlite con las migraciones, con el test de «el usuario A no ve ni cambia nada del B» en `import_item`, `import_entry` y `store_connection`, el upsert sin duplicar y la transacción de confirmar entera o nada.
- **Servicio:** con repositorios y adapters falsos: la tanda de cruce, la reimportación y confirmar.
- **Componentes y hooks:** grupos, acciones de a uno y en lote, progreso y resumen, con `renderWithIntl`.
- **E2e** en `tests/e2e/import.spec.ts`, a 390 y 1440 px y en inglés (`@i18n`): subir los dos archivos de muestra, conectar Steam contra `tests/e2e/support/steam-server.mts`, resolver un juego de cada grupo, confirmar, ver el resumen y verificar la biblioteca; y «Retomar la revisión» cerrando la página a la mitad. El servidor falso de IGDB suma `external_games` y `multiquery`.

### 15. Diseño de la pantalla

`design/Escritorio-Importar.dc.html` (1440 px) y `design/Movil-Importar.dc.html` (390 px), con su entrada en `design/canvas.json`. Siguen el estilo de Tiendas y Ajustes: título Space Grotesk, rótulos JetBrains Mono, tarjetas `#161A21` con borde `#2A303B`, acento lima para la acción principal y ámbar para lo que «no es tuyo».

- **Arriba, tres fuentes** como las tarjetas de Tiendas: IGN y Playnite con «Subir archivo» (y, ya leído, «303 juegos · leído el 23 nov» con «Subir otro»), y Steam con el campo del perfil y «Conectar» (y, conectada, «412 juegos · Traer de nuevo»).
- **Mientras cruza,** una barra de progreso con «Cruzando con IGDB · 120 de 540».
- **La revisión:** en PC, a la izquierda la lista de grupos con su cantidad (como el menú de Ajustes) y a la derecha el grupo elegido: la pregunta, una línea que explica por qué están ahí, la barra de selección y una fila por juego con su casilla de selección, portada, título, año, de dónde vino («IGN · Beat · 9», «Steam · 48 h», «Epic Games · Gratis») y sus opciones como radios con la sugerencia marcada. Arriba de la lista, la regla («Si elegís otra opción, pasa a «Listos»…») y la línea de lo que acaba de pasar a «Listos». En el celu, los grupos son botones que bajan de renglón (sin desplazamiento horizontal), las opciones van debajo de cada juego y la barra de selección es la misma que en PC.
- **Abajo,** «En «Listos»: 237 juegos y 252 copias», la explicación de que se confirma todo lo que está ahí y «Confirmar importación», al final del contenido y no fijo, como «Guardar juego» en `02` §1: en el celu abajo está la barra de secciones. Después de confirmar, esa zona muestra el resumen.
- **Al final del archivo de PC,** como ejemplo aparte, la biblioteca vacía con «Agregá tu primer juego» e «Importar tu biblioteca».

### 16. Duración de HowLongToBeat

- `library_game.hltb_hours` guarda la duración principal de HowLongToBeat que vino de IGN. No es una corrección: si el usuario edita la duración, se guarda en `estimated_hours` como siempre y gana.
- `effectiveHours` pasa a ser «la tuya, si no la de IGDB, si no la de HowLongToBeat», como pide `decisiones.md` §7. Si después «Actualizar datos» trae una duración de IGDB, esa gana sola.
- `durationSource` suma `"hltb"` y la ficha muestra «unas 2.3 h · HowLongToBeat», con la clave nueva `game.duration.sources.hltb` en los dos catálogos. Los filtros y el orden por duración usan `effectiveHours`, así que también la cuentan.
- En el modelo, `hltbHours` es opcional en los datos del juego: los fixtures de los tests existentes no cambian.

## Risks / Trade-offs

- **[El `uid` de Epic en IGDB no es el app name de Playnite]** → Los 209 juegos de Epic cruzan por título. Se verifica contra IGDB real en la primera tarea del adapter; el diseño no cambia, solo crecen «Para revisar» y «No lo encontré».
- **[Un título cruza con el juego equivocado]** (un juego con el mismo nombre y año) → Solo cruza solo con clave idéntica y año compatible; ante la duda queda en «Para revisar». Un cruce malo se arregla después con «Vincular con IGDB» de la ficha.
- **[La lista de sufijos deja pasar algo o se come un juego real]** («Demo» podría ser parte de un nombre) → El sufijo solo cuenta al final del título, y una fila que no encuentra su base no se descarta: va a «No lo encontré», donde se puede cargar igual.
- **[La lista se mueve mientras se revisa]** (cada decisión saca la fila del grupo) → La línea de estado nombra el juego y adónde fue, el foco pasa a la fila siguiente y «Volver a revisar» en «Listos» deshace.
- **[Cientos de filas de catálogo de juegos que no se importan]** → Son datos públicos de IGDB y el catálogo ya es compartido. No pesan en el plan gratis (un par de miles de filas).
- **[El exportador de Playnite cambia de formato]** → Se valida `schemaVersion = 1`; otra versión da «No reconozco este archivo» en lugar de importar datos raros.
- **[La clave de Steam queda en un log]** → Va en la query de la URL, así que el adapter nunca registra URLs ni respuestas; los errores se loguean con el código HTTP solamente.
- **[Un juego de IGN con dos filas de IGN para el mismo juego de IGDB]** → Las dos caen en el mismo `import_entry`; si sus estados difieren, se juntan como «dos estados» y va a «Para revisar».

## Migration Plan

1. Migraciones nuevas generadas por drizzle-kit: `store_connection`, `import_item`, `import_entry`, sus enumerados, `store_game_id`, `origin` y la única de `copy`, y `hltb_hours` de `library_game`. Ninguna edita una ya aplicada.
2. Paso del usuario: `STEAM_API_KEY` en `.env.local` y en las variables de Vercel (`docs/configuracion-externa.md`, etapa 04, se actualiza con el nombre).
3. Vuelta atrás: la app de `03` ignora las tablas nuevas y las columnas nuevas de `copy` y `library_game` son opcionales, así que un deploy anterior sigue andando con la base migrada.

