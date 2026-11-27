## MODIFIED Requirements

### Requirement: Estados por defecto
Cada usuario nuevo SHALL arrancar con estos estados: En curso: Jugando, En pausa. Sin empezar: Quiero jugarlo, Backlog. Terminado: Completado, Jugado. Dejado: Abandonado, Lo probé. Que un juego no se termina es la marca «sin fin» del juego, y que se completó todo es la marca «100%»: ninguna de las dos es un estado.

#### Scenario: Estado «Jugado»
- **WHEN** un usuario nuevo mira el grupo Terminado
- **THEN** ve «Completado» y «Jugado»

#### Scenario: Sin empezar
- **WHEN** un usuario nuevo mira el grupo Sin empezar
- **THEN** ve «Quiero jugarlo» y «Backlog»

### Requirement: Colores de los estados
Cada estado SHALL mostrarse con el color de su grupo: verde lima para En curso, azul para Terminado y coral para Dejado. En Sin empezar, «Quiero jugarlo» MUST verse en ámbar y «Backlog» en gris. En Dejado, «Lo probé» MUST verse en violeta: probar un juego y que no enganche no es algo negativo.

#### Scenario: Color de «Quiero jugarlo»
- **WHEN** se muestra un juego en «Quiero jugarlo»
- **THEN** su etiqueta de estado se ve en ámbar

#### Scenario: Color de «Lo probé»
- **WHEN** se muestra un juego en «Lo probé»
- **THEN** su etiqueta de estado se ve en violeta y la de «Abandonado», en coral

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
- **THEN** ve: Jugando, «Lo estás jugando ahora»; En pausa, «Lo empezaste y pensás volver»; Quiero jugarlo, «Lo querés jugar pronto, lo tengas o no»; Backlog, «Lo vas a jugar en algún momento, sin apuro»; Completado, «Terminaste la historia principal»; Jugado, «Un juego sin fin que jugaste y ya no»; Abandonado, «Lo jugaste en serio y lo dejaste sin terminar»; Lo probé, «Lo jugaste un rato y no te enganchó»

### Requirement: «Jugado» y la marca sin fin
Al cambiar el estado y al agregar un juego, el sistema SHALL ofrecer todos los estados. Elegir «Jugado» para un juego que no es sin fin MUST preguntar «Esto le pone la marca «Sin fin» al juego. ¿Estás de acuerdo?», y elegir «Completado» para uno sin fin, «Esto le saca la marca «Sin fin» al juego. ¿Estás de acuerdo?», con «Aceptar» y «Cancelar». Aceptar cambia el estado y la marca juntos; cancelar no cambia nada.

#### Scenario: Jugado en un juego con final
- **WHEN** el usuario elige «Jugado» para Hollow Knight, que no es sin fin, y toca «Aceptar»
- **THEN** Hollow Knight queda en «Jugado» con la marca sin fin

#### Scenario: Completado en un juego sin fin
- **WHEN** el usuario elige «Completado» para Rocket League, marcado sin fin, y toca «Cancelar»
- **THEN** Rocket League queda como estaba

#### Scenario: Al agregar
- **WHEN** el usuario agrega un juego eligiendo «Jugado» y acepta el aviso
- **THEN** el juego se guarda en «Jugado» con la marca sin fin

### Requirement: Marca «100%»
Un juego en «Completado» SHALL poder llevar la marca «100%», que se ve como «Completado · 100%». Al elegir «Completado» aparece la casilla «Lo completé al 100%», y la marca también se cambia desde «Editar». Si el juego sale de «Completado», la marca MUST borrarse.

#### Scenario: Completar al 100%
- **WHEN** el usuario pasa Hollow Knight a «Completado» y marca «Lo completé al 100%»
- **THEN** su tarjeta y su ficha muestran «Completado · 100%»

#### Scenario: Salir de Completado
- **WHEN** Hollow Knight está en «Completado · 100%» y el usuario lo pasa a «Jugando»
- **THEN** queda en «Jugando» sin la marca «100%»

### Requirement: Paso a los estados nuevos
Para los usuarios que ya tenían juegos, el sistema SHALL renombrar «Pendiente» a «Backlog», con sus juegos, pasar los juegos que estaban en el estado «Sin fin» a «Jugado» con la marca sin fin, y los que estaban en «100%» a «Completado» con la marca «100%»; después, los estados «Sin fin» y «100%» dejan de existir. Este paso MUST NOT quedar en el registro de cambios de estado ni cambiar la fecha de fin.

#### Scenario: Juego en «Sin fin»
- **WHEN** Overwatch estaba en el estado «Sin fin» antes de este cambio
- **THEN** queda en «Jugado», con la marca sin fin y sin un registro nuevo en su diario

#### Scenario: Juego en «100%»
- **WHEN** Hades estaba en «100%» antes de este cambio
- **THEN** queda en «Completado · 100%», sin un registro nuevo en su diario

#### Scenario: Juego en «Pendiente»
- **WHEN** Hades estaba en «Pendiente» antes de este cambio
- **THEN** queda en «Backlog»
