## Purpose

Mostrar en un solo lugar todas las tiendas del usuario, cómo llega cada una a Ludoteca y cuántos juegos aporta.

## ADDED Requirements

### Requirement: Tiendas agrupadas por cómo se cargan
La pantalla de Tiendas SHALL mostrar tres grupos: «Se sincronizan solas» (Steam, si está conectada), «Importadas o a mano» (las tiendas con juegos importados o cargados a mano) y «Sin conectar» (las tiendas conocidas en las que el usuario no tiene juegos).

#### Scenario: Usuario con Steam, Epic e itch.io
- **WHEN** el usuario tiene Steam conectada, juegos de Epic importados desde Playnite y un juego de itch.io cargado a mano
- **THEN** ve Steam en «Se sincronizan solas», Epic e itch.io en «Importadas o a mano» y PlayStation, EA app, Ubisoft Connect, Battle.net y Amazon Games en «Sin conectar»

### Requirement: Datos de cada tienda
Cada tienda SHALL mostrar cómo llega (con tu cuenta, importación o a mano), cuántos juegos tiene con copias vigentes y cuándo fue su última sincronización o importación.

#### Scenario: Tarjeta de Epic
- **WHEN** el usuario mira la tarjeta de Epic Games
- **THEN** ve «Importación · 211 juegos · importada el 12 nov»

### Requirement: Acción de cada tienda
Cada tienda SHALL ofrecer su acción: «Sincronizar ahora» si se sincroniza sola, «Importar de nuevo» si se importó y «Agregar juego» si se carga a mano.

#### Scenario: Importar de nuevo
- **WHEN** el usuario toca «Importar de nuevo» en Epic Games
- **THEN** va a la importación con Playnite como fuente

### Requirement: Suscripciones en su sección
La pantalla de Tiendas SHALL aclarar que Game Pass y las demás suscripciones se manejan en Suscripciones.

#### Scenario: Aclaración
- **WHEN** el usuario mira el grupo «Sin conectar»
- **THEN** ve la nota «Game Pass y las demás suscripciones se manejan en Suscripciones»
