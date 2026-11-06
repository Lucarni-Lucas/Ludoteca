## Purpose

Registrar cómo tiene el usuario cada juego (en qué tienda, de qué forma y desde cuándo) y conservar el historial de las copias que ya no tiene.

## ADDED Requirements

### Requirement: Varias copias por juego
Un juego SHALL poder tener cero, una o varias copias. Cada copia tiene tienda y tipo; la fecha en que se consiguió es opcional.

#### Scenario: Segunda copia
- **WHEN** el usuario agrega una copia física de Switch a Stardew Valley, que ya tiene en Steam
- **THEN** Stardew Valley muestra dos copias: Steam y Switch (físico)

#### Scenario: Sin fecha
- **WHEN** el usuario agrega una copia sin indicar la fecha
- **THEN** la copia se guarda y su fecha queda vacía

### Requirement: Tiendas disponibles
El sistema SHALL ofrecer las tiendas Steam, Epic Games, GOG, Microsoft Store, Game Pass, Nintendo Switch, itch.io, PlayStation, EA app, Ubisoft Connect, Battle.net y Amazon Games, y permitir escribir otra. Una tienda escrita por el usuario MUST ser solo suya.

#### Scenario: Otra tienda
- **WHEN** el usuario elige «Otra» y escribe «Humble Store»
- **THEN** la copia queda en «Humble Store» y esa tienda aparece en sus opciones de ahí en adelante

### Requirement: Tipos de copia
Cada copia SHALL tener uno de estos tipos: Comprado, Gratis, Suscripción, Familia o Físico. Una copia de tipo Familia SHALL poder guardar de quién es.

#### Scenario: Copia de la familia
- **WHEN** el usuario agrega Portal 2 como copia Familia de «Martín» en Steam
- **THEN** la copia muestra «Familia · de Martín»

### Requirement: Marca «Ya no lo tengo»
El sistema SHALL permitir marcar una copia como «Ya no lo tengo», con fecha y motivo (Salí de la familia, Terminó la suscripción, Lo vendí u Otro). La copia MUST conservar su tipo original.

#### Scenario: Copia vendida
- **WHEN** el usuario marca su copia física de un juego como «Ya no lo tengo» con el motivo «Lo vendí»
- **THEN** la copia se ve tachada como «Físico · ya no» y conserva su tipo y su fecha original

### Requirement: Los datos del juego no dependen de las copias
Marcar copias como «Ya no lo tengo» MUST NOT cambiar el estado, el puntaje, las horas, la reseña ni el historial del juego, aunque se marquen todas.

#### Scenario: Se pierde la única copia
- **WHEN** el usuario marca como «Ya no lo tengo» la única copia de Ori and the Will of the Wisps, que está «Completado» con 8.8
- **THEN** Ori sigue en la biblioteca, «Completado», con 8.8 y sus horas

### Requirement: Recuperar una copia
El sistema SHALL permitir quitar la marca «Ya no lo tengo» de una copia, que vuelve a estar vigente con sus datos originales.

#### Scenario: Deshacer
- **WHEN** el usuario quita la marca «Ya no lo tengo» de una copia de Game Pass
- **THEN** la copia vuelve a estar vigente como «Game Pass · Suscripción»

### Requirement: Eliminar una copia cargada por error
El sistema SHALL permitir eliminar una copia previa confirmación. A diferencia de «Ya no lo tengo», eliminar no deja historial.

#### Scenario: Eliminar con confirmación
- **WHEN** el usuario elimina una copia y confirma
- **THEN** la copia desaparece del juego sin dejar rastro

### Requirement: Comprar algo de «Quiero jugarlo»
Al agregar una copia Comprado, Gratis o Físico a un juego que está en «Quiero jugarlo», el sistema SHALL pasarlo a «Pendiente» y avisarlo.

#### Scenario: Compra de un juego deseado
- **WHEN** el usuario agrega una copia Comprado en Microsoft Store a Frostpunk, que estaba en «Quiero jugarlo»
- **THEN** Frostpunk pasa a «Pendiente» y el usuario ve «Frostpunk pasó a «Pendiente»»

#### Scenario: Copia que no es propia
- **WHEN** el usuario agrega una copia Suscripción a un juego en «Quiero jugarlo»
- **THEN** el juego sigue en «Quiero jugarlo»
