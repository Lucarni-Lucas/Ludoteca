# Tasks

Los nombres entre comillas son escenarios de las specs: cada uno lleva un test con ese mismo nombre. Las tareas marcadas **[Usuario]** requieren tus cuentas y credenciales, así que las hacés vos; el agente te pasa los pasos exactos. Los «§» remiten a `design.md`.

## 1. Preparación

- [x] 1.1 Instalar `msw` y las tres primitivas de Radix (§16), sumar `adapter` al proyecto Node de Vitest, poner `bodySizeLimit: "3mb"` en `next.config.ts` y agregar a ESLint una regla de capas para `src/adapter/` (no importa `app/`, `service/`, `persistence/`, `components/` ni `hooks/`). Verificar: `npm run lint`, `npm run typecheck` y `npm test` pasan, y lint falla si se prueba a mano un import de `persistence/` en `adapter/`.
- [x] 1.2 Crear `shared/clock.ts` con `today()` en la zona de Buenos Aires (§9), con tests a las 23:30 y a las 00:30 hora argentina, que en UTC caen en otro día. Verificar: `npm test`.
- [x] 1.3 Sumar `getIgdbEnv()` y `getStorageEnv()` a `config/`, aparte de `getServerEnv()` (§6), con tests de variable faltante y de URLs por defecto. Sumar las variables a `.env.example`. En `docs/configuracion-externa.md`, completar «Portadas subidas» con los pasos del bucket `covers` y aclarar que Twitch y Storage se piden recién en la sección 16 de estas tareas. Verificar: `npm test`, con los tests existentes de `parseServerEnv` sin cambios.

## 2. Tablas

- [x] 2.1 Crear las tablas de §4 en `persistence/sql/{store,status,game,copy,journal}/`, con enumerados, claves foráneas, índices y RLS, y generar la migración. Verificar: el archivo queda en `drizzle/`, sin palabras reservadas, con ids uuid, `created_at` y `updated_at`, y `npm test` la aplica en PGlite.
- [x] 2.2 Escribir la migración custom con las 12 tiendas conocidas (§4), con tests contra PGlite de que existen las 12, sin `user_id`, y de que repetir el insert no duplica. Verificar: `npm test`.

## 3. Estados

- [x] 3.1 Crear en `model/status/` los tipos, los estados por defecto con su `system_key` y color, el agrupado en orden fijo, `planStatusChange`, `finishedOn` y `StatusNotFoundError`, con tests de bordes: elegir el mismo estado no genera cambio, entrar a Terminado y pasar de «Completado» a «100%». Verificar: `npm test`.
- [x] 3.2 Crear el mapper y el repositorio de `status`: listar, buscar por id e insertar los estados por defecto sin duplicar, con el test de «el usuario A no ve ni cambia nada del B». Verificar: `npm test`.
- [x] 3.3 Crear `createStatusService` y su `instance.ts`, que crea los estados al primer uso (§10), con tests "Grupos de un usuario nuevo" y "Estado «Jugado»" sobre un repositorio falso. Verificar: `npm test`.
- [x] 3.4 Sumar a `StatusBadge` la prop opcional `color` y sus tokens (§10), con el test "Color de «Quiero jugarlo»" y otro de «Pendiente» en gris, agregados al archivo existente sin cambiar sus casos. Verificar: `npm test`.

## 4. Tiendas y copias: reglas

- [x] 4.1 Crear `model/store/` (tipos, `slug`, reconocer que «steam» escrito a mano es Steam) y el mapper y repositorio de `store`, con el test de aislamiento: la tienda propia de A no le aparece a B. Verificar: `npm test`.
- [x] 4.2 Crear `model/copy/`: tipos, etiquetas de tarjeta y de ficha, tipos que cuentan como propios, marcar y recuperar, con los tests "Copia de suscripción" y "Copia de la familia", y bordes: Comprado muestra solo la tienda, y una copia perdida conserva tipo y fecha. Verificar: `npm test`.

## 5. Reglas del juego

- [x] 5.1 Crear en `model/game/` `normalizeScore`, `scoreLabel` y `stepScore`, con los tests "Más de un decimal", "Excelente" y "Obra maestra", los bordes de cada rango y `ScoreOutOfRangeError`. Verificar: `npm test`.
- [x] 5.2 Crear los datos efectivos (corrección sobre catálogo), la etiqueta de duración, el estado inicial, las iniciales y el tono de portada, con los tests "Juego sin fin" e "Iniciales", y bordes: título con signos, solo artículos, duración decimal y estado elegido a mano. Verificar: `npm test`.
- [x] 5.3 Crear `filterLibrary` y `normalizeText` con la semántica de §7, con los tests "Grupo entero", "Varios estados", "Tienda y estado", "Rango libre", "Juegos sin fin", "Sin abrir", "Juegos sin fin incluidos", "Puntaje alto", "Ya no lo tengo" y "Búsqueda parcial", y bordes: acentos, rango con un solo extremo y varias tiendas. Verificar: `npm test`.
- [x] 5.4 Crear el orden, el resumen y las cantidades por opción, con los tests "Orden por puntaje", "Orden por duración" y "Resumen", y bordes: singular y plural, juegos sin copias y «Sin interés» fuera de los conteos. Verificar: `npm test`.
- [x] 5.5 Crear `planGameRemoval` (§8), con tests de que un juego cargado a mano libera su fila del catálogo y uno de IGDB no. Verificar: `npm test`.

## 6. Adapter de IGDB

- [x] 6.1 Crear en `adapter/igdb/` los DTO, el mapper, los errores propios y la búsqueda (§6), con tests MSW de mapeo (año, portada, id base), comillas en el texto, 429, 5xx y timeout, sin que salga un error crudo de `fetch`. Verificar: `npm test`.
- [x] 6.2 Sumar el manejo del token con `tokenStore` (memoria, luego lo guardado, luego Twitch) y el repositorio de `provider_token`, con tests de token vencido, 401 que renueva y reintenta una sola vez, y lectura y escritura contra PGlite. Verificar: `npm test`.
- [x] 6.3 Sumar `getGame`: resuelve la edición con `version_parent` y trae la duración, con tests MSW de edición, juego sin `game_time_to_beats`, conversión de segundos a horas y desarrollador entre varias compañías. Verificar: `npm test`.

## 7. Repositorios de juegos

- [x] 7.1 Crear el mapper y las lecturas del repositorio de `game` (biblioteca completa con copias y estado, un juego, búsqueda por ids de IGDB), con el test de aislamiento y el de que un juego a mano ajeno no se ve. Verificar: `npm test`.
- [x] 7.2 Sumar agregar un juego (de IGDB o a mano) con su copia opcional en una transacción, con tests: si falla la copia no queda el juego, y el mismo juego no se crea dos veces por usuario. Verificar: `npm test`.
- [x] 7.3 Sumar `applyStatusChange` en una transacción (§8), con los tests "Cambio registrado" y "Cambio sobre datos ajenos". Verificar: `npm test`.
- [x] 7.4 Sumar correcciones, puntaje y «Sin interés» de a muchos, con los tests "Corregir la duración" (dos usuarios sobre el mismo juego) y "Marcar varios", y el de aislamiento. Verificar: `npm test`.
- [x] 7.5 Sumar vincular y actualizar desde IGDB, con los tests "Vínculo sin pérdida" y "Actualizar con una corrección propia", y el borde de vincular a un juego que ya tiene. Verificar: `npm test`.
- [x] 7.6 Crear el mapper y el repositorio de `copy`: agregar (con el paso a «Pendiente» en la misma transacción), marcar, recuperar y eliminar, con el test de aislamiento. Verificar: `npm test`.
- [x] 7.7 Sumar `removeFromLibrary` en una transacción (§8), con los tests "Quitar un juego agregado por error" (sin copias ni entradas del diario), "Volver a agregarlo", "Juego cargado a mano" y "Juego de IGDB que otro usuario tiene", y bordes: A no puede quitar un juego de B, la fila de IGDB queda aunque nadie más lo tenga, y si falla el borrado del catálogo (forzado con otra fila que la referencie) el juego sigue entero. Verificar: `npm test`.

## 8. Servicios y portadas

- [x] 8.1 Crear `createCatalogService` y su `instance.ts` con la búsqueda y sus marcas por id base, con el test "Otro usuario busca el juego" y otros de marca por edición y por wishlist, con fakes. Verificar: `npm test`.
- [x] 8.2 Sumar agregar desde IGDB, con los tests "Agregado sin copias", "Agregar un juego repetido" y "Agregar una edición". Verificar: `npm test`.
- [x] 8.3 Sumar agregar a mano, con el test "Agregado con copia" y bordes: tienda sin tipo, tipo sin tienda, tienda «Otra» y estado ajeno. Verificar: `npm test`.
- [x] 8.4 Crear el servicio de biblioteca: listar, ver un juego, puntaje, correcciones, «Sin interés», vincular y actualizar, con fakes y tests de `GameNotFoundError` para ids ajenos. Verificar: `npm test`.
- [x] 8.5 Crear el servicio de copias, con los tests "Sin fecha", "Otra tienda", "Se pierde la única copia", "Deshacer" y "Copia que no es propia", y el borde de tienda ajena. Verificar: `npm test`.
- [x] 8.6 Crear `adapter/supabase-storage/` y el caso de uso de subir portada (§12), con tests MSW y de servicio: tipo no permitido, más de 2 MB, error del proveedor y ruta con el id del usuario. Verificar: `npm test`.
- [x] 8.7 Sumar quitar de la biblioteca al servicio de biblioteca, con fakes y tests de `GameNotFoundError` para un id ajeno o inexistente, sin tocar el repositorio de escritura en esos casos. Verificar: `npm test`.

## 9. Componentes base

- [x] 9.1 Crear en `components/ui/` la ventana emergente, el interruptor y el aviso `role="status"`, y el hook `useServerAction`, con tests de foco, cierre con Escape, estado pendiente y mensaje de error. Verificar: `npm test`.
- [x] 9.2 Crear `GameCover`, las etiquetas de copias y `GameCard` (§7), con los tests "Juego sin copias" y "Juego sin puntuar", y bordes: portada rota que cae a iniciales y marca «A MANO». Verificar: `npm test`.

## 10. Biblioteca

- [x] 10.1 Reemplazar «Próximamente» en `/library` por la biblioteca real, con resumen, `GameCard`, estado vacío que conserva «Agregá tu primer juego» y Biblioteca marcada en `/games/*`, con tests de componente. Verificar: `npm test` y `npm run test:e2e`, con los e2e de `01-base` sin cambios.

## 11. Agregar juego

- [x] 11.1 Crear el servidor falso de Twitch e IGDB (con Hollow Knight, Silksong, Hades, Civilization VI y su Platinum Edition, Outer Wilds, Frostpunk, Disco Elysium y 8BitMMO), la orden HTTP de `db-server.mts` y `signInAsNewAccount`, y sumar sus variables a Playwright (§15). Verificar: `npm run test:e2e` levanta todo y siguen pasando los e2e existentes.
- [x] 11.2 Con el «sí» del usuario (§15): en `tests/e2e/accessibility.spec.ts`, sumar `select` a la lista de controles y mover sus funciones a `tests/e2e/support/`, con un parámetro opcional para sumar controles, sin cambiar ninguna otra aserción. Verificar: `npm run test:e2e`.
- [x] 11.3 Crear `/api/igdb/search`, `use-igdb-search` (espera, cancelación y mínimo de 2 letras), los resultados y `/add`, con los tests "Texto demasiado corto", "Juego ya cargado", "Juego en la wishlist" y "Juego que no está en IGDB", y de que un resultado ya cargado ofrece «Agregar una copia». Verificar: `npm test`.
- [x] 11.4 Sumar la Server Action de agregar y el link «Agregado». Verificar con e2e: "Sugerencias desde tres letras", "Agregar un juego nuevo", "Grilla en la PC" y "Lista en el celu".
- [x] 11.5 Crear el formulario a mano en `/add` (desde 768 px) y `/add/manual`, con su Server Action con Zod y el test "Sin título". Verificar con e2e: "Carga mínima", en los dos anchos.
- [x] 11.6 Sumar «Subir imagen» y «Pegar link» al formulario, con su Server Action y tests de archivo rechazado y link que no es https. Verificar: `npm test`.

## 12. Ficha del juego

- [x] 12.1 Crear `/games/[id]` con portada, datos y su `not-found`, con el test "IGDB sin duración". Verificar con e2e: "Juego de otro usuario", y que un id mal formado muestra lo mismo.
- [x] 12.2 Crear la tarjeta de estado y la ventana de cambio, con los tests "Ficha con estado" y "Terminar un juego". Verificar con e2e: "Cambio de estado".
- [x] 12.3 Crear `ScoreControl` con guardado optimista (§11), con los tests "Puntaje cero", "Tope superior" y "Quitar". Verificar: `npm test`.
- [x] 12.4 Crear la lista de copias y «Agregar otra copia», con `?copy=new` y los campos de tienda «Otra» y «De quién es». Verificar con e2e: "Segunda copia" y "Compra de un juego deseado".
- [x] 12.5 Sumar «Ya no lo tengo», recuperar y eliminar, con el test "Copia vendida". Verificar con e2e: "Eliminar con confirmación".
- [x] 12.6 Crear «Editar» (duración, sin fin y portada), «Actualizar datos» y «Vincular con IGDB», con sus Server Actions y tests de componente, y el mensaje cuando el juego ya está en la biblioteca. Verificar: `npm test`.
- [x] 12.7 Sumar «Quitar de la biblioteca» en la ficha, con la confirmación de eliminar copia y el aviso de que no se puede deshacer, y su Server Action con Zod, que redirige a `/library`, con el test "Cancelar" y tests de componente de confirmar y de mensaje de error. Verificar con e2e: "Quitar un juego agregado por error", en los dos anchos.

## 13. Filtros y orden

- [x] 13.1 Crear `use-library-filters`, que lee y escribe los filtros en la URL sin ir al servidor (§7), con tests de ida y vuelta y de parámetros inválidos. Verificar: `npm test`.
- [x] 13.2 Crear los filtros de estado, rangos, tienda y tipo, con sus cantidades, y el test "Atajo". Verificar: `npm test`.
- [x] 13.3 Sumar búsqueda por título, orden, disposición al costado desde 1024 px y arriba debajo de eso, con el test "Combinación vacía". Verificar: `npm test` y que los e2e con `searchbox` siguen pasando.
- [x] 13.4 Crear las pestañas de grupo y la pantalla de filtros del celu, con el test "Pantalla de filtros del celu" y bordes de «Ver 1 juego» y «Limpiar». Verificar: `npm test`.

## 14. «Sin interés»

- [x] 14.1 Sumar «Mostrar sin interés» y la marca visible, con el test "Ver los juegos sin interés". Verificar: `npm test`.
- [x] 14.2 Sumar «Marcar sin interés» en la ficha, el modo de selección y su Server Action, con tests de componente de selección y desmarcado. Verificar con e2e: "Ocultar un juego".

## 15. Accesibilidad y diseño

- [x] 15.1 Aplicar los chequeos de zona táctil, ancho de 360 px y tabulador a `/library` con juegos, `/add/manual`, la ficha y las ventanas emergentes. Verificar: `npm run test:e2e`, corrigiendo los componentes si algo no cumple.
- [x] 15.2 Comparar cada pantalla con sus `.dc.html` (§1), midiendo posiciones y no solo valores, y corregir lo que difiera fuera de lo que lista §1. Verificar: las diferencias que quedan son solo las de §1.

## 16. Base que no responde (prioridad máxima)

- [x] 16.1 Reproducir la cuelga antes de tocar el driver: crear `tests/persistence/support/stalled-postgres.ts`, un servidor que completa el saludo de Postgres y nunca responde (§17), y un test de persistencia que, contra la base de `db.ts`, espere `DatabaseUnavailableError` en el tiempo previsto. Verificar: con postgres.js el test falla porque la consulta no termina, y esa es la reproducción.
- [x] 16.2 Pasar a `pg` con `drizzle-orm/node-postgres` y `attachDatabasePool` (§16, §17): pool global con las opciones de la tabla de §17, cliente que venció destruido y conversión a `DatabaseUnavailableError` en `persistence/db.ts`; quitar `postgres`. Tests: el de 16.1 pasa; conectar a un servidor que no responde falla por `connectionTimeoutMillis`; después de un fallo, la consulta siguiente a una base sana anda sin heredar el cliente trabado, también dentro de una transacción; y el test existente de `getDatabase` sigue igual. Verificar: `npm test`, `npm run build` y `npm run test:e2e` completos, con el pool de 1 de los e2e.
- [x] 16.3 Sumar `DatabaseUnavailableError` a `shared/app-error.ts` y hacer que el manejador único busque el `AppError` en la cadena de `cause` (§13), con tests: un `DrizzleQueryError` que lo envuelve devuelve `{ code: "DATABASE_UNAVAILABLE", message: "No pudimos guardar el cambio. Probá de nuevo." }`, y un error interno sigue dando el mensaje genérico. Verificar: `npm test`.
- [x] 16.4 Crear `app/(app)/error.tsx` con «No pudimos cargar tus datos. Probá de nuevo.» y «Reintentar» (`retry()`), con su test de componente, y declarar `maxDuration = 20` en las páginas y rutas de §2. Verificar: `npm test` y `npm run build`.
- [x] 16.5 Sumar a `db-server.mts` el proxy que se traba a pedido (§15) y los e2e "Base que no responde al abrir la Biblioteca", "Reintentar", "Cambio que no se guarda" y "Las demás pantallas siguen andando". Verificar: `npm run test:e2e` en los dos anchos, con el aviso antes de los 15 s.

## 17. Formulario de agregar

- [x] 17.1 Sumar el tipo «Otro»: `other` en los tipos de copia y `kind_detail`, con una migración nueva generada por drizzle-kit (§4); `KindDetailTooLongError`; etiquetas de tarjeta y de ficha; propio para el paso a «Pendiente»; y opción del filtro «Cómo lo tenés». Con los tests "Copia de otro tipo" (el de la tarjeta y el de la ficha), "Otro sin detalle", "Detalle demasiado largo", "Tipo Otro" y "Regalo de un juego deseado". Verificar: `npm test`, con la migración aplicada en PGlite.
- [x] 17.2 Sumar «Año de lanzamiento» (§5): `releaseYearRange` y `ReleaseYearOutOfRangeError` en el modelo, validado en el servicio con `clock`, con los tests "Año negativo", "Año que viene" y "Sin año". Verificar: `npm test`.
- [x] 17.3 Agregar con varias copias y con puntaje en el servicio y el repositorio, en una transacción (§19), con los tests "Agregar con dos copias", "Sin copias", "Fila incompleta", "Agregar con puntaje" y "Agregar sin tocar el puntaje". Antes de tocar tests existentes que esperan una sola copia o la regla vieja, pedir el «sí» del usuario. Verificar: `npm test`.
- [x] 17.4 Crear las filas de copias (con «Todavía no lo tenés», «Agregar una copia» o «Agregar otra copia» y quitar), separar `ScoreInput` de la ficha (§11), y sumar «Año de lanzamiento» y «opcional» en los campos de texto opcionales (§14). Va en el formulario a mano, la ventana de copia y «Editar», con los tests "Quitar una fila antes de guardar", "Link de la página" y "Título obligatorio". Verificar: `npm test`.
- [x] 17.5 Hacer que «Agregar» en un resultado de IGDB abra el formulario en una ventana, que guarde con «Guardar juego» y que deje el resultado en «Agregado» (§19). Con el «sí» del usuario, cambiar el helper `addFromIgdb` de los e2e y el test de componente que espera agregar de un toque. Verificar con e2e: "Agregar con dos copias" y "Agregar con puntaje", y que siguen pasando "Agregar un juego nuevo", "Grilla en la PC" y "Lista en el celu".

## 18. Puntaje solo con el número

- [x] 18.1 Sacar la etiqueta del puntaje de la ficha y de su texto accesible (§11), dejando `scoreLabel` y sus tests en el modelo. Con el «sí» del usuario, ajustar solo los tests de interfaz que esperan la etiqueta. Con los tests "Puntaje alto" (tarjeta y ficha muestran «9.8» sin etiqueta) y "Puntaje cero" con su texto nuevo. Verificar: `npm test`.

## 19. Ayuda «?»

- [x] 19.1 Crear `HelpTip` con el popover nativo, zona táctil de 44 px y foco visible (§18), y los textos de la spec en un solo módulo, con un test de componente por término: "Ayuda de «Sin interés»", "Ayuda del año de lanzamiento", "Ayuda de «Familia»", "Ayuda de «Otro»", "Ayuda de «A mano»", "Ayuda de «Ya no lo tengo»" y "Ayuda de «Sin fin»". Verificar: `npm test`.
- [x] 19.2 Ponerlo junto a cada término, en los lugares de la tabla de §18. Verificar con e2e: "Cerrar la ayuda" en los dos anchos, y que siguen pasando la zona táctil, el ancho de 360 px y el tabulador.

## 20. Barra del puntaje

- [x] 20.1 Centrar el círculo sobre el valor, llevarlo a los bordes en 0.0 y 10.0 y terminar el relleno en su centro (§11). Verificar con un e2e que mide el centro del círculo contra el del input nativo del `.dc.html` en 0.0, 5.0 y 10.0, a 390 y a 1440 px, con menos de 1 px de diferencia.

## 21. Puesta en marcha

- [x] 21.1 Documentar en `README.md` las variables nuevas y el orden de puesta en marcha. Verificar: los comandos del workflow de CI pasan en local con valores de ejemplo.
- [x] 21.2 Actualizar `README.md` y `docs/configuracion-externa.md`: `pg` y sus tiempos máximos, el paso de los tiempos del rol con su SQL y el comando para verificarlos a través del pooler, la migración nueva, y la referencia a «la sección 16 de estas tareas», que pasa a ser esta. Verificar: los comandos del workflow de CI pasan en local con valores de ejemplo.
- [x] 21.3 **[Usuario]** Crear la app de Twitch, el bucket `covers` y copiar la secret key, siguiendo `docs/configuracion-externa.md`, y cargar las variables en `.env.local` y en Vercel. Verificar: el panel de Supabase muestra el bucket público y Vercel, las variables.
- [x] 21.4 **[Usuario]** En el SQL Editor de Supabase, configurar los tiempos máximos del rol (§17): `alter role postgres set statement_timeout = '8s';` y `alter role postgres set idle_in_transaction_session_timeout = '15s';`. Verificar con el comando de 21.2, que pasa por el pooler: `show statement_timeout` devuelve `8s`.
- [x] 21.5 **[Usuario]** Correr `npm run db:migrate` contra Supabase, **antes** de desplegar. Verificar: las tablas nuevas aparecen en Supabase con RLS activa, están las 12 tiendas y `copy` tiene `kind_detail`.
- [x] 21.6 Prueba manual sobre el deploy, con tu sesión iniciada: buscar «hol» en IGDB real, agregar un juego, comprobar duración y portada, y subir una imagen. Después, repetir el caso del 11/11: marcar «Sin interés», volver, desmarcar y volver, varias veces y con pausas de algunos minutos. Verificar: aparece Hollow Knight, y en los logs de Vercel no hay «Task timed out». Si «hol» no lo trae, aplicar en el adapter el prefijo previsto en `design.md` (Risks), con su test MSW.

## 22. Test que falla en CI

- [ ] 22.1 Con el «sí» del usuario, hacer que «varias consultas y transacciones a la vez comparten la única conexión de PGlite» use los tiempos por defecto (`DATABASE_TIMEOUTS`) en lugar de los 300 ms, sin cambiar lo que verifica (§17). Verificar: pasa 20 veces seguidas con todos los núcleos ocupados por otros procesos, y en GitHub Actions.

## 23. Horas jugadas a mano

- [x] 23.1 Modelo (§20): `manualPlayedMinutes` en `LibraryGame`, `playedHours` con el total a mano primero, `played-hours.ts` con el rango, el redondeo a un decimal y `PlayedHoursOutOfRangeError`. Filtro y orden por horas incluyen un juego sin copias con total a mano. Con el «sí» del usuario, sumar `manualPlayedMinutes: null` al fixture `buildGame` de `tests/model/game/library-fixtures.ts`. Tests: "Horas negativas", el redondeo, el tope y el total a mano en el filtro y el orden. Verificar: `npm test`.
- [x] 23.2 Persistencia: `played_minutes_manual` en `library_game`, con una migración nueva generada por drizzle-kit (§4); mapper; alta con el total en la misma transacción; método para cambiarlo y borrarlo. Tests contra PGlite con las migraciones reales, incluido «el usuario A no ve ni cambia nada del B». Verificar: `npm test`.
- [x] 23.3 Servicio y acciones: `setPlayedHours` en el servicio de la biblioteca y `playedHours` en la entrada del alta, con Zod solo para la forma. Tests: "Agregar con horas jugadas", "Borrar las horas" y "Horas negativas" en el servicio. Verificar: `npm test`.
- [x] 23.4 Interfaz: ventana «Horas jugadas» desde «Jugaste» en la ficha, con «Guardar» y «Borrar horas», y el campo opcional «Horas jugadas» en los dos formularios de alta. Tests de componente y e2e en los dos anchos: "Cargar las horas en la ficha", "Agregar con horas jugadas", "Borrar las horas" y "Horas negativas". Verificar: `npm test` y `npm run test:e2e` de esas pantallas.

## 24. Ayuda de «Duración»

- [x] 24.1 Sumar el texto de «Duración» al módulo de la ayuda y el «?» en «Duración (h)» del formulario a mano y de «Editar», y en «Duración» de la ficha (§18). Tests: "Ayuda de la duración" en componentes y en e2e, en los dos anchos. Verificar: `npm test` y el e2e.

## 25. «?» pegado a su término

- [x] 25.1 Aplicar la regla de §18 en todas las ubicaciones: el término y su «?» en un grupo que no se separa, con el círculo a 4 px del término y centrado en altura, sin romper las filas de botones ni de campos. Sumar un e2e que lo mida en cada ubicación, a 390 y a 1440 px, y revisar cada una contra una captura. Verificar: ese e2e y los que siguen pasando de zona táctil, 360 px y tabulador.

## 26. Puesta en marcha de las horas a mano

- [ ] 26.1 **[Usuario]** Correr `npm run db:migrate` contra Supabase, **antes** de desplegar. Verificar: `library_game` tiene `played_minutes_manual`.
- [ ] 26.2 Prueba manual sobre el deploy: cargar, cambiar y borrar las horas de un juego desde la ficha, y agregar uno desde IGDB con horas. Verificar: la tarjeta muestra el total, y en los logs de Vercel no hay errores.

## 27. Verificación final

- [ ] 27.1 Revisar la definición de terminado de `CLAUDE.md` completa: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` y `npm run test:e2e` sin errores; cada escenario de las specs con su test de igual nombre; pantallas comparadas con sus `.dc.html`; sin issues nuevos en SonarQube; y todas las tareas marcadas.

## Workflow follow-up

- Archivar con `/opsx:archive` una vez cumplida la definición de terminado, antes de empezar `03-idiomas`.
