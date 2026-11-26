## RENAMED Requirements

- FROM: `### Requirement: Estado inicial según las copias`
- TO: `### Requirement: Estado inicial`

## MODIFIED Requirements

### Requirement: Estado inicial
Un juego recién agregado SHALL quedar en «Backlog», tenga copias o no, salvo que el usuario elija otro estado.

#### Scenario: Agregado sin copias
- **WHEN** el usuario agrega un juego desde IGDB sin indicar cómo lo tiene
- **THEN** el juego queda en «Backlog» y su tarjeta muestra «Sin comprar»

#### Scenario: Agregado con copia
- **WHEN** el usuario carga a mano un juego indicando que lo tiene gratis en itch.io y no elige estado
- **THEN** el juego queda en «Backlog»

### Requirement: Varias copias al agregar
El formulario para agregar un juego, desde IGDB o a mano, SHALL permitir cargar cero, una o varias copias en «Dónde y cómo lo tenés». Cada copia es una fila con su tienda y su tipo, más «De quién es» si es Familia o el detalle si es Otro. El formulario arranca sin copias, con el texto «Todavía no lo tenés» y el botón «Agregar una copia»; con una copia cargada, el botón pasa a decir «Agregar otra copia». Cada fila se puede quitar antes de guardar.

#### Scenario: Agregar con dos copias
- **WHEN** el usuario agrega Civilization VI con una copia Gratis en Epic Games y otra Comprado en Steam
- **THEN** Civilization VI queda en su biblioteca con las dos copias y en «Backlog»

#### Scenario: Quitar una fila antes de guardar
- **WHEN** el usuario suma una segunda copia en el formulario, la quita y guarda
- **THEN** el juego se guarda solo con la primera copia

#### Scenario: Fila incompleta
- **WHEN** el usuario intenta guardar con una copia que tiene tipo pero no tienda
- **THEN** ve «Elegí la tienda de cada copia» y no se guarda nada

#### Scenario: Sin copias
- **WHEN** el usuario guarda sin agregar ninguna copia
- **THEN** el juego se guarda sin copias
