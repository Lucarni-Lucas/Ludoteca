## Purpose

Permitir que el usuario adapte los estados y los motivos a su forma de jugar, sin romper los grupos fijos de los que dependen los filtros y las estadísticas, y anotar por qué pausa o deja un juego.

## ADDED Requirements

### Requirement: Editar estados
El sistema SHALL permitir renombrar un estado, cambiarle el color y reordenarlo dentro de su grupo. Un estado por defecto renombrado MUST conservar su función (por ejemplo, «Quiero jugarlo» sigue siendo la wishlist).

#### Scenario: Renombrar la wishlist
- **WHEN** el usuario renombra «Quiero jugarlo» a «Lo quiero»
- **THEN** los juegos sin copias siguen entrando a «Lo quiero» y muestran «Sin comprar»

#### Scenario: Orden en el selector de estado
- **WHEN** el usuario pone «Rejugando» primero en el grupo En curso
- **THEN** al cambiar el estado de un juego, el grupo En curso ofrece primero «Rejugando», en el orden que eligió

#### Scenario: Orden en los filtros
- **WHEN** el usuario reordena los estados de un grupo
- **THEN** los filtros de la biblioteca muestran ese grupo en el mismo orden

### Requirement: Crear estados
El sistema SHALL permitir crear un estado nuevo dentro de un grupo. Los estados creados por el usuario muestran la marca «TUYO».

#### Scenario: Estado «Rejugando»
- **WHEN** el usuario crea «Rejugando» en el grupo En curso
- **THEN** «Rejugando» aparece en En curso con la marca «TUYO» y se puede asignar a cualquier juego

### Requirement: Ocultar estados
El sistema SHALL permitir ocultar y volver a mostrar cualquier estado. Un estado oculto no se ofrece al cambiar de estado, pero los juegos que lo tienen lo conservan.

#### Scenario: Ocultar «100%»
- **WHEN** el usuario oculta «100%» y Hades está en «100%»
- **THEN** «100%» no aparece al cambiar de estado y Hades sigue en «100%»

### Requirement: Borrar estados propios
El sistema SHALL permitir borrar un estado creado por el usuario solo si ningún juego lo tiene. Los estados por defecto MUST NOT poder borrarse; solo ocultarse.

#### Scenario: Estado en uso
- **WHEN** el usuario intenta borrar «Rejugando» y 2 juegos lo tienen
- **THEN** ve «Primero pasá estos 2 juegos a otro estado» y no se borra

### Requirement: Motivos editables
El sistema SHALL arrancar con los motivos Me aburrió, Muy difícil, Problemas técnicos, Me falta tiempo, Lo retomo después y Sin gente para jugar, y permitir agregar, renombrar y quitar motivos. Un motivo quitado MUST seguir viéndose en el diario donde ya se usó.

#### Scenario: Quitar un motivo usado
- **WHEN** el usuario quita «Muy difícil», que ya usó en Elden Ring
- **THEN** «Muy difícil» deja de ofrecerse y el diario de Elden Ring lo sigue mostrando

### Requirement: Estados que piden motivo
Cada estado SHALL tener una marca que indica si pide motivo. Por defecto la tienen «En pausa», «Abandonado» y «Lo probé», y el usuario puede cambiarla en cualquier estado.

#### Scenario: Estado propio que pide motivo
- **WHEN** el usuario activa «pide motivo» en «Rejugando»
- **THEN** al pasar un juego a «Rejugando» aparece el formulario de motivo

### Requirement: Formulario al pausar o dejar
Al pasar un juego a un estado que pide motivo, el sistema SHALL mostrar un formulario opcional con horas jugadas, progreso en %, hasta dónde llegó, motivos (selección múltiple) y nota. Todo se guarda en el diario.

#### Scenario: Dejar un juego
- **WHEN** el usuario pasa GTA V a «Abandonado», elige «Me aburrió» y escribe 14 en horas
- **THEN** GTA V queda en «Abandonado» y el diario muestra «Me aburrió · a las 14 h»

#### Scenario: Sin completar nada
- **WHEN** el usuario pasa un juego a «En pausa» y guarda sin completar el formulario
- **THEN** el cambio de estado se guarda igual

#### Scenario: Título según el estado
- **WHEN** el estado elegido es del grupo En curso
- **THEN** el formulario pregunta «¿Por qué lo pausás?», y en el grupo Dejado, «¿Por qué lo dejás?»

### Requirement: Motivo en la biblioteca
Los juegos cuyo último cambio de estado tiene motivo o «hasta dónde llegó» SHALL mostrarlo en su tarjeta de la biblioteca.

#### Scenario: Tarjeta con motivo
- **WHEN** Elden Ring está en «Lo probé» con el motivo «Muy difícil» a las 3 h
- **THEN** su tarjeta muestra «Muy difícil · a las 3 h»
