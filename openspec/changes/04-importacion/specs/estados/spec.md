## MODIFIED Requirements

### Requirement: Estados por defecto
Cada usuario nuevo SHALL arrancar con estos estados: En curso: Jugando, En pausa. Sin empezar: Quiero jugarlo, Backlog. Terminado: Completado, 100%, Jugado. Dejado: Abandonado, Lo probé. Que un juego no se termina es la marca «sin fin» del juego, no un estado.

#### Scenario: Estado «Jugado»
- **WHEN** un usuario nuevo mira el grupo Terminado
- **THEN** ve «Completado», «100%» y «Jugado»

#### Scenario: Sin empezar
- **WHEN** un usuario nuevo mira el grupo Sin empezar
- **THEN** ve «Quiero jugarlo» y «Backlog»

### Requirement: Colores de los estados
Cada estado SHALL mostrarse con el color de su grupo: verde lima para En curso, azul para Terminado y coral para Dejado. En Sin empezar, «Quiero jugarlo» MUST verse en ámbar y «Backlog» en gris.

#### Scenario: Color de «Quiero jugarlo»
- **WHEN** se muestra un juego en «Quiero jugarlo»
- **THEN** su etiqueta de estado se ve en ámbar

### Requirement: Registro de cambios de estado
Cada cambio de estado MUST quedar registrado con la fecha, el estado anterior y el nuevo, para mostrarlo después en el diario del juego.

#### Scenario: Cambio registrado
- **WHEN** el usuario pasa Elden Ring de «Backlog» a «Lo probé»
- **THEN** queda guardado un registro con la fecha de hoy, «Backlog» y «Lo probé»

## ADDED Requirements

### Requirement: Qué significa cada estado
Al elegir un estado, cada estado por defecto SHALL mostrar debajo una línea que dice qué significa.

#### Scenario: Líneas de cada estado
- **WHEN** el usuario abre la lista de estados de un juego
- **THEN** ve: Jugando, «Lo estás jugando ahora»; En pausa, «Lo empezaste y pensás volver»; Quiero jugarlo, «Lo querés jugar pronto, lo tengas o no»; Backlog, «Lo vas a jugar en algún momento, sin apuro»; Completado, «Terminaste la historia principal»; 100%, «Lo terminaste todo»; Jugado, «Un juego sin fin que jugaste y ya no»; Abandonado, «Lo jugaste en serio y lo dejaste sin terminar»; Lo probé, «Lo jugaste un rato y no te enganchó»

### Requirement: Estados según el juego
Al elegir un estado, el sistema SHALL ofrecer «Completado» y «100%» solo a los juegos que no son sin fin, y «Jugado» solo a los sin fin. Los demás estados, y los creados por el usuario, se ofrecen siempre. Un juego que ya tiene un estado que no se le ofrecería lo conserva.

#### Scenario: Juego sin fin
- **WHEN** el usuario cambia el estado de Rocket League, marcado sin fin
- **THEN** la lista ofrece «Jugado» y no ofrece «Completado» ni «100%»

#### Scenario: Juego con final
- **WHEN** el usuario cambia el estado de Hollow Knight
- **THEN** la lista ofrece «Completado» y «100%» y no ofrece «Jugado»

### Requirement: Paso a los estados nuevos
Para los usuarios que ya tenían juegos, el sistema SHALL renombrar «Pendiente» a «Backlog», con sus juegos, y pasar los juegos que estaban en el estado «Sin fin» a «Jugado» con la marca sin fin; después, el estado «Sin fin» deja de existir. Este paso MUST NOT quedar en el registro de cambios de estado ni cambiar la fecha de fin.

#### Scenario: Juego en «Sin fin»
- **WHEN** Overwatch estaba en el estado «Sin fin» antes de este cambio
- **THEN** queda en «Jugado», con la marca sin fin y sin un registro nuevo en su diario

#### Scenario: Juego en «Pendiente»
- **WHEN** Hades estaba en «Pendiente» antes de este cambio
- **THEN** queda en «Backlog»
