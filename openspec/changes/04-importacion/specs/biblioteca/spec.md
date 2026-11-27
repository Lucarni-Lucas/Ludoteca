## RENAMED Requirements

- FROM: `### Requirement: Marca «Sin interés»`
- TO: `### Requirement: Juegos ocultos`

## MODIFIED Requirements

### Requirement: Copias en la tarjeta
Cada tarjeta SHALL mostrar sus copias como etiquetas: solo la tienda si la copia es Comprado; tienda y detalle si es Otro con detalle; tienda y tipo en los demás casos; y tachada si ya no la tiene. Un juego sin copias muestra «Sin comprar», esté en el estado que esté.

#### Scenario: Copia de suscripción
- **WHEN** un juego tiene una copia Suscripción en Game Pass
- **THEN** su etiqueta dice «Game Pass · Suscripción»

#### Scenario: Copia de otro tipo
- **WHEN** Celeste tiene una copia Otro en Steam con el detalle «Regalo»
- **THEN** su etiqueta dice «Steam · Regalo»

#### Scenario: Juego sin copias
- **WHEN** un juego en «Backlog» no tiene copias
- **THEN** su tarjeta muestra «Sin comprar» y la portada con borde punteado

### Requirement: Resumen de la biblioteca
Arriba de la biblioteca el sistema SHALL mostrar cuántos juegos tiene el usuario, en cuántas tiendas, cuántos hay en «Quiero jugarlo» y cuántos ya no tiene. Los juegos ocultos no se cuentan.

#### Scenario: Resumen
- **WHEN** el usuario tiene 14 juegos con copias vigentes en 7 tiendas, 1 en «Quiero jugarlo» y 1 sin copias vigentes
- **THEN** ve «14 juegos en 7 tiendas · 1 en «Quiero jugarlo» · 1 que ya no tenés»

### Requirement: Filtro por estado
El sistema SHALL mostrar los estados agrupados por grupo, cada uno con su cantidad de juegos. El usuario puede elegir varios estados a la vez o un grupo entero; «Todos» quita el filtro.

#### Scenario: Grupo entero
- **WHEN** el usuario elige el grupo «Dejado»
- **THEN** ve solo los juegos en «Abandonado» y «Lo probé»

#### Scenario: Varios estados
- **WHEN** el usuario elige «Quiero jugarlo» y «Backlog»
- **THEN** ve los juegos que están en cualquiera de los dos

### Requirement: Juegos ocultos
El sistema SHALL permitir ocultar y volver a mostrar juegos, de a uno o varios a la vez. Un juego oculto no aparece en la biblioteca ni en los conteos, y «¿Lo tengo?» sigue sabiendo que es suyo. El filtro «Ocultos» tiene tres opciones: «No mostrar» (la de siempre), «Mostrar ocultos», que los suma a los demás, y «Solo ocultos». Los juegos que estaban marcados «Sin interés» quedan ocultos.

#### Scenario: Ocultar un juego
- **WHEN** el usuario oculta 8BitMMO
- **THEN** 8BitMMO deja de aparecer en la biblioteca y en la cantidad de «Backlog»

#### Scenario: Ver los juegos sin interés
- **WHEN** el usuario elige «Mostrar ocultos» en el filtro «Ocultos»
- **THEN** ve también los juegos ocultos, con la marca «Oculto» visible

#### Scenario: Solo ocultos
- **WHEN** el usuario elige «Solo ocultos»
- **THEN** ve únicamente los juegos ocultos

#### Scenario: Marcar varios
- **WHEN** el usuario selecciona 20 juegos y los oculta
- **THEN** los 20 dejan de aparecer en la biblioteca

## ADDED Requirements

### Requirement: Filtro por marcas
La biblioteca SHALL tener un filtro por marcas, «Sin fin» y «100%», que se combina con los demás filtros.

#### Scenario: Solo los sin fin
- **WHEN** el usuario elige la marca «Sin fin»
- **THEN** ve solo los juegos marcados sin fin

#### Scenario: Completados al 100%
- **WHEN** el usuario elige el grupo «Terminado» y la marca «100%»
- **THEN** ve solo los juegos en «Completado · 100%»
