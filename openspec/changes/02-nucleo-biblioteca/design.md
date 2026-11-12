# Design

## Context

`01-base` dejó andando las capas, la sesión, la navegación y los e2e con Auth falso y PGlite. `/library` y `/add` todavía muestran «Próximamente», y no hay tablas con datos de usuario. El motivo del cambio está en `proposal.md`.

Hechos verificados en la documentación oficial que condicionan el enfoque:

- **IGDB** se consulta con `POST https://api.igdb.com/v4/<endpoint>` y admite 4 pedidos por segundo (si no, 429) y 8 abiertos. `version_parent` es «el juego principal de esta edición»; `parent_game` es otra cosa (DLC, expansiones). La duración sale de `game_time_to_beats.normally`, en segundos. `category` está deprecado a favor de `game_type`, con los mismos valores.
- **El token de Twitch** se pide por `client_credentials`, dura unos dos meses (`expires_in`) y, si deja de valer, la API responde 401.
- **Vercel Hobby** incluye 5.000 transformaciones de imagen por mes; pasado ese número, las imágenes nuevas fallan con 402.
- **Las Server Actions** aceptan 1 MB por defecto y se despachan en serie.
- **Fluid compute suspende la instancia entre pedidos**, y mientras está suspendida no corren los timeouts de inactividad del pool: las conexiones quedan abiertas o muertas sin que el pool lo sepa. `attachDatabasePool` de `@vercel/functions` cierra las conexiones ociosas antes de la suspensión. La guía de Vercel usa `pg` en sus ejemplos, no nombra a postgres.js, recomienda unos 5 s de inactividad y desaconseja un pool de 1.
- **El transaction pooler de Supabase (Supavisor, puerto 6543) no aplica la configuración de sesión.** `pg` manda `statement_timeout` como parámetro de inicio, y Supavisor descarta esos parámetros en silencio (issue supabase/supavisor#1272; Supabase documenta que la configuración de sesión no funciona en el puerto 6543). Lo único que llega es lo del rol (`alter role … set statement_timeout`). El rol `postgres` no tiene uno propio: lo corta el tope global de 2 min.
- **Next 16** acepta `maxDuration` en `layout`, `page` y `route`. Las Server Actions toman el de la página donde se usan. `error.tsx` recibe `retry()` (estable desde 16.3), que vuelve a pedir los datos del segmento.
- **El popover nativo de HTML** (`popover` y `popovertarget`) se cierra solo tocando afuera o con Escape y vuelve a cerrarse tocando el botón. React 19 lo tipa. jsdom no lo implementa.

Lo que pasó en producción el 11/11: desde las 20:43, los 19 pedidos a `/library` y `/games/[id]` terminaron en «Task timed out after 300 seconds», mientras `/check` y `/subscriptions`, que no usan la base, andaban. A las 20:46:09, un `select … from "status" where user_id = $1` falló con 57014 (`statement_timeout`), es decir, el tope global de 2 min. La lectura más probable, compatible con todo lo anterior: postgres.js no tenía tiempos máximos, y con parámetros de tipo desconocido manda la consulta en dos idas y vueltas (`Describe` primero y después `Bind` y `Execute`). Una instancia suspendida entre las dos deja la sentencia abierta en el servidor hasta los 2 min, y al despertar reusa sockets que ya no sirven: cada pedido espera hasta el límite de Vercel.

Tests existentes que condicionan la implementación:

- Varios e2e de `01-base` usan `getByRole("searchbox")` en `/library` y esperan uno solo.
- «Llamado a la acción» espera que la cuenta de prueba por defecto tenga la biblioteca vacía.
- «Recorrido con tabulador» no contempla `select`. El usuario autorizó cambiar ese archivo (§15).
- Los tests de interfaz que esperan la etiqueta junto al puntaje se ajustan con el «sí» del usuario (§11). Cualquier otro test existente que haya que tocar, se pregunta antes.
- «varias consultas y transacciones a la vez comparten la única conexión de PGlite» (`db-timeouts.test.ts`) falla siempre en GitHub Actions (§17). El arreglo toca ese test y espera el «sí» del usuario.
- Los fixtures de `LibraryGame` (`tests/model/game/library-fixtures.ts`) arman el tipo completo: sumarle las horas a mano (§20) obliga a darles un valor por defecto, también con el «sí» del usuario.

## Goals / Non-Goals

**Goals:**

- Que la biblioteca entera viva en el navegador, con reglas puras en `model/` que después reusen `06-lo-tengo` y `08-pwa`.
- Que todo cambio que toque varias tablas sea atómico.
- Que tests y e2e corran sin credenciales de IGDB ni de Supabase Storage.
- Que ninguna consulta espere para siempre: si la base no responde, la pantalla avisa en menos de 15 s y ofrece reintentar.

**Non-Goals:**

- Diario visible, notas, formulario de motivo, reseña, etiquetas, estados editables, etiquetas del puntaje y total de horas a mano (`07`). Acá solo se guarda el registro de cambios de estado.
- Aviso de duplicados, «Dónde comprarlo» y «¿Lo tengo?» (`06`).
- Importación y cruce masivo con IGDB (`04`); sincronización y links a la tienda (`05`).
- Textos en inglés y catálogos de mensajes (`03`).
- Virtualizar la lista: no hace falta una dependencia para «cientos o pocos miles» de juegos (§7).

## Decisions

### 1. Pantallas y diferencias con el diseño

Donde la spec y el diseño no coinciden, manda la spec.

| Pantalla | Referencia | Diferencias |
|---|---|---|
| Biblioteca (PC) | `design/Main.dc.html` | Filtros de selección múltiple y rango de puntaje (`decisiones.md` §5). El buscador del encabezado sigue llevando a ¿Lo tengo?, como dejó `01-base`, y la búsqueda por título es un campo propio de la biblioteca. Los filtros pasan al costado desde 1024 px (lo pide la spec), no por `flex-wrap`. Suma «Mostrar sin interés», «Seleccionar», el tipo «Otro» en «Cómo lo tenés» y la ayuda «?» (§18). Sin aviso de duplicado, «2 COPIAS» ni «Dónde comprarlo» (`06`), sin motivo en la tarjeta ni «Editar estados» (`07`), sin «Conectar otra tienda» (`05`). |
| Biblioteca (celu) | `design/Movil-Biblioteca.dc.html` | El campo de arriba filtra por título: ¿Lo tengo? ya está en la barra inferior. Las pestañas de grupo se suman entre sí, igual que en PC, y bajan de renglón en lugar de desplazarse de costado (`CLAUDE.md`: sin desplazamiento horizontal desde 360 px). «A MANO» y «SIN INTERÉS» van como etiqueta, porque en una portada de 48 px no entran. Suma «Ordenar por» y «Seleccionar», que la spec pide y el lienzo no muestra. |
| Tarjeta (ambas) | Las dos anteriores | Etiquetas con tienda y tipo completos («Game Pass · Suscripción»), sin las abreviaturas del celu; una copia Otro con detalle muestra el detalle («Steam · Regalo»). Una copia perdida se ve tachada con esa misma etiqueta, no como «Steam · ya no»; así lo define la spec. El puntaje es solo el número. |
| Filtros (celu) | `design/Movil-Filtros.dc.html` | Es una ventana emergente a pantalla completa, no una ruta: necesita la biblioteca en memoria para decir «Ver 5 juegos». Suma cantidades por opción (la spec las pide), «Mostrar sin interés», el tipo «Otro» y la ayuda «?». Los filtros se aplican al tocarlos, y la X y el botón solo cierran. |
| Agregar (PC) | `design/Escritorio-Agregar.dc.html` | Las copias van en «Dónde y cómo lo tenés», una fila por copia (§19), en lugar del desplegable de tienda y los botones de tipo. Suma el puntaje opcional con los controles de la ficha, «Horas jugadas» opcional (§20), «Año de lanzamiento» y «Duración (h)» con su ayuda, y «opcional» en los campos de texto opcionales. Los valores del prototipo no son iniciales: sin copias, año vacío, estado «Según las copias» y sin puntaje. Agregar un resultado de IGDB abre el mismo formulario, sin título, año ni portada (§19). Los resultados ya cargados suman «Agregar una copia». |
| Agregar y Agregar a mano (celu) | `design/Movil-Agregar.dc.html`, `design/Movil-AgregarManual.dc.html` | Las mismas. Suma «Pegar link». «Guardar juego» va al final del formulario, no fijo abajo: ahí está la barra de secciones que la spec de navegación exige en todas las pantallas. |
| Ficha | `design/Escritorio-Juego.dc.html`, `design/Movil-Juego.dc.html` | Sin etiquetas, diario ni reseña (`07`), sin género (no es un dato del catálogo), sin «Abrir» (`05`) ni «Compartir» (sin spec). El puntaje es solo el número, sin la etiqueta del lienzo, y el número es un campo, porque la spec prevé escribirlo; suma «Quitar puntaje». Suma las acciones de cada copia, «Editar», «Vincular con IGDB», «Actualizar datos», «Marcar sin interés», «Quitar de la biblioteca», el link a IGDB, las horas jugadas a mano (§20) y la ayuda «?» de «A MANO», «Sin interés», «Ya no lo tengo» y «Duración». |
| Cambiar estado | `design/Escritorio-Estado.dc.html`, `design/Movil-Estado.dc.html` | Sin formulario de motivo ni «Editar o crear estados» (`07`). Suma «Jugado». Los textos no nombran la reseña ni el diario, que todavía no se ven. |
| Aviso de datos que no cargan | — | `error.tsx` con «No pudimos cargar tus datos. Probá de nuevo.» y «Reintentar» (§17), con los tokens. |
| Sin lienzo | — | Agregar copia, «Ya no lo tengo», eliminar copia, quitar de la biblioteca, editar datos, vincular, selección múltiple, el formulario de agregar desde IGDB y la ayuda «?». Se arman con los tokens y la ventana emergente. |

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

Las páginas y rutas que usan la base (`/library`, `/games/[id]`, `/add`, `/add/manual`, `/api/igdb/search` y `/auth/callback`) declaran `maxDuration = 20` (§17). Las Server Actions lo toman de su página.

### 3. Archivos y carpetas nuevos fuera del árbol de `CLAUDE.md`

Se proponen con este diseño y se crean al aprobarlo:

- `adapter/igdb/` (con `dto/`) y `adapter/supabase-storage/`.
- `components/library/`, `components/game/`, `components/copy/` y `components/ui/` (ventana emergente, interruptor, aviso y ayuda «?»).
- `tests/adapter/`, `tests/e2e/support/igdb-server.mts`, `tests/persistence/support/stalled-postgres.ts` y `tests/persistence/support/stallable-pooler.ts` (§15 y §17).

Contextos: `game` (catálogo, biblioteca, puntaje y filtros), `copy`, `store`, `status` y `journal`. `shared/clock.ts`, previsto en `CLAUDE.md`, se crea ahora porque ya hay quien lo use.

### 4. Modelo de datos: cada etapa crea lo que usa

Todas las tablas llevan id uuid, `created_at`, `updated_at` y RLS sin políticas.

| Tabla | Columnas | Restricciones |
|---|---|---|
| `store` | `user_id` (vacío en las conocidas), `name`, `slug` | Única `(user_id, slug)` con `nulls not distinct` |
| `status` | `user_id`, `status_group`, `name`, `color`, `position`, `system_key` | Única `(user_id, system_key)` |
| `catalog_game` | `igdb_id`, `source`, `owner_id`, `title`, `year`, `developer`, `cover_url`, `page_url`, `estimated_hours`, `endless` | `igdb_id` único |
| `library_game` | `user_id`, `catalog_game_id`, `status_id`, `status_since`, `score`, `not_interested`, `played_minutes_manual`; correcciones: `estimated_hours`, `endless`, `cover_url` | Única `(user_id, catalog_game_id)` |
| `copy` | `user_id`, `library_game_id`, `store_id`, `kind`, `kind_detail`, `acquired_on`, `playtime_minutes`, `family_owner`, `lost_at`, `lost_reason` | Cascada al borrar el juego |
| `journal_entry` | `user_id`, `library_game_id`, `kind`, `occurred_on`, `from_status_id`, `to_status_id` | Cascada al borrar el juego |
| `provider_token` | `provider`, `access_token`, `expires_at` | `provider` único; sin dueño |

- **Lo que no se crea todavía:** `review`, `store_game_id`, `origin`, `subscription_id`, `intentional_duplicate`, `store.sync`, `status.hidden`, `status.asks_reason` y los campos de sesión y nota del diario. Cada uno llega con su etapa, con una migración que Drizzle genera sola.
- **`parent_id` tampoco se crea.** Una edición se guarda como su juego base, y `version_parent` viene en cada respuesta de IGDB: no hay nada que recordar. Si `04` lo necesita, lo agrega.
- **Diferencias con `decisiones.md` §4:** la columna es `status_group` porque `group` es palabra reservada, y `copy` y `journal_entry` llevan `user_id`, como exige `CLAUDE.md`.
- **Sin FK a `auth.users`:** PGlite no tiene ese esquema y los tests usan las migraciones reales.
- **Todo lo que cuelga de `library_game` se borra en cascada.** «Quitar de la biblioteca» depende de eso (§8), así que las tablas de etapas futuras que apunten a un juego (`game_tag`, `price_seen`) tienen que declarar la misma cascada.
- **Enumerados cerrados con `pgEnum`:** tipo de copia, motivo de pérdida, grupo, origen y tipo de entrada del diario.
- **Tipo «Otro» (migración nueva):** `copy_kind` suma `other` y `copy` suma `kind_detail` (texto, vacío salvo en Otro). El tope de 40 caracteres es una regla del modelo (`KindDetailTooLongError`), no de la columna, igual que el resto de los textos. La migración ya aplicada no se edita: drizzle-kit genera una nueva con `alter type … add value`, que en Postgres 12 o más corre dentro de la transacción del migrador mientras nadie use el valor en esa misma transacción.
- **Horas jugadas a mano (otra migración nueva):** `library_game` suma `played_minutes_manual` (entero, vacío si no hay total a mano), con el nombre que ya tenía en `decisiones.md` §4. Se guardan minutos, como `copy.playtime_minutes`: una hora con un decimal es siempre un múltiplo de 6 minutos, así que no se pierde nada, y `07` suma las sesiones en la misma unidad (§20).
- **Decimales:** `score` es `numeric(3,1)` y las duraciones `numeric(6,1)`, con `mode: "number"`, para evitar errores de punto flotante en la base.
- **SQL crudo, a aprobar con este diseño:** una migración custom inserta las 12 tiendas conocidas con `on conflict do nothing`. Drizzle no modela datos iniciales, y así existen también en los tests. Es el único caso de esta etapa.

Las tablas compartidas (`catalog_game` de IGDB, tiendas conocidas, `provider_token`) son la excepción a «cada consulta filtra por usuario». Un juego cargado a mano tiene `owner_id`, y sus consultas filtran por él.

### 5. Catálogo y correcciones

Se muestra lo tuyo si existe y, si no, lo del catálogo: funciones puras en `model/game/` sobre las columnas de `library_game`, donde vacío significa «usá el catálogo». Actualizar desde IGDB reescribe solo la fila del catálogo, así que las correcciones no se pueden pisar.

Vincular apunta `library_game` a la fila de IGDB y borra la fila manual, en una transacción. Si el usuario ya tiene ese juego de IGDB, se rechaza con `GameAlreadyInLibraryError`: fusionar dos juegos no está pedido.

Agregar devuelve una unión `added | already_in_library`, no un error: «ya lo tenés» no es un fallo, y la pantalla ofrece agregar una copia. La marca «En tu biblioteca» se calcula con el id base, así una edición también se reconoce.

«Sin fin» como estado y `endless` como marca son independientes, igual que en el prototipo (Stardew Valley está en «Sin fin» y tiene duración).

**Año de lanzamiento.** `releaseYearRange(today)` en `model/game/` devuelve de 1950 al año siguiente al de `clock.today()`, y `ReleaseYearOutOfRangeError` lleva el mensaje con los dos extremos («Poné un año entre 1950 y 2027»). Zod en la acción solo verifica que sea un entero; el rango lo decide el modelo, porque depende de la fecha.

### 6. Adapter de IGDB

- **Búsqueda:** `search "<texto>"; fields name,first_release_date,cover.image_id,version_parent; where (game_type = (0,4,8,9,10,11) | version_parent != null); limit 10;`. Esos tipos son juegos que se pueden tener (principal, expansión independiente, remake, remaster, expandido y port); deja afuera DLC, bundles, mods y similares. Las ediciones entran aunque IGDB las marque como bundle («Platinum Edition» es `game_type = 3`), porque tienen `version_parent` y se guardan como su juego base: sin eso, «Agregar una edición» no se cumplía con datos reales. El texto escapa las comillas para que no altere la consulta.
- **Textos de 2 o 3 letras:** `search` busca palabras enteras, y contra IGDB real «hol» no trae Hollow Knight. Hasta 3 letras se busca por el comienzo del nombre, ordenado por popularidad: `where name ~ "hol"* & (…mismo filtro…); sort total_rating_count desc;`. Verificado contra IGDB real: trae Hollow Knight y Hollow Knight: Silksong primero.
- **Al agregar:** pide el juego base y su `game_time_to_beats` en paralelo. El desarrollador es la primera compañía con `developer: true`.
- **Portadas:** `t_cover_big` para guardar y `t_cover_small` en los resultados.
- **Token:** se guarda en `provider_token` (`decisiones.md` §2), con una copia en memoria. El adapter recibe un `tokenStore` por parámetro y lo arma `instance.ts`: el adapter sigue sin conocer la base. Con un 401, renueva el token y reintenta una vez.
- **Errores:** 429, 5xx, red y timeout se convierten en errores propios con mensaje en español.
- **Límite de 4 por segundo:** con 300 ms de espera entre teclas y cancelación, un usuario no lo alcanza. El control por lotes es de `04`.
- **Variables:** `getIgdbEnv()` y `getStorageEnv()` van aparte de `getServerEnv()`. Sin credenciales, la biblioteca sigue andando y los tests existentes de `parseServerEnv` no cambian. `IGDB_API_URL` y `TWITCH_TOKEN_URL` son opcionales, para el servidor falso de e2e.

### 7. La biblioteca en el navegador

La página trae toda la biblioteca como datos planos y un hook aplica filtros, orden y resumen con funciones de `model/game/`. Los filtros viven en la URL con `window.history.replaceState`: no van al servidor y sobreviven a la vuelta desde la ficha.

Reglas que la spec deja abiertas, tomadas del prototipo:

- Tienda y tipo se evalúan por separado sobre las copias del juego: Civilization VI (Epic gratis, Steam comprado) aparece con Steam + Gratis.
- La tienda cuenta todas las copias, también las perdidas. Los tipos cuentan solo las vigentes y «Ya no lo tengo», solo las perdidas. «Otro» incluye las copias Otro con y sin detalle.
- Las cantidades de cada opción son sobre toda la biblioteca visible, no sobre el resultado de los otros filtros.
- El resumen nunca cuenta los «Sin interés»; las cantidades de los filtros los suman con «Mostrar sin interés» activo.
- Las horas jugadas son el total a mano si existe; si no, la suma de `playtime_minutes` de las copias, que hasta `05` vale 0. `07` completa la regla con las sesiones. Un juego sin copias pero con total a mano entra en el filtro y el orden por horas.

Hay un solo DOM para cada juego: `GameCard` pasa de lista a grilla con CSS, como la navegación en `01-base`. Con `content-visibility: auto` en cada tarjeta y carga diferida de imágenes alcanza para miles de juegos.

El filtro por título es `type="text"`: dos `searchbox` romperían los e2e de `01-base`, y el del encabezado es el de ¿Lo tengo?.

### 8. Un cambio, una transacción

El modelo decide y el repositorio aplica todo junto. `planStatusChange(game, target, today)` devuelve el nuevo estado y la entrada del diario, y un método del repositorio los escribe en una transacción. Lo mismo vale para agregar un juego con sus copias y su puntaje, agregar una copia que saca al juego de «Quiero jugarlo», vincular con IGDB y quitar de la biblioteca.

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

`status.color` guarda una clave de paleta (`lime`, `amber`, `gray`, `blue`, `coral`) que `07` va a poder editar. `StatusBadge` suma una prop opcional `color`; sin ella usa el grupo, y sus tests siguen valiendo.

### 11. Puntaje

`normalizeScore` redondea a un decimal y lanza `ScoreOutOfRangeError`. El puntaje se muestra solo con el número, en la tarjeta y en la ficha. `scoreLabel` y sus tests se quedan en `model/game/` sin usarse en la interfaz: los retoma `07` como opción de Ajustes. Los tests de interfaz que hoy esperan la etiqueta («0.0 · Horrible») se ajustan con el «sí» del usuario; ningún otro.

Los controles se separan en dos piezas, para que el formulario de agregar use los mismos que la ficha:

- **`ScoreInput`** (controlado): número grande, barra, ±0.1 y «Quitar puntaje». Recibe `value` y `onChange` y no guarda nada. Sin puntaje muestra «Sin puntaje» con la barra en 0, y el primer toque lo define.
- **La ficha** lo envuelve con el guardado: la barra guarda al soltar, y los botones y el campo, con una espera breve y estado optimista, como hasta ahora.

**Barra (Radix Slider).** Radix mantiene la manija dentro de la barra según su ancho medido. Como la manija mide 44 px (la zona táctil) y el círculo visible 16 px (el del input nativo de Chromium que usa el lienzo), el círculo queda corrido del valor y no llega a los bordes. Se corrige sin achicar la zona táctil:

- El centro del círculo va donde lo pone el input nativo del lienzo: `r + p · (ancho − 2r)`, con `p` entre 0 y 1 y `r` el radio. Dentro de la manija, eso es un corrimiento de `(p − 0.5) · (44 − 16)` px, que se calcula del valor y se pasa por una variable CSS.
- El relleno termina en el centro del círculo: se dibuja con un gradiente en la barra con la misma fórmula, en lugar del `Range` de Radix.
- Se verifica midiendo contra el `.dc.html` en 0.0, 5.0 y 10.0, en los dos anchos: el e2e busca el círculo en los píxeles de una captura, porque el del input nativo no tiene caja en el DOM.

### 12. Portadas

- Se muestran con `next/image` y `unoptimized`: las imágenes ya vienen del tamaño justo, y optimizarlas agotaría el cupo gratis (Context). Si un link pegado falla, se ven las iniciales.
- **Subida:** una Server Action con `FormData` valida JPEG, PNG o WebP de hasta 2 MB, con `bodySizeLimit: "3mb"`, y el adapter sube al bucket público `covers`, en `<user_id>/<uuid>`. Se sube al elegir el archivo y el formulario solo manda la URL.
- **Secret key solo en el servidor.** La alternativa, usar la sesión del usuario con políticas sobre `storage.objects`, no se puede versionar ni probar: PGlite no tiene ese esquema.
- El color de las iniciales sale de un hash del título sobre los seis tonos de `design/Escritorio-Agregar.dc.html`, llevados a `tokens.css`.

### 13. Errores y validación

Errores con nombre por contexto en `model/<contexto>/errors.ts`, y los del proveedor en su adapter. Pedir algo ajeno da el mismo error que algo inexistente (`GameNotFoundError`). El servicio verifica que el estado y la tienda elegidos sean del usuario o conocidos.

Un hook `useServerAction` envuelve las acciones que devuelven datos, con `pending` y mensaje de error. Los avisos como «Frostpunk pasó a «Pendiente»» son un `role="status"` propio.

La base que no responde tiene su propio error, `DatabaseUnavailableError` (§17). El manejador único de `shared/` busca el `AppError` también en la cadena de `cause`, porque Drizzle envuelve los errores del driver en `DrizzleQueryError`.

### 14. Primitivas e interfaz

Radix solo para ventana emergente, barra e interruptor, como pide `CLAUDE.md`. Los desplegables son `select` nativos, como en el diseño. La ayuda «?» usa el popover nativo de HTML, no una primitiva de Radix (§18). La selección múltiple es un modo de la biblioteca: las tarjetas pasan a ser botones con `aria-pressed` y aparece una barra con la acción.

**Campos opcionales.** Cada campo de texto opcional de los formularios de agregar, editar y copia dice «opcional» como placeholder: link de la página, año de lanzamiento, duración, link de la portada, «De quién es» y el detalle de Otro. El título y el nombre de una tienda «Otra» no lo dicen, porque son obligatorios. En «Editar», la duración del catálogo, que hoy es el placeholder, pasa a un texto debajo del campo («IGDB: unas 22 h»).

### 15. Tests y e2e

- Vitest suma `adapter` al proyecto Node; los adapters se prueban con MSW.
- **E2e:** un servidor falso de Twitch e IGDB, igual que el de Auth, por variables de entorno. Las subidas no van por e2e: se prueban en el adapter y en el servicio.
- **Cuentas:** cada test nuevo usa una cuenta propia, que `db-server.mts` habilita con una orden HTTP (`pglite-socket` serializa por consulta, así que se puede). La cuenta por defecto queda vacía.
- **Base de los e2e:** `pglite-socket` admite una sola conexión y no sirve con varias (mezcla los mensajes del protocolo extendido). Por eso la app entra por un pooler en modo transacción, como Supavisor (`tests/persistence/support/stallable-pooler.ts`), que le presta esa única conexión de a una consulta o de a una transacción entera. Así los e2e corren con el mismo pool de 10 que producción.
- **Base trabada a pedido:** el pooler se traba con una orden HTTP de `db-server.mts`. Trabado, cada conexión que le habla queda sin respuesta para siempre, que es lo que ve la app con un socket muerto; las que estaban quietas siguen sanas. Así se prueban los escenarios de «Aviso cuando los datos no cargan» (§17).
- Los escenarios que dependen de horas de tienda se prueban en modelo y componentes: hasta `04` no hay interfaz que las cargue.
- **`tests/e2e/accessibility.spec.ts`, con el «sí» del usuario:** suma `select` a la lista de controles y sus funciones pasan a `tests/e2e/support/`, con un parámetro opcional para sumar controles. La ficha lo usa para incluir el control de la barra del puntaje.
- **La ayuda «?»** se prueba en componentes (que cada botón abra su texto) y en e2e (Escape y foco), porque jsdom no implementa el popover.

### 16. Dependencias

| Dependencia | Por qué |
|---|---|
| `msw` | Previsto en el stack; `01-base` lo dejó para cuando hubiera adapters. |
| `@radix-ui/react-dialog`, `@radix-ui/react-slider`, `@radix-ui/react-switch` | Las tres primitivas previstas en `decisiones.md` §2. Paquetes sueltos, para no sumar el resto. Aceptan React 19. |
| `pg` y `@types/pg` | Reemplazan a `postgres` (postgres.js), que se quita (§17). Es el driver de los ejemplos de Vercel y de `drizzle-orm/node-postgres`. |
| `@vercel/functions` | Para `attachDatabasePool` (§17). |

`@supabase/supabase-js`, ya instalado, se usa para Storage.

### 17. Conexión a la base

**`pg` en lugar de postgres.js.** No hay una razón fuerte para quedarse con postgres.js, y hay dos para irse. Su cola por conexión no tiene tiempo máximo y manda las consultas con parámetros en dos idas y vueltas, que es justo lo que una instancia suspendida deja a medias (Context). Además, Vercel solo documenta `attachDatabasePool` con `pg`. Con `pg`, cada consulta es una sola ida y vuelta (`Parse`, `Bind`, `Execute` y `Sync` juntos), con sentencias sin nombre que el transaction pooler acepta.

`persistence/db.ts` arma un pool global con `drizzle-orm/node-postgres`:

| Opción | Valor | Para qué |
|---|---|---|
| `max` | `DATABASE_POOL_MAX` (10 por defecto) | Supavisor reparte estas conexiones, así que no pesan en Postgres. Con 3, una ficha trabada (3 consultas en paralelo) ocupaba todo el pool y la pantalla siguiente se cansaba de esperar. Vercel desaconseja 1. |
| `idleTimeoutMillis` | 5000 | Lo que recomienda Vercel para Fluid compute. |
| `connectionTimeoutMillis` | 5000 | Corta tanto el conectar como la espera de un lugar libre en el pool. |
| `query_timeout` | 8000 | Corta del lado del cliente. Es el único tope garantizado a través del transaction pooler. Con 10 s, el aviso llegaba al navegador entre 10,5 y 15,2 s según la carga. |
| `keepAlive` | `true` | Para que el sistema detecte antes un socket muerto. |

- **`attachDatabasePool(pool)`** cierra las conexiones ociosas antes de que la instancia se suspenda. Fuera de Vercel no debería hacer nada; se verifica al implementar.
- **El pool vive en `globalThis`**, como ahora: Next arma un bundle por tipo de ruta, y cada uno abriría su propio pool.
- **Un cliente cuya consulta venció no vuelve al pool: se destruye.** `pg` deja ese cliente con la consulta colgada, y una transacción de Drizzle lo devolvería al pool sin avisar; el siguiente pedido lo heredaría. Además, Drizzle manda el `begin` fuera de su `try`: si falla, nunca devuelve el cliente. La conexión lo devuelve por su cuenta, y el `release` posterior no hace nada.
- **`statement_timeout` no se manda desde el cliente.** Supavisor lo descartaría en silencio, y tenerlo en el código haría creer que corta. El tope del servidor va como configuración del rol (`alter role postgres set statement_timeout = '8s'`, y `idle_in_transaction_session_timeout` para liberar una transacción que quedó abierta). Es un paso del usuario, con su verificación a través del pooler (`tasks.md`).
- **`maxDuration = 20`** en las páginas y rutas con base (§2), en lugar de los 300 s por defecto. Con 5 s para conectar y 8 s por consulta, el aviso llega antes de los 15 s que pide la spec, con margen.

**La espera de un lugar libre en el pool.** En `pg-pool`, `connectionTimeoutMillis` también corta la espera en la fila cuando los `max` clientes están ocupados (`node_modules/pg-pool/index.js`, el temporizador del `PendingItem`): un pedido que no consigue cliente en ese tiempo falla con «timeout exceeded when trying to connect», que es `DatabaseUnavailableError`. Es lo que se quiere: con todo el pool ocupado más de 5 s, la base no está respondiendo a tiempo para nadie.

- **En producción** (pool de 10 por defecto, o el valor de `DATABASE_POOL_MAX`): un pedido falla por la fila solo si los 10 clientes de esa instancia siguen ocupados después de 5 s, es decir, si hay 10 consultas lentas a la vez. Con consultas normales, de milisegundos, la fila se vacía enseguida. Con un pool de 3 pasa lo mismo, con más chances de llenarse: una ficha usa 3 consultas en paralelo. Las dos esperas se suman: en el peor caso, un pedido espera 5 s en la fila y 8 s en la consulta, 13 s, todavía antes de los 15 s de la spec. El usuario ve «No pudimos cargar tus datos.» o «No pudimos guardar el cambio.», con «Reintentar».
- **Por qué el test falla en GitHub Actions y no en local.** El test usa `SHORT_TIMEOUT_MS` (300 ms) también como espera en la fila, y manda 6 pedidos a un pool de 3: tres esperan en la fila. PGlite corre en el mismo hilo que el pool, así que cualquier tramo largo de PGlite frena el event loop entero. Cuando se libera, Node atiende los temporizadores vencidos antes que los datos del socket que ya llegaron, y el pedido de la fila falla aunque su cliente esté por quedar libre. En local los 6 pedidos tardan 15 a 30 ms; con todos los núcleos ocupados por otros procesos falló 1 de cada 4 corridas. El runner de GitHub tiene pocos núcleos y Vitest corre a la vez los otros archivos que levantan PGlite y aplican migraciones. No es un defecto de `db.ts`: en producción Postgres corre en otro servidor y no frena el event loop de la app.
- **Arreglo, con el «sí» del usuario:** ese test verifica que los pedidos comparten la única conexión, no los tiempos. Pasa a usar los tiempos por defecto (`DATABASE_TIMEOUTS`, 5 s y 8 s), con los que el event loop tendría que quedar frenado segundos para fallar. Los tests que sí miden los tiempos siguen con 300 ms. No cambia código de producción.

**Un error con nombre.** `DatabaseUnavailableError` (código `DATABASE_UNAVAILABLE`) vive en `shared/app-error.ts`, junto a los otros errores transversales. Se reconoce por una marca con `Symbol.for` y no con `instanceof`: el pool es uno solo para todo el proceso, así que el error sale con la clase del bundle que lo creó, y el manejador de una acción vive en otro. Su mensaje es el de un cambio que no se guarda: «No pudimos guardar el cambio. Probá de nuevo.». `persistence/db.ts` reconoce lo que significa «la base no respondió» (los timeouts de `pg`, 57014, las clases 08 y 57P y los errores de red del socket) y lo convierte en ese error. Así el manejador de `shared/` no conoce el driver: solo busca un `AppError` en la cadena de `cause`.

**Las pantallas.** `app/(app)/error.tsx` muestra «No pudimos cargar tus datos. Probá de nuevo.» y «Reintentar» (`retry()`), para cualquier error de una página de la app. En producción, Next no deja ver al navegador qué error fue. Las acciones devuelven el mensaje de `DatabaseUnavailableError` por el manejador único, y la pantalla deja el dato como estaba, porque el guardado optimista vuelve atrás al fallar.

**Cómo se prueba la cuelga.** PGlite es una sola sesión: no puede tener un lock tomado por otra conexión, y su `statement_timeout` no se puede probar. En su lugar:

- **Test de persistencia:** `tests/persistence/support/stalled-postgres.ts` es un servidor TCP que completa el saludo de Postgres y nunca responde las consultas, como un socket muerto. El test arma la base real de `db.ts` contra ese servidor y verifica que una consulta falla con `DatabaseUnavailableError` en el tiempo previsto, en lugar de esperar. También verifica que no conectar falla por `connectionTimeoutMillis`, y que, después de un fallo, el pool no reusa el cliente trabado. Se escribe antes del cambio de driver y debe fallar con postgres.js: esa es la reproducción.
- **E2e:** con el pooler trabable de §15, los cuatro escenarios de «Aviso cuando los datos no cargan», en los dos anchos.

### 18. Ayuda «?»

`components/ui/HelpTip.tsx` recibe el término y el texto. Es un `button` de 44 × 44 px con un círculo «?» de 20 px, `popovertarget` hacia un `div popover="auto"` con el texto, y nombre accesible «Qué es «Sin interés»» (con cada término).

- El popover nativo se cierra solo con Escape, tocando afuera o tocando otra vez el «?». Como el foco no entra al popover, al cerrarlo sigue en el «?», que es lo que pide «Cerrar la ayuda».
- **Posición:** junto al «?» con CSS anchor positioning donde el navegador lo soporta; si no, en el centro de la pantalla, que es como lo muestra el navegador por defecto.
- **Los textos** salen de la spec y viven en un solo módulo, para que `03-idiomas` los pase a los catálogos.
- **Pegado al término (lo pide la spec).** En la primera versión, el círculo quedaba centrado en su zona de 44 px y en el medio del espacio entre dos elementos: con la misma distancia a los dos lados, no se notaba a cuál explicaba. En la ficha, junto a «Marcar sin interés» y «Ya no lo tengo», además quedaba desalineado en altura, y en los filtros de PC «Mostrar sin interés» bajaba de renglón y el «?» quedaba suelto a la derecha. La regla nueva:
  - El término y su «?» van en un grupo que no se separa al bajar de renglón y que ocupa un solo lugar en la fila. En una fila de botones, el espacio entre botones va antes y después del grupo, no entre el término y su «?».
  - El círculo se alinea al comienzo de su zona de 44 px, a 4 px del término y centrado en altura con él. La zona táctil sigue midiendo 44 px y se extiende hacia afuera del término.
  - Junto a un texto que puede bajar de renglón («Mostrar sin interés»), el «?» va en línea, después de la última palabra.
  - Un e2e mide, en cada ubicación y en los dos anchos, que el círculo queda a 8 px o menos del borde del término y centrado en altura con él, a 4 px o menos.

| Término | Dónde va el «?» |
|---|---|
| Sin interés | «Mostrar sin interés» en los filtros y «Marcar sin interés» en la ficha |
| Año de lanzamiento | El campo del formulario a mano |
| Familia y Otro | Los tipos de copia, en los formularios, la ventana de copia y el filtro «Cómo lo tenés» |
| A mano | La marca «A MANO» de la ficha |
| Ya no lo tengo | La acción de cada copia en la ficha y la opción del filtro |
| Sin fin | El interruptor de «Editar» |
| Duración | «Duración (h)» del formulario a mano y de «Editar», y «Duración» de la ficha: en el bloque «Datos» en PC y, en el celu, junto a la duración del encabezado, que es donde se muestra ahí |

### 19. Agregar con varias copias y puntaje

Hay un solo formulario de alta, con dos variantes: a mano, con todos los campos, y desde IGDB, sin título, año ni portada, que ya vienen de IGDB. Las dos tienen «Dónde y cómo lo tenés», estado y puntaje.

- **Copias:** arranca sin filas, con «Todavía no lo tenés» y el botón «Agregar una copia», que con una fila pasa a decir «Agregar otra copia». Cada fila tiene tienda (con «Otra»), tipo (Comprado por defecto), «De quién es» si es Familia o el detalle si es Otro, y un botón para quitarla. Una fila sin tienda frena el guardado con «Elegí la tienda de cada copia».
- **Puntaje:** `ScoreInput` (§11), sin puntaje al empezar. Sin tocarlo, el juego queda sin puntaje, no con 0.0.
- **Estado inicial:** «Pendiente» con al menos una copia, salvo que se elija otro, como hasta ahora.
- **Datos:** `NewLibraryEntry` pasa de una copia opcional a una lista, y suma el puntaje. El repositorio inserta el juego y sus copias en la misma transacción. Esto reemplaza la regla anterior de «tienda sin tipo o tipo sin tienda no crea copia».
- **Desde IGDB, decidido con el usuario:** «Agregar» en un resultado abre el formulario en una ventana, y el juego se agrega con «Guardar juego». Así un solo flujo cubre copias, estado y puntaje. El costo es un paso más en el alta rápida: guardar sin tocar nada deja el juego como antes, sin copias y en «Quiero jugarlo». Después de guardar, el resultado muestra «Agregado», que sigue siendo el link a la ficha. Los e2e de 11.4 pasan por el formulario, con el «sí» del usuario para cambiar su helper.
- **La ventana de copia de la ficha** usa la misma fila, con Otro y su detalle.

### 20. Horas jugadas a mano

La spec «Horas jugadas a mano» adelanta a esta etapa el total a mano, la primera fuente de la regla de `07` (`decisiones.md` §4, regla 5). Acá solo existe ese total: las horas de Steam llegan en `05` y las sesiones, en `07`.

- **Modelo:** `LibraryGame` suma `manualPlayedMinutes` (`number | null`). `playedHours(game)` devuelve el total a mano si existe y, si no, la suma de las copias, como hasta ahora. `model/game/played-hours.ts` pasa las horas escritas a minutos: acepta de 0 a 99 999.9 h (el mismo tope que la duración), redondea a un decimal, como el puntaje, y fuera de rango lanza `PlayedHoursOutOfRangeError` con «Poné las horas jugadas, de 0 en adelante». Zod en la acción solo verifica que sea un número, con ese mismo mensaje si no lo es.
- **Datos y servicio:** `NewLibraryEntry` suma `playedMinutes` y el alta lo guarda en la misma transacción que el juego y sus copias (§19). Para la ficha, `setPlayedHours(userId, gameId, hours | null)` en el servicio de la biblioteca: `null` borra el total. El repositorio lo escribe con el filtro por usuario de siempre.
- **Ficha:** junto a «Jugaste» (bloque «Datos» en PC, encabezado en el celu), un botón «Cargar horas», que con un total cargado dice «Cambiar horas», abre una ventana «Horas jugadas» con el campo, «Guardar» y, si hay total, «Borrar horas». Se usa una ventana y no un campo suelto, igual que «Editar»: un cambio de horas no debería guardarse a medio escribir.
- **Formularios de alta:** «Horas jugadas», opcional, en las dos variantes, junto a la duración en el formulario a mano y debajo del estado en el de IGDB.
- **Tarjeta, filtro y orden** usan `playedHours`. La tarjeta sigue sus reglas: «X h» si hay horas, «Sin empezar» si tiene copias o total y está en 0, y nada si no tiene ninguno de los dos. «Borrar las horas» se verifica en la ficha, que vuelve a decir «Jugaste 0 h».
- **«Duración» no cambia:** la duración estimada de IGDB sigue siendo editable como corrección propia (spec «Correcciones propias»). La ayuda «?» de «Duración» (§18) existe justamente para no confundirla con las horas jugadas.

## Risks / Trade-offs

- **[Resuelto] `search` con 2 o 3 letras no servía:** contra IGDB real, «hol» no traía Hollow Knight. → Para textos cortos se usa el prefijo `where name ~ "hol"*` (§6), un cambio que quedó dentro del adapter, con su test MSW.
- **[Riesgo] La secret key de Supabase tiene acceso total.** → Solo se lee en el adapter, por `getStorageEnv()`, y nunca lleva prefijo `NEXT_PUBLIC_`.
- **[Riesgo] Una biblioteca muy grande pesa en la primera carga.** → Se trae solo lo que la tarjeta muestra. Si con miles de juegos se nota, se agrega paginado en memoria sin tocar el modelo.
- **[Riesgo] La causa exacta de la cuelga del 11/11 no está probada**, solo es la lectura más compatible con los logs. → Los tiempos máximos acotan la espera sea cual sea la causa. La prueba manual de la puesta en marcha repite el caso (marcar y desmarcar «Sin interés» y volver) y revisa los logs de Vercel.
- **[Trade-off] El `statement_timeout` del rol `postgres` también corta las consultas del SQL Editor de Supabase**, que corre con ese rol. → 8 s alcanzan para una base personal. Si molesta, se sube solo para esa sesión con `set statement_timeout`, que en el SQL Editor sí vale.
- **[Riesgo] El `alter type … add value` corre dentro de la transacción del migrador.** → Postgres 12 o más lo permite si nadie usa el valor nuevo en esa misma transacción. La migración no lo usa, y los tests la aplican en PGlite antes que en Supabase.
- **[Limitación] El anchor positioning de CSS no está en todos los navegadores.** → Donde falta, la ayuda se ve centrada en la pantalla, legible igual.
- **[Limitación] El límite de 4 por segundo no se coordina entre instancias de Vercel.** → Para un usuario no cambia nada; un 429 se muestra como error reintentable.
- **[Limitación] Un juego de Steam quitado vuelve con la próxima sincronización** (`05`, «Juegos nuevos de Steam»): como se borra todo, no queda registro de que lo quitaste. También puede volver al reimportar (`04`). → Para ocultarlo de forma estable está «Sin interés», que la sincronización respeta. Si hace falta recordar los quitados, se define en esas etapas.
- **[Limitación] Hasta `04` y `07` todas las horas jugadas valen 0.** → Filtro y orden ya funcionan con los datos que haya.
- **[Trade-off] Quedan portadas huérfanas** si se reemplazan, si se quita el juego o si se abandona el formulario después de subir: Storage no entra en la transacción de la base. Con el tope de 2 MB, y siendo una app personal, no justifica una limpieza.
- **[Trade-off] Sin FK a `auth.users`:** borrar un usuario en Supabase deja sus filas. Con registro cerrado, se borran a mano.

## Migration Plan

Las migraciones solo agregan tablas, un valor al enumerado de copias y columnas (`copy.kind_detail` y, después, `library_game.played_minutes_manual`); `allowed_email` no se toca. Los pasos 1 a 5 ya se hicieron; las horas a mano suman otra migración, que también va **antes** del deploy. Puesta en marcha, con los pasos del usuario detallados en `tasks.md`:

1. Crear la app de Twitch, el bucket `covers` y copiar la secret key (`docs/configuracion-externa.md`).
2. Cargar las variables en `.env.local` y en Vercel.
3. Configurar los tiempos máximos del rol `postgres` en Supabase y verificarlos a través del pooler.
4. Correr `npm run db:migrate` contra Supabase. El orden con el deploy importa: **primero la migración**, porque el código nuevo consulta las tablas y la columna nuevas.
5. Desplegar.

Los estados por defecto se crean solos en el primer uso.

**Vuelta atrás:** Vercel permite volver al deploy anterior, que ignora las tablas nuevas, las columnas `kind_detail` y `played_minutes_manual` y el valor `other` (mientras no haya copias Otro). No hace falta revertir la migración. Los tiempos del rol se sacan con `alter role postgres reset statement_timeout` y `alter role postgres reset idle_in_transaction_session_timeout`.
