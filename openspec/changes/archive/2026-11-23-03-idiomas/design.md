# Design

## Context

`01-base` y `02-nucleo-biblioteca` dejaron toda la interfaz en español, escrita donde se usa. El motivo del cambio está en `proposal.md`. Lo que hay hoy y condiciona el enfoque:

- **Textos sueltos en los componentes**, salvo las ayudas «?», que ya viven juntas en `components/ui/help-texts.ts` para pasarlas de una vez.
- **El modelo arma frases en español:** `copyCardLabel` y `copyDetailLabel` («Familia · de Ana», «Otro · ya no»), `summaryText` y `gamesCountText` (singular y plural), `statusSinceLabel`, `durationLabel` («unas 12 h»), `movedToNotice`, `signInErrorMessage` y las tablas `COPY_KIND_LABELS`, `LOST_REASON_LABELS`, `STATUS_GROUP_LABELS` y `LIBRARY_SORT_LABELS`. `durationSource` devuelve `"tuya" | "IGDB"`.
- **Los errores llevan al usuario su propio `message` en español:** `AppError` lo dice en su comentario, y `toActionResult` lo copia tal cual. Los mensajes de Zod de las Server Actions también están escritos en los esquemas de `app/`. `/api/igdb/search` arma a mano su respuesta de «Tenés que ingresar».
- **Fechas con tabla propia** (`model/game/date-format.ts`): `Intl` en es-AR da resultados distintos en Node y en los navegadores y rompía la hidratación.
- **Los estados por defecto se guardan con nombre:** `status.name` es `not null`, y `DEFAULT_STATUSES` inserta «Jugando», «Quiero jugarlo», etc., en cada cuenta nueva. Todavía nadie puede renombrarlos (eso llega en `07`). Varios tests de repositorio y servicio eligen estados por ese nombre guardado.
- **Las tiendas conocidas son marcas** («Steam», «Epic Games», «itch.io»): no se traducen.
- **`<html lang="es">` fijo** en el layout raíz, igual que la descripción de la página.
- **La función SQL del hook «Before User Created»** devuelve `EMAIL_NOT_ALLOWED_MESSAGE`, y `classifySignInError` la reconoce por ese texto. Un test verifica que coincidan.
- **Playwright usa `en-US` por defecto.** En cuanto el idioma salga del navegador, los e2e existentes verían la app en inglés si no se fija el idioma en su configuración.
- Ajustes tiene una sola sección, Cuenta, sin diseño propio (`01-base`, design §1).

Hechos de la documentación de next-intl (v4.15, compatible con Next 16 y React 19):

- Sin enrutamiento por idioma, la configuración vive en `src/i18n/request.ts` con `getRequestConfig`, que devuelve `{ locale, messages }`; el plugin `createNextIntlPlugin()` de `next-intl/plugin` la encuentra en esa ruta.
- `NextIntlClientProvider` en el layout raíz pasa los mensajes a los componentes de cliente.
- Los tipos de las claves y del idioma se declaran aumentando `AppConfig` (`Locale` y `Messages`) del módulo `next-intl`.
- `createTranslator` de `use-intl/core` traduce sin React ni Next, así que sirve en Vitest y en Playwright.
- En Server Actions y Route Handlers, la documentación pasa el idioma explícito a `getTranslations({ locale, namespace })`; no garantiza `getLocale()` sin argumentos.

Decisiones del usuario del 22/11, que este diseño toma como dadas:

1. Se autoriza adaptar los tests que comparan frases del modelo y mensajes de error (§9 y §10): pasan a comparar datos y códigos, con los mismos escenarios y nombres.
2. Los e2e corren completos solo en español; en inglés corren solo los de idioma, marcados con `@i18n`, en 4 proyectos (§13). Los e2e existentes no se tocan y siguen con sus textos en español (cambio del 22/11, antes de arrancar).
3. Los tests de componentes y hooks renderizan con un helper `renderWithIntl`; en los existentes cambia solo la llamada a `render` (§13).
4. El selector de idioma va en Ajustes › Cuenta (§1).
5. Un estado por defecto se reconoce comparando su nombre guardado con el de fábrica, sin migración (§8).

## Goals / Non-Goals

**Goals:**

- Que ningún texto de la interfaz quede escrito fuera de los catálogos, y que una clave que falta en un catálogo rompa `typecheck` o un test, no la pantalla.
- Que el modelo siga sin conocer ni React ni next-intl: decide qué mostrar y devuelve datos; el componente lo pone en palabras.
- Que el idioma nunca sea motivo para que una pantalla falle: si la base no responde, se usa el del navegador.
- Que server y navegador rendericen exactamente lo mismo, sin diferencias de hidratación.

**Non-Goals:**

- Formato de números: las horas y el puntaje siguen con punto decimal («12.5 h», «8.5») en los dos idiomas. La spec solo pide fechas.
- Traducir los textos internos: el logger, los errores de `config/` y la función SQL del hook siguen en español, porque no llegan al usuario.
- Renombrar estados, etiquetas del puntaje y demás ajustes (`07`). Acá solo se prepara la tabla de ajustes y que un nombre por defecto se pueda distinguir de uno propio.
- Mails y notificaciones en el idioma del usuario (`09` los arma con estos mismos catálogos).

## Decisions

### 1. Pantallas y diferencias con el diseño

No cambia ninguna pantalla de `design/`: se ven igual, con los textos del idioma elegido. Los textos en inglés más largos se acomodan sin desplazamiento horizontal desde 360 px (§13).

| Pantalla | Referencia | Diferencias |
|---|---|---|
| Todas las existentes | `design/*.dc.html` | Ninguna en español. En inglés, los textos de los catálogos; los datos del usuario y de IGDB, tal cual. |
| Ajustes › Cuenta | Marco y menú de `design/Escritorio-Estados.dc.html` | Suma el bloque «Idioma», sin diseño propio, arriba de «Cerrar sesión»: el título del bloque y dos botones, «Español» e «English», con los tokens de los controles existentes. El menú de Ajustes sigue mostrando solo «Cuenta». |

El selector son dos `button` con `aria-pressed` dentro de un grupo con nombre («Idioma» o «Language»), no un `select`: `CLAUDE.md` pide que todo lo que se acciona sea un botón o un link, y con dos opciones se ven las dos sin abrir nada. Cada botón lleva su propio atributo `lang` (`lang="en"` en «English»), para que un lector de pantalla lo pronuncie bien aunque la página esté en español.

### 2. Dependencia nueva: next-intl

`next-intl` ^4.15, ya elegida en `docs/decisiones.md` §2. Se justifica porque:

- Funciona sin prefijo en las URL: el idioma sale de `getRequestConfig`, que lo calcula por pedido.
- La misma API (`useTranslations`) anda en componentes de servidor y de cliente, sin pasar textos por props.
- Plurales y variables con ICU («{count, plural, one {# juego} other {# juegos}}»): hoy `summaryText` resuelve el plural a mano.
- Las claves quedan tipadas con `AppConfig`: una clave mal escrita falla en `typecheck`.

`use-intl` llega con next-intl, y de ahí se importa `createTranslator` (`use-intl/core`) para traducir en el manejador de errores y en los e2e. Si ESLint o TypeScript piden declararla, se agrega a `package.json` con la misma versión que trae next-intl, sin sumar peso.

Descartado: catálogos propios con un `t()` casero (plurales, tipos y el paso de mensajes al cliente habría que hacerlos a mano) y `react-intl` (no conoce los componentes de servidor).

### 3. Carpetas y archivos nuevos

Se proponen con este diseño y se crean al aprobarlo:

- **`src/i18n/`**, transversal como `security/`: `request.ts` (lo exige next-intl), `locale.ts` (el idioma del pedido, §5), `translator.ts` (traducir fuera de React, §10), `dates.ts` (§11), `app-config.ts` (los tipos de `AppConfig`) y `messages/es.json` y `messages/en.json`. Como `app/`, solo habla con `service/`, `security/` y `model/`.
- **`model/account/locale.ts`** y **`model/account/settings.ts`**: el contexto `account` ya existe.
- **`persistence/{sql,mapper,repository}/account/user-settings*`** y **`service/account/settings-service.ts`**.
- **`tests/i18n/`**: el test de los catálogos y el helper `render-with-intl.tsx`. **`tests/e2e/support/i18n.ts`**: el traductor de los e2e.

Los componentes pueden importar de `i18n/` solo `dates.ts`, que es presentación pura.

### 4. Catálogos

- Un JSON por idioma, con espacios de nombres por área: `common`, `nav`, `login`, `settings`, `library`, `filters`, `game`, `add`, `copy`, `status`, `help`, `dates`, `errors` y `validation`. Claves en inglés y en camelCase; los valores de los enumerados se usan como clave (`copy.kinds.purchased`, `status.defaults.wishlist`, `errors.GAME_NOT_FOUND`).
- `es.json` es la referencia de tipos (`Messages: typeof es`), así que una clave usada que no existe en español no compila.
- Un test compara los dos catálogos: mismas claves, mismas variables ICU en cada mensaje y ningún texto vacío. Así, «cada texto nuevo entra en los dos catálogos» lo verifica `npm test`.
- Lo que escribe el usuario y los datos de IGDB nunca pasan por `t()`: entran como variable de un mensaje o se muestran tal cual.

### 5. De dónde sale el idioma

`model/account/locale.ts`, puro:

- `LOCALES = ["es", "en"] as const`.
- `browserLocale(acceptLanguage)`: toma la entrada de mayor `q` del encabezado `Accept-Language` (a igual `q`, la primera); si su idioma principal es `es`, en cualquier variante (`es-MX`, `es-419`), devuelve `es`; en cualquier otro caso, o si el encabezado falta o no se entiende, `en`. Con «pt-BR,es;q=0.9», el preferido es portugués, así que da inglés.
- `resolveLocale(chosen, acceptLanguage)`: lo elegido en la cuenta, si hay; si no, el del navegador.

`i18n/locale.ts`, `getRequestLocale()`, con `cache` de React para que el layout, la página y la acción de un mismo pedido lo calculen una sola vez:

1. Con sesión (`getSessionUser`, que ya está cacheado), pide el idioma al servicio de ajustes.
2. Si la base no responde (`DatabaseUnavailableError`), lo anota con `logger.warn` y sigue sin idioma elegido. Cualquier otro error se propaga.
3. Devuelve `resolveLocale` con lo anterior y el encabezado `accept-language` de `headers()`.

`i18n/request.ts` usa `getRequestLocale()` y carga el catálogo de ese idioma. Sin sesión (pantalla de ingreso), vale solo el navegador.

Descartados: una cookie con el idioma (no cumple «Otro dispositivo» sin leer la cuenta igual, y suma un estado que se puede desincronizar) y guardarlo en `user_metadata` de Supabase Auth (`decisiones.md` §4 lo pone en `user_settings`, que `07` reutiliza, y el token quedaría viejo en el otro dispositivo hasta renovarse).

### 6. Ajustes de la cuenta

Tabla `user_settings`, la primera de `decisiones.md` §4:

| Columna | Tipo |
|---|---|
| `id` | uuid |
| `user_id` | uuid, único |
| `locale` | enumerado `app_locale` (`es`, `en`), vacío si nunca eligió |
| `created_at`, `updated_at` | como el resto |

- RLS sin políticas, como las demás. Sin fila significa «todo por defecto»: no se crea al ingresar.
- Repositorio: `findByUser(userId)` y `saveLocale(userId, locale)` con `insert … on conflict (user_id) do update`, filtrando siempre por el usuario de la sesión, con su test de «el usuario A no ve ni cambia nada del B».
- Servicio: `createSettingsService({ settingsRepo })` con `getLocale(userId)` y `chooseLocale(userId, locale)`. Este último devuelve `"updated" | "unchanged"`, decidido por `localeChange(current, chosen)` en `model/account/settings.ts`, para que la pantalla diga «Idioma actualizado» o «Ya estaba en español».
- `07` le suma sus columnas (etiquetas del puntaje) con su propia migración.

### 7. Cambiar el idioma en el momento

- Server Action `chooseLocaleAction` en `app/(app)/settings/account/actions.ts`: valida con `z.enum(LOCALES)`, llama al servicio y devuelve el resultado.
- Hook `useLocaleChoice` en `hooks/`: llama a la acción y, si salió bien, `router.refresh()`. Next vuelve a renderizar el layout raíz con el idioma nuevo: cambian `<html lang>`, los mensajes de `NextIntlClientProvider` y los textos de servidor, sin cerrar la sesión ni recargar la página.
- El aviso se muestra después del refresco, ya en el idioma nuevo («Language updated»).
- Las páginas ya son dinámicas (leen la sesión), así que no hay caché que sirva el idioma de otro usuario.

### 8. Nombres por defecto que se guardan en la base

Se resuelve el punto de `decisiones.md` §9, con la opción que eligió el usuario el 22/11: **un estado con `system_key` cuyo nombre guardado es el de fábrica se muestra con el nombre por defecto del idioma elegido; cualquier otro nombre se muestra tal cual.**

- No hay migración ni cambia la tabla: `DEFAULT_STATUSES` sigue insertando los nombres de fábrica («Jugando», «Quiero jugarlo»…), y las filas que ya existen ya cumplen la regla.
- En el modelo, `hasDefaultName(status)` compara el nombre guardado con el de fábrica de su propio `system_key`. Ese nombre en español queda en el modelo como marca de «no lo renombró», no como texto para mostrar: lo que se ve sale de `status.defaults.<system_key>`.
- En la pantalla, `statusName(status, t)` (en `components/status/`) devuelve `t("status.defaults.<system_key>")` si `hasDefaultName`, y si no, el nombre guardado.
- Un nombre propio igual al de fábrica de su mismo estado se traduce. No es un problema: es el nombre por defecto. `07` guarda el nombre solo si el usuario lo cambió, para que no quede guardado «Want to play» por editar en inglés sin tocar nada, y vuelve al nombre por defecto escribiendo el de fábrica.
- Los tests de repositorio, servicio y modelo que eligen estados por su nombre guardado no cambian.

Descartado: que un nombre vacío signifique «por defecto». Era más explícito, pero pedía una migración con SQL crudo para vaciar los nombres existentes, un rollback que los rellenara y cambiar los tests que buscan estados por nombre.

Los tipos de copia, los motivos de pérdida, los grupos y los órdenes no se guardan con nombre: son enumerados, y su texto sale del catálogo por su valor.

### 9. El modelo devuelve datos, no frases

| Hoy | Pasa a |
|---|---|
| `copyCardLabel` | `copyCardParts(copy)`: tienda, tipo (vacío si es Comprado) y detalle de Otro. |
| `copyDetailLabel` | `copyDetailParts(copy)`: tipo y un agregado opcional: dueño de la familia, detalle de Otro o «ya no la tenés». |
| `summaryText`, `gamesCountText` | Se borran: `summarizeLibrary` ya devuelve las cantidades, y el plural lo hace ICU. |
| `statusSinceLabel` | `statusSince(status, since)`: grupo, fecha y si es fecha de fin. |
| `durationLabel` | `durationInfo(game)`: sin fin, desconocida u horas. |
| `durationSource` | Devuelve `"own" \| "igdb" \| null`. |
| `movedToNotice` | Se borra: el hook arma el aviso con el título y el estado que devuelve la acción. |
| `signInErrorMessage` | Se borra: `classifySignInError` ya devuelve el código, y la pantalla de ingreso lo traduce. |
| `*_LABELS` | Se borran: las claves del catálogo son los valores del enumerado. |

`EMAIL_NOT_ALLOWED_MESSAGE` queda en el modelo como marca para reconocer el error del hook de Supabase, no como texto para mostrar.

Los tests de estas funciones se adaptan con el «sí» del 22/11: mismos nombres y escenarios, comparando los datos. Las frases se prueban en los componentes, en los dos idiomas.

### 10. Errores en el idioma elegido

- `AppError` suma `params` opcionales (`Readonly<Record<string, string | number>>`, como `{ min: 1950, max: 2027 }` en `ReleaseYearOutOfRangeError`). Su `message` deja de llegar al usuario: queda como descripción interna para el log.
- `toActionResult` sigue siendo el único traductor (`CLAUDE.md` §III). Busca `errors.<code>` con sus `params` en el catálogo del idioma del pedido, con `translateError` de `i18n/translator.ts`, que usa `createTranslator` y `getRequestLocale()`. Los errores inesperados siguen dando `errors.INTERNAL_ERROR`.
- Un código sin clave en el catálogo devuelve el mensaje genérico y lo anota con `logger.error`. Para que no pase, el test de los catálogos lee cada `readonly code = "…"` de los `errors.ts` de `src/` y verifica que tenga su clave en los dos idiomas.
- Zod: los esquemas de `app/` dejan de escribir mensajes y ponen una clave de `validation` (`error: "titleRequired"`). `parseInput` la pasa a `InvalidRequestError`, y el manejador la traduce. Sin clave propia, `errors.INVALID_REQUEST`.
- `/api/igdb/search` usa el mismo manejador para su respuesta de sesión vencida y para los errores del adapter.
- Lo que falla en el navegador sin pasar por el servidor (`error.tsx`, `LoadError`, `not-found`) usa `useTranslations`.

Los tests de `action-result`, de `parse-input`, del esquema de agregar y los `toThrow("…")` del modelo y de los servicios se adaptan con el «sí» del 22/11: comparan la clase del error, el código y los `params`, y el texto traducido se prueba en `action-result` con los dos catálogos.

### 11. Fechas

Se mantiene la tabla propia, sin `Intl`, por la misma razón de hidratación. `model/game/date-format.ts` pasa a devolver partes (año, mes y día). Los nombres cortos de los meses (`dates.months.1` a `12`) y los patrones (`dates.monthYear`: «{month} {year}») salen del catálogo, y `i18n/dates.ts` expone `useDateFormat()` con `dayMonth(date)` y `monthYear(date)`. Así, mayo de 2020 se ve «may 2020» en español y «May 2020» en inglés.

### 12. Idioma declarado y metadatos

- El layout raíz pone `lang` según el idioma del pedido: `es-AR` en español (es rioplatense) y `en` en inglés.
- `generateMetadata` traduce la descripción de la página. El título sigue siendo «Ludoteca».

### 13. Tests

- **Catálogos** (`tests/i18n/catalogs.test.ts`): mismas claves, mismas variables y sin vacíos (§4), y cada código de error con su clave (§10).
- **Componentes y hooks:** `renderWithIntl(ui, { locale })` en `tests/i18n/render-with-intl.tsx` envuelve en `NextIntlClientProvider` con el catálogo real; `locale` es `es` por defecto. En los tests existentes cambia solo la llamada a `render`. Los escenarios de texto se prueban en los dos idiomas.
- **Modelo, repositorio y servicio:** sin catálogos, comparando datos (§9).
- **E2e:** cuatro proyectos. `mobile-es` y `desktop-es`, con `locale: "es-AR"`, corren todos los specs menos los de idioma. `mobile-en` y `desktop-en`, con `locale: "en-US"`, corren solo los de idioma. Playwright manda ese idioma en `Accept-Language`.
- **Specs de idioma:** llevan la etiqueta `@i18n`, como hoy `@desktop` y `@mobile`, y el filtro de `playwright.config.ts` es definitivo (`grep: /@i18n/` en inglés, `grepInvert` en español). Son: «Pantalla completa en inglés», el ingreso con el navegador en otro idioma («Navegador en español de México» y «Navegador en portugués»), cambiar el idioma en Ajustes («Pasar a inglés», «Volver al español» y «Otro dispositivo»), «Formulario sin título» en inglés y la prueba a 360 px. Cada uno corre una vez por ancho.
- **Textos en los e2e:** los specs de idioma obtienen un `t` del idioma que prueban (`tests/e2e/support/i18n.ts`, con `createTranslator`). Los e2e existentes no cambian: corren solo en español y siguen comparando sus textos escritos, que no cambian al pasar a los catálogos.
- **Escenarios que cambian el idioma del navegador o el de la cuenta:** abren su propio contexto con el `locale` que piden e ingresan con `signInAsNewAccount`, para no cambiar el idioma de la cuenta que usan los demás.
- **360 px:** un spec de idioma recorre en inglés Biblioteca, los filtros del celu, la ficha, Agregar y Ajustes, donde los textos son más largos, y verifica que no hay desplazamiento horizontal.

## Risks / Trade-offs

- [Una consulta más a la base en cada pedido con sesión] → Una sola por pedido (`cache`), por `user_id` único; si la base no responde, el idioma cae en el del navegador y la pantalla sigue (§5).
- [Hidratación distinta entre servidor y navegador] → Los dos usan el idioma y el catálogo que manda el layout raíz, y las fechas no usan `Intl` (§11).
- [Un texto que queda escrito suelto en un componente] → La revisión de cada tarea busca textos con acentos o en español en `components/`, `hooks/` y `app/`, y los e2e en inglés de «Pantalla completa en inglés» recorren Biblioteca, ficha y agregar buscando textos de la interfaz en español.
- [Mensajes en inglés más largos rompen una pantalla angosta] → Los specs de idioma corren a 390 px, y la prueba a 360 px recorre en inglés las pantallas donde los textos son más largos (§13).
- [El nombre de fábrica en español queda como marca en el modelo] → Vive solo en `DEFAULT_STATUSES` y lo usa solo `hasDefaultName`; un test verifica que cada `system_key` tiene su clave en `status.defaults` de los dos catálogos (§8).
- [Tests adaptados ocultan una regresión] → Los cambios en tests existentes se limitan a lo autorizado (frases y mensajes del modelo y de los errores y la llamada a `render`; los e2e existentes no se tocan), y cada tarea dice qué archivos toca.
- [Una pantalla en inglés que se rompe sin un e2e que la cubra] → Para no duplicar el tiempo del CI, en inglés corren solo los specs de idioma; el resto lo cubren los tests de componentes en los dos idiomas, el test de los catálogos y «Pantalla completa en inglés».

## Migration Plan

1. `npm run db:migrate` con la migración nueva de `user_settings`, como en las etapas anteriores (`docs/configuracion-externa.md`). Es la única: no hay SQL crudo en esta etapa.
2. Deploy del código. Hasta que alguien elija idioma en Ajustes, se usa el del navegador.
3. **Rollback:** se vuelve al deploy anterior. `user_settings` puede quedar: el código anterior no la lee.
