# Design

## Context

`01-base` dejó andando las capas, la sesión, la navegación y los e2e con Auth falso y PGlite. `/library` y `/add` todavía muestran «Próximamente», y no hay tablas con datos de usuario. El motivo del cambio está en `proposal.md`.

Hechos verificados en la documentación oficial que condicionan el enfoque:

- **IGDB** se consulta con `POST https://api.igdb.com/v4/<endpoint>` y admite 4 pedidos por segundo (si no, 429) y 8 abiertos. `version_parent` es «el juego principal de esta edición»; `parent_game` es otra cosa (DLC, expansiones). La duración sale de `game_time_to_beats.normally`, en segundos. `category` está deprecado a favor de `game_type`, con los mismos valores.
- **El token de Twitch** se pide por `client_credentials`, dura unos dos meses (`expires_in`) y, si deja de valer, la API responde 401.
- **Vercel Hobby** incluye 5.000 transformaciones de imagen por mes; pasado ese número, las imágenes nuevas fallan con 402.
- **Las Server Actions** aceptan 1 MB por defecto y se despachan en serie.

Tests existentes que condicionan la implementación:

- Varios e2e de `01-base` usan `getByRole("searchbox")` en `/library` y esperan uno solo.
- «Llamado a la acción» espera que la cuenta de prueba por defecto tenga la biblioteca vacía.
- «Recorrido con tabulador» no contempla `select`. El usuario autorizó cambiar ese archivo (§15).

## Goals / Non-Goals

**Goals:**

- Que la biblioteca entera viva en el navegador, con reglas puras en `model/` que después reusen `05-lo-tengo` y `07-pwa`.
- Que todo cambio que toque varias tablas sea atómico.
- Que tests y e2e corran sin credenciales de IGDB ni de Supabase Storage.

**Non-Goals:**

- Diario visible, formulario de motivo, reseña, etiquetas, estados editables y total de horas a mano (`06`). Acá solo se guarda el registro de cambios de estado.
- Aviso de duplicados, «Dónde comprarlo» y «¿Lo tengo?» (`05`).
- Importación y cruce masivo con IGDB (`03`); sincronización y links a la tienda (`04`).
- Virtualizar la lista: no hace falta una dependencia para «cientos o pocos miles» de juegos (§7).

## Decisions

### 1. Pantallas y diferencias con el diseño

Donde la spec y el diseño no coinciden, manda la spec.

| Pantalla | Referencia | Diferencias |
|---|---|---|
| Biblioteca (PC) | `design/Main.dc.html` | Filtros de selección múltiple y rango de puntaje (`decisiones.md` §5). El buscador del encabezado sigue llevando a ¿Lo tengo?, como dejó `01-base`, y la búsqueda por título es un campo propio de la biblioteca. Los filtros pasan al costado desde 1024 px (lo pide la spec), no por `flex-wrap`. Suma «Mostrar sin interés» y «Seleccionar». Sin aviso de duplicado, «2 COPIAS» ni «Dónde comprarlo» (`05`), sin motivo en la tarjeta ni «Editar estados» (`06`), sin «Conectar otra tienda» (`04`). |
| Biblioteca (celu) | `design/Movil-Biblioteca.dc.html` | El campo de arriba filtra por título: ¿Lo tengo? ya está en la barra inferior. Las pestañas de grupo se suman entre sí, igual que en PC, y bajan de renglón en lugar de desplazarse de costado (`CLAUDE.md`: sin desplazamiento horizontal desde 360 px). «A MANO» y «SIN INTERÉS» van como etiqueta, porque en una portada de 48 px no entran. Suma «Ordenar por» y «Seleccionar», que la spec pide y el lienzo no muestra. |
| Tarjeta (ambas) | Las dos anteriores | Etiquetas con tienda y tipo completos («Game Pass · Suscripción»), sin las abreviaturas del celu. Una copia perdida se ve tachada con esa misma etiqueta, no como «Steam · ya no»; así lo define la spec. |
| Filtros (celu) | `design/Movil-Filtros.dc.html` | Es una ventana emergente a pantalla completa, no una ruta: necesita la biblioteca en memoria para decir «Ver 5 juegos». Suma cantidades por opción (la spec las pide) y «Mostrar sin interés». Los filtros se aplican al tocarlos, y la X y el botón solo cierran. |
| Agregar (PC) | `design/Escritorio-Agregar.dc.html` | «Agregado» no deshace (la spec no lo pide): es un link a la ficha. Los resultados ya cargados suman «Agregar una copia». Los valores del prototipo no son iniciales: tienda vacía, «Todavía no lo tengo», año vacío y estado «Según las copias». Con «Familia» aparece «De quién es». |
| Agregar y Agregar a mano (celu) | `design/Movil-Agregar.dc.html`, `design/Movil-AgregarManual.dc.html` | Las mismas. Suma «Pegar link». «Guardar juego» va al final del formulario, no fijo abajo: ahí está la barra de secciones que la spec de navegación exige en todas las pantallas. |
| Ficha | `design/Escritorio-Juego.dc.html`, `design/Movil-Juego.dc.html` | Sin etiquetas, diario ni reseña (`06`), sin género (no es un dato del catálogo), sin «Abrir» (`04`) ni «Compartir» (sin spec). El número del puntaje es un campo, porque la spec prevé escribirlo, y suma «Quitar puntaje». Suma las acciones de cada copia, «Editar», «Vincular con IGDB», «Actualizar datos», «Marcar sin interés», «Quitar de la biblioteca» y el link a IGDB. |
| Cambiar estado | `design/Escritorio-Estado.dc.html`, `design/Movil-Estado.dc.html` | Sin formulario de motivo ni «Editar o crear estados» (`06`). Suma «Jugado». Los textos no nombran la reseña ni el diario, que todavía no se ven. |
| Sin lienzo | — | Agregar copia, «Ya no lo tengo», eliminar copia, quitar de la biblioteca, editar datos, vincular y selección múltiple. Se arman con los tokens y la ventana emergente. |

### 2. Rutas

| Ruta | Contenido |
|---|---|
| `/library` | Biblioteca, con los filtros en la URL. |
| `/add` | Búsqueda y, desde 768 px, el formulario a mano. |
| `/add/manual` | Formulario a mano para el celu. |
| `/games/[id]` | Ficha. Un id mal formado, inexistente o ajeno muestra «No encontramos este juego». `?copy=new` abre el diálogo de copia. |
| `/api/igdb/search?q=` | Búsqueda en IGDB (Route Handler). |

La búsqueda es un GET y no una Server Action para poder cancelar el pedido viejo mientras se escribe: las acciones van en serie y no se abortan. El handler verifica la sesión, igual que las acciones.

`sectionForPath` marca Biblioteca también en `/games/*`, como el diseño.

### 3. Archivos y carpetas nuevos fuera del árbol de `CLAUDE.md`

Se proponen con este diseño y se crean al aprobarlo:

- `adapter/igdb/` (con `dto/`) y `adapter/supabase-storage/`.
- `components/library/`, `components/game/`, `components/copy/` y `components/ui/` (ventana emergente, interruptor y aviso).
- `tests/adapter/` y `tests/e2e/support/igdb-server.mts`.

Contextos: `game` (catálogo, biblioteca, puntaje y filtros), `copy`, `store`, `status` y `journal`. `shared/clock.ts`, previsto en `CLAUDE.md`, se crea ahora porque ya hay quien lo use.

### 4. Modelo de datos: cada etapa crea lo que usa

Todas las tablas llevan id uuid, `created_at`, `updated_at` y RLS sin políticas.

| Tabla | Columnas | Restricciones |
|---|---|---|
| `store` | `user_id` (vacío en las conocidas), `name`, `slug` | Única `(user_id, slug)` con `nulls not distinct` |
| `status` | `user_id`, `status_group`, `name`, `color`, `position`, `system_key` | Única `(user_id, system_key)` |
| `catalog_game` | `igdb_id`, `source`, `owner_id`, `title`, `year`, `developer`, `cover_url`, `page_url`, `estimated_hours`, `endless` | `igdb_id` único |
| `library_game` | `user_id`, `catalog_game_id`, `status_id`, `status_since`, `score`, `not_interested`; correcciones: `estimated_hours`, `endless`, `cover_url` | Única `(user_id, catalog_game_id)` |
| `copy` | `user_id`, `library_game_id`, `store_id`, `kind`, `acquired_on`, `playtime_minutes`, `family_owner`, `lost_at`, `lost_reason` | Cascada al borrar el juego |
| `journal_entry` | `user_id`, `library_game_id`, `kind`, `occurred_on`, `from_status_id`, `to_status_id` | Cascada al borrar el juego |
| `provider_token` | `provider`, `access_token`, `expires_at` | `provider` único; sin dueño |

- **Lo que no se crea todavía:** `review`, `played_minutes_manual`, `store_game_id`, `origin`, `subscription_id`, `intentional_duplicate`, `store.sync`, `status.hidden`, `status.asks_reason` y los campos de sesión del diario. Cada uno llega con su etapa, con una migración que Drizzle genera sola.
- **`parent_id` tampoco se crea.** Una edición se guarda como su juego base, y `version_parent` viene en cada respuesta de IGDB: no hay nada que recordar. Si `03` lo necesita, lo agrega.
- **Diferencias con `decisiones.md` §4:** la columna es `status_group` porque `group` es palabra reservada, y `copy` y `journal_entry` llevan `user_id`, como exige `CLAUDE.md`.
- **Sin FK a `auth.users`:** PGlite no tiene ese esquema y los tests usan las migraciones reales.
- **Todo lo que cuelga de `library_game` se borra en cascada.** «Quitar de la biblioteca» depende de eso (§8), así que las tablas de etapas futuras que apunten a un juego (`game_tag`, `price_seen`) tienen que declarar la misma cascada.
- **Enumerados cerrados con `pgEnum`:** tipo de copia, motivo de pérdida, grupo, origen y tipo de entrada del diario.
- **Decimales:** `score` es `numeric(3,1)` y las duraciones `numeric(6,1)`, con `mode: "number"`, para evitar errores de punto flotante en la base.
- **SQL crudo, a aprobar con este diseño:** una migración custom inserta las 12 tiendas conocidas con `on conflict do nothing`. Drizzle no modela datos iniciales, y así existen también en los tests. Es el único caso de esta etapa.

Las tablas compartidas (`catalog_game` de IGDB, tiendas conocidas, `provider_token`) son la excepción a «cada consulta filtra por usuario». Un juego cargado a mano tiene `owner_id`, y sus consultas filtran por él.

### 5. Catálogo y correcciones

Se muestra lo tuyo si existe y, si no, lo del catálogo: funciones puras en `model/game/` sobre las columnas de `library_game`, donde vacío significa «usá el catálogo». Actualizar desde IGDB reescribe solo la fila del catálogo, así que las correcciones no se pueden pisar.

Vincular apunta `library_game` a la fila de IGDB y borra la fila manual, en una transacción. Si el usuario ya tiene ese juego de IGDB, se rechaza con `GameAlreadyInLibraryError`: fusionar dos juegos no está pedido.

Agregar devuelve una unión `added | already_in_library`, no un error: «ya lo tenés» no es un fallo, y la pantalla ofrece agregar una copia. La marca «En tu biblioteca» se calcula con el id base, así una edición también se reconoce.

«Sin fin» como estado y `endless` como marca son independientes, igual que en el prototipo (Stardew Valley está en «Sin fin» y tiene duración).

### 6. Adapter de IGDB

- **Búsqueda:** `search "<texto>"; fields name,first_release_date,cover.image_id,version_parent; where game_type = (0,4,8,9,10,11); limit 10;`. Esos tipos son juegos que se pueden tener (principal, expansión independiente, remake, remaster, expandido y port); deja afuera DLC, bundles, mods y similares. El texto escapa las comillas para que no altere la consulta.
- **Al agregar:** pide el juego base y su `game_time_to_beats` en paralelo. El desarrollador es la primera compañía con `developer: true`.
- **Portadas:** `t_cover_big` para guardar y `t_cover_small` en los resultados.
- **Token:** se guarda en `provider_token` (`decisiones.md` §2), con una copia en memoria. El adapter recibe un `tokenStore` por parámetro y lo arma `instance.ts`: el adapter sigue sin conocer la base. Con un 401, renueva el token y reintenta una vez.
- **Errores:** 429, 5xx, red y timeout se convierten en errores propios con mensaje en español.
- **Límite de 4 por segundo:** con 300 ms de espera entre teclas y cancelación, un usuario no lo alcanza. El control por lotes es de `03`.
- **Variables:** `getIgdbEnv()` y `getStorageEnv()` van aparte de `getServerEnv()`. Sin credenciales, la biblioteca sigue andando y los tests existentes de `parseServerEnv` no cambian. `IGDB_API_URL` y `TWITCH_TOKEN_URL` son opcionales, para el servidor falso de e2e.

### 7. La biblioteca en el navegador

La página trae toda la biblioteca como datos planos y un hook aplica filtros, orden y resumen con funciones de `model/game/`. Los filtros viven en la URL con `window.history.replaceState`: no van al servidor y sobreviven a la vuelta desde la ficha.

Reglas que la spec deja abiertas, tomadas del prototipo:

- Tienda y tipo se evalúan por separado sobre las copias del juego: Civilization VI (Epic gratis, Steam comprado) aparece con Steam + Gratis.
- La tienda cuenta todas las copias, también las perdidas. Los tipos cuentan solo las vigentes y «Ya no lo tengo», solo las perdidas.
- Las cantidades de cada opción son sobre toda la biblioteca visible, no sobre el resultado de los otros filtros.
- El resumen nunca cuenta los «Sin interés»; las cantidades de los filtros los suman con «Mostrar sin interés» activo.
- Las horas jugadas son la suma de `playtime_minutes` de las copias. `06` completa la regla.

Hay un solo DOM para cada juego: `GameCard` pasa de lista a grilla con CSS, como la navegación en `01-base`. Con `content-visibility: auto` en cada tarjeta y carga diferida de imágenes alcanza para miles de juegos.

El filtro por título es `type="text"`: dos `searchbox` romperían los e2e de `01-base`, y el del encabezado es el de ¿Lo tengo?.

### 8. Un cambio, una transacción

El modelo decide y el repositorio aplica todo junto. `planStatusChange(game, target, today)` devuelve el nuevo estado y la entrada del diario, y un método del repositorio los escribe en una transacción. Lo mismo vale para agregar un juego con su copia, agregar una copia que saca al juego de «Quiero jugarlo», vincular con IGDB y quitar de la biblioteca.

Por eso un repositorio puede escribir `journal_entry`. La alternativa era compartir la transacción entre repositorios, y eso obligaría al servicio a conocer Drizzle.

El estado inicial de un juego nuevo no se registra: no es un cambio. El paso automático a «Pendiente» sí.

**Quitar de la biblioteca.** El servicio busca el juego (si no existe o es ajeno, `GameNotFoundError`) y `planGameRemoval(game)` decide si la fila del catálogo también se va: solo la de un juego cargado a mano, que nadie más puede tener. Un método del repositorio aplica el plan en una transacción:

1. Borra `library_game`, filtrando por id y `user_id`. El puntaje y las correcciones están en esa fila; las copias y el diario se van por la cascada de §4.
2. Si el plan lo indica, borra la fila de `catalog_game`, filtrando por id y `owner_id`. Va segunda porque `library_game` la referencia.

- Si falla cualquiera de los dos pasos, el juego queda entero.
- La fila de un juego de IGDB queda siempre, aunque nadie más lo tenga: es catálogo compartido.
- Volver a agregar el juego crea un `library_game` nuevo, sin nada del anterior.
- Las tiendas que el usuario escribió se conservan: son opciones suyas, no datos del juego.
- «Ya no le aparece al buscar» se refiere a la búsqueda por título de la biblioteca: la de Agregar solo consulta IGDB, donde un juego a mano nunca estuvo.

La Server Action redirige a `/library` con `redirect()` fuera del manejador de errores, igual que el cierre de sesión.

### 9. Fechas

`clock.today()` devuelve la fecha en `America/Argentina/Buenos_Aires`: Vercel corre en UTC, y a las 22 h de Buenos Aires ya sería el día siguiente. Las fechas viajan como `YYYY-MM-DD`.

La **fecha de fin no es una columna**. Pasar a un estado de Terminado siempre fija `status_since` en hoy, así que coincide con ella mientras el juego siga en ese grupo. Guardarla aparte duplicaría el dato.

El formato («28 oct», «mar 2023») usa una tabla propia de meses: `Intl` en `es-AR` varía entre Node y navegadores y podría dar desajustes de hidratación.

### 10. Estados y colores

Los estados por defecto se definen en `model/status/` y se insertan al primer uso si el usuario no tiene ninguno, con `on conflict do nothing`. Hacerlo en el callback de ingreso dejaría afuera a quien ya tiene la sesión abierta desde `01-base`.

`status.color` guarda una clave de paleta (`lime`, `amber`, `gray`, `blue`, `coral`) que `06` va a poder editar. `StatusBadge` suma una prop opcional `color`; sin ella usa el grupo, y sus tests siguen valiendo.

### 11. Puntaje

`normalizeScore` redondea a un decimal y lanza `ScoreOutOfRangeError`. La barra (Radix Slider) guarda al soltar, y los botones y el campo guardan con una espera breve, con estado optimista. Sin puntaje, se muestra «Sin puntaje» con la barra en 0, y el primer toque lo define.

### 12. Portadas

- Se muestran con `next/image` y `unoptimized`: las imágenes ya vienen del tamaño justo, y optimizarlas agotaría el cupo gratis (Context). Si un link pegado falla, se ven las iniciales.
- **Subida:** una Server Action con `FormData` valida JPEG, PNG o WebP de hasta 2 MB, con `bodySizeLimit: "3mb"`, y el adapter sube al bucket público `covers`, en `<user_id>/<uuid>`. Se sube al elegir el archivo y el formulario solo manda la URL.
- **Secret key solo en el servidor.** La alternativa, usar la sesión del usuario con políticas sobre `storage.objects`, no se puede versionar ni probar: PGlite no tiene ese esquema.
- El color de las iniciales sale de un hash del título sobre los seis tonos de `design/Escritorio-Agregar.dc.html`, llevados a `tokens.css`.

### 13. Errores y validación

Errores con nombre por contexto en `model/<contexto>/errors.ts`, y los del proveedor en su adapter. Pedir algo ajeno da el mismo error que algo inexistente (`GameNotFoundError`). El servicio verifica que el estado y la tienda elegidos sean del usuario o conocidos.

Un hook `useServerAction` envuelve las acciones que devuelven datos, con `pending` y mensaje de error. Los avisos como «Frostpunk pasó a «Pendiente»» son un `role="status"` propio.

### 14. Primitivas e interfaz

Radix solo para ventana emergente, barra e interruptor, como pide `CLAUDE.md`. Los desplegables son `select` nativos, como en el diseño. La selección múltiple es un modo de la biblioteca: las tarjetas pasan a ser botones con `aria-pressed` y aparece una barra con la acción.

### 15. Tests y e2e

- Vitest suma `adapter` al proyecto Node; los adapters se prueban con MSW.
- **E2e:** un servidor falso de Twitch e IGDB, igual que el de Auth, por variables de entorno. Las subidas no van por e2e: se prueban en el adapter y en el servicio.
- **Cuentas:** cada test nuevo usa una cuenta propia, que `db-server.mts` habilita con una orden HTTP (`pglite-socket` serializa por consulta, así que se puede). La cuenta por defecto queda vacía.
- Los escenarios que dependen de horas de tienda se prueban en modelo y componentes: hasta `03` no hay interfaz que las cargue.
- **`tests/e2e/accessibility.spec.ts`, con el «sí» del usuario:** suma `select` a la lista de controles y sus funciones pasan a `tests/e2e/support/`, con un parámetro opcional para sumar controles. La ficha lo usa para incluir el control de la barra del puntaje.

### 16. Dependencias

| Dependencia | Por qué |
|---|---|
| `msw` | Previsto en el stack; `01-base` lo dejó para cuando hubiera adapters. |
| `@radix-ui/react-dialog`, `@radix-ui/react-slider`, `@radix-ui/react-switch` | Las tres primitivas previstas en `decisiones.md` §2. Paquetes sueltos, para no sumar el resto. Aceptan React 19. |

`@supabase/supabase-js`, ya instalado, se usa para Storage.

## Risks / Trade-offs

- **[Riesgo] No está confirmado qué devuelve `search` con 2 o 3 letras**, y sin credenciales no se puede probar. → La puesta en marcha lo verifica con «hol». Si no sirve, para textos cortos se usa el prefijo documentado `where name ~ "hol"*`, un cambio que queda dentro del adapter.
- **[Riesgo] La secret key de Supabase tiene acceso total.** → Solo se lee en el adapter, por `getStorageEnv()`, y nunca lleva prefijo `NEXT_PUBLIC_`.
- **[Riesgo] Una biblioteca muy grande pesa en la primera carga.** → Se trae solo lo que la tarjeta muestra. Si con miles de juegos se nota, se agrega paginado en memoria sin tocar el modelo.
- **[Limitación] El límite de 4 por segundo no se coordina entre instancias de Vercel.** → Para un usuario no cambia nada; un 429 se muestra como error reintentable.
- **[Limitación] Un juego de Steam quitado vuelve con la próxima sincronización** (`04`, «Juegos nuevos de Steam»): como se borra todo, no queda registro de que lo quitaste. También puede volver al reimportar (`03`). → Para ocultarlo de forma estable está «Sin interés», que la sincronización respeta. Si hace falta recordar los quitados, se define en esas etapas.
- **[Limitación] Hasta `03` y `06` todas las horas jugadas valen 0.** → Filtro y orden ya funcionan con los datos que haya.
- **[Trade-off] Quedan portadas huérfanas** si se reemplazan, si se quita el juego o si se abandona el formulario después de subir: Storage no entra en la transacción de la base. Con el tope de 2 MB, y siendo una app personal, no justifica una limpieza.
- **[Trade-off] Sin FK a `auth.users`:** borrar un usuario en Supabase deja sus filas. Con registro cerrado, se borran a mano.

## Migration Plan

Las migraciones solo agregan tablas, y `allowed_email` no se toca. Puesta en marcha, con los pasos del usuario detallados en `tasks.md`:

1. Crear la app de Twitch, el bucket `covers` y copiar la secret key (`docs/configuracion-externa.md`).
2. Cargar las variables en `.env.local` y en Vercel.
3. Correr `npm run db:migrate` contra Supabase. El orden con el deploy importa: **primero la migración**, porque el código nuevo consulta las tablas nuevas.

Los estados por defecto se crean solos en el primer uso.

**Vuelta atrás:** Vercel permite volver al deploy anterior, que ignora las tablas nuevas. No hace falta revertir la migración.
