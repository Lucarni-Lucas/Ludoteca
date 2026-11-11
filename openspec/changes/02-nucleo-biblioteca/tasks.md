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

## 16. Puesta en marcha

- [x] 16.1 Documentar en `README.md` las variables nuevas y el orden de puesta en marcha. Verificar: los comandos del workflow de CI pasan en local con valores de ejemplo.
- [ ] 16.2 **[Usuario]** Crear la app de Twitch, el bucket `covers` y copiar la secret key, siguiendo `docs/configuracion-externa.md`, y cargar las variables en `.env.local` y en Vercel. Verificar: el panel de Supabase muestra el bucket público y Vercel, las variables.
- [ ] 16.3 **[Usuario]** Correr `npm run db:migrate` contra Supabase, **antes** de desplegar. Verificar: las tablas nuevas aparecen en Supabase con RLS activa y están las 12 tiendas.
- [ ] 16.4 Prueba manual sobre el deploy: buscar «hol» en IGDB real, agregar un juego, comprobar duración y portada, y subir una imagen. Verificar: aparece Hollow Knight. Si «hol» no lo trae, aplicar en el adapter el prefijo previsto en `design.md` (Risks), con su test MSW.

## 17. Verificación final

- [ ] 17.1 Revisar la definición de terminado de `CLAUDE.md` completa: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` y `npm run test:e2e` sin errores; cada escenario de las specs con su test de igual nombre; pantallas comparadas con sus `.dc.html`; sin issues nuevos en SonarQube; y todas las tareas marcadas.

## Workflow follow-up

- Archivar con `/opsx:archive` una vez cumplida la definición de terminado, antes de empezar `03-importacion`.
