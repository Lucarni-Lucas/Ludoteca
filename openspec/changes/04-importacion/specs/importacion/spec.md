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

### Requirement: Acceso a la importación
El sistema SHALL ofrecer la importación desde Ajustes y, con la biblioteca vacía, desde el aviso de la biblioteca, junto a agregar un juego.

#### Scenario: Biblioteca vacía
- **WHEN** el usuario todavía no cargó ningún juego y abre la biblioteca
- **THEN** ve «Agregá tu primer juego» y «Importar tu biblioteca»

### Requirement: Revisión antes de confirmar
Lo importado MUST NOT entrar a la biblioteca hasta que el usuario confirme. La revisión SHALL guardarse para retomarla en otro momento.

#### Scenario: Retomar la revisión
- **WHEN** el usuario revisa la mitad de los juegos, cierra la app y vuelve al día siguiente
- **THEN** encuentra la revisión donde la dejó y su biblioteca sin cambios

### Requirement: Empezar de nuevo
El sistema SHALL permitir descartar la revisión en curso con «Empezar de nuevo», previa confirmación. Descartarla MUST borrar los archivos subidos, lo traído de Steam y todas las decisiones que todavía no se confirmaron, sin tocar la biblioteca ni lo que ya se importó. La cuenta de Steam sigue conectada.

#### Scenario: Descartar la revisión
- **WHEN** el usuario subió los archivos de IGN y Playnite, decidió algunos juegos sin confirmar, toca «Empezar de nuevo» y confirma
- **THEN** la pantalla vuelve a mostrar las fuentes sin archivos, ningún grupo tiene juegos y su biblioteca queda igual

#### Scenario: Lo ya importado se conserva
- **WHEN** el usuario ya había confirmado una parte de la importación y después empieza de nuevo
- **THEN** los juegos que ya entraron siguen en su biblioteca y, al volver a importar, no se duplican

### Requirement: Vencimiento de la revisión
Si pasan 7 días sin que el usuario toque la importación (subir un archivo, traer de Steam, decidir un juego o confirmar), el sistema SHALL descartar la revisión en curso como «Empezar de nuevo», sin pedir confirmación, y avisarlo la próxima vez que el usuario abra la importación. Al confirmar, de cada juego confirmado MUST quedar solo lo necesario para reconocerlo al reimportar: la fuente, su ID en la fuente y en qué quedó. El resto de lo que usó la revisión se borra.

#### Scenario: Revisión abandonada
- **WHEN** el usuario deja la revisión a la mitad y vuelve a la importación 8 días después
- **THEN** ve «Tu revisión anterior se descartó porque pasaron 7 días sin tocarla.», las fuentes sin archivos y su biblioteca sin cambios

#### Scenario: Revisión en uso
- **WHEN** el usuario decide algunos juegos cada 3 días durante dos semanas
- **THEN** la revisión sigue donde la dejó

#### Scenario: Confirmado que no vuelve
- **WHEN** el usuario confirmó Hollow Knight desde IGN, después lo quitó de su biblioteca y vuelve a subir el mismo archivo de IGN
- **THEN** Hollow Knight no vuelve a la revisión

### Requirement: Cruce con IGDB
Cada juego importado SHALL cruzarse con IGDB primero por su ID en la tienda (Steam, Epic, GOG u otra) y, si no tiene, por título. Si por título hay un solo candidato con el mismo nombre, el cruce MUST darse por bueno aunque el año sea distinto. Si hay varios candidatos, o uno solo con otro nombre, el juego queda para que el usuario elija.

#### Scenario: Cruce por ID de Steam
- **WHEN** un juego de IGN trae el ID de Steam 1966900
- **THEN** se cruza con 20 Minutes Till Dawn de IGDB sin buscar por título

#### Scenario: Mismo nombre, otro año
- **WHEN** Playnite trae 20XX de Epic con el año 2020 e IGDB devuelve solo 20XX de 2017
- **THEN** se cruza con 20XX de 2017 y no se le pregunta nada al usuario

#### Scenario: Título ambiguo
- **WHEN** un juego sin ID de tienda se llama «Crash Bandicoot» y IGDB devuelve varios candidatos
- **THEN** queda en «¿Cuál de estos es?» con los candidatos para elegir

### Requirement: Buscar sin la edición
Si la búsqueda por título dejaría el juego en «No lo encontré» (IGDB no tiene nada igual ni parecido) y el título nombra una edición («Deluxe Edition», «Game of the Year Edition», «Complete» y parecidas), el sistema SHALL buscar de nuevo sin la edición. Lo que encuentre así MUST NOT cruzarse solo: queda para que el usuario elija.

#### Scenario: Título con la edición
- **WHEN** Playnite trae «Styx: Shards of Darkness - Deluxe Edition» de Epic, IGDB no tiene nada igual ni parecido a ese título y, sin la edición, devuelve solo «Styx: Shards of Darkness»
- **THEN** queda en «¿Cuál de estos es?» con la pregunta «¿Es este juego?» y «Styx: Shards of Darkness» como candidato

### Requirement: Estados desde IGN
Los estados de IGN SHALL pasar así: Playing a Jugando, Paused a En pausa, Beat a Completado, Quit a Abandonado, Wishlist a Quiero jugarlo, y Backlog a Pendiente si el juego tiene alguna copia o a Quiero jugarlo si no. Un juego con dos estados de IGN MUST quedar en «¿Cómo lo dejaste?».

#### Scenario: Backlog con copia
- **WHEN** un juego en Backlog en IGN también llega con una copia de Steam
- **THEN** se sugiere «Pendiente»

#### Scenario: Backlog sin copia
- **WHEN** un juego en Backlog en IGN no tiene copias en ninguna fuente
- **THEN** se sugiere «Quiero jugarlo»

#### Scenario: Wishlist de IGN
- **WHEN** un juego llega de IGN como Wishlist
- **THEN** se sugiere «Quiero jugarlo»

#### Scenario: Dos estados a la vez
- **WHEN** un juego viene de IGN como Beat y Quit a la vez
- **THEN** queda en «¿Cómo lo dejaste?» para que el usuario elija

### Requirement: Puntajes desde IGN
Los puntajes enteros de IGN SHALL pasar con un decimal en cero.

#### Scenario: Puntaje entero
- **WHEN** un juego de IGN tiene puntaje 8
- **THEN** se sugiere el puntaje 8.0

### Requirement: Copias desde Playnite
Cada juego del archivo de Playnite SHALL sumar una copia en su tienda, con las horas jugadas que informe y sin fecha. Las copias de Epic Games se sugieren como Gratis y las demás como Comprado; el tipo se puede cambiar de a uno o en lote con la acción «¿Cómo lo conseguiste?».

#### Scenario: Juego de Epic
- **WHEN** el archivo de Playnite trae Grand Theft Auto V de Epic Games
- **THEN** se sugiere una copia «Epic Games · Gratis» sin fecha

#### Scenario: Cambiar el tipo en lote
- **WHEN** el usuario selecciona 5 juegos de Epic, toca «¿Cómo lo conseguiste?» y elige «Comprado»
- **THEN** los 5 quedan con copia de tipo Comprado

### Requirement: Copias desde Steam
Cada juego de la cuenta de Steam SHALL sumar una copia «Steam · Comprado» con sus horas jugadas. Si el archivo de Playnite también trae juegos de Steam, MUST NOT duplicarse esa copia.

#### Scenario: Steam por dos caminos
- **WHEN** Hades llega desde la cuenta de Steam y también desde el archivo de Playnite
- **THEN** Hades tiene una sola copia de Steam

### Requirement: Juegos de Steam de la familia
Un juego que el archivo de Playnite trae de Steam y que la cuenta de Steam del usuario no tiene SHALL agruparse en «¿Es de tu familia?», con las respuestas «Sí, es de mi familia» (copia «Steam · Familia»), «No, es mío» (copia «Steam · Comprado») y «No importar», de a uno o en lote. Si la cuenta de Steam todavía no se conectó, esos juegos esperan en ese grupo hasta conectarla.

#### Scenario: Juego instalado de un familiar
- **WHEN** Playnite trae Portal 2 de Steam y la cuenta de Steam del usuario no tiene Portal 2
- **THEN** Portal 2 aparece en «¿Es de tu familia?» y, si el usuario responde «Sí, es de mi familia», pasa a «Listos para importar» con la copia «Steam · Familia»

#### Scenario: Juego propio instalado
- **WHEN** Playnite trae Celeste de Steam y la cuenta de Steam del usuario tiene Celeste
- **THEN** Celeste tiene una sola copia «Steam · Comprado» y no aparece en «¿Es de tu familia?»

### Requirement: Fuentes que se juntan
Si un mismo juego llega de varias fuentes, el sistema SHALL juntarlo en un solo juego: el estado y el puntaje salen de IGN y las copias de Steam y Playnite, sin importar el orden en que se importen.

#### Scenario: IGN más Steam
- **WHEN** Hollow Knight llega de IGN como Beat con 9 y de Steam con 48 h
- **THEN** queda un solo Hollow Knight, «Completado», con 9.0 y una copia de Steam con 48 h

### Requirement: Mismo nombre desde varias fuentes
Los juegos que no se cruzaron solos con IGDB (los de «¿Cuál de estos es?» y «No lo encontré») y que llegan de distintas fuentes o tiendas con el mismo nombre SHALL juntarse en un solo juego a revisar. La pregunta MUST mostrar cada origen («En IGN: Fortnite · 2017», «En Epic: Fortnite · 2020») y una sola respuesta vale para todos: el juego entra una vez, con el estado y el puntaje de IGN y las copias de cada tienda.

#### Scenario: Fortnite de IGN y de Epic
- **WHEN** Fortnite llega de IGN de 2017 con 8 y de Epic de 2020 con 120 h, e IGDB devuelve dos Fortnite
- **THEN** «¿Cuál de estos es?» muestra un solo Fortnite con los dos orígenes, y al elegir un candidato pasa a «Listos para importar» con 8.0 y la copia de Epic Games con 120 h

#### Scenario: Mismo nombre sin encontrar
- **WHEN** Snakebird Complete llega de IGN y de Epic y no aparece en IGDB
- **THEN** «No lo encontré» lo muestra una sola vez con los dos orígenes, y «No importar» deja afuera a los dos

### Requirement: Lo que no es un juego
Una demo, una beta (también Open Beta y Closed Beta), un servidor de prueba, un soundtrack o algo parecido, reconocido por el final de su título, MUST NOT entrar como juego. Si su juego base llega de la misma tienda o ya tiene una copia de esa tienda, sus horas se suman a esa copia. Si no, SHALL quedar en «Listos para importar» como «No se importa · no es un juego», y se puede traer con «Volver a revisar». Un título entre corchetes se busca en IGDB como cualquier otro.

#### Scenario: Beta con su juego
- **WHEN** Playnite trae de Epic «Mortal Shell Tech Beta» con 3 h y también «Mortal Shell»
- **THEN** entra un solo Mortal Shell y su copia de Epic Games suma las 3 h de la beta

#### Scenario: Demo sin su juego
- **WHEN** Playnite trae «Cuphead Demo» de Steam y el usuario no tiene Cuphead
- **THEN** la demo aparece en «Listos para importar» como «No se importa · no es un juego» y no entra a la biblioteca al confirmar

#### Scenario: Nombre entre corchetes
- **WHEN** Playnite trae «[REDACTED]» de Epic
- **THEN** se busca en IGDB como cualquier otro título y, si IGDB tiene un solo [REDACTED], se cruza con ese

### Requirement: Grupo «¿Es sin fin?»
El sistema SHALL agrupar los juegos que llegan como Completado y que en IGDB son solo multijugador, con las respuestas «Sí, no se termina» (entra como «Jugado» con la marca sin fin), «No, lo terminé» (entra como «Completado») y «No importar», de a uno o en lote.

#### Scenario: Juego multijugador terminado
- **WHEN** Among Us llega de IGN como Beat
- **THEN** aparece en «¿Es sin fin?» con «Sí, no se termina», «No, lo terminé» y «No importar», sin ninguna marcada

### Requirement: Grupo «¿Lo vas a jugar alguna vez?»
El sistema SHALL agrupar los juegos que llegan como Pendiente sin puntaje o con 0 h en sus tiendas. Las respuestas SHALL ser «Sí, algún día» (entra como Pendiente), «No» (entra marcado «Sin interés»: no se ve en la biblioteca, pero «¿Lo tengo?» sabe que es suyo) y «No importar», de a uno o en lote. La explicación del grupo MUST decir la diferencia entre «No» y «No importar».

#### Scenario: Juego que nunca se va a jugar
- **WHEN** el usuario responde «No» para 8BitMMO en este grupo y confirma la importación
- **THEN** 8BitMMO entra a la biblioteca marcado «Sin interés» y con su copia de Steam

### Requirement: Grupo «Elegí un estado»
El sistema SHALL agrupar los juegos que el usuario tiene, con horas jugadas, pero que no vinieron de IGN. Las respuestas SHALL ser «Lo estoy jugando» (Jugando), «Lo terminé» (Completado), «Lo abandoné» (Abandonado), «Lo probé» (Lo probé), «Otro estado», que abre la lista con todos los estados, y «No importar», sin ninguna marcada, de a uno o en lote.

#### Scenario: Juego jugado que no estaba en IGN
- **WHEN** un juego de Steam con 12 h no está en el archivo de IGN
- **THEN** aparece en «Elegí un estado» con «Lo estoy jugando», «Lo terminé», «Lo abandoné», «Lo probé», «Otro estado» y «No importar», sin ninguna marcada

#### Scenario: Otro estado
- **WHEN** el usuario toca «Otro estado» en Frostpunk, de «Elegí un estado», y elige «En pausa» en la lista
- **THEN** Frostpunk pasa a «Listos para importar» con «En pausa»

### Requirement: Grupo «¿Cuál de estos es?»
Los juegos con varios candidatos en IGDB SHALL agruparse en «¿Cuál de estos es?». Cada uno muestra cómo llegó (fuente, nombre y año) y los candidatos con portada, nombre completo y año, más «Ninguno, lo busco yo» y «No importar». Ninguna opción viene marcada: elegir una dice qué juego es, y el juego sigue como pide «Después de decir qué juego es».

#### Scenario: Elegir entre varios
- **WHEN** IGN trae Crash Bandicoot de 1996 e IGDB devuelve cinco juegos con ese nombre
- **THEN** el usuario ve «En IGN: Crash Bandicoot · 1996» y los cinco candidatos, sin ninguno marcado

#### Scenario: Un solo candidato con otro nombre
- **WHEN** Playnite trae «Castlevania Anniversary Collection» e IGDB devuelve solo «Castlevania: Anniversary Collection - Ultimate Edition»
- **THEN** la pregunta es «¿Es este juego?», con «Sí», «No, lo busco yo» y «No importar»

#### Scenario: Buscar otro
- **WHEN** el usuario toca «Ninguno, lo busco yo» y elige otro juego en la búsqueda
- **THEN** el juego queda como el elegido y pasa al grupo que le toque con sus datos

### Requirement: Después de decir qué juego es
Decir qué juego es («¿Cuál de estos es?», «¿Es este juego?», buscarlo con otro nombre o cargarlo a mano) SHALL resolver solo esa pregunta. Después el juego MUST pasar al grupo que le toque con sus datos, como uno que se cruzó solo: «¿Lo vas a jugar alguna vez?», «¿Es sin fin?», «Elegí un estado» o, si no le falta nada, «Listos para importar».

#### Scenario: Elegido sin jugar
- **WHEN** el usuario elige «Love» de 2015 para LOVE de Epic, que llegó con 0 h y sin puntaje
- **THEN** LOVE pasa a «¿Lo vas a jugar alguna vez?» y la pantalla dice «LOVE pasó a «¿Lo vas a jugar alguna vez?».»

#### Scenario: Cargado a mano sin jugar
- **WHEN** el usuario carga a mano un juego de «No lo encontré» que llegó de IGN en Backlog, sin puntaje y con una copia de Epic con 0 h
- **THEN** el juego pasa a «¿Lo vas a jugar alguna vez?» como cargado a mano

#### Scenario: Elegido sin dudas
- **WHEN** el usuario elige un candidato para Crash Bandicoot, que llegó de IGN como Beat con 8
- **THEN** Crash Bandicoot pasa a «Listos para importar» como «Completado» con 8.0

### Requirement: Grupo «¿Cómo lo dejaste?»
Los juegos que llegan de IGN con dos estados SHALL agruparse en «¿Cómo lo dejaste?», con un botón por cada estado dicho en palabras («Lo terminaste», «Lo abandonaste»), más «Otro estado» y «No importar». Ninguna opción viene marcada.

#### Scenario: Terminado y abandonado
- **WHEN** Overwatch llega de IGN como Beat y Quit
- **THEN** el usuario ve «IGN lo tiene como terminado y como abandonado» con «Lo terminaste», «Lo abandonaste», «Otro estado» y «No importar»

### Requirement: Grupo «No lo encontré»
Los juegos que no se pudieron cruzar con IGDB SHALL agruparse con tres opciones: buscarlos con otro nombre, entrarlos como cargados a mano o no importarlos.

#### Scenario: Juego viejo sin cruce
- **WHEN** un juego de IGN no aparece en IGDB por ningún camino
- **THEN** queda en «No lo encontré» con esas tres opciones

### Requirement: Respuestas sin marcar
En todos los grupos, las opciones de un juego SHALL ser respuestas a la pregunta del grupo, dichas en palabras, y ninguna MUST venir marcada. Tocar una respuesta contesta la pregunta del grupo, y el juego pasa al siguiente grupo que le toque o, si no le queda ninguna pregunta, a «Listos para importar». En lote, el usuario selecciona varios juegos y toca la misma respuesta.

#### Scenario: Nada marcado
- **WHEN** el usuario abre «¿Lo vas a jugar alguna vez?» y 112 Operator llega de Epic con 0 h
- **THEN** 112 Operator muestra «Sí, algún día», «No» y «No importar», sin ninguna marcada

#### Scenario: Responder en lote
- **WHEN** el usuario selecciona Portal 2 y Watch Dogs en «¿Es de tu familia?» y toca «Sí, es de mi familia»
- **THEN** los dos pasan a «Listos para importar» con la copia «Steam · Familia»

### Requirement: Grupo «Listos para importar»
Los juegos sin nada dudoso y los que el usuario ya decidió en cualquier otro grupo SHALL agruparse en «Listos para importar», y cada uno MUST decir cómo va a entrar (estado, tienda y tipo de copia). Un juego MUST llegar a «Listos para importar» cuando no le queda ninguna pregunta, y después de cada respuesta la pantalla SHALL decir adónde fue. «Confirmar importación» confirma todo lo que está en «Listos para importar» y los demás grupos siguen esperando.

#### Scenario: Decidir pasa a «Listos para importar»
- **WHEN** el usuario responde «No» para Beholder en «¿Lo vas a jugar alguna vez?»
- **THEN** Beholder pasa a «Listos para importar» y la pantalla dice «Beholder pasó a «Listos para importar» con «Sin interés».»

#### Scenario: Confirmar lo que está listo
- **WHEN** el usuario confirma la importación con juegos en «Listos para importar» y otros en «¿Cuál de estos es?»
- **THEN** los de «Listos para importar» entran a la biblioteca con lo respondido y los de «¿Cuál de estos es?» siguen esperando

#### Scenario: Cómo va a entrar
- **WHEN** el usuario abre «Listos para importar» y 112 Operator está decidido como Pendiente
- **THEN** 112 Operator dice «Entra como Pendiente · Epic Games · Gratis»

### Requirement: Volver a revisar
Un juego de «Listos para importar» (también uno que el usuario dejó afuera con «No importar», que se ve ahí como «No se importa»), o uno que pasó a otro grupo después de decir qué juego es, SHALL poder volver con «Volver a revisar» a su primera pregunta, sin ninguna de las respuestas que se habían dado.

#### Scenario: Volver después de elegir un candidato
- **WHEN** el usuario eligió un candidato para Crash Bandicoot en «¿Cuál de estos es?» y después toca «Volver a revisar» en «Listos para importar»
- **THEN** Crash Bandicoot vuelve a «¿Cuál de estos es?» sin candidato elegido y deja de estar en «Listos para importar»

#### Scenario: Arrepentirse de «No importar»
- **WHEN** el usuario tocó «No importar» en 112 Operator, en «¿Lo vas a jugar alguna vez?», y se arrepiente
- **THEN** 112 Operator aparece en «Listos para importar» como «No se importa», toca «Volver a revisar» y vuelve a «¿Lo vas a jugar alguna vez?» sin respuesta

#### Scenario: Volver desde otro grupo
- **WHEN** el usuario eligió «Love» de 2015 para LOVE, que pasó a «¿Lo vas a jugar alguna vez?», y toca «Volver a revisar»
- **THEN** LOVE vuelve a «¿Cuál de estos es?» sin juego elegido

### Requirement: Guía para exportar de Playnite
La importación SHALL ofrecer, desde la fuente Playnite, una página «¿Cómo lo saco?» que explique en una línea qué es Playnite y en pasos cortos cómo instalar el exportador desde la página de su autor, exportar la biblioteca en JSON y subir el archivo.

#### Scenario: Abrir la guía de Playnite
- **WHEN** el usuario toca «¿Cómo lo saco?» en la fuente Playnite
- **THEN** ve la guía con el link a la página del exportador y los pasos para exportar y subir el archivo

### Requirement: Guía y marcador para exportar de IGN
La importación SHALL ofrecer, desde la fuente IGN, una página «¿Cómo lo saco?» con un marcador para el navegador que, usado en la lista de juegos del usuario en IGN con su sesión abierta, descarga el archivo listo para subir. El marcador MUST correr solo en el navegador del usuario, sin mandar nada a Ludoteca ni a terceros, y la guía SHALL avisar que puede dejar de andar si IGN cambia su página.

#### Scenario: Exportar de IGN
- **WHEN** el usuario arrastra el marcador a su barra de favoritos, entra a su lista en IGN y lo toca
- **THEN** su navegador descarga un archivo JSON que la importación acepta como archivo de IGN

#### Scenario: Aviso de que puede fallar
- **WHEN** el usuario abre la guía de IGN
- **THEN** ve que el marcador depende de la página de IGN y que, si deja de andar, se puede avisar para arreglarlo

### Requirement: Duración desde HowLongToBeat
Si IGDB no tiene duración para un juego y el archivo de IGN trae la de HowLongToBeat, el sistema SHALL usar la duración principal de HowLongToBeat y la ficha MUST decir que sale de HowLongToBeat. No cuenta como una corrección del usuario.

#### Scenario: Duración de respaldo
- **WHEN** IGDB no tiene duración para 60 Seconds! y el archivo de IGN trae 2.3 h de HowLongToBeat
- **THEN** el juego entra con una duración estimada de 2.3 h y la ficha muestra «unas 2.3 h · HowLongToBeat»

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
