# Proposal

## Why

Lucas ya tiene su historial en IGN (303 juegos con estado y puntaje), cientos de juegos en Steam y 211 en Epic. Cargar todo a mano no tiene sentido. Pero los datos de IGN están sucios: juegos sin fin marcados como terminados y juegos que nunca va a jugar sincronizados como pendientes. Por eso la importación tiene que ser una revisión, no un volcado.

## What Changes

- Importar tres fuentes: el archivo exportado de IGN, el archivo exportado de Playnite y la cuenta de Steam.
- Cruzar cada juego con IGDB, primero por el ID de la tienda y si no por el título.
- Pantalla de revisión en grupos («¿Es sin fin?», «¿Lo vas a jugar alguna vez?», «Elegí un estado», «Para revisar», «No lo encontré» y «Listos»), con acciones en lote.
- Nada entra a la biblioteca hasta confirmar; la revisión se guarda y se retoma.
- Reimportar no duplica nada.

## Capabilities

### New Capabilities
- `importacion`: importar juegos, copias, estados y puntajes desde IGN, Playnite y Steam, con revisión antes de confirmar.

### Modified Capabilities
Ninguna.

## Impact

- Steam Web API (`GetOwnedGames`) y cruce por ID de tienda en IGDB.
- Tablas de importación aparte de la biblioteca.
- Pantalla nueva que no está en el lienzo de diseño: se diseña al arrancar este cambio, siguiendo el estilo de las demás.
- Datos de entrada: el export de IGN está en el proyecto Ludoteca de claude.ai (`datos/ign-export.json`), no en el repo.
