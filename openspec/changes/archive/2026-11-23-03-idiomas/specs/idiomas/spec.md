## Purpose

Mostrar Ludoteca en español rioplatense o en inglés, según el navegador o la elección del usuario, sin traducir lo que el usuario escribió ni los datos del catálogo.

## ADDED Requirements

### Requirement: Idiomas disponibles
Todos los textos de la interfaz SHALL existir en español rioplatense y en inglés: pantallas, botones, avisos, errores, ayudas y nombres por defecto.

#### Scenario: Botón en inglés
- **WHEN** el idioma es inglés
- **THEN** el botón del encabezado dice «Add game» en lugar de «Agregar juego»

#### Scenario: Pantalla completa en inglés
- **WHEN** el usuario recorre la Biblioteca, la ficha de un juego y «Agregar juego» en inglés
- **THEN** no queda ningún texto de la interfaz en español

### Requirement: Idioma por defecto según el navegador
Si el usuario no eligió un idioma, el sistema SHALL usar español cuando el idioma preferido del navegador es español, en cualquier variante, e inglés en cualquier otro caso. Vale también antes de ingresar.

#### Scenario: Navegador en español de México
- **WHEN** alguien abre la pantalla de ingreso con el navegador en español de México
- **THEN** la ve en español rioplatense

#### Scenario: Navegador en portugués
- **WHEN** alguien abre la pantalla de ingreso con el navegador en portugués de Brasil
- **THEN** la ve en inglés

#### Scenario: Navegador en inglés
- **WHEN** un usuario que nunca eligió idioma entra con el navegador en inglés
- **THEN** ve la app en inglés

### Requirement: Elegir el idioma
Ajustes SHALL ofrecer el idioma con las opciones «Español» e «English», cada una escrita en su propio idioma. La elección se guarda en la cuenta, se aplica en el momento, vale en todos los dispositivos del usuario y manda sobre el idioma del navegador.

#### Scenario: Pasar a inglés
- **WHEN** el usuario elige «English» en Ajustes
- **THEN** toda la interfaz pasa a inglés sin cerrar la sesión

#### Scenario: Otro dispositivo
- **WHEN** el usuario eligió «English» en la PC y después entra desde el celu, con el navegador en español
- **THEN** ve la app en inglés

#### Scenario: Volver al español
- **WHEN** el usuario elige «Español» en Ajustes
- **THEN** la interfaz vuelve al español rioplatense, con voseo

### Requirement: Lo que no se traduce
Los textos que escribió el usuario y los datos del catálogo de IGDB MUST mostrarse tal como están, en cualquier idioma. Los nombres por defecto que el usuario no cambió SHALL mostrarse en el idioma elegido.

#### Scenario: Estado por defecto
- **WHEN** el idioma es inglés y un juego está en «Quiero jugarlo»
- **THEN** su estado se ve como «Want to play»

#### Scenario: Tienda propia
- **WHEN** el usuario creó la tienda «Humble Store» y pasa a inglés
- **THEN** la sigue viendo como «Humble Store»

#### Scenario: Detalle de una copia
- **WHEN** el usuario cargó una copia Otro con el detalle «Regalo» y pasa a inglés
- **THEN** el tipo se ve como «Other» y el detalle sigue diciendo «Regalo»

#### Scenario: Título del catálogo
- **WHEN** el idioma es español y el usuario abre The Witcher 3: Wild Hunt
- **THEN** el título se ve como «The Witcher 3: Wild Hunt», sin traducir

### Requirement: Fechas según el idioma
Las fechas SHALL mostrarse con el formato y los nombres de mes del idioma elegido.

#### Scenario: Fecha de una copia
- **WHEN** una copia de Civilization VI se consiguió en mayo de 2020
- **THEN** en español se ve «may 2020» y en inglés, «May 2020»

### Requirement: Errores en el idioma elegido
Los mensajes de error y los avisos SHALL mostrarse en el idioma elegido, también los que vienen del servidor.

#### Scenario: Formulario sin título
- **WHEN** el idioma es inglés y el usuario intenta guardar «Agregar a mano» sin título
- **THEN** ve el aviso en inglés, «Enter the game's title», y no se guarda nada

### Requirement: Idioma declarado en la página
Cada página SHALL declarar el idioma en el que se muestra, para que un lector de pantalla la lea con la pronunciación correcta.

#### Scenario: Página en inglés
- **WHEN** la interfaz está en inglés
- **THEN** la página declara el idioma inglés, y en español declara el español
