## ADDED Requirements

### Requirement: Ayuda de los términos propios
Junto a los términos propios de Ludoteca, donde se eligen o se activan (formularios, ficha y filtros), el sistema SHALL mostrar un botón «?» que abre una explicación breve. Los términos son: Sin interés, Año de lanzamiento, Familia, Otro, A mano, Ya no lo tengo y Sin fin. La explicación se cierra tocando afuera, con Escape o tocando otra vez el «?».

#### Scenario: Ayuda de «Sin interés»
- **WHEN** el usuario toca el «?» junto a «Sin interés»
- **THEN** ve «Lo tenés pero no pensás jugarlo: no aparece en la biblioteca ni en los conteos. Lo ves con «Mostrar sin interés».»

#### Scenario: Ayuda del año de lanzamiento
- **WHEN** el usuario toca el «?» junto a «Año de lanzamiento»
- **THEN** ve «El año en que salió el juego, no el año en que lo conseguiste.»

#### Scenario: Ayuda de «Familia»
- **WHEN** el usuario toca el «?» junto al tipo «Familia»
- **THEN** ve «Te lo presta alguien de tu familia de Steam: lo podés jugar, pero no es tuyo.»

#### Scenario: Ayuda de «Otro»
- **WHEN** el usuario toca el «?» junto al tipo «Otro»
- **THEN** ve «Para lo que no entra en los demás tipos, como un regalo. Cuenta como tuyo.»

#### Scenario: Ayuda de «A mano»
- **WHEN** el usuario toca el «?» junto a la marca «A MANO» en la ficha
- **THEN** ve «Lo cargaste vos porque no estaba en IGDB. Solo lo ves vos, y podés vincularlo con IGDB cuando quieras.»

#### Scenario: Ayuda de «Ya no lo tengo»
- **WHEN** el usuario toca el «?» junto a «Ya no lo tengo»
- **THEN** ve «Ya no tenés esta copia, por ejemplo porque la vendiste o terminó la suscripción. El juego conserva su estado, su puntaje y sus horas.»

#### Scenario: Ayuda de «Sin fin»
- **WHEN** el usuario toca el «?» junto a «Sin fin»
- **THEN** ve «Un juego que no se termina, como un multijugador: no tiene duración estimada.»

#### Scenario: Cerrar la ayuda
- **WHEN** la explicación está abierta y el usuario aprieta Escape
- **THEN** la explicación se cierra y el foco vuelve al «?»

### Requirement: Aviso cuando los datos no cargan
Si una pantalla no puede traer sus datos o guardar un cambio porque la base de datos no responde, el sistema SHALL dejar de esperar en menos de 15 segundos y avisarlo con la opción de reintentar, en lugar de quedarse cargando.

#### Scenario: Base que no responde al abrir la Biblioteca
- **WHEN** el usuario abre la Biblioteca y la base de datos no responde
- **THEN** en menos de 15 segundos ve «No pudimos cargar tus datos. Probá de nuevo.» y el botón «Reintentar»

#### Scenario: Reintentar
- **WHEN** la base de datos vuelve a responder y el usuario toca «Reintentar»
- **THEN** ve la Biblioteca con sus juegos

#### Scenario: Cambio que no se guarda
- **WHEN** el usuario marca Hades como «Sin interés» y la base de datos no responde
- **THEN** en menos de 15 segundos ve «No pudimos guardar el cambio. Probá de nuevo.» y Hades queda como estaba

#### Scenario: Las demás pantallas siguen andando
- **WHEN** un pedido a la base quedó sin respuesta y el usuario abre después la ficha de otro juego con la base ya respondiendo
- **THEN** la ficha carga normalmente, sin esperar a que termine el pedido trabado
