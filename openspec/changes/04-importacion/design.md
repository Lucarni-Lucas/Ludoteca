# Design

## Context

La motivación está en `proposal.md` (Why) y los comportamientos en `specs/importacion/spec.md`. Lo que condiciona el cómo:

- **La biblioteca ya existe** (`02-nucleo-biblioteca`): `catalog_game` compartido, `library_game`, `copy`, `store` y `status` con `system_key`. Agregar un juego de IGDB ya hace upsert del catálogo y crea el juego con sus copias y su puntaje en una transacción (`game-repository.ts`, `addIgdbGame`). La importación reutiliza esas piezas; no inventa otra forma de crear juegos.
- **`copy` todavía no tiene `store_game_id` ni `origin`** (`02` §4 los dejó para esta etapa). Sin `store_game_id` no hay forma de cumplir «Reimportar sin duplicar».
- **IGDB:** 4 pedidos por segundo y hasta 8 abiertos; `multiquery` acepta hasta 10 consultas por pedido y cada consulta hasta 500 resultados (verificado en `api-docs.igdb.com`). `external_games` tiene `uid`, `game` y `external_game_source` (`category` está deprecado). La doc no dice qué contiene el `uid` de Epic.
- **Steam Web API:** `IPlayerService/GetOwnedGames/v1` (con `include_appinfo` e `include_played_free_games`) y `ISteamUser/ResolveVanityURL/v1` para los links con nombre (verificado en `partner.steamgames.com`). La doc dice que devuelve los juegos «siempre y cuando puedas ver los detalles de sus juegos».
- **Vercel Hobby y la base:** las páginas y acciones con base declaran `maxDuration = 20` y cada consulta corta a los 8 s (`02` §17). Cruzar 500 juegos con IGDB no entra en un solo pedido de 20 s si algo se demora: el trabajo tiene que ir en tandas que se puedan retomar.
- **El export real de Playnite** (PlayniteLibraryExporter 1.0, `schemaVersion: 1`), leído fuera del repo: 233 juegos, 209 de Epic y 24 de Steam. Cada juego trae `name`, `sourceName` («Epic», «Steam»), `providerGameId` (el ID en la tienda), `playtimeSeconds`, `isInstalled`, `hidden` y `releaseDate` (`«2020-4-23»`, sin ceros). Los de Steam traen además `steamAppId` y son solo los instalados en la PC, todos con `playtimeSeconds: 0` porque la biblioteca de Steam de Playnite no tiene sesión iniciada. Los IDs de Epic son el «app name» de Epic: hexadecimales de 32 caracteres o palabras («Fortnite», «Sugar» para Rocket League, «Auk» para Q.U.B.E. 2).
- **Entradas que no son juegos en ese archivo:** «Barony (Beta)», «Chivalry 2 - Public Testing», «KillingFloor2Beta», «Mortal Shell Tech Beta», «Nightingale - Legacy Mode», «Q.U.B.E. 2 Soundtrack» (todas de Epic y con su juego base en el mismo archivo) y «Ubisoft Connect Services» (Epic, sin juego base). De Steam llega «Homicipher: Demo», sin su juego. «[REDACTED]» no es un nombre tapado: es un juego de 2024 que se llama así.
- **Lo que vio Lucas al importar sus datos reales:** Fortnite aparece dos veces en «¿Cuál de estos es?» (uno de IGN y otro de Epic) y Snakebird Complete dos veces en «No lo encontré»; quien lo ve puede creer que es un duplicado, no importar uno y perder el puntaje o las horas. «Styx: Shards of Darkness - Deluxe Edition» no cruza porque IGDB no tiene la edición con ese nombre. Y las sugerencias marcadas de los grupos de lote se aceptaban sin leerlas.
- **El export de IGN** no está en el repo. Se diseña con la muestra de `tests/adapter/ign/ign-export-sample.json` (7 juegos inventados con el formato real): `records[]` con `ignId`, `name`, `alt`, `year`, `status`, `flags`, `score` entero, `steamId` y `hltb` (`[principal, extras, completo]` en horas). Lucas revisó el export real: `status` usa `playing`, `paused`, `backlog`, `beat` y `quit`; `flags` usa `playing`, `paused`, `backlog`, `completed` y `archived`. No hay ningún `wishlist` en sus datos.

## Goals / Non-Goals

**Goals:**

- Un solo lugar, `/import`, para subir los dos archivos, conectar Steam, revisar y confirmar, que se puede dejar a la mitad y retomar.
- El cruce con IGDB en tandas chicas, con progreso visible, que no dependa del tiempo máximo de una función.
- Todas las reglas (cruce por título, grupos, respuestas, juntar fuentes y nombres iguales, qué se suma al confirmar) como funciones puras de `model/import/`, probadas sin base ni red.
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
| Guías «¿Cómo lo saco?» | Los ejemplos del final de `design/Escritorio-Importar.dc.html` (IGN) y de `design/Movil-Importar.dc.html` (Playnite) | Páginas propias con el estilo de Ajustes (§17). |

### 2. Rutas

| Ruta | Contenido |
|---|---|
| `/import` | Fuentes, progreso del cruce, revisión y confirmación. `?source=playnite`, `?source=ign` o `?source=steam` lleva el foco a esa fuente (lo usa `05` desde Tiendas). |
| `/import/guide/ign` | «¿Cómo lo saco?» de IGN, con el marcador que descarga el archivo (§17). Sin base: no declara `maxDuration`. |
| `/import/guide/playnite` | «¿Cómo lo saco?» de Playnite (§17). Sin base. |
| `POST /api/import/file` | Recibe un archivo (`multipart/form-data`), lo reconoce y guarda sus filas. Devuelve la fuente y cuántos juegos leyó. |

- **El archivo va por Route Handler, no por Server Action.** Las acciones tienen 1 MB de cuerpo por defecto en Next y el export de IGN con 303 juegos ronda ese tamaño; el Route Handler acepta hasta 4,5 MB en Vercel. El tope propio es `MAX_IMPORT_FILE_BYTES` = 4 MB, con un error con nombre si se pasa. Así lo preveía `decisiones.md` §2 (`/api/import`).
- **El resto son Server Actions** en `app/(app)/import/actions.ts`: `connectSteamAction`, `refreshSteamAction`, `advanceMatchingAction`, `decideAction` (de a uno o en lote), `searchAgainAction`, `confirmImportAction`, `discardReviewAction` («Empezar de nuevo», §18) y `getImportOverviewAction`, que trae la revisión después de subir un archivo por el Route Handler. La página llama a `openImport` del servicio, que antes de armar la revisión chequea si venció (§18). Cada una valida con Zod y llama al servicio.
- `/import` y la ruta del archivo declaran `maxDuration = 20`, como las demás con base.
- `isSettingsPath` incluye `/import`, y con eso sus guías: es una opción de Ajustes y el avatar se marca igual.

### 3. Carpetas nuevas

Se proponen con este diseño y se crean al aprobarlo:

- `model/import/`, `service/import/`, `persistence/sql/import/`, `persistence/mapper/import/` y `persistence/repository/import/`: contexto `import`, ya previsto en `CLAUDE.md`.
- `adapter/ign/` y `adapter/playnite/` (con `dto/`): leen los archivos. Son proveedores, como prevé `CLAUDE.md`, aunque no sean APIs.
- `adapter/steam/` (con `dto/`).
- `model/store/steam-account.ts`, `persistence/sql/store/store-connection.ts` y su mapper y repositorio: la cuenta conectada es del contexto `store`, y `05` la reutiliza.
- `components/import/`, `hooks/use-import-review.ts` y `hooks/use-import-matching.ts`.
- `app/(app)/import/guide/ign/` y `app/(app)/import/guide/playnite/`: las rutas de las guías (§17). El marcador va en `adapter/ign/ign-bookmarklet.ts`, sin carpeta nueva.
- `tests/adapter/playnite/`, `tests/adapter/steam/`, `tests/e2e/support/steam-server.mts` y `tests/e2e/import.spec.ts`. `tests/adapter/ign/ign-export-sample.json` ya existe (sin versionar) y entra al repo: sus datos son inventados.

### 4. Modelo de datos

Todas las tablas con id uuid, `created_at`, `updated_at`, `user_id` y RLS sin políticas, como las de `02`.

| Tabla | Columnas | Restricciones |
|---|---|---|
| `store_connection` | `store_id`, `account_id` (SteamID64, texto), `last_synced_at` (vacío hasta `05`) | Única `(user_id, store_id)` |
| `import_item` | `source` (`ign` · `playnite` · `steam`), `source_key`, `title`, `alt_titles` (text[]), `year`, `store_id`, `store_game_id`, `playtime_minutes`, `ign_statuses` (text[]), `ign_score`, `hltb_main_hours`, `steam_app_id` (el de IGN, para cruzar), `match_state` (`pending` · `matched` · `candidates` · `not_found` · `absorbed`), `candidates` (jsonb), `chosen_igdb_id` (el juego que eligió el usuario, vacío si no eligió), `entry_id`, `copy_kind` (vacío = el sugerido), `excluded`, `confirmed_at` | Única `(user_id, source, source_key)`; `entry_id` con `on delete set null` |
| `import_entry` | `igdb_id`, `catalog_game_id`, `multiplayer_only`, `manual_title`, `status_key`, `endless_answer`, `play_answer` (`keep` · `not_interested`), `excluded`, `library_game_id`, `confirmed_at` | Única `(user_id, igdb_id)`; `library_game_id` con `on delete set null` |
| `library_game` (cambia) | suma `hltb_hours` (`numeric(6,1)`, vacío si no vino de IGN) | — |
| `copy` (cambia) | suma `store_game_id` (texto) y `origin` (`manual` · `import` · `sync`, por defecto `manual`) | Única `(user_id, store_id, store_game_id)`: Postgres no compara los vacíos, así que las copias a mano no chocan |

- **Una fila por cada fila de cada fuente (`import_item`) y un juego a revisar por cada juego de IGDB (`import_entry`).** Es lo que permite juntar fuentes en cualquier orden: Hollow Knight de IGN y de Steam son dos `import_item` que apuntan al mismo `import_entry`. Mientras no cruza, un juego a revisar junta las filas con el mismo nombre (§10): Fortnite de IGN y de Epic son un solo `import_entry` sin `igdb_id`.
- **Sin `import_batch`.** `decisiones.md` §4 lo nombraba, pero una revisión abierta por usuario se deduce de los `import_item` sin `confirmed_at`, y las filas confirmadas quedan como historia para reimportar (§10). Una tabla más obligaba a un índice único parcial («una sola abierta»), que en Drizzle es SQL crudo.
- **`source_key`**: el `ignId` en IGN, `<slug de la tienda>:<providerGameId>` en Playnite y el appid en Steam.
- **`candidates`** guarda hasta 5 candidatos de IGDB (id, nombre, año, portada) para mostrarlos sin volver a consultar.
- **El cruce ya escribe el catálogo.** Al cruzar un juego se hace el upsert de `catalog_game` con lo de IGDB (`upsertIgdbCatalog` de `02`), y `import_entry` apunta ahí. El catálogo es compartido: un juego que al final no se importa deja una fila de catálogo, igual que una búsqueda que agrega y después quita.
- **Las decisiones son las columnas de respuesta** (`status_key`, `endless_answer`, `play_answer`, `manual_title`, `excluded`, el `copy_kind` de cada fila y el `chosen_igdb_id` de cada fila). Cada columna contesta una sola pregunta: con valor, esa pregunta ya no se hace y el juego pasa a la siguiente que le toque, o a «Listos para importar» si no le queda ninguna (§9). No hace falta otra marca de «revisado».
- **Elegir un juego no pisa el cruce.** Al elegir un candidato o un juego de «Buscar con otro nombre», la fila guarda `chosen_igdb_id` y se muda al juego a revisar de ese juego de IGDB (o lo toma, si no hay otro), pero su `match_state` y sus `candidates` quedan como estaban. «Volver a revisar» borra `chosen_igdb_id` y devuelve las filas a un juego a revisar nuevo, sin juego de IGDB: vuelve a «¿Cuál de estos es?» con sus candidatos, o a «No lo encontré». Las filas que habían elegido el mismo juego vuelven juntas a uno solo, así Fortnite de IGN y de Epic sigue siendo una sola pregunta (§10). Así lo pide «Volver a revisar» de la spec; antes la elección se guardaba como `match_state = matched` con los candidatos de marca, y «Volver a revisar» no podía deshacerla. La columna nueva va en una migración nueva, generada por drizzle-kit.
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
   3. **Sin la edición**, para los que quedaron sin nada igual ni parecido (`not_found` en la tabla de abajo) y cuyo título nombra una edición (ver abajo): los mismos dos pasos con el título sin la edición. Hasta `MAX_EDITION_SEARCHES` = 10 por tanda; los demás quedan pendientes y se buscan enteros en la siguiente.
4. **Los datos de los juegos cruzados**, de a muchos: `games` con `id = (…)` (nombre, año, portada, URL, desarrollador, `version_parent` y `game_modes.slug`) y `game_time_to_beats` con `game_id = (…)`. Una edición pasa a su juego base, como al agregar.

Son 4 a 10 pedidos por tanda, más uno por cada título que no tenga nombre exacto (hasta 30) y hasta 11 más para los que se buscan sin la edición (un `multiquery` y un `search` por cada uno). El adapter los espacia al menos 250 ms (`MIN_REQUEST_INTERVAL_MS`) para no pasar de 4 por segundo; con un 429, la tanda falla con `IgdbRateLimitError` y el hook reintenta una vez después de 2 s antes de mostrar el error.

**Cuándo un título cruza** (`model/import/title-match.ts`, puro). Se compara la clave del título: sin acentos, mayúsculas ni nada que no sea letra o número («KillingFloor2» y «Killing Floor 2» dan lo mismo). Cuentan el título y los `alt` de IGN.

| Resultado de IGDB | Queda |
|---|---|
| Uno solo con la misma clave, sea cual sea el año | `matched`: el año de Epic suele ser el de la tienda y no el del juego (20XX llega de Epic con 2020 y en IGDB es de 2017) |
| Varios con la misma clave | `candidates`, los de la misma clave primero y el de año más cercano antes (Crash Bandicoot) |
| Ninguno igual, pero alguno contiene todas las palabras del título o al revés | `candidates`, hasta 5. Si es uno solo, la revisión pregunta «¿Es este juego?» |
| Nada parecido | `not_found`, o se busca sin la edición si el título nombra una |
| Lo encontrado sin la edición, sea lo que sea | `candidates`, nunca `matched`: «Styx: Shards of Darkness - Deluxe Edition» llega con «Styx: Shards of Darkness» como único candidato, y como su nombre no es el del título, la revisión pregunta «¿Es este juego?» |

Una edición y su juego base cuentan como uno solo (`baseIgdbId`), como hasta ahora. Un título entre corchetes («[REDACTED]») se busca como cualquier otro.

**Cuándo un título nombra una edición** (`model/import/edition.ts`, puro): cuando termina en una de `EDITION_SUFFIXES`, una constante con nombre como `NON_GAME_SUFFIXES`: `Deluxe Edition`, `Digital Deluxe Edition`, `Game of the Year Edition`, `GOTY Edition`, `GOTY`, `Complete Edition`, `Complete`, `Definitive Edition`, `Ultimate Edition`, `Gold Edition`, `Premium Edition`, `Standard Edition`, `Special Edition` y `Enhanced Edition`. Se compara por palabras, como los no-juegos, y tiene que quedar al menos una palabra. Lo que se busca es el título original sin ese final ni los separadores que quedan colgando (« - », «:», « – », paréntesis): «Styx: Shards of Darkness - Deluxe Edition» → «Styx: Shards of Darkness», «Snakebird Complete» → «Snakebird». Sin la edición no se cruza solo porque el juego base y la edición pueden ser fichas distintas en IGDB, y elegir es del usuario.

**Solo multijugador:** IGDB lista modos y ninguno es `single-player`. Un juego sin modos cargados no cuenta como solo multijugador.

**Lo que no dice la doc y se verifica contra IGDB real** al implementar el adapter, antes de fijar los fixtures de MSW (`tasks.md`): los ids de `external_game_sources` de Steam, Epic y GOG (la doc solo lista los del `category` deprecado: 1, 26 y 5), los slugs de `game_modes`, y si el `uid` de Epic es el mismo «app name» que trae Playnite. Si no lo es, los juegos de Epic cruzan por título: más filas en «¿Cuál de estos es?», pero ningún cambio de diseño.

**Verificado contra IGDB real (23 nov 2026):**

- `external_game_sources`: Steam = 1, GOG = 5, Epic Games Store = 26 (los mismos números que el `category` deprecado).
- `game_modes`: `single-player`, `multiplayer`, `co-operative`, `split-screen`, `massively-multiplayer-online-mmo`, `battle-royale`. «Solo multijugador» es tener modos y que ninguno sea `single-player`.
- `external_games` con `uid = "1966900"` y fuente 1 da el juego 199748, 20 Minutes Till Dawn.
- **El `uid` de Epic no es el app name de Playnite.** IGDB guarda el ID de catálogo de Epic (32 hexadecimales o un UUID, dos filas por juego): «Sugar» (Rocket League), «Fortnite», «Auk» (Q.U.B.E. 2) y el app name hexadecimal de GTA V no dan nada. Los juegos de Epic cruzan por título y no se gasta un pedido en buscarlos por ID.
- El `uid` de GOG es el ID numérico del producto (Q.U.B.E. 2: `1199381642`), el mismo que usa Playnite para GOG.
- `game_time_to_beats` acepta `game_id = (…)` de a muchos.
- **`multiquery` no acepta `search`**: con `where name = "…"` devuelve resultados, y con `search "…"` una lista vacía, en cualquier orden de los campos.

### 8. Entradas que no son juegos

`model/import/non-game.ts` reconoce por el final del título algo que no es el juego, con o sin separador ni paréntesis: `Beta`, `Tech Beta`, `Open Beta`, `Closed Beta`, `Public Test`, `Public Testing`, `Test Server`, `Playtest`, `Demo`, `Soundtrack`, `OST`, `Dedicated Server`, `Legacy Mode` y `Services`. Es una constante con nombre (`NON_GAME_SUFFIXES`): una nueva se suma ahí. `Open Beta` y `Closed Beta` van aparte de `Beta` para que el juego base quede sin la palabra de más («Mortal Shell Open Beta» busca «Mortal Shell», no «Mortal Shell Open»).

Ya no hay regla del «nombre tapado»: un título entre corchetes se busca en IGDB como cualquier otro (§7). [REDACTED] es un juego real de 2024.

Una fila que no es juego no busca en IGDB por su título. Le saca el sufijo y busca su juego base, primero entre las filas **de la misma tienda** en la revisión abierta (por la clave del título) y después entre los juegos de la biblioteca que ya tienen una copia de esa tienda. Si lo encuentra, queda `absorbed`: se cuelga del juego base, no suma juego ni copia, y sus horas se suman a la copia del base. Esto no cambia.

**Si no encuentra su base, ya no va a «No lo encontré».** El cruce la guarda como `not_found` con su juego a revisar ya en «No importar» (`excluded = true`): es una decisión del sistema, no del usuario, así que se ve.

- Queda en «Listos para importar» como «No se importa · no es un juego», con «Volver a revisar» (§9). Un juego que el usuario dejó afuera con «No importar» también se ve ahí, como «No se importa» (§9).
- «Volver a revisar» le borra el «No importar» y la lleva a «No lo encontré», con la línea «No parece un juego: es una demo, una beta, un soundtrack o algo parecido.». Ahí se puede buscar con otro nombre, cargar a mano o no importar. Si se elige «No importar», vuelve a «Listos para importar» como «No se importa · no es un juego».
- Al confirmar, entra en el «sin importar» del resumen (§11) y queda confirmada, para que reimportar no la traiga de vuelta.
- No se junta con otras del mismo nombre (§10): las que no son juegos no están en «¿Cuál de estos es?» ni en «No lo encontré» esperando respuesta.

Con el archivo real: Barony (Beta), Chivalry 2 - Public Testing, KillingFloor2Beta, Mortal Shell Tech Beta, Nightingale - Legacy Mode y Q.U.B.E. 2 Soundtrack se cuelgan de su juego base; Ubisoft Connect Services (Epic) y Homicipher: Demo (Steam) quedan en «Listos para importar» como «No se importa · no es un juego»; [REDACTED] se busca en IGDB.

Un soundtrack cuyo juego tenés solo en otra tienda no cuelga: tener el soundtrack en Epic no es tener el juego en Epic. Es la lectura de «si se cruzan con su juego base, no generan dos copias de la misma tienda».

**Regla general, también fuera de los no-juegos:** al confirmar, un juego nunca recibe dos copias de la misma tienda desde la importación. The Outer Worlds y The Outer Worlds: Spacer's Choice Edition (las dos de Epic) son el mismo juego base en IGDB y dejan una sola copia de Epic Games. La copia se queda con el `store_game_id` de la fila cuyo juego de IGDB es el base y no una edición; las otras filas quedan como confirmadas y colgadas de esa copia, para que reimportar las reconozca (§10).

### 9. Grupos y respuestas

`model/import/review.ts` arma la revisión a partir de los `import_entry`, sus `import_item`, si la cuenta de Steam está conectada y los juegos que ya están en la biblioteca. Nada de los grupos se guarda: se recalcula con cada decisión.

**Cómo entraría cada juego** (lo que dice «Entra como…» en «Listos para importar»; no es una opción marcada en ningún grupo):

- **Estado:** el de IGN según la tabla de la spec (Backlog es Pendiente si queda alguna copia sin excluir, y si no, Quiero jugarlo). Sin IGN: Pendiente. Con `status_key` elegido, ese.
- **Puntaje:** el de IGN con un decimal. IGN ya es entero, así que es el mismo número.
- **Copias:** una por tienda (§8). Steam de la cuenta y Epic → Comprado y Gratis; Steam de Playnite que la cuenta tiene → se junta con la de la cuenta; Steam de Playnite que la cuenta no tiene → se pregunta en «¿Es de tu familia?»; el resto → Comprado. `copy_kind` pisa lo de la tienda.
- **Horas de cada copia:** las de su tienda, sumando las filas colgadas de ella. En Steam manda la cuenta.
- **Duración:** si IGDB no la tiene y la fila de IGN trae `hltb`, la principal de HowLongToBeat (§11).

**Cada juego está en un solo grupo**, el primero que le toca en este orden **entre las preguntas que todavía no contestó**. Cada grupo es una pregunta corta y **sus opciones son respuestas a esa pregunta, dichas en palabras, sin ninguna marcada** (spec «Respuestas sin marcar», y la regla nueva de `CLAUDE.md`). Tocar una respuesta contesta solo esa pregunta, y el juego pasa al siguiente grupo que le toque o, si no le queda ninguno, a «Listos para importar». Ya no hay «Pasar a Listos» ni radios: cada respuesta es un botón. Los grupos se diferencian solo en cómo se responde en lote:

- **Preguntas de a un juego** (1 a 3): la respuesta depende de cada juego (qué candidato, qué estado), así que en lote solo vale «No importar».
- **Grupos de lote** (4 a 7): la misma respuesta vale para varios. Se seleccionan y se toca la respuesta en la barra de selección.

| # | Grupo | Le toca si… | Respuestas |
|---|---|---|---|
| 1 | ¿Cuál de estos es? | Alguna fila está en `candidates` sin `chosen_igdb_id`, y no hay `manual_title` | Una tarjeta por candidato (portada, nombre completo y año), «Ninguno, lo busco yo» y «No importar». Con un solo candidato de otro nombre la pregunta es **«¿Es este juego?»**, con «Sí», «No, lo busco yo» y «No importar» |
| 2 | ¿Cómo lo dejaste? | IGN trae dos estados y no hay `status_key` | Un botón por estado, dicho en palabras («Lo terminaste», «Lo abandonaste», «Lo estás jugando», «Lo pausaste», «Lo tenés pendiente», «Lo querés jugar»), «Otro estado» y «No importar». Arriba, «IGN lo tiene como terminado y como abandonado». «Otro estado» muestra los demás estados como botones, sin ninguno marcado |
| 3 | No lo encontré | Alguna fila está en `not_found` sin `chosen_igdb_id`, no hay `manual_title`, y no es algo que no es juego excluido por el cruce (§8) | «Buscar con otro nombre», «Cargar a mano» y «No importar». A una entrada que no es juego, traída con «Volver a revisar», se le suma la línea «No parece un juego: es una demo, una beta, un soundtrack o algo parecido.» |
| 4 | ¿Es de tu familia? | Tiene una copia de Steam de Playnite que la cuenta no tiene, sin `copy_kind` elegido, o una fila de Steam de Playnite con la cuenta sin conectar | «Sí, es de mi familia» (copia Steam · Familia), «No, es mío» (Steam · Comprado) y «No importar» |
| 5 | ¿Es sin fin? | Entraría como Completado, `multiplayer_only` y sin `endless_answer` | «Sí, no se termina» (Jugado con la marca sin fin), «No, lo terminé» (Completado) y «No importar» |
| 6 | ¿Lo vas a jugar alguna vez? | Entraría como Pendiente, sin `play_answer`, y vino de IGN sin puntaje, o todas sus copias con horas conocidas (al menos una) dicen 0 | «Sí, algún día» (Pendiente), «No» (Sin interés) y «No importar» |
| 7 | Elegí un estado | No vino de IGN, alguna copia tiene horas y no hay `status_key` | Como «¿Cómo lo dejaste?»: «Lo estoy jugando» (Jugando), «Lo terminé» (Completado), «Lo abandoné» (Abandonado), «Lo probé» (Lo probé), «Otro estado» y «No importar». «Otro estado» abre la lista con todos los estados del usuario, sin ninguno marcado. Las cuatro respuestas van por `system_key`, así un estado renombrado sigue andando; si el usuario borró alguno de esos estados, esa respuesta no aparece. El modelo valida el estado con los del usuario (`DecisionContext.statusKeys`), como ahora |
| 8 | Listos para importar | No le queda ninguna pregunta de las anteriores, o quedó afuera con «No importar» (del usuario o del cruce) | Cómo va a entrar, o «No se importa», y «Volver a revisar» en los que tienen alguna respuesta del usuario o del cruce |

**Después de decir qué juego es** (spec «Después de decir qué juego es»). Elegir un candidato, «Sí» en «¿Es este juego?», un juego de «Buscar con otro nombre» o «Cargar a mano» contesta solo las preguntas 1 y 3. Hasta ahora contaba como «decidido» y el juego iba directo a «Listos para importar», salteando las demás: LOVE, con 0 h y sin puntaje, nunca preguntaba si lo ibas a jugar. Ahora:

- **Ya no hay un «decidido» que saltee preguntas.** Cada grupo mira solo su propia respuesta (la columna de la tabla de §4), y el juego cae en el primero que le falte, igual que uno que se cruzó solo.
- **Con el juego elegido se saben sus datos:** `matchEntry` ya guarda el catálogo y `multiplayer_only` del juego elegido (§4), así que «¿Es sin fin?» se puede preguntar. Uno cargado a mano no tiene datos de IGDB: no es solo multijugador, y pasa por «¿Lo vas a jugar alguna vez?» o «Elegí un estado» según sus filas.
- **Lo mismo vale para las otras respuestas:** «Sí, es de mi familia» en Portal 2 contesta la familia, y si además le tocara «¿Lo vas a jugar alguna vez?», va ahí. «¿Cómo lo conseguiste?» solo contesta «¿Es de tu familia?» (antes cambiar el tipo de una copia mandaba el juego a «Listos para importar»).
- **Un juego que ya está en la biblioteca** sigue sin pasar por 5, 6 ni 7.
- **En lote** cada juego va al grupo que le toque: con las respuestas de los grupos de lote (4 a 7), y con «No importar» en las preguntas de a un juego. Decir qué juego es sigue siendo de a uno: el candidato en «¿Cuál de estos es?», y «Buscar con otro nombre» o «Cargar a mano» en «No lo encontré», que conviene probar en ese orden. Por eso en esas dos la barra solo ofrece «No importar».

**«No importar» deja afuera el juego entero en todos los grupos**, también en «¿Es de tu familia?»: antes ahí era «No importar esa copia», y dos botones con el mismo nombre que hacen cosas distintas confunden. Para cambiar el tipo de una copia sin responder la pregunta está «¿Cómo lo conseguiste?». «Otro tipo» sale de «¿Es de tu familia?» por lo mismo.

**Las explicaciones de los grupos** (la línea de arriba de la lista) dicen qué hace cada respuesta cuando no es obvio. La de «¿Lo vas a jugar alguna vez?»: «Los tenés en alguna tienda, pero no tienen puntaje o nunca los abriste. «No» los suma a tu biblioteca como «Sin interés»: no los ves en la lista, pero «¿Lo tengo?» sabe que son tuyos. «No importar» los deja afuera.». La regla general que estaba arriba de cada grupo («Cada juego ya tiene marcada nuestra sugerencia…») pasa a «Tocá una respuesta y el juego sigue a la próxima pregunta que le toque, o a «Listos para importar» si no le queda ninguna. Para responder lo mismo en varios, seleccionalos.».

«Sin puntaje» cuenta solo para lo que vino de IGN: lo que no vino de IGN nunca tiene puntaje, y si contara, ningún juego llegaría a «Elegí un estado». Un juego sin ninguna copia con horas conocidas (Steam desde Playnite) no cumple «0 h».

**Cómo llegó cada juego.** En los grupos 1 a 3 cada fila dice con qué nombre y año llegó, una línea por fila de cada fuente: «En IGN: Crash Bandicoot · 1996», «En Epic: Castlevania Anniversary Collection · 2019», «En Steam: Hades». Sin año, va solo el nombre. Un juego que junta el mismo nombre de varias fuentes (§10) muestra todas: «En IGN: Fortnite · 2017» y «En Epic: Fortnite · 2020». En los grupos de lote siguen los chips de origen («IGN · Beat · 9», «Steam · 48 h»).

**Los candidatos de un juego con varias filas** son los de todas sus filas en `candidates`, sin repetir el mismo juego base y hasta 5, en el orden de la primera fila. «¿Es este juego?» se pregunta si queda uno solo y ninguno de los nombres con que llegó es el suyo.

**Cómo va a entrar.** En «Listos para importar» cada juego dice qué va a quedar en la biblioteca, en una línea: «Entra como Pendiente · Epic Games · Gratis». Se suman «· Sin interés» y «· sin fin» si corresponden, y una copia por tienda separada con « · ». Un juego que ya está en la biblioteca dice «Ya está en tu biblioteca · suma Epic Games · Gratis». Un juego cargado a mano dice «Entra a mano como Completado». Lo que no es un juego dice «No se importa · no es un juego» (§8), y un juego que el usuario dejó afuera con «No importar», «No se importa». Los dos van sin portada (el círculo tachado), con el título en gris, y no cuentan en «En «Listos para importar»: N juegos y M copias».

**El aviso dice adónde fue el juego** (§15). Si fue a otro grupo, lo nombra: «LOVE pasó a «¿Lo vas a jugar alguna vez?».». Si fue a «Listos para importar», nombra cómo va a entrar, no el texto del botón: «Beholder pasó a «Listos para importar» con «Sin interés».» después de «No»; «con «Pendiente»» después de «Sí, algún día»; «con «Jugado · sin fin»» y «con «Completado»» en «¿Es sin fin?»; «con «Steam · Familia»» y «con «Steam · Comprado»» en «¿Es de tu familia?»; el nombre del estado o del candidato en los demás. En lote, si todos fueron al mismo grupo lo dice así («3 juegos pasaron a «Listos para importar».»); si no, cuenta cuántos fueron a cada uno: «3 juegos cambiaron de grupo: 2 a «¿Lo vas a jugar alguna vez?» y 1 a «Listos para importar».». Adónde fue cada juego sale de la revisión que devuelve la acción, buscándolo por sus filas, como ya hace «Volver a revisar». El foco pasa a la fila siguiente, para que la lista no salte bajo el dedo. La tarjeta de confirmar dice que «Confirmar importación» suma todo lo que está en «Listos para importar».

**«Volver a revisar»** borra todas las respuestas de ese juego, también un juego elegido (`chosen_igdb_id`, §4) y uno cargado a mano, y lo devuelve a su primera pregunta sin ninguna. El aviso dice adónde volvió: «Crash Bandicoot volvió a «¿Cuál de estos es?».». **Aparece en cualquier grupo** en un juego que tiene alguna respuesta (`ReviewGame.decided`): en «Listos para importar», como hasta ahora, y también en LOVE cuando pasó a «¿Lo vas a jugar alguna vez?» después de elegirlo. En «¿Cuál de estos es?» y «No lo encontré» nunca aparece, porque un juego ahí todavía no tiene respuesta.

- **Un juego que ya está en la biblioteca** no pasa por 5, 6 ni 7: su estado y su puntaje no se tocan. Si le faltan copias, va a «Listos para importar» diciendo qué copias suma. Si no le falta nada, no aparece, y el encabezado dice «312 ya estaban al día».
- **Un juego excluido** («No importar») ya no desaparece: queda en «Listos para importar» como «No se importa», con «Volver a revisar», que le borra el «No importar» y lo devuelve a su primera pregunta sin respuesta (spec «Arrepentirse de «No importar»»). Vale para cualquier grupo, también «¿Cuál de estos es?» y «No lo encontré», de a uno o en lote. Al confirmar sigue contando en «sin importar» y queda confirmado, como hasta ahora (§11). Hasta ahora no aparecía en ningún grupo: tocarlo por error no tenía vuelta atrás. En el modelo, `reviewGame` ya no devuelve `null` para un juego excluido: lo pone en «Listos para importar» con `excluded: true` y `decided: true`; lo que no es un juego sigue con `nonGame`. `ImportReview.excluded` lo sigue contando, aunque ahora también esté en «Listos para importar». El aviso de «No importar» no cambia: «Rocket League no se va a importar.».
- **La cuenta de Steam sin conectar:** las filas de Steam de Playnite esperan en «¿Es de tu familia?» con el aviso «Conectá tu cuenta de Steam para saber cuáles son tuyos» y sin acciones. Al conectarla se recalculan: las que la cuenta tiene se juntan con su copia y salen del grupo.
- **Acciones en lote, en PC y en el celu:** cada grupo tiene «Seleccionar» por fila y «Seleccionar todos». En los grupos de lote, la barra de selección ofrece las mismas respuestas que cada fila (en «Elegí un estado», también «Otro estado», que abre la lista para todos los seleccionados); tocar una la guarda en los seleccionados y cada uno pasa al grupo que le toque. En «¿Cuál de estos es?», «¿Cómo lo dejaste?» y «No lo encontré» la barra ofrece solo «No importar». Si los seleccionados tienen alguna respuesta, la barra ofrece también «Volver a revisar». En cualquier grupo, «¿Cómo lo conseguiste?» cambia el tipo de las copias de una tienda en los juegos elegidos (si la selección tiene más de una tienda, se elige cuál). `decideAction` recibe una lista de ids y una decisión, y el servicio la aplica en una sola consulta.
- **Sin «Pasar a Listos»:** la decisión `accept` y su texto desaparecen, y también `ReviewGame.marked`. Una decisión que no es una de las respuestas del grupo sigue dando `InvalidImportDecisionError`.

### 10. Reimportar y juntar fuentes

- **Guardar filas** es un upsert por `(user_id, source, source_key)`. Una fila que ya estaba y no está confirmada se actualiza (título, horas, estados de IGN) sin perder sus decisiones. Una fila ya confirmada no se toca ni vuelve a la revisión: «el resto queda igual».
- **Una fila nueva** cruza con IGDB y cae en el `import_entry` de su juego. Si ese juego ya se confirmó antes, el `import_entry` vuelve a abrirse solo para sumar las copias que falten.
- **Las copias se reconocen** por tienda más `store_game_id`, y además una tienda en la que el juego ya tiene copia no recibe otra (§8). Una copia cargada a mano antes de importar (sin `store_game_id`) cuenta igual: Hades con Steam a mano no recibe otra copia de Steam.
- **«No pisar lo que ya está»:** si el juego de IGDB ya está en la biblioteca, al confirmar solo se suman copias. Ni el estado ni el puntaje ni las correcciones cambian.
- **Los juegos de IGN se reconocen por su `ignId`** porque es el `source_key` de su fila: aunque IGDB cambie, una fila confirmada no se vuelve a importar.
- **«Traer de nuevo» de Steam** vuelve a pedir la lista y guarda las filas con la misma regla.

**Mismo nombre desde varias fuentes.** Los que cruzan solos ya se juntan por su juego de IGDB. Los que no cruzaron (`candidates` o `not_found`) se juntan **al cruzar, en el mismo `import_entry`**, como proponía Lucas: así una sola respuesta vale para todos sin tocar las decisiones, la confirmación ni «Cargar a mano», que ya trabajan sobre un juego a revisar con varias filas.

- **Qué es el mismo nombre:** la misma clave del título (§7), sin mirar fuente, tienda ni año. Cuenta el título con que llegó, no los alternativos de IGN, para no juntar de más. Que sean de distintas fuentes o tiendas sale solo: dos filas de la misma fuente con la misma clave son la misma copia (Steam de la cuenta y de Playnite), y también se juntan.
- **Quién decide** (`model/import/same-name.ts`, puro): para cada fila que queda en `candidates` o `not_found` en la tanda, busca primero otra de la misma tanda con la misma clave y después un juego a revisar abierto que **todavía espera respuesta**: sin `igdb_id`, sin respuestas, sin filas elegidas, con `copy_kind` y `excluded` vacíos, y con alguna fila en `candidates` o `not_found`. Si lo encuentra, la fila va a ese juego a revisar; si no, a uno nuevo, como hoy. El servicio le pasa al modelo los juegos a revisar abiertos (`listOpenReview`) además de las filas.
- **Si el mismo nombre ya se había respondido** (Fortnite de IGN ya elegido, excluido o cargado a mano cuando llega el archivo de Epic), la fila nueva no se junta: tiene su propia pregunta. Juntarla con una respuesta que el usuario dio sin verla haría justo lo que el requisito quiere evitar, sobre todo con «No importar».
- **El repositorio solo aplica:** `ItemMatch` de `candidates` y `not_found` suma a qué juego a revisar va (uno abierto, o el de otra fila de la tanda); `saveUnmatched` crea primero los nuevos y después muda las demás filas.
- **«Volver a revisar»** después de elegir devuelve juntas las filas que eligieron el mismo juego (§4).
- **Lo que no es un juego no se junta** (§8).

### 11. Confirmar

`confirmImportAction` confirma todo lo que está en «Listos para importar» en ese momento; los demás grupos siguen esperando. Es el único botón que confirma.

1. El servicio pide la revisión al repositorio, `planImportConfirmation` (`model/import/confirm.ts`) arma la lista de juegos nuevos, copias nuevas y marcas, y el repositorio la aplica en **una transacción**, con inserts en lote.
2. **Juego nuevo:** `library_game` con el estado sugerido o elegido, `status_since` = `clock.today()`, el puntaje, `not_interested` si se eligió «Sin interés», `endless = true` y el estado Jugado si se aceptó «sin fin», y la duración principal de HowLongToBeat en `hltb_hours` cuando la fila de IGN la trae (§16). Sin entrada del diario: el estado inicial no es un cambio (`02` §8). Si el usuario todavía no tiene estados, se crean los por defecto antes, como al agregar.
3. **Juego cargado a mano** desde «No lo encontré»: `catalog_game` manual con el título y el año de la fila, como «Agregar a mano».
4. **Copias:** con `origin = import`, `store_game_id`, el tipo y las horas; sin fecha.
5. **Marcas:** `confirmed_at` en las filas y los juegos, y `library_game_id` en cada `import_entry`.
6. **Limpieza:** en la misma transacción, lo que solo servía para revisar se borra de lo confirmado (§18). La fila queda con `source`, `source_key`, `confirmed_at` y en qué quedó (`match_state`, `excluded` y `entry_id`); el juego, con `igdb_id`, `catalog_game_id`, `library_game_id`, `excluded` y `confirmed_at`. Es lo que necesita «Reimportar sin duplicar».
7. **Resumen:** «Entraron 480 juegos y 520 copias · 60 marcados «Sin interés» · 4 sin importar», con plurales ICU. «Sin importar» cuenta los juegos y las copias excluidos en esta confirmación, también lo que no es un juego (§8). Si no había nada en «Listos para importar», el botón está deshabilitado y lo dice.

Son unas 1000 filas en el peor caso (480 juegos y 520 copias): en lote, muy por debajo de los 8 s por consulta. Si el plan pasara de `MAX_CONFIRM_ENTRIES` = 600 juegos, se confirma en tandas de ese tamaño, cada una en su transacción y con el resumen sumado.

### 12. Validación y errores

- **Zod** en las acciones y en el Route Handler: ids uuid, decisiones de una lista cerrada, el texto de Steam con trim y hasta 200 caracteres, el archivo con tipo `application/json` o sin tipo.
- **El servicio** verifica que cada id de la decisión sea del usuario (el repositorio filtra por `user_id`; un id ajeno o inexistente da `ImportEntryNotFoundError`).
- **El modelo** decide si una decisión vale para ese juego: elegir «Familia» en un juego sin copia de Steam o un candidato que no está en su lista da `InvalidImportDecisionError`.
- Errores nuevos, cada uno con su código y su texto en `errors` de los dos catálogos: `UnknownImportFileError`, `ImportFileTooLargeError`, `InvalidSteamProfileError` (lo pegado no es un link ni un SteamID; en `model/store/errors.ts`), `SteamProfileNotFoundError`, `SteamGamesPrivateError`, `SteamNotConfiguredError`, `SteamUnavailableError`, `SteamTimeoutError`, `ImportEntryNotFoundError` e `InvalidImportDecisionError`.

### 13. Idiomas

Todo texto nuevo va en `import` (pantalla) y `errors` (errores) de `es.json` y `en.json` en la misma tarea que lo usa. Los nombres de los grupos son los de la spec y en inglés se definen al implementar. Los títulos que vienen de los archivos, de Steam o de IGDB no se traducen.

### 14. Tests

- **Modelo:** cruce por título, no-juegos, búsqueda sin la edición, grupos y sus respuestas, juntar fuentes y nombres iguales, la regla de una copia por tienda y el plan de confirmación, con filas armadas en el test. Acá viven la mayoría de los escenarios de la spec.
- **Adapters:** IGN y Playnite con muestras chicas inventadas con el formato real: `tests/adapter/ign/ign-export-sample.json` (ya existe) y `tests/adapter/playnite/playnite-export-sample.json`, nueva, con unos 8 juegos (Epic con horas y sin horas, un ID con palabras, un Steam instalado que la cuenta tiene, uno que no, una beta, un soundtrack y un título entre corchetes, que desde los ajustes de datos reales se busca como cualquier otro). Steam e IGDB con MSW (`multiquery`, `external_games` y las respuestas de perfil privado y nombre inexistente).
- **Repositorios:** contra PGlite con las migraciones, con el test de «el usuario A no ve ni cambia nada del B» en `import_item`, `import_entry` y `store_connection`, el upsert sin duplicar y la transacción de confirmar entera o nada.
- **Servicio:** con repositorios y adapters falsos: la tanda de cruce, la reimportación y confirmar.
- **Componentes y hooks:** grupos, acciones de a uno y en lote, el aviso flotante, progreso y resumen, con `renderWithIntl`.
- **E2e** en `tests/e2e/import.spec.ts`, a 390 y 1440 px y en inglés (`@i18n`): subir los dos archivos de muestra, conectar Steam contra `tests/e2e/support/steam-server.mts`, resolver un juego de cada grupo, confirmar, ver el resumen y verificar la biblioteca; «Retomar la revisión» cerrando la página a la mitad; «Volver a revisar» después de elegir un candidato; «Empezar de nuevo»; las dos guías; y, desde los ajustes de datos reales, un mismo nombre de IGN y de Epic que se responde una vez, un título con la edición, lo que no es un juego en «Listos para importar», una respuesta en lote y, desde la tercera prueba, un juego elegido que pasa a «¿Lo vas a jugar alguna vez?» y vuelve con «Volver a revisar». Esos casos van en archivos propios de los e2e (`tests/e2e/support/`), para no cambiar las muestras de los adapters. El vencimiento se prueba en el servicio con un `clock` falso y contra PGlite, no en e2e: no se puede esperar 8 días. El servidor falso de IGDB suma `external_games` y `multiquery`.

### 15. Diseño de la pantalla

`design/Escritorio-Importar.dc.html` (1440 px) y `design/Movil-Importar.dc.html` (390 px), con su entrada en `design/canvas.json`. Siguen el estilo de Tiendas y Ajustes: título Space Grotesk, rótulos JetBrains Mono, tarjetas `#161A21` con borde `#2A303B`, acento lima para la acción principal y ámbar para lo que «no es tuyo».

- **Arriba, tres fuentes** como las tarjetas de Tiendas: IGN y Playnite con «Subir archivo» (y, ya leído, «303 juegos · leído el 23 nov» con «Subir otro») y el link «¿Cómo lo saco?» a su guía (§17), y Steam con el campo del perfil y «Conectar» (y, conectada, «412 juegos · Traer de nuevo»). En el celu, una fila por fuente dentro de una sola tarjeta.
- **Mientras cruza,** una barra de progreso con «Cruzando con IGDB · 120 de 540».
- **La revisión:** en PC, a la izquierda la lista de grupos con su cantidad (como el menú de Ajustes) y a la derecha el grupo elegido: la pregunta, una línea que explica por qué están ahí y qué hace cada respuesta, la barra de selección y una fila por juego. En los grupos de lote, la fila tiene su casilla de selección, portada, título, año, de dónde vino («IGN · Beat · 9», «Steam · 48 h», «Epic Games · Gratis · 0 h») y debajo sus respuestas como botones, todos iguales y ninguno marcado; «No importar» va último y en el color de quitar. En las preguntas de a un juego, la fila dice cómo llegó (una línea por origen) y las respuestas van debajo: los candidatos como tarjetas con portada, nombre completo y año, que bajan de renglón y ocupan el ancho que necesiten. En el celu, los grupos son botones que bajan de renglón (sin desplazamiento horizontal), las respuestas van debajo de cada juego y la barra de selección es la misma que en PC.
- **La barra de selección** dice cuántos hay elegidos y ofrece las respuestas del grupo (en las preguntas de a un juego, solo «No importar»), «Volver a revisar» si alguno tiene respuesta, «¿Cómo lo conseguiste?» y «Cancelar». No hay botón principal: ninguna respuesta pesa más que otra.
- **«Volver a revisar» en un grupo de lote** va en la fila, a la derecha del título, como botón sin borde (el mismo de «Listos para importar»). Las respuestas siguen debajo.
- **Textos largos.** Ningún título, candidato ni opción se corta con «…» ni desborda: bajan de renglón (`overflow-wrap: anywhere`, sin `white-space: nowrap` en las opciones). Los botones de opción crecen en alto, con 44 px como mínimo.
- **El aviso de cada acción** («X pasó a «Listos para importar» con …», «X pasó a «¿Lo vas a jugar alguna vez?».», «X volvió a «…»») es un aviso flotante fijo abajo, centrado y con el ancho del contenido, con `role="status"`. En el celu va encima de la barra de secciones. Dura 6 s (`TOAST_DURATION_MS`) o hasta la próxima acción, y no se lleva el foco. Así se ve aunque la fila ya no esté y aunque la lista sea larga.
- **«Empezar de nuevo»** va en el encabezado de «Revisión», a la derecha, como botón secundario, y pide confirmación (§18). Si la revisión venció, arriba de las fuentes queda el aviso de que se descartó.
- **Abajo,** «En «Listos para importar»: 237 juegos y 252 copias», la explicación de que se confirma todo lo que está ahí y «Confirmar importación», al final del contenido y no fijo, como «Guardar juego» en `02` §1: en el celu abajo está la barra de secciones. Después de confirmar, esa zona muestra el resumen.
- **En el grupo elegido del archivo de PC** («¿Cuál de estos es?»), Fortnite con sus dos orígenes, Crash Bandicoot con cinco candidatos y Castlevania con «¿Es este juego?».
- **Al final del archivo de PC,** como ejemplos aparte: «¿Cómo lo dejaste?»; «¿Lo vas a jugar alguna vez?» con su explicación, una fila con «Sí, algún día», «No» y «No importar», otra (LOVE, elegido en «¿Cuál de estos es?») con «Volver a revisar» a la derecha y su aviso «LOVE pasó a «¿Lo vas a jugar alguna vez?».», y la barra de selección con esas mismas respuestas; una fila de «¿Es de tu familia?» y una de «¿Es sin fin?»; «Listos para importar» con un juego, uno que ya estaba, uno que el usuario dejó afuera («No se importa») y lo que no es un juego («No se importa · no es un juego»); la confirmación de «Empezar de nuevo», el aviso de revisión vencida, la biblioteca vacía con «Agregá tu primer juego» e «Importar tu biblioteca», y la guía de IGN. Al final del archivo del celu, una fila de «Elegí un estado» con sus seis respuestas y la lista que abre «Otro estado», un juego de «Listos para importar», lo que no es un juego y la guía de Playnite.

### 16. Duración de HowLongToBeat

- `library_game.hltb_hours` guarda la duración principal de HowLongToBeat que vino de IGN. No es una corrección: si el usuario edita la duración, se guarda en `estimated_hours` como siempre y gana.
- `effectiveHours` pasa a ser «la tuya, si no la de IGDB, si no la de HowLongToBeat», como pide `decisiones.md` §7. Si después «Actualizar datos» trae una duración de IGDB, esa gana sola.
- `durationSource` suma `"hltb"` y la ficha muestra «unas 2.3 h · HowLongToBeat», con la clave nueva `game.duration.sources.hltb` en los dos catálogos. Los filtros y el orden por duración usan `effectiveHours`, así que también la cuentan.
- En el modelo, `hltbHours` es opcional en los datos del juego: los fixtures de los tests existentes no cambian.

### 17. Guías «¿Cómo lo saco?»

Dos páginas propias, `/import/guide/playnite` y `/import/guide/ign`, con el estilo de Ajustes, «Volver a Importar» arriba (`BackLink` de `02`) y sus textos en `import.guides` de los dos catálogos. No usan la base. Cada fuente de `/import` tiene el link «¿Cómo lo saco?» a la suya; Steam no tiene guía, porque se conecta con el link del perfil.

**Playnite** (`app/(app)/import/guide/playnite/page.tsx`):

Arriba de los pasos, una sola línea: «Playnite es un programa gratis para Windows que junta tus juegos de Epic, GOG, Steam y otras tiendas. Dejá Steam sin iniciar sesión: así lista lo que tenés instalado». La guía no explica cómo instalar Playnite ni cómo conectar las tiendas: eso es de Playnite.

1. Bajar el exportador PlayniteLibraryExport **desde la página de su autor** (link a su repositorio; Ludoteca no lo hospeda) e instalar el `.pext` con doble clic, con Playnite cerrado.
2. En Playnite, **Extensions › Playnite Library Exporter › Export library now**, en JSON.
3. Volver a Importar y subir el archivo en la fuente Playnite.

Los links externos abren en otra pestaña con `rel="noopener noreferrer"`.

**IGN** (`app/(app)/import/guide/ign/page.tsx`): IGN no tiene un botón para exportar, así que la guía ofrece un **marcador del navegador** (bookmarklet).

1. Arrastrar el botón «Exportar de IGN» a la barra de favoritos.
2. Entrar a la lista de juegos en IGN, con la sesión abierta.
3. Tocar el marcador: el navegador descarga `ign-export.json`.
4. Volver a Importar y subir el archivo en la fuente IGN.

- **Qué hace el marcador:** corre en la pestaña de www.ign.com y pide los datos a la API de IGN, `POST https://mollusk.apis.ign.com/graphql` con `credentials: "include"`: la sesión va en las cookies del navegador, sin encabezado `Authorization` ni tokens. Arma un archivo con el formato de `tests/adapter/ign/ign-export-sample.json` (`records[]` con `ignId`, `name`, `alt`, `year`, `status`, `flags`, `score`, `steamId`, `hltb` y los demás campos del export), que `readIgnExport` acepta sin cambios. Lo descarga con un `Blob` y un link con `download`. **No manda nada a Ludoteca ni a terceros**: el único destino es la API de IGN.
- **Cómo pide los datos** (lo revisó Lucas con su cuenta, 303 juegos): la API acepta consultas escritas a mano. `searchLibrary` trae la biblioteca de a `count` = 100, con `cursor` numérico (`nextCursor` mientras `hasNext`); `usersReviewsByObjectIds` trae los puntajes de a 100 ids (solo vuelven los que tienen). `hl2bData` es un escalar JSON con `steam_id`, `itch_id` («0» es que no tiene) y `time` (`main`, `main_plus`, `completionist`, en segundos, que pasan a horas con un decimal). El año es el de la fecha más vieja entre todos los lanzamientos de todas las regiones, y `status` sale de las marcas como en el archivo de siempre (`completed` → `beat`, `archived` → `quit`). La muestra de los tests (`tests/adapter/ign/ign-api-sample.json`) es inventada con esa forma.
- **Si algo falla, avisa y no descarga:** fuera de ign.com, sin la sesión abierta (la API contesta con `errors`), con un error de red o con la lista vacía, el marcador muestra un aviso en el idioma del usuario en lugar de bajar un archivo vacío.
- **Dónde vive:** `adapter/ign/ign-bookmarklet.ts`. Tiene la traducción de lo que devuelve IGN a un registro del export, como función pura con su test, y `buildIgnBookmarklet()`, que arma el `javascript:…` a partir de una función sin imports. El test de ida y vuelta corre esa función contra una respuesta falsa de IGN y comprueba que `readIgnExport` lee el archivo que descarga.
- **React 19 bloquea los links `javascript:`** en `href`. El componente del marcador (`components/import/BookmarkletLink.tsx`) recibe el código por props y pone el `href` desde un efecto, con `setAttribute`. Se puede arrastrar pero no seguir dentro de Ludoteca: al tocarlo ahí, la guía explica que se usa desde IGN.
- **Aviso en la guía:** el marcador depende de cómo arma IGN su página. Si cambia, puede dejar de andar; la guía lo dice y pide avisar para arreglarlo.

### 18. Empezar de nuevo y vencimiento de la revisión

**Qué se borra.** «Empezar de nuevo» y el vencimiento hacen lo mismo: `discardOpenReview` del repositorio borra, en una transacción, los `import_item` y los `import_entry` del usuario sin `confirmed_at`. Eso es todo lo de los archivos subidos, lo traído de Steam y las decisiones sin confirmar. Lo que no toca:

- **Lo confirmado:** filas y juegos con `confirmed_at`. Es lo que hace que reimportar no duplique («Lo ya importado se conserva»). Una fila confirmada que apuntaba a un juego a revisar que se borra queda con `entry_id` vacío (`on delete set null`), y la siguiente fila de ese juego crea otro.
- **`store_connection`:** la cuenta de Steam sigue conectada. La tarjeta de Steam pasa a decir «Cuenta conectada» con «Traer de nuevo», sin cantidad.
- **La biblioteca y el catálogo compartido.**

**Las fuentes muestran solo la revisión abierta.** `summarizeSources` cuenta solo filas sin confirmar, así que después de empezar de nuevo, o de confirmar todo, las fuentes vuelven a «Subir archivo».

**«Empezar de nuevo».** Un botón en el encabezado de «Revisión», visible si hay algo sin confirmar. Antes de borrar pide confirmación con el `ConfirmDialog` de `02`:

- Título: «¿Empezar de nuevo?».
- Texto: «Se borran los archivos que subiste, lo que trajiste de Steam y lo que decidiste sin confirmar. Tu biblioteca y lo que ya importaste no cambian.».
- Botón: «Empezar de nuevo».

Después, el aviso flotante dice «Empezaste de nuevo: la revisión quedó vacía.». Va por `discardReviewAction`, que llama a `discardReview` del servicio.

**Cuándo vence.** Pasa `REVIEW_EXPIRY_DAYS` = 7 días (en `model/import/`) sin que el usuario toque la importación:

- **Qué cuenta como tocarla:** subir un archivo, traer de Steam, decidir un juego, buscar con otro nombre o confirmar. Cada una de esas acciones del servicio termina con `touchOpenReview`, que renueva el `updated_at` de las filas sin confirmar en una sola consulta. Hace falta porque reimportar el mismo archivo o confirmar una parte no escriben nada en las filas que quedan.
- **El cruce en tandas no cuenta:** no es una acción del usuario, aunque escriba filas.
- **La regla es pura**, en `model/import/expiry.ts`: `isReviewExpired(lastActivityDay, today)` compara días de calendario en la zona horaria de la app. Vence si hoy es posterior al último día de actividad más 7: «8 días después» vence; «cada 3 días» no.
- **El último día de actividad** es el `updated_at` más reciente de las filas sin confirmar (`lastOpenActivityAt` del repositorio), pasado a día con `appDateOf` de `shared/clock.ts`. Nunca `new Date()` en el modelo ni en el servicio.

**Cuándo se chequea.** Al abrir `/import`: la página llama a `openImport` del servicio en lugar de `getOverview`.

- Si la revisión venció, la descarta como «Empezar de nuevo» y devuelve la revisión vacía con `expired: true`.
- En esa misma carga, la pantalla muestra arriba de las fuentes un aviso que no se va solo: «Tu revisión anterior se descartó porque pasaron 7 días sin tocarla.».
- No hace falta un cron por ahora: una revisión vencida que nadie abre no molesta a nadie.
- Las acciones que refrescan la revisión siguen usando `getOverview`, sin chequear: quien está usando la pantalla la está tocando.

**Limpieza al confirmar** (§11, paso 6). En lo confirmado se vacían `title` (queda `''`, la columna no admite vacío), `alt_titles`, `year`, `store_id`, `store_game_id`, `playtime_minutes`, `ign_statuses`, `ign_score`, `hltb_main_hours`, `steam_app_id`, `candidates`, `chosen_igdb_id` y `copy_kind` de las filas, y las respuestas y `multiplayer_only` de los juegos. Así lo confirmado no guarda datos que ya no se usan, y la revisión solo pesa mientras está abierta. «Confirmado que no vuelve» sale de lo que queda: la fila de IGN de Hollow Knight sigue con su `ignId` como `source_key` y `confirmed_at`, así que reimportar la reconoce aunque el juego ya no esté en la biblioteca.

## Risks / Trade-offs

- **[El `uid` de Epic en IGDB no es el app name de Playnite]** → Los 209 juegos de Epic cruzan por título. Se verifica contra IGDB real en la primera tarea del adapter; el diseño no cambia, solo crecen «¿Cuál de estos es?» y «No lo encontré».
- **[Un título cruza con el juego equivocado]** (otro juego con el mismo nombre, de otro año) → Solo cruza solo con clave idéntica y un único resultado; con dos del mismo nombre, pregunta. Desde esta revisión el año no frena el cruce, porque el de Epic es el de la tienda: un remake con el mismo nombre que su original puede cruzar con el equivocado. Se ve en «Listos para importar» («Entra como…», con el año de IGDB) y se arregla después con «Vincular con IGDB» de la ficha.
- **[La lista de sufijos deja pasar algo o se come un juego real]** («Demo» podría ser parte de un nombre) → El sufijo solo cuenta al final del título, y una fila que no encuentra su base no se descarta en silencio: queda a la vista en «Listos para importar» como «No se importa · no es un juego», y «Volver a revisar» la trae para cargarla igual.
- **[Dos juegos distintos con el mismo nombre se juntan]** (Doom de 1993 en IGN y Doom de 2016 en Epic) → Una sola respuesta vale para los dos. La pregunta muestra cada origen con su año, así que se nota; el año no sirve para separarlos solos porque el de Epic es el de la tienda (§7). Si pasa, se elige uno y el otro se corrige después desde la ficha. Solo se juntan los que no cruzaron: dos que cruzan solos con juegos distintos de IGDB quedan separados.
- **[Un título con la edición cruza con la ficha equivocada]** → Lo encontrado sin la edición nunca cruza solo: el usuario ve el candidato y elige.
- **[La lista se mueve mientras se revisa]** (cada decisión saca la fila del grupo) → El aviso flotante nombra el juego y adónde fue, el foco pasa a la fila siguiente y «Volver a revisar» en «Listos para importar» deshace, también un candidato elegido.
- **[Cientos de filas de catálogo de juegos que no se importan]** → Son datos públicos de IGDB y el catálogo ya es compartido. No pesan en el plan gratis (un par de miles de filas).
- **[El exportador de Playnite cambia de formato]** → Se valida `schemaVersion = 1`; otra versión da «No reconozco este archivo» en lugar de importar datos raros.
- **[La clave de Steam queda en un log]** → Va en la query de la URL, así que el adapter nunca registra URLs ni respuestas; los errores se loguean con el código HTTP solamente.
- **[Un juego de IGN con dos filas de IGN para el mismo juego de IGDB]** → Las dos caen en el mismo `import_entry`; si sus estados difieren, se juntan como «dos estados» y va a «¿Cómo lo dejaste?».

- **[Una respuesta se toca sin leer]** (ya no hay nada marcado, pero se puede tocar la primera) → Cada respuesta está dicha en palabras y el aviso flotante dice cómo va a entrar; «Volver a revisar» la deshace.
- **[Se borra una revisión a medias sin querer]** → «Empezar de nuevo» pide confirmación y dice qué se borra; el vencimiento solo actúa después de 7 días sin tocarla y lo avisa en la próxima visita. Lo confirmado nunca se borra.
- **[El marcador de IGN deja de andar]** (IGN cambia su página o su API interna) → La guía lo avisa y la importación de archivos sigue igual; se arregla el marcador. El marcador solo lee lo que la página de IGN ya muestra y no guarda nada fuera del navegador.

## Migration Plan

1. Migraciones nuevas generadas por drizzle-kit: `store_connection`, `import_item`, `import_entry`, sus enumerados, `store_game_id`, `origin` y la única de `copy`, `hltb_hours` de `library_game`, y una más para `chosen_igdb_id` de `import_item` (§4). Ninguna edita una ya aplicada.
2. Paso del usuario: `STEAM_API_KEY` en `.env.local` y en las variables de Vercel (`docs/configuracion-externa.md`, etapa 04, se actualiza con el nombre).
3. Vuelta atrás: la app de `03` ignora las tablas nuevas y las columnas nuevas de `copy` y `library_game` son opcionales, así que un deploy anterior sigue andando con la base migrada.

