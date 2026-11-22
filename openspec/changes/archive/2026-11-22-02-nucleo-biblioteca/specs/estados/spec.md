## Purpose

Indicar en qué punto está el usuario con cada juego, con estados agrupados en cuatro grupos fijos que sostienen los filtros y las estadísticas, y guardar cada cambio de estado.

## ADDED Requirements

### Requirement: Grupos fijos
El sistema SHALL tener cuatro grupos de estados fijos: En curso, Sin empezar, Terminado y Dejado. Los grupos MUST NOT poder borrarse ni crearse.

#### Scenario: Grupos de un usuario nuevo
- **WHEN** un usuario nuevo abre la lista de estados
- **THEN** ve los grupos En curso, Sin empezar, Terminado y Dejado, en ese orden

### Requirement: Estados por defecto
Cada usuario nuevo SHALL arrancar con estos estados: En curso: Jugando, En pausa, Sin fin. Sin empezar: Quiero jugarlo, Pendiente. Terminado: Completado, 100%, Jugado. Dejado: Abandonado, Lo probé.

#### Scenario: Estado «Jugado»
- **WHEN** un usuario nuevo mira el grupo Terminado
- **THEN** ve «Completado», «100%» y «Jugado»

### Requirement: Colores de los estados
Cada estado SHALL mostrarse con el color de su grupo: verde lima para En curso, azul para Terminado y coral para Dejado. En Sin empezar, «Quiero jugarlo» MUST verse en ámbar y «Pendiente» en gris.

#### Scenario: Color de «Quiero jugarlo»
- **WHEN** se muestra un juego en «Quiero jugarlo»
- **THEN** su etiqueta de estado se ve en ámbar

### Requirement: Un estado por juego
Cada juego SHALL tener exactamente un estado, y su ficha muestra desde cuándo lo tiene.

#### Scenario: Ficha con estado
- **WHEN** el usuario abre la ficha de Disco Elysium, que está en «Jugando» desde el 28 de octubre
- **THEN** ve «Jugando · En curso · desde el 28 oct»

### Requirement: Cambiar el estado
El sistema SHALL permitir cambiar el estado de un juego eligiéndolo de una lista agrupada por grupo.

#### Scenario: Cambio de estado
- **WHEN** el usuario cambia Disco Elysium de «Jugando» a «Completado»
- **THEN** el juego queda en «Completado» desde hoy

### Requirement: Registro de cambios de estado
Cada cambio de estado MUST quedar registrado con la fecha, el estado anterior y el nuevo, para mostrarlo después en el diario del juego.

#### Scenario: Cambio registrado
- **WHEN** el usuario pasa Elden Ring de «Pendiente» a «Lo probé»
- **THEN** queda guardado un registro con la fecha de hoy, «Pendiente» y «Lo probé»

### Requirement: Fecha de fin
Al pasar un juego a un estado del grupo Terminado, el sistema SHALL guardar la fecha de ese día como fecha de fin.

#### Scenario: Terminar un juego
- **WHEN** el usuario pasa Hollow Knight a «Completado» el 6 de noviembre
- **THEN** la ficha muestra que lo terminó el 6 nov
