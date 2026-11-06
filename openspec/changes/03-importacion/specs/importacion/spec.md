## Purpose

Cargar la biblioteca inicial desde IGN, Playnite y Steam sin tipear cientos de juegos, revisando antes de confirmar lo que llegue dudoso o mal clasificado.

## ADDED Requirements

### Requirement: Fuentes de importación
El sistema SHALL importar desde el archivo JSON exportado de IGN, el archivo JSON exportado de Playnite y la cuenta de Steam del usuario. Un archivo con otro formato MUST rechazarse sin importar nada.

#### Scenario: Archivo de IGN
- **WHEN** el usuario sube el archivo exportado de IGN
- **THEN** ve que se leyeron sus 303 juegos y empieza la revisión

#### Scenario: Archivo desconocido
- **WHEN** el usuario sube un archivo que no es de IGN ni de Playnite
- **THEN** ve «No reconozco este archivo» y no se importa nada

### Requirement: Conectar Steam
El sistema SHALL permitir conectar una cuenta de Steam con su SteamID o el link de su perfil. Si los detalles de juego del perfil son privados, MUST explicar cómo hacerlos públicos.

#### Scenario: Perfil público
- **WHEN** el usuario pega el link de su perfil de Steam, que tiene los detalles de juego públicos
- **THEN** la cuenta queda conectada y sus juegos de Steam entran a la revisión

#### Scenario: Perfil privado
- **WHEN** los detalles de juego del perfil son privados
- **THEN** el usuario ve que tiene que poner «Detalles del juego» como público en la privacidad de Steam

### Requirement: Revisión antes de confirmar
Lo importado MUST NOT entrar a la biblioteca hasta que el usuario confirme. La revisión SHALL guardarse para retomarla en otro momento.

#### Scenario: Retomar la revisión
- **WHEN** el usuario revisa la mitad de los juegos, cierra la app y vuelve al día siguiente
- **THEN** encuentra la revisión donde la dejó y su biblioteca sin cambios

### Requirement: Cruce con IGDB
Cada juego importado SHALL cruzarse con IGDB primero por su ID en la tienda (Steam, Epic, GOG u otra) y, si no tiene, por título. Si hay varios candidatos posibles, MUST quedar para revisar.

#### Scenario: Cruce por ID de Steam
- **WHEN** un juego de IGN trae el ID de Steam 1966900
- **THEN** se cruza con 20 Minutes Till Dawn de IGDB sin buscar por título

#### Scenario: Título ambiguo
- **WHEN** un juego sin ID de tienda se llama «Overwatch» y IGDB devuelve varios candidatos
- **THEN** queda en «Para revisar» con los candidatos para elegir

### Requirement: Estados desde IGN
Los estados de IGN SHALL pasar así: Playing a Jugando, Paused a En pausa, Beat a Completado, Quit a Abandonado, Wishlist a Quiero jugarlo, y Backlog a Pendiente si el juego tiene alguna copia o a Quiero jugarlo si no. Un juego con dos estados de IGN MUST quedar para revisar.

#### Scenario: Backlog con copia
- **WHEN** un juego en Backlog en IGN también llega con una copia de Steam
- **THEN** se sugiere «Pendiente»

#### Scenario: Backlog sin copia
- **WHEN** un juego en Backlog en IGN no tiene copias en ninguna fuente
- **THEN** se sugiere «Quiero jugarlo»

#### Scenario: Dos estados a la vez
- **WHEN** un juego viene de IGN como Beat y Quit a la vez
- **THEN** queda en «Para revisar» para que el usuario elija

### Requirement: Puntajes desde IGN
Los puntajes enteros de IGN SHALL pasar con un decimal en cero.

#### Scenario: Puntaje entero
- **WHEN** un juego de IGN tiene puntaje 8
- **THEN** se sugiere el puntaje 8.0

### Requirement: Copias desde Playnite
Cada juego del archivo de Playnite SHALL sumar una copia en su tienda, con las horas jugadas que informe y sin fecha. Las copias de Epic Games se sugieren como Gratis y las demás como Comprado; el tipo se puede cambiar de a uno o en lote.

#### Scenario: Juego de Epic
- **WHEN** el archivo de Playnite trae Grand Theft Auto V de Epic Games
- **THEN** se sugiere una copia «Epic Games · Gratis» sin fecha

#### Scenario: Cambiar el tipo en lote
- **WHEN** el usuario selecciona 5 juegos de Epic y elige «Comprado»
- **THEN** los 5 quedan con copia de tipo Comprado

### Requirement: Copias desde Steam
Cada juego de la cuenta de Steam SHALL sumar una copia «Steam · Comprado» con sus horas jugadas. Si el archivo de Playnite también trae juegos de Steam, MUST NOT duplicarse esa copia.

#### Scenario: Steam por dos caminos
- **WHEN** Hades llega desde la cuenta de Steam y también desde el archivo de Playnite
- **THEN** Hades tiene una sola copia de Steam

### Requirement: Fuentes que se juntan
Si un mismo juego llega de varias fuentes, el sistema SHALL juntarlo en un solo juego: el estado y el puntaje salen de IGN y las copias de Steam y Playnite, sin importar el orden en que se importen.

#### Scenario: IGN más Steam
- **WHEN** Hollow Knight llega de IGN como Beat con 9 y de Steam con 48 h
- **THEN** queda un solo Hollow Knight, «Completado», con 9.0 y una copia de Steam con 48 h

### Requirement: Grupo «¿Es sin fin?»
El sistema SHALL agrupar los juegos que llegan como Completado y que en IGDB son solo multijugador, y sugerir el estado «Jugado» con la marca sin fin. El usuario acepta o rechaza la sugerencia de a uno o todas juntas.

#### Scenario: Juego multijugador terminado
- **WHEN** Among Us llega de IGN como Beat
- **THEN** aparece en «¿Es sin fin?» con la sugerencia «Jugado · sin fin»

### Requirement: Grupo «¿Lo vas a jugar alguna vez?»
El sistema SHALL agrupar los juegos que llegan como Pendiente sin puntaje o con 0 h en sus tiendas. Para cada uno, o en lote, el usuario elige dejarlo en Pendiente, marcarlo «Sin interés» o no importarlo.

#### Scenario: Juego que nunca se va a jugar
- **WHEN** el usuario marca 8BitMMO como «Sin interés» en este grupo y confirma la importación
- **THEN** 8BitMMO entra a la biblioteca marcado «Sin interés» y con su copia de Steam

### Requirement: Grupo «Elegí un estado»
El sistema SHALL agrupar los juegos que el usuario tiene, con horas jugadas, pero que no vinieron de IGN. Se sugiere «Pendiente» y el usuario puede asignar otro estado de a uno o en lote.

#### Scenario: Juego jugado que no estaba en IGN
- **WHEN** un juego de Steam con 12 h no está en el archivo de IGN
- **THEN** aparece en «Elegí un estado» con la sugerencia «Pendiente»

### Requirement: Grupo «No lo encontré»
Los juegos que no se pudieron cruzar con IGDB SHALL agruparse con tres opciones: buscarlos con otro nombre, entrarlos como cargados a mano o no importarlos.

#### Scenario: Juego viejo sin cruce
- **WHEN** un juego de IGN no aparece en IGDB por ningún camino
- **THEN** queda en «No lo encontré» con esas tres opciones

### Requirement: Grupo «Listos»
Los juegos sin nada dudoso SHALL agruparse en «Listos» y pueden confirmarse sin revisarlos de a uno.

#### Scenario: Confirmar lo que está listo
- **WHEN** el usuario confirma el grupo «Listos»
- **THEN** esos juegos entran a la biblioteca con lo sugerido

### Requirement: Duración desde HowLongToBeat
Si IGDB no tiene duración para un juego y el archivo de IGN trae la de HowLongToBeat, el sistema SHALL usar la duración principal de HowLongToBeat.

#### Scenario: Duración de respaldo
- **WHEN** IGDB no tiene duración para 60 Seconds! y el archivo de IGN trae 2.3 h de HowLongToBeat
- **THEN** el juego entra con una duración estimada de 2.3 h

### Requirement: No pisar lo que ya está
Si un juego importado ya está en la biblioteca, la importación MUST NOT cambiar su estado ni su puntaje; solo suma las copias que falten.

#### Scenario: Juego ya puntuado
- **WHEN** el usuario importa IGN y Hades ya estaba en su biblioteca con 9.6
- **THEN** Hades conserva 9.6 aunque IGN diga 9

### Requirement: Reimportar sin duplicar
Volver a importar MUST NOT duplicar juegos ni copias. Las copias se reconocen por tienda más ID en la tienda, y los juegos de IGN por su ID de IGN.

#### Scenario: Segunda importación de Playnite
- **WHEN** el usuario importa de nuevo un archivo de Playnite con 2 juegos nuevos de Epic
- **THEN** solo entran esos 2 juegos y el resto queda igual

### Requirement: Resumen al confirmar
Al confirmar, el sistema SHALL mostrar cuántos juegos y copias entraron, cuántos quedaron marcados «Sin interés» y cuántos no se importaron.

#### Scenario: Resumen final
- **WHEN** el usuario confirma la importación
- **THEN** ve un resumen como «Entraron 480 juegos y 520 copias · 60 marcados «Sin interés» · 4 sin importar»
