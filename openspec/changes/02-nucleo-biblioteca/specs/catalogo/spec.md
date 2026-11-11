## Purpose

Permitir sumar juegos a la biblioteca desde IGDB o cargándolos a mano, y mostrar sus datos (título, año, desarrollador, portada, duración) con las correcciones que haga cada usuario.

## ADDED Requirements

### Requirement: Búsqueda en IGDB mientras se escribe
El sistema SHALL buscar en IGDB a partir de 2 letras y mostrar, por cada resultado, portada o iniciales, título y año.

#### Scenario: Sugerencias desde tres letras
- **WHEN** el usuario escribe «hol» en «Agregar juego»
- **THEN** ve resultados como «Hollow Knight · 2017» y «Hollow Knight: Silksong · 2025»

#### Scenario: Texto demasiado corto
- **WHEN** el usuario escribió una sola letra
- **THEN** no se busca y ve «Escribí al menos 2 letras»

### Requirement: Resultados que ya están en la biblioteca
En los resultados, el sistema SHALL marcar los juegos que el usuario ya tiene en su biblioteca, en lugar de ofrecer agregarlos de nuevo.

#### Scenario: Juego ya cargado
- **WHEN** el usuario busca «Hades» y Hades ya está en su biblioteca
- **THEN** el resultado dice «En tu biblioteca» y no muestra el botón «Agregar»

#### Scenario: Juego en la wishlist
- **WHEN** el resultado es un juego que el usuario tiene en «Quiero jugarlo»
- **THEN** el resultado dice «En «Quiero jugarlo»»

### Requirement: Sin resultados en IGDB
Si IGDB no devuelve resultados, el sistema SHALL invitar a cargar el juego a mano.

#### Scenario: Juego que no está en IGDB
- **WHEN** el usuario busca «Cartas del Faro» y IGDB no devuelve nada
- **THEN** ve «No encontramos “Cartas del Faro” en IGDB» y el acceso a «Agregar a mano»

### Requirement: Agregar desde IGDB
Al agregar un resultado, el sistema SHALL sumar el juego a la biblioteca con sus datos de IGDB: título, año, desarrollador, portada, link y duración estimada.

#### Scenario: Agregar un juego nuevo
- **WHEN** el usuario toca «Agregar» en «Outer Wilds»
- **THEN** Outer Wilds aparece en su biblioteca con sus datos de IGDB

### Requirement: Estado inicial según las copias
Un juego recién agregado SHALL quedar en «Quiero jugarlo» si no tiene copias, o en «Pendiente» si se agrega con una copia, salvo que el usuario elija otro estado.

#### Scenario: Agregado sin copias
- **WHEN** el usuario agrega un juego desde IGDB sin indicar cómo lo tiene
- **THEN** el juego queda en «Quiero jugarlo»

#### Scenario: Agregado con copia
- **WHEN** el usuario carga a mano un juego indicando que lo tiene gratis en itch.io y no elige estado
- **THEN** el juego queda en «Pendiente»

### Requirement: Un juego por usuario
El sistema MUST mantener un solo juego por cada juego de IGDB en la biblioteca de un usuario. Las ediciones SHALL guardarse como el juego base que indica IGDB.

#### Scenario: Agregar un juego repetido
- **WHEN** el usuario intenta agregar «Civilization VI» y ya lo tiene en su biblioteca
- **THEN** no se crea otro juego y se le ofrece agregar una copia al existente

#### Scenario: Agregar una edición
- **WHEN** el usuario agrega «Sid Meier's Civilization VI: Platinum Edition» y no tiene Civilization VI
- **THEN** en su biblioteca aparece Civilization VI

### Requirement: Agregar a mano
El sistema SHALL permitir cargar un juego a mano con el título como único dato obligatorio; portada, tienda, tipo de copia, link, año, duración y estado son opcionales. El juego queda marcado como «agregado a mano».

#### Scenario: Carga mínima
- **WHEN** el usuario carga a mano solo el título «Cartas del Faro»
- **THEN** el juego aparece en la biblioteca con la marca «A MANO»

#### Scenario: Sin título
- **WHEN** el usuario intenta guardar el formulario con el título vacío
- **THEN** ve «Poné el título del juego» y no se guarda nada

### Requirement: Quitar de la biblioteca
El sistema SHALL permitir quitar un juego de la biblioteca desde su ficha, previa confirmación que avisa que no se puede deshacer. Quitarlo MUST borrar el juego del usuario junto con sus copias, su puntaje y su historial, sin afectar a otros usuarios. Es distinto de «Sin interés», que lo oculta, y de «Ya no lo tengo», que conserva todo.

#### Scenario: Quitar un juego agregado por error
- **WHEN** el usuario quita Outer Wilds de su biblioteca y confirma
- **THEN** Outer Wilds deja de aparecer en su biblioteca, junto con sus copias y su historial

#### Scenario: Cancelar
- **WHEN** el usuario toca «Quitar de la biblioteca» y después cancela
- **THEN** el juego queda igual

#### Scenario: Volver a agregarlo
- **WHEN** el usuario vuelve a agregar Outer Wilds después de haberlo quitado
- **THEN** el juego entra como nuevo, sin puntaje, sin copias y sin historial

#### Scenario: Juego cargado a mano
- **WHEN** el usuario quita «Cartas del Faro», que había cargado a mano
- **THEN** el juego también desaparece del catálogo y ya no le aparece al buscar

#### Scenario: Juego de IGDB que otro usuario tiene
- **WHEN** el usuario A quita Hades y el usuario B también lo tiene en su biblioteca
- **THEN** Hades sigue en la biblioteca de B sin cambios

### Requirement: Juegos a mano privados
Un juego cargado a mano MUST ser visible solo para el usuario que lo cargó.

#### Scenario: Otro usuario busca el juego
- **WHEN** otro usuario busca «Cartas del Faro» al agregar un juego
- **THEN** no le aparece el juego cargado a mano por el primero

### Requirement: Vincular con IGDB
El sistema SHALL permitir vincular un juego cargado a mano con un juego de IGDB, conservando estado, puntaje, copias, reseña y todo su historial.

#### Scenario: Vínculo sin pérdida
- **WHEN** el usuario vincula su «Cartas del Faro» cargado a mano con el juego de IGDB correspondiente
- **THEN** el juego toma los datos de IGDB y conserva su estado, su puntaje, sus copias y su historial
- **AND** deja de tener la marca «A MANO»

### Requirement: Portada de respaldo
Si un juego no tiene portada, el sistema SHALL mostrar un bloque de color con hasta dos iniciales del título, sin contar artículos ni preposiciones (de, del, la, el, los, las, of, the).

#### Scenario: Iniciales
- **WHEN** se muestra «Cartas del Faro» sin portada
- **THEN** se ve un bloque de color con «CF»

### Requirement: Correcciones propias
El sistema SHALL permitir que cada usuario corrija la duración estimada, la marca «sin fin» y la portada de un juego. La corrección MUST verse solo en su biblioteca y prevalece sobre el dato del catálogo.

#### Scenario: Corregir la duración
- **WHEN** el usuario cambia la duración de Disco Elysium de 22 h a 30 h
- **THEN** en su biblioteca se ve «unas 30 h» y para otros usuarios sigue siendo 22 h

### Requirement: Duración estimada
La duración estimada SHALL tomarse del tiempo «normal» de IGDB cuando exista. Un juego marcado «sin fin» MUST quedar sin duración estimada.

#### Scenario: Juego sin fin
- **WHEN** el usuario marca Civilization VI como «sin fin»
- **THEN** su ficha muestra «Sin fin» en lugar de una duración

#### Scenario: IGDB sin duración
- **WHEN** IGDB no tiene duración para un juego
- **THEN** la ficha muestra «Duración desconocida» y permite cargarla a mano

### Requirement: Actualizar datos desde IGDB
El sistema SHALL permitir volver a traer los datos de IGDB de un juego sin perder las correcciones propias del usuario.

#### Scenario: Actualizar con una corrección propia
- **WHEN** el usuario actualiza los datos de un juego al que le había corregido la duración
- **THEN** se actualizan los datos de IGDB y su duración corregida se mantiene
