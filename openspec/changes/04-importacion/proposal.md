# Proposal

## Why

Lucas ya tiene su historial en IGN (303 juegos con estado y puntaje), cientos de juegos en Steam y 211 en Epic. Cargar todo a mano no tiene sentido. Pero los datos de IGN están sucios: juegos sin fin marcados como terminados y juegos que nunca va a jugar sincronizados como pendientes. Por eso la importación tiene que ser una revisión, no un volcado.

## What Changes

- Importar tres fuentes: el archivo exportado de IGN, el archivo exportado de Playnite y la cuenta de Steam.
- Cruzar cada juego con IGDB, primero por el ID de la tienda y si no por el título.
- Detectar los juegos de Steam de la familia: los que Playnite ve instalados pero la cuenta de Steam no tiene se preguntan en «¿Es de tu familia?».
- Pantalla de revisión en grupos que son preguntas cortas («¿Cuál de estos es?», «¿Cómo lo dejaste?», «¿Es de tu familia?», «¿Es sin fin?», «¿Lo vas a jugar alguna vez?», «Elegí un estado», «No lo encontré» y «Listos para importar»), con acciones en lote. Cada opción es una respuesta en palabras y ninguna viene marcada.
- Juntar en una sola pregunta lo que llega con el mismo nombre de varias fuentes, buscar sin la edición lo que IGDB no encuentra y dejar a la vista, sin importarlo, lo que no es un juego.
- Guías «¿Cómo lo saco?» para exportar de Playnite y de IGN; para IGN, un marcador del navegador que descarga el archivo.
- Nada entra a la biblioteca hasta confirmar; la revisión se guarda y se retoma.
- Reimportar no duplica nada.
- Estados por defecto más claros: sale el estado «Sin fin» (queda la marca del juego), «Pendiente» pasa a «Backlog», «Quiero jugarlo» pasa a ser «lo querés jugar pronto, lo tengas o no» y cada estado dice qué significa.
- La marca «Sin interés» pasa a llamarse «Oculto», con un filtro que puede mostrar solo los ocultos.
- «100%» deja de ser un estado y pasa a ser una marca de «Completado»; «Jugado» se ofrece siempre y pone o saca la marca «Sin fin» con un aviso; «Lo probé» pasa a violeta; filtro por marcas.

## Capabilities

### New Capabilities
- `importacion`: importar juegos, copias, estados y puntajes desde IGN, Playnite y Steam, con revisión antes de confirmar.

### Modified Capabilities
- `estados`: estados por defecto, qué significa cada uno, estados según el juego y el paso de los datos que ya estaban.
- `biblioteca`: «Sin interés» pasa a «Juegos ocultos»; «Sin comprar» para cualquier juego sin copias.
- `catalogo`: un juego nuevo entra en «Backlog».
- `copias`: comprar algo de «Quiero jugarlo» ya no cambia el estado.
- `navegacion`: la ayuda de «Oculto» y la de «Sin fin».

## Impact

- Steam Web API (`GetOwnedGames`) y cruce por ID de tienda en IGDB.
- Tablas de importación aparte de la biblioteca.
- Una migración de datos con SQL a mano, para los usuarios que ya tienen juegos: «Pendiente» pasa a «Backlog», los juegos del estado «Sin fin» pasan a «Jugado» con la marca y el estado sale, y «Sin interés» pasa a «Oculto». Un deploy anterior ya no anda con la base migrada.
- Pantalla nueva que no está en el lienzo de diseño: se diseña al arrancar este cambio, siguiendo el estilo de las demás.
- Datos de entrada: el export de IGN de Lucas está en el proyecto Ludoteca de claude.ai (`datos/ign-export.json`), no en el repo.
- El marcador de IGN depende de cómo arma IGN su página: si cambia, se arregla a mano.
