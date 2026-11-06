## Purpose

Registrar los juegos prestados por la familia de Steam, que no son del usuario, y reflejar de una vez que se pierden todos al salir de la familia.

## ADDED Requirements

### Requirement: Copias de la familia a mano
Las copias prestadas por la familia de Steam SHALL cargarse a mano como copias Familia de Steam, porque Steam no las informa. La sincronización MUST NOT tocarlas.

#### Scenario: Juego prestado
- **WHEN** el usuario agrega Portal 2 como copia Familia de Steam
- **THEN** Portal 2 muestra «Steam · Familia» y la sincronización con Steam no lo modifica

### Requirement: Panel de la familia
La pantalla de Tiendas SHALL mostrar si el usuario tiene juegos de una familia de Steam, cuántos y cuáles.

#### Scenario: Con juegos prestados
- **WHEN** el usuario tiene a Portal 2 como único juego de la familia
- **THEN** ve «Estás en una familia · 1 juego compartido que no es tuyo: Portal 2»

#### Scenario: Sin juegos prestados
- **WHEN** el usuario no tiene copias Familia vigentes
- **THEN** el panel dice «No tenés juegos de una familia de Steam»

### Requirement: Salir de la familia
El sistema SHALL ofrecer «Salí de la familia», que pide confirmación y marca todas las copias Familia vigentes de Steam como «Ya no lo tengo» con el motivo «Salí de la familia». La confirmación MUST avisar que Steam no deja unirse a otra familia durante un año.

#### Scenario: Salida confirmada
- **WHEN** el usuario confirma «Salí de la familia»
- **THEN** Portal 2 queda con su copia de Familia marcada «Ya no lo tengo» y conserva su puntaje, sus horas y su diario
- **AND** ve «Listo: Portal 2 pasó a «Ya no lo tengo». Tu puntaje y tus horas quedan guardados.»

### Requirement: Deshacer la salida
Después de salir de la familia, el sistema SHALL ofrecer «Deshacer», que vuelve a dejar vigentes exactamente las copias que esa salida había marcado.

#### Scenario: Deshacer
- **WHEN** el usuario toca «Deshacer» después de salir de la familia
- **THEN** Portal 2 vuelve a tener su copia de Familia vigente
